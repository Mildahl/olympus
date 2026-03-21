import { UIDiv, UISelect } from "../../../drawUI/ui.js";

import { getPresetOptions } from "../../configuration/config.presets.js";

const APPLY_PRESET_OPERATOR = "settings.apply_module_preset";

class ModulePresetsHeaderUI {
  constructor({ context, operators }) {
    this.context = context;
    this.operators = operators;
    this._removeToggleBarChild = null;
    this._selectDom = null;
    this._suppressPresetChange = false;

    const layoutManager = context && context.layoutManager;
    if (!layoutManager || typeof layoutManager.prependToggleBarChild !== "function") {
      return;
    }

    const wrapDom = this._buildChrome();
    if (!wrapDom) {
      return;
    }

    this._removeToggleBarChild = layoutManager.prependToggleBarChild(wrapDom);
  }

  destroy() {
    if (typeof this._removeToggleBarChild === "function") {
      this._removeToggleBarChild();
      this._removeToggleBarChild = null;
    }

    this._selectDom = null;
  }

  _getString(key, fallback) {
    const strings = this.context && this.context.strings;
    if (strings && typeof strings.getKey === "function") {
      const value = strings.getKey(key);
      if (value) {
        return value;
      }
    }

    return fallback;
  }

  _buildChrome() {
    const context = this.context;
    if (!context) {
      return null;
    }

    const appConfig = context.config && context.config.app;
    const coreModules = appConfig && appConfig.CoreModules;
    if (!Array.isArray(coreModules) || coreModules.length === 0) {
      return null;
    }

    const operators = this.operators;
    if (!operators || typeof operators.execute !== "function") {
      return null;
    }

    const wrap = new UIDiv().setClass("layout-toggle-presets-wrap");

    wrap.dom.style.display = "flex";
    wrap.dom.style.alignItems = "center";

    const select = new UISelect().setClass("Select layout-toggle-presets-select");

    select.dom.title = this._getString("settings/presets", "Presets");

    const optionRecord = getPresetOptions();
    select.setOptions(optionRecord);

    const optionKeys = Object.keys(optionRecord);
    const currentPresetId = appConfig.currentPresetId;
    let initialKey = "";

    if (typeof currentPresetId === "string" && optionRecord[currentPresetId]) {
      initialKey = currentPresetId;
    } else if (optionKeys.length > 0) {
      initialKey = optionKeys[0];
    }

    this._suppressPresetChange = true;
    select.setValue(initialKey);
    this._suppressPresetChange = false;

    const self = this;

    select.dom.addEventListener("change", function onPresetSelectChange() {
      if (self._suppressPresetChange) {
        return;
      }

      const presetKey = select.getValue();
      if (!presetKey) {
        return;
      }

      operators.execute(APPLY_PRESET_OPERATOR, context, presetKey);
    });

    wrap.add(select);

    this._selectDom = select.dom;

    return wrap.dom;
  }
}

export default ModulePresetsHeaderUI;
