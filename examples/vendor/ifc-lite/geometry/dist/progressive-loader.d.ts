/**
 * Progressive Geometry Loader - Priority-based batch loading
 * Processes LoadAllGeometry results in priority order to show geometry faster
 */
import type { MeshData } from './types.js';
export declare enum GeometryQuality {
    Fast = "fast",// Skip small objects, simplified geometry
    Balanced = "balanced",// Default - all geometry
    High = "high"
}
/**
 * web-ifc FlatMesh type (from LoadAllGeometry result)
 * Using interface since web-ifc doesn't provide TypeScript definitions
 */
export interface WebIfcFlatMesh {
    geometries: {
        size: () => number;
    };
    expressID: number;
}
/**
 * web-ifc LoadAllGeometry result type
 */
export interface WebIfcGeometryResult {
    size: () => number;
    get: (index: number) => WebIfcFlatMesh;
}
export interface PriorityMesh {
    index: number;
    expressId: number;
    priority: number;
    flatMesh: WebIfcFlatMesh;
}
/**
 * Calculate priority score for a mesh
 * Higher score = load sooner
 */
export declare function calculateMeshPriority(flatMesh: WebIfcFlatMesh, expressId: number, entityIndex?: Map<number, any>): number;
/**
 * Progressive mesh loader - processes meshes in priority batches
 */
export declare class ProgressiveMeshLoader {
    private quality;
    private batchSize;
    private yieldInterval;
    constructor(quality?: GeometryQuality, batchSize?: number, yieldInterval?: number);
    /**
     * Sort meshes by priority and return sorted array
     */
    prioritizeMeshes(geometries: WebIfcGeometryResult, entityIndex?: Map<number, unknown>): PriorityMesh[];
    /**
     * Check if mesh should be skipped based on quality mode
     */
    shouldSkipMesh(priorityMesh: PriorityMesh, flatMesh: WebIfcFlatMesh): boolean;
    /**
     * Yield control to main thread
     */
    private yieldToMainThread;
    /**
     * Process meshes in batches with yielding
     */
    processBatches(priorityMeshes: PriorityMesh[], processMesh: (priorityMesh: PriorityMesh) => MeshData | null): AsyncGenerator<MeshData[], void, unknown>;
}
//# sourceMappingURL=progressive-loader.d.ts.map