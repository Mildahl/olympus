/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { composeIfcx } from './composition.js';
import { extractEntities } from './entity-extractor.js';
import { extractProperties, isQuantityProperty } from './property-extractor.js';
import { extractGeometry } from './geometry-extractor.js';
import { buildHierarchy } from './hierarchy-builder.js';
import { StringTable, RelationshipGraphBuilder, RelationshipType, QuantityTableBuilder, } from '@ifc-lite/data';
// Federated composition imports
import { createLayerStack } from './layer-stack.js';
import { composeFederated, } from './federated-composition.js';
// Re-export types
export * from './types.js';
export { composeIfcx, findRoots, getDescendants } from './composition.js';
export { extractEntities } from './entity-extractor.js';
export { extractProperties, isQuantityProperty } from './property-extractor.js';
export { extractGeometry } from './geometry-extractor.js';
export { buildHierarchy } from './hierarchy-builder.js';
export { findTraversalRoots, findTraversalSeeds, walkComposedFrames, getFrameLineage, getNodeLineage, collectIncomingEdgeNames, buildReachableAttributeIndex, } from './traversal.js';
// Re-export federated composition
export { LayerStack, createLayerStack, } from './layer-stack.js';
export { PathIndex, createPathIndex, parsePath, } from './path-resolver.js';
export { composeFederated, } from './federated-composition.js';
// IFCX writer for export
export { IfcxWriter, exportToIfcx, } from './writer.js';
/**
 * Parse an IFCX file and return data compatible with existing ifc-lite pipeline.
 */
export async function parseIfcx(buffer, options = {}) {
    const startTime = performance.now();
    // Phase 1: Parse JSON
    options.onProgress?.({ phase: 'parse', percent: 0 });
    const text = new TextDecoder().decode(buffer);
    let file;
    try {
        file = JSON.parse(text);
    }
    catch (e) {
        throw new Error(`Invalid IFCX file: JSON parse error - ${e}`);
    }
    // Validate header
    if (!file.header?.ifcxVersion?.toLowerCase().includes('ifcx')) {
        throw new Error('Invalid IFCX file: missing or invalid header.ifcxVersion');
    }
    options.onProgress?.({ phase: 'parse', percent: 100 });
    // Phase 2: Compose ECS nodes
    options.onProgress?.({ phase: 'compose', percent: 0 });
    const composed = composeIfcx(file);
    options.onProgress?.({ phase: 'compose', percent: 100 });
    // Phase 3: Extract entities
    options.onProgress?.({ phase: 'entities', percent: 0 });
    const strings = new StringTable();
    const { entities, pathToId, idToPath } = extractEntities(composed, strings);
    options.onProgress?.({ phase: 'entities', percent: 100 });
    // Phase 4: Extract properties
    options.onProgress?.({ phase: 'properties', percent: 0 });
    const properties = extractProperties(composed, pathToId, strings);
    options.onProgress?.({ phase: 'properties', percent: 100 });
    // Phase 5: Extract geometry
    options.onProgress?.({ phase: 'geometry', percent: 0 });
    const meshes = extractGeometry(composed, pathToId);
    options.onProgress?.({ phase: 'geometry', percent: 100 });
    // Phase 6: Build hierarchy
    options.onProgress?.({ phase: 'hierarchy', percent: 0 });
    const spatialHierarchy = buildHierarchy(composed, pathToId);
    options.onProgress?.({ phase: 'hierarchy', percent: 100 });
    // Phase 7: Build relationships
    options.onProgress?.({ phase: 'relationships', percent: 0 });
    const relationships = buildRelationships(composed, pathToId);
    options.onProgress?.({ phase: 'relationships', percent: 100 });
    // Phase 8: Build quantities (from properties that look like quantities)
    const quantities = buildQuantities(composed, pathToId, strings);
    const parseTime = performance.now() - startTime;
    return {
        entities,
        properties,
        quantities,
        relationships,
        spatialHierarchy,
        strings,
        meshes,
        pathToId,
        idToPath,
        schemaVersion: 'IFC5',
        fileSize: buffer.byteLength,
        entityCount: entities.count,
        parseTime,
    };
}
/**
 * Build relationship graph from composed nodes.
 * In IFCX, relationships are implicit in the children structure.
 */
function buildRelationships(composed, pathToId) {
    const builder = new RelationshipGraphBuilder();
    let relId = 1;
    for (const node of composed.values()) {
        const parentId = pathToId.get(node.path);
        if (parentId === undefined)
            continue;
        for (const child of node.children.values()) {
            const childId = pathToId.get(child.path);
            if (childId !== undefined) {
                // Determine relationship type based on node types
                const relType = determineRelationshipType(node, child);
                builder.addEdge(parentId, childId, relType, relId++);
            }
        }
    }
    return builder.build();
}
/**
 * Determine relationship type based on parent and child node types.
 */
function determineRelationshipType(parent, child) {
    const parentClass = parent.attributes.get('bsi::ifc::class')?.code;
    const childClass = child.attributes.get('bsi::ifc::class')?.code;
    // Spatial containment
    if (isSpatialElement(parentClass) && !isSpatialElement(childClass)) {
        return RelationshipType.ContainsElements;
    }
    // Aggregation (spatial structure hierarchy)
    if (isSpatialElement(parentClass) && isSpatialElement(childClass)) {
        return RelationshipType.Aggregates;
    }
    // Default to containment
    return RelationshipType.ContainsElements;
}
function isSpatialElement(typeCode) {
    if (!typeCode)
        return false;
    const spatialTypes = ['IfcProject', 'IfcSite', 'IfcBuilding', 'IfcBuildingStorey', 'IfcSpace'];
    return spatialTypes.includes(typeCode);
}
/**
 * Build quantity table from properties that appear to be quantities.
 * Uses the isQuantityProperty helper to identify quantity-like properties.
 */
function buildQuantities(composed, pathToId, strings) {
    const builder = new QuantityTableBuilder(strings);
    // Map property names to quantity types
    const getQuantityType = (propName) => {
        // Volume types
        if (propName === 'Volume' || propName.endsWith('Volume'))
            return 2; // QuantityType.Volume
        // Area types
        if (propName === 'Area' || propName.endsWith('Area'))
            return 1; // QuantityType.Area
        // Count types
        if (propName === 'Count' || propName.endsWith('Count'))
            return 3; // QuantityType.Count
        // Weight types
        if (propName === 'Weight' || propName === 'Mass' ||
            propName.endsWith('Weight') || propName.endsWith('Mass'))
            return 4; // QuantityType.Weight
        // Default to length for dimension-like quantities
        return 0; // QuantityType.Length
    };
    for (const node of composed.values()) {
        const expressId = pathToId.get(node.path);
        if (expressId === undefined)
            continue;
        // Get the IFC class to use as context for qset naming
        const ifcClass = node.attributes.get('bsi::ifc::class')?.code;
        const qsetName = ifcClass ? `Qto_${ifcClass.replace('Ifc', '')}BaseQuantities` : 'BaseQuantities';
        for (const [key, value] of node.attributes) {
            // Check if this looks like a quantity
            const propName = key.split('::').pop() ?? '';
            if (typeof value === 'number' && isQuantityProperty(propName)) {
                builder.add({
                    entityId: expressId,
                    qsetName,
                    quantityName: propName,
                    quantityType: getQuantityType(propName),
                    value,
                });
            }
        }
    }
    return builder.build();
}
/**
 * Detect if a buffer contains IFCX (JSON), IFC (STEP), or GLB (binary glTF) format.
 */
export function detectFormat(buffer) {
    // Check GLB magic bytes first (binary format, 4-byte magic: 0x46546C67 = 'glTF')
    if (buffer.byteLength >= 4) {
        const magic = new DataView(buffer).getUint32(0, true);
        if (magic === 0x46546c67) {
            return 'glb';
        }
    }
    const bytes = new Uint8Array(buffer, 0, Math.min(100, buffer.byteLength));
    const start = new TextDecoder().decode(bytes).trim();
    // IFCX is JSON starting with {
    if (start.startsWith('{')) {
        return 'ifcx';
    }
    // IFC STEP starts with ISO-10303-21
    if (start.includes('ISO-10303-21') || start.startsWith('ISO')) {
        return 'ifc';
    }
    return 'unknown';
}
/**
 * Parse multiple IFCX files as federated layers.
 *
 * Files are loaded as layers with the first file being the base (weakest)
 * and subsequent files being overlays (stronger). Layer order can be
 * adjusted after parsing using the returned LayerStack.
 *
 * @param files - Array of file buffers with names
 * @param options - Parse options
 * @returns Federated parse result with layer information
 *
 * @example
 * ```typescript
 * const result = await parseFederatedIfcx([
 *   { buffer: baseBuffer, name: 'hello-wall.ifcx' },
 *   { buffer: overlayBuffer, name: 'add-fire-rating.ifcx' },
 * ]);
 *
 * // Wall now has FireRating property from overlay
 * const wallProps = result.properties.getForEntity(wallId);
 * ```
 */
export async function parseFederatedIfcx(files, options = {}) {
    const startTime = performance.now();
    if (files.length === 0) {
        throw new Error('At least one IFCX file is required');
    }
    options.onProgress?.({ phase: 'parse', percent: 0 });
    // Phase 1: Parse all files and build layer stack
    const layerStack = createLayerStack();
    let totalSize = 0;
    for (let i = 0; i < files.length; i++) {
        const { buffer, name } = files[i];
        totalSize += buffer.byteLength;
        const text = new TextDecoder().decode(buffer);
        let file;
        try {
            file = JSON.parse(text);
        }
        catch (e) {
            throw new Error(`Invalid IFCX file "${name}": JSON parse error - ${e}`);
        }
        // Validate header
        if (!file.header?.ifcxVersion?.toLowerCase().includes('ifcx')) {
            throw new Error(`Invalid IFCX file "${name}": missing or invalid header.ifcxVersion`);
        }
        // Add as layer (first file is weakest, last is strongest)
        // We add at position 0 so later files become strongest
        layerStack.addLayerAt(file, buffer, name, 0, {
            type: 'file',
            filename: name,
            size: buffer.byteLength,
        });
        options.onProgress?.({
            phase: 'parse',
            percent: Math.round(((i + 1) / files.length) * 100),
        });
    }
    options.onProgress?.({ phase: 'compose', percent: 0 });
    // Phase 2: Compose federated layers
    const compositionResult = composeFederated(layerStack, {
        onProgress: (phase, percent) => {
            options.onProgress?.({ phase: `compose-${phase}`, percent });
        },
        maxInheritDepth: options.maxInheritDepth,
    });
    options.onProgress?.({ phase: 'compose', percent: 100 });
    // Convert composed nodes to standard ComposedNode format for extractors
    const composed = new Map();
    for (const [path, node] of compositionResult.composed) {
        composed.set(path, node);
    }
    // Phase 3: Extract entities
    options.onProgress?.({ phase: 'entities', percent: 0 });
    const strings = new StringTable();
    const { entities, pathToId, idToPath } = extractEntities(composed, strings);
    options.onProgress?.({ phase: 'entities', percent: 100 });
    // Phase 4: Extract properties
    options.onProgress?.({ phase: 'properties', percent: 0 });
    const properties = extractProperties(composed, pathToId, strings);
    options.onProgress?.({ phase: 'properties', percent: 100 });
    // Phase 5: Extract geometry
    options.onProgress?.({ phase: 'geometry', percent: 0 });
    const meshes = extractGeometry(composed, pathToId);
    options.onProgress?.({ phase: 'geometry', percent: 100 });
    // Phase 6: Build hierarchy
    options.onProgress?.({ phase: 'hierarchy', percent: 0 });
    const spatialHierarchy = buildHierarchy(composed, pathToId);
    options.onProgress?.({ phase: 'hierarchy', percent: 100 });
    // Phase 7: Build relationships
    options.onProgress?.({ phase: 'relationships', percent: 0 });
    const relationships = buildRelationships(composed, pathToId);
    options.onProgress?.({ phase: 'relationships', percent: 100 });
    // Phase 8: Build quantities
    const quantities = buildQuantities(composed, pathToId, strings);
    // Build path-to-layers map
    const pathToLayers = new Map();
    for (const [path, node] of compositionResult.composed) {
        pathToLayers.set(path, Array.from(node.contributingLayers));
    }
    const parseTime = performance.now() - startTime;
    return {
        entities,
        properties,
        quantities,
        relationships,
        spatialHierarchy,
        strings,
        meshes,
        pathToId,
        idToPath,
        schemaVersion: 'IFC5',
        fileSize: totalSize,
        entityCount: entities.count,
        parseTime,
        // Federated-specific fields
        layerStack,
        pathIndex: compositionResult.pathIndex,
        compositionStats: {
            layersUsed: compositionResult.stats.layersUsed,
            inheritanceResolutions: compositionResult.stats.inheritanceResolutions,
            crossLayerReferences: compositionResult.stats.crossLayerReferences,
        },
        pathToLayers,
    };
}
/**
 * Add an overlay layer to an existing federated result.
 * Returns a new result with the overlay applied.
 */
export async function addIfcxOverlay(baseResult, overlayBuffer, overlayName, options = {}) {
    // Parse overlay file
    const text = new TextDecoder().decode(overlayBuffer);
    let file;
    try {
        file = JSON.parse(text);
    }
    catch (e) {
        throw new Error(`Invalid IFCX overlay "${overlayName}": JSON parse error - ${e}`);
    }
    // Validate header
    if (!file.header?.ifcxVersion?.toLowerCase().includes('ifcx')) {
        throw new Error(`Invalid IFCX overlay "${overlayName}": missing or invalid header.ifcxVersion`);
    }
    // Add to layer stack (at top = strongest)
    baseResult.layerStack.addLayer(file, overlayBuffer, overlayName, {
        type: 'file',
        filename: overlayName,
        size: overlayBuffer.byteLength,
    });
    // Re-compose with new layer
    // Collect all files from the layer stack
    const files = baseResult.layerStack
        .getLayers()
        .map((layer) => ({
        buffer: layer.buffer,
        name: layer.name,
    }))
        .reverse(); // Reverse because layers are stored strongest-first
    return parseFederatedIfcx(files, options);
}
//# sourceMappingURL=index.js.map