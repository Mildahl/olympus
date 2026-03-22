import operators from './operators.js';

import ProjectUI from './ui.js';

const ModuleDefinition = {
  id: 'bim.project',
  name: 'BIM Project',
  description: 'BIM project management and templates',
  version: '1.0.0',
  dependsOn: ['world', 'code.scripting'],
  operators: operators,
  ui: ProjectUI,
};

export default ModuleDefinition;
