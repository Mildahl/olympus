/**
 * World Timeline Player Module Definition
 */
import operators from './operators.js';

import UserInterface from './ui.js';

const ModuleDefinition = {
  id: 'world.timeline_player',
  name: 'Timeline Player',
  description: 'Core timeline player UI + operators',
  version: '1.0.0',
  dependsOn: ['world', 'bim.sequence'],
  operators,
  ui: UserInterface,
};

export default ModuleDefinition;

