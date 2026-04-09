/**
 * Get all attribute names for an IFC entity type in STEP positional order.
 * Walks the inheritance chain (root → leaf) via the generated schema registry.
 */
export declare function getAttributeNames(type: string): string[];
/**
 * Check if a type is known in the IFC schema.
 */
export declare function isKnownType(type: string): boolean;
/**
 * Get attribute name at a specific index for a type.
 */
export declare function getAttributeNameAt(type: string, index: number): string | null;
//# sourceMappingURL=ifc-schema.d.ts.map