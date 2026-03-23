/**
 * Property Extractor for IFCX
 * Extracts properties from node attributes and builds PropertyTable
 */
import type { ComposedNode } from './types.js';
import { StringTable } from '@ifc-lite/data';
import type { PropertyTable } from '@ifc-lite/data';
/**
 * Extract properties from composed IFCX nodes.
 *
 * IFCX properties are flat attributes with namespace prefixes:
 * - bsi::ifc::prop::IsExternal -> PropertySingleValue
 * - bsi::ifc::prop::Volume -> QuantitySingleValue
 *
 * We group properties by namespace prefix for PropertySet-like grouping.
 */
export declare function extractProperties(composed: Map<string, ComposedNode>, pathToId: Map<string, number>, strings: StringTable): PropertyTable;
/**
 * Extract quantity-like properties (Volume, Area, Length, etc.)
 * These are identified by their names matching quantity patterns.
 */
export declare function isQuantityProperty(propName: string): boolean;
//# sourceMappingURL=property-extractor.d.ts.map