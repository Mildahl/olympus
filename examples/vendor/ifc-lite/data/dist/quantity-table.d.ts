/**
 * Quantity table - columnar storage for quantities
 * Similar to properties but always numeric
 */
import type { StringTable } from './string-table.js';
import { QuantityType } from './types.js';
export interface QuantitySet {
    name: string;
    quantities: Quantity[];
}
export interface Quantity {
    name: string;
    type: QuantityType;
    value: number;
    unit?: string;
    formula?: string;
}
export interface QuantityTable {
    readonly count: number;
    entityId: Uint32Array;
    qsetName: Uint32Array;
    quantityName: Uint32Array;
    quantityType: Uint8Array;
    value: Float64Array;
    unitId: Int32Array;
    formula: Uint32Array;
    entityIndex: Map<number, number[]>;
    qsetIndex: Map<number, number[]>;
    quantityIndex: Map<number, number[]>;
    getForEntity(expressId: number): QuantitySet[];
    getQuantityValue(expressId: number, qsetName: string, quantName: string): number | null;
    sumByType(quantityName: string, elementType?: number): number;
}
export declare class QuantityTableBuilder {
    private strings;
    private rows;
    constructor(strings: StringTable);
    add(row: QuantityRow): void;
    build(): QuantityTable;
}
interface QuantityRow {
    entityId: number;
    qsetName: string;
    quantityName: string;
    quantityType: QuantityType;
    value: number;
    unitId?: number;
    formula?: string;
}
export {};
//# sourceMappingURL=quantity-table.d.ts.map