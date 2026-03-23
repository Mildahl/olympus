/**
 * IFCX Composition Engine
 * Flattens ECS-style nodes into a composed tree structure
 */
import type { IfcxFile, ComposedNode } from './types.js';
/**
 * Compose IFCX nodes into a flattened tree structure.
 *
 * Algorithm:
 * 1. Group all nodes by path (multiple nodes can reference same path)
 * 2. Merge attributes (later wins - layer semantics)
 * 3. Resolve inherits references (type-level data)
 * 4. Build parent-child tree from children references
 */
export declare function composeIfcx(file: IfcxFile): Map<string, ComposedNode>;
/**
 * Find root nodes (nodes with no parent reference).
 */
export declare function findRoots(composed: Map<string, ComposedNode>): ComposedNode[];
/**
 * Get all descendant nodes of a given node.
 */
export declare function getDescendants(node: ComposedNode): ComposedNode[];
//# sourceMappingURL=composition.d.ts.map