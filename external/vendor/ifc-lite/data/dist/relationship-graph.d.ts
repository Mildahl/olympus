/**
 * Relationship graph - bidirectional graph using CSR format
 * Enables fast traversal in both directions
 */
import { RelationshipType } from './types.js';
export interface Edge {
    target: number;
    type: RelationshipType;
    relationshipId: number;
}
export interface RelationshipEdges {
    offsets: Map<number, number>;
    counts: Map<number, number>;
    edgeTargets: Uint32Array;
    edgeTypes: Uint16Array;
    edgeRelIds: Uint32Array;
    getEdges(entityId: number, type?: RelationshipType): Edge[];
    getTargets(entityId: number, type?: RelationshipType): number[];
    hasAnyEdges(entityId: number): boolean;
}
export interface RelationshipGraph {
    forward: RelationshipEdges;
    inverse: RelationshipEdges;
    getRelated(entityId: number, relType: RelationshipType, direction: 'forward' | 'inverse'): number[];
    hasRelationship(sourceId: number, targetId: number, relType?: RelationshipType): boolean;
    getRelationshipsBetween(sourceId: number, targetId: number): RelationshipInfo[];
}
export interface RelationshipInfo {
    relationshipId: number;
    type: RelationshipType;
    typeName: string;
}
export declare class RelationshipGraphBuilder {
    private edges;
    addEdge(source: number, target: number, type: RelationshipType, relId: number): void;
    build(): RelationshipGraph;
    private buildEdges;
}
//# sourceMappingURL=relationship-graph.d.ts.map