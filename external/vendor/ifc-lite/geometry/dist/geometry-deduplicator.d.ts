/**
 * Geometry Deduplicator - Groups identical meshes for GPU instancing
 *
 * Reduces draw calls from N individual meshes to M unique geometries with instances.
 * A typical building with 40,000 elements might have only 500-2000 unique geometries.
 */
import type { MeshData } from './types.js';
export interface InstancedMeshData {
    /** Unique hash for this geometry */
    geometryHash: string;
    /** Vertex positions (shared by all instances) */
    positions: Float32Array;
    /** Vertex normals (shared by all instances) */
    normals: Float32Array;
    /** Triangle indices (shared by all instances) */
    indices: Uint32Array;
    /** All instances of this geometry */
    instances: Array<{
        expressId: number;
        color: [number, number, number, number];
    }>;
}
/**
 * Deduplicate meshes by grouping identical geometries
 * Returns instanced mesh data that can be rendered with GPU instancing
 */
export declare function deduplicateMeshes(meshes: MeshData[]): InstancedMeshData[];
/**
 * Stats about deduplication results
 */
export interface DeduplicationStats {
    inputMeshes: number;
    uniqueGeometries: number;
    deduplicationRatio: number;
    totalInstances: number;
    maxInstancesPerGeometry: number;
}
/**
 * Get statistics about deduplication results
 */
export declare function getDeduplicationStats(instanced: InstancedMeshData[]): DeduplicationStats;
//# sourceMappingURL=geometry-deduplicator.d.ts.map