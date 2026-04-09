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

import { AECO_SuperPower } from "./modes.js";

export const coreModules = AECO_SuperPower
