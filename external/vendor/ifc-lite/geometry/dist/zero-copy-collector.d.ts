/**
 * Zero-Copy Mesh Collector - streams GPU-ready geometry with zero-copy access
 *
 * This collector uses the new GPU geometry API that:
 * - Pre-interleaves vertex data (position + normal)
 * - Pre-converts coordinates (Z-up to Y-up)
 * - Exposes pointers for direct WASM memory access
 *
 * The collector provides TypedArray views into WASM memory. The caller
 * is responsible for uploading to GPU (use @ifc-lite/renderer's ZeroCopyGpuUploader).
 *
 * IMPORTANT: Views become INVALID when WASM memory grows!
 * Use the "immediate upload" pattern - create view, upload, discard.
 */
import type { IfcAPI } from '@ifc-lite/wasm';
import { WasmMemoryManager } from './wasm-memory-manager.js';
export interface ZeroCopyStreamingProgress {
    percent: number;
    processed: number;
    total?: number;
    phase: 'simple' | 'simple_complete' | 'complex' | 'complete';
}
export interface ZeroCopyBatchResult {
    /** Number of meshes in this batch */
    meshCount: number;
    /** Total vertices in this batch */
    vertexCount: number;
    /** Total triangles in this batch */
    triangleCount: number;
}
export interface ZeroCopyCompleteStats {
    totalMeshes: number;
    totalVertices: number;
    totalTriangles: number;
}
/**
 * Mesh metadata for draw calls and selection
 */
export interface ZeroCopyMeshMetadata {
    expressId: number;
    vertexOffset: number;
    vertexCount: number;
    indexOffset: number;
    indexCount: number;
    color: [number, number, number, number];
}
/**
 * Batch of geometry data with zero-copy views
 */
export interface ZeroCopyBatch {
    /** View into WASM memory for vertex data (interleaved pos+normal) */
    vertexView: Float32Array;
    /** View into WASM memory for index data */
    indexView: Uint32Array;
    /** Byte length of vertex data (for GPU buffer creation) */
    vertexByteLength: number;
    /** Byte length of index data */
    indexByteLength: number;
    /** Mesh metadata for draw calls */
    meshMetadata: ZeroCopyMeshMetadata[];
    /** Batch statistics */
    stats: ZeroCopyBatchResult;
    /** Free WASM memory (call after uploading to GPU!) */
    free: () => void;
}
/**
 * Zero-copy mesh collector that streams GPU-ready geometry batches
 *
 * Usage:
 * ```typescript
 * const collector = new ZeroCopyMeshCollector(ifcApi, content);
 *
 * for await (const batch of collector.streamBatches()) {
 *   // Create GPU buffers
 *   const vertexBuffer = device.createBuffer({
 *     size: batch.vertexByteLength,
 *     usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
 *   });
 *
 *   // Upload directly from WASM memory (single copy!)
 *   device.queue.writeBuffer(vertexBuffer, 0, batch.vertexView);
 *
 *   // IMPORTANT: Free after upload!
 *   batch.free();
 * }
 * ```
 */
export declare class ZeroCopyMeshCollector {
    private ifcApi;
    private content;
    private memoryManager;
    constructor(ifcApi: IfcAPI, content: string);
    /**
     * Stream geometry batches with zero-copy views into WASM memory
     *
     * @param batchSize Number of meshes per batch (default: 25)
     * @yields Batches with views into WASM memory
     */
    streamBatches(batchSize?: number): AsyncGenerator<ZeroCopyBatch>;
    /**
     * Parse all geometry at once (for smaller files)
     *
     * @returns Batch with views into WASM memory
     */
    parseAll(): ZeroCopyBatch;
    /**
     * Get WASM memory manager for advanced use cases
     */
    getMemoryManager(): WasmMemoryManager;
}
/**
 * Instanced geometry batch with zero-copy views
 */
export interface ZeroCopyInstancedBatch {
    geometryId: bigint;
    /** View into WASM memory for vertex data */
    vertexView: Float32Array;
    /** View into WASM memory for index data */
    indexView: Uint32Array;
    /** View into WASM memory for instance data [transform(16) + color(4)] */
    instanceView: Float32Array;
    /** Express IDs for each instance */
    expressIds: number[];
    /** Byte lengths for GPU buffer creation */
    vertexByteLength: number;
    indexByteLength: number;
    instanceByteLength: number;
    /** Statistics */
    indexCount: number;
    instanceCount: number;
}
/**
 * Zero-copy instanced geometry collector
 */
export declare class ZeroCopyInstancedCollector {
    private ifcApi;
    private content;
    private memoryManager;
    constructor(ifcApi: IfcAPI, content: string);
    /**
     * Parse instanced geometry with zero-copy views
     *
     * @returns Array of instanced geometry batches
     */
    parseAll(): {
        batches: ZeroCopyInstancedBatch[];
        stats: {
            geometryCount: number;
            totalInstances: number;
        };
        free: () => void;
    };
    /**
     * Get WASM memory manager for advanced use cases
     */
    getMemoryManager(): WasmMemoryManager;
}
//# sourceMappingURL=zero-copy-collector.d.ts.map