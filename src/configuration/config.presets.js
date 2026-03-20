/**
 * Module presets: role-based module configuration templates.
 * Used by Settings > Presets tab and by the Welcome screen dropdown.
 */

export const PRESET_IDS = {
  full: "full",
  PythonMode: "PythonMode",
  BIMManager: "BIMManager",
  QuantitySurveyor: "QuantitySurveyor",
};

export const PRESETS = {
  [PRESET_IDS.full]: {
    id: PRESET_IDS.full,
    name: "Full",
    description: "All modules active.",
    icon: "apps",
    moduleIds: null,
  },
  [PRESET_IDS.PythonMode]: {
    id: PRESET_IDS.PythonMode,
    name: "Python Mode",
    description: "Scripting and terminal; no BIM/IFC (no ifcopenshell).",
    icon: "code",
    moduleIds: [
      "configurator", "theme", "world", "world.notification", "world.layer", "world.spatial",
      "world.viewpoints", "world.animationPath", "world.snap", "world.measure", "world.sectionbox",
      "world.history", "world.navigation", "settings", "code.scripting", "code.terminal",
    ],
  },
  [PRESET_IDS.BIMManager]: {
    id: PRESET_IDS.BIMManager,
    name: "BIM Manager",
    description: "All modules except Costing and Planning.",
    icon: "domain",
    moduleIds: null,
    disableIds: ["bim.cost", "bim.sequence"],
  },
  [PRESET_IDS.QuantitySurveyor]: {
    id: PRESET_IDS.QuantitySurveyor,
    name: "Quantity Surveyor",
    description: "Costing and Planning focus; minimal other modules.",
    icon: "calculate",
    moduleIds: [
      "configurator", "theme", "world", "world.notification", "world.layer", "world.spatial",
      "world.snap", "world.measure", "world.history", "world.navigation",
      "settings", "bim.project", "bim.attribute", "bim.pset", "bim.model", "bim.cost", "bim.sequence",
    ],
  },
};

/**
 * Get the list of preset IDs for dropdowns.
 * @returns {string[]}
 */
export function getPresetIds() {
  return Object.keys(PRESETS);
}

/**
 * Get preset options for a select: { value: label }.
 * @returns {Record<string, string>}
 */
export function getPresetOptions() {
  /** @type {Record<string, string>} */
  const opts = {};

  for (const [id, p] of Object.entries(PRESETS)) {
    opts[id] = p.name;
  }

  return opts;
}

/**
 * Apply a preset to context.config.app.CoreModules.
 * Does not save config; caller should call context._saveConfig().
 * Optionally stores the current preset id in context.config.app.currentPresetId.
 * @param {Object} context - Application context
 * @param {string} presetKey - Key from PRESET_IDS / PRESETS
 * @param {Object} [options] - { savePresetId: boolean } - if true, set context.config.app.currentPresetId
 * @returns {boolean} true if applied, false if preset or CoreModules missing
 */
export function applyPresetToContext(context, presetKey, options = {}) {
  const preset = PRESETS[presetKey];

  const coreModules = context?.config?.app?.CoreModules;

  if (!preset || !Array.isArray(coreModules)) return false;

  const allIds = coreModules.map((m) => m.id).filter(Boolean);

  let activeSet;

  if (preset.disableIds) {
    activeSet = new Set(allIds.filter((id) => !preset.disableIds.includes(id)));
  } else if (preset.moduleIds === null) {
    activeSet = new Set(allIds);
  } else {
    activeSet = new Set(preset.moduleIds);
  }

  for (const mod of coreModules) {
    if (!mod.id) continue;

    mod.active = activeSet.has(mod.id);
  }

  if (options.savePresetId !== false && context.config?.app) {
    context.config.app.currentPresetId = presetKey;
  }

  return true;
}
