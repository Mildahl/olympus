/**
 * Spatial Core Functions
 * 
 * Core business logic for spatial tree management and object selection.
 * These functions are called by operators and should remain decoupled from UI.
 * 
 * All functions use GlobalIds for layer/object identification to maintain
 * decoupling between modules.
 */
/**
 * Open the spatial manager panel
 * @param {Object} options
 * @param {Object} options.signals - Context signals
 * @returns {Object} Status result
 */
function openSpatialManager({ signals }) {

    signals.openSpatialManager.dispatch();
    
    return { status: 'FINISHED' };
}

/**
 * Enable editing for a specific layer in the spatial manager
 * @param {string|null} layerGuid - GlobalId of the layer to enable editing for (or null to disable)
 * @param {Object} options
 * @param {Object} options.signals - Context signals
 * @returns {Object} Status result
 */
function enableEditingForLayer(layerGuid, { signals }) {
    signals.enableEditingSpatialStructure.dispatch(layerGuid);
    return { status: 'FINISHED', layerGuid };
}

/**
 * Refresh the spatial manager UI
 * @param {string|null} layerGuid - Optional layer GlobalId for refresh context
 * @param {Object} options
 * @param {Object} options.editor - Editor instance
 * @returns {Object} Status result
 */
function refreshSpatialManager(layerGuid, { editor }) {
    if (editor?.signals?.refreshSpatialManager) {
        editor.signals.refreshSpatialManager.dispatch(layerGuid);
    }
    
    return { status: 'FINISHED' };
}
/**
 * Collapse all nodes in spatial tree
 * @param {Object} options
 * @param {Object} options.signals - Context signals
 */
function collapseAllNodes({ signals }) {
    if (signals?.spatialCollapseAll) {
        signals.spatialCollapseAll.dispatch();
    }
    
    return { status: 'FINISHED' };
}

/**
 * Expand all nodes in spatial tree
 * @param {Object} options
 * @param {Object} options.signals - Context signals
 */
function expandAllNodes({ signals }) {
    if (signals?.spatialExpandAll) {
        signals.spatialExpandAll.dispatch();
    }
    
    return { status: 'FINISHED' };
}

/**
 * Expand nodes to a specific level
 * @param {number} level - Level to expand to
 * @param {Object} options
 */
function expandToLevel(level, { signals }) {
    if (signals?.expandToLevel) {
        signals.expandToLevel.dispatch(level);
    }
    
    return { status: 'FINISHED', level };
}
/**
 * Select an object by GlobalId
 * @param {string} GlobalId - Object GlobalId
 * @param {boolean} additive - Add to existing selection
 * @param {Object} options
 * @param {Object} options.editor - Editor instance
 * @param {Object} options.signals - Context signals
 */
function selectObject(GlobalId, additive = false, { editor, signals }) {

    let selectedObject = null;
    
    editor.scene.traverse((object) => {
        if (object.GlobalId === GlobalId || object.uuid === GlobalId) {
            selectedObject = object;
        }
    });
    
    if (selectedObject) {

        additive ? editor.addToSelection(selectedObject) : editor.select(selectedObject);

        signals.objectSelected.dispatch(selectedObject);

        return { status: 'FINISHED', object: selectedObject };
    }
    
    return { status: 'ERROR', message: 'Object not found' };
}

/**
 * Deselect all objectsssss
 * @param {Object} options
 */
function deselectAll({ editor, signals }) {

    editor.deselect();
    
    return { status: 'FINISHED' };
}

/**
 * Get current selection
 * @param {Object} options
 * @returns {Array} Selected objects
 */
function getSelection({ editor }) {
    return editor?.selected ? [editor.selected] : [];
}
/**
 * Hide an object
 * @param {string} GlobalId - Object GlobalId
 * @param {Object} options
 */
function hideObject(GlobalId, { editor, signals }) {
    let targetObject = null;
    
    editor?.scene?.traverse((object) => {
        if (object.GlobalId === GlobalId || object.uuid === GlobalId) {
            targetObject = object;

            object.visible = false;
        }
    });
    
    if (targetObject && signals?.objectVisibilityChanged) {
        signals.objectVisibilityChanged.dispatch({ GlobalId, visible: false });
    }
    
    return { status: 'FINISHED', hidden: !!targetObject };
}

/**
 * Show an object
 * @param {string} GlobalId - Object GlobalId
 * @param {Object} options
 */
function showObject(GlobalId, { editor, signals }) {
    let targetObject = null;
    
    editor?.scene?.traverse((object) => {
        if (object.GlobalId === GlobalId || object.uuid === GlobalId) {
            targetObject = object;

            object.visible = true;
        }
    });
    
    if (targetObject && signals?.objectVisibilityChanged) {
        signals.objectVisibilityChanged.dispatch({ GlobalId, visible: true });
    }
    
    return { status: 'FINISHED', shown: !!targetObject };
}

/**
 * Toggle object visibility
 * @param {string} GlobalId - Object GlobalId
 * @param {Object} options
 */
function toggleObjectVisibility(GlobalId, { editor, signals }) {
    let targetObject = null;

    let newVisibility = false;
    
    editor?.scene?.traverse((object) => {
        if (object.GlobalId === GlobalId || object.uuid === GlobalId) {
            targetObject = object;

            object.visible = !object.visible;

            newVisibility = object.visible;
        }
    });
    
    if (targetObject && signals?.objectVisibilityChanged) {
        signals.objectVisibilityChanged.dispatch({ GlobalId, visible: newVisibility });
    }
    
    return { status: 'FINISHED', visible: newVisibility };
}

/**
 * Isolate selection (hide all except selected)
 * @param {Object} options
 */
function isolateSelection({ editor, signals }) {
    const selected = editor?.selected;
    
    if (!selected) {
        return { status: 'ERROR', message: 'No selection' };
    }
    
    const selectedIds = new Set();
    function collectIds(object) {
        selectedIds.add(object.uuid);

        selectedIds.add(object.GlobalId);
        
        object.traverse((child) => {
            selectedIds.add(child.uuid);

            selectedIds.add(child.GlobalId);
        });
    }
    
    collectIds(selected);
    editor.scene.traverse((object) => {
        if (object.isMesh && !selectedIds.has(object.uuid) && !selectedIds.has(object.GlobalId)) {
            object.visible = false;
        }
    });
    
    if (signals?.isolationChanged) {
        signals.isolationChanged.dispatch({ isolated: true });
    }
    
    return { status: 'FINISHED' };
}

/**
 * Show all objects
 * @param {Object} options
 */
function showAll({ editor, signals }) {
    editor?.scene?.traverse((object) => {
        if (object.isMesh) {
            object.visible = true;
        }
    });
    
    if (signals?.isolationChanged) {
        signals.isolationChanged.dispatch({ isolated: false });
    }
    
    return { status: 'FINISHED' };
}
/**
 * Move an object
 * @param {string} GlobalId - Object GlobalId
 * @param {Object} position - New position { x, y, z }
 * @param {Object} options
 */
function moveObject(GlobalId, position, { editor, signals }) {
    let targetObject = null;
    
    editor?.scene?.traverse((object) => {
        if (object.GlobalId === GlobalId || object.uuid === GlobalId) {
            targetObject = object;

            object.position.set(position.x, position.y, position.z);
        }
    });
    
    if (targetObject && signals?.objectMoved) {
        signals.objectMoved.dispatch({ GlobalId, position });
    }
    
    return { status: 'FINISHED', moved: !!targetObject };
}

/**
 * Focus camera on object
 * @param {string} GlobalId - Object GlobalId
 * @param {Object} options
 */
function focusOnObject(GlobalId, { editor, signals }) {
    let targetObject = null;
    
    editor?.scene?.traverse((object) => {
        if (object.GlobalId === GlobalId || object.uuid === GlobalId) {
            targetObject = object;
        }
    });
    
    if (targetObject && editor?.focus) {
        editor.focus(targetObject);
        
        if (signals?.cameraFocused) {
            signals.cameraFocused.dispatch({ GlobalId, object: targetObject });
        }
        
        return { status: 'FINISHED', focused: true };
    }
    
    return { status: 'ERROR', message: 'Object not found' };
}

export {
    openSpatialManager,
    enableEditingForLayer,
    refreshSpatialManager,
    collapseAllNodes,
    expandAllNodes,
    expandToLevel,
    selectObject,
    deselectAll,
    getSelection,
    hideObject,
    showObject,
    toggleObjectVisibility,
    isolateSelection,
    showAll,
    moveObject,
    focusOnObject
};
