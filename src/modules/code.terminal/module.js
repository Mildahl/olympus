/**
 * Code Terminal Submodule Definition
 * 
 * Handles interactive terminal sessions for Python and JavaScript.
 * Depends on: world, code.scripting (for Python/JS runtime)
 */
import operators from './operators.js';
import { TerminalsUI, TerminalUI } from './ui.js';

const ModuleDefinition = {
  id: 'code.terminal',
  name: 'Terminal',
  description: 'Interactive Python and JavaScript terminal sessions',
  version: '1.0.0',
  dependsOn: ['world', 'code.scripting'],
  operators: operators,
  ui: [TerminalsUI, TerminalUI],
};

export default ModuleDefinition;
