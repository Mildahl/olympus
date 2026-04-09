/**
 * Spatial hierarchy builder - builds project/building/storey tree
 */
import type { EntityTable, StringTable, RelationshipGraph, SpatialHierarchy } from '@ifc-lite/data';
import type { EntityRef } from './types.js';
export declare class SpatialHierarchyBuilder {
    /**
     * Build spatial hierarchy from entities and relationships
     *
     * @param lengthUnitScale - Scale factor to convert IFC length values to meters (e.g., 0.001 for millimeters)
     */
    build(entities: EntityTable, relationships: RelationshipGraph, strings: StringTable, source: Uint8Array, entityIndex: {
        byId: {
            get(expressId: number): EntityRef | undefined;
        };
    }, lengthUnitScale?: number): SpatialHierarchy;
    private buildNode;
    /**
     * Extract elevation from IfcBuildingStorey entity
     * Elevation is at attribute index 9 in IFC4 (after GlobalId, OwnerHistory, Name, Description, ObjectType, ObjectPlacement, Representation, LongName, CompositionType)
     */
    private extractElevation;
}
//# sourceMappingURL=spatial-hierarchy-builder.d.ts.map