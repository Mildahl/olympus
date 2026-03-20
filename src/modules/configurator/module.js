/**
 * Configurator Module Definition
 * Handles application configuration and templates
 */
import operators from './operators.js';

import { TemplateConfiguratorUI } from './ui.js';

const ModuleDefinition = {
  id: 'configurator',
  name: 'Configurator',
  description: 'Application configuration and template management',
  version: '1.0.0',
  dependsOn: [],
  operators: operators,
  ui: [TemplateConfiguratorUI],
};

export default ModuleDefinition;
