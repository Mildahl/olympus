import { coreModules } from "./config.modules.js";

import { Shortcuts } from "./config.shortcuts.js";

import { SceneConfig } from "./config.scene.js";

import { NavigationConfig } from "./config.navigation.js";

import { WorldComponent } from "./config.ui.js";

import { AECOConfiguration as LibraryAECOConfiguration } from "../../../src/configuration/config.js";

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
    persistSettings: false,
    devMode: true,
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
  layout: LibraryAECOConfiguration.ui.layout,
  showWelcomeScreen: false,
  theme: {
    default: "night",
    colors: {
      night: {
        "background": {
          key: "--theme-background",
          value: "#1b2122",
        },
        "background-1618": {
          key: "--theme-background-1618",
          value: "#0d1117",
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
          value: "#3b4d34",
        },
        "brand-color": {
          key: "--brand-color",
          value: "#a0ff96",
        },
        "brand-color-soft": {
          key: "--brand-color-soft",
          value: "rgba(0, 212, 170, 0.15)",
        },
        "brand-color-alpha": {
          key: "--brand-color-alpha",
          value: "rgba(0, 212, 170, 0.25)",
        },
        "brand-color-hover": {
          key: "--brand-color-hover",
          value: "#00f5c4",
        },
        "glass-surface": {
          key: "--glass-surface",
          value: "rgba(28,30,34,0.5)",
        },
        "glass-surface-light": {
          key: "--glass-surface-light",
          value: "rgba(22, 27, 34, 0.95)",
        },
        "glass-surface-hover": {
          key: "--glass-surface-hover",
          value: "rgba(33, 38, 45, 0.95)",
        },
        "glass-shadow": {
          key: "--glass-shadow",
          value: "0 4px 20px rgba(0, 0, 0, 0.4)",
        },
        "glass-shadow-sm": {
          key: "--glass-shadow-sm",
          value: "0 2px 8px rgba(0, 0, 0, 0.3)",
        },
        "glass-border": {
          key: "--glass-border",
          value: "#3b4d34",
        },
        "glass-border-hover": {
          key: "--glass-border-hover",
          value: "rgba(0, 212, 170, 0.25)",
        },
        "theme-hover-bg": {
          key: "--theme-hover-bg",
          value: "rgba(22, 27, 34, 0.9)",
        },
        "border-hover": {
          key: "--border-hover",
          value: "rgba(0, 212, 170, 0.25)",
        },
        "active": {
          key: "--active",
          value: "rgba(0, 212, 170, 0.25)",
        },
        "windowbar-surface": {
          key: "--windowbar-surface",
          value: "rgba(18, 20, 24, 0.55)",
        },
        "windowbar-surface-strong": {
          key: "--windowbar-surface-strong",
          value: "rgba(10, 12, 16, 0.75)",
        },
        "windowbar-border": {
          key: "--windowbar-border",
          value: "rgba(255, 255, 255, 0.10)",
        },
        "windowbar-highlight": {
          key: "--windowbar-highlight",
          value: "rgba(255, 255, 255, 0.12)",
        },
        "windowbar-shadow": {
          key: "--windowbar-shadow",
          value: "0 8px 32px rgba(0, 0, 0, 0.55), 0 2px 8px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
        },
        "windowbar-blur": {
          key: "--windowbar-blur",
          value: "saturate(180%) blur(28px)",
        },
      },
      day: {
        "background": {
          key: "--theme-background",
          value: "#f0ebe2",
        },
        "background-1618": {
          key: "--theme-background-1618",
          value: "#e8e2d8",
        },
        "text": {
          key: "--theme-text",
          value: "#1c1512",
        },
        "light-text": {
          key: "--theme-text-light",
          value: "#7a6b58",
        },
        "subtext": {
          key: "--theme-subtext",
          value: "#9a8b78",
        },
        "border": {
          key: "--border",
          value: "rgba(160, 140, 115, 0.40)",
        },
        "brand-color": {
          key: "--brand-color",
          value: "#c4782a",
        },
        "brand-color-soft": {
          key: "--brand-color-soft",
          value: "rgba(196, 120, 42, 0.12)",
        },
        "brand-color-alpha": {
          key: "--brand-color-alpha",
          value: "rgba(196, 120, 42, 0.22)",
        },
        "brand-color-hover": {
          key: "--brand-color-hover",
          value: "#d88a38",
        },
        "glass-surface": {
          key: "--glass-surface",
          value: "rgba(255, 250, 242, 0.62)",
        },
        "glass-surface-light": {
          key: "--glass-surface-light",
          value: "rgba(255, 253, 247, 0.92)",
        },
        "glass-surface-hover": {
          key: "--glass-surface-hover",
          value: "rgba(255, 247, 232, 0.95)",
        },
        "glass-shadow": {
          key: "--glass-shadow",
          value: "0 4px 20px rgba(130, 95, 60, 0.16)",
        },
        "glass-shadow-sm": {
          key: "--glass-shadow-sm",
          value: "0 2px 8px rgba(130, 95, 60, 0.10)",
        },
        "glass-border": {
          key: "--glass-border",
          value: "rgba(160, 140, 115, 0.40)",
        },
        "glass-border-hover": {
          key: "--glass-border-hover",
          value: "rgba(196, 120, 42, 0.30)",
        },
        "theme-hover-bg": {
          key: "--theme-hover-bg",
          value: "rgba(244, 237, 224, 0.94)",
        },
        "border-hover": {
          key: "--border-hover",
          value: "rgba(196, 120, 42, 0.22)",
        },
        "active": {
          key: "--active",
          value: "rgba(196, 120, 42, 0.18)",
        },
        "windowbar-surface": {
          key: "--windowbar-surface",
          value: "rgba(255, 252, 244, 0.58)",
        },
        "windowbar-surface-strong": {
          key: "--windowbar-surface-strong",
          value: "rgba(248, 242, 230, 0.78)",
        },
        "windowbar-border": {
          key: "--windowbar-border",
          value: "rgba(195, 170, 140, 0.45)",
        },
        "windowbar-highlight": {
          key: "--windowbar-highlight",
          value: "rgba(255, 255, 255, 0.88)",
        },
        "windowbar-shadow": {
          key: "--windowbar-shadow",
          value: "0 8px 32px rgba(120, 90, 55, 0.18), 0 2px 8px rgba(100, 75, 45, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.88)",
        },
        "windowbar-blur": {
          key: "--windowbar-blur",
          value: "saturate(200%) blur(32px)",
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
