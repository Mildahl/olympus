/**
 * BIM Project Module Definition
 */
import operators from './operators.js';

import BIMAnalyticsUI from './ui.js';

const ModuleDefinition = {
  id: 'bim.analytics',
  name: 'BIM Analytics',
  description: 'BIM analytics and reporting',
  version: '1.0.0',
  dependsOn: ['bim.project'],
  operators: operators,
  ui: [...BIMAnalyticsUI],
};

export default ModuleDefinition;
