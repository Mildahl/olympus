/**
 * Quantity extractor - extracts IfcElementQuantity sets and their values
 */
import type { IfcEntity } from './types.js';
export interface QuantitySet {
    expressId: number;
    name: string;
    globalId?: string;
    methodOfMeasurement?: string;
    quantities: QuantityValue[];
}
export interface QuantityValue {
    name: string;
    type: QuantityValueType;
    value: number;
    unit?: string;
    formula?: string;
}
export type QuantityValueType = 'length' | 'area' | 'volume' | 'count' | 'weight' | 'time';
export declare class QuantityExtractor {
    private entities;
    private debug;
    constructor(entities: Map<number, IfcEntity>, debug?: boolean);
    /**
     * Extract all IfcElementQuantity sets from entities (async version with yields)
     */
    extractQuantitySetsAsync(): Promise<Map<number, QuantitySet>>;
    /**
     * Extract all IfcElementQuantity sets from entities (sync version for backward compatibility)
     */
    extractQuantitySets(): Map<number, QuantitySet>;
    /**
     * Extract QuantitySet from IfcElementQuantity entity
     *
     * IFC Schema for IfcElementQuantity:
     * - GlobalId (IfcGloballyUniqueId) [0]
     * - OwnerHistory (IfcOwnerHistory) [1]
     * - Name (IfcLabel) [2]
     * - Description (IfcText) [3]
     * - MethodOfMeasurement (IfcLabel) [4]
     * - Quantities (SET [1:?] OF IfcPhysicalQuantity) [5]
     */
    private extractQuantitySet;
    /**
     * Extract quantity from IfcPhysicalQuantity entity
     *
     * All IFC quantity types (IfcQuantityLength, IfcQuantityArea, etc.) have:
     * - Name (IfcLabel) [0]
     * - Description (IfcText) [1]
     * - Unit (IfcNamedUnit) [2] - optional reference
     * - *Value (IfcLengthMeasure/etc.) [3]
     * - Formula (IfcLabel) [4] - optional (IFC4 only)
     */
    private extractQuantity;
    /**
     * Safely convert a value to string
     */
    private toString;
    /**
     * Get count of IfcElementQuantity entities in the model
     */
    getElementQuantityCount(): number;
    /**
     * Get count of individual quantity values (IfcQuantityLength, etc.)
     */
    getQuantityValueCount(): number;
}
//# sourceMappingURL=quantity-extractor.d.ts.map