/**
 * Layer Core Functions
 * 
 * Core business logic for layer management.
 * These functions are called by operators and should remain decoupled from UI.
 */

import LayerTool from '../tool/viewer/LayerTool.js';
/**
 * Activate a layer (make it the current working layer)
 * @param {string} layerGuid - GUID of the layer to activate
 * @param {Object} options
 * @param {Object} options.layerTool - Layer management tool
 * @param {Object} options.signals - Context signals
 * @param {Object} options.context - Application context
 * @param {Object} options.editor - Editor instance
 * @returns {Object} Result containing the activated layer and status
 */
function activateLayer(layerGuid, { layerTool = LayerTool, signals, context, editor }) {
    const layer = layerTool.getLayerByGuid(layerGuid);
    
    if (!layer) {
        console.warn(`Layer with GUID ${layerGuid} not found`);

        return { layer: null, status: 'ERROR' };
    }
    
    context.activeLayer = layer;
    
    const world = layerTool.World;
    function setActive(node, target) {
        node.active = (node === target);

        if (node.children) {
            node.children.forEach(child => setActive(child, target));
        }
    }

    setActive(world, layer);
    signals.activeLayerUpdate.dispatch(world);

    return { layer, status: 'FINISHED' };
}

/**
 * Get a layer by name
 * @param {string} layerName - Name of the layer
 * @param {Object} options
 * @param {Object} options.layerTool - Layer management tool
 * @returns {Object|null} Layer object or null
 */
function getLayerByName(layerName, { layerTool = LayerTool }) {
    return layerTool.getLayerByName(layerName);
}

/**
 * Create a new layer
 * @param {Object} parent - Parent layer
 * @param {string} name - Layer name
 * @param {Object} options
 * @param {Object} options.layerTool - Layer management tool
 * @param {Object} options.signals - Context signals
 * @returns {Object} New layer
 */
function createLayer(parent, name, { layerTool = LayerTool, signals }) {
    const layer = layerTool.newLayer(parent, name);
    
    signals.layerCreated.dispatch(layer);
    
    return layer;
}

/**
 * Remove a layer
 * @param {Object} layer - Layer to remove
 * @param {Object} options
 * @param {Object} options.layerTool - Layer management tool
 * @param {Object} options.signals - Context signals
 */
function removeLayer(layer, { layerTool = LayerTool, signals }) {
    layerTool.removeLayer(layer);
    
    if (signals?.layerRemoved) {
        signals.layerRemoved.dispatch(layer);
    }
}

/**
 * Set layer visibility
 * @param {Object} layer - Layer to update
 * @param {boolean} visible - Visibility state
 * @param {Object} options
 * @param {Object} options.layerTool - Layer management tool
 * @param {Object} options.signals - Context signals
 */
function setLayerVisibility(layer, visible, { layerTool = LayerTool, signals }) {
    layer.visible = visible;
    
    if (layer.layer) {
        layer.layer.visible = visible;
    }
    
    if (signals?.layerVisibilityChanged) {
        signals.layerVisibilityChanged.dispatch({ layer, visible });
    }
}

/**
 * Get all layers in the world
 * @param {Object} options
 * @param {Object} options.layerTool - Layer management tool
 * @returns {Array} Array of all layers
 */
function getAllLayers({ layerTool = LayerTool }) {
    const layers = [];
    
    function collectLayers(node) {
        layers.push(node);

        if (node.children) {
            node.children.forEach(child => collectLayers(child));
        }
    }
    
    const world = layerTool.World;

    if (world) {
        collectLayers(world);
    }
    
    return layers;
}

export {
    activateLayer,
    getLayerByName,
    createLayer,
    removeLayer,
    setLayerVisibility,
    getAllLayers
};
