/**
 * Preset without code.scripting: open IFC and load geometry via ifc-lite in the browser.
 * With code.scripting + BIM enabled, the same operators prefer IfcOpenShell when the backend is ifcopenshell.
 */
export const AECO_Vanilla = [
    {
        id: "configurator",
        active: true,
    },
    {
        id: "world",
        active: true,
    },
    {
        id: "theme",
        active: true,
    },
    {
        id: "settings",
        active: true,
    },
    {
        id: "world.notification",
        active: true,
    },
    {
        id: "world.layer",
        active: true,
    },
    {
        id: "world.spatial",
        active: true,
    },
    {
        id: "world.viewpoints",
        active: true,
    },
    {
        id: "world.animationPath",
        active: true,
    },
    {
        id: "world.projection",
        active: true,
    },
    {
        id: "world.snap",
        active: true,
    },
    {
        id: "world.measure",
        active: true,
    },
    {
        id: "world.history",
        active: true,
    },
    {
        id: "world.navigation",
        active: true,
    },
    {
        id: "world.sectionbox",
        active: false,
    },
    {
        id: "tiles",
        active: false, 
    },
    {
        id: "bim.project",
        active: true,
    },
    {
        id: "bim.attribute",
        active: true,
    },
    {
        id: "bim.analytics",
        active: true,
    },
];

export const AECO_Power = [
    ...AECO_Vanilla,
    {
        id: "code.scripting",
        active: true,
    },
    {
        id: "code.terminal",
        active: true,
    },
    {
        id: "bim.pset",
        active: true,
    },

    {
        id: "bim.sequence",
        active: true,
    },
    {
        id: "bim.cost",
        active: true,
    },
];

export const AECO_SuperPower = [
    ...AECO_Power,
    {
        id: "bim.model",
        active: true,
    },
    {
    id: "llm.chat",
    active: false,
    },
];