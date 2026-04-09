/**
 * @ifc-lite/parser - Main parser interface
 * Supports both IFC4 (STEP) and IFC5 (IFCX/JSON) formats
 */
export { StepTokenizer } from './tokenizer.js';
export { EntityIndexBuilder } from './entity-index.js';
export { EntityExtractor } from './entity-extractor.js';
export { CompactEntityIndex, buildCompactEntityIndex } from './compact-entity-index.js';
export { OpfsSourceBuffer } from './opfs-source-buffer.js';
export { PropertyExtractor } from './property-extractor.js';
export { QuantityExtractor } from './quantity-extractor.js';
export { RelationshipExtractor } from './relationship-extractor.js';
export { StyleExtractor } from './style-extractor.js';
export { SpatialHierarchyBuilder } from './spatial-hierarchy-builder.js';
export { extractLengthUnitScale } from './unit-extractor.js';
export { ColumnarParser, type IfcDataStore, type EntityByIdIndex, extractPropertiesOnDemand, extractQuantitiesOnDemand, extractEntityAttributesOnDemand, extractAllEntityAttributes, extractClassificationsOnDemand, extractMaterialsOnDemand, extractTypePropertiesOnDemand, extractTypeEntityOwnProperties, extractDocumentsOnDemand, extractRelationshipsOnDemand, extractGeoreferencingOnDemand, type ClassificationInfo, type MaterialInfo, type MaterialLayerInfo, type MaterialProfileInfo, type MaterialConstituentInfo, type TypePropertyInfo, type DocumentInfo, type EntityRelationships } from './columnar-parser.js';
export { parseIfcx, parseFederatedIfcx, addIfcxOverlay, detectFormat, composeIfcx, composeFederated, createLayerStack, createPathIndex, parsePath, type IfcxParseResult, type FederatedIfcxParseResult, type FederatedFileInput, type FederatedParseOptions, type IfcxFile, type IfcxNode, type ComposedNode, type ComposedNodeWithSources, type IfcxLayer, type LayerStack, type PathIndex, type MeshData as IfcxMeshData, } from '@ifc-lite/ifcx';
export { extractMaterials, getMaterialForElement, getMaterialNameForElement, type MaterialsData, type Material, type MaterialLayer, type MaterialLayerSet } from './material-extractor.js';
export { extractGeoreferencing, transformToWorld, transformToLocal, getCoordinateSystemDescription, type GeoreferenceInfo, type MapConversion, type ProjectedCRS } from './georef-extractor.js';
export { extractClassifications, getClassificationsForElement, getClassificationCodeForElement, getClassificationPath, groupElementsByClassification, type ClassificationsData, type Classification, type ClassificationReference } from './classification-extractor.js';
export { SCHEMA_REGISTRY, getEntityMetadata, getAllAttributesForEntity, getInheritanceChainForEntity, isKnownEntity } from './generated/schema-registry.js';
export type * from './generated/entities.js';
export * from './generated/enums.js';
export { serializeValue, toStepLine, generateHeader, generateStepFile, parseStepValue, ref, enumVal, isEntityRef, isEnumValue, type StepValue, type StepEntity, type EntityRef as StepEntityRef, type EnumValue, } from './generated/serializers.js';
export * from './types.js';
export * from './style-extractor.js';
export { getAttributeNames, getAttributeNameAt, isKnownType } from './ifc-schema.js';
import type { ParseResult, EntityRef } from './types.js';
import { type IfcDataStore } from './columnar-parser.js';
export interface ParseOptions {
    onProgress?: (progress: {
        phase: string;
        percent: number;
    }) => void;
    wasmApi?: any;
}
/**
 * Main parser class
 */
export declare class IfcParser {
    /**
     * Parse IFC file into structured data
     */
    parse(buffer: ArrayBuffer, options?: ParseOptions): Promise<ParseResult>;
    /**
     * Parse IFC file into columnar data store
     *
     * Uses fast scan + on-demand property extraction for all files.
     * Properties are extracted lazily when accessed, not upfront.
     */
    parseColumnar(buffer: ArrayBuffer, options?: ParseOptions): Promise<IfcDataStore>;
}
/**
 * On-demand entity parser for lite mode
 * Parse a single entity's attributes from the source buffer
 */
export declare function parseEntityOnDemand(source: Uint8Array, entityRef: EntityRef): {
    expressId: number;
    type: string;
    attributes: any[];
} | null;
import { type IfcxParseResult, type MeshData as IfcxMeshData } from '@ifc-lite/ifcx';
/**
 * Result type for auto-parsing (union of IFC4 and IFC5 results)
 */
export type AutoParseResult = {
    format: 'ifc';
    data: IfcDataStore;
    meshes?: undefined;
} | {
    format: 'ifcx';
    data: IfcxParseResult;
    meshes: IfcxMeshData[];
};
/**
 * Auto-detect file format and parse accordingly.
 * Returns unified result with format indicator.
 */
export declare function parseAuto(buffer: ArrayBuffer, options?: ParseOptions): Promise<AutoParseResult>;
//# sourceMappingURL=index.d.ts.map