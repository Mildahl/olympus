import configuratorModule from "../configurator/module.js";

import themeModule from "../theme/module.js";

import navigationModule from "../navigation/module.js";

import tilesModule from "../tiles/module.js";

import settingsModule from "../settings/module.js";

const coreModuleById = {
  configurator: configuratorModule,
  theme: themeModule,
  "world.navigation": navigationModule,
  tiles: tilesModule,
  settings: settingsModule,
};

export function getCoreModuleDefinition(moduleId) {
  const definition = coreModuleById[moduleId];

  if (!definition) {
    throw new Error(`Unknown core module in shell bundle: ${moduleId}`);
  }

  return definition;
}
