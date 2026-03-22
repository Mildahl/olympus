import { moduleRegistry } from './ModuleRegistry.js';

import WorldModule from './world/module.js';

import ConfiguratorModule from './configurator/module.js';

import InformationModule from './world.information/module.js';

import NavigationModule from './navigation/module.js';

import ThemeModule from './theme/module.js';

import SettingsModule from './settings/module.js';

import WorldNotificationModule from './world.notification/module.js';

import WorldLayerModule from './world.layer/module.js';

import WorldSpatialModule from './world.spatial/module.js';

import WorldViewpointsModule from './world.viewpoints/module.js';

import WorldAnimationPathModule from './world.animationPath/module.js';

import WorldMeasureModule from './world.measure/module.js';

import WorldSectionBoxModule from './world.sectionbox/module.js';

import WorldSnapModule from './world.snap/module.js';

import WorldHistoryModule from './world.history/module.js';

import TilesModule from './tiles/module.js';

import CodeScriptingModule from './code.scripting/module.js';

import CodeTerminalModule from './code.terminal/module.js';

import BimProjectModule from './bim.project/module.js';

import BIMAnalyticsModule from './bim.analytics/module.js';

import BimAttributeModule from './bim.attribute/module.js';

import BimPsetModule from './bim.pset/module.js';

import SchedulingModule from './bim.sequence/module.js';

import BimModelModule from './bim.model/module.js';

const CoreModuleDefinitions = [
  ConfiguratorModule,
  InformationModule,
  ThemeModule,
  WorldModule,
  WorldNotificationModule,
  WorldLayerModule,
  WorldSpatialModule,
  WorldViewpointsModule,
  WorldAnimationPathModule,
  WorldMeasureModule,
  WorldSectionBoxModule,
  WorldSnapModule,
  WorldHistoryModule,
  NavigationModule,
  SettingsModule,
  TilesModule,
  CodeScriptingModule,
  CodeTerminalModule,
  BimProjectModule,
  BIMAnalyticsModule,
  BimAttributeModule,
  BimPsetModule,
  BimModelModule,
  SchedulingModule
];

export { moduleRegistry, CoreModuleDefinitions };