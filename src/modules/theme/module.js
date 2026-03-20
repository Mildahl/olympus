/**
 * Theme Module Definition
 */
import operators from './operators.js';
import ThemeUIArray from './ui.js';
const ThemeUI = ThemeUIArray;

const ModuleDefinition = {
  id: 'theme',
  name: 'Theme',
  description: 'Visual theme and color scheme management',
  version: '1.0.0',
  dependsOn: [],
  operators: operators,
  ui: ThemeUI, 
};

export default ModuleDefinition;
