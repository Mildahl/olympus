/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
/**
 * IFC-Lite Mesh Collector - extracts triangle data from IFC-Lite WASM
 * Replaces mesh-collector.ts - uses native Rust geometry processing (1.9x faster)
 */
import { createLogger } from '@ifc-lite/data';
const log = createLogger('MeshCollector');
export class IfcLiteMeshCollector {
    ifcApi;
    content;
    constructor(ifcApi, content) {
        this.ifcApi = ifcApi;
        this.content = content;
    }
    /**
     * Convert IFC Z-up coordinates to WebGL Y-up coordinates
     * IFC uses Z-up (Z points up), WebGL uses Y-up (Y points up)
     * Transformation: swap Y and Z, then negate new Z to maintain right-handedness
     */
    convertZUpToYUp(coords) {
        for (let i = 0; i < coords.length; i += 3) {
            const y = coords[i + 1];
            const z = coords[i + 2];
            // Swap Y and Z: Z-up → Y-up
            coords[i + 1] = z; // New Y = old Z (vertical)
            coords[i + 2] = -y; // New Z = -old Y (depth, negated for right-hand rule)
        }
    }
    /**
     * Reverse triangle winding order to correct for handedness flip.
     * The Z-up to Y-up conversion includes a reflection (Z negation),
     * which flips the handedness. This reverses winding to compensate,
     * ensuring triangles face the correct direction after transformation.
     */
    reverseWindingOrder(indices) {
        // Calculate last valid triangle index to avoid out-of-bounds access
        const remainder = indices.length % 3;
        const end = indices.length - remainder;
        // Warn if indices array has trailing non-triangle entries
        if (remainder !== 0) {
            console.warn(`[reverseWindingOrder] Index buffer has ${remainder} trailing entries (not divisible by 3)`);
        }
        for (let i = 0; i < end; i += 3) {
            // Swap second and third vertex of each triangle
            const temp = indices[i + 1];
            indices[i + 1] = indices[i + 2];
            indices[i + 2] = temp;
        }
    }
    /**
     * Collect all meshes from IFC-Lite
     * Much faster than web-ifc (~1.9x speedup)
     */
    collectMeshes() {
        let collection;
        try {
            collection = this.ifcApi.parseMeshes(this.content);
        }
        catch (error) {
            log.error('WASM mesh parsing failed', error, { operation: 'collectMeshes' });
            throw error;
        }
        const meshes = [];
        let failedMeshes = 0;
        // Convert MeshCollection to MeshData[]
        for (let i = 0; i < collection.length; i++) {
            let mesh = null;
            try {
                mesh = collection.get(i);
                if (!mesh) {
                    failedMeshes++;
                    continue;
                }
                // Get color array [r, g, b, a]
                const colorArray = mesh.color;
                const color = [
                    colorArray[0],
                    colorArray[1],
                    colorArray[2],
                    colorArray[3],
                ];
                // Z-up→Y-up conversion and winding order reversal are now done
                // in Rust (MeshDataJs::new) for performance.
                meshes.push({
                    expressId: mesh.expressId,
                    ifcType: mesh.ifcType,
                    positions: mesh.positions,
                    normals: mesh.normals,
                    indices: mesh.indices,
                    color,
                });
                // Free the individual mesh to avoid memory leaks
                mesh.free();
                mesh = null; // Mark as freed
            }
            catch (error) {
                failedMeshes++;
                log.caught(`Failed to process mesh ${i}`, error, { operation: 'collectMeshes' });
                // Ensure mesh is freed even on error
                if (mesh) {
                    try {
                        mesh.free();
                    }
                    catch {
                        // Ignore errors during cleanup
                    }
                }
            }
        }
        // Extract building rotation before freeing collection
        const buildingRotation = collection.buildingRotation ?? undefined;
        // Free the collection
        collection.free();
        if (failedMeshes > 0) {
            log.warn(`Skipped ${failedMeshes} meshes due to errors`, { operation: 'collectMeshes' });
        }
        log.debug(`Collected ${meshes.length} meshes`, { operation: 'collectMeshes' });
        // Store building rotation for later use (will be added to CoordinateInfo)
        this._buildingRotation = buildingRotation;
        return meshes;
    }
    /**
     * Get building rotation extracted from IfcSite placement
     */
    getBuildingRotation() {
        return this._buildingRotation;
    }
    /**
     * Collect meshes incrementally, yielding batches for progressive rendering
     * Uses fast-first-frame streaming: simple geometry (walls, slabs) first
     * @param batchSize Number of meshes per batch (default: 25 for faster first frame)
     */
    async *collectMeshesStreaming(batchSize = 25) {
        // Queue to hold batches produced by async callback
        const batchQueue = [];
        let resolveWaiting = null;
        let isComplete = false;
        let processingError = null;
        // Map to store color updates for pending batches
        const colorUpdates = new Map();
        let totalMeshesProcessed = 0;
        let failedMeshCount = 0;
        // Start async processing
        // NOTE: WASM now automatically defers style building for faster first frame
        const processingPromise = this.ifcApi.parseMeshesAsync(this.content, {
            batchSize,
            onRtcOffset: (rtc) => {
                // Emit RTC offset event so consumer can capture it
                batchQueue.push({
                    type: 'rtcOffset',
                    rtcOffset: { x: rtc.x, y: rtc.y, z: rtc.z },
                    hasRtc: rtc.hasRtc,
                });
                // Wake up the generator if it's waiting
                if (resolveWaiting) {
                    resolveWaiting();
                    resolveWaiting = null;
                }
            },
            onColorUpdate: (updates) => {
                // Store color updates
                for (const [expressId, color] of updates) {
                    colorUpdates.set(expressId, color);
                }
                // Emit color update event
                batchQueue.push({
                    type: 'colorUpdate',
                    updates: new Map(updates),
                });
                // Wake up the generator if it's waiting
                if (resolveWaiting) {
                    resolveWaiting();
                    resolveWaiting = null;
                }
            },
            onBatch: (meshes, _progress) => {
                // Convert WASM meshes to MeshData[]
                const convertedBatch = [];
                for (const mesh of meshes) {
                    try {
                        // Use updated color if available, otherwise use mesh color
                        const expressId = mesh.expressId;
                        const color = colorUpdates.get(expressId) ?? [
                            mesh.color[0],
                            mesh.color[1],
                            mesh.color[2],
                            mesh.color[3],
                        ];
                        // Capture arrays once — Z-up→Y-up conversion and winding order
                        // reversal are now done in Rust (MeshDataJs::new) for performance.
                        convertedBatch.push({
                            expressId,
                            ifcType: mesh.ifcType,
                            positions: mesh.positions,
                            normals: mesh.normals,
                            indices: mesh.indices,
                            color,
                        });
                        // Free the mesh to avoid memory leaks
                        mesh.free();
                        totalMeshesProcessed++;
                    }
                    catch (error) {
                        failedMeshCount++;
                        log.caught(`Failed to process mesh #${mesh.expressId}`, error, {
                            operation: 'collectMeshesStreaming',
                            entityId: mesh.expressId,
                        });
                        try {
                            mesh.free();
                        }
                        catch {
                            // Ignore free errors
                        }
                    }
                }
                // Add batch to queue
                if (convertedBatch.length > 0) {
                    batchQueue.push(convertedBatch);
                }
                // Wake up the generator if it's waiting
                if (resolveWaiting) {
                    resolveWaiting();
                    resolveWaiting = null;
                }
            },
            onComplete: (stats) => {
                isComplete = true;
                // Store building rotation if present
                if (stats.buildingRotation !== undefined) {
                    this._buildingRotation = stats.buildingRotation;
                }
                log.debug(`Streaming complete: ${stats.totalMeshes} meshes, ${stats.totalVertices} vertices, ${stats.totalTriangles} triangles`, {
                    operation: 'collectMeshesStreaming',
                });
                if (failedMeshCount > 0) {
                    log.warn(`Skipped ${failedMeshCount} meshes due to errors`, { operation: 'collectMeshesStreaming' });
                }
                // Wake up the generator if it's waiting
                if (resolveWaiting) {
                    resolveWaiting();
                    resolveWaiting = null;
                }
            },
        }).catch((error) => {
            processingError = error instanceof Error ? error : new Error(String(error));
            log.error('WASM streaming parsing failed', processingError, { operation: 'collectMeshesStreaming' });
            isComplete = true;
            if (resolveWaiting) {
                resolveWaiting();
                resolveWaiting = null;
            }
        });
        // Yield batches as they become available
        let yieldedBatchCount = 0;
        while (true) {
            // Yield any queued batches
            while (batchQueue.length > 0) {
                yieldedBatchCount++;
                yield batchQueue.shift();
            }
            // Check for errors
            if (processingError) {
                throw processingError;
            }
            // Check if we're done
            if (isComplete && batchQueue.length === 0) {
                break;
            }
            // Wait for more batches
            await new Promise((resolve) => {
                resolveWaiting = resolve;
            });
        }
        // Warn if WASM returned 0 results for a non-trivially-sized file
        // This typically indicates WASM ran out of memory during parsing
        if (yieldedBatchCount === 0 && this.content.length > 1000) {
            const sizeMB = (this.content.length / (1024 * 1024)).toFixed(1);
            log.warn(`WASM streaming returned 0 batches for ${sizeMB}MB file - ` +
                `this may indicate insufficient memory for large file processing`, { operation: 'collectMeshesStreaming', data: { contentLength: this.content.length } });
        }
        // Ensure processing is complete
        await processingPromise;
    }
    /**
     * Collect meshes with dynamic batch sizing (ramp-up approach)
     * Accumulates meshes from WASM and yields them in dynamically-sized batches
     * @param getBatchSize Function that returns batch size for current batch number
     */
    async *collectMeshesStreamingDynamic(getBatchSize) {
        let batchNumber = 0;
        let accumulatedMeshes = [];
        let currentBatchSize = getBatchSize();
        // Use larger WASM batches to reduce callback overhead
        // First frame responsiveness comes from WASM's internal simple/complex ordering
        // For huge files (>100MB), use 500 to minimize callbacks (20x fewer than 25)
        const wasmBatchSize = 500; // Larger batches = fewer callbacks = faster
        for await (const item of this.collectMeshesStreaming(wasmBatchSize)) {
            // Skip color update events in dynamic batching
            if (item && typeof item === 'object' && 'type' in item && item.type === 'colorUpdate') {
                continue;
            }
            const wasmBatch = item;
            for (let i = 0; i < wasmBatch.length; i++)
                accumulatedMeshes.push(wasmBatch[i]);
            // Yield when we've accumulated enough for current dynamic batch size
            while (accumulatedMeshes.length >= currentBatchSize) {
                const batchToYield = accumulatedMeshes.splice(0, currentBatchSize);
                yield batchToYield;
                // Update batch size for next batch
                batchNumber++;
                currentBatchSize = getBatchSize();
            }
        }
        // Yield remaining meshes
        if (accumulatedMeshes.length > 0) {
            yield accumulatedMeshes;
        }
    }
    /**
     * Collect instanced geometry incrementally, yielding batches for progressive rendering
     * Groups identical geometries by hash (before transformation) for GPU instancing
     * Uses fast-first-frame streaming: simple geometry (walls, slabs) first
     * @param batchSize Number of unique geometries per batch (default: 25)
     */
    async *collectInstancedGeometryStreaming(batchSize = 25) {
        // Queue to hold batches produced by async callback
        const batchQueue = [];
        let resolveWaiting = null;
        let isComplete = false;
        let processingError = null;
        // Start async processing
        const processingPromise = this.ifcApi.parseMeshesInstancedAsync(this.content, {
            batchSize,
            onBatch: (geometries, _progress) => {
                // NOTE: Do NOT convert Z-up to Y-up here for instanced geometry!
                // Instance transforms position geometry in world space.
                // If we convert local positions but not transforms, geometry breaks.
                // The viewer handles coordinate system in the camera/shader.
                // Add batch directly to queue without modification
                batchQueue.push(geometries);
                // Wake up the generator if it's waiting
                if (resolveWaiting) {
                    resolveWaiting();
                    resolveWaiting = null;
                }
            },
            onComplete: (_stats) => {
                isComplete = true;
                // Wake up the generator if it's waiting
                if (resolveWaiting) {
                    resolveWaiting();
                    resolveWaiting = null;
                }
            },
        }).catch((error) => {
            processingError = error instanceof Error ? error : new Error(String(error));
            log.error('WASM instanced streaming parsing failed', processingError, { operation: 'collectInstancedGeometryStreaming' });
            isComplete = true;
            if (resolveWaiting) {
                resolveWaiting();
                resolveWaiting = null;
            }
        });
        // Yield batches as they become available
        let yieldedBatchCount = 0;
        while (true) {
            // Yield any queued batches
            while (batchQueue.length > 0) {
                yieldedBatchCount++;
                yield batchQueue.shift();
            }
            // Check for errors
            if (processingError) {
                throw processingError;
            }
            // Check if we're done
            if (isComplete && batchQueue.length === 0) {
                break;
            }
            // Wait for more batches
            await new Promise((resolve) => {
                resolveWaiting = resolve;
            });
        }
        // Warn if WASM returned 0 results for a non-trivially-sized file
        // This typically indicates WASM ran out of memory during parsing
        if (yieldedBatchCount === 0 && this.content.length > 1000) {
            const sizeMB = (this.content.length / (1024 * 1024)).toFixed(1);
            log.warn(`WASM instanced streaming returned 0 batches for ${sizeMB}MB file - ` +
                `this may indicate insufficient memory for large file processing`, { operation: 'collectInstancedGeometryStreaming', data: { contentLength: this.content.length } });
        }
        // Ensure processing is complete
        await processingPromise;
    }
}
//# sourceMappingURL=ifc-lite-mesh-collector.js.map