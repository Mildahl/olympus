/**
 * Coordinate Handler - handles large coordinate systems by shifting to origin
 *
 * AEC models often use real-world coordinates (UTM, survey coordinates) with
 * values like X: 500,000m, Y: 5,000,000m. This causes float precision issues.
 *
 * Solution: Shift model to local origin (centroid) while preserving original
 * coordinates for export/queries.
 */
import type { MeshData } from './types.js';
export interface Vec3 {
    x: number;
    y: number;
    z: number;
}
export interface AABB {
    min: Vec3;
    max: Vec3;
}
export interface CoordinateInfo {
    originShift: Vec3;
    originalBounds: AABB;
    shiftedBounds: AABB;
    /** True if model had large coordinates requiring RTC shift. NOT the same as proper georeferencing via IfcMapConversion. */
    hasLargeCoordinates: boolean;
    /** RTC offset applied by WASM in IFC coordinates (Z-up). Used for multi-model alignment. */
    wasmRtcOffset?: Vec3;
    /** Building rotation angle in radians (from IfcSite placement). Rotation of building's principal axes relative to world X/Y/Z. */
    buildingRotation?: number;
}
export declare class CoordinateHandler {
    private originShift;
    private readonly THRESHOLD;
    private readonly MAX_REASONABLE_COORD;
    private accumulatedBounds;
    private shiftCalculated;
    private wasmRtcDetected;
    private readonly NORMAL_COORD_THRESHOLD;
    private activeThreshold;
    /**
     * Check if a coordinate value is reasonable (not corrupted garbage)
     */
    private isReasonableValue;
    /**
     * Calculate bounding box from all meshes (filtering out corrupted values)
     * @param meshes - Meshes to calculate bounds from
     * @param maxCoord - Optional max coordinate threshold (default: MAX_REASONABLE_COORD).
     *   NOTE: Ignored when WASM RTC is active — coordinates are already guaranteed
     *   small and valid by the WASM layer, so the fast sampling path is used instead.
     */
    calculateBounds(meshes: MeshData[], maxCoord?: number): AABB;
    /**
     * Fast bounds calculation using vertex sampling.
     * Used when WASM RTC is confirmed — coordinates are small and valid.
     * Samples first and last vertex of each mesh instead of scanning all vertices.
     * For 208K meshes this is ~416K vertex checks vs 63.5M = ~150x faster.
     * Accuracy is excellent because meshes are localized objects.
     */
    private calculateBoundsFast;
    /**
     * Check if coordinate shift is needed
     */
    needsShift(bounds: AABB): boolean;
    /**
     * Calculate centroid (center point) from bounds
     */
    calculateCentroid(bounds: AABB): Vec3;
    /**
     * Shift positions in-place by subtracting origin shift
     * Corrupted values are set to 0 (center of shifted coordinate system)
     * @param positions - Position array to modify
     * @param shift - Origin shift to subtract
     * @param threshold - Optional threshold for valid coordinates (defaults to MAX_REASONABLE_COORD)
     */
    shiftPositions(positions: Float32Array, shift: Vec3, threshold?: number): void;
    /**
     * Shift bounds by subtracting origin shift
     */
    shiftBounds(bounds: AABB, shift: Vec3): AABB;
    /**
     * Process meshes: detect large coordinates and shift if needed
     */
    processMeshes(meshes: MeshData[]): CoordinateInfo;
    /**
     * Convert local (shifted) coordinates back to world coordinates
     */
    toWorldCoordinates(localPos: Vec3): Vec3;
    /**
     * Convert world coordinates to local (shifted) coordinates
     */
    toLocalCoordinates(worldPos: Vec3): Vec3;
    /**
     * Get current origin shift
     */
    getOriginShift(): Vec3;
    /**
     * Process meshes incrementally for streaming
     * Accumulates bounds and applies shift once calculated
     *
     * IMPORTANT: Detects if WASM already applied RTC offset by checking if
     * majority of meshes have small coordinates. If so, skips TypeScript shift.
     */
    processMeshesIncremental(batch: MeshData[]): void;
    /**
     * Get current coordinate info (for incremental updates)
     */
    getCurrentCoordinateInfo(): CoordinateInfo | null;
    /**
     * Get final coordinate info after incremental processing
     */
    getFinalCoordinateInfo(): CoordinateInfo;
    /**
     * Reset incremental state (for new file)
     */
    reset(): void;
}
//# sourceMappingURL=coordinate-handler.d.ts.map