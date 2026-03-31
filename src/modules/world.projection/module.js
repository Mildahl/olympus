/**
 * World projection module — planar section via three-edge-projection (vendored).
 */
import operators from './operators.js';

import { ProjectionUI } from './ui.js';

const ModuleDefinition = {
  id: 'world.projection',
  name: 'Projection',
  description: 'Horizontal cut preview using planar mesh intersection',
  version: '1.0.0',
  dependsOn: ['world'],
  operators,
  ui: [ProjectionUI],
};

export default ModuleDefinition;
