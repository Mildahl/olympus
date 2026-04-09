/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { LayerStack } from './layer-stack.js';
import { PathIndex } from './path-resolver.js';
/**
 * Compose multiple IFCX layers into a unified stage.
 *
 * Algorithm:
 * 1. Build path index across all layers
 * 2. Collect all unique paths
 * 3. For each path, merge nodes from all layers (strongest first)
 * 4. Resolve inheritance references (may cross layers)
 * 5. Build parent-child tree from children references
 */
export function composeFederated(layerStack, options = {}) {
    const { onProgress, maxInheritDepth = 10 } = options;
    onProgress?.('indexing', 0);
    // Get enabled layers in strength order
    const layers = layerStack.getEnabledLayers();
    if (layers.length === 0) {
        return {
            composed: new Map(),
            pathIndex: new PathIndex(),
            roots: [],
            stats: {
                totalNodes: 0,
                layersUsed: 0,
                inheritanceResolutions: 0,
                crossLayerReferences: 0,
            },
        };
    }
    // Build path index
    const pathIndex = new PathIndex();
    pathIndex.buildIndex(layers);
    onProgress?.('indexing', 100);
    onProgress?.('merging', 0);
    // Phase 1: Collect and merge all nodes by path
    const preComposed = new Map();
    const allPaths = layerStack.getAllPaths();
    let pathCount = 0;
    const totalPaths = allPaths.size;
    for (const path of allPaths) {
        // Skip hierarchical paths - they're references, not definitions
        if (path.includes('/'))
            continue;
        const pre = mergeNodesForPath(path, layers);
        preComposed.set(path, pre);
        pathCount++;
        if (pathCount % 100 === 0) {
            onProgress?.('merging', Math.round((pathCount / totalPaths) * 100));
        }
    }
    onProgress?.('merging', 100);
    onProgress?.('inheritance', 0);
    // Phase 2: Resolve inheritance
    let inheritanceResolutions = 0;
    let crossLayerReferences = 0;
    const visited = new Set();
    for (const [path, pre] of preComposed) {
        const result = resolveInheritance(path, pre, preComposed, pathIndex, visited, new Set(), maxInheritDepth);
        inheritanceResolutions += result.resolutions;
        crossLayerReferences += result.crossLayer;
    }
    onProgress?.('inheritance', 100);
    onProgress?.('tree', 0);
    // Phase 3: Build composed tree
    const composed = new Map();
    for (const [path] of preComposed) {
        if (!composed.has(path)) {
            composeNode(path, preComposed, composed, new Set(), layers, pathIndex);
        }
    }
    onProgress?.('tree', 100);
    // Find roots
    const roots = findRoots(composed);
    return {
        composed,
        pathIndex,
        roots,
        stats: {
            totalNodes: composed.size,
            layersUsed: layers.length,
            inheritanceResolutions,
            crossLayerReferences,
        },
    };
}
/**
 * Merge all nodes for a path across layers.
 * Layers are processed in strength order (strongest first).
 */
function mergeNodesForPath(path, layers) {
    const result = {
        path,
        children: {},
        inherits: {},
        attributes: {},
        attributeSources: new Map(),
        definedInLayers: new Set(),
    };
    // Process layers in reverse order (weakest first) so stronger layers override
    for (let i = layers.length - 1; i >= 0; i--) {
        const layer = layers[i];
        const nodes = layer.nodesByPath.get(path);
        if (!nodes)
            continue;
        result.definedInLayers.add(layer.id);
        // Process all nodes for this path in this layer
        for (const node of nodes) {
            // Merge children
            if (node.children) {
                for (const [key, value] of Object.entries(node.children)) {
                    if (value === null) {
                        // null removes the child
                        delete result.children[key];
                    }
                    else {
                        result.children[key] = value;
                    }
                }
            }
            // Merge inherits
            if (node.inherits) {
                for (const [key, value] of Object.entries(node.inherits)) {
                    if (value === null) {
                        delete result.inherits[key];
                    }
                    else {
                        result.inherits[key] = value;
                    }
                }
            }
            // Merge attributes
            if (node.attributes) {
                for (const [key, value] of Object.entries(node.attributes)) {
                    result.attributes[key] = value;
                    result.attributeSources.set(key, layer.id);
                }
            }
        }
    }
    return result;
}
/**
 * Resolve inheritance for a pre-composed node.
 */
function resolveInheritance(path, pre, allNodes, pathIndex, resolved, visiting, maxDepth, depth = 0) {
    if (resolved.has(path)) {
        return { resolutions: 0, crossLayer: 0 };
    }
    if (visiting.has(path)) {
        // Circular inheritance - skip
        console.warn(`Circular inheritance detected at path: ${path}`);
        return { resolutions: 0, crossLayer: 0 };
    }
    if (depth > maxDepth) {
        console.warn(`Max inheritance depth exceeded at path: ${path}`);
        return { resolutions: 0, crossLayer: 0 };
    }
    visiting.add(path);
    let resolutions = 0;
    let crossLayer = 0;
    // Resolve each inherit reference
    for (const [, inheritPath] of Object.entries(pre.inherits)) {
        if (!inheritPath)
            continue;
        // Try to resolve the path (may be in different layer)
        const resolvedPath = pathIndex.resolvePath(inheritPath);
        if (!resolvedPath)
            continue;
        const inherited = allNodes.get(resolvedPath);
        if (!inherited)
            continue;
        // Check if cross-layer reference
        const inheritedLayers = inherited.definedInLayers;
        const hasCommonLayer = [...pre.definedInLayers].some((l) => inheritedLayers.has(l));
        if (!hasCommonLayer) {
            crossLayer++;
        }
        // Recursively resolve inheritance of the inherited node first
        const subResult = resolveInheritance(resolvedPath, inherited, allNodes, pathIndex, resolved, visiting, maxDepth, depth + 1);
        resolutions += subResult.resolutions;
        crossLayer += subResult.crossLayer;
        // Merge inherited data (inherited values are weaker - don't override existing)
        for (const [key, value] of Object.entries(inherited.attributes)) {
            if (!(key in pre.attributes)) {
                pre.attributes[key] = value;
                // Track source from inherited node
                const inheritedSource = inherited.attributeSources.get(key);
                if (inheritedSource) {
                    pre.attributeSources.set(key, inheritedSource);
                }
            }
        }
        for (const [key, value] of Object.entries(inherited.children)) {
            if (!(key in pre.children)) {
                pre.children[key] = value;
            }
        }
        resolutions++;
    }
    visiting.delete(path);
    resolved.add(path);
    return { resolutions, crossLayer };
}
/**
 * Compose a single node and its children.
 */
function composeNode(path, preComposed, composed, visiting, layers, pathIndex) {
    // Already composed?
    const existing = composed.get(path);
    if (existing)
        return existing;
    // Cycle detection
    if (visiting.has(path)) {
        // Return a stub to break the cycle
        const stub = {
            path,
            attributes: new Map(),
            children: new Map(),
            attributeSources: new Map(),
            contributingLayers: new Set(),
        };
        composed.set(path, stub);
        return stub;
    }
    visiting.add(path);
    const pre = preComposed.get(path);
    const node = {
        path,
        attributes: new Map(),
        children: new Map(),
        attributeSources: new Map(),
        contributingLayers: new Set(pre?.definedInLayers || []),
    };
    if (pre) {
        // Copy attributes
        for (const [key, value] of Object.entries(pre.attributes)) {
            node.attributes.set(key, value);
            // Track source
            const sourceLayerId = pre.attributeSources.get(key);
            if (sourceLayerId) {
                const layer = layers.find((l) => l.id === sourceLayerId);
                if (layer) {
                    node.attributeSources.set(key, {
                        layerId: layer.id,
                        layerName: layer.name,
                    });
                }
            }
        }
        // Resolve and add children
        for (const [name, childPath] of Object.entries(pre.children)) {
            if (!childPath)
                continue;
            // Child path might be hierarchical (uuid/ChildName) - resolve via pathIndex
            const resolvedChildPath = pathIndex.resolvePath(childPath) || childPath;
            const childPre = preComposed.get(resolvedChildPath);
            if (childPre) {
                const child = composeNode(resolvedChildPath, preComposed, composed, visiting, layers, pathIndex);
                node.children.set(name, child);
            }
        }
    }
    visiting.delete(path);
    composed.set(path, node);
    return node;
}
/**
 * Find root nodes (nodes with no parent).
 */
function findRoots(composed) {
    const childPaths = new Set();
    // Collect all child paths
    for (const node of composed.values()) {
        for (const child of node.children.values()) {
            childPaths.add(child.path);
        }
    }
    // Roots are nodes not referenced as children
    const roots = [];
    for (const node of composed.values()) {
        if (!childPaths.has(node.path)) {
            roots.push(node);
        }
    }
    return roots;
}
/**
 * Compose a single IFCX file (convenience wrapper).
 */
export function composeSingleFile(file) {
    const stack = new LayerStack();
    stack.addLayer(file, new ArrayBuffer(0), 'single');
    return composeFederated(stack);
}
//# sourceMappingURL=federated-composition.js.map