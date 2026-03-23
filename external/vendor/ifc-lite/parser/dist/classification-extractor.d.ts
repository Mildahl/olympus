/**
 * Classification Extractor
 *
 * Extracts IFC classification information.
 *
 * Classification systems in IFC:
 * - IfcClassification: The classification system itself (e.g., Uniclass, Omniclass, MasterFormat)
 * - IfcClassificationReference: Reference to a specific class in the system
 * - IfcRelAssociatesClassification: Associates classifications with elements
 *
 * Common classification systems:
 * - Uniclass 2015 (UK)
 * - Omniclass (North America)
 * - MasterFormat (North America)
 * - Uniformat (North America)
 * - DIN 276 (Germany)
 * - SfB (Sweden/Denmark)
 */
import type { IfcEntity } from './entity-extractor';
export interface Classification {
    id: number;
    name: string;
    source?: string;
    edition?: string;
    editionDate?: string;
    description?: string;
    location?: string;
    referenceTokens?: string[];
}
export interface ClassificationReference {
    id: number;
    location?: string;
    identification?: string;
    name?: string;
    referencedSource?: number;
    description?: string;
    sort?: string;
}
export interface ClassificationAssociation {
    relationshipId: number;
    classificationId: number;
    relatedObjects: number[];
}
export interface ClassificationsData {
    classifications: Map<number, Classification>;
    classificationReferences: Map<number, ClassificationReference>;
    associations: ClassificationAssociation[];
}
/**
 * Extract classifications from IFC entities
 */
export declare function extractClassifications(entities: Map<number, IfcEntity>, entitiesByType: Map<string, number[]>): ClassificationsData;
/**
 * Get classifications for an element
 */
export declare function getClassificationsForElement(elementId: number, classificationsData: ClassificationsData): ClassificationReference[];
/**
 * Get classification code for an element (first classification found)
 */
export declare function getClassificationCodeForElement(elementId: number, classificationsData: ClassificationsData): string | undefined;
/**
 * Get full classification path (e.g., "Pr_60 > Pr_60_10 > Pr_60_10_32")
 */
export declare function getClassificationPath(classificationRefId: number, classificationsData: ClassificationsData): string[];
/**
 * Group elements by classification
 */
export declare function groupElementsByClassification(classificationsData: ClassificationsData): Map<string, number[]>;
/**
 * Get classification system name
 */
export declare function getClassificationSystemName(classificationRefId: number, classificationsData: ClassificationsData): string | undefined;
//# sourceMappingURL=classification-extractor.d.ts.map