/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
/**
 * @ifc-lite/geometry - Geometry processing bridge
 * Now powered by IFC-Lite native Rust WASM (1.9x faster than web-ifc)
 */
// IFC-Lite components (recommended - faster)
export { IfcLiteBridge } from './ifc-lite-bridge.js';
export { IfcLiteMeshCollector } from './ifc-lite-mesh-collector.js';
// Platform bridge abstraction (auto-selects WASM or native based on environment)
export { createPlatformBridge, isTauri, } from './platform-bridge.js';
export { WasmBridge } from './wasm-bridge.js';
export { NativeBridge } from './native-bridge.js';
// Support components
export { BufferBuilder } from './buffer-builder.js';
export { CoordinateHandler } from './coordinate-handler.js';
export { GeometryQuality } from './progressive-loader.js';
export { LODGenerator } from './lod.js';
export { deduplicateMeshes, getDeduplicationStats } from './geometry-deduplicator.js';
export * from './types.js';
export * from './default-materials.js';
// Zero-copy GPU upload (new - faster, less memory)
export { WasmMemoryManager } from './wasm-memory-manager.js';
export { ZeroCopyMeshCollector, ZeroCopyInstancedCollector, } from './zero-copy-collector.js';
// Legacy exports for compatibility (deprecated)
export { IfcLiteBridge as WebIfcBridge } from './ifc-lite-bridge.js';
import { IfcLiteBridge } from './ifc-lite-bridge.js';
import { IfcLiteMeshCollector } from './ifc-lite-mesh-collector.js';
import { BufferBuilder } from './buffer-builder.js';
import { CoordinateHandler } from './coordinate-handler.js';
import { createPlatformBridge, isTauri } from './platform-bridge.js';
/**
 * Calculate dynamic batch size based on batch number
 */
export function calculateDynamicBatchSize(batchNumber, initialBatchSize = 50, maxBatchSize = 500) {
    if (batchNumber <= 3) {
        return initialBatchSize; // Fast first frame
    }
    else if (batchNumber <= 6) {
        return Math.floor((initialBatchSize + maxBatchSize) / 2); // Quick ramp
    }
    else {
        return maxBatchSize; // Full throughput earlier
    }
}
export class GeometryProcessor {
    bridge = null;
    platformBridge = null;
    bufferBuilder;
    coordinateHandler;
    isNative = false;
    constructor(options = {}) {
        this.bufferBuilder = new BufferBuilder();
        this.coordinateHandler = new CoordinateHandler();
        this.isNative = isTauri();
        // Note: options accepted for API compatibility
        void options.quality;
        if (!this.isNative) {
            this.bridge = new IfcLiteBridge();
        }
    }
    /**
     * Initialize the geometry processor
     * In Tauri: Creates platform bridge for native Rust processing
     * In browser: Loads WASM
     */
    async init() {
        if (this.isNative) {
            // Create platform bridge for native processing
            this.platformBridge = await createPlatformBridge();
            await this.platformBridge.init();
            console.log('[GeometryProcessor] Native bridge initialized');
        }
        else {
            // WASM path
            if (this.bridge) {
                await this.bridge.init();
            }
        }
    }
    /**
     * Process IFC file and extract geometry (synchronous, use processStreaming for large files)
     * @param buffer IFC file buffer
     * @param entityIndex Optional entity index for priority-based loading
     */
    async process(buffer, entityIndex) {
        void entityIndex;
        let meshes;
        if (this.isNative && this.platformBridge) {
            // NATIVE PATH - Use Tauri commands
            console.time('[GeometryProcessor] native-processing');
            const decoder = new TextDecoder();
            const content = decoder.decode(buffer);
            const result = await this.platformBridge.processGeometry(content);
            meshes = result.meshes;
            console.timeEnd('[GeometryProcessor] native-processing');
        }
        else {
            // WASM PATH - Synchronous processing on main thread
            // For large files, use processStreaming() instead
            if (!this.bridge?.isInitialized()) {
                await this.init();
            }
            const mainThreadResult = await this.collectMeshesMainThread(buffer);
            meshes = mainThreadResult.meshes;
            // Merge building rotation from WASM into coordinate info
            const coordinateInfoFromHandler = this.coordinateHandler.processMeshes(meshes);
            const buildingRotation = mainThreadResult.buildingRotation;
            const coordinateInfo = {
                ...coordinateInfoFromHandler,
                buildingRotation,
            };
            // Build GPU-ready buffers
            const bufferResult = this.bufferBuilder.processMeshes(meshes);
            // Combine results
            return {
                meshes: bufferResult.meshes,
                totalTriangles: bufferResult.totalTriangles,
                totalVertices: bufferResult.totalVertices,
                coordinateInfo,
            };
        }
        // Handle large coordinates by shifting to origin
        const coordinateInfo = this.coordinateHandler.processMeshes(meshes);
        // Build GPU-ready buffers
        const bufferResult = this.bufferBuilder.processMeshes(meshes);
        // Combine results
        const result = {
            meshes: bufferResult.meshes,
            totalTriangles: bufferResult.totalTriangles,
            totalVertices: bufferResult.totalVertices,
            coordinateInfo,
        };
        return result;
    }
    /**
     * Collect meshes on main thread using IFC-Lite WASM
     */
    async collectMeshesMainThread(buffer, _entityIndex) {
        if (!this.bridge) {
            throw new Error('WASM bridge not initialized');
        }
        // Convert buffer to string (IFC files are text)
        const decoder = new TextDecoder();
        const content = decoder.decode(buffer);
        const collector = new IfcLiteMeshCollector(this.bridge.getApi(), content);
        const meshes = collector.collectMeshes();
        const buildingRotation = collector.getBuildingRotation();
        return { meshes, buildingRotation };
    }
    /**
     * Process IFC file with streaming output for progressive rendering
     * Uses native Rust in Tauri, WASM in browser
     * @param buffer IFC file buffer
     * @param entityIndex Optional entity index for priority-based loading
     * @param batchConfig Dynamic batch configuration or fixed batch size
     */
    async *processStreaming(buffer, _entityIndex, batchConfig = 25) {
        // Initialize if needed
        if (this.isNative) {
            if (!this.platformBridge) {
                await this.init();
            }
        }
        else if (!this.bridge?.isInitialized()) {
            await this.init();
        }
        // Reset coordinate handler for new file
        this.coordinateHandler.reset();
        // Yield start event FIRST so UI can update before heavy processing
        yield { type: 'start', totalEstimate: buffer.length / 1000 };
        // Yield to main thread before heavy decode operation
        await new Promise(resolve => setTimeout(resolve, 0));
        // Convert buffer to string (IFC files are text)
        const decoder = new TextDecoder();
        const content = decoder.decode(buffer);
        yield { type: 'model-open', modelID: 0 };
        if (this.isNative && this.platformBridge) {
            // NATIVE PATH - Use Tauri streaming
            console.time('[GeometryProcessor] native-streaming');
            // For native, we do a single batch for now (streaming via events is complex)
            // TODO: Implement proper streaming with Tauri events
            const result = await this.platformBridge.processGeometry(content);
            const totalMeshes = result.meshes.length;
            this.coordinateHandler.processMeshesIncremental(result.meshes);
            const coordinateInfo = this.coordinateHandler.getFinalCoordinateInfo();
            yield { type: 'batch', meshes: result.meshes, totalSoFar: totalMeshes, coordinateInfo: coordinateInfo || undefined };
            yield { type: 'complete', totalMeshes, coordinateInfo };
            console.timeEnd('[GeometryProcessor] native-streaming');
        }
        else {
            // WASM PATH
            if (!this.bridge) {
                throw new Error('WASM bridge not initialized');
            }
            const collector = new IfcLiteMeshCollector(this.bridge.getApi(), content);
            let totalMeshes = 0;
            let extractedBuildingRotation = undefined;
            // Determine optimal WASM batch size based on file size
            // Larger batches = fewer callbacks = faster processing
            const fileSizeMB = typeof batchConfig !== 'number' && batchConfig.fileSizeMB
                ? batchConfig.fileSizeMB
                : buffer.length / (1024 * 1024);
            // Use WASM batches directly - no JS accumulation layer
            // WASM already prioritizes simple geometry (walls, slabs) for fast first frame
            // PERF: Larger batches dramatically reduce WASM↔JS boundary crossing overhead.
            // 487MB file: batch 500→1500 cut WASM wait from 79s to 39s.
            const wasmBatchSize = fileSizeMB < 10 ? 100 : fileSizeMB < 50 ? 200 : fileSizeMB < 100 ? 300 : fileSizeMB < 300 ? 500 : fileSizeMB < 500 ? 1500 : 3000;
            // Use WASM batches directly for maximum throughput
            for await (const item of collector.collectMeshesStreaming(wasmBatchSize)) {
                // Handle color update events
                if (item && typeof item === 'object' && 'type' in item && item.type === 'colorUpdate') {
                    yield { type: 'colorUpdate', updates: item.updates };
                    continue;
                }
                // Handle RTC offset events
                if (item && typeof item === 'object' && 'type' in item && item.type === 'rtcOffset') {
                    const rtcEvent = item;
                    yield { type: 'rtcOffset', rtcOffset: rtcEvent.rtcOffset, hasRtc: rtcEvent.hasRtc };
                    continue;
                }
                // Handle mesh batches
                const batch = item;
                // Process coordinate shifts incrementally (will accumulate bounds)
                this.coordinateHandler.processMeshesIncremental(batch);
                totalMeshes += batch.length;
                const coordinateInfo = this.coordinateHandler.getCurrentCoordinateInfo();
                // Merge buildingRotation if we have it
                const coordinateInfoWithRotation = coordinateInfo && extractedBuildingRotation !== undefined
                    ? { ...coordinateInfo, buildingRotation: extractedBuildingRotation }
                    : coordinateInfo;
                yield { type: 'batch', meshes: batch, totalSoFar: totalMeshes, coordinateInfo: coordinateInfoWithRotation || undefined };
            }
            // Get building rotation after streaming completes
            extractedBuildingRotation = collector.getBuildingRotation();
            const coordinateInfo = this.coordinateHandler.getFinalCoordinateInfo();
            const finalCoordinateInfo = extractedBuildingRotation !== undefined
                ? { ...coordinateInfo, buildingRotation: extractedBuildingRotation }
                : coordinateInfo;
            yield { type: 'complete', totalMeshes, coordinateInfo: finalCoordinateInfo };
        }
    }
    /**
     * Process IFC file with streaming instanced geometry output for progressive rendering
     * Groups identical geometries by hash (before transformation) for GPU instancing
     * @param buffer IFC file buffer
     * @param batchSize Number of unique geometries per batch (default: 25)
     */
    async *processInstancedStreaming(buffer, batchSize = 25) {
        // Initialize if needed
        if (this.isNative) {
            if (!this.platformBridge) {
                await this.init();
            }
            // Note: Native instanced streaming not yet implemented - fall through to WASM
            // For now, throw an error to make it clear
            console.warn('[GeometryProcessor] Native instanced streaming not yet implemented, using WASM');
        }
        if (!this.bridge?.isInitialized()) {
            await this.init();
        }
        // Reset coordinate handler for new file
        this.coordinateHandler.reset();
        yield { type: 'start', totalEstimate: buffer.length / 1000 };
        // Convert buffer to string (IFC files are text)
        const decoder = new TextDecoder();
        const content = decoder.decode(buffer);
        // Use a placeholder model ID (IFC-Lite doesn't use model IDs)
        yield { type: 'model-open', modelID: 0 };
        const collector = new IfcLiteMeshCollector(this.bridge.getApi(), content);
        let totalGeometries = 0;
        let totalInstances = 0;
        // Adapt batch size for large files to reduce callback overhead
        // Larger batches = fewer callbacks = less overhead for huge models
        const fileSizeMB = buffer.length / (1024 * 1024);
        const effectiveBatchSize = fileSizeMB < 50 ? batchSize : fileSizeMB < 200 ? Math.max(batchSize, 50) : fileSizeMB < 300 ? Math.max(batchSize, 100) : Math.max(batchSize, 200);
        for await (const batch of collector.collectInstancedGeometryStreaming(effectiveBatchSize)) {
            // For instanced geometry, we need to extract mesh data from instances for coordinate handling
            // Convert InstancedGeometry to MeshData[] for coordinate handler
            const meshDataBatch = [];
            for (const geom of batch) {
                const positions = geom.positions;
                const normals = geom.normals;
                const indices = geom.indices;
                // Create a mesh data entry for each instance (for coordinate bounds calculation)
                // We'll use the first instance's color as representative
                if (geom.instance_count > 0) {
                    const firstInstance = geom.get_instance(0);
                    if (firstInstance) {
                        const color = firstInstance.color;
                        meshDataBatch.push({
                            expressId: firstInstance.expressId,
                            positions,
                            normals,
                            indices,
                            color: [color[0], color[1], color[2], color[3]],
                        });
                    }
                }
            }
            // Process coordinate shifts incrementally
            if (meshDataBatch.length > 0) {
                this.coordinateHandler.processMeshesIncremental(meshDataBatch);
            }
            totalGeometries += batch.length;
            totalInstances += batch.reduce((sum, g) => sum + g.instance_count, 0);
            // Get current coordinate info for this batch
            const coordinateInfo = this.coordinateHandler.getCurrentCoordinateInfo();
            yield {
                type: 'batch',
                geometries: batch,
                totalSoFar: totalGeometries,
                coordinateInfo: coordinateInfo || undefined
            };
        }
        const coordinateInfo = this.coordinateHandler.getFinalCoordinateInfo();
        yield { type: 'complete', totalGeometries, totalInstances, coordinateInfo };
    }
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
    async *processAdaptive(buffer, options = {}) {
        const sizeThreshold = options.sizeThreshold ?? 2 * 1024 * 1024; // Default 2MB
        const batchConfig = options.batchSize ?? 25;
        // Initialize if needed
        if (this.isNative) {
            if (!this.platformBridge) {
                await this.init();
            }
        }
        else if (!this.bridge?.isInitialized()) {
            await this.init();
        }
        // Reset coordinate handler for new file
        this.coordinateHandler.reset();
        // Small files: Load all at once (sync)
        if (buffer.length < sizeThreshold) {
            yield { type: 'start', totalEstimate: buffer.length / 1000 };
            // Convert buffer to string (IFC files are text)
            const decoder = new TextDecoder();
            const content = decoder.decode(buffer);
            yield { type: 'model-open', modelID: 0 };
            let allMeshes;
            if (this.isNative && this.platformBridge) {
                // NATIVE PATH - single batch processing
                console.time('[GeometryProcessor] native-adaptive-sync');
                const result = await this.platformBridge.processGeometry(content);
                allMeshes = result.meshes;
                console.timeEnd('[GeometryProcessor] native-adaptive-sync');
            }
            else {
                // WASM PATH
                const collector = new IfcLiteMeshCollector(this.bridge.getApi(), content);
                allMeshes = collector.collectMeshes();
            }
            // Process coordinate shifts
            this.coordinateHandler.processMeshesIncremental(allMeshes);
            const coordinateInfo = this.coordinateHandler.getFinalCoordinateInfo();
            // Emit as single batch for immediate rendering
            yield {
                type: 'batch',
                meshes: allMeshes,
                totalSoFar: allMeshes.length,
                coordinateInfo: coordinateInfo || undefined,
            };
            yield { type: 'complete', totalMeshes: allMeshes.length, coordinateInfo };
        }
        else {
            // Large files: Stream for fast first frame
            // processStreaming will emit its own start and model-open events
            yield* this.processStreaming(buffer, options.entityIndex, batchConfig);
        }
    }
    /**
     * Get the WASM API instance for advanced operations (e.g., entity scanning)
     */
    getApi() {
        if (!this.bridge || !this.bridge.isInitialized()) {
            return null;
        }
        return this.bridge.getApi();
    }
    /**
     * Parse symbolic representations (Plan, Annotation, FootPrint) from IFC content
     * These are pre-authored 2D curves for architectural drawings (door swings, window cuts, etc.)
     * @param buffer IFC file buffer
     * @returns Collection of symbolic polylines and circles
     */
    parseSymbolicRepresentations(buffer) {
        if (!this.bridge || !this.bridge.isInitialized()) {
            return null;
        }
        const decoder = new TextDecoder();
        const content = decoder.decode(buffer);
        return this.bridge.parseSymbolicRepresentations(content);
    }
    /**
     * Cleanup resources
     */
    dispose() {
        // No cleanup needed
    }
}
//# sourceMappingURL=index.js.map