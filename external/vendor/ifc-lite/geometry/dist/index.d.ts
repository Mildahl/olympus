/**
 * @ifc-lite/geometry - Geometry processing bridge
 * Now powered by IFC-Lite native Rust WASM (1.9x faster than web-ifc)
 */
export { IfcLiteBridge, type SymbolicRepresentationCollection, type SymbolicPolyline, type SymbolicCircle } from './ifc-lite-bridge.js';
export { IfcLiteMeshCollector, type StreamingColorUpdateEvent, type StreamingRtcOffsetEvent } from './ifc-lite-mesh-collector.js';
export { createPlatformBridge, isTauri, type IPlatformBridge, type GeometryProcessingResult, type GeometryStats as PlatformGeometryStats, type StreamingOptions, type StreamingProgress, type GeometryBatch, } from './platform-bridge.js';
export { WasmBridge } from './wasm-bridge.js';
export { NativeBridge } from './native-bridge.js';
export { BufferBuilder } from './buffer-builder.js';
export { CoordinateHandler } from './coordinate-handler.js';
export { GeometryQuality } from './progressive-loader.js';
export { LODGenerator, type LODConfig, type LODMesh } from './lod.js';
export { deduplicateMeshes, getDeduplicationStats, type InstancedMeshData, type DeduplicationStats } from './geometry-deduplicator.js';
export * from './types.js';
export * from './default-materials.js';
export { WasmMemoryManager, type GpuGeometryHandle, type GpuMeshMetadataHandle, type GpuInstancedGeometryHandle, type GpuInstancedGeometryCollectionHandle, type GpuInstancedGeometryRefHandle } from './wasm-memory-manager.js';
export { ZeroCopyMeshCollector, ZeroCopyInstancedCollector, type ZeroCopyStreamingProgress, type ZeroCopyBatchResult, type ZeroCopyCompleteStats, type ZeroCopyMeshMetadata, type ZeroCopyBatch, type ZeroCopyInstancedBatch, } from './zero-copy-collector.js';
export { IfcLiteBridge as WebIfcBridge } from './ifc-lite-bridge.js';
import { GeometryQuality } from './progressive-loader.js';
import type { GeometryResult, MeshData } from './types.js';
export interface GeometryProcessorOptions {
    quality?: GeometryQuality;
}
/**
 * Dynamic batch configuration for ramp-up streaming
 * Starts with small batches for fast first frame, ramps up for throughput
 */
export interface DynamicBatchConfig {
    /** Initial batch size for first 3 batches (default: 50) */
    initialBatchSize?: number;
    /** Maximum batch size for batches 11+ (default: 500) */
    maxBatchSize?: number;
    /** File size in MB for adaptive sizing (optional) */
    fileSizeMB?: number;
}
/**
 * Calculate dynamic batch size based on batch number
 */
export declare function calculateDynamicBatchSize(batchNumber: number, initialBatchSize?: number, maxBatchSize?: number): number;
export type StreamingGeometryEvent = {
    type: 'start';
    totalEstimate: number;
} | {
    type: 'model-open';
    modelID: number;
} | {
    type: 'batch';
    meshes: MeshData[];
    totalSoFar: number;
    coordinateInfo?: import('./types.js').CoordinateInfo;
} | {
    type: 'colorUpdate';
    updates: Map<number, [number, number, number, number]>;
} | {
    type: 'rtcOffset';
    rtcOffset: {
        x: number;
        y: number;
        z: number;
    };
    hasRtc: boolean;
} | {
    type: 'complete';
    totalMeshes: number;
    coordinateInfo: import('./types.js').CoordinateInfo;
};
export type StreamingInstancedGeometryEvent = {
    type: 'start';
    totalEstimate: number;
} | {
    type: 'model-open';
    modelID: number;
} | {
    type: 'batch';
    geometries: import('@ifc-lite/wasm').InstancedGeometry[];
    totalSoFar: number;
    coordinateInfo?: import('./types.js').CoordinateInfo;
} | {
    type: 'complete';
    totalGeometries: number;
    totalInstances: number;
    coordinateInfo: import('./types.js').CoordinateInfo;
};
export declare class GeometryProcessor {
    private bridge;
    private platformBridge;
    private bufferBuilder;
    private coordinateHandler;
    private isNative;
    constructor(options?: GeometryProcessorOptions);
    /**
     * Initialize the geometry processor
     * In Tauri: Creates platform bridge for native Rust processing
     * In browser: Loads WASM
     */
    init(): Promise<void>;
    /**
     * Process IFC file and extract geometry (synchronous, use processStreaming for large files)
     * @param buffer IFC file buffer
     * @param entityIndex Optional entity index for priority-based loading
     */
    process(buffer: Uint8Array, entityIndex?: Map<number, any>): Promise<GeometryResult>;
    /**
     * Collect meshes on main thread using IFC-Lite WASM
     */
    private collectMeshesMainThread;
    /**
     * Process IFC file with streaming output for progressive rendering
     * Uses native Rust in Tauri, WASM in browser
     * @param buffer IFC file buffer
     * @param entityIndex Optional entity index for priority-based loading
     * @param batchConfig Dynamic batch configuration or fixed batch size
     */
    processStreaming(buffer: Uint8Array, _entityIndex?: Map<number, any>, batchConfig?: number | DynamicBatchConfig): AsyncGenerator<StreamingGeometryEvent>;
    /**
     * Process IFC file with streaming instanced geometry output for progressive rendering
     * Groups identical geometries by hash (before transformation) for GPU instancing
     * @param buffer IFC file buffer
     * @param batchSize Number of unique geometries per batch (default: 25)
     */
    processInstancedStreaming(buffer: Uint8Array, batchSize?: number): AsyncGenerator<StreamingInstancedGeometryEvent>;
    /**
     * Adaptive processing: Choose sync or streaming based on file size
     * Small files (< threshold): Load all at once for instant display
     * Large files (>= threshold): Stream for fast first frame
     * @param buffer IFC file buffer
     * @param options Configuration options
     * @param options.sizeThreshold File size threshold in bytes (default: 2MB)
     * @param options.batchSize Number of meshes per batch for streaming (default: 25)
     * @param options.entityIndex Optional entity index for priority-based loading
     */
    processAdaptive(buffer: Uint8Array, options?: {
        sizeThreshold?: number;
        batchSize?: number | DynamicBatchConfig;
        entityIndex?: Map<number, any>;
    }): AsyncGenerator<StreamingGeometryEvent>;
    /**
     * Get the WASM API instance for advanced operations (e.g., entity scanning)
     */
    getApi(): import("@ifc-lite/wasm").IfcAPI | null;
    /**
     * Parse symbolic representations (Plan, Annotation, FootPrint) from IFC content
     * These are pre-authored 2D curves for architectural drawings (door swings, window cuts, etc.)
     * @param buffer IFC file buffer
     * @returns Collection of symbolic polylines and circles
     */
    parseSymbolicRepresentations(buffer: Uint8Array): import('@ifc-lite/wasm').SymbolicRepresentationCollection | null;
    /**
     * Cleanup resources
     */
    dispose(): void;
}
//# sourceMappingURL=index.d.ts.map