/**
 * BIM Attribute Module Definition
 */
import operators from './operators.js';

import ui from './ui.js';

const ModuleDefinition = {
  id: 'bim.attribute',
  name: 'BIM Attribute',
  description: 'IFC attribute viewing and editing',
  version: '1.0.0',
  dependsOn: ['bim.project'],
  operators: operators,
  
  ui: ui,
};

export default ModuleDefinition;
