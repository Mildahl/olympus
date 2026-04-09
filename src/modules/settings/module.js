/**
 * Settings Module Definition
 */
import operators from './operators.js';
import SettingsUI from './ui.js';

const ModuleDefinition = {
  id: 'settings',
  name: 'Settings',
  description: 'General application settings panel',
  version: '1.0.0',
  dependsOn: ['theme', 'world.navigation'],
  operators: operators,
  ui: [SettingsUI],
};

export default ModuleDefinition;
