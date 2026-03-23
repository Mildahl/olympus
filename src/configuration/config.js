import { coreModules } from "./config.modules.js";

import { Shortcuts } from "./config.shortcuts.js";

import { SceneConfig } from "./config.scene.js";

import { NavigationConfig } from "./config.navigation.js";

const ApplicationConfig = {
  Name: "AECO Simulation",
  Version: "20.12.2025",
  History: true,
  CoreModules: coreModules,
  Scene: SceneConfig,
  Shortcuts: Shortcuts,
  Settings: {
    save: true,
    /** When true, user opted in via Welcome panel to persist settings to localStorage. Default false = config presets are source of truth. */
    persistSettings: false,
    devMode: false, 
    amountTestCubes: 3,
    
    scriptBaseUrl: null,
    
    pyodideBaseUrl: null,
    
    pyodideWorkerUrl: null,
    
    monacoBaseUrl: null,

    vendorBaseUrl: "/external/vendor",

    dataBaseUrl: "/external/data",

    pythonToolsBaseUrl: "/external/pytools",

    ifcSamplesBaseUrl: "/external/ifc",
  },
  Navigation : NavigationConfig,
  Editor: {
    'language': (() => {
      const userLang = navigator.language.split('-')[0];

      return ['fr', 'ja', 'zh', 'ko', 'fa'].includes(userLang) ? userLang : 'en';
    })(),
    'autosave': true,
    'project/title': '',
    'project/editable': false,
    'project/vr': false,
    'project/renderer/antialias': true,
    'project/renderer/shadows': false,
    'project/renderer/shadowType': 1,
    'project/renderer/toneMapping': 0,
    'project/renderer/toneMappingExposure': 1,
    'settings/history': true,
    'settings/shortcuts/translate': 'w',
    'settings/shortcuts/rotate': 'e',
    'settings/shortcuts/scale': 'r',
    'settings/shortcuts/undo': 'z',
    'settings/shortcuts/focus': 'f',
  },
};

const UIConfig = {
  showWelcomeScreen: true,
  theme: {
    default: "night",
    colors: {
      day: {
        "background": {
          key: "--theme-background",
          value: "#ebebeb",
        },
        "text": {
          key: "--theme-text",
          value: "#121212",
        },
        "subtext": {
          key: "--theme-subtext",
          value: "#333333",
        },
        "brand-color": {
          key: "--brand-color",
          value: "#a0ff96",
        },
        "glass-surface": {
          key: "--glass-surface",
          value: "rgba(255,255,255,0.08)",
        },
      },
      night: {
        "background": {
          key: "--theme-background",
          value: "#121212",
        },
        "text": {
          key: "--theme-text",
          value: "#ffffff",
        },
        "subtext": {
          key: "--theme-subtext",
          value: "#ADADAD",
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
    },
  },
  language: "en",
  mobileLandscapePrompt: true,
  notifications: {
    showToasts: false,
  },
};

export const AECOConfiguration = {
    ui: UIConfig,
    app: ApplicationConfig,
}
