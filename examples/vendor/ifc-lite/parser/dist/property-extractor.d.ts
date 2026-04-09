/**
 * Property extractor - extracts PropertySets and their values
 */
import type { IfcEntity, PropertySet } from './types.js';
export declare class PropertyExtractor {
    private entities;
    constructor(entities: Map<number, IfcEntity>);
    /**
     * Extract all PropertySets from entities (async version with yields)
     */
    extractPropertySetsAsync(): Promise<Map<number, PropertySet>>;
    /**
     * Extract all PropertySets from entities (sync version for backward compatibility)
     */
    extractPropertySets(): Map<number, PropertySet>;
    /**
     * Extract PropertySet from entity
     */
    private extractPropertySet;
    /**
     * Extract property from IfcProperty entity
     */
    private extractProperty;
    private parsePropertyValue;
    private getAttributeValue;
}
//# sourceMappingURL=property-extractor.d.ts.map