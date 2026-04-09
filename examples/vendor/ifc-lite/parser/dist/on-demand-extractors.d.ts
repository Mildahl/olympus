/**
 * On-demand extraction functions for classifications, materials, documents,
 * georeferencing, relationships, and type properties.
 *
 * These functions parse data lazily from the IFC source buffer when accessed,
 * rather than pre-building all data upfront during initial parse.
 */
import type { IfcEntity } from './types.js';
import { EntityExtractor } from './entity-extractor.js';
import type { PropertyValue } from '@ifc-lite/data';
import type { IfcDataStore } from './columnar-parser.js';
import { type GeoreferenceInfo } from './georef-extractor.js';
export interface ClassificationInfo {
    system?: string;
    identification?: string;
    name?: string;
    location?: string;
    description?: string;
    path?: string[];
}
export interface MaterialInfo {
    type: 'Material' | 'MaterialLayerSet' | 'MaterialProfileSet' | 'MaterialConstituentSet' | 'MaterialList';
    name?: string;
    description?: string;
    layers?: MaterialLayerInfo[];
    profiles?: MaterialProfileInfo[];
    constituents?: MaterialConstituentInfo[];
    materials?: string[];
}
export interface MaterialLayerInfo {
    materialName?: string;
    thickness?: number;
    isVentilated?: boolean;
    name?: string;
    category?: string;
}
export interface MaterialProfileInfo {
    materialName?: string;
    name?: string;
    category?: string;
}
export interface MaterialConstituentInfo {
    materialName?: string;
    name?: string;
    fraction?: number;
    category?: string;
}
/**
 * Result of type-level property extraction.
 */
export interface TypePropertyInfo {
    typeName: string;
    typeId: number;
    properties: Array<{
        name: string;
        globalId?: string;
        properties: Array<{
            name: string;
            type: number;
            value: PropertyValue;
        }>;
    }>;
}
/**
 * Structured document info from IFC document references.
 */
export interface DocumentInfo {
    name?: string;
    description?: string;
    location?: string;
    identification?: string;
    purpose?: string;
    intendedUse?: string;
    revision?: string;
    confidentiality?: string;
}
/**
 * Structured relationship info for an entity.
 */
export interface EntityRelationships {
    voids: Array<{
        id: number;
        name?: string;
        type: string;
    }>;
    fills: Array<{
        id: number;
        name?: string;
        type: string;
    }>;
    groups: Array<{
        id: number;
        name?: string;
    }>;
    connections: Array<{
        id: number;
        name?: string;
        type: string;
    }>;
}
export type { GeoreferenceInfo as GeorefInfo };
/**
 * Parse a property entity's value based on its IFC type.
 * Handles all 6 IfcProperty subtypes:
 * - IfcPropertySingleValue: direct value
 * - IfcPropertyEnumeratedValue: list of enum values → joined string
 * - IfcPropertyBoundedValue: upper/lower bounds → "value [min – max]"
 * - IfcPropertyListValue: list of values → joined string
 * - IfcPropertyTableValue: defining/defined value pairs → "Table(N rows)"
 * - IfcPropertyReferenceValue: entity reference → "Reference #ID"
 */
export declare function parsePropertyValue(propEntity: IfcEntity): {
    type: number;
    value: PropertyValue;
};
/** Extract a numeric value from a possibly typed STEP value. */
export declare function extractNumericValue(attr: unknown): number | null;
/**
 * Extract classifications for a single entity ON-DEMAND.
 * Uses the onDemandClassificationMap built during parsing.
 * Falls back to relationship graph when on-demand map is not available (e.g., server-loaded models).
 * Also checks type-level associations via IfcRelDefinesByType.
 * Returns an array of classification references with system info.
 */
export declare function extractClassificationsOnDemand(store: IfcDataStore, entityId: number): ClassificationInfo[];
/**
 * Extract materials for a single entity ON-DEMAND.
 * Uses the onDemandMaterialMap built during parsing.
 * Falls back to relationship graph when on-demand map is not available (e.g., server-loaded models).
 * Also checks type-level material assignments via IfcRelDefinesByType.
 * Resolves the full material structure (layers, profiles, constituents, lists).
 */
export declare function extractMaterialsOnDemand(store: IfcDataStore, entityId: number): MaterialInfo | null;
/**
 * Extract property sets from a list of pset IDs using the entity index.
 * Shared logic between instance-level and type-level property extraction.
 */
export declare function extractPsetsFromIds(store: IfcDataStore, extractor: EntityExtractor, psetIds: number[]): Array<{
    name: string;
    globalId?: string;
    properties: Array<{
        name: string;
        type: number;
        value: PropertyValue;
    }>;
}>;
/**
 * Extract type-level properties for a single entity ON-DEMAND.
 * Finds the element's type via IfcRelDefinesByType, then extracts property sets from:
 * 1. The type entity's HasPropertySets attribute (IFC2X3/IFC4: index 5 on IfcTypeObject)
 * 2. The onDemandPropertyMap for the type entity (IFC4 IFCRELDEFINESBYPROPERTIES → type)
 * Returns null if no type relationship exists.
 */
export declare function extractTypePropertiesOnDemand(store: IfcDataStore, entityId: number): TypePropertyInfo | null;
/**
 * Extract properties from a type entity's own HasPropertySets attribute.
 * Used when the type entity itself is selected (e.g., via "By Type" tree).
 * Returns the type's own property sets from attribute index 5 + any via IfcRelDefinesByProperties.
 */
export declare function extractTypeEntityOwnProperties(store: IfcDataStore, typeEntityId: number): Array<{
    name: string;
    globalId?: string;
    properties: Array<{
        name: string;
        type: number;
        value: PropertyValue;
    }>;
}>;
/**
 * Extract documents for a single entity ON-DEMAND.
 * Uses the onDemandDocumentMap built during parsing.
 * Falls back to relationship graph when on-demand map is not available.
 * Also checks type-level documents via IfcRelDefinesByType.
 * Returns an array of document info objects.
 */
export declare function extractDocumentsOnDemand(store: IfcDataStore, entityId: number): DocumentInfo[];
/**
 * Extract structural relationships for a single entity ON-DEMAND.
 * Finds openings (VoidsElement), fills (FillsElement), groups (AssignsToGroup),
 * and path connections (ConnectsPathElements).
 */
export declare function extractRelationshipsOnDemand(store: IfcDataStore, entityId: number): EntityRelationships;
/**
 * Extract georeferencing info from on-demand store (source buffer + entityIndex).
 * Bridges to the entity-based georef extractor by resolving entities lazily.
 */
export declare function extractGeoreferencingOnDemand(store: IfcDataStore): GeoreferenceInfo | null;
//# sourceMappingURL=on-demand-extractors.d.ts.map