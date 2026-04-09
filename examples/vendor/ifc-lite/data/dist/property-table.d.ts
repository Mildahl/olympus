/**
 * Property table - columnar storage for property values
 * Optimized for filtering and aggregation
 */
import type { StringTable } from './string-table.js';
import { PropertyValueType } from './types.js';
export interface PropertySet {
    name: string;
    globalId: string;
    properties: Property[];
}
export interface Property {
    name: string;
    type: PropertyValueType;
    value: PropertyValue;
    unit?: string;
}
export type PropertyValue = string | number | boolean | null | PropertyValue[];
export interface PropertyTable {
    readonly count: number;
    entityId: Uint32Array;
    psetName: Uint32Array;
    psetGlobalId: Uint32Array;
    propName: Uint32Array;
    propType: Uint8Array;
    valueString: Uint32Array;
    valueReal: Float64Array;
    valueInt: Int32Array;
    valueBool: Uint8Array;
    unitId: Int32Array;
    entityIndex: Map<number, number[]>;
    psetIndex: Map<number, number[]>;
    propIndex: Map<number, number[]>;
    getForEntity(expressId: number): PropertySet[];
    getPropertyValue(expressId: number, psetName: string, propName: string): PropertyValue | null;
    findByProperty(propName: string, operator: string, value: PropertyValue): number[];
}
export declare class PropertyTableBuilder {
    private strings;
    private rows;
    constructor(strings: StringTable);
    add(row: PropertyRow): void;
    build(): PropertyTable;
}
interface PropertyRow {
    entityId: number;
    psetName: string;
    psetGlobalId: string;
    propName: string;
    propType: PropertyValueType;
    value: PropertyValue;
    unitId?: number;
}
export {};
//# sourceMappingURL=property-table.d.ts.map