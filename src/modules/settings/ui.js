import { Components as UIComponents } from "../../ui/Components/Components.js";

import { resolveModuleToggleId } from "../../ui/utils/resolveModuleToggleId.js";

import DayNightCheckBox from "../../ui/Components/DayNight.js";

import { PRESETS, applyPresetToContext } from "../../configuration/config.presets.js";

import { UI_LANGUAGE_SELECT_OPTIONS } from "../../ui/language/uiLanguageSelectOptions.js";

const OPERATORS = {
  changeThemeColors: "theme.change_to_colors",
  changeNavigationSettings: "navigation.change_settings",
};

/** Top-level layout tab id for unified settings (see `Sidebar.js`). */
const SETTINGS_TOP_TAB_ID = "sidebar-3d-settings";

const INTERNAL_SETTINGS_TABS = [
  { id: "general", label: "General" },
  { id: "navigation", label: "Navigation" },
  { id: "theme", label: "Theme" },
  { id: "presets", label: "Presets" },
];

class SettingsUI {
  constructor({ context, operators }) {
    this.context = context;
    this.operators = operators;

    this._settingsToggleCleanup = null;

    const uiTheme = context.config?.ui?.theme;

    const initialTheme = context.initialUIConfig?.theme;

    this.colors = uiTheme?.colors
      ? JSON.parse(JSON.stringify(uiTheme.colors))
      : (initialTheme?.colors ? JSON.parse(JSON.stringify(initialTheme.colors)) : { day: {}, night: {} });

    this.initialColors = initialTheme?.colors
      ? JSON.parse(JSON.stringify(initialTheme.colors))
      : JSON.parse(JSON.stringify(this.colors));

    this.pickers = { day: {}, night: {} };

    this.draw();

    this._settingsToggleCleanup = this._attachSettingsModuleToggle();
  }

  destroy() {
    if (typeof this._settingsToggleCleanup === "function") {
      this._settingsToggleCleanup();
      this._settingsToggleCleanup = null;
    }

    const tp = this.context?.ui?.sidebarSettingsTabbedPanel;
    if (tp && typeof tp.removeTab === "function") {
      for (const { id } of INTERNAL_SETTINGS_TABS) {
        try {
          tp.removeTab(id);
        } catch (_) {}
      }
    }
  }

  refreshSettings() {
    this.draw();
  }

  createRow(icon, labelText, controlEl) {
    const row = UIComponents.row().addClass('ListBoxItem').addClass('space-between');

    if (icon) {
      row.add(UIComponents.icon(icon));
    }

    row.add(UIComponents.text(labelText));

    row.add(controlEl);

    return row;
  }

  /** Replace panel body for an existing internal tab, or add the tab if missing. */
  _replaceOrAddInternalTab(tabbedPanel, id, label, content) {
    const panel = tabbedPanel.panels?.find((p) => p.dom?.id === id);
    if (panel && typeof panel.clear === "function") {
      panel.clear();
      panel.add(content);
      return;
    }
    tabbedPanel.addTab(id, label, content);
  }

  _attachSettingsModuleToggle() {
    const elId = resolveModuleToggleId(this.context, "settings");
    if (!elId || typeof document === "undefined") return null;

    const el = document.getElementById(elId);
    if (!el) return null;

    const handler = (e) => {
      const lm = this.context.layoutManager;
      if (!lm || typeof lm.hasTab !== "function" || !lm.hasTab("right", SETTINGS_TOP_TAB_ID)) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const isOpen = lm.isWorkspaceOpen("right");
      const isTopSelected = lm.isTabSelected("right", SETTINGS_TOP_TAB_ID);
      if (isOpen && isTopSelected) {
        lm.closeWorkspace("right");
        return;
      }

      lm.selectTab("right", SETTINGS_TOP_TAB_ID, { open: true });
      const tp = this.context.ui?.sidebarSettingsTabbedPanel;
      if (tp && typeof tp.select === "function") {
        tp.select("general");
      }
    };

    el.addEventListener("click", handler, true);
    return () => el.removeEventListener("click", handler, true);
  }

  draw() {
    const tabbedPanel = this.context?.ui?.sidebarSettingsTabbedPanel;
    if (!tabbedPanel) {
      return;
    }

    const prevSelected =
      tabbedPanel.selected && typeof tabbedPanel.select === "function"
        ? tabbedPanel.selected
        : "";

    this._replaceOrAddInternalTab(
      tabbedPanel,
      "general",
      "General",
      this.createGeneralTab(),
    );

    this._replaceOrAddInternalTab(
      tabbedPanel,
      "navigation",
      "Navigation",
      this.createNavigationTab(),
    );

    this._replaceOrAddInternalTab(
      tabbedPanel,
      "theme",
      "Theme",
      this.createThemeTab(),
    );

    this._replaceOrAddInternalTab(
      tabbedPanel,
      "presets",
      "Presets",
      this.createPresetsTab(),
    );

    const validIds = new Set(["threejs", ...INTERNAL_SETTINGS_TABS.map((t) => t.id)]);
    if (prevSelected && validIds.has(prevSelected)) {
      tabbedPanel.select(prevSelected);
    }
  }

  createGeneralTab() {
    const { context, operators } = this;

    const getString = context.strings.getKey;

    const container = UIComponents.div();

    const langSelect = UIComponents.select();

    langSelect.setOptions(UI_LANGUAGE_SELECT_OPTIONS);

    langSelect.setValue(context.config?.ui?.language || "en");

    langSelect.onChange(() => {
      context.edit.language(langSelect.getValue());

      if (confirm("Language changed. Refresh page to apply everywhere?")) {
        window.location.reload();
      }
    });

    container.add(this.createRow("language", getString("settings/language"), langSelect));

    const persistCheckbox = UIComponents.checkbox(context.config?.app?.Settings?.persistSettings === true);

    persistCheckbox.dom.title = getString("settings/persistSettings/title");

    persistCheckbox.dom.addEventListener("change", () => {
      if (!context.config.app.Settings) context.config.app.Settings = {};

      context.config.app.Settings.persistSettings = persistCheckbox.getValue();

      if (context.config.app.Settings.persistSettings) {
        context._saveConfig();
      } else {
        try {
          localStorage.removeItem("aeco-config");
        } catch (_) {}
      }
    });

    container.add(this.createRow("save", getString("settings/persistSettings"), persistCheckbox));

    const welcomeCheckbox = UIComponents.checkbox(!!context.config?.ui?.showWelcomeScreen);

    welcomeCheckbox.dom.addEventListener("change", () => {
      context.config.ui.showWelcomeScreen = welcomeCheckbox.getValue();

      context._saveConfig();
    });

    container.add(this.createRow("waving_hand", getString("settings/showWelcomeScreen"), welcomeCheckbox));

    const toastsCheckbox = UIComponents.checkbox(context.config?.ui?.notifications?.showToasts ?? false);

    toastsCheckbox.dom.title = getString("settings/showToasts/title");

    toastsCheckbox.dom.addEventListener("change", () => {
      if (!context.config.ui.notifications) context.config.ui.notifications = {};

      context.config.ui.notifications.showToasts = toastsCheckbox.getValue();

      context._saveConfig();
    });

    container.add(this.createRow("notifications", getString("settings/showToasts"), toastsCheckbox));

    const dayNightToggle = new DayNightCheckBox(context, operators);

    container.add(this.createRow("wb_sunny", getString("settings/daynightmode"), dayNightToggle));

    return container;
  }

  createNavigationTab() {
    const { context, operators } = this;

    const navConfig = context.config?.app?.Navigation;

    if (!navConfig || !navConfig.fly || !navConfig.orbit || !navConfig.drive) {
      const container = UIComponents.div();

      container.add(UIComponents.text("Navigation config not available. Reset config or refresh."));

      return container;
    }

    const container = UIComponents.div();

    const flySection = UIComponents.collapsibleSection({
      title: "Fly Mode",
      icon: "flight",
      collapsed: false,
    });

    this.addModeSettings(flySection, navConfig, "fly");

    container.add(flySection);

    const orbitSection = UIComponents.collapsibleSection({
      title: "Orbit Mode",
      icon: "360",
      collapsed: false,
    });

    this.addModeSettings(orbitSection, navConfig, "orbit");

    container.add(orbitSection);

    const driveSection = UIComponents.collapsibleSection({
      title: "Drive Mode",
      icon: "directions_car",
      collapsed: false,
    });

    this.addModeSettings(driveSection, navConfig, "drive");

    container.add(driveSection);

    const resetBtn = UIComponents.button("Reset to Defaults");

    resetBtn.onClick(() => {
      const initialNav = context.initialAppConfig?.Navigation;

      if (initialNav) {
        context.config.app.Navigation = JSON.parse(JSON.stringify(initialNav));
      }

      context._saveConfig();

      this.updateNavigationController();

      this.refreshSettings();
    });

    container.add(resetBtn);

    return container;
  }

  addModeSettings(section, navConfig, mode) {
    const { context, operators } = this;

    const items = this.getNavigationItems(navConfig, mode);

    items.forEach((item) => {
      let control;

      if (item.type === "number") {
        control = UIComponents.number();

        if (item.step) control.dom.step = item.step;

        control.setValue(item.value);

        control.onChange(() => {
          const newConfig = {};

          this.setNestedProperty(newConfig, item.key, parseFloat(control.getValue()));

          operators.execute(OPERATORS.changeNavigationSettings, context, newConfig);
        });
      } else if (item.type === "keypair") {
        control = UIComponents.row().gap("var(--phi-0-2-5)");

        const modifierSelect = UIComponents.select().addClass("kbd-like");

        modifierSelect.setOptions({ "": "NONE", Shift: "SHIFT", Ctrl: "CTRL", Alt: "ALT" });

        const keySelect = UIComponents.select().addClass("kbd-like");

        keySelect.setOptions(this.getKeyOptions());

        const [modVal, keyVal] = Array.isArray(item.value) ? item.value : ["", item.value];

        modifierSelect.setValue(modVal);

        keySelect.setValue(keyVal);

        const onChange = () => {
          const newConfig = {};

          this.setNestedProperty(newConfig, item.key, [modifierSelect.getValue(), keySelect.getValue()]);

          operators.execute(OPERATORS.changeNavigationSettings, context, newConfig);
        };

        modifierSelect.onChange(onChange);

        keySelect.onChange(onChange);

        control.add(modifierSelect);

        control.add(keySelect);
      }

      section.addContent(this.createRow(null, item.label, control));
    });
  }

  getKeyOptions() {
    return {
      KeyW: "W", KeyA: "A", KeyS: "S", KeyD: "D",
      KeyQ: "Q", KeyE: "E", KeyR: "R", KeyF: "F",
      Space: "SPACE",
      ShiftLeft: "SHIFT (L)", ShiftRight: "SHIFT (R)",
      ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→",
    };
  }

  getNavigationItems(navConfig, mode) {
    const modes = {
      fly: [
        { label: "Movement Speed", key: "fly.movementSpeed", value: navConfig.fly.movementSpeed, type: "number" },
        { label: "Look Speed", key: "fly.lookSpeed", value: navConfig.fly.lookSpeed, type: "number", step: 0.01 },
        { label: "Vertical Min", key: "fly.verticalMin", value: navConfig.fly.verticalMin, type: "number" },
        { label: "Vertical Max", key: "fly.verticalMax", value: navConfig.fly.verticalMax, type: "number" },
        { label: "Shortcut", key: "fly.shortcut", value: navConfig.fly.shortcut, type: "keypair" },
        { label: "Forward", key: "fly.keys.forward", value: navConfig.fly.keys.forward, type: "keypair" },
        { label: "Backward", key: "fly.keys.backward", value: navConfig.fly.keys.backward, type: "keypair" },
        { label: "Left", key: "fly.keys.left", value: navConfig.fly.keys.left, type: "keypair" },
        { label: "Right", key: "fly.keys.right", value: navConfig.fly.keys.right, type: "keypair" },
        { label: "Up", key: "fly.keys.up", value: navConfig.fly.keys.up, type: "keypair" },
        { label: "Down", key: "fly.keys.down", value: navConfig.fly.keys.down, type: "keypair" },
        { label: "Sprint", key: "fly.keys.sprint", value: navConfig.fly.keys.sprint, type: "keypair" },
      ],
      orbit: [
        { label: "Rotation Speed", key: "orbit.rotationSpeed", value: navConfig.orbit.rotationSpeed, type: "number", step: 0.01 },
        { label: "Shortcut", key: "orbit.shortcut", value: navConfig.orbit.shortcut, type: "keypair" },
      ],
      drive: [
        { label: "Movement Speed", key: "drive.movementSpeed", value: navConfig.drive.movementSpeed, type: "number" },
        { label: "Look Speed", key: "drive.lookSpeed", value: navConfig.drive.lookSpeed, type: "number", step: 0.01 },
        { label: "Vertical Min", key: "drive.verticalMin", value: navConfig.drive.verticalMin, type: "number" },
        { label: "Vertical Max", key: "drive.verticalMax", value: navConfig.drive.verticalMax, type: "number" },
        { label: "Shortcut", key: "drive.shortcut", value: navConfig.drive.shortcut, type: "keypair" },
        { label: "Accelerate", key: "drive.keys.accelerate", value: navConfig.drive.keys.accelerate, type: "keypair" },
        { label: "Brake", key: "drive.keys.brake", value: navConfig.drive.keys.brake, type: "keypair" },
        { label: "Left", key: "drive.keys.left", value: navConfig.drive.keys.left, type: "keypair" },
        { label: "Right", key: "drive.keys.right", value: navConfig.drive.keys.right, type: "keypair" },
        { label: "Boost", key: "drive.keys.boost", value: navConfig.drive.keys.boost, type: "keypair" },
      ],
    };

    return modes[mode] || [];
  }

  updateNavigationController() {
    const { context } = this;

    if (!context.editor?.navigationController) return;

    const cfg = context.config?.app?.Navigation;

    if (!cfg?.fly || !cfg?.drive) return;

    const nav = context.editor.navigationController;

    nav.keyMappings = cfg;

    nav.flySettings.moveSpeed = cfg.fly.movementSpeed;

    nav.flySettings.lookSensitivity = cfg.fly.lookSpeed;

    nav.flySettings.verticalMin = cfg.fly.verticalMin;

    nav.flySettings.verticalMax = cfg.fly.verticalMax;

    nav.driveSettings.moveSpeed = cfg.drive.movementSpeed;

    nav.driveSettings.verticalMin = cfg.drive.verticalMin;

    nav.driveSettings.verticalMax = cfg.drive.verticalMax;
  }

  createThemeTab() {
    const { context, operators } = this;

    const container = UIComponents.div();

    if (!this.colors?.day && !this.colors?.night) {
      container.add(UIComponents.text("Theme colors not available in config."));

      return container;
    }

    const daySection = UIComponents.collapsibleSection({
      title: "Day Colors",
      icon: "light_mode",
      collapsed: true,
      maxHeight: "35vh"
    });

    this.addColorRows(daySection, "day");

    container.add(daySection);

    const nightSection = UIComponents.collapsibleSection({
      title: "Night Colors",
      icon: "dark_mode",
      collapsed: false,
      maxHeight: "35vh"
    });

    this.addColorRows(nightSection, "night");

    container.add(nightSection);

    const btnRow = UIComponents.row().gap("var(--phi-0-5)");

    const saveBtn = UIComponents.button(context.strings.getKey("settings/save_theme"));

    saveBtn.onClick(() => {
      operators.execute(OPERATORS.changeThemeColors, context, { colors: this.colors });
    });

    btnRow.add(saveBtn);

    const resetBtn = UIComponents.button("Reset");

    resetBtn.onClick(() => {
      this.colors = JSON.parse(JSON.stringify(this.initialColors));

      const current = (this.context.config?.ui?.theme?.current || this.context.config?.ui?.theme?.default) || "night";

      const cssData = this.colors[current];

      for (const key in cssData) {
        document.documentElement.style.setProperty(cssData[key].key, cssData[key].value);
      }

      if (cssData["background"]) {
        this.context.editor.signals.sceneBackgroundChanged.dispatch(
          "Color", cssData["background"].value, null, null, null, null, null, null
        );
      }

      for (const mode in this.pickers) {
        for (const colorKey in this.pickers[mode]) {
          const value = this.colors[mode][colorKey].value;

          const picker = this.pickers[mode][colorKey];

          if (this.isHexColor(value)) {
            picker.setValue(value);
          } else if (value.startsWith && value.startsWith('rgba')) {
            const hexEquiv = this.rgbaToHex(value);

            if (hexEquiv) picker.setValue(hexEquiv);
          } else {
            picker.setValue(value);
          }
        }
      }
    });

    btnRow.add(resetBtn);

    container.add(btnRow);

    return container;
  }

  createPresetsTab() {
    const { context } = this;

    const getString = context.strings?.getKey ? (k) => context.strings.getKey(k) : (k) => k;

    const container = UIComponents.div();

    container.dom.style.display = "flex";

    container.dom.style.flexDirection = "column";

    container.dom.style.gap = "0.75rem";

    const intro = UIComponents.text(
      getString("settings/presets/intro") || "Apply a module preset. The page will reload to apply changes."
    );

    intro.dom.style.fontSize = "0.85rem";

    intro.dom.style.opacity = "0.9";

    intro.dom.style.marginBottom = "0.25rem";

    container.add(intro);

    const coreModules = context.config?.app?.CoreModules;

    if (!Array.isArray(coreModules) || coreModules.length === 0) {
      container.add(UIComponents.text("No CoreModules in app config. Presets unavailable."));

      return container;
    }

    const allIds = coreModules.map((m) => m.id).filter(Boolean);

    const presetEntries = Object.entries(PRESETS);

    for (const [presetKey, preset] of presetEntries) {
      const card = UIComponents.div();

      card.addClass("PresetCard");

      Object.assign(card.dom.style, {
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        padding: "0.75rem 1rem",
        background: "var(--glass-surface, rgba(255,255,255,0.04))",
        border: "1px solid var(--theme-subtext, rgba(255,255,255,0.12))",
        borderRadius: "8px",
        marginBottom: "0.25rem",
      });

      const topRow = UIComponents.row();

      topRow.dom.style.justifyContent = "space-between";

      topRow.dom.style.alignItems = "center";

      topRow.dom.style.gap = "0.5rem";

      const left = UIComponents.div();

      left.dom.style.display = "flex";

      left.dom.style.alignItems = "center";

      left.dom.style.gap = "0.5rem";

      if (preset.icon) {
        const icon = UIComponents.icon(preset.icon);

        icon.dom.style.fontSize = "1.1rem";

        icon.dom.style.opacity = "0.9";

        left.add(icon);
      }

      const title = UIComponents.text(preset.name);

      title.dom.style.fontWeight = "600";

      title.dom.style.fontSize = "0.95rem";

      left.add(title);

      topRow.add(left);

      const applyBtn = UIComponents.button(getString("settings/presets/apply") || "Apply");

      applyBtn.dom.style.flexShrink = "0";

      applyBtn.onClick(() => {
        this.applyPreset(presetKey, coreModules, allIds);
      });

      topRow.add(applyBtn);

      card.add(topRow);

      const desc = UIComponents.text(preset.description || "");

      desc.dom.style.fontSize = "0.8rem";

      desc.dom.style.opacity = "0.85";

      desc.dom.style.lineHeight = "1.35";

      desc.dom.style.paddingLeft = preset.icon ? "1.6rem" : "0";

      card.add(desc);

      container.add(card);
    }

    return container;
  }

  applyPreset(presetKey, coreModules, allIds) {
    const { context } = this;

    const applied = applyPresetToContext(context, presetKey);

    if (!applied) return;

    context._saveConfig();

    if (
      typeof confirm !== "undefined" &&
      confirm("Preset applied. Reload the page now to activate the new module set?")
    ) {
      window.location.reload();
    } else {
      this.refreshSettings();
    }
  }

  isHexColor(value) {
    return typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value);
  }

  rgbaToHex(rgba) {
    const match = rgba.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);

    if (!match) return null;

    const r = parseInt(match[1], 10);

    const g = parseInt(match[2], 10);

    const b = parseInt(match[3], 10);

    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);

    const g = parseInt(hex.slice(3, 5), 16);

    const b = parseInt(hex.slice(5, 7), 16);

    return `rgba(${r},${g},${b},${alpha})`;
  }

  addColorRows(section, mode) {
    const { context } = this;

    const modeColors = this.colors[mode];

    if (!modeColors || typeof modeColors !== 'object') return;

    for (const colorKey in modeColors) {
      const colorObj = modeColors[colorKey];

      const colorValue = colorObj.value;

      let control;

      if (this.isHexColor(colorValue)) {
        const colorPicker = UIComponents.color();

        colorPicker.setValue(colorValue);

        this.pickers[mode][colorKey] = colorPicker;

        colorPicker.onChange(() => {
          const newValue = colorPicker.getValue();

          this.colors[mode][colorKey].value = newValue;

          document.documentElement.style.setProperty(colorObj.key, newValue);

          if (colorKey === "background") {
            this.context.editor.signals.sceneBackgroundChanged.dispatch(
              "Color", newValue, null, null, null, null, null, null
            );
          }
        });

        control = colorPicker;
      } else if (colorValue.startsWith('rgba')) {
        const alphaMatch = colorValue.match(/[\d.]+\s*\)$/);

        const alpha = alphaMatch ? parseFloat(alphaMatch[0]) : 0.5;

        const hexEquiv = this.rgbaToHex(colorValue);

        const colorPicker = UIComponents.color();

        if (hexEquiv) colorPicker.setValue(hexEquiv);

        this.pickers[mode][colorKey] = colorPicker;

        colorPicker.onChange(() => {
          const newHex = colorPicker.getValue();

          const newRgba = this.hexToRgba(newHex, alpha);

          this.colors[mode][colorKey].value = newRgba;

          document.documentElement.style.setProperty(colorObj.key, newRgba);
        });

        control = colorPicker;
      } else {
        const textInput = UIComponents.input(colorValue);

        textInput.dom.style.width = '120px';

        this.pickers[mode][colorKey] = textInput;

        textInput.onEnter(() => {
          const newValue = textInput.getValue();

          this.colors[mode][colorKey].value = newValue;

          document.documentElement.style.setProperty(colorObj.key, newValue);
        });

        control = textInput;
      }

      section.addContent(this.createRow(null, context.strings.getKey("settings/theme/" + colorKey), control));
    }
  }

  setNestedProperty(obj, path, value) {
    const keys = path.split(".");

    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};

      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
  }
}

export default [SettingsUI];
