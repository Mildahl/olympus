/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
/**
 * Layer Stack manages ordered IFCX layers for federated composition.
 */
export class LayerStack {
    layers = [];
    nextId = 1;
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
    addLayer(file, buffer, name, source) {
        const id = `layer-${this.nextId++}`;
        // Index nodes by path
        const nodesByPath = new Map();
        for (const node of file.data) {
            const existing = nodesByPath.get(node.path) || [];
            existing.push(node);
            nodesByPath.set(node.path, existing);
        }
        const layer = {
            id,
            name,
            file,
            buffer,
            strength: 0, // Will be updated
            enabled: true,
            source: source || { type: 'buffer', name },
            nodesByPath,
            loadedAt: Date.now(),
        };
        // Insert at top (strongest position)
        this.layers.unshift(layer);
        // Update all strengths
        this.updateStrengths();
        return id;
    }
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
    addLayerAt(file, buffer, name, position, source) {
        const id = `layer-${this.nextId++}`;
        const nodesByPath = new Map();
        for (const node of file.data) {
            const existing = nodesByPath.get(node.path) || [];
            existing.push(node);
            nodesByPath.set(node.path, existing);
        }
        const layer = {
            id,
            name,
            file,
            buffer,
            strength: position,
            enabled: true,
            source: source || { type: 'buffer', name },
            nodesByPath,
            loadedAt: Date.now(),
        };
        // Insert at specified position
        const clampedPos = Math.max(0, Math.min(position, this.layers.length));
        this.layers.splice(clampedPos, 0, layer);
        this.updateStrengths();
        return id;
    }
    /**
     * Remove a layer from the stack.
     */
    removeLayer(layerId) {
        const index = this.layers.findIndex((l) => l.id === layerId);
        if (index === -1)
            return false;
        this.layers.splice(index, 1);
        this.updateStrengths();
        return true;
    }
    /**
     * Reorder layers based on new order of IDs.
     * IDs not in the list are removed. IDs not found are ignored.
     */
    reorderLayers(orderedIds) {
        const layerMap = new Map(this.layers.map((l) => [l.id, l]));
        const newLayers = [];
        for (const id of orderedIds) {
            const layer = layerMap.get(id);
            if (layer) {
                newLayers.push(layer);
            }
        }
        this.layers = newLayers;
        this.updateStrengths();
    }
    /**
     * Move a layer to a new position.
     */
    moveLayer(layerId, newPosition) {
        const currentIndex = this.layers.findIndex((l) => l.id === layerId);
        if (currentIndex === -1)
            return false;
        const [layer] = this.layers.splice(currentIndex, 1);
        const clampedPos = Math.max(0, Math.min(newPosition, this.layers.length));
        this.layers.splice(clampedPos, 0, layer);
        this.updateStrengths();
        return true;
    }
    /**
     * Toggle layer enabled state.
     */
    setLayerEnabled(layerId, enabled) {
        const layer = this.layers.find((l) => l.id === layerId);
        if (!layer)
            return false;
        layer.enabled = enabled;
        return true;
    }
    /**
     * Toggle layer enabled state.
     */
    toggleLayer(layerId) {
        const layer = this.layers.find((l) => l.id === layerId);
        if (!layer)
            return false;
        layer.enabled = !layer.enabled;
        return true;
    }
    /**
     * Get a layer by ID.
     */
    getLayer(layerId) {
        return this.layers.find((l) => l.id === layerId);
    }
    /**
     * Get all layers in order (strongest first).
     */
    getLayers() {
        return this.layers;
    }
    /**
     * Get only enabled layers in order (strongest first).
     */
    getEnabledLayers() {
        return this.layers.filter((l) => l.enabled);
    }
    /**
     * Get layer count.
     */
    get count() {
        return this.layers.length;
    }
    /**
     * Check if stack is empty.
     */
    get isEmpty() {
        return this.layers.length === 0;
    }
    /**
     * Clear all layers.
     */
    clear() {
        this.layers = [];
    }
    /**
     * Get all unique paths across all enabled layers.
     */
    getAllPaths() {
        const paths = new Set();
        for (const layer of this.getEnabledLayers()) {
            for (const path of layer.nodesByPath.keys()) {
                paths.add(path);
            }
        }
        return paths;
    }
    /**
     * Get nodes for a path from all enabled layers, ordered by strength.
     */
    getNodesForPath(path) {
        const results = [];
        for (const layer of this.getEnabledLayers()) {
            const nodes = layer.nodesByPath.get(path);
            if (nodes && nodes.length > 0) {
                results.push({ layer, nodes });
            }
        }
        return results;
    }
    /**
     * Check if a path exists in any enabled layer.
     */
    hasPath(path) {
        for (const layer of this.getEnabledLayers()) {
            if (layer.nodesByPath.has(path)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Get summary statistics.
     */
    getStats() {
        const enabledLayers = this.getEnabledLayers();
        let totalNodes = 0;
        const uniquePaths = new Set();
        for (const layer of enabledLayers) {
            for (const [path, nodes] of layer.nodesByPath) {
                uniquePaths.add(path);
                totalNodes += nodes.length;
            }
        }
        return {
            layerCount: this.layers.length,
            enabledCount: enabledLayers.length,
            totalNodes,
            uniquePaths: uniquePaths.size,
        };
    }
    /**
     * Update strength values based on current order.
     */
    updateStrengths() {
        for (let i = 0; i < this.layers.length; i++) {
            this.layers[i].strength = i;
        }
    }
}
/**
 * Create a new empty layer stack.
 */
export function createLayerStack() {
    return new LayerStack();
}
//# sourceMappingURL=layer-stack.js.map