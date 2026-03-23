/**
 * Unit extraction for IFC files
 *
 * Extracts length unit scale factor from IFCPROJECT -> IFCUNITASSIGNMENT -> IFCSIUNIT/IFCCONVERSIONBASEDUNIT
 * Used to convert elevation values and other length measurements to meters.
 */
import type { EntityRef } from './types.js';
/**
 * Extract length unit scale factor from IFC file
 *
 * Follows the chain: IFCPROJECT → IFCUNITASSIGNMENT → IFCSIUNIT/IFCCONVERSIONBASEDUNIT
 * Returns the multiplier to convert coordinates to meters.
 *
 * @param source - Raw IFC file bytes
 * @param entityIndex - Entity index with byId and byType maps
 * @returns Scale factor to apply to length values (e.g., 0.001 for millimeters)
 */
export declare function extractLengthUnitScale(source: Uint8Array, entityIndex: {
    byId: {
        get(expressId: number): EntityRef | undefined;
    };
    byType: Map<string, number[]>;
}): number;
//# sourceMappingURL=unit-extractor.d.ts.map