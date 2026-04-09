/**
 * Entity Extractor for IFCX
 * Extracts entities from composed nodes and builds EntityTable
 */
import type { ComposedNode } from './types.js';
import { StringTable } from '@ifc-lite/data';
import type { EntityTable } from '@ifc-lite/data';
export interface EntityExtractionResult {
    entities: EntityTable;
    pathToId: Map<string, number>;
    idToPath: Map<number, string>;
}
/**
 * Extract entities from composed IFCX nodes.
 *
 * Mapping:
 * - path -> expressId (synthetic, auto-incrementing)
 * - bsi::ifc::class.code -> typeEnum
 * - children hierarchy -> spatial structure
 */
export declare function extractEntities(composed: Map<string, ComposedNode>, strings: StringTable): EntityExtractionResult;
/**
 * Check if a type code represents a building element.
 */
export declare function isBuildingElement(typeCode: string): boolean;
//# sourceMappingURL=entity-extractor.d.ts.map