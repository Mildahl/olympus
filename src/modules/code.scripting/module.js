/**
 * Code Scripting Submodule Definition
 * 
 * Handles Python and JavaScript script editing and execution.
 * Depends on: world, python (for execution)
 */
import operators from './operators.js';

import { ScriptsUI, CodingUI } from './ui.js';

const ModuleDefinition = {
  id: 'code.scripting',
  name: 'Scripting',
  description: 'Python and JavaScript script editor and execution',
  version: '1.0.0',
  dependsOn: ['world'],
  operators: operators,
  ui: [ScriptsUI, CodingUI],
};

export default ModuleDefinition;
