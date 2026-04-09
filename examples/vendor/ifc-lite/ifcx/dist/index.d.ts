import { type MeshData } from './geometry-extractor.js';
import { StringTable } from '@ifc-lite/data';
import type { SpatialHierarchy, EntityTable, PropertyTable, QuantityTable, RelationshipGraph } from '@ifc-lite/data';
import { LayerStack } from './layer-stack.js';
import { PathIndex } from './path-resolver.js';
export * from './types.js';
export { composeIfcx, findRoots, getDescendants } from './composition.js';
export { extractEntities } from './entity-extractor.js';
export { extractProperties, isQuantityProperty } from './property-extractor.js';
export { extractGeometry, type MeshData } from './geometry-extractor.js';
export { buildHierarchy } from './hierarchy-builder.js';
export { findTraversalRoots, findTraversalSeeds, walkComposedFrames, getFrameLineage, getNodeLineage, collectIncomingEdgeNames, buildReachableAttributeIndex, type TraversalFrame, } from './traversal.js';
export { LayerStack, createLayerStack, type IfcxLayer, type LayerSource, } from './layer-stack.js';
export { PathIndex, createPathIndex, parsePath, type ParsedPath, type PathEntry, } from './path-resolver.js';
export { composeFederated, type ComposeOptions, type FederatedCompositionResult, type ComposedNodeWithSources, } from './federated-composition.js';
export { IfcxWriter, exportToIfcx, type IfcxExportOptions, type IfcxExportData, type IfcxExportResult, } from './writer.js';
/**
 * Result of parsing an IFCX file.
 * Compatible with existing ifc-lite data structures.
 */
export interface IfcxParseResult {
    /** Columnar entity table */
    entities: EntityTable;
    /** Columnar property table */
    properties: PropertyTable;
    /** Columnar quantity table */
    quantities: QuantityTable;
    /** Relationship graph */
    relationships: RelationshipGraph;
    /** Spatial hierarchy */
    spatialHierarchy: SpatialHierarchy;
    /** String table for interned strings */
    strings: StringTable;
    /** Pre-tessellated geometry meshes */
    meshes: MeshData[];
    /** Mapping from IFCX path to express ID */
    pathToId: Map<string, number>;
    /** Mapping from express ID to IFCX path */
    idToPath: Map<number, string>;
    /** Schema version */
    schemaVersion: 'IFC5';
    /** File size in bytes */
    fileSize: number;
    /** Number of entities */
    entityCount: number;
    /** Parse time in milliseconds */
    parseTime: number;
}
export interface IfcxParseOptions {
    /** Progress callback */
    onProgress?: (progress: {
        phase: string;
        percent: number;
    }) => void;
}
/**
 * Parse an IFCX file and return data compatible with existing ifc-lite pipeline.
 */
export declare function parseIfcx(buffer: ArrayBuffer, options?: IfcxParseOptions): Promise<IfcxParseResult>;
/**
 * Detect if a buffer contains IFCX (JSON), IFC (STEP), or GLB (binary glTF) format.
 */
export declare function detectFormat(buffer: ArrayBuffer): 'ifcx' | 'ifc' | 'glb' | 'unknown';
/**
 * Input for federated parsing - a buffer with a name.
 */
export interface FederatedFileInput {
    buffer: ArrayBuffer;
    name: string;
}
/**
 * Options for federated IFCX parsing.
 */
export interface FederatedParseOptions extends IfcxParseOptions {
    /** Maximum inheritance depth (default: 10) */
    maxInheritDepth?: number;
}
/**
 * Result of parsing federated IFCX files.
 * Extends the standard result with layer information.
 */
export interface FederatedIfcxParseResult extends IfcxParseResult {
    /** Layer stack with all loaded layers */
    layerStack: LayerStack;
    /** Path index for cross-file lookups */
    pathIndex: PathIndex;
    /** Composition statistics */
    compositionStats: {
        layersUsed: number;
        inheritanceResolutions: number;
        crossLayerReferences: number;
    };
    /** Map from path to layer IDs that define it */
    pathToLayers: Map<string, string[]>;
}
/**
 * Parse multiple IFCX files as federated layers.
 *
 * Files are loaded as layers with the first file being the base (weakest)
 * and subsequent files being overlays (stronger). Layer order can be
 * adjusted after parsing using the returned LayerStack.
 *
 * @param files - Array of file buffers with names
 * @param options - Parse options
 * @returns Federated parse result with layer information
 *
 * @example
 * ```typescript
 * const result = await parseFederatedIfcx([
 *   { buffer: baseBuffer, name: 'hello-wall.ifcx' },
 *   { buffer: overlayBuffer, name: 'add-fire-rating.ifcx' },
 * ]);
 *
 * // Wall now has FireRating property from overlay
 * const wallProps = result.properties.getForEntity(wallId);
 * ```
 */
export declare function parseFederatedIfcx(files: FederatedFileInput[], options?: FederatedParseOptions): Promise<FederatedIfcxParseResult>;
/**
 * Add an overlay layer to an existing federated result.
 * Returns a new result with the overlay applied.
 */
export declare function addIfcxOverlay(baseResult: FederatedIfcxParseResult, overlayBuffer: ArrayBuffer, overlayName: string, options?: FederatedParseOptions): Promise<FederatedIfcxParseResult>;
//# sourceMappingURL=index.d.ts.map