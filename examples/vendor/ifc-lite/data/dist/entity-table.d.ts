/**
 * Entity table - columnar storage for IFC entities
 * Uses TypedArrays for cache-efficient bulk operations
 */
import type { StringTable } from './string-table.js';
import { IfcTypeEnum } from './types.js';
export interface EntityTable {
    readonly count: number;
    expressId: Uint32Array;
    typeEnum: Uint16Array;
    globalId: Uint32Array;
    name: Uint32Array;
    description: Uint32Array;
    objectType: Uint32Array;
    flags: Uint8Array;
    containedInStorey: Int32Array;
    definedByType: Int32Array;
    geometryIndex: Int32Array;
    typeRanges: Map<IfcTypeEnum, {
        start: number;
        end: number;
    }>;
    getGlobalId(expressId: number): string;
    getName(expressId: number): string;
    getDescription(expressId: number): string;
    getObjectType(expressId: number): string;
    getTypeName(expressId: number): string;
    hasGeometry(expressId: number): boolean;
    getByType(type: IfcTypeEnum): number[];
    /** Get expressId by IFC GlobalId string (22-char GUID). Returns -1 if not found. */
    getExpressIdByGlobalId(globalId: string): number;
    /** Get all GlobalId → expressId mappings (for BCF integration) */
    getGlobalIdMap(): Map<string, number>;
}
export declare class EntityTableBuilder {
    private count;
    private strings;
    expressId: Uint32Array;
    typeEnum: Uint16Array;
    globalId: Uint32Array;
    name: Uint32Array;
    description: Uint32Array;
    objectType: Uint32Array;
    flags: Uint8Array;
    containedInStorey: Int32Array;
    definedByType: Int32Array;
    geometryIndex: Int32Array;
    /** Raw type name string index (for fallback display of unknown types) */
    rawTypeName: Uint32Array;
    private typeStarts;
    private typeCounts;
    constructor(capacity: number, strings: StringTable);
    add(expressId: number, type: string, globalId: string, name: string, description: string, objectType: string, hasGeometry?: boolean, isType?: boolean): void;
    build(): EntityTable;
}
//# sourceMappingURL=entity-table.d.ts.map