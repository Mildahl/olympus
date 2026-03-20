/**
 * Section Box Core Functions
 * 
 * Core business logic for section box clipping.
 * These functions are called by operators and should remain decoupled from UI.
 */

import SectionBoxTool from '../tool/viewer/SectionBoxTool.js';
const sectionBoxState = {
    isActive: false,
    bounds: null,
    visible: true
};
/**
 * Activate section box
 * @param {Object} options
 * @param {Object} options.sectionBoxTool - Section box tool
 * @param {Object} options.context - Application context
 * @param {Object} options.editor - Editor instance
 * @param {Object} options.signals - Context signals
 */
function activateSectionBox({ sectionBoxTool = SectionBoxTool, context, editor, signals }) {
    sectionBoxState.isActive = true;
    
    sectionBoxTool.activate(editor);
    
    if (signals?.sectionBoxActivated) {
        signals.sectionBoxActivated.dispatch();
    }
    
    return { isActive: true };
}

/**
 * Deactivate section box
 * @param {Object} options
 */
function deactivateSectionBox({ sectionBoxTool = SectionBoxTool, context, editor, signals }) {
    sectionBoxState.isActive = false;
    
    sectionBoxTool.deactivate(editor);
    
    if (signals?.sectionBoxDeactivated) {
        signals.sectionBoxDeactivated.dispatch();
    }
    
    return { isActive: false };
}

/**
 * Toggle section box
 * @param {Object} options
 */
function toggleSectionBox({ sectionBoxTool = SectionBoxTool, context, editor, signals }) {
    if (sectionBoxState.isActive) {
        return deactivateSectionBox({ sectionBoxTool, context, editor, signals });
    }

    return activateSectionBox({ sectionBoxTool, context, editor, signals });
}

/**
 * Set section box bounds
 * @param {Object} bounds - Bounds object { min: {x,y,z}, max: {x,y,z} }
 * @param {Object} options
 */
function setSectionBoxBounds(bounds, { sectionBoxTool = SectionBoxTool, context, editor, signals }) {
    sectionBoxState.bounds = bounds;
    
    sectionBoxTool.setBounds(editor, bounds);
    
    if (signals?.sectionBoxBoundsChanged) {
        signals.sectionBoxBoundsChanged.dispatch(bounds);
    }
    
    return bounds;
}

/**
 * Fit section box to selection
 * @param {Object} options
 */
function fitSectionBoxToSelection({ sectionBoxTool = SectionBoxTool, context, editor, signals }) {
    const bounds = sectionBoxTool.fitToSelection(editor);
    
    if (bounds) {
        sectionBoxState.bounds = bounds;
        
        if (signals?.sectionBoxBoundsChanged) {
            signals.sectionBoxBoundsChanged.dispatch(bounds);
        }
    }
    
    return bounds;
}

/**
 * Fit section box to all objects
 * @param {Object} options
 */
function fitSectionBoxToAll({ sectionBoxTool = SectionBoxTool, context, editor, signals }) {
    const bounds = sectionBoxTool.fitToAll(editor);
    
    if (bounds) {
        sectionBoxState.bounds = bounds;
        
        if (signals?.sectionBoxBoundsChanged) {
            signals.sectionBoxBoundsChanged.dispatch(bounds);
        }
    }
    
    return bounds;
}

/**
 * Reset section box to default
 * @param {Object} options
 */
function resetSectionBox({ sectionBoxTool = SectionBoxTool, context, editor, signals }) {
    sectionBoxTool.reset(editor);

    sectionBoxState.bounds = null;
    
    if (signals?.sectionBoxReset) {
        signals.sectionBoxReset.dispatch();
    }
}

/**
 * Set section box visibility
 * @param {boolean} visible - Visibility state
 * @param {Object} options
 */
function setSectionBoxVisibility(visible, { sectionBoxTool = SectionBoxTool, context, editor, signals }) {
    sectionBoxState.visible = visible;
    
    sectionBoxTool.setVisibility(editor, visible);
    
    if (signals?.sectionBoxVisibilityChanged) {
        signals.sectionBoxVisibilityChanged.dispatch(visible);
    }
    
    return visible;
}

/**
 * Get section box state
 * @returns {Object} Current section box state
 */
function getSectionBoxState() {
    return { ...sectionBoxState };
}

/**
 * Get section box bounds
 * @param {Object} options
 * @returns {Object|null} Current bounds
 */
function getSectionBoxBounds({ sectionBoxTool = SectionBoxTool, editor }) {
    return sectionBoxTool.getBounds(editor) || sectionBoxState.bounds;
}

/**
 * Expand section box by offset
 * @param {number} offset - Offset amount
 * @param {Object} options
 */
function expandSectionBox(offset, { sectionBoxTool = SectionBoxTool, context, editor, signals }) {
    const bounds = sectionBoxTool.expand(editor, offset);
    
    if (bounds) {
        sectionBoxState.bounds = bounds;
        
        if (signals?.sectionBoxBoundsChanged) {
            signals.sectionBoxBoundsChanged.dispatch(bounds);
        }
    }
    
    return bounds;
}

export {
    activateSectionBox,
    deactivateSectionBox,
    toggleSectionBox,
    setSectionBoxBounds,
    fitSectionBoxToSelection,
    fitSectionBoxToAll,
    resetSectionBox,
    setSectionBoxVisibility,
    getSectionBoxState,
    getSectionBoxBounds,
    expandSectionBox
};
