/**
 * World Section Box Module Definition
 * 
 * Professional section box tool for 3D viewport
 * - Interactive section box with handles
 * - Real-time clipping
 * - Fit to selection/all
 * - Export/Import support
 */
import operators from './operators.js';
import { SectionBoxUI } from './ui.js';

const ModuleDefinition = {
  id: 'world.sectionbox',
  name: 'Section Box',
  description: 'Interactive section box tool for 3D clipping and analysis',
  version: '1.0.0',
  dependsOn: ['world'],
  operators: operators,
  ui: [SectionBoxUI],
};

export default ModuleDefinition;
