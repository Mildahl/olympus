import operators from './operators.js';

import { HistoryUI, HistoryHeaderUI } from './ui.js';

const WorldHistoryModule = {
  id: 'world.history',
  name: 'History',
  description: 'Undo/redo history management with visual timeline',
  version: '1.0.0',
  dependsOn: ['world'],
  operators: operators,
  ui: [HistoryHeaderUI, HistoryUI]
};

export default WorldHistoryModule;
