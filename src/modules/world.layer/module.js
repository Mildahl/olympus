/**
 * World Layers Module Definition
 */
import operators from './operators.js';

import { LayersUI } from './ui.js';

const ModuleDefinition = {
  id: 'world.layer',
  name: 'World Layers',
  description: 'Layer management for world structure',
  version: '1.0.0',
  dependsOn: ['world'],
  operators: operators,
  
  ui: [LayersUI],
};

export default ModuleDefinition;
