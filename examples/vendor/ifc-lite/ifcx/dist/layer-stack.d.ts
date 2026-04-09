/**
 * Layer Stack for Federated IFCX Composition
 *
 * Manages multiple IFCX files as ordered layers for USD-style composition.
 * Higher layers (lower index) have stronger opinions and override lower layers.
 */
import type { IfcxFile, IfcxNode } from './types.js';
/**
 * Source information for a layer.
 */
export type LayerSource = {
    type: 'file';
    filename: string;
    size: number;
} | {
    type: 'url';
    url: string;
} | {
    type: 'buffer';
    name: string;
};
/**
 * A single layer in the composition stack.
 */
export interface IfcxLayer {
    /** Unique identifier for this layer */
    id: string;
    /** Display name */
    name: string;
    /** Parsed IFCX file data */
    file: IfcxFile;
    /** Original buffer (for re-parsing if needed) */
    buffer: ArrayBuffer;
    /** Position in stack (0 = strongest) */
    strength: number;
    /** Whether this layer is enabled for composition */
    enabled: boolean;
    /** Source information */
    source: LayerSource;
    /** Nodes indexed by path for this layer */
    nodesByPath: Map<string, IfcxNode[]>;
    /** Timestamp when layer was loaded */
    loadedAt: number;
}
/**
 * Layer Stack manages ordered IFCX layers for federated composition.
 */
export declare class LayerStack {
    private layers;
    private nextId;
    /**
     * Add a new layer to the stack.
     * New layers are added at the top (strongest position).
     *
     * @param file - Parsed IFCX file
     * @param buffer - Original buffer
     * @param name - Display name for the layer
     * @param source - Source information
     * @returns Layer ID
     */
    addLayer(file: IfcxFile, buffer: ArrayBuffer, name: string, source?: LayerSource): string;
    /**
     * Add a layer at a specific position.
     *
     * @param file - Parsed IFCX file
     * @param buffer - Original buffer
     * @param name - Display name
     * @param position - Position in stack (0 = strongest)
     * @param source - Source information
     * @returns Layer ID
     */
    addLayerAt(file: IfcxFile, buffer: ArrayBuffer, name: string, position: number, source?: LayerSource): string;
    /**
     * Remove a layer from the stack.
     */
    removeLayer(layerId: string): boolean;
    /**
     * Reorder layers based on new order of IDs.
     * IDs not in the list are removed. IDs not found are ignored.
     */
    reorderLayers(orderedIds: string[]): void;
    /**
     * Move a layer to a new position.
     */
    moveLayer(layerId: string, newPosition: number): boolean;
    /**
     * Toggle layer enabled state.
     */
    setLayerEnabled(layerId: string, enabled: boolean): boolean;
    /**
     * Toggle layer enabled state.
     */
    toggleLayer(layerId: string): boolean;
    /**
     * Get a layer by ID.
     */
    getLayer(layerId: string): IfcxLayer | undefined;
    /**
     * Get all layers in order (strongest first).
     */
    getLayers(): readonly IfcxLayer[];
    /**
     * Get only enabled layers in order (strongest first).
     */
    getEnabledLayers(): IfcxLayer[];
    /**
     * Get layer count.
     */
    get count(): number;
    /**
     * Check if stack is empty.
     */
    get isEmpty(): boolean;
    /**
     * Clear all layers.
     */
    clear(): void;
    /**
     * Get all unique paths across all enabled layers.
     */
    getAllPaths(): Set<string>;
    /**
     * Get nodes for a path from all enabled layers, ordered by strength.
     */
    getNodesForPath(path: string): Array<{
        layer: IfcxLayer;
        nodes: IfcxNode[];
    }>;
    /**
     * Check if a path exists in any enabled layer.
     */
    hasPath(path: string): boolean;
    /**
     * Get summary statistics.
     */
    getStats(): {
        layerCount: number;
        enabledCount: number;
        totalNodes: number;
        uniquePaths: number;
    };
    /**
     * Update strength values based on current order.
     */
    private updateStrengths;
}
/**
 * Create a new empty layer stack.
 */
export declare function createLayerStack(): LayerStack;
//# sourceMappingURL=layer-stack.d.ts.map