/**
 * World Spatial Module Definition
 */
import operators from './operators.js';

import { SpatialManagerUI } from './ui.js';

const ModuleDefinition = {
  id: 'world.spatial',
  name: 'World Spatial',
  description: 'Spatial structure and hierarchy management',
  version: '1.0.0',
  dependsOn: ['world', 'world.layer'],
  operators: operators,
  ui: [SpatialManagerUI],
};

export default ModuleDefinition;
