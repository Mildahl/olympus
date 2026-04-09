import { IfcAPI, MeshCollection, MeshDataJs, InstancedMeshCollection, InstancedGeometry, InstanceData, SymbolicRepresentationCollection, SymbolicPolyline, SymbolicCircle } from '@ifc-lite/wasm';
export type { MeshCollection, MeshDataJs, InstancedMeshCollection, InstancedGeometry, InstanceData, SymbolicRepresentationCollection, SymbolicPolyline, SymbolicCircle };
export interface StreamingProgress {
    percent: number;
    processed: number;
    total: number;
    phase: 'simple' | 'simple_complete' | 'complex';
}
export interface StreamingStats {
    totalMeshes: number;
    totalVertices: number;
    totalTriangles: number;
}
export interface InstancedStreamingStats {
    totalGeometries: number;
    totalInstances: number;
}
export interface ParseMeshesAsyncOptions {
    batchSize?: number;
    onBatch?: (meshes: MeshDataJs[], progress: StreamingProgress) => void;
    onComplete?: (stats: StreamingStats) => void;
    onColorUpdate?: (updates: Map<number, [number, number, number, number]>) => void;
}
export interface ParseMeshesInstancedAsyncOptions {
    batchSize?: number;
    onBatch?: (geometries: InstancedGeometry[], progress: StreamingProgress) => void;
    onComplete?: (stats: InstancedStreamingStats) => void;
}
export declare class IfcLiteBridge {
    private ifcApi;
    private initialized;
    private isWasmRuntimeError;
    private markFatalWasmRuntimeError;
    /**
     * Initialize IFC-Lite WASM
     * The WASM binary is automatically resolved from the same location as the JS module
     */
    init(): Promise<void>;
    /**
     * Reset the JS wrapper state.
     * This does not reload wasm-bindgen's module singleton after a fatal WASM panic.
     */
    reset(): void;
    /**
     * Parse IFC content and return mesh collection (blocking)
     * Returns individual meshes with express IDs and colors
     */
    parseMeshes(content: string): MeshCollection;
    /**
     * Parse IFC content and return instanced geometry collection (blocking)
     * Groups identical geometries by hash and returns instances with transforms
     * Reduces draw calls significantly for buildings with repeated elements
     */
    parseMeshesInstanced(content: string): InstancedMeshCollection;
    /**
     * Parse IFC content with streaming (non-blocking)
     * Yields batches progressively for fast first frame
     * Simple geometry (walls, slabs, beams) processed first
     */
    parseMeshesAsync(content: string, options?: ParseMeshesAsyncOptions): Promise<void>;
    /**
     * Parse IFC content with streaming instanced geometry (non-blocking)
     * Groups identical geometries and yields batches progressively
     * Simple geometry (walls, slabs, beams) processed first
     * Reduces draw calls significantly for buildings with repeated elements
     */
    parseMeshesInstancedAsync(content: string, options?: ParseMeshesInstancedAsyncOptions): Promise<void>;
    /**
     * Parse IFC content and return symbolic representations (Plan, Annotation, FootPrint)
     * These are pre-authored 2D curves for architectural drawings
     */
    parseSymbolicRepresentations(content: string): SymbolicRepresentationCollection;
    /**
     * Get IFC-Lite API instance
     */
    getApi(): IfcAPI;
    /**
     * Check if initialized
     */
    isInitialized(): boolean;
    /**
     * Get version
     */
    getVersion(): string;
}
//# sourceMappingURL=ifc-lite-bridge.d.ts.map