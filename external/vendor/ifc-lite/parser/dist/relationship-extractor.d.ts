/**
 * Relationship extractor - extracts spatial structure and other relationships
 */
import type { IfcEntity, Relationship } from './types.js';
export declare class RelationshipExtractor {
    private entities;
    constructor(entities: Map<number, IfcEntity>);
    /**
     * Extract all relationships (async version with yields for large files)
     */
    extractRelationshipsAsync(): Promise<Relationship[]>;
    /**
     * Extract all relationships (sync version for backward compatibility)
     */
    extractRelationships(): Relationship[];
    /**
     * Extract relationship from entity
     */
    private extractRelationship;
    private getAttributeValue;
}
//# sourceMappingURL=relationship-extractor.d.ts.map