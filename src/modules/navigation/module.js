/**
 * Navigation Module Definition
 */
import operators from './operators.js';

import { NavigationUI } from './ui.js';

const ModuleDefinition = {
  id: 'world.navigation',
  name: 'Navigation',
  description: 'Viewport navigation (orbit, fly, drive), on-screen controls, and navigation settings',
  version: '1.0.0',
  dependsOn: ['world'],
  operators: operators,
  ui: [NavigationUI],
};

export default ModuleDefinition;
