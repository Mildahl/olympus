import { coreModules } from "./config.modules.js";

import { Shortcuts } from "./config.shortcuts.js";

import { SceneConfig } from "./config.scene.js";

import { NavigationConfig } from "./config.navigation.js";

import { WorldComponent } from "./config.ui.js";

const ApplicationConfig = {
  Name: "AECO Simulation",
  Version: "20.12.2025",
  History: true,
  CoreModules: coreModules,
  Scene: SceneConfig,
  Shortcuts: Shortcuts,
  Settings: {
    save: true,
    persistSettings: false,
    devMode: true,
    amountTestCubes: 3,
    scriptBaseUrl: null,
    pyodideWorkerUrl: "/dist/pyodide.worker.js",
    pythonToolsBaseUrl: "/dist/pytools",

    pyodideBaseUrl: "/examples/vendor/pyodide/v0.29.0/full",
    monacoBaseUrl: "/examples/vendor/monaco-editor/0.52.2",
    vendorBaseUrl: "/examples/vendor",
    
    dataBaseUrl: "/data",
    ifcSamplesBaseUrl: "/data/ifc",

  },
  Navigation : NavigationConfig,
  // Align Editor history with app History so undo/redo and History UI work (default preset)
  Editor: {
    'settings/history': true,
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
  WorldComponent: WorldComponent,
  pieMenu: {items: pieMenu, shortcut: "P"},
  showWelcomeScreen: false,
  theme: {
    default: "night",
    colors: themeDayNight,
  },
  language: "en",
};


export const AECOConfiguration = {
    ui: UIConfig,
    app: ApplicationConfig,
}
