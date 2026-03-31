import worldModule from "../world/module.js";

import worldInformation from "../world.information/module.js";

import worldNotification from "../world.notification/module.js";

import worldLayer from "../world.layer/module.js";

import worldSpatial from "../world.spatial/module.js";

import worldViewpoints from "../world.viewpoints/module.js";

import worldAnimationPath from "../world.animationPath/module.js";

import worldProjection from "../world.projection/module.js";

import worldMeasure from "../world.measure/module.js";

import worldSectionbox from "../world.sectionbox/module.js";

import worldSnap from "../world.snap/module.js";

import worldHistory from "../world.history/module.js";

const coreModuleById = {
  world: worldModule,
  "world.information": worldInformation,
  "world.notification": worldNotification,
  "world.layer": worldLayer,
  "world.spatial": worldSpatial,
  "world.viewpoints": worldViewpoints,
  "world.animationPath": worldAnimationPath,
  "world.projection": worldProjection,
  "world.measure": worldMeasure,
  "world.sectionbox": worldSectionbox,
  "world.snap": worldSnap,
  "world.history": worldHistory,
};

export function getCoreModuleDefinition(moduleId) {
  const definition = coreModuleById[moduleId];

  if (!definition) {
    throw new Error(`Unknown core module in world bundle: ${moduleId}`);
  }

  return definition;
}
