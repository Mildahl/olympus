/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { ATTR, SPATIAL_TYPES } from './types.js';
import { IfcTypeEnum, IfcTypeEnumFromString } from '@ifc-lite/data';
/**
 * Build spatial hierarchy from composed IFCX nodes.
 *
 * IFCX hierarchy comes from children relationships:
 * - Project -> Site -> Building -> Storey -> Elements
 *
 * We identify spatial structure elements by their bsi::ifc::class codes.
 */
export function buildHierarchy(composed, pathToId) {
    // Find project root
    const projectNode = findProjectRoot(composed);
    if (!projectNode) {
        return createEmptyHierarchy();
    }
    // Build spatial tree
    const projectSpatial = buildSpatialNode(projectNode, pathToId);
    // Build lookup maps
    const byStorey = new Map();
    const byBuilding = new Map();
    const bySite = new Map();
    const bySpace = new Map();
    const storeyElevations = new Map();
    const storeyHeights = new Map();
    const elementToStorey = new Map();
    // Traverse and populate maps
    populateMaps(projectSpatial, null, null, null, pathToId, byStorey, byBuilding, bySite, bySpace, storeyElevations, elementToStorey);
    // Note: storeyHeights remains empty - uses on-demand property extraction
    return {
        project: projectSpatial,
        byStorey,
        byBuilding,
        bySite,
        bySpace,
        storeyElevations,
        storeyHeights,
        elementToStorey,
        // Helper methods
        getStoreyElements(storeyId) {
            return byStorey.get(storeyId) || [];
        },
        getStoreyByElevation(z) {
            let closestStorey = null;
            let closestDist = Infinity;
            for (const [storeyId, elevation] of storeyElevations) {
                const dist = Math.abs(z - elevation);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestStorey = storeyId;
                }
            }
            return closestStorey;
        },
        getContainingSpace(elementId) {
            // Check if element is directly in a space
            for (const [spaceId, elements] of bySpace) {
                if (elements.includes(elementId)) {
                    return spaceId;
                }
            }
            return null;
        },
        getPath(elementId) {
            const path = [];
            function findPath(node) {
                if (node.expressId === elementId) {
                    path.push(node);
                    return true;
                }
                if (node.elements.includes(elementId)) {
                    path.push(node);
                    return true;
                }
                for (const child of node.children) {
                    if (findPath(child)) {
                        path.unshift(node);
                        return true;
                    }
                }
                return false;
            }
            findPath(projectSpatial);
            return path;
        },
    };
}
/**
 * Find the IfcProject node in composed nodes.
 */
function findProjectRoot(composed) {
    for (const node of composed.values()) {
        const ifcClass = node.attributes.get(ATTR.CLASS);
        if (ifcClass?.code === 'IfcProject') {
            return node;
        }
    }
    return null;
}
/**
 * Build a SpatialNode from a ComposedNode.
 */
function buildSpatialNode(node, pathToId) {
    const ifcClass = node.attributes.get(ATTR.CLASS);
    const expressId = pathToId.get(node.path) ?? 0;
    const typeEnum = IfcTypeEnumFromString(ifcClass?.code ?? '');
    const elementIds = new Set();
    const spatialNode = {
        expressId,
        type: typeEnum,
        name: extractName(node) ?? node.path.slice(0, 8),
        children: [],
        elements: [],
    };
    // Extract elevation for storeys
    if (ifcClass?.code === 'IfcBuildingStorey') {
        const elevation = node.attributes.get('bsi::ifc::prop::Elevation');
        if (typeof elevation === 'number') {
            spatialNode.elevation = elevation;
        }
    }
    // Process children
    for (const [, child] of node.children) {
        const childClass = child.attributes.get(ATTR.CLASS);
        if (childClass && SPATIAL_TYPES.has(childClass.code)) {
            // Spatial child - recurse
            spatialNode.children.push(buildSpatialNode(child, pathToId));
        }
        else {
            if (ifcClass?.code === 'IfcSpace' && isSpaceBoundaryRelationshipClass(childClass?.code)) {
                collectSpaceBoundaryElementIds(child, pathToId, elementIds);
                continue;
            }
            collectElementIds(child, pathToId, elementIds, new Set());
            if (ifcClass?.code === 'IfcSpace') {
                collectSpaceBoundaryElementIds(child, pathToId, elementIds);
            }
        }
        // Geometry-only children (Body, Axis, etc.) are skipped
    }
    spatialNode.elements = [...elementIds];
    return spatialNode;
}
/**
 * Populate lookup maps by traversing the spatial hierarchy.
 */
function populateMaps(node, currentStorey, currentBuilding, currentSite, pathToId, byStorey, byBuilding, bySite, bySpace, storeyElevations, elementToStorey) {
    // Update current context based on node type
    if (node.type === IfcTypeEnum.IfcBuildingStorey) {
        currentStorey = node.expressId;
        if (node.elevation !== undefined) {
            storeyElevations.set(node.expressId, node.elevation);
        }
        byStorey.set(node.expressId, []);
    }
    else if (node.type === IfcTypeEnum.IfcBuilding) {
        currentBuilding = node.expressId;
        byBuilding.set(node.expressId, []);
    }
    else if (node.type === IfcTypeEnum.IfcSite) {
        currentSite = node.expressId;
        bySite.set(node.expressId, []);
    }
    else if (node.type === IfcTypeEnum.IfcSpace) {
        bySpace.set(node.expressId, []);
    }
    // Add elements to appropriate maps
    for (const elementId of node.elements) {
        if (currentStorey !== null) {
            pushUnique(byStorey, currentStorey, elementId);
            elementToStorey.set(elementId, currentStorey);
        }
        if (currentBuilding !== null) {
            pushUnique(byBuilding, currentBuilding, elementId);
        }
        if (currentSite !== null) {
            pushUnique(bySite, currentSite, elementId);
        }
        if (node.type === IfcTypeEnum.IfcSpace) {
            pushUnique(bySpace, node.expressId, elementId);
        }
    }
    // Recurse to children
    for (const child of node.children) {
        populateMaps(child, currentStorey, currentBuilding, currentSite, pathToId, byStorey, byBuilding, bySite, bySpace, storeyElevations, elementToStorey);
    }
}
/**
 * Create an empty hierarchy when no project is found.
 */
function createEmptyHierarchy() {
    const emptyProject = {
        expressId: 0,
        type: IfcTypeEnum.IfcProject,
        name: 'Unknown Project',
        children: [],
        elements: [],
    };
    return {
        project: emptyProject,
        byStorey: new Map(),
        byBuilding: new Map(),
        bySite: new Map(),
        bySpace: new Map(),
        storeyElevations: new Map(),
        storeyHeights: new Map(),
        elementToStorey: new Map(),
        getStoreyElements: () => [],
        getStoreyByElevation: () => null,
        getContainingSpace: () => null,
        getPath: () => [],
    };
}
function collectElementIds(node, pathToId, elementIds, visited) {
    if (visited.has(node.path))
        return;
    visited.add(node.path);
    const ifcClass = node.attributes.get(ATTR.CLASS);
    if (ifcClass?.code) {
        if (SPATIAL_TYPES.has(ifcClass.code) || isSpaceBoundaryRelationshipClass(ifcClass.code))
            return;
        const elementId = pathToId.get(node.path);
        if (elementId !== undefined) {
            elementIds.add(elementId);
        }
    }
    for (const child of node.children.values()) {
        collectElementIds(child, pathToId, elementIds, visited);
    }
}
function collectSpaceBoundaryElementIds(node, pathToId, elementIds) {
    const boundary = node.attributes.get(ATTR.SPACE_BOUNDARY);
    const relatedElementPath = boundary?.relatedelement?.ref;
    if (!relatedElementPath)
        return;
    const elementId = pathToId.get(relatedElementPath);
    if (elementId !== undefined) {
        elementIds.add(elementId);
    }
}
function isSpaceBoundaryRelationshipClass(typeCode) {
    return typeof typeCode === 'string' && typeCode.startsWith('IfcRelSpaceBoundary');
}
function pushUnique(map, key, value) {
    const list = map.get(key);
    if (!list) {
        map.set(key, [value]);
        return;
    }
    if (!list.includes(value)) {
        list.push(value);
    }
}
/**
 * Extract name from node attributes.
 */
function extractName(node) {
    // Try direct IFC name attribute (written by IFCX exporter/writer)
    const ifcName = node.attributes.get('bsi::ifc::name');
    if (typeof ifcName === 'string')
        return ifcName;
    const name = node.attributes.get('bsi::ifc::prop::Name');
    if (typeof name === 'string')
        return name;
    const typeName = node.attributes.get('bsi::ifc::prop::TypeName');
    if (typeof typeName === 'string')
        return typeName;
    const longName = node.attributes.get('bsi::ifc::prop::LongName');
    if (typeof longName === 'string')
        return longName;
    return null;
}
//# sourceMappingURL=hierarchy-builder.js.map