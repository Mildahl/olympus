import type { IfcAPI, InstancedGeometry } from '@ifc-lite/wasm';
import type { MeshData } from './types.js';
export interface StreamingProgress {
    percent: number;
    processed: number;
    total: number;
    phase: 'simple' | 'simple_complete' | 'complex';
}
export interface StreamingBatchEvent {
    type: 'batch';
    meshes: MeshData[];
    progress: StreamingProgress;
}
export interface StreamingCompleteEvent {
    type: 'complete';
    stats: {
        totalMeshes: number;
        totalVertices: number;
        totalTriangles: number;
    };
}
export interface StreamingColorUpdateEvent {
    type: 'colorUpdate';
    updates: Map<number, [number, number, number, number]>;
}
export interface StreamingRtcOffsetEvent {
    type: 'rtcOffset';
    /** RTC offset in IFC coordinates (before Z-up to Y-up conversion) */
    rtcOffset: {
        x: number;
        y: number;
        z: number;
    };
    hasRtc: boolean;
}
export type StreamingEvent = StreamingBatchEvent | StreamingCompleteEvent | StreamingColorUpdateEvent | StreamingRtcOffsetEvent;
export declare class IfcLiteMeshCollector {
    private ifcApi;
    private content;
    constructor(ifcApi: IfcAPI, content: string);
    /**
     * Convert IFC Z-up coordinates to WebGL Y-up coordinates
     * IFC uses Z-up (Z points up), WebGL uses Y-up (Y points up)
     * Transformation: swap Y and Z, then negate new Z to maintain right-handedness
     */
    private convertZUpToYUp;
    /**
     * Reverse triangle winding order to correct for handedness flip.
     * The Z-up to Y-up conversion includes a reflection (Z negation),
     * which flips the handedness. This reverses winding to compensate,
     * ensuring triangles face the correct direction after transformation.
     */
    private reverseWindingOrder;
    /**
     * Collect all meshes from IFC-Lite
     * Much faster than web-ifc (~1.9x speedup)
     */
    collectMeshes(): MeshData[];
    /**
     * Get building rotation extracted from IfcSite placement
     */
    getBuildingRotation(): number | undefined;
    /**
     * Collect meshes incrementally, yielding batches for progressive rendering
     * Uses fast-first-frame streaming: simple geometry (walls, slabs) first
     * @param batchSize Number of meshes per batch (default: 25 for faster first frame)
     */
    collectMeshesStreaming(batchSize?: number): AsyncGenerator<MeshData[] | StreamingColorUpdateEvent | StreamingRtcOffsetEvent>;
    /**
     * Collect meshes with dynamic batch sizing (ramp-up approach)
     * Accumulates meshes from WASM and yields them in dynamically-sized batches
     * @param getBatchSize Function that returns batch size for current batch number
     */
    collectMeshesStreamingDynamic(getBatchSize: () => number): AsyncGenerator<MeshData[]>;
    /**
     * Collect instanced geometry incrementally, yielding batches for progressive rendering
     * Groups identical geometries by hash (before transformation) for GPU instancing
     * Uses fast-first-frame streaming: simple geometry (walls, slabs) first
     * @param batchSize Number of unique geometries per batch (default: 25)
     */
    collectInstancedGeometryStreaming(batchSize?: number): AsyncGenerator<InstancedGeometry[]>;
}
//# sourceMappingURL=ifc-lite-mesh-collector.d.ts.map