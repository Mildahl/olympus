/**
 * Module Definition Template
 * 
 * Each module exports a single definition object with:
 * - id: Unique identifier (used in config and dependencies)
 * - name: Human-readable name
 * - description: What this module does
 * - dependsOn: Array of module IDs required before this module
 * - operators: Array of operator classes (imported from ./operators.js)
 * - ui: Array of UI classes (imported from ./ui.js)
 */
import operators from './operators.js';

import { TemplateUI } from './ui.js';

const ModuleDefinition = {
  id: 'template',
  name: 'Template Module',
  description: 'A template for creating new modules',
  version: '1.0.0',
  dependsOn: [], 
  operators: operators,
  ui: [TemplateUI],
};

export default ModuleDefinition;
