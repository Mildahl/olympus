import { moduleRegistry } from "./ModuleRegistry.js";

// Shell modules
import configuratorModule from "./configurator/module.js";
import themeModule from "./theme/module.js";
import navigationModule from "./navigation/module.js";
import tilesModule from "./tiles/module.js";
import settingsModule from "./settings/module.js";

// World modules
import worldModule from "./world/module.js";
import worldInformation from "./world.information/module.js";
import worldNotification from "./world.notification/module.js";
import worldLayer from "./world.layer/module.js";
import worldSpatial from "./world.spatial/module.js";
import worldViewpoints from "./world.viewpoints/module.js";
import worldAnimationPath from "./world.animationPath/module.js";
import worldProjection from "./world.projection/module.js";
import worldMeasure from "./world.measure/module.js";
import worldSectionbox from "./world.sectionbox/module.js";
import worldSnap from "./world.snap/module.js";
import worldHistory from "./world.history/module.js";

// Code modules
import codeScriptingModule from "./code.scripting/module.js";
import codeTerminalModule from "./code.terminal/module.js";

// BIM modules
import bimProjectModule from "./bim.project/module.js";
import llmChatModule from "./llm.chat/module.js";
import bimAnalyticsModule from "./bim.analytics/module.js";
import bimAttributeModule from "./bim.attribute/module.js";
import bimPsetModule from "./bim.pset/module.js";
import bimModelModule from "./bim.model/module.js";
import bimSequenceModule from "./bim.sequence/module.js";
import bimCostModule from "./bim.cost/module.js";

const coreModules = [
  configuratorModule,
  themeModule,
  navigationModule,
  tilesModule,
  settingsModule,
  worldModule,
  worldInformation,
  worldNotification,
  worldLayer,
  worldSpatial,
  worldViewpoints,
  worldAnimationPath,
  worldProjection,
  worldMeasure,
  worldSectionbox,
  worldSnap,
  worldHistory,
  codeScriptingModule,
  codeTerminalModule,
  bimProjectModule,
  llmChatModule,
  bimAnalyticsModule,
  bimAttributeModule,
  bimPsetModule,
  bimModelModule,
  bimSequenceModule,
  bimCostModule,
];

export function registerAllCoreModules(registry) {
  for (const definition of coreModules) {
    registry.register(definition);
  }

  return coreModules;
}

export { moduleRegistry };
