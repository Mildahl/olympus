/**
 * Core types for IFC parsing
 */
export interface EntityRef {
    expressId: number;
    type: string;
    byteOffset: number;
    byteLength: number;
    lineNumber: number;
}
export interface EntityIndex {
    byId: Map<number, EntityRef>;
    byType: Map<string, number[]>;
}
/**
 * IFC attribute value - can be primitive, reference, or nested list
 * Uses `unknown` for runtime type checking in extractors
 */
export type IfcAttributeValue = string | number | boolean | null | IfcAttributeValue[];
export interface IfcEntity {
    expressId: number;
    type: string;
    attributes: IfcAttributeValue[];
}
export interface PropertyValue {
    type: 'string' | 'number' | 'boolean' | 'null' | 'reference';
    value: string | number | boolean | null | number;
}
export interface PropertySet {
    name: string;
    properties: Map<string, PropertyValue>;
}
export interface Relationship {
    type: string;
    relatingObject: number;
    relatedObjects: number[];
    attributes?: Record<string, any>;
}
export interface ParseResult {
    entities: Map<number, IfcEntity>;
    propertySets: Map<number, PropertySet>;
    relationships: Relationship[];
    entityIndex: EntityIndex;
    fileSize: number;
    entityCount: number;
}
//# sourceMappingURL=types.d.ts.map