/**
 * World Viewpoints Module Definition
 */
import operators from './operators.js';

import { ViewpointsUI } from './ui.js';

const ModuleDefinition = {
  id: 'world.viewpoints',
  name: 'World Viewpoints',
  description: 'Camera viewpoint management and snapshots',
  version: '1.0.0',
  dependsOn: ['world'],
  operators: operators,
  
  ui: [ViewpointsUI],
};

export default ModuleDefinition;
