/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
// ============================================================================
// Attribute Namespace Constants
// ============================================================================
/**
 * Well-known attribute namespaces used in IFCX files.
 * These are considered stable and safe to implement.
 */
export const ATTR = {
    // IFC Classification (stable)
    CLASS: 'bsi::ifc::class',
    // USD Geometry (stable - from OpenUSD standard)
    MESH: 'usd::usdgeom::mesh',
    TRANSFORM: 'usd::xformop',
    VISIBILITY: 'usd::usdgeom::visibility',
    // IFC Presentation (stable)
    DIFFUSE_COLOR: 'bsi::ifc::presentation::diffuseColor',
    OPACITY: 'bsi::ifc::presentation::opacity',
    // IFC Materials (likely stable)
    MATERIAL: 'bsi::ifc::material',
    // IFC Properties (stable pattern, specific props may vary)
    PROP_PREFIX: 'bsi::ifc::prop::',
    // IFC Relationships (evolving)
    SPACE_BOUNDARY: 'bsi::ifc::spaceBoundary',
};
// ============================================================================
// Spatial Types
// ============================================================================
export const SPATIAL_TYPES = new Set([
    'IfcProject',
    'IfcSite',
    'IfcBuilding',
    'IfcBuildingStorey',
    'IfcSpace',
]);
export const BUILDING_ELEMENT_TYPES = new Set([
    'IfcWall',
    'IfcWallStandardCase',
    'IfcDoor',
    'IfcWindow',
    'IfcSlab',
    'IfcColumn',
    'IfcBeam',
    'IfcStair',
    'IfcRamp',
    'IfcRoof',
    'IfcCovering',
    'IfcCurtainWall',
    'IfcRailing',
    'IfcOpeningElement',
    'IfcBuildingElementProxy',
]);
//# sourceMappingURL=types.js.map