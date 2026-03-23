/**
 * Buffer builder - creates GPU-ready interleaved vertex buffers
 */
import type { MeshData } from './types.js';
export interface BufferResult {
    meshes: MeshData[];
    totalTriangles: number;
    totalVertices: number;
}
export declare class BufferBuilder {
    /**
     * Build interleaved vertex buffer from mesh data
     * Format: [x,y,z,nx,ny,nz] per vertex
     */
    buildInterleavedBuffer(mesh: MeshData): Float32Array;
    /**
     * Process all meshes and build GPU-ready buffers
     */
    processMeshes(meshes: MeshData[]): BufferResult;
}
//# sourceMappingURL=buffer-builder.d.ts.map