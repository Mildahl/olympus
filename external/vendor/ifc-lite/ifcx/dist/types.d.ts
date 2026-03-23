/**
 * IFC5 (IFCX) type definitions
 * Based on buildingSMART IFC5-development schema
 */
export interface IfcxFile {
    header: IfcxHeader;
    imports: ImportNode[];
    schemas: Record<string, IfcxSchema>;
    data: IfcxNode[];
}
export interface IfcxHeader {
    id: string;
    ifcxVersion: string;
    dataVersion: string;
    author: string;
    timestamp: string;
}
export interface ImportNode {
    uri: string;
    integrity?: string;
}
export interface IfcxNode {
    path: string;
    children?: Record<string, string | null>;
    inherits?: Record<string, string | null>;
    attributes?: Record<string, unknown>;
}
export type DataType = 'Real' | 'Boolean' | 'Integer' | 'String' | 'DateTime' | 'Enum' | 'Array' | 'Object' | 'Reference' | 'Blob';
export interface EnumRestrictions {
    options: string[];
}
export interface ArrayRestrictions {
    min?: number;
    max?: number;
    value: IfcxValueDescription;
}
export interface ObjectRestrictions {
    values: Record<string, IfcxValueDescription>;
}
export interface IfcxValueDescription {
    dataType: DataType;
    optional?: boolean;
    inherits?: string[];
    quantityKind?: string;
    enumRestrictions?: EnumRestrictions;
    arrayRestrictions?: ArrayRestrictions;
    objectRestrictions?: ObjectRestrictions;
}
export interface IfcxSchema {
    uri?: string;
    value: IfcxValueDescription;
}
export interface ComposedNode {
    path: string;
    attributes: Map<string, unknown>;
    children: Map<string, ComposedNode>;
}
/**
 * Well-known attribute namespaces used in IFCX files.
 * These are considered stable and safe to implement.
 */
export declare const ATTR: {
    readonly CLASS: "bsi::ifc::class";
    readonly MESH: "usd::usdgeom::mesh";
    readonly TRANSFORM: "usd::xformop";
    readonly VISIBILITY: "usd::usdgeom::visibility";
    readonly DIFFUSE_COLOR: "bsi::ifc::presentation::diffuseColor";
    readonly OPACITY: "bsi::ifc::presentation::opacity";
    readonly MATERIAL: "bsi::ifc::material";
    readonly PROP_PREFIX: "bsi::ifc::prop::";
    readonly SPACE_BOUNDARY: "bsi::ifc::spaceBoundary";
};
export interface UsdMesh {
    points: number[][];
    faceVertexIndices: number[];
    faceVertexCounts?: number[];
    normals?: number[][];
}
export interface UsdTransform {
    transform: number[][];
}
export interface IfcClass {
    code: string;
    uri: string;
}
export declare const SPATIAL_TYPES: Set<string>;
export declare const BUILDING_ELEMENT_TYPES: Set<string>;
//# sourceMappingURL=types.d.ts.map