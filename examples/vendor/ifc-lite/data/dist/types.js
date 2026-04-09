/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
/**
 * Core types for columnar data structures
 */
export var IfcTypeEnum;
(function (IfcTypeEnum) {
    // Spatial structure
    IfcTypeEnum[IfcTypeEnum["IfcProject"] = 1] = "IfcProject";
    IfcTypeEnum[IfcTypeEnum["IfcSite"] = 2] = "IfcSite";
    IfcTypeEnum[IfcTypeEnum["IfcBuilding"] = 3] = "IfcBuilding";
    IfcTypeEnum[IfcTypeEnum["IfcBuildingStorey"] = 4] = "IfcBuildingStorey";
    IfcTypeEnum[IfcTypeEnum["IfcSpace"] = 5] = "IfcSpace";
    // Building elements
    IfcTypeEnum[IfcTypeEnum["IfcWall"] = 10] = "IfcWall";
    IfcTypeEnum[IfcTypeEnum["IfcWallStandardCase"] = 11] = "IfcWallStandardCase";
    IfcTypeEnum[IfcTypeEnum["IfcDoor"] = 12] = "IfcDoor";
    IfcTypeEnum[IfcTypeEnum["IfcWindow"] = 13] = "IfcWindow";
    IfcTypeEnum[IfcTypeEnum["IfcSlab"] = 14] = "IfcSlab";
    IfcTypeEnum[IfcTypeEnum["IfcColumn"] = 15] = "IfcColumn";
    IfcTypeEnum[IfcTypeEnum["IfcBeam"] = 16] = "IfcBeam";
    IfcTypeEnum[IfcTypeEnum["IfcStair"] = 17] = "IfcStair";
    IfcTypeEnum[IfcTypeEnum["IfcRamp"] = 18] = "IfcRamp";
    IfcTypeEnum[IfcTypeEnum["IfcRoof"] = 19] = "IfcRoof";
    IfcTypeEnum[IfcTypeEnum["IfcCovering"] = 20] = "IfcCovering";
    IfcTypeEnum[IfcTypeEnum["IfcCurtainWall"] = 21] = "IfcCurtainWall";
    IfcTypeEnum[IfcTypeEnum["IfcRailing"] = 22] = "IfcRailing";
    IfcTypeEnum[IfcTypeEnum["IfcPile"] = 23] = "IfcPile";
    IfcTypeEnum[IfcTypeEnum["IfcMember"] = 24] = "IfcMember";
    IfcTypeEnum[IfcTypeEnum["IfcPlate"] = 25] = "IfcPlate";
    IfcTypeEnum[IfcTypeEnum["IfcFooting"] = 26] = "IfcFooting";
    IfcTypeEnum[IfcTypeEnum["IfcBuildingElementProxy"] = 27] = "IfcBuildingElementProxy";
    IfcTypeEnum[IfcTypeEnum["IfcStairFlight"] = 28] = "IfcStairFlight";
    IfcTypeEnum[IfcTypeEnum["IfcRampFlight"] = 29] = "IfcRampFlight";
    IfcTypeEnum[IfcTypeEnum["IfcChimney"] = 31] = "IfcChimney";
    IfcTypeEnum[IfcTypeEnum["IfcShadingDevice"] = 32] = "IfcShadingDevice";
    IfcTypeEnum[IfcTypeEnum["IfcBuildingElementPart"] = 33] = "IfcBuildingElementPart";
    // Openings
    IfcTypeEnum[IfcTypeEnum["IfcOpeningElement"] = 30] = "IfcOpeningElement";
    // Assemblies and structural
    IfcTypeEnum[IfcTypeEnum["IfcElementAssembly"] = 34] = "IfcElementAssembly";
    IfcTypeEnum[IfcTypeEnum["IfcReinforcingBar"] = 35] = "IfcReinforcingBar";
    IfcTypeEnum[IfcTypeEnum["IfcReinforcingMesh"] = 36] = "IfcReinforcingMesh";
    IfcTypeEnum[IfcTypeEnum["IfcTendon"] = 37] = "IfcTendon";
    IfcTypeEnum[IfcTypeEnum["IfcDiscreteAccessory"] = 38] = "IfcDiscreteAccessory";
    IfcTypeEnum[IfcTypeEnum["IfcMechanicalFastener"] = 39] = "IfcMechanicalFastener";
    // MEP
    IfcTypeEnum[IfcTypeEnum["IfcDistributionElement"] = 40] = "IfcDistributionElement";
    IfcTypeEnum[IfcTypeEnum["IfcFlowTerminal"] = 41] = "IfcFlowTerminal";
    IfcTypeEnum[IfcTypeEnum["IfcFlowSegment"] = 42] = "IfcFlowSegment";
    IfcTypeEnum[IfcTypeEnum["IfcFlowFitting"] = 43] = "IfcFlowFitting";
    IfcTypeEnum[IfcTypeEnum["IfcFlowController"] = 44] = "IfcFlowController";
    IfcTypeEnum[IfcTypeEnum["IfcFlowMovingDevice"] = 45] = "IfcFlowMovingDevice";
    IfcTypeEnum[IfcTypeEnum["IfcFlowStorageDevice"] = 46] = "IfcFlowStorageDevice";
    IfcTypeEnum[IfcTypeEnum["IfcFlowTreatmentDevice"] = 47] = "IfcFlowTreatmentDevice";
    IfcTypeEnum[IfcTypeEnum["IfcEnergyConversionDevice"] = 48] = "IfcEnergyConversionDevice";
    IfcTypeEnum[IfcTypeEnum["IfcDuctSegment"] = 49] = "IfcDuctSegment";
    IfcTypeEnum[IfcTypeEnum["IfcPipeSegment"] = 50] = "IfcPipeSegment";
    IfcTypeEnum[IfcTypeEnum["IfcCableSegment"] = 51] = "IfcCableSegment";
    // Furnishing
    IfcTypeEnum[IfcTypeEnum["IfcFurnishingElement"] = 52] = "IfcFurnishingElement";
    IfcTypeEnum[IfcTypeEnum["IfcFurniture"] = 53] = "IfcFurniture";
    // Other product types
    IfcTypeEnum[IfcTypeEnum["IfcProxy"] = 54] = "IfcProxy";
    IfcTypeEnum[IfcTypeEnum["IfcAnnotation"] = 55] = "IfcAnnotation";
    IfcTypeEnum[IfcTypeEnum["IfcTransportElement"] = 56] = "IfcTransportElement";
    IfcTypeEnum[IfcTypeEnum["IfcCivilElement"] = 57] = "IfcCivilElement";
    IfcTypeEnum[IfcTypeEnum["IfcGeographicElement"] = 58] = "IfcGeographicElement";
    // Relationships
    IfcTypeEnum[IfcTypeEnum["IfcRelContainedInSpatialStructure"] = 100] = "IfcRelContainedInSpatialStructure";
    IfcTypeEnum[IfcTypeEnum["IfcRelAggregates"] = 101] = "IfcRelAggregates";
    IfcTypeEnum[IfcTypeEnum["IfcRelDefinesByProperties"] = 102] = "IfcRelDefinesByProperties";
    IfcTypeEnum[IfcTypeEnum["IfcRelDefinesByType"] = 103] = "IfcRelDefinesByType";
    IfcTypeEnum[IfcTypeEnum["IfcRelAssociatesMaterial"] = 104] = "IfcRelAssociatesMaterial";
    IfcTypeEnum[IfcTypeEnum["IfcRelAssociatesClassification"] = 105] = "IfcRelAssociatesClassification";
    IfcTypeEnum[IfcTypeEnum["IfcRelVoidsElement"] = 106] = "IfcRelVoidsElement";
    IfcTypeEnum[IfcTypeEnum["IfcRelFillsElement"] = 107] = "IfcRelFillsElement";
    IfcTypeEnum[IfcTypeEnum["IfcRelConnectsPathElements"] = 108] = "IfcRelConnectsPathElements";
    IfcTypeEnum[IfcTypeEnum["IfcRelSpaceBoundary"] = 109] = "IfcRelSpaceBoundary";
    // Property definitions
    IfcTypeEnum[IfcTypeEnum["IfcPropertySet"] = 200] = "IfcPropertySet";
    IfcTypeEnum[IfcTypeEnum["IfcPropertySingleValue"] = 201] = "IfcPropertySingleValue";
    IfcTypeEnum[IfcTypeEnum["IfcPropertyEnumeratedValue"] = 202] = "IfcPropertyEnumeratedValue";
    IfcTypeEnum[IfcTypeEnum["IfcPropertyBoundedValue"] = 203] = "IfcPropertyBoundedValue";
    IfcTypeEnum[IfcTypeEnum["IfcPropertyListValue"] = 204] = "IfcPropertyListValue";
    IfcTypeEnum[IfcTypeEnum["IfcElementQuantity"] = 210] = "IfcElementQuantity";
    IfcTypeEnum[IfcTypeEnum["IfcQuantityLength"] = 211] = "IfcQuantityLength";
    IfcTypeEnum[IfcTypeEnum["IfcQuantityArea"] = 212] = "IfcQuantityArea";
    IfcTypeEnum[IfcTypeEnum["IfcQuantityVolume"] = 213] = "IfcQuantityVolume";
    IfcTypeEnum[IfcTypeEnum["IfcQuantityCount"] = 214] = "IfcQuantityCount";
    IfcTypeEnum[IfcTypeEnum["IfcQuantityWeight"] = 215] = "IfcQuantityWeight";
    // Types
    IfcTypeEnum[IfcTypeEnum["IfcWallType"] = 300] = "IfcWallType";
    IfcTypeEnum[IfcTypeEnum["IfcDoorType"] = 301] = "IfcDoorType";
    IfcTypeEnum[IfcTypeEnum["IfcWindowType"] = 302] = "IfcWindowType";
    IfcTypeEnum[IfcTypeEnum["IfcSlabType"] = 303] = "IfcSlabType";
    IfcTypeEnum[IfcTypeEnum["IfcColumnType"] = 304] = "IfcColumnType";
    IfcTypeEnum[IfcTypeEnum["IfcBeamType"] = 305] = "IfcBeamType";
    IfcTypeEnum[IfcTypeEnum["IfcPileType"] = 306] = "IfcPileType";
    IfcTypeEnum[IfcTypeEnum["IfcMemberType"] = 307] = "IfcMemberType";
    IfcTypeEnum[IfcTypeEnum["IfcPlateType"] = 308] = "IfcPlateType";
    IfcTypeEnum[IfcTypeEnum["IfcFootingType"] = 309] = "IfcFootingType";
    IfcTypeEnum[IfcTypeEnum["IfcCoveringType"] = 310] = "IfcCoveringType";
    IfcTypeEnum[IfcTypeEnum["IfcRailingType"] = 311] = "IfcRailingType";
    IfcTypeEnum[IfcTypeEnum["IfcStairType"] = 312] = "IfcStairType";
    IfcTypeEnum[IfcTypeEnum["IfcRampType"] = 313] = "IfcRampType";
    IfcTypeEnum[IfcTypeEnum["IfcRoofType"] = 314] = "IfcRoofType";
    IfcTypeEnum[IfcTypeEnum["IfcCurtainWallType"] = 315] = "IfcCurtainWallType";
    IfcTypeEnum[IfcTypeEnum["IfcBuildingElementProxyType"] = 316] = "IfcBuildingElementProxyType";
    IfcTypeEnum[IfcTypeEnum["Unknown"] = 9999] = "Unknown";
})(IfcTypeEnum || (IfcTypeEnum = {}));
export var PropertyValueType;
(function (PropertyValueType) {
    PropertyValueType[PropertyValueType["String"] = 0] = "String";
    PropertyValueType[PropertyValueType["Real"] = 1] = "Real";
    PropertyValueType[PropertyValueType["Integer"] = 2] = "Integer";
    PropertyValueType[PropertyValueType["Boolean"] = 3] = "Boolean";
    PropertyValueType[PropertyValueType["Logical"] = 4] = "Logical";
    PropertyValueType[PropertyValueType["Label"] = 5] = "Label";
    PropertyValueType[PropertyValueType["Identifier"] = 6] = "Identifier";
    PropertyValueType[PropertyValueType["Text"] = 7] = "Text";
    PropertyValueType[PropertyValueType["Enum"] = 8] = "Enum";
    PropertyValueType[PropertyValueType["Reference"] = 9] = "Reference";
    PropertyValueType[PropertyValueType["List"] = 10] = "List";
})(PropertyValueType || (PropertyValueType = {}));
export var QuantityType;
(function (QuantityType) {
    QuantityType[QuantityType["Length"] = 0] = "Length";
    QuantityType[QuantityType["Area"] = 1] = "Area";
    QuantityType[QuantityType["Volume"] = 2] = "Volume";
    QuantityType[QuantityType["Count"] = 3] = "Count";
    QuantityType[QuantityType["Weight"] = 4] = "Weight";
    QuantityType[QuantityType["Time"] = 5] = "Time";
})(QuantityType || (QuantityType = {}));
export var RelationshipType;
(function (RelationshipType) {
    RelationshipType[RelationshipType["ContainsElements"] = 1] = "ContainsElements";
    RelationshipType[RelationshipType["Aggregates"] = 2] = "Aggregates";
    RelationshipType[RelationshipType["DefinesByProperties"] = 10] = "DefinesByProperties";
    RelationshipType[RelationshipType["DefinesByType"] = 11] = "DefinesByType";
    RelationshipType[RelationshipType["AssociatesMaterial"] = 20] = "AssociatesMaterial";
    RelationshipType[RelationshipType["AssociatesClassification"] = 30] = "AssociatesClassification";
    RelationshipType[RelationshipType["AssociatesDocument"] = 31] = "AssociatesDocument";
    RelationshipType[RelationshipType["ConnectsPathElements"] = 40] = "ConnectsPathElements";
    RelationshipType[RelationshipType["FillsElement"] = 41] = "FillsElement";
    RelationshipType[RelationshipType["VoidsElement"] = 42] = "VoidsElement";
    RelationshipType[RelationshipType["ConnectsElements"] = 43] = "ConnectsElements";
    RelationshipType[RelationshipType["SpaceBoundary"] = 50] = "SpaceBoundary";
    RelationshipType[RelationshipType["AssignsToGroup"] = 60] = "AssignsToGroup";
    RelationshipType[RelationshipType["AssignsToProduct"] = 61] = "AssignsToProduct";
    RelationshipType[RelationshipType["ReferencedInSpatialStructure"] = 70] = "ReferencedInSpatialStructure";
})(RelationshipType || (RelationshipType = {}));
export var EntityFlags;
(function (EntityFlags) {
    EntityFlags[EntityFlags["HAS_GEOMETRY"] = 1] = "HAS_GEOMETRY";
    EntityFlags[EntityFlags["HAS_PROPERTIES"] = 2] = "HAS_PROPERTIES";
    EntityFlags[EntityFlags["HAS_QUANTITIES"] = 4] = "HAS_QUANTITIES";
    EntityFlags[EntityFlags["IS_TYPE"] = 8] = "IS_TYPE";
    EntityFlags[EntityFlags["IS_EXTERNAL"] = 16] = "IS_EXTERNAL";
    EntityFlags[EntityFlags["HAS_OPENINGS"] = 32] = "HAS_OPENINGS";
    EntityFlags[EntityFlags["IS_FILLING"] = 64] = "IS_FILLING";
})(EntityFlags || (EntityFlags = {}));
// Type conversion helpers
const TYPE_STRING_TO_ENUM = new Map([
    // Spatial
    ['IFCPROJECT', IfcTypeEnum.IfcProject],
    ['IFCSITE', IfcTypeEnum.IfcSite],
    ['IFCBUILDING', IfcTypeEnum.IfcBuilding],
    ['IFCBUILDINGSTOREY', IfcTypeEnum.IfcBuildingStorey],
    ['IFCSPACE', IfcTypeEnum.IfcSpace],
    // Building elements
    ['IFCWALL', IfcTypeEnum.IfcWall],
    ['IFCWALLSTANDARDCASE', IfcTypeEnum.IfcWallStandardCase],
    ['IFCDOOR', IfcTypeEnum.IfcDoor],
    ['IFCDOORSTANDARDCASE', IfcTypeEnum.IfcDoor],
    ['IFCWINDOW', IfcTypeEnum.IfcWindow],
    ['IFCWINDOWSTANDARDCASE', IfcTypeEnum.IfcWindow],
    ['IFCSLAB', IfcTypeEnum.IfcSlab],
    ['IFCSLABSTANDARDCASE', IfcTypeEnum.IfcSlab],
    ['IFCCOLUMN', IfcTypeEnum.IfcColumn],
    ['IFCCOLUMNSTANDARDCASE', IfcTypeEnum.IfcColumn],
    ['IFCBEAM', IfcTypeEnum.IfcBeam],
    ['IFCBEAMSTANDARDCASE', IfcTypeEnum.IfcBeam],
    ['IFCSTAIR', IfcTypeEnum.IfcStair],
    ['IFCSTAIRFLIGHT', IfcTypeEnum.IfcStairFlight],
    ['IFCRAMP', IfcTypeEnum.IfcRamp],
    ['IFCRAMPFLIGHT', IfcTypeEnum.IfcRampFlight],
    ['IFCROOF', IfcTypeEnum.IfcRoof],
    ['IFCCOVERING', IfcTypeEnum.IfcCovering],
    ['IFCCURTAINWALL', IfcTypeEnum.IfcCurtainWall],
    ['IFCRAILING', IfcTypeEnum.IfcRailing],
    ['IFCPILE', IfcTypeEnum.IfcPile],
    ['IFCMEMBER', IfcTypeEnum.IfcMember],
    ['IFCMEMBERSTANDARDCASE', IfcTypeEnum.IfcMember],
    ['IFCPLATE', IfcTypeEnum.IfcPlate],
    ['IFCPLATESTANDARDCASE', IfcTypeEnum.IfcPlate],
    ['IFCFOOTING', IfcTypeEnum.IfcFooting],
    ['IFCBUILDINGELEMENTPROXY', IfcTypeEnum.IfcBuildingElementProxy],
    ['IFCCHIMNEY', IfcTypeEnum.IfcChimney],
    ['IFCSHADINGDEVICE', IfcTypeEnum.IfcShadingDevice],
    ['IFCBUILDINGELEMENTPART', IfcTypeEnum.IfcBuildingElementPart],
    // Openings
    ['IFCOPENINGELEMENT', IfcTypeEnum.IfcOpeningElement],
    ['IFCOPENINGSTANDARDCASE', IfcTypeEnum.IfcOpeningElement],
    // Assemblies and structural
    ['IFCELEMENTASSEMBLY', IfcTypeEnum.IfcElementAssembly],
    ['IFCREINFORCINGBAR', IfcTypeEnum.IfcReinforcingBar],
    ['IFCREINFORCINGMESH', IfcTypeEnum.IfcReinforcingMesh],
    ['IFCTENDON', IfcTypeEnum.IfcTendon],
    ['IFCTENDONANCHOR', IfcTypeEnum.IfcTendon],
    ['IFCDISCRETEACCESSORY', IfcTypeEnum.IfcDiscreteAccessory],
    ['IFCMECHANICALFASTENER', IfcTypeEnum.IfcMechanicalFastener],
    ['IFCFASTENER', IfcTypeEnum.IfcMechanicalFastener],
    // MEP
    ['IFCDISTRIBUTIONELEMENT', IfcTypeEnum.IfcDistributionElement],
    ['IFCDISTRIBUTIONFLOWELEMENT', IfcTypeEnum.IfcDistributionElement],
    ['IFCDISTRIBUTIONCONTROLELEMENT', IfcTypeEnum.IfcDistributionElement],
    ['IFCFLOWTERMINAL', IfcTypeEnum.IfcFlowTerminal],
    ['IFCFLOWSEGMENT', IfcTypeEnum.IfcFlowSegment],
    ['IFCFLOWFITTING', IfcTypeEnum.IfcFlowFitting],
    ['IFCFLOWCONTROLLER', IfcTypeEnum.IfcFlowController],
    ['IFCFLOWMOVINGDEVICE', IfcTypeEnum.IfcFlowMovingDevice],
    ['IFCFLOWSTORAGEDEVICE', IfcTypeEnum.IfcFlowStorageDevice],
    ['IFCFLOWTREATMENTDEVICE', IfcTypeEnum.IfcFlowTreatmentDevice],
    ['IFCENERGYCONVERSIONDEVICE', IfcTypeEnum.IfcEnergyConversionDevice],
    ['IFCDUCTSEGMENT', IfcTypeEnum.IfcDuctSegment],
    ['IFCPIPESEGMENT', IfcTypeEnum.IfcPipeSegment],
    ['IFCCABLESEGMENT', IfcTypeEnum.IfcCableSegment],
    ['IFCCABLECARRIERSEGMENT', IfcTypeEnum.IfcCableSegment],
    // Furnishing
    ['IFCFURNISHINGELEMENT', IfcTypeEnum.IfcFurnishingElement],
    ['IFCFURNITURE', IfcTypeEnum.IfcFurniture],
    // Other products
    ['IFCPROXY', IfcTypeEnum.IfcProxy],
    ['IFCANNOTATION', IfcTypeEnum.IfcAnnotation],
    ['IFCTRANSPORTELEMENT', IfcTypeEnum.IfcTransportElement],
    ['IFCCIVILELEMENT', IfcTypeEnum.IfcCivilElement],
    ['IFCGEOGRAPHICELEMENT', IfcTypeEnum.IfcGeographicElement],
    // Relationships
    ['IFCRELCONTAINEDINSPATIALSTRUCTURE', IfcTypeEnum.IfcRelContainedInSpatialStructure],
    ['IFCRELAGGREGATES', IfcTypeEnum.IfcRelAggregates],
    ['IFCRELDEFINESBYPROPERTIES', IfcTypeEnum.IfcRelDefinesByProperties],
    ['IFCRELDEFINESBYTYPE', IfcTypeEnum.IfcRelDefinesByType],
    ['IFCRELASSOCIATESMATERIAL', IfcTypeEnum.IfcRelAssociatesMaterial],
    ['IFCRELASSOCIATESCLASSIFICATION', IfcTypeEnum.IfcRelAssociatesClassification],
    ['IFCRELVOIDSELEMENT', IfcTypeEnum.IfcRelVoidsElement],
    ['IFCRELFILLSELEMENT', IfcTypeEnum.IfcRelFillsElement],
    ['IFCRELCONNECTSPATHELEMENTS', IfcTypeEnum.IfcRelConnectsPathElements],
    ['IFCRELSPACEBOUNDARY', IfcTypeEnum.IfcRelSpaceBoundary],
    // Properties
    ['IFCPROPERTYSET', IfcTypeEnum.IfcPropertySet],
    ['IFCPROPERTYSINGLEVALUE', IfcTypeEnum.IfcPropertySingleValue],
    ['IFCPROPERTYENUMERATEDVALUE', IfcTypeEnum.IfcPropertyEnumeratedValue],
    ['IFCPROPERTYBOUNDEDVALUE', IfcTypeEnum.IfcPropertyBoundedValue],
    ['IFCPROPERTYLISTVALUE', IfcTypeEnum.IfcPropertyListValue],
    ['IFCELEMENTQUANTITY', IfcTypeEnum.IfcElementQuantity],
    ['IFCQUANTITYLENGTH', IfcTypeEnum.IfcQuantityLength],
    ['IFCQUANTITYAREA', IfcTypeEnum.IfcQuantityArea],
    ['IFCQUANTITYVOLUME', IfcTypeEnum.IfcQuantityVolume],
    ['IFCQUANTITYCOUNT', IfcTypeEnum.IfcQuantityCount],
    ['IFCQUANTITYWEIGHT', IfcTypeEnum.IfcQuantityWeight],
    // Type definitions
    ['IFCWALLTYPE', IfcTypeEnum.IfcWallType],
    ['IFCDOORTYPE', IfcTypeEnum.IfcDoorType],
    ['IFCWINDOWTYPE', IfcTypeEnum.IfcWindowType],
    ['IFCSLABTYPE', IfcTypeEnum.IfcSlabType],
    ['IFCCOLUMNTYPE', IfcTypeEnum.IfcColumnType],
    ['IFCBEAMTYPE', IfcTypeEnum.IfcBeamType],
    ['IFCPILETYPE', IfcTypeEnum.IfcPileType],
    ['IFCMEMBERTYPE', IfcTypeEnum.IfcMemberType],
    ['IFCPLATETYPE', IfcTypeEnum.IfcPlateType],
    ['IFCFOOTINGTYPE', IfcTypeEnum.IfcFootingType],
    ['IFCCOVERINGTYPE', IfcTypeEnum.IfcCoveringType],
    ['IFCRAILINGTYPE', IfcTypeEnum.IfcRailingType],
    ['IFCSTAIRTYPE', IfcTypeEnum.IfcStairType],
    ['IFCRAMPTYPE', IfcTypeEnum.IfcRampType],
    ['IFCROOFTYPE', IfcTypeEnum.IfcRoofType],
    ['IFCCURTAINWALLTYPE', IfcTypeEnum.IfcCurtainWallType],
    ['IFCBUILDINGELEMENTPROXYTYPE', IfcTypeEnum.IfcBuildingElementProxyType],
]);
const TYPE_ENUM_TO_STRING = new Map([
    // Spatial
    [IfcTypeEnum.IfcProject, 'IfcProject'],
    [IfcTypeEnum.IfcSite, 'IfcSite'],
    [IfcTypeEnum.IfcBuilding, 'IfcBuilding'],
    [IfcTypeEnum.IfcBuildingStorey, 'IfcBuildingStorey'],
    [IfcTypeEnum.IfcSpace, 'IfcSpace'],
    // Building elements
    [IfcTypeEnum.IfcWall, 'IfcWall'],
    [IfcTypeEnum.IfcWallStandardCase, 'IfcWallStandardCase'],
    [IfcTypeEnum.IfcDoor, 'IfcDoor'],
    [IfcTypeEnum.IfcWindow, 'IfcWindow'],
    [IfcTypeEnum.IfcSlab, 'IfcSlab'],
    [IfcTypeEnum.IfcColumn, 'IfcColumn'],
    [IfcTypeEnum.IfcBeam, 'IfcBeam'],
    [IfcTypeEnum.IfcStair, 'IfcStair'],
    [IfcTypeEnum.IfcStairFlight, 'IfcStairFlight'],
    [IfcTypeEnum.IfcRamp, 'IfcRamp'],
    [IfcTypeEnum.IfcRampFlight, 'IfcRampFlight'],
    [IfcTypeEnum.IfcRoof, 'IfcRoof'],
    [IfcTypeEnum.IfcCovering, 'IfcCovering'],
    [IfcTypeEnum.IfcCurtainWall, 'IfcCurtainWall'],
    [IfcTypeEnum.IfcRailing, 'IfcRailing'],
    [IfcTypeEnum.IfcPile, 'IfcPile'],
    [IfcTypeEnum.IfcMember, 'IfcMember'],
    [IfcTypeEnum.IfcPlate, 'IfcPlate'],
    [IfcTypeEnum.IfcFooting, 'IfcFooting'],
    [IfcTypeEnum.IfcBuildingElementProxy, 'IfcBuildingElementProxy'],
    [IfcTypeEnum.IfcChimney, 'IfcChimney'],
    [IfcTypeEnum.IfcShadingDevice, 'IfcShadingDevice'],
    [IfcTypeEnum.IfcBuildingElementPart, 'IfcBuildingElementPart'],
    // Openings
    [IfcTypeEnum.IfcOpeningElement, 'IfcOpeningElement'],
    // Assemblies and structural
    [IfcTypeEnum.IfcElementAssembly, 'IfcElementAssembly'],
    [IfcTypeEnum.IfcReinforcingBar, 'IfcReinforcingBar'],
    [IfcTypeEnum.IfcReinforcingMesh, 'IfcReinforcingMesh'],
    [IfcTypeEnum.IfcTendon, 'IfcTendon'],
    [IfcTypeEnum.IfcDiscreteAccessory, 'IfcDiscreteAccessory'],
    [IfcTypeEnum.IfcMechanicalFastener, 'IfcMechanicalFastener'],
    // MEP
    [IfcTypeEnum.IfcDistributionElement, 'IfcDistributionElement'],
    [IfcTypeEnum.IfcFlowTerminal, 'IfcFlowTerminal'],
    [IfcTypeEnum.IfcFlowSegment, 'IfcFlowSegment'],
    [IfcTypeEnum.IfcFlowFitting, 'IfcFlowFitting'],
    [IfcTypeEnum.IfcFlowController, 'IfcFlowController'],
    [IfcTypeEnum.IfcFlowMovingDevice, 'IfcFlowMovingDevice'],
    [IfcTypeEnum.IfcFlowStorageDevice, 'IfcFlowStorageDevice'],
    [IfcTypeEnum.IfcFlowTreatmentDevice, 'IfcFlowTreatmentDevice'],
    [IfcTypeEnum.IfcEnergyConversionDevice, 'IfcEnergyConversionDevice'],
    [IfcTypeEnum.IfcDuctSegment, 'IfcDuctSegment'],
    [IfcTypeEnum.IfcPipeSegment, 'IfcPipeSegment'],
    [IfcTypeEnum.IfcCableSegment, 'IfcCableSegment'],
    // Furnishing
    [IfcTypeEnum.IfcFurnishingElement, 'IfcFurnishingElement'],
    [IfcTypeEnum.IfcFurniture, 'IfcFurniture'],
    // Other products
    [IfcTypeEnum.IfcProxy, 'IfcProxy'],
    [IfcTypeEnum.IfcAnnotation, 'IfcAnnotation'],
    [IfcTypeEnum.IfcTransportElement, 'IfcTransportElement'],
    [IfcTypeEnum.IfcCivilElement, 'IfcCivilElement'],
    [IfcTypeEnum.IfcGeographicElement, 'IfcGeographicElement'],
    // Relationships
    [IfcTypeEnum.IfcRelContainedInSpatialStructure, 'IfcRelContainedInSpatialStructure'],
    [IfcTypeEnum.IfcRelAggregates, 'IfcRelAggregates'],
    [IfcTypeEnum.IfcRelDefinesByProperties, 'IfcRelDefinesByProperties'],
    [IfcTypeEnum.IfcRelDefinesByType, 'IfcRelDefinesByType'],
    [IfcTypeEnum.IfcRelAssociatesMaterial, 'IfcRelAssociatesMaterial'],
    [IfcTypeEnum.IfcRelAssociatesClassification, 'IfcRelAssociatesClassification'],
    [IfcTypeEnum.IfcRelVoidsElement, 'IfcRelVoidsElement'],
    [IfcTypeEnum.IfcRelFillsElement, 'IfcRelFillsElement'],
    [IfcTypeEnum.IfcRelConnectsPathElements, 'IfcRelConnectsPathElements'],
    [IfcTypeEnum.IfcRelSpaceBoundary, 'IfcRelSpaceBoundary'],
    // Properties
    [IfcTypeEnum.IfcPropertySet, 'IfcPropertySet'],
    [IfcTypeEnum.IfcPropertySingleValue, 'IfcPropertySingleValue'],
    [IfcTypeEnum.IfcPropertyEnumeratedValue, 'IfcPropertyEnumeratedValue'],
    [IfcTypeEnum.IfcPropertyBoundedValue, 'IfcPropertyBoundedValue'],
    [IfcTypeEnum.IfcPropertyListValue, 'IfcPropertyListValue'],
    [IfcTypeEnum.IfcElementQuantity, 'IfcElementQuantity'],
    [IfcTypeEnum.IfcQuantityLength, 'IfcQuantityLength'],
    [IfcTypeEnum.IfcQuantityArea, 'IfcQuantityArea'],
    [IfcTypeEnum.IfcQuantityVolume, 'IfcQuantityVolume'],
    [IfcTypeEnum.IfcQuantityCount, 'IfcQuantityCount'],
    [IfcTypeEnum.IfcQuantityWeight, 'IfcQuantityWeight'],
    // Type definitions
    [IfcTypeEnum.IfcWallType, 'IfcWallType'],
    [IfcTypeEnum.IfcDoorType, 'IfcDoorType'],
    [IfcTypeEnum.IfcWindowType, 'IfcWindowType'],
    [IfcTypeEnum.IfcSlabType, 'IfcSlabType'],
    [IfcTypeEnum.IfcColumnType, 'IfcColumnType'],
    [IfcTypeEnum.IfcBeamType, 'IfcBeamType'],
    [IfcTypeEnum.IfcPileType, 'IfcPileType'],
    [IfcTypeEnum.IfcMemberType, 'IfcMemberType'],
    [IfcTypeEnum.IfcPlateType, 'IfcPlateType'],
    [IfcTypeEnum.IfcFootingType, 'IfcFootingType'],
    [IfcTypeEnum.IfcCoveringType, 'IfcCoveringType'],
    [IfcTypeEnum.IfcRailingType, 'IfcRailingType'],
    [IfcTypeEnum.IfcStairType, 'IfcStairType'],
    [IfcTypeEnum.IfcRampType, 'IfcRampType'],
    [IfcTypeEnum.IfcRoofType, 'IfcRoofType'],
    [IfcTypeEnum.IfcCurtainWallType, 'IfcCurtainWallType'],
    [IfcTypeEnum.IfcBuildingElementProxyType, 'IfcBuildingElementProxyType'],
]);
export function IfcTypeEnumFromString(str) {
    return TYPE_STRING_TO_ENUM.get(str.toUpperCase()) ?? IfcTypeEnum.Unknown;
}
export function IfcTypeEnumToString(type) {
    return TYPE_ENUM_TO_STRING.get(type) ?? 'Unknown';
}
//# sourceMappingURL=types.js.map