/**
 * Columnar parser - builds columnar data structures
 *
 * OPTIMIZED: Single-pass extraction for maximum performance
 * Instead of multiple passes through entities, we extract everything in ONE loop.
 */
import type { EntityRef } from './types.js';
import { StringTable, EntityTableBuilder, PropertyTableBuilder, RelationshipGraphBuilder } from '@ifc-lite/data';
import type { SpatialHierarchy, QuantityTable, PropertyValue } from '@ifc-lite/data';
export interface SpatialIndex {
    queryAABB(bounds: {
        min: [number, number, number];
        max: [number, number, number];
    }): number[];
    raycast(origin: [number, number, number], direction: [number, number, number]): number[];
}
/**
 * Entity-by-ID lookup interface. Supports both Map<number, EntityRef> (legacy)
 * and CompactEntityIndex (memory-optimized typed arrays with LRU cache).
 */
export type EntityByIdIndex = {
    get(expressId: number): EntityRef | undefined;
    has(expressId: number): boolean;
    readonly size: number;
    keys(): IterableIterator<number>;
    values(): IterableIterator<EntityRef>;
    entries(): IterableIterator<[number, EntityRef]>;
    forEach(callback: (value: EntityRef, key: number) => void): void;
    [Symbol.iterator](): IterableIterator<[number, EntityRef]>;
};
export interface IfcDataStore {
    fileSize: number;
    schemaVersion: 'IFC2X3' | 'IFC4' | 'IFC4X3' | 'IFC5';
    entityCount: number;
    parseTime: number;
    source: Uint8Array;
    entityIndex: {
        byId: EntityByIdIndex;
        byType: Map<string, number[]>;
    };
    strings: StringTable;
    entities: ReturnType<EntityTableBuilder['build']>;
    properties: ReturnType<PropertyTableBuilder['build']>;
    quantities: QuantityTable;
    relationships: ReturnType<RelationshipGraphBuilder['build']>;
    spatialHierarchy?: SpatialHierarchy;
    spatialIndex?: SpatialIndex;
    /**
     * On-demand property lookup: entityId -> array of property set expressIds
     * Used for fast single-entity property access without pre-building property tables.
     * Use extractPropertiesOnDemand() with this map for instant property retrieval.
     */
    onDemandPropertyMap?: Map<number, number[]>;
    /**
     * On-demand quantity lookup: entityId -> array of quantity set expressIds
     * Used for fast single-entity quantity access without pre-building quantity tables.
     * Use extractQuantitiesOnDemand() with this map for instant quantity retrieval.
     */
    onDemandQuantityMap?: Map<number, number[]>;
    /**
     * On-demand classification lookup: entityId -> array of IfcClassificationReference expressIds
     * Built from IfcRelAssociatesClassification relationships during parsing.
     */
    onDemandClassificationMap?: Map<number, number[]>;
    /**
     * On-demand material lookup: entityId -> relatingMaterial expressId
     * Built from IfcRelAssociatesMaterial relationships during parsing.
     * Value is the expressId of IfcMaterial, IfcMaterialLayerSet, IfcMaterialProfileSet, or IfcMaterialConstituentSet.
     */
    onDemandMaterialMap?: Map<number, number>;
    /**
     * On-demand document lookup: entityId -> array of IfcDocumentReference/IfcDocumentInformation expressIds
     * Built from IfcRelAssociatesDocument relationships during parsing.
     */
    onDemandDocumentMap?: Map<number, number[]>;
}
export declare class ColumnarParser {
    /**
     * Parse IFC file into columnar data store
     *
     * Uses fast semicolon-based scanning with on-demand property extraction.
     * Properties are parsed lazily when accessed, not upfront.
     * This provides instant UI responsiveness even for very large files.
     */
    parseLite(buffer: ArrayBuffer, entityRefs: EntityRef[], options?: {
        onProgress?: (progress: {
            phase: string;
            percent: number;
        }) => void;
    }): Promise<IfcDataStore>;
    /**
     * Fast relationship extraction - inline for performance
     */
    private extractRelationshipFast;
    /**
     * Extract properties for a single entity ON-DEMAND
     * Parses only what's needed from the source buffer - instant results.
     */
    extractPropertiesOnDemand(store: IfcDataStore, entityId: number): Array<{
        name: string;
        globalId?: string;
        properties: Array<{
            name: string;
            type: number;
            value: PropertyValue;
        }>;
    }>;
    /**
     * Extract quantities for a single entity ON-DEMAND
     * Parses only what's needed from the source buffer - instant results.
     */
    extractQuantitiesOnDemand(store: IfcDataStore, entityId: number): Array<{
        name: string;
        quantities: Array<{
            name: string;
            type: number;
            value: number;
        }>;
    }>;
}
/**
 * Standalone on-demand property extractor
 * Can be used outside ColumnarParser class
 */
export declare function extractPropertiesOnDemand(store: IfcDataStore, entityId: number): Array<{
    name: string;
    globalId?: string;
    properties: Array<{
        name: string;
        type: number;
        value: PropertyValue;
    }>;
}>;
/**
 * Standalone on-demand quantity extractor
 * Can be used outside ColumnarParser class
 */
export declare function extractQuantitiesOnDemand(store: IfcDataStore, entityId: number): Array<{
    name: string;
    quantities: Array<{
        name: string;
        type: number;
        value: number;
    }>;
}>;
/**
 * Extract entity attributes on-demand from source buffer
 * Returns globalId, name, description, objectType, tag for any IfcRoot-derived entity.
 * This is used for entities that weren't fully parsed during initial load.
 */
export declare function extractEntityAttributesOnDemand(store: IfcDataStore, entityId: number): {
    globalId: string;
    name: string;
    description: string;
    objectType: string;
    tag: string;
};
/**
 * Extract ALL named entity attributes on-demand from source buffer.
 * Uses the IFC schema to map attribute indices to names.
 * Returns only string/enum attributes, skipping references and structural attributes.
 */
export declare function extractAllEntityAttributes(store: IfcDataStore, entityId: number): Array<{
    name: string;
    value: string;
}>;
export { extractClassificationsOnDemand, extractMaterialsOnDemand, extractTypePropertiesOnDemand, extractTypeEntityOwnProperties, extractDocumentsOnDemand, extractRelationshipsOnDemand, extractGeoreferencingOnDemand, parsePropertyValue, extractPsetsFromIds, } from './on-demand-extractors.js';
export type { ClassificationInfo, MaterialInfo, MaterialLayerInfo, MaterialProfileInfo, MaterialConstituentInfo, TypePropertyInfo, DocumentInfo, EntityRelationships, GeorefInfo, } from './on-demand-extractors.js';
//# sourceMappingURL=columnar-parser.d.ts.map