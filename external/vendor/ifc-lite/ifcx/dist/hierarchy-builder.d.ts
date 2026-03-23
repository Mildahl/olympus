/**
 * Hierarchy Builder for IFCX
 * Builds spatial hierarchy from composed nodes
 */
import type { ComposedNode } from './types.js';
import type { SpatialHierarchy } from '@ifc-lite/data';
/**
 * Build spatial hierarchy from composed IFCX nodes.
 *
 * IFCX hierarchy comes from children relationships:
 * - Project -> Site -> Building -> Storey -> Elements
 *
 * We identify spatial structure elements by their bsi::ifc::class codes.
 */
export declare function buildHierarchy(composed: Map<string, ComposedNode>, pathToId: Map<string, number>): SpatialHierarchy;
//# sourceMappingURL=hierarchy-builder.d.ts.map