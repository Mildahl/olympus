/**
 * Navigation Module Definition
 */
import operators from './operators.js';

import { NavigationUI } from './ui.js';

const ModuleDefinition = {
  id: 'world.navigation',
  name: 'Navigation',
  description: 'Viewport navigation controls (orbit, fly, drive)',
  version: '1.0.0',
  dependsOn: ['world'],
  operators: operators,
  ui: [NavigationUI],
};

export default ModuleDefinition;
