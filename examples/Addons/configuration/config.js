import { coreModules } from "./config.modules.js";

import { Shortcuts } from "./config.shortcuts.js";

import { SceneConfig } from "./config.scene.js";

import { NavigationConfig } from "./config.navigation.js";

import { WorldComponent } from "./config.ui.js";

const ROOT = window.__OLYMPUS_ROOT__ || '';

const ApplicationConfig = {
  Name: "AECO Simulation",
  Version: "20.12.2025",
  History: true,
  CoreModules: coreModules,
  Scene: SceneConfig,
  Shortcuts: Shortcuts,
  Settings: {
    save: true,
    persistSettings: true,
    devMode: false,
    amountTestCubes: 3,
    scriptBaseUrl: null,
    pyodideBaseUrl: ROOT + "/external/vendor/pyodide/v0.29.0/full",
    pyodideWorkerUrl: ROOT + "/dist/pyodide.worker.js",
    monacoBaseUrl: ROOT + "/external/vendor/monaco-editor/0.52.2",
    vendorBaseUrl: ROOT + "/external/vendor",
    dataBaseUrl: ROOT + "/external/data",
    pythonToolsBaseUrl: ROOT + "/external/pytools",
    ifcSamplesBaseUrl: ROOT + "/external/ifc",
  },
  Navigation : NavigationConfig,
  // Align Editor history with app History so undo/redo and History UI work (default preset)
  Editor: {
    'settings/history': true,
  },
};

const UIConfig = {
  WorldComponent: WorldComponent,
  showWelcomeScreen: true,
  theme: {
    default: "night",
    colors: {
      night: {
        "background": {
          key: "--theme-background",
          value: "#1b2122",
        },
        "text": {
          key: "--theme-text",
          value: "#ffffff",
        },
        "light-text": {
          key: "--theme-text-light",
          value: "#b9c2b6",
        },
        "subtext": {
          key: "--theme-subtext",
          value: "#ADADAD",
        },
        "border": {
          key: "--border",
          value: "#969c94",
        },
        "brand-color": {
          key: "--brand-color",
          value: "#a0ff96",
        },
        "glass-surface": {
          key: "--glass-surface",
          value: "rgba(28,30,34,0.5)",
        },
      },
      day: {
        "background": {
          key: "--theme-background",
          value: "#1b2122",
        },
        "text": {
          key: "--theme-text",
          value: "#121212",
        },
        "light-text": {
          key: "--theme-text-light",
          value: "#438a38",
        },
        "subtext": {
          key: "--theme-subtext",
          value: "#333333",
        },
        "border": {
          key: "--border",
          value: "#438a38",
        },
        "brand-color": {
          key: "--brand-color",
          value: "#629c5c",
        },
        "glass-surface": {
          key: "--glass-surface",
          value: "rgba(255,255,255,0.08)",
        },
      },

    },
  },
  language: "en",
};


export const AECOConfiguration = {
    ui: UIConfig,
    app: ApplicationConfig,
}
