/**
 * Core types for columnar data structures
 */
export declare enum IfcTypeEnum {
    IfcProject = 1,
    IfcSite = 2,
    IfcBuilding = 3,
    IfcBuildingStorey = 4,
    IfcSpace = 5,
    IfcWall = 10,
    IfcWallStandardCase = 11,
    IfcDoor = 12,
    IfcWindow = 13,
    IfcSlab = 14,
    IfcColumn = 15,
    IfcBeam = 16,
    IfcStair = 17,
    IfcRamp = 18,
    IfcRoof = 19,
    IfcCovering = 20,
    IfcCurtainWall = 21,
    IfcRailing = 22,
    IfcPile = 23,
    IfcMember = 24,
    IfcPlate = 25,
    IfcFooting = 26,
    IfcBuildingElementProxy = 27,
    IfcStairFlight = 28,
    IfcRampFlight = 29,
    IfcChimney = 31,
    IfcShadingDevice = 32,
    IfcBuildingElementPart = 33,
    IfcOpeningElement = 30,
    IfcElementAssembly = 34,
    IfcReinforcingBar = 35,
    IfcReinforcingMesh = 36,
    IfcTendon = 37,
    IfcDiscreteAccessory = 38,
    IfcMechanicalFastener = 39,
    IfcDistributionElement = 40,
    IfcFlowTerminal = 41,
    IfcFlowSegment = 42,
    IfcFlowFitting = 43,
    IfcFlowController = 44,
    IfcFlowMovingDevice = 45,
    IfcFlowStorageDevice = 46,
    IfcFlowTreatmentDevice = 47,
    IfcEnergyConversionDevice = 48,
    IfcDuctSegment = 49,
    IfcPipeSegment = 50,
    IfcCableSegment = 51,
    IfcFurnishingElement = 52,
    IfcFurniture = 53,
    IfcProxy = 54,
    IfcAnnotation = 55,
    IfcTransportElement = 56,
    IfcCivilElement = 57,
    IfcGeographicElement = 58,
    IfcRelContainedInSpatialStructure = 100,
    IfcRelAggregates = 101,
    IfcRelDefinesByProperties = 102,
    IfcRelDefinesByType = 103,
    IfcRelAssociatesMaterial = 104,
    IfcRelAssociatesClassification = 105,
    IfcRelVoidsElement = 106,
    IfcRelFillsElement = 107,
    IfcRelConnectsPathElements = 108,
    IfcRelSpaceBoundary = 109,
    IfcPropertySet = 200,
    IfcPropertySingleValue = 201,
    IfcPropertyEnumeratedValue = 202,
    IfcPropertyBoundedValue = 203,
    IfcPropertyListValue = 204,
    IfcElementQuantity = 210,
    IfcQuantityLength = 211,
    IfcQuantityArea = 212,
    IfcQuantityVolume = 213,
    IfcQuantityCount = 214,
    IfcQuantityWeight = 215,
    IfcWallType = 300,
    IfcDoorType = 301,
    IfcWindowType = 302,
    IfcSlabType = 303,
    IfcColumnType = 304,
    IfcBeamType = 305,
    IfcPileType = 306,
    IfcMemberType = 307,
    IfcPlateType = 308,
    IfcFootingType = 309,
    IfcCoveringType = 310,
    IfcRailingType = 311,
    IfcStairType = 312,
    IfcRampType = 313,
    IfcRoofType = 314,
    IfcCurtainWallType = 315,
    IfcBuildingElementProxyType = 316,
    Unknown = 9999
}
export declare enum PropertyValueType {
    String = 0,
    Real = 1,
    Integer = 2,
    Boolean = 3,
    Logical = 4,
    Label = 5,
    Identifier = 6,
    Text = 7,
    Enum = 8,
    Reference = 9,
    List = 10
}
export declare enum QuantityType {
    Length = 0,
    Area = 1,
    Volume = 2,
    Count = 3,
    Weight = 4,
    Time = 5
}
export declare enum RelationshipType {
    ContainsElements = 1,
    Aggregates = 2,
    DefinesByProperties = 10,
    DefinesByType = 11,
    AssociatesMaterial = 20,
    AssociatesClassification = 30,
    AssociatesDocument = 31,
    ConnectsPathElements = 40,
    FillsElement = 41,
    VoidsElement = 42,
    ConnectsElements = 43,
    SpaceBoundary = 50,
    AssignsToGroup = 60,
    AssignsToProduct = 61,
    ReferencedInSpatialStructure = 70
}
export declare enum EntityFlags {
    HAS_GEOMETRY = 1,
    HAS_PROPERTIES = 2,
    HAS_QUANTITIES = 4,
    IS_TYPE = 8,
    IS_EXTERNAL = 16,
    HAS_OPENINGS = 32,
    IS_FILLING = 64
}
export interface SpatialNode {
    expressId: number;
    type: IfcTypeEnum;
    name: string;
    elevation?: number;
    children: SpatialNode[];
    elements: number[];
}
export interface SpatialHierarchy {
    project: SpatialNode;
    byStorey: Map<number, number[]>;
    byBuilding: Map<number, number[]>;
    bySite: Map<number, number[]>;
    bySpace: Map<number, number[]>;
    storeyElevations: Map<number, number>;
    storeyHeights: Map<number, number>;
    elementToStorey: Map<number, number>;
    getStoreyElements(storeyId: number): number[];
    getStoreyByElevation(z: number): number | null;
    getContainingSpace(elementId: number): number | null;
    getPath(elementId: number): SpatialNode[];
}
export declare function IfcTypeEnumFromString(str: string): IfcTypeEnum;
export declare function IfcTypeEnumToString(type: IfcTypeEnum): string;
//# sourceMappingURL=types.d.ts.map