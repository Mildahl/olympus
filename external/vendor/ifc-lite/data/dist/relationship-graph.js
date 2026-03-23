/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
/**
 * Relationship graph - bidirectional graph using CSR format
 * Enables fast traversal in both directions
 */
import { RelationshipType } from './types.js';
export class RelationshipGraphBuilder {
    edges = [];
    addEdge(source, target, type, relId) {
        this.edges.push({ source, target, type, relId });
    }
    build() {
        // Sort edges by source for forward CSR, by target for inverse CSR
        const forwardEdges = [...this.edges].sort((a, b) => a.source - b.source);
        const inverseEdges = [...this.edges].sort((a, b) => a.target - b.target);
        const forward = this.buildEdges(forwardEdges, 'source', 'target');
        const inverse = this.buildEdges(inverseEdges, 'target', 'source');
        return {
            forward,
            inverse,
            getRelated: (entityId, relType, direction) => {
                const edges = direction === 'forward'
                    ? forward.getEdges(entityId, relType)
                    : inverse.getEdges(entityId, relType);
                return edges.map((e) => e.target);
            },
            hasRelationship: (sourceId, targetId, relType) => {
                const edges = forward.getEdges(sourceId, relType);
                return edges.some((e) => e.target === targetId);
            },
            getRelationshipsBetween: (sourceId, targetId) => {
                const edges = forward.getEdges(sourceId);
                return edges
                    .filter((e) => e.target === targetId)
                    .map((e) => ({
                    relationshipId: e.relationshipId,
                    type: e.type,
                    typeName: RelationshipTypeToString(e.type),
                }));
            },
        };
    }
    buildEdges(sortedEdges, keyField, valueField) {
        const offsets = new Map();
        const counts = new Map();
        const edgeTargets = new Uint32Array(sortedEdges.length);
        const edgeTypes = new Uint16Array(sortedEdges.length);
        const edgeRelIds = new Uint32Array(sortedEdges.length);
        let currentKey = -1;
        for (let i = 0; i < sortedEdges.length; i++) {
            const edge = sortedEdges[i];
            const key = edge[keyField];
            if (key !== currentKey) {
                offsets.set(key, i);
                currentKey = key;
            }
            counts.set(key, (counts.get(key) ?? 0) + 1);
            edgeTargets[i] = edge[valueField];
            edgeTypes[i] = edge.type;
            edgeRelIds[i] = edge.relId;
        }
        return {
            offsets,
            counts,
            edgeTargets,
            edgeTypes,
            edgeRelIds,
            getEdges(entityId, type) {
                const offset = offsets.get(entityId);
                if (offset === undefined)
                    return [];
                const count = counts.get(entityId);
                const edges = [];
                for (let i = offset; i < offset + count; i++) {
                    if (type === undefined || edgeTypes[i] === type) {
                        edges.push({
                            target: edgeTargets[i],
                            type: edgeTypes[i],
                            relationshipId: edgeRelIds[i],
                        });
                    }
                }
                return edges;
            },
            getTargets(entityId, type) {
                return this.getEdges(entityId, type).map(e => e.target);
            },
            hasAnyEdges(entityId) {
                return offsets.has(entityId);
            },
        };
    }
}
function RelationshipTypeToString(type) {
    const names = {
        [RelationshipType.ContainsElements]: 'IfcRelContainedInSpatialStructure',
        [RelationshipType.Aggregates]: 'IfcRelAggregates',
        [RelationshipType.DefinesByProperties]: 'IfcRelDefinesByProperties',
        [RelationshipType.DefinesByType]: 'IfcRelDefinesByType',
        [RelationshipType.AssociatesMaterial]: 'IfcRelAssociatesMaterial',
        [RelationshipType.AssociatesClassification]: 'IfcRelAssociatesClassification',
        [RelationshipType.AssociatesDocument]: 'IfcRelAssociatesDocument',
        [RelationshipType.VoidsElement]: 'IfcRelVoidsElement',
        [RelationshipType.FillsElement]: 'IfcRelFillsElement',
        [RelationshipType.ConnectsPathElements]: 'IfcRelConnectsPathElements',
        [RelationshipType.ConnectsElements]: 'IfcRelConnectsElements',
        [RelationshipType.SpaceBoundary]: 'IfcRelSpaceBoundary',
        [RelationshipType.AssignsToGroup]: 'IfcRelAssignsToGroup',
        [RelationshipType.AssignsToProduct]: 'IfcRelAssignsToProduct',
        [RelationshipType.ReferencedInSpatialStructure]: 'IfcRelReferencedInSpatialStructure',
    };
    return names[type] || 'Unknown';
}
//# sourceMappingURL=relationship-graph.js.map