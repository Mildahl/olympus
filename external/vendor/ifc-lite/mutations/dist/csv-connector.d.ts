/**
 * CSV Data Connector for bulk property imports
 *
 * Allows importing property data from CSV files and mapping
 * to IFC entities.
 */
import type { EntityTable } from '@ifc-lite/data';
import { PropertyValueType } from '@ifc-lite/data';
import type { MutablePropertyView } from './mutable-property-view.js';
import type { Mutation, PropertyValue } from './types.js';
/**
 * A parsed CSV row
 */
export interface CsvRow {
    [column: string]: string;
}
/**
 * Match strategy for linking CSV rows to IFC entities
 */
export type MatchStrategy = {
    type: 'globalId';
    column: string;
} | {
    type: 'expressId';
    column: string;
} | {
    type: 'name';
    column: string;
} | {
    type: 'property';
    psetName: string;
    propName: string;
    column: string;
};
/**
 * Mapping from CSV column to IFC property
 */
export interface PropertyMapping {
    /** CSV column name */
    sourceColumn: string;
    /** Target property set name */
    targetPset: string;
    /** Target property name */
    targetProperty: string;
    /** Value type */
    valueType: PropertyValueType;
    /** Optional value transformation */
    transform?: (value: string) => PropertyValue;
}
/**
 * Complete data mapping configuration
 */
export interface DataMapping {
    /** How to match CSV rows to IFC entities */
    matchStrategy: MatchStrategy;
    /** Property mappings */
    propertyMappings: PropertyMapping[];
}
/**
 * Result of matching a CSV row to entities
 */
export interface MatchResult {
    row: CsvRow;
    rowIndex: number;
    matchedEntityIds: number[];
    confidence: number;
    warnings?: string[];
}
/**
 * Statistics from CSV import
 */
export interface ImportStats {
    totalRows: number;
    matchedRows: number;
    unmatchedRows: number;
    mutationsCreated: number;
    errors: string[];
    warnings: string[];
}
/**
 * CSV parsing options
 */
export interface CsvParseOptions {
    /** Delimiter character (default: ',') */
    delimiter?: string;
    /** Has header row (default: true) */
    hasHeader?: boolean;
    /** Skip empty rows (default: true) */
    skipEmpty?: boolean;
}
/**
 * CSV Data Connector
 */
export declare class CsvConnector {
    private entities;
    private mutationView;
    private strings;
    constructor(entities: EntityTable, mutationView: MutablePropertyView, strings?: {
        get(idx: number): string;
    } | null);
    /**
     * Parse CSV content into rows
     */
    parse(content: string, options?: CsvParseOptions): CsvRow[];
    /**
     * Match CSV rows to IFC entities
     */
    match(rows: CsvRow[], mapping: DataMapping): MatchResult[];
    /**
     * Match a single row to entities
     */
    private matchRow;
    /**
     * Generate mutations from matched data
     */
    generateMutations(matches: MatchResult[], mapping: DataMapping): Mutation[];
    /**
     * Import CSV data and apply to entities
     */
    import(content: string, mapping: DataMapping, options?: CsvParseOptions): ImportStats;
    /**
     * Preview import without applying changes
     */
    preview(content: string, mapping: DataMapping, options?: CsvParseOptions): {
        rows: CsvRow[];
        matches: MatchResult[];
        estimatedMutations: number;
    };
    /**
     * Parse a single CSV line respecting quoted values
     */
    private parseCsvLine;
    /**
     * Parse a string value to the appropriate type
     */
    private parseValue;
    /**
     * Auto-detect column mappings based on column names
     */
    autoDetectMappings(headers: string[]): PropertyMapping[];
    /**
     * Clean a string to be a valid property name
     */
    private cleanPropertyName;
}
//# sourceMappingURL=csv-connector.d.ts.map