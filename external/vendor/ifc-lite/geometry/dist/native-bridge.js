/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
/**
 * Native Tauri bridge for desktop apps
 *
 * This uses Tauri's invoke() to call native Rust commands that use
 * ifc-lite-core and ifc-lite-geometry directly (no WASM overhead).
 */
export class NativeBridge {
    initialized = false;
    invoke = null;
    listen = null;
    async init() {
        if (this.initialized)
            return;
        // Access Tauri internals directly to avoid bundler issues
        // This is set by Tauri runtime and is always available in Tauri apps
        const win = globalThis;
        if (!win.__TAURI_INTERNALS__?.invoke) {
            throw new Error('Tauri API not available - this bridge should only be used in Tauri apps');
        }
        this.invoke = win.__TAURI_INTERNALS__.invoke;
        // For event listening, we still need the event module
        // Use dynamic import with try-catch for better error handling
        try {
            const event = await import('@tauri-apps/api/event');
            this.listen = event.listen;
        }
        catch {
            // Event listening is optional - streaming will fall back to non-streaming
            console.warn('[NativeBridge] Event API not available, streaming will be limited');
        }
        this.initialized = true;
    }
    isInitialized() {
        return this.initialized;
    }
    async processGeometry(content) {
        if (!this.initialized || !this.invoke) {
            await this.init();
        }
        // Convert string to buffer for Tauri command
        const encoder = new TextEncoder();
        const buffer = Array.from(encoder.encode(content));
        // Call native Rust command
        const result = await this.invoke('get_geometry', { buffer });
        // Convert native format to TypeScript format
        const meshes = result.meshes.map(convertNativeMesh);
        const coordinateInfo = convertNativeCoordinateInfo(result.coordinateInfo);
        return {
            meshes,
            totalVertices: result.totalVertices,
            totalTriangles: result.totalTriangles,
            coordinateInfo,
        };
    }
    async processGeometryStreaming(content, options) {
        if (!this.initialized || !this.invoke) {
            await this.init();
        }
        // If event API not available, fall back to non-streaming processing
        if (!this.listen) {
            console.warn('[NativeBridge] Event API unavailable, falling back to non-streaming mode');
            const result = await this.processGeometry(content);
            const stats = {
                totalMeshes: result.meshes.length,
                totalVertices: result.totalVertices,
                totalTriangles: result.totalTriangles,
                parseTimeMs: 0,
                geometryTimeMs: 0,
            };
            // Emit single batch with all meshes
            options.onBatch?.({
                meshes: result.meshes,
                progress: { processed: result.meshes.length, total: result.meshes.length, currentType: 'complete' },
            });
            options.onComplete?.(stats);
            return stats;
        }
        // Convert string to buffer for Tauri command
        const encoder = new TextEncoder();
        const buffer = Array.from(encoder.encode(content));
        // Listen for geometry batch events
        const unlisten = await this.listen('geometry-batch', (event) => {
            const batch = {
                meshes: event.payload.meshes.map(convertNativeMesh),
                progress: {
                    processed: event.payload.progress.processed,
                    total: event.payload.progress.total,
                    currentType: event.payload.progress.currentType,
                },
            };
            options.onBatch?.(batch);
        });
        try {
            // Call native streaming command
            const stats = await this.invoke('get_geometry_streaming', { buffer });
            const result = {
                totalMeshes: stats.totalMeshes,
                totalVertices: stats.totalVertices,
                totalTriangles: stats.totalTriangles,
                parseTimeMs: stats.parseTimeMs,
                geometryTimeMs: stats.geometryTimeMs,
            };
            options.onComplete?.(result);
            return result;
        }
        catch (error) {
            options.onError?.(error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
        finally {
            // Clean up event listener
            unlisten();
        }
    }
    getApi() {
        // Native bridge doesn't expose an API object
        return null;
    }
}
// Conversion functions
function convertNativeMesh(native) {
    return {
        expressId: native.expressId,
        positions: new Float32Array(native.positions),
        normals: new Float32Array(native.normals),
        indices: new Uint32Array(native.indices),
        color: native.color,
    };
}
function convertNativeCoordinateInfo(native) {
    return {
        originShift: native.originShift,
        originalBounds: native.originalBounds,
        shiftedBounds: native.shiftedBounds,
        hasLargeCoordinates: native.hasLargeCoordinates,
    };
}
//# sourceMappingURL=native-bridge.js.map