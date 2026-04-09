/**
 * Native Bridge Implementation
 *
 * Uses Tauri commands for geometry processing in desktop apps.
 * Provides native Rust performance with multi-threading support.
 */
import type { IPlatformBridge, GeometryProcessingResult, GeometryStats, StreamingOptions } from './platform-bridge.js';
/**
 * Native Tauri bridge for desktop apps
 *
 * This uses Tauri's invoke() to call native Rust commands that use
 * ifc-lite-core and ifc-lite-geometry directly (no WASM overhead).
 */
export declare class NativeBridge implements IPlatformBridge {
    private initialized;
    private invoke;
    private listen;
    init(): Promise<void>;
    isInitialized(): boolean;
    processGeometry(content: string): Promise<GeometryProcessingResult>;
    processGeometryStreaming(content: string, options: StreamingOptions): Promise<GeometryStats>;
    getApi(): null;
}
//# sourceMappingURL=native-bridge.d.ts.map