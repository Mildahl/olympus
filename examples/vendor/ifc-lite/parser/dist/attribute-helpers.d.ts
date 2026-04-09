/**
 * Shared helpers for extracting typed values from IFC entity attributes.
 * Used across material, georef, and classification extractors.
 */
export declare function getString(value: unknown): string | undefined;
export declare function getNumber(value: unknown): number | undefined;
export declare function getBoolean(value: unknown): boolean | undefined;
export declare function getReference(value: unknown): number | undefined;
export declare function getReferences(value: unknown): number[] | undefined;
export declare function getStringList(value: unknown): string[] | undefined;
//# sourceMappingURL=attribute-helpers.d.ts.map