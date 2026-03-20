/**
 * BIM Pset Module Definition
 * Property sets and quantity sets editing. UI is integrated into the attribute panel.
 */
import operators from "./operators.js";

const ModuleDefinition = {
  id: "bim.pset",
  name: "BIM Property Sets",
  description: "IFC property set and quantity set viewing and editing",
  version: "1.0.0",
  dependsOn: ["bim.project"],
  operators,
  ui: [], 
};

export default ModuleDefinition;
