/**
 * Tiles Module Definition
 */
import operators from './operators.js';
const ModuleDefinition = {
  id: 'tiles',
  name: 'Tiles',
  description: '3D Tiles loading and rendering',
  version: '1.0.0',
  dependsOn: ['world'],
  operators: operators,
  ui: [],
};

export default ModuleDefinition;
