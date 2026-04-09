/**
 * Level of Detail (LOD) system for geometry optimization
 * Uses screen-space size culling for performance
 */
import type { MeshData } from './types.js';
import type { Vec3 } from './types.js';
export interface LODConfig {
    /**
     * Minimum screen-space size (in pixels) to render at full detail
     * Objects smaller than this will be culled
     */
    minScreenSize?: number;
    /**
     * Distance thresholds for LOD levels (in world units)
     * [near, mid, far] - objects beyond far threshold are culled
     */
    distanceThresholds?: [number, number, number];
}
export interface LODMesh {
    lod0: MeshData;
    lod1?: MeshData;
    lod2?: MeshData;
    bounds: {
        min: Vec3;
        max: Vec3;
    };
}
export declare class LODGenerator {
    private config;
    constructor(config?: LODConfig);
    /**
     * Calculate screen-space size of a mesh from camera position
     */
    calculateScreenSize(meshBounds: {
        min: Vec3;
        max: Vec3;
    }, cameraPosition: Vec3, _viewProjMatrix: Float32Array, _viewportWidth: number, viewportHeight: number): number;
    /**
     * Determine if mesh should be rendered based on screen size
     */
    shouldRender(meshBounds: {
        min: Vec3;
        max: Vec3;
    }, cameraPosition: Vec3, viewProjMatrix: Float32Array, viewportWidth: number, viewportHeight: number): boolean;
    /**
     * Get LOD level based on distance (0 = full detail, 1 = medium, 2 = low, -1 = cull)
     */
    getLODLevel(meshBounds: {
        min: Vec3;
        max: Vec3;
    }, cameraPosition: Vec3): number;
    /**
     * Compute bounds from mesh data
     */
    static computeBounds(mesh: MeshData): {
        min: Vec3;
        max: Vec3;
    };
}
//# sourceMappingURL=lod.d.ts.map