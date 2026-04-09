/**
 * Geometry Extractor for IFCX
 * Extracts USD-style mesh data and converts to MeshData format
 *
 * COORDINATE SYSTEM:
 * - IFCX uses Z-up (following IFC/buildingSMART convention)
 * - The ifc-lite viewer uses Y-up (standard WebGL convention)
 * - This extractor converts from Z-up to Y-up after applying transforms
 */
import type { ComposedNode } from './types.js';
/**
 * MeshData interface compatible with @ifc-lite/geometry
 */
export interface MeshData {
    expressId: number;
    ifcType?: string;
    positions: Float32Array;
    normals: Float32Array;
    indices: Uint32Array;
    color: [number, number, number, number];
}
/**
 * Extract geometry from composed IFCX nodes.
 *
 * IFC5 geometry is pre-tessellated (unlike IFC4 parametric geometry),
 * so this is straightforward mesh extraction.
 *
 * Note: Meshes are often on child nodes (like "Body", "Axis") that don't
 * have their own bsi::ifc::class. We associate these with the closest
 * ancestor entity that has an expressId.
 *
 * Output geometry is converted to Y-up for the viewer.
 */
export declare function extractGeometry(composed: Map<string, ComposedNode>, pathToId: Map<string, number>): MeshData[];
//# sourceMappingURL=geometry-extractor.d.ts.map