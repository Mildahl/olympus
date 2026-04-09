/**
 * Georeferencing Extractor
 *
 * Extracts IFC georeferencing information for coordinate system transformations.
 *
 * IFC georeferencing concepts:
 * - IfcMapConversion: Transformation from local engineering CRS to map CRS
 * - IfcProjectedCRS: Target coordinate reference system (e.g., UTM, State Plane)
 * - IfcGeometricRepresentationContext: Context with coordinate system info
 *
 * This enables:
 * - Converting IFC coordinates to real-world coordinates (lat/lon or projected)
 * - Integration with GIS systems
 * - Multi-model coordination (ensuring models align in real-world space)
 */
import type { IfcEntity } from './entity-extractor';
export interface MapConversion {
    id: number;
    sourceCRS: number;
    targetCRS: number;
    eastings: number;
    northings: number;
    orthogonalHeight: number;
    xAxisAbscissa?: number;
    xAxisOrdinate?: number;
    scale?: number;
}
export interface ProjectedCRS {
    id: number;
    name: string;
    description?: string;
    geodeticDatum?: string;
    verticalDatum?: string;
    mapProjection?: string;
    mapZone?: string;
    mapUnit?: string;
}
export interface GeoreferenceInfo {
    hasGeoreference: boolean;
    mapConversion?: MapConversion;
    projectedCRS?: ProjectedCRS;
    transformMatrix?: number[];
}
/**
 * Extract georeferencing information from IFC entities
 */
export declare function extractGeoreferencing(entities: Map<number, IfcEntity>, entitiesByType: Map<string, number[]>): GeoreferenceInfo;
/**
 * Transform a point from local to world coordinates
 */
export declare function transformToWorld(localPoint: [number, number, number], georef: GeoreferenceInfo): [number, number, number] | null;
/**
 * Transform a point from world to local coordinates
 */
export declare function transformToLocal(worldPoint: [number, number, number], georef: GeoreferenceInfo): [number, number, number] | null;
/**
 * Get coordinate system description
 */
export declare function getCoordinateSystemDescription(georef: GeoreferenceInfo): string;
//# sourceMappingURL=georef-extractor.d.ts.map