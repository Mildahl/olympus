import type { EntityTable, PropertyTable, SpatialHierarchy } from '@ifc-lite/data';
import type { MutablePropertyView } from '@ifc-lite/mutations';
/**
 * Options for IFCX export
 */
export interface IfcxExportOptions {
    /** Author name */
    author?: string;
    /** Data version identifier */
    dataVersion?: string;
    /** Include properties (default: true) */
    includeProperties?: boolean;
    /** Include geometry (default: false - geometry export not yet supported) */
    includeGeometry?: boolean;
    /** Pretty print JSON (default: true) */
    prettyPrint?: boolean;
    /** Apply mutations (default: true if mutation view provided) */
    applyMutations?: boolean;
}
/**
 * Data sources for IFCX export
 */
export interface IfcxExportData {
    /** Entity table */
    entities: EntityTable;
    /** Property table (optional if using mutation view) */
    properties?: PropertyTable;
    /** Spatial hierarchy */
    spatialHierarchy?: SpatialHierarchy;
    /** String table for lookups */
    strings?: {
        get(idx: number): string;
    };
    /** Optional mutation view for property changes */
    mutationView?: MutablePropertyView;
    /** ID to path mapping (for round-trip scenarios) */
    idToPath?: Map<number, string>;
}
/**
 * Result of IFCX export
 */
export interface IfcxExportResult {
    /** JSON string content */
    content: string;
    /** Statistics */
    stats: {
        nodeCount: number;
        propertyCount: number;
        fileSize: number;
    };
}
/**
 * IFCX file writer
 */
export declare class IfcxWriter {
    private data;
    constructor(data: IfcxExportData);
    /**
     * Export to IFCX format
     */
    export(options?: IfcxExportOptions): IfcxExportResult;
    /**
     * Create IFCX header
     */
    private createHeader;
    /**
     * Collect all nodes for export
     */
    private collectNodes;
    /**
     * Get properties for an entity
     */
    private getPropertiesForEntity;
    /**
     * Get children relationships for an entity
     */
    private getChildrenForEntity;
    /**
     * Get string from string table
     */
    private getString;
    /**
     * Get type name from enum
     */
    private getTypeName;
    /**
     * Generate path for an entity
     */
    private generatePath;
    /**
     * Generate unique ID
     */
    private generateId;
}
/**
 * Quick export function for simple use cases
 */
export declare function exportToIfcx(data: IfcxExportData, options?: IfcxExportOptions): string;
//# sourceMappingURL=writer.d.ts.map