/**
 * Default material colors for IFC entity types
 * Provides beautiful architectural colors when IFC surface styles are not available
 */
export interface MaterialColor {
    baseColor: [number, number, number, number];
    metallic: number;
    roughness: number;
}
/**
 * Default material palette inspired by architectural visualization
 */
export declare const DEFAULT_MATERIALS: Record<string, MaterialColor>;
/**
 * Get default material color for an IFC entity type
 */
export declare function getDefaultMaterialColor(entityType: string | null | undefined): MaterialColor;
/**
 * Get default color array for an IFC entity type (for backward compatibility)
 */
export declare function getDefaultColor(entityType: string | null | undefined): [number, number, number, number];
//# sourceMappingURL=default-materials.d.ts.map