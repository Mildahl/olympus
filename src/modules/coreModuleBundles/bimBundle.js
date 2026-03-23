import bimProjectModule from "../bim.project/module.js";

import bimAnalyticsModule from "../bim.analytics/module.js";

import bimAttributeModule from "../bim.attribute/module.js";

import bimPsetModule from "../bim.pset/module.js";

import bimModelModule from "../bim.model/module.js";

import bimSequenceModule from "../bim.sequence/module.js";

const coreModuleById = {
  "bim.project": bimProjectModule,
  "bim.analytics": bimAnalyticsModule,
  "bim.attribute": bimAttributeModule,
  "bim.pset": bimPsetModule,
  "bim.model": bimModelModule,
  "bim.sequence": bimSequenceModule,
};

export function getCoreModuleDefinition(moduleId) {
  const definition = coreModuleById[moduleId];

  if (!definition) {
    throw new Error(`Unknown core module in bim bundle: ${moduleId}`);
  }

  return definition;
}
