/**
 * WASM Bridge Implementation
 *
 * Uses @ifc-lite/wasm for geometry processing in web browsers.
 * This is the existing implementation wrapped in the IPlatformBridge interface.
 */
import type { IPlatformBridge, GeometryProcessingResult, GeometryStats, StreamingOptions } from './platform-bridge.js';
/**
 * WASM-based platform bridge for web browsers
 */
export declare class WasmBridge implements IPlatformBridge {
    private bridge;
    private initialized;
    constructor();
    init(): Promise<void>;
    isInitialized(): boolean;
    processGeometry(content: string): Promise<GeometryProcessingResult>;
    processGeometryStreaming(content: string, options: StreamingOptions): Promise<GeometryStats>;
    getApi(): unknown;
}
//# sourceMappingURL=wasm-bridge.d.ts.map