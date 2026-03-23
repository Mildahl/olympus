/**
 * @ifc-lite/data - Columnar data structures
 */
export { StringTable } from './string-table.js';
export { EntityTableBuilder } from './entity-table.js';
export type { EntityTable } from './entity-table.js';
export { PropertyTableBuilder } from './property-table.js';
export type { PropertyTable, PropertySet, Property, PropertyValue } from './property-table.js';
export { QuantityTableBuilder } from './quantity-table.js';
export type { QuantityTable, QuantitySet, Quantity } from './quantity-table.js';
export { RelationshipGraphBuilder } from './relationship-graph.js';
export type { RelationshipGraph, Edge, RelationshipInfo } from './relationship-graph.js';
export * from './types.js';
export { IfcTypeEnum, PropertyValueType, QuantityType, RelationshipType, EntityFlags } from './types.js';
export type { SpatialNode, SpatialHierarchy } from './types.js';
export { IFC_ENTITY_NAMES } from './ifc-entity-names.js';
export { createLogger, logger, type LogLevel, type LogContext } from './logger.js';
//# sourceMappingURL=index.d.ts.map