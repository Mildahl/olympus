/**
 * Measure Core Functions
 * 
 * Core business logic for measurement tools.
 * These functions are called by operators and should remain decoupled from UI.
 */

import MeasureTool from '../tool/viewer/MeasureTool.js';
const measureState = {
    isActive: false,
    currentMode: null,
    measurements: []
};
/**
 * Activate measurement mode
 * @param {string} mode - Measurement mode: 'distance', 'area', 'angle', 'point'
 * @param {Object} options
 * @param {Object} options.measureTool - Measure tool
 * @param {Object} options.context - Application context
 * @param {Object} options.signals - Context signals
 */
function activateMeasure(mode = 'distance', { measureTool = MeasureTool, context, signals }) {
    measureState.isActive = true;

    measureState.currentMode = mode;
    
    measureTool.activate(context, mode);
    
    if (signals?.measureActivated) {
        signals.measureActivated.dispatch({ mode });
    }
    
    return { isActive: true, mode };
}

/**
 * Deactivate measurement mode
 * @param {Object} options
 */
function deactivateMeasure({ measureTool = MeasureTool, context, signals }) {
    measureState.isActive = false;

    measureState.currentMode = null;
    
    measureTool.deactivate(context);
    
    if (signals?.measureDeactivated) {
        signals.measureDeactivated.dispatch();
    }
    
    return { isActive: false };
}

/**
 * Toggle measurement mode
 * @param {string} mode - Measurement mode
 * @param {Object} options
 */
function toggleMeasure(mode = 'distance', { measureTool = MeasureTool, context, signals }) {
    if (measureState.isActive && measureState.currentMode === mode) {
        return deactivateMeasure({ measureTool, context, signals });
    }

    return activateMeasure(mode, { measureTool, context, signals });
}

/**
 * Add a measurement point
 * @param {Object} point - Point coordinates { x, y, z }
 * @param {Object} options
 */
function addMeasurePoint(point, { measureTool = MeasureTool, context, signals }) {
    const result = measureTool.addPoint(context, point);
    
    if (signals?.measurePointAdded) {
        signals.measurePointAdded.dispatch(point);
    }
    
    return result;
}

/**
 * Complete current measurement
 * @param {Object} options
 */
function completeMeasurement({ measureTool = MeasureTool, context, signals }) {
    const measurement = measureTool.complete(context);
    
    if (measurement) {
        measureState.measurements.push(measurement);
        
        if (signals?.measurementCompleted) {
            signals.measurementCompleted.dispatch(measurement);
        }
    }
    
    return measurement;
}

/**
 * Clear all measurements
 * @param {Object} options
 */
function clearMeasurements({ measureTool = MeasureTool, context, signals }) {
    measureTool.clearAll(context);

    measureState.measurements = [];
    
    if (signals?.measurementsCleared) {
        signals.measurementsCleared.dispatch();
    }
}

/**
 * Remove a specific measurement
 * @param {string} id - Measurement ID
 * @param {Object} options
 */
function removeMeasurement(id, { measureTool = MeasureTool, context, signals }) {
    const index = measureState.measurements.findIndex(m => m.id === id);
    
    if (index !== -1) {
        measureState.measurements.splice(index, 1);
    }
    
    measureTool.remove(context, id);
    
    if (signals?.measurementRemoved) {
        signals.measurementRemoved.dispatch(id);
    }
}

/**
 * Get all measurements
 * @returns {Array} Array of measurements
 */
function getAllMeasurements() {
    return [...measureState.measurements];
}

/**
 * Get measurement state
 * @returns {Object} Current measurement state
 */
function getMeasureState() {
    return { ...measureState };
}

/**
 * Set measurement units
 * @param {string} units - 'meters', 'feet', 'inches', 'millimeters'
 * @param {Object} options
 */
function setMeasureUnits(units, { measureTool = MeasureTool, context, signals }) {
    measureTool.setUnits(context, units);
    
    if (signals?.measureUnitsChanged) {
        signals.measureUnitsChanged.dispatch(units);
    }
}

/**
 * Export measurements to JSON
 * @param {Object} options
 * @returns {string} JSON string
 */
function exportMeasurements({ measureTool = MeasureTool, context }) {
    return JSON.stringify(measureState.measurements);
}

/**
 * Import measurements from JSON
 * @param {string} json - JSON string
 * @param {Object} options
 */
function importMeasurements(json, { measureTool = MeasureTool, context, signals }) {
    const imported = JSON.parse(json);
    
    imported.forEach(m => {
        measureTool.import(context, m);

        measureState.measurements.push(m);
    });
    
    if (signals?.measurementsImported) {
        signals.measurementsImported.dispatch(imported);
    }
    
    return imported;
}

export {
    activateMeasure,
    deactivateMeasure,
    toggleMeasure,
    addMeasurePoint,
    completeMeasurement,
    clearMeasurements,
    removeMeasurement,
    getAllMeasurements,
    getMeasureState,
    setMeasureUnits,
    exportMeasurements,
    importMeasurements
};
