/**
 * BIM Model Module Definition
 */
import operators from './operators.js';

import TypesUI from './ui.js';

const ModuleDefinition = {
  id: 'bim.model',
  name: 'Modeling tools',
  description: 'BIM modeling tools and operations',
  version: '1.0.0',
  operators: operators,
  dependsOn: ['bim.project'],
  ui: TypesUI,
};

export default ModuleDefinition;
