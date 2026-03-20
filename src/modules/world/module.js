/**
 * World Module Definition
 * Core module that provides the 3D viewport and world structure
 */
import operators from './operators.js';

import WorldUI from './ui.js';
const ModuleDefinition = {
  id: 'world',
  name: 'World',
  description: 'Core 3D viewport and world structure management',
  version: '1.0.0',
  dependsOn: [],
  operators: operators,
  ui: WorldUI,
};

export default ModuleDefinition;
