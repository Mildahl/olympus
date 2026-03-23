import type { ComposedNode } from './types.js';
export interface TraversalFrame {
    node: ComposedNode;
    parent: TraversalFrame | null;
    edgeName: string | null;
    depth: number;
}
export declare function findTraversalRoots(composed: Map<string, ComposedNode>): ComposedNode[];
export declare function findTraversalSeeds(composed: Map<string, ComposedNode>): ComposedNode[];
export declare function walkComposedFrames(composed: Map<string, ComposedNode>, visit: (frame: TraversalFrame) => void): void;
export declare function getFrameLineage(frame: TraversalFrame): TraversalFrame[];
export declare function getNodeLineage(frame: TraversalFrame): ComposedNode[];
export declare function collectIncomingEdgeNames(composed: Map<string, ComposedNode>): Map<string, string[]>;
export declare function buildReachableAttributeIndex(composed: Map<string, ComposedNode>, attributeKey: string): Map<string, boolean>;
//# sourceMappingURL=traversal.d.ts.map