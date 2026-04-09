/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
/**
 * IFC-Lite bridge - initializes and manages IFC-Lite WASM for geometry processing
 * Replaces web-ifc-bridge.ts with native IFC-Lite implementation (1.9x faster)
 */
import { createLogger } from '@ifc-lite/data';
import init, { IfcAPI } from '@ifc-lite/wasm';
const log = createLogger('Geometry');
const FATAL_WASM_RELOAD_REQUIRED_MESSAGE = 'IFC-Lite WASM cannot recover from a fatal runtime error within the same document lifetime. Reload the page or recreate the worker process before calling init() again.';
let fatalWasmRuntimeError = null;
export class IfcLiteBridge {
    ifcApi = null;
    initialized = false;
    isWasmRuntimeError(error) {
        return error instanceof WebAssembly.RuntimeError;
    }
    markFatalWasmRuntimeError() {
        fatalWasmRuntimeError = new Error(FATAL_WASM_RELOAD_REQUIRED_MESSAGE);
        this.reset();
    }
    /**
     * Initialize IFC-Lite WASM
     * The WASM binary is automatically resolved from the same location as the JS module
     */
    async init() {
        if (this.initialized)
            return;
        if (fatalWasmRuntimeError) {
            throw fatalWasmRuntimeError;
        }
        try {
            // Initialize WASM module - wasm-bindgen automatically resolves the WASM URL
            // from import.meta.url, no need to manually construct paths
            await init();
            this.ifcApi = new IfcAPI();
            this.initialized = true;
            log.info('WASM geometry engine initialized');
        }
        catch (error) {
            log.error('Failed to initialize WASM geometry engine', error, {
                operation: 'init',
            });
            if (this.isWasmRuntimeError(error)) {
                this.markFatalWasmRuntimeError();
            }
            else {
                this.reset();
            }
            throw error;
        }
    }
    /**
     * Reset the JS wrapper state.
     * This does not reload wasm-bindgen's module singleton after a fatal WASM panic.
     */
    reset() {
        this.initialized = false;
        this.ifcApi = null;
    }
    /**
     * Parse IFC content and return mesh collection (blocking)
     * Returns individual meshes with express IDs and colors
     */
    parseMeshes(content) {
        if (!this.ifcApi) {
            throw new Error('IFC-Lite not initialized. Call init() first.');
        }
        try {
            const collection = this.ifcApi.parseMeshes(content);
            log.debug(`Parsed ${collection.length} meshes`, { operation: 'parseMeshes' });
            return collection;
        }
        catch (error) {
            log.error('Failed to parse IFC geometry', error, {
                operation: 'parseMeshes',
                data: { contentLength: content.length },
            });
            if (this.isWasmRuntimeError(error)) {
                this.markFatalWasmRuntimeError();
            }
            throw error;
        }
    }
    /**
     * Parse IFC content and return instanced geometry collection (blocking)
     * Groups identical geometries by hash and returns instances with transforms
     * Reduces draw calls significantly for buildings with repeated elements
     */
    parseMeshesInstanced(content) {
        if (!this.ifcApi) {
            throw new Error('IFC-Lite not initialized. Call init() first.');
        }
        try {
            const collection = this.ifcApi.parseMeshesInstanced(content);
            log.debug(`Parsed ${collection.length} instanced geometries`, { operation: 'parseMeshesInstanced' });
            return collection;
        }
        catch (error) {
            log.error('Failed to parse instanced IFC geometry', error, {
                operation: 'parseMeshesInstanced',
                data: { contentLength: content.length },
            });
            if (this.isWasmRuntimeError(error)) {
                this.markFatalWasmRuntimeError();
            }
            throw error;
        }
    }
    /**
     * Parse IFC content with streaming (non-blocking)
     * Yields batches progressively for fast first frame
     * Simple geometry (walls, slabs, beams) processed first
     */
    async parseMeshesAsync(content, options = {}) {
        if (!this.ifcApi) {
            throw new Error('IFC-Lite not initialized. Call init() first.');
        }
        try {
            return await this.ifcApi.parseMeshesAsync(content, options);
        }
        catch (error) {
            log.error('Failed to parse IFC geometry (streaming)', error, {
                operation: 'parseMeshesAsync',
                data: { contentLength: content.length },
            });
            if (this.isWasmRuntimeError(error)) {
                this.markFatalWasmRuntimeError();
            }
            throw error;
        }
    }
    /**
     * Parse IFC content with streaming instanced geometry (non-blocking)
     * Groups identical geometries and yields batches progressively
     * Simple geometry (walls, slabs, beams) processed first
     * Reduces draw calls significantly for buildings with repeated elements
     */
    async parseMeshesInstancedAsync(content, options = {}) {
        if (!this.ifcApi) {
            throw new Error('IFC-Lite not initialized. Call init() first.');
        }
        try {
            return await this.ifcApi.parseMeshesInstancedAsync(content, options);
        }
        catch (error) {
            log.error('Failed to parse instanced IFC geometry (streaming)', error, {
                operation: 'parseMeshesInstancedAsync',
                data: { contentLength: content.length },
            });
            if (this.isWasmRuntimeError(error)) {
                this.markFatalWasmRuntimeError();
            }
            throw error;
        }
    }
    /**
     * Parse IFC content and return symbolic representations (Plan, Annotation, FootPrint)
     * These are pre-authored 2D curves for architectural drawings
     */
    parseSymbolicRepresentations(content) {
        if (!this.ifcApi) {
            throw new Error('IFC-Lite not initialized. Call init() first.');
        }
        try {
            const collection = this.ifcApi.parseSymbolicRepresentations(content);
            log.debug(`Parsed ${collection.totalCount} symbolic items (${collection.polylineCount} polylines, ${collection.circleCount} circles)`, { operation: 'parseSymbolicRepresentations' });
            return collection;
        }
        catch (error) {
            log.error('Failed to parse symbolic representations', error, {
                operation: 'parseSymbolicRepresentations',
                data: { contentLength: content.length },
            });
            if (this.isWasmRuntimeError(error)) {
                this.markFatalWasmRuntimeError();
            }
            throw error;
        }
    }
    /**
     * Get IFC-Lite API instance
     */
    getApi() {
        if (!this.ifcApi) {
            throw new Error('IFC-Lite not initialized. Call init() first.');
        }
        return this.ifcApi;
    }
    /**
     * Check if initialized
     */
    isInitialized() {
        return this.initialized;
    }
    /**
     * Get version
     */
    getVersion() {
        return this.ifcApi?.version ?? 'unknown';
    }
}
//# sourceMappingURL=ifc-lite-bridge.js.map