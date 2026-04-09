/**
 * BIM Cost Module Definition
 */
import UserInterface from './ui.js';

const ModuleDefinition = {
  id: 'bim.cost',
  name: 'BIM Costing',
  description: 'IFC cost schedule and cost item management',
  version: '1.0.0',
  dependsOn: ['bim.project'],
  ui: UserInterface,
};

export default ModuleDefinition;
