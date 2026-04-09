/**
 * Federated Composition Engine for IFCX
 *
 * Composes multiple IFCX files (layers) into a unified stage using
 * USD-inspired layer semantics:
 * - Higher layers (lower index) have stronger opinions
 * - Attributes merge with strongest layer winning
 * - Children accumulate across layers
 * - null values remove attributes/children
 * - Inheritance is resolved across layer boundaries
 */
import type { IfcxFile, ComposedNode } from './types.js';
import { LayerStack } from './layer-stack.js';
import { PathIndex } from './path-resolver.js';
/**
 * Options for federated composition.
 */
export interface ComposeOptions {
    /** Progress callback */
    onProgress?: (phase: string, percent: number) => void;
    /** Maximum inheritance depth (default: 10) */
    maxInheritDepth?: number;
}
/**
 * Extended ComposedNode with source tracking.
 */
export interface ComposedNodeWithSources extends ComposedNode {
    /** Track which layer contributed each attribute */
    attributeSources: Map<string, {
        layerId: string;
        layerName: string;
    }>;
    /** All layers that contributed to this node */
    contributingLayers: Set<string>;
}
/**
 * Result of federated composition.
 */
export interface FederatedCompositionResult {
    /** Composed nodes by path */
    composed: Map<string, ComposedNodeWithSources>;
    /** Path index for lookups */
    pathIndex: PathIndex;
    /** Root nodes (no parent) */
    roots: ComposedNodeWithSources[];
    /** Statistics */
    stats: {
        totalNodes: number;
        layersUsed: number;
        inheritanceResolutions: number;
        crossLayerReferences: number;
    };
}
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
export declare function composeFederated(layerStack: LayerStack, options?: ComposeOptions): FederatedCompositionResult;
/**
 * Compose a single IFCX file (convenience wrapper).
 */
export declare function composeSingleFile(file: IfcxFile): FederatedCompositionResult;
//# sourceMappingURL=federated-composition.d.ts.map