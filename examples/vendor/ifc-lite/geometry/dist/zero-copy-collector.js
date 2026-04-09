/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { WasmMemoryManager } from './wasm-memory-manager.js';
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
export class ZeroCopyMeshCollector {
    ifcApi;
    content;
    memoryManager;
    constructor(ifcApi, content) {
        this.ifcApi = ifcApi;
        this.content = content;
        // Get WASM memory for zero-copy access
        const wasmMemory = ifcApi.getMemory();
        this.memoryManager = new WasmMemoryManager(wasmMemory);
    }
    /**
     * Stream geometry batches with zero-copy views into WASM memory
     *
     * @param batchSize Number of meshes per batch (default: 25)
     * @yields Batches with views into WASM memory
     */
    async *streamBatches(batchSize = 25) {
        // Queue to hold batches from async callback
        const batchQueue = [];
        let resolveWaiting = null;
        let isComplete = false;
        // Start async processing
        const processingPromise = this.ifcApi.parseToGpuGeometryAsync(this.content, {
            batchSize,
            onBatch: (gpuGeom, _progress) => {
                batchQueue.push(gpuGeom);
                if (resolveWaiting) {
                    resolveWaiting();
                    resolveWaiting = null;
                }
            },
            onComplete: (_stats) => {
                isComplete = true;
                if (resolveWaiting) {
                    resolveWaiting();
                    resolveWaiting = null;
                }
            },
        });
        // Process batches as they arrive
        while (true) {
            while (batchQueue.length > 0) {
                const gpuGeom = batchQueue.shift();
                // Create zero-copy views into WASM memory
                const vertexView = this.memoryManager.createFloat32View(gpuGeom.vertexDataPtr, gpuGeom.vertexDataLen);
                const indexView = this.memoryManager.createUint32View(gpuGeom.indicesPtr, gpuGeom.indicesLen);
                // Extract mesh metadata
                const meshMetadata = [];
                for (let i = 0; i < gpuGeom.meshCount; i++) {
                    const meta = gpuGeom.getMeshMetadata(i);
                    if (meta) {
                        meshMetadata.push({
                            expressId: meta.expressId,
                            vertexOffset: meta.vertexOffset,
                            vertexCount: meta.vertexCount,
                            indexOffset: meta.indexOffset,
                            indexCount: meta.indexCount,
                            color: meta.color,
                        });
                    }
                }
                yield {
                    vertexView,
                    indexView,
                    vertexByteLength: gpuGeom.vertexDataByteLength,
                    indexByteLength: gpuGeom.indicesByteLength,
                    meshMetadata,
                    stats: {
                        meshCount: gpuGeom.meshCount,
                        vertexCount: gpuGeom.totalVertexCount,
                        triangleCount: gpuGeom.totalTriangleCount,
                    },
                    free: () => gpuGeom.free(),
                };
            }
            if (isComplete && batchQueue.length === 0)
                break;
            // Wait for more batches
            await new Promise((resolve) => {
                resolveWaiting = resolve;
            });
        }
        await processingPromise;
    }
    /**
     * Parse all geometry at once (for smaller files)
     *
     * @returns Batch with views into WASM memory
     */
    parseAll() {
        // Get GPU-ready geometry from WASM
        const gpuGeom = this.ifcApi.parseToGpuGeometry(this.content);
        // Create zero-copy views
        const vertexView = this.memoryManager.createFloat32View(gpuGeom.vertexDataPtr, gpuGeom.vertexDataLen);
        const indexView = this.memoryManager.createUint32View(gpuGeom.indicesPtr, gpuGeom.indicesLen);
        // Extract mesh metadata
        const meshMetadata = [];
        for (let i = 0; i < gpuGeom.meshCount; i++) {
            const meta = gpuGeom.getMeshMetadata(i);
            if (meta) {
                meshMetadata.push({
                    expressId: meta.expressId,
                    vertexOffset: meta.vertexOffset,
                    vertexCount: meta.vertexCount,
                    indexOffset: meta.indexOffset,
                    indexCount: meta.indexCount,
                    color: meta.color,
                });
            }
        }
        return {
            vertexView,
            indexView,
            vertexByteLength: gpuGeom.vertexDataByteLength,
            indexByteLength: gpuGeom.indicesByteLength,
            meshMetadata,
            stats: {
                meshCount: gpuGeom.meshCount,
                vertexCount: gpuGeom.totalVertexCount,
                triangleCount: gpuGeom.totalTriangleCount,
            },
            free: () => gpuGeom.free(),
        };
    }
    /**
     * Get WASM memory manager for advanced use cases
     */
    getMemoryManager() {
        return this.memoryManager;
    }
}
/**
 * Zero-copy instanced geometry collector
 */
export class ZeroCopyInstancedCollector {
    ifcApi;
    content;
    memoryManager;
    constructor(ifcApi, content) {
        this.ifcApi = ifcApi;
        this.content = content;
        const wasmMemory = ifcApi.getMemory();
        this.memoryManager = new WasmMemoryManager(wasmMemory);
    }
    /**
     * Parse instanced geometry with zero-copy views
     *
     * @returns Array of instanced geometry batches
     */
    parseAll() {
        const collection = this.ifcApi.parseToGpuInstancedGeometry(this.content);
        const batches = [];
        let totalInstances = 0;
        for (let i = 0; i < collection.length; i++) {
            const geomRef = collection.getRef(i);
            if (!geomRef)
                continue;
            // Create zero-copy views
            const vertexView = this.memoryManager.createFloat32View(geomRef.vertexDataPtr, geomRef.vertexDataLen);
            const indexView = this.memoryManager.createUint32View(geomRef.indicesPtr, geomRef.indicesLen);
            const instanceView = this.memoryManager.createFloat32View(geomRef.instanceDataPtr, geomRef.instanceDataLen);
            const expressIdsView = this.memoryManager.createUint32View(geomRef.instanceExpressIdsPtr, geomRef.instanceCount);
            batches.push({
                geometryId: geomRef.geometryId,
                vertexView,
                indexView,
                instanceView,
                expressIds: Array.from(expressIdsView),
                vertexByteLength: geomRef.vertexDataByteLength,
                indexByteLength: geomRef.indicesByteLength,
                instanceByteLength: geomRef.instanceDataByteLength,
                indexCount: geomRef.indicesLen,
                instanceCount: geomRef.instanceCount,
            });
            totalInstances += geomRef.instanceCount;
        }
        return {
            batches,
            stats: {
                geometryCount: collection.length,
                totalInstances,
            },
            free: () => {
                if (typeof collection.free === 'function') {
                    collection.free();
                }
            },
        };
    }
    /**
     * Get WASM memory manager for advanced use cases
     */
    getMemoryManager() {
        return this.memoryManager;
    }
}
//# sourceMappingURL=zero-copy-collector.js.map