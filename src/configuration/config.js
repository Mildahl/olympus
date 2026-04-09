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
    devMode: false,
    amountTestCubes: 3,
    
    scriptBaseUrl: null,
    
    pyodideBaseUrl: null,
    
    pyodideWorkerUrl: null,
    
    monacoBaseUrl: null,

    vendorBaseUrl: "/vendor",

    dataBaseUrl: "/data",

    ifcSamplesBaseUrl: "/data/ifc",
    
    pythonToolsBaseUrl: "/dist/pytools",

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

const themeDayNight = {
      day: {
        "background": {
          key: "--theme-background",
          value: "#ebebebff",
        },
        "light-text":
        {
          key: "--theme-light-text",
          value: "#438a38",
        },
        "light-text2":
        {
          key: "--theme-text-light",
          value: "#191b1b",
        },
        "border": {
          key: "--border",
          value: "#438a38",
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
          value: "#629c5c",
        },
        "glass-surface": {
          key: "--glass-surface",
          value: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
        },
      },
      
      night: {
        "background": {
          key: "--theme-background",
          value: "#121212",
        },
        "light-text":
        {
          key: "--theme-light-text",
          value: "#969c94",
        },
        "light-text2":
        {
          key: "--theme-text-light",
          value: "#b4bcbe",
        },
        "border": {
          key: "--border",
          value: "#1e251e",
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
          value: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
        },
      },
};

const pieMenu = [
  {
    id: "pie-dim-elements",
    name: "Dim Elements",
    icon: "highlight_off",
    operator: "viewer.dim_elements",
  },
  {
    id: "pie-undim-elements",
    name: "Undim Elements",
    icon: "highlight_off",
    operator: "viewer.undim_elements",
  },
  {
    id: "pie-highlight-elements",
    name: "Highlight Elements",
    icon: "highlight",
    operator: "viewer.highlight_elements",
  },
  {
    id: "pie-unhighlight-elements",
    name: "Unhighlight Elements",
    icon: "highlight_off",
    operator: "viewer.unhighlight_elements",
  }
];


const UIConfig = {
  showWelcomeScreen: false,
  pieMenu: {items: pieMenu, shortcut: "P"},
  theme: {
    default: "night",
    colors: themeDayNight,
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
