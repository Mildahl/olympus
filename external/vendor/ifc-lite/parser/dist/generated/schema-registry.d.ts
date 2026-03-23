/**
 * IFC Schema Registry
 * Generated from EXPRESS schema: IFC4_ADD2_TC1
 *
 * Runtime metadata for IFC entities, types, and relationships.
 *
 * DO NOT EDIT - This file is auto-generated
 */
export interface EntityMetadata {
    name: string;
    isAbstract: boolean;
    parent?: string;
    attributes: AttributeMetadata[];
    allAttributes?: AttributeMetadata[];
    inheritanceChain?: string[];
}
export interface AttributeMetadata {
    name: string;
    type: string;
    optional: boolean;
    isArray: boolean;
    isList: boolean;
    isSet: boolean;
    arrayBounds?: [number, number];
}
export interface SchemaRegistry {
    name: string;
    entities: Record<string, EntityMetadata>;
    types: Record<string, string>;
    enums: Record<string, string[]>;
    selects: Record<string, string[]>;
}
export declare const SCHEMA_REGISTRY: SchemaRegistry;
/**
 * Get entity metadata by name (case-insensitive)
 */
export declare function getEntityMetadata(typeName: string): EntityMetadata | undefined;
/**
 * Get all attributes for an entity (including inherited)
 */
export declare function getAllAttributesForEntity(typeName: string): AttributeMetadata[];
/**
 * Get inheritance chain for an entity
 */
export declare function getInheritanceChainForEntity(typeName: string): string[];
/**
 * Check if a type is a known entity
 */
export declare function isKnownEntity(typeName: string): boolean;
//# sourceMappingURL=schema-registry.d.ts.map