/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
export class RelationshipExtractor {
    entities;
    constructor(entities) {
        this.entities = entities;
    }
    /**
     * Extract all relationships (async version with yields for large files)
     */
    async extractRelationshipsAsync() {
        const relationships = [];
        const typeCounts = new Map();
        let processed = 0;
        for (const [, entity] of this.entities) {
            const typeUpper = entity.type.toUpperCase();
            if (typeUpper.startsWith('IFCREL')) {
                typeCounts.set(typeUpper, (typeCounts.get(typeUpper) || 0) + 1);
            }
            const rel = this.extractRelationship(entity);
            if (rel) {
                relationships.push(rel);
            }
            processed++;
            // Yield to event loop every 2000 entities to prevent blocking
            if (processed % 2000 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        console.log('[RelationshipExtractor] Relationship type counts:', Object.fromEntries(typeCounts));
        console.log('[RelationshipExtractor] Successfully extracted:', relationships.length);
        return relationships;
    }
    /**
     * Extract all relationships (sync version for backward compatibility)
     */
    extractRelationships() {
        const relationships = [];
        const typeCounts = new Map();
        for (const [, entity] of this.entities) {
            const typeUpper = entity.type.toUpperCase();
            if (typeUpper.startsWith('IFCREL')) {
                typeCounts.set(typeUpper, (typeCounts.get(typeUpper) || 0) + 1);
            }
            const rel = this.extractRelationship(entity);
            if (rel) {
                relationships.push(rel);
            }
        }
        console.log('[RelationshipExtractor] Relationship type counts:', Object.fromEntries(typeCounts));
        console.log('[RelationshipExtractor] Successfully extracted:', relationships.length);
        return relationships;
    }
    /**
     * Extract relationship from entity
     */
    extractRelationship(entity) {
        // IFC entity types may be uppercase or mixed case
        const entityTypeUpper = entity.type.toUpperCase();
        const relTypes = [
            'IFCRELCONTAINEDINSPATIALSTRUCTURE',
            'IFCRELAGGREGATES',
            'IFCRELDEFINESBYPROPERTIES',
            'IFCRELDEFINESBYTYPE',
            'IFCRELASSOCIATESMATERIAL',
            'IFCRELVOIDSELEMENT',
            'IFCRELFILLSELEMENT',
        ];
        if (!relTypes.includes(entityTypeUpper)) {
            return null;
        }
        try {
            // IFC relationship attribute order varies by type:
            // IfcRelDefinesByProperties: RelatedObjects (4), RelatingPropertyDefinition (5)
            // IfcRelAggregates: RelatingObject (4), RelatedObjects (5)
            // IfcRelContainedInSpatialStructure: RelatedElements (4), RelatingStructure (5)
            let relatingObject;
            let relatedObjects;
            if (entityTypeUpper === 'IFCRELDEFINESBYPROPERTIES') {
                // RelatedObjects at 4, RelatingPropertyDefinition at 5
                relatedObjects = this.getAttributeValue(entity, 4);
                relatingObject = this.getAttributeValue(entity, 5);
            }
            else if (entityTypeUpper === 'IFCRELCONTAINEDINSPATIALSTRUCTURE') {
                // RelatedElements at 4, RelatingStructure at 5
                relatedObjects = this.getAttributeValue(entity, 4);
                relatingObject = this.getAttributeValue(entity, 5);
            }
            else {
                // Standard: RelatingObject at 4, RelatedObjects at 5
                relatingObject = this.getAttributeValue(entity, 4);
                relatedObjects = this.getAttributeValue(entity, 5);
            }
            if (relatingObject === null || typeof relatingObject !== 'number' || !Array.isArray(relatedObjects)) {
                return null;
            }
            return {
                type: entity.type,
                relatingObject: relatingObject,
                relatedObjects: relatedObjects.filter((id) => typeof id === 'number'),
            };
        }
        catch (error) {
            console.warn(`Failed to extract relationship #${entity.expressId}:`, error);
            return null;
        }
    }
    getAttributeValue(entity, index) {
        if (index < 0 || index >= entity.attributes.length) {
            return null;
        }
        return entity.attributes[index];
    }
}
//# sourceMappingURL=relationship-extractor.js.map