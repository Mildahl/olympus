/**
 * Core Modules Configuration
 * 
 * This file defines which modules are active for this application instance.
 * Module definitions (operators, UI, dependencies) are in src/modules/[module]/module.js
 * 
 * Each entry only needs:
 * - id: Module identifier (must match the id in module.js)
 * - active: Whether the module should be loaded
 * 
 * Dependencies are handled automatically by the ModuleRegistry based on each module's
 * dependsOn array defined in its module.js file.
 */

export const coreModules = [
    {
        id: "configurator",
        active: true,
    },
    {
        id: "theme",
        active: true,
    },
    {
        id: "world",
        active: true,
    },
    {
        id: "world.notification",
        active: true,
    },
    {
        id: "bim.project",
        active: true,
    },
    {
        id: "bim.analytics",
        active: true,
    },
    {
        id: "bim.sequence",
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
        id: "world.snap",
        active: true,
    },
    {
        id: "world.measure",
        active: true,
    },
    {
        id: "world.sectionbox",
        active: false,
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
        id: "settings",
        active: true,
    },
    {
        id: "tiles",
        active: true, 
    },
    
    {
        id: "code.scripting",
        active: true,
    },
    {
        id: "code.terminal",
        active: true,
    },
    {
        id: "bim.attribute",
        active: true,
    },
    {
        id: "bim.pset",
        active: true,
    },
    {
        id: "bim.model",
        active: false,
    },
    {
        id: "bim.cost",
        active: false,
    },
];
