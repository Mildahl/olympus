/**
 * World Animation Path Module Definition
 */
import operators from './operators.js';

import { AnimationPathUI } from './ui.js';

const ModuleDefinition = {
  id: 'world.animationPath',
  name: 'World Animation Path',
  description: 'Camera animation path creation and playback',
  version: '1.0.0',
  dependsOn: ['world', 'world.viewpoints'],
  operators: operators,
  
  ui: [AnimationPathUI],
};

export default ModuleDefinition;
