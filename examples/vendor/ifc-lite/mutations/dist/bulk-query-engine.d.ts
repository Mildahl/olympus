/**
 * Bulk Query Engine for mass property updates
 *
 * Provides SQL-like query capabilities for selecting and modifying
 * multiple IFC entities at once.
 */
import type { EntityTable, SpatialHierarchy, PropertyTable } from '@ifc-lite/data';
import { PropertyValueType } from '@ifc-lite/data';
import type { MutablePropertyView } from './mutable-property-view.js';
import type { Mutation, PropertyValue } from './types.js';
/**
 * Filter operators for property values
 */
export type FilterOperator = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH' | 'IS_NULL' | 'IS_NOT_NULL';
/**
 * Property filter condition
 */
export interface PropertyFilter {
    psetName?: string;
    propName: string;
    operator: FilterOperator;
    value?: PropertyValue;
}
/**
 * Selection criteria for bulk queries
 */
export interface SelectionCriteria {
    /** Filter by entity types (e.g., [10, 11] for IfcWall, IfcWallStandardCase) */
    entityTypes?: number[];
    /** Filter by storey IDs */
    storeys?: number[];
    /** Filter by building IDs */
    buildings?: number[];
    /** Filter by site IDs */
    sites?: number[];
    /** Filter by space IDs */
    spaces?: number[];
    /** Filter by property conditions */
    propertyFilters?: PropertyFilter[];
    /** Filter by global IDs */
    globalIds?: string[];
    /** Filter by express IDs */
    expressIds?: number[];
    /** Filter by name pattern (regex) */
    namePattern?: string;
}
/**
 * Action to apply to selected entities
 */
export type BulkAction = {
    type: 'SET_PROPERTY';
    psetName: string;
    propName: string;
    value: PropertyValue;
    valueType: PropertyValueType;
} | {
    type: 'DELETE_PROPERTY';
    psetName: string;
    propName: string;
} | {
    type: 'SET_ATTRIBUTE';
    attribute: 'name' | 'description' | 'objectType';
    value: string;
};
/**
 * Complete bulk query
 */
export interface BulkQuery {
    select: SelectionCriteria;
    action: BulkAction;
}
/**
 * Result of a bulk query preview
 */
export interface BulkQueryPreview {
    matchedEntityIds: number[];
    matchedCount: number;
    estimatedMutations: number;
}
/**
 * Result of a bulk query execution
 */
export interface BulkQueryResult {
    mutations: Mutation[];
    affectedEntityCount: number;
    success: boolean;
    errors?: string[];
}
/**
 * Bulk Query Engine for mass property updates
 */
export declare class BulkQueryEngine {
    private entities;
    private spatialHierarchy;
    private properties;
    private mutationView;
    private strings;
    constructor(entities: EntityTable, mutationView: MutablePropertyView, spatialHierarchy?: SpatialHierarchy | null, properties?: PropertyTable | null, strings?: {
        get(idx: number): string;
    } | null);
    /**
     * Select entities matching criteria
     */
    select(criteria: SelectionCriteria): number[];
    /**
     * Preview a bulk query without executing
     */
    preview(query: BulkQuery): BulkQueryPreview;
    /**
     * Execute a bulk query
     */
    execute(query: BulkQuery): BulkQueryResult;
    /**
     * Apply an action to a single entity
     */
    private applyAction;
    /**
     * Filter candidates by property condition
     */
    private filterByProperty;
    /**
     * Find a property by name across all property sets
     */
    private findPropertyByName;
    /**
     * Check if a value matches a filter condition
     */
    private matchesFilter;
    /**
     * Get all entity IDs
     */
    private getAllEntityIds;
    /**
     * Find the index of an entity by ID
     */
    private findEntityIndex;
}
//# sourceMappingURL=bulk-query-engine.d.ts.map