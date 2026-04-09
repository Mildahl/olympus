/**
 * Types for IFC mutation tracking
 */
import type { PropertyValueType } from '@ifc-lite/data';
/**
 * Property value types supported by mutations
 */
export type PropertyValue = string | number | boolean | null | PropertyValue[];
/**
 * Types of mutations that can be applied to IFC data
 */
export type MutationType = 'CREATE_PROPERTY' | 'UPDATE_PROPERTY' | 'DELETE_PROPERTY' | 'CREATE_PROPERTY_SET' | 'DELETE_PROPERTY_SET' | 'CREATE_QUANTITY' | 'UPDATE_QUANTITY' | 'DELETE_QUANTITY' | 'UPDATE_ATTRIBUTE';
/**
 * A single mutation operation
 */
export interface Mutation {
    /** Unique identifier for this mutation */
    id: string;
    /** Type of mutation */
    type: MutationType;
    /** Timestamp when mutation was created */
    timestamp: number;
    /** Model ID this mutation applies to */
    modelId: string;
    /** Entity EXPRESS ID */
    entityId: number;
    /** Property set or quantity set name */
    psetName?: string;
    /** Property or quantity name */
    propName?: string;
    /** Previous value (for undo) */
    oldValue?: PropertyValue;
    /** New value */
    newValue?: PropertyValue;
    /** Value type */
    valueType?: PropertyValueType;
    /** Unit (for quantities) */
    unit?: string;
    /** Attribute name (IFC entity attributes like Name, Description, ObjectType, Tag, etc.) */
    attributeName?: string;
}
/**
 * A collection of related mutations
 */
export interface ChangeSet {
    /** Unique identifier */
    id: string;
    /** User-provided name */
    name: string;
    /** Creation timestamp */
    createdAt: number;
    /** Mutations in this change set */
    mutations: Mutation[];
    /** Whether this change set has been applied */
    applied: boolean;
}
/**
 * Property mutation for overlay tracking
 */
export interface PropertyMutation {
    /** Operation type */
    operation: 'SET' | 'DELETE';
    /** New value (for SET operations) */
    value?: PropertyValue;
    /** Value type (for SET operations) */
    valueType?: PropertyValueType;
    /** Unit (optional) */
    unit?: string;
}
/**
 * Quantity mutation for overlay tracking
 */
export interface QuantityMutation {
    /** Operation type */
    operation: 'SET' | 'DELETE';
    /** New value (for SET operations) */
    value?: number;
    /** Quantity type (Length, Area, Volume, etc.) */
    quantityType?: number;
    /** Unit (optional) */
    unit?: string;
}
/**
 * Attribute mutation for overlay tracking
 */
export interface AttributeMutation {
    /** Attribute name (IFC entity attributes like Name, Description, ObjectType, Tag, etc.) */
    attribute: string;
    /** New value */
    value: string;
    /** Previous value (for undo) */
    oldValue?: string;
}
/**
 * Generate a unique ID for mutations
 */
export declare function generateMutationId(): string;
/**
 * Generate a unique ID for change sets
 */
export declare function generateChangeSetId(): string;
/**
 * Create a mutation key for property lookup
 */
export declare function propertyKey(entityId: number, psetName: string, propName: string): string;
/**
 * Create a mutation key for quantity lookup
 */
export declare function quantityKey(entityId: number, qsetName: string, quantName: string): string;
/**
 * Create a mutation key for attribute lookup
 */
export declare function attributeKey(entityId: number, attributeName: string): string;
//# sourceMappingURL=types.d.ts.map