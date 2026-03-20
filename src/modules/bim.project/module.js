/**
 * BIM Project Module Definition
 */
import operators from './operators.js';

import UI from './ui.js';

const ModuleDefinition = {
  id: 'bim.project',
  name: 'BIM Project',
  description: 'BIM project management and templates',
  version: '1.0.0',
  dependsOn: ['world', 'code.scripting'],
  operators: operators,
  ui: UI,
};

export default ModuleDefinition;
