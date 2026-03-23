/**
 * Style extractor - extracts IfcSurfaceStyle and related appearance entities
 */
import type { IfcEntity, EntityIndex } from './types.js';
export interface IFCMaterial {
    baseColor: [number, number, number, number];
    metallic: number;
    roughness: number;
    transparency: number;
    reflectanceMethod?: 'BLINN' | 'PHONG' | 'METAL' | 'GLASS' | 'MATT' | 'PLASTIC' | 'STRAUSS' | 'MIRROR';
    specularColor?: [number, number, number];
    specularHighlight?: number;
    doubleSided: boolean;
    alphaMode: 'opaque' | 'mask' | 'blend';
}
export interface StyleMapping {
    geometryExpressId: number;
    material: IFCMaterial;
}
/**
 * Extract IFC surface styles and create material mappings
 */
export declare class StyleExtractor {
    private entities;
    constructor(entities: Map<number, IfcEntity>, _entityIndex: EntityIndex);
    /**
     * Extract all style mappings from IFC entities
     */
    extractStyles(): Map<number, IFCMaterial>;
    /**
     * Extract material from IfcStyledItem
     */
    private extractMaterialFromStyledItem;
    /**
     * Extract material from IfcPresentationStyleAssignment
     */
    private extractMaterialFromStyleAssignment;
    /**
     * Extract material from IfcSurfaceStyle
     */
    private extractMaterialFromSurfaceStyle;
    /**
     * Extract material from IfcSurfaceStyleRendering
     */
    private extractMaterialFromRendering;
    /**
     * Extract material from IfcSurfaceStyleShading (simpler fallback)
     */
    private extractMaterialFromShading;
    /**
     * Extract RGB color from IfcColourRgb
     */
    private extractColorRgb;
    /**
     * Extract transparency value
     */
    private extractTransparency;
    /**
     * Extract specular highlight value
     */
    private extractSpecularHighlight;
    /**
     * Extract reflectance method enum
     */
    private extractReflectanceMethod;
    /**
     * Map IFC reflectance method to PBR metallic/roughness
     */
    private mapReflectanceToPBR;
    /**
     * Find entities by type name (case-insensitive)
     */
    private findEntitiesByType;
    /**
     * Get attribute value from entity
     */
    private getAttributeValue;
    /**
     * Get numeric value from entity attribute
     * Also handles TypedValue wrappers like [typeName, numericValue]
     */
    private getNumericValue;
}
//# sourceMappingURL=style-extractor.d.ts.map