/**
 * Material Extractor
 *
 * Extracts IFC material definitions and associations.
 *
 * Material concepts in IFC:
 * - IfcMaterial: Basic material (concrete, steel, wood, etc.)
 * - IfcMaterialLayer: Material with thickness (e.g., in walls)
 * - IfcMaterialLayerSet: Set of layers (e.g., multi-layer wall)
 * - IfcMaterialProfile: Material with profile shape
 * - IfcMaterialProfileSet: Set of profiles (e.g., structural members)
 * - IfcMaterialConstituent: Material as part of a composite
 * - IfcMaterialConstituentSet: Set of constituents
 * - IfcRelAssociatesMaterial: Associates materials with elements
 */
import type { IfcEntity } from './entity-extractor';
export interface Material {
    id: number;
    name: string;
    description?: string;
    category?: string;
}
export interface MaterialLayer {
    id: number;
    material: number;
    thickness: number;
    isVentilated?: boolean;
    name?: string;
    description?: string;
    category?: string;
    priority?: number;
}
export interface MaterialLayerSet {
    id: number;
    name?: string;
    description?: string;
    layers: number[];
    totalThickness?: number;
}
export interface MaterialProfile {
    id: number;
    name?: string;
    description?: string;
    material?: number;
    profile?: number;
    priority?: number;
    category?: string;
}
export interface MaterialProfileSet {
    id: number;
    name?: string;
    description?: string;
    profiles: number[];
}
export interface MaterialConstituent {
    id: number;
    name?: string;
    description?: string;
    material: number;
    fraction?: number;
    category?: string;
}
export interface MaterialConstituentSet {
    id: number;
    name?: string;
    description?: string;
    constituents: number[];
}
export interface MaterialAssociation {
    relationshipId: number;
    relatingMaterialId: number;
    materialType: 'Material' | 'LayerSet' | 'ProfileSet' | 'ConstituentSet';
    relatedObjects: number[];
}
export interface MaterialsData {
    materials: Map<number, Material>;
    materialLayers: Map<number, MaterialLayer>;
    materialLayerSets: Map<number, MaterialLayerSet>;
    materialProfiles: Map<number, MaterialProfile>;
    materialProfileSets: Map<number, MaterialProfileSet>;
    materialConstituents: Map<number, MaterialConstituent>;
    materialConstituentSets: Map<number, MaterialConstituentSet>;
    associations: MaterialAssociation[];
}
/**
 * Extract materials from IFC entities
 */
export declare function extractMaterials(entities: Map<number, IfcEntity>, entitiesByType: Map<string, number[]>): MaterialsData;
/**
 * Get material for an element
 */
export declare function getMaterialForElement(elementId: number, materialsData: MaterialsData): number | undefined;
/**
 * Get material name for an element
 */
export declare function getMaterialNameForElement(elementId: number, materialsData: MaterialsData): string | undefined;
//# sourceMappingURL=material-extractor.d.ts.map