const TOOL_DEFINITIONS = [
  {
    type: "function",
    name: "ifc_summary",
    description: "Get a concise overview of the loaded IFC model.",
    parameters: {
      type: "object",
      properties: { modelName: { type: "string" } },
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "ifc_tree",
    description: "Get the full spatial hierarchy tree.",
    parameters: {
      type: "object",
      properties: { modelName: { type: "string" } },
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "ifc_select",
    description:
      "Query IFC elements with IfcOpenShell selector syntax (e.g. 'IfcWindow'). Returns model data only; does not set Olympus viewport or editor selection. For viewer.select_objects_by_guid use each element's GlobalId string, not STEP element_id unless you rely on numeric express-id mapping.",
    parameters: {
      type: "object",
      properties: {
        modelName: { type: "string" },
        query: { type: "string" },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "ifc_info",
    description:
      "Inspect an entity by STEP express id (element_id). Response includes GlobalId for viewport selection — use that GlobalId with viewer.select_objects_by_guid, not element_id.",
    parameters: {
      type: "object",
      properties: {
        modelName: { type: "string" },
        element_id: { type: "integer" },
      },
      required: ["element_id"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "ifc_relations",
    description: "Get relationships for an element. traverse='up' walks to IfcProject.",
    parameters: {
      type: "object",
      properties: {
        modelName: { type: "string" },
        element_id: { type: "integer" },
        traverse: { type: "string" },
      },
      required: ["element_id"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "ifc_clash",
    description: "Run clash/clearance checks for an element.",
    parameters: {
      type: "object",
      properties: {
        modelName: { type: "string" },
        element_id: { type: "integer" },
        clearance: { type: "number" },
        tolerance: { type: "number" },
        scope: { type: "string", description: "storey or all" },
      },
      required: ["element_id"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "ifc_list",
    description: "List ifcopenshell.api modules or functions within a module.",
    parameters: {
      type: "object",
      properties: {
        modelName: { type: "string" },
        module: { type: "string" },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "ifc_docs",
    description: "Get documentation for an ifcopenshell.api function, 'module.function'.",
    parameters: {
      type: "object",
      properties: {
        modelName: { type: "string" },
        function_path: { type: "string" },
      },
      required: ["function_path"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "ifc_edit",
    description: "Execute an ifcopenshell.api mutation; params is a JSON string of stringly-typed kwargs.",
    parameters: {
      type: "object",
      properties: {
        modelName: { type: "string" },
        function_path: { type: "string" },
        params: { type: "string" },
      },
      required: ["function_path"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "ifc_validate",
    description: "Validate the loaded model. Returns valid bool and list of issues.",
    parameters: {
      type: "object",
      properties: {
        modelName: { type: "string" },
        express_rules: { type: "boolean", description: "Also check EXPRESS rules (slower)" },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "ifc_schedule",
    description: "List work schedules and nested tasks. Use max_depth=1 for top-level phases only on large projects.",
    parameters: {
      type: "object",
      properties: {
        modelName: { type: "string" },
        max_depth: { type: "integer", description: "Max levels of subtask expansion (omit for unlimited)" },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "ifc_cost",
    description: "List cost schedules and nested cost items. Use max_depth=1 for top-level sections only on large BoQs.",
    parameters: {
      type: "object",
      properties: {
        modelName: { type: "string" },
        max_depth: { type: "integer", description: "Max levels of cost item expansion (omit for unlimited)" },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "ifc_schema",
    description: "Return IFC class documentation for an entity type.",
    parameters: {
      type: "object",
      properties: {
        modelName: { type: "string" },
        entity_type: { type: "string", description: "IFC entity type, e.g. IfcWall" },
      },
      required: ["entity_type"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "ifc_quantify",
    description: "Run quantity take-off (QTO) on the model. Modifies model in-place; call bim_save_ifc() after.",
    parameters: {
      type: "object",
      properties: {
        modelName: { type: "string" },
        rule: { type: "string", description: "QTO rule name, e.g. IFC4QtoBaseQuantities" },
        selector: { type: "string", description: "ifcopenshell selector to restrict elements (default: all IfcElement)" },
      },
      required: ["rule"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "ifc_contexts",
    description: "List all geometric representation contexts and subcontexts with their step IDs.",
    parameters: {
      type: "object",
      properties: { modelName: { type: "string" } },
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "ifc_materials",
    description: "List all materials and material sets (layers, constituents, profiles).",
    parameters: {
      type: "object",
      properties: { modelName: { type: "string" } },
      required: [],
      additionalProperties: false,
    },
  },
];

const ALL_TOOL_DEFINITIONS = [...TOOL_DEFINITIONS];

export { TOOL_DEFINITIONS, ALL_TOOL_DEFINITIONS };
