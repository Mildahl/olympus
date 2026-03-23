/**
 * Mutable property view - overlay pattern for property mutations
 *
 * This class provides a mutable view over an immutable PropertyTable.
 * Changes are tracked separately and applied on-the-fly during reads.
 *
 * Supports both pre-built property tables and on-demand property extraction
 * for optimal performance with large models.
 */
import type { PropertyTable, PropertySet, QuantitySet } from '@ifc-lite/data';
import { PropertyValueType, QuantityType } from '@ifc-lite/data';
import type { PropertyValue, Mutation } from './types.js';
/**
 * Function type for on-demand property extraction
 * Allows globalId to be optional to match extractPropertiesOnDemand return type
 */
export type PropertyExtractor = (entityId: number) => Array<{
    name: string;
    globalId?: string;
    properties: Array<{
        name: string;
        type: number;
        value: unknown;
    }>;
}>;
/**
 * Function type for on-demand quantity extraction
 */
export type QuantityExtractor = (entityId: number) => QuantitySet[];
export declare class MutablePropertyView {
    private baseTable;
    private onDemandExtractor;
    private quantityExtractor;
    private propertyMutations;
    private quantityMutations;
    private deletedPsets;
    private deletedQsets;
    private newPsets;
    private newQsets;
    private attributeMutations;
    private mutationHistory;
    private modelId;
    constructor(baseTable: PropertyTable | null, modelId: string);
    /**
     * Set an on-demand property extractor function
     * This is used when properties are extracted lazily from the source buffer
     */
    setOnDemandExtractor(extractor: PropertyExtractor): void;
    /**
     * Set an on-demand quantity extractor function
     */
    setQuantityExtractor(extractor: QuantityExtractor): void;
    /**
     * Get base properties for an entity (before mutations)
     * Uses on-demand extraction if available, otherwise falls back to base table
     */
    private getBasePropertiesForEntity;
    /**
     * Get all property sets for an entity, with mutations applied
     */
    getForEntity(entityId: number): PropertySet[];
    /**
     * Get a specific property value with mutations applied
     */
    getPropertyValue(entityId: number, psetName: string, propName: string): PropertyValue | null;
    /**
     * Set a property value
     * If the property set doesn't exist, creates it automatically
     * @param skipHistory - If true, don't add to mutation history (used for undo/redo)
     */
    setProperty(entityId: number, psetName: string, propName: string, value: PropertyValue, valueType?: PropertyValueType, unit?: string, skipHistory?: boolean): Mutation;
    /**
     * Delete a property
     * @param skipHistory - If true, don't add to mutation history (used for undo/redo)
     */
    deleteProperty(entityId: number, psetName: string, propName: string, skipHistory?: boolean): Mutation | null;
    /**
     * Create a new property set
     */
    createPropertySet(entityId: number, psetName: string, properties: Array<{
        name: string;
        value: PropertyValue;
        type?: PropertyValueType;
        unit?: string;
    }>): Mutation;
    /**
     * Delete an entire property set
     */
    deletePropertySet(entityId: number, psetName: string): Mutation;
    /**
     * Get base quantities for an entity (before mutations)
     */
    private getBaseQuantitiesForEntity;
    /**
     * Get all quantity sets for an entity, with mutations applied
     */
    getQuantitiesForEntity(entityId: number): QuantitySet[];
    /**
     * Create a new quantity set
     */
    createQuantitySet(entityId: number, qsetName: string, quantities: Array<{
        name: string;
        value: number;
        quantityType: QuantityType;
        unit?: string;
    }>): Mutation;
    /**
     * Set a single quantity value (add to existing or new quantity set)
     */
    setQuantity(entityId: number, qsetName: string, quantName: string, value: number, qType?: QuantityType, unit?: string, skipHistory?: boolean): Mutation;
    /**
     * Set an entity attribute value (Name, Description, ObjectType, Tag, etc.)
     */
    setAttribute(entityId: number, attrName: string, value: string, oldValue?: string, skipHistory?: boolean): Mutation;
    /**
     * Get mutated attributes for an entity.
     * Returns only attributes that have been added/modified via mutations.
     */
    getAttributeMutationsForEntity(entityId: number): Array<{
        name: string;
        value: string;
    }>;
    /**
     * Remove a quantity mutation (used by undo for newly created quantities)
     */
    removeQuantityMutation(entityId: number, qsetName: string, quantName?: string): void;
    /**
     * Remove an attribute mutation (used by undo for newly set attributes)
     */
    removeAttributeMutation(entityId: number, attrName: string): void;
    /**
     * Get all mutations applied to this view
     */
    getMutations(): Mutation[];
    /**
     * Get mutations for a specific entity
     */
    getMutationsForEntity(entityId: number): Mutation[];
    /**
     * Check if an entity has any mutations
     */
    hasChanges(entityId?: number): boolean;
    /**
     * Get count of modified entities
     */
    getModifiedEntityCount(): number;
    /**
     * Clear all mutations (reset to base state)
     */
    clear(): void;
    /**
     * Apply a batch of mutations (e.g., from imported change set)
     */
    applyMutations(mutations: Mutation[]): void;
    /**
     * Export mutations as JSON
     */
    exportMutations(): string;
    /**
     * Import mutations from JSON
     */
    importMutations(json: string): void;
}
//# sourceMappingURL=mutable-property-view.d.ts.map