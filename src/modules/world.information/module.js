/**
 * World Notifications Module Definition
 */
import operators from './operators.js';

import { InformationUI } from './ui.js';

const ModuleDefinition = {
  id: 'world.information',
  name: 'World information',
  description: 'Information display capabilities within the world context.',
  version: '1.0.0',
  dependsOn: ['world'],
  operators: operators,
  ui: [InformationUI],
};

export default ModuleDefinition;
