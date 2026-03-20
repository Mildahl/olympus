/**
 * World Measure Module Definition
 * 
 * Professional measurement tools for 3D viewport
 * - Distance measurement with snapping
 * - Angle measurement
 * - Area measurement
 * - Perpendicular distance
 */
import operators from './operators.js';
import { MeasureUI } from './ui.js';

const ModuleDefinition = {
  id: 'world.measure',
  name: 'Measure Tools',
  description: 'Professional measurement tools for 3D viewport with snap support',
  version: '1.0.0',
  dependsOn: ['world'],
  operators: operators,
  ui: [MeasureUI],
};

export default ModuleDefinition;
