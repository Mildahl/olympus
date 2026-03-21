/**
 * Module presets: role-based module configuration templates.
 * Used by the settings module header presets control and by the Welcome screen dropdown.
 */

export const PRESET_IDS = {
  archEng: "archEng",
  constructionManager: "constructionManager",
  quantitySurveyor: "quantitySurveyor",
  developer: "developer",
  full: "full",
};

const ARCH_ENG_MODULE_IDS = [
  "code.scripting",
  "bim.project",
  "bim.attribute",
  "bim.pset",
  "bim.model",
  "configurator",
  "settings",
  "theme",
  "world",
  "world.history",
  "world.layer",
  "world.measure",
  "world.navigation",
  "world.notification",
  "world.snap",
  "world.spatial",
];

const CONSTRUCTION_MANAGER_MODULE_IDS = [
  "code.scripting",
  "bim.project",
  "bim.attribute",
  "bim.pset",
  "bim.cost",
  "bim.sequence",
  "configurator",
  "settings",
  "theme",
  "world",
  "world.history",
  "world.layer",
  "world.measure",
  "world.navigation",
  "world.notification",
  "world.spatial",
  "world.timeline_player",
  "world.viewpoints",
  "world.animationPath",
];

const QUANTITY_SURVEYOR_MODULE_IDS = [
  "code.scripting",
  "bim.project",
  "bim.attribute",
  "bim.pset",
  "bim.cost",
  "configurator",
  "settings",
  "theme",
  "world",
  "world.history",
  "world.layer",
  "world.measure",
  "world.navigation",
  "world.notification",
  "world.snap",
  "world.spatial",
];

const DEVELOPER_MODULE_IDS = [
  "code.scripting",
  "bim.project",
  "bim.model",
  "bim.attribute",
  "bim.pset",
  "bim.cost",
  "bim.sequence",
  "configurator",
  "settings",
  "theme",
  "world",
  "world.history",
  "world.layer",
  "world.measure",
  "world.navigation",
  "world.notification",
  "world.snap",
  "world.spatial",
  "world.viewpoints",
  "world.animationPath",
];

export const PRESETS = {
  [PRESET_IDS.archEng]: {
    id: PRESET_IDS.archEng,
    name: "Architecture & Engineering",
    description:
      "Model coordination, IFC, properties, sections, viewpoints, and presentation paths. No estimating, 4D playback, or scripting IDE.",
    icon: "architecture",
    moduleIds: ARCH_ENG_MODULE_IDS,
  },
  [PRESET_IDS.constructionManager]: {
    id: PRESET_IDS.constructionManager,
    name: "Construction Manager",
    description:
      "Projects, CPM-style sequencing, timelines, cost hooks, coordination, and field-oriented measurement. No animator paths or developer tools.",
    icon: "construction",
    moduleIds: CONSTRUCTION_MANAGER_MODULE_IDS,
  },
  [PRESET_IDS.quantitySurveyor]: {
    id: PRESET_IDS.quantitySurveyor,
    name: "Quantity Surveyor",
    description:
      "Takeoff-friendly viewing, properties, costing, schedules for quantity logic, and measurement. Lean chrome without basemaps or code tools.",
    icon: "calculate",
    moduleIds: QUANTITY_SURVEYOR_MODULE_IDS,
  },
  [PRESET_IDS.developer]: {
    id: PRESET_IDS.developer,
    name: "Developer",
    description:
      "Script editor, terminal, and core viewport workflows for extending or automating AECO without the full BIM estimating and scheduling stack.",
    icon: "code",
    moduleIds: DEVELOPER_MODULE_IDS,
  },
  [PRESET_IDS.full]: {
    id: PRESET_IDS.full,
    name: "AECO (full)",
    description: "All core modules enabled.",
    icon: "apps",
    moduleIds: null,
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
