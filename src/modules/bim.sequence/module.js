/**
 * BIM Attribute Module Definition
 */
import operators from './operators.js';

import UserInterface from './ui.js';

const ModuleDefinition = {
  id: 'bim.sequence',
  name: 'BIM Construction Sequencing',
  description: 'IFC 4D scheduling and timeline management',
  version: '1.0.0',
  dependsOn: ['bim.project'],
  operators: operators,
  
  ui: UserInterface,
};

export default ModuleDefinition;
