
import AECO_TOOLS from "../tool/index.js";

import { newScript } from "../core/scripting.js";

import {Strings} from "../ui/language/Strings.js";
 
const { Signal } = signals;

/**
 * @typedef {Object} IFCState
 * @property {Object|null} activeModel - Currently active IFC model
 * @property {Object|null} activeType - Currently active IFC type
 * @property {Array} availableModels - List of available models
 * @property {Object|null} activeWorkSchedule - Currently active work schedule
 * @property {Object|null} activeElement - Currently selected element
 * @property {string} geometryBackend - Preferred backend for IFC mesh generation
 * @property {'merged'|'multiMesh'} ifcGeometryAssembly - Per-element mesh assembly when building IFC layers
 * @property {boolean} geometryLoadInProgress - True while loadGeometryData is running
 */

/**
 * @typedef {Object} ContextConfig
 * @property {Object} ui - UI configuration
 * @property {Object} app - Application configuration (includes `Scene`; `Scene.camera` holds viewport camera parameters, persisted when changed from Settings)
 * @property {Array} addons - Loaded addons
 */

/**
 * @typedef {Object} Signal
 * @property {Function} add - Add a listener
 * @property {Function} addOnce - Add a one-time listener
 * @property {Function} remove - Remove a listener
 * @property {Function} dispatch - Dispatch the signal with data
 */

/**
 * Application context managing global state and event signals.
 * Central hub for communication between modules via signals.
 * 
 * @example
 * // Listen to theme changes
 * context.signals.themeChanged.add(({ theme }) => {
 *   console.log('Theme changed to:', theme);
 * });
 * 
 * // Dispatch a signal
 * context.signals.themeChanged.dispatch({ theme: 'dark' });
 */
class Context {
    constructor() {

        this.ui = {};

        /**
         * Actions pending completion after project load
         * @type {Object}
         */
        this.pendingActions = {
            loadIFC:  {completed: false },
            displayGeometry: { completed: false },
            renameProject: { completed: false, userChoice: null },
        }

        /**
         * Main DOM container element
         * @type {HTMLElement|null}
         */
        this.dom = null;

        /**
         * Localized strings (default until setConfig / setLanguage runs)
         * @type {import("../ui/language/Strings.js").Strings}
         */
        this.strings = new Strings({ language: 'en' });

        /**
         * Application configuration
         * @type {ContextConfig}
         */
        this.config = { ui: {}, app: {}, addons: [] };

        /**
         * Event signals for decoupled communication between modules
         * @type {Object.<string, Signal>}
         */
        this.signals = {};

        /**
         * Three.js editor instance
         * @type {Object|null}
         */
        this.editor = null;

        /**
         * IFC model state
         * @type {IFCState}
         */
        this.ifc = {
            activeModel: null,
            activeType: null,
            availableModels: [],
            activeWorkSchedule: null,
            activeElement: null,
            geometryBackend: "ifcopenshell",
            ifcGeometryAssembly: "merged",
            geometryLoadInProgress: false,
        }

        this._baseListeners();

        /**
         * Edit methods for configuration
         */
        this.edit = {
            /**
             * Change application language
             * @param {string} language - Language code
             */
            language: (language) => {
                this.config.ui.language = language;

                this.setLanguage(language);

                this._saveConfig();
            }
        }

    }

    /**
     * Add a new signal listener
     * @param {string} signalName - Name of the signal
     * @param {boolean} [editor=false] - Whether to add to editor signals
     */
    addListener(signalName, editor=false) {

        if (!editor ) {
            if (this.signals[signalName]) return
            
            this.signals[signalName] = new Signal();
        } else if (editor && this.editor) {
            if (this.editor.signals[signalName]) return
            
            this.editor.signals[signalName] = new Signal();
        }
    }

    /**
     * Add multiple signal listeners
     * @param {string[]} signals - Array of signal names
     * @param {boolean} [editor=false] - Whether to add to editor signals
     */
    addListeners(signals, editor=false) {

        signals.forEach(signalName => {

            this.addListener(signalName, editor);
            
        });
    }

    _baseListeners() {
        this.signals = {

            configurationUpdated: new Signal(),
            configurationSaved: new Signal(),
            configurationReset: new Signal(),

            showSpinner: new Signal(),
            locationChanged: new Signal(),

            activeLayerUpdate: new Signal(),
            themeChanged: new Signal(),
            themeColorsChanged: new Signal(),
            navigationModeChanged: new Signal(),
            navigationCameraRigChanged: new Signal(),
            flyModeEnabled: new Signal(),
            driveModeEnabled: new Signal(),
            newScript: new Signal(),
            scriptNameChanged: new Signal(),
            monacoEnabled: new Signal(),
            showCodeEditor: new Signal(), 
            openScript: new Signal(), 
            openOutput: new Signal(),
            openNodeEditor: new Signal(),
            codeCollectionsChanged: new Signal(),
            nodesCollectionsChanged: new Signal(),
            minimizeAllEditorPanels: new Signal(),
            maximizeEditorPanel: new Signal(),
            scriptExecutionCompleted: new Signal(), 
            scriptTabOpened: new Signal(), 
            scriptTabClosed: new Signal(), 
            scriptTabsRefresh: new Signal(), 
            newTerminal: new Signal(),
            terminalNameChanged: new Signal(),
            openTerminal: new Signal(),
            terminalOutput: new Signal(),
            terminalCleared: new Signal(),
            terminalClosed: new Signal(),
            terminalLanguageChanged: new Signal(),
            terminalExecuting: new Signal(),
            enableSpatialManager: new Signal(),
            openSpatialManager: new Signal(),
            enableEditingSpatialStructure: new Signal(),
            spatialCollapseAll: new Signal(),
            spatialExpandAll: new Signal(),
            spatialRefresh: new Signal(),
            spatialSelectObject: new Signal(),
            projectChanged: new Signal(), 
            bimEnabled: new Signal(),
            refreshBIMLayers: new Signal(),
            newIFCModel: new Signal(),
            activeModelChanged: new Signal(),
            directorAnalyticsContextChanged: new Signal(),

            activeTypeChanged: new Signal,
            newIFCGeometry: new Signal(),
            bimGeometryLoadProgress: new Signal(),
            enableEditingAttributes: new Signal(),

            elementCreated: new Signal(),
            elementDeleted: new Signal(),
            elementGeometryRefreshed: new Signal(),
            workschedulechanged: new Signal(),
            enableEditingWorkScheduleTasks: new Signal(),
            changeViewType: new Signal(),
            taskSelected: new Signal(),
            taskSelectionChanged: new Signal(),
            taskDetailsLoaded: new Signal(),
            nodePathExpanded: new Signal(),
            notificationAdded: new Signal(),
            notificationRead: new Signal(),
            viewpointsChanged: new Signal(),
            viewpointCreated: new Signal(),
            viewpointRemoved: new Signal(),
            viewpointUpdated: new Signal(),
            viewpointActivated: new Signal(),
            animationPathsChanged: new Signal(),
            animationPathCreated: new Signal(),
            animationPathRemoved: new Signal(),
            animationPathUpdated: new Signal(),
            animationPathActivated: new Signal(),
            animationPathPlaybackStarted: new Signal(),
            animationPathPlaybackEnded: new Signal(),
            animationPathPlaybackProgress: new Signal(),
            animationPathPlaybackPaused: new Signal(),
            measureToolToggled: new Signal(),
            measureModeChanged: new Signal(),
            measurementCreated: new Signal(),
            measurementsCleared: new Signal(),
            measureSnapToggled: new Signal(),
            toggleSnapMenu: new Signal(),
            snapOptionChanged: new Signal(),
            sectionBoxToggled: new Signal(),
            sectionBoxChanged: new Signal(),
        };
    }

    setConfig(uiConfig, appConfig) {
        
        const devMode = appConfig?.Settings?.devMode || false;

        this.initialUIConfig = JSON.parse(JSON.stringify(uiConfig));

        this.initialAppConfig = JSON.parse(JSON.stringify(appConfig));
        
        if (devMode) {
            this.config.ui = uiConfig;

            this.config.app = appConfig;
        } else {
            // Only use localStorage when user has opted in via Welcome panel (persistSettings).
            // Config / Settings Presets are the source of truth by default.
            const saved = localStorage.getItem('aeco-config');

            const userOptedInToPersist = (() => {
                if (!saved) return false;

                try {
                    const parsed = JSON.parse(saved);

                    return parsed?.app?.Settings?.persistSettings === true;
                } catch (_) {
                    return false;
                }
            })();

            if (userOptedInToPersist && saved) {
                const parsed = JSON.parse(saved);

                this.config.ui = this._deepMerge(uiConfig, parsed.ui || {});

                this.config.app = this._deepMerge(appConfig, parsed.app || {});

                
            } else {

                this.config.ui = uiConfig;

                this.config.app = appConfig;
            }

            this._migrateEditorConfig();

            this._saveConfig();
        }

        this.setLanguage(this.config.ui.language);
    }

    setAddonsConfig(addons) {
        const { ADDONS = [], Listeners = [] } = addons ?? {};

        context.addListeners(Listeners);

        this.config.addons = ADDONS;
    }

    setLanguage(language) {
        const resolved =
            language ||
            this.config.ui.language ||
            'en';

        this.strings = new Strings({ language: resolved });
    }

    _printWorldStructure() {

        const world = AECO_TOOLS.world.layer.World;

        const traverseWorld = (collection, depth = 0) => {

            for (const child of collection.children) {
                traverseWorld(child, depth + 1);
            }
        }

        traverseWorld(world);

    }

    fetchResources() {
        navigator.serviceWorker?.register("sw.js");
    }

    _deepMerge(target, source) {
        const result = { ...target };

        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this._deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }

        return result;
    }

    _getNestedValue(obj, path) {
        const keys = path.split('.');

        let current = obj;

        for (const key of keys) {
            if (current == null || typeof current !== 'object') return undefined;

            current = current[key];
        }

        return current;
    }

    _setNestedValue(obj, path, value) {
        const keys = path.split('.');

        let current = obj;

        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
                current[keys[i]] = {};
            }

            current = current[keys[i]];
        }

        current[keys[keys.length - 1]] = value;
    }

    _resetConfig() {
        this.config.ui = JSON.parse(JSON.stringify(this.initialUIConfig));

        this.config.app = JSON.parse(JSON.stringify(this.initialAppConfig));

        this._saveConfig();

        if (this.signals?.configurationReset) {
            this.signals.configurationReset.dispatch();
        }
    }

    _resetConfigOption(scope, path) {
        const initialConfig = scope === 'ui' ? this.initialUIConfig : this.initialAppConfig;

        const liveConfig = scope === 'ui' ? this.config.ui : this.config.app;

        const defaultValue = this._getNestedValue(initialConfig, path);

        this._setNestedValue(liveConfig, path, JSON.parse(JSON.stringify(defaultValue !== undefined ? defaultValue : null)));

        this._saveConfig();
    }

    _migrateEditorConfig() {
        const legacyKey = 'threejs-editor';

        const legacy = localStorage.getItem(legacyKey);

        if (!legacy) return;

        try {
            const data = JSON.parse(legacy);

            if (!this.config.app.Editor) this.config.app.Editor = {};

            for (const key in data) {
                if (!(key in this.config.app.Editor) || 
                    JSON.stringify(this.config.app.Editor[key]) === JSON.stringify(this._getNestedValue(this.initialAppConfig, 'Editor.' + key))) {
                    this.config.app.Editor[key] = data[key];
                }
            }

            localStorage.removeItem(legacyKey);
        } catch (_) {
            localStorage.removeItem(legacyKey);
        }
    }

    _saveConfig() {
        if (this.config.app.Settings?.devMode) {
            return;
        }

        if (this.config.app.Settings?.persistSettings !== true) {
            return;
        }

        const toSave = { ui: this.config.ui, app: this.config.app };

        localStorage.setItem('aeco-config', JSON.stringify(toSave));
    }

    /**
     * Clear all AECO-related localStorage data
     * Call this to reset the application to defaults
     */
    static clearStorage() {
        const keysToRemove = [
            'aeco-config'
        ];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);

            if (key && (key.startsWith('aeco-') || key.includes('resizer'))) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });

        return keysToRemove;
    }

}

const context = new Context();

export default context;