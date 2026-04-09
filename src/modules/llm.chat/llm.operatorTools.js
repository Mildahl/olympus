import operators from "../../operators/index.js";
import { moduleRegistry } from "../index.js";
import { ALL_TOOL_DEFINITIONS } from "./llm.ifcToolDefinitions.js";

function toPlainObject(value) {
  return value && typeof value === "object" ? value : {};
}



function splitTopLevelParameters(source) {
  const tokens = [];
  let current = "";
  let braceDepth = 0;
  let bracketDepth = 0;
  let parenDepth = 0;
  let quote = "";
  let escape = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (quote) {
      current += char;

      if (escape) {
        escape = false;
      } else if (char === "\\") {
        escape = true;
      } else if (char === quote) {
        quote = "";
      }

      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      current += char;
      continue;
    }

    if (char === "{") {
      braceDepth += 1;
      current += char;
      continue;
    }

    if (char === "}") {
      braceDepth = Math.max(0, braceDepth - 1);
      current += char;
      continue;
    }

    if (char === "[") {
      bracketDepth += 1;
      current += char;
      continue;
    }

    if (char === "]") {
      bracketDepth = Math.max(0, bracketDepth - 1);
      current += char;
      continue;
    }

    if (char === "(") {
      parenDepth += 1;
      current += char;
      continue;
    }

    if (char === ")") {
      parenDepth = Math.max(0, parenDepth - 1);
      current += char;
      continue;
    }

    if (char === "," && braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
      if (current.trim()) {
        tokens.push(current.trim());
      }
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    tokens.push(current.trim());
  }

  return tokens;
}

function stripTopLevelDefault(paramToken) {
  let braceDepth = 0;
  let bracketDepth = 0;
  let parenDepth = 0;
  let quote = "";
  let escape = false;

  for (let index = 0; index < paramToken.length; index += 1) {
    const char = paramToken[index];

    if (quote) {
      if (escape) {
        escape = false;
      } else if (char === "\\") {
        escape = true;
      } else if (char === quote) {
        quote = "";
      }
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "{") {
      braceDepth += 1;
      continue;
    }

    if (char === "}") {
      braceDepth = Math.max(0, braceDepth - 1);
      continue;
    }

    if (char === "[") {
      bracketDepth += 1;
      continue;
    }

    if (char === "]") {
      bracketDepth = Math.max(0, bracketDepth - 1);
      continue;
    }

    if (char === "(") {
      parenDepth += 1;
      continue;
    }

    if (char === ")") {
      parenDepth = Math.max(0, parenDepth - 1);
      continue;
    }

    if (char === "=" && braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
      return paramToken.slice(0, index).trim();
    }
  }

  return paramToken.trim();
}

function normalizeParameterToken(paramToken) {
  const stripped = stripTopLevelDefault(String(paramToken || "").trim()).replace(/^\.\.\./, "").trim();

  if (!stripped) {
    return "";
  }

  if (stripped[0] === "{" || stripped[0] === "[") {
    return "options";
  }

  return stripped;
}

function hasTopLevelDefault(paramToken) {
  const raw = String(paramToken || "").trim().replace(/^\.\.\./, "").trim();
  return raw !== stripTopLevelDefault(raw);
}

function extractDestructuredProps(paramToken) {
  const raw = String(paramToken || "").trim().replace(/^\.\.\./, "").trim();
  const withoutDefault = stripTopLevelDefault(raw);

  if (!withoutDefault || withoutDefault[0] !== "{") {
    return null;
  }

  const inner = withoutDefault.slice(1, withoutDefault.lastIndexOf("}")).trim();

  if (!inner) {
    return [];
  }

  const propTokens = splitTopLevelParameters(inner);
  const props = [];

  for (const propToken of propTokens) {
    const trimmed = propToken.trim();

    if (!trimmed) {
      continue;
    }

    const propHasDefault = hasTopLevelDefault(trimmed);
    const propName = stripTopLevelDefault(trimmed).replace(/^\.\.\./, "").trim();

    if (propName && propName[0] !== "{" && propName[0] !== "[") {
      props.push({ name: propName, hasDefault: propHasDefault });
    }
  }

  return props;
}

function getCallableSignatureInfo(callable, mode = "function") {
  let source = "";

  try {
    source = Function.prototype.toString.call(callable);
  } catch (error) {
    return {
      injectContext: false,
      exposedParams: [],
      params: [],
    };
  }

  const constructorMatch = mode === "constructor"
    ? source.match(/constructor\s*\(([\s\S]*?)\)/)
    : null;
  const match = constructorMatch || source.match(/^[^(]*\(([\s\S]*?)\)/);
  const rawParams = match && typeof match[1] === "string" ? match[1].trim() : "";
  const rawTokens = rawParams.length > 0 ? splitTopLevelParameters(rawParams) : [];

  const params = [];

  for (const rawToken of rawTokens) {
    const name = normalizeParameterToken(rawToken);

    if (!name) {
      continue;
    }

    const paramHasDefault = hasTopLevelDefault(rawToken);
    const destructuredProps = extractDestructuredProps(rawToken);

    params.push({
      name,
      hasDefault: paramHasDefault,
      isDestructured: destructuredProps !== null,
      destructuredProps: destructuredProps || undefined,
    });
  }

  const injectContext = params.length > 0 && params[0].name === "context";
  const exposed = injectContext ? params.slice(1) : params;

  return {
    injectContext,
    exposedParams: exposed.map((p) => p.name),
    params: exposed,
  };
}

/**
 * Resolve operator constructor signature.
 * Prefers the build-time extracted map (survives minification)
 * and falls back to runtime parsing (dev / unminified only).
 */
function getOperatorSignature(operatorId, OperatorClass) {
  const runtime = getCallableSignatureInfo(OperatorClass, "constructor");
  return {
    exposedParams: runtime.exposedParams,
    params: runtime.params,
    label: null,
    description: null,
  };
}

function toSnakeCaseIdentifier(value) {
  return String(value || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function formatSignature(label, params) {
  return `${label}(${params.join(", ")})`;
}

function buildOperatorToolDescription(operatorId, moduleId, OperatorClass, signature) {
  const label = (OperatorClass && typeof OperatorClass.operatorLabel === "string" && OperatorClass.operatorLabel)
    || (OperatorClass && typeof OperatorClass.label === "string" && OperatorClass.label)
    || (signature && signature.label)
    || operatorId;
  const desc = (OperatorClass && typeof OperatorClass.operatorDescription === "string" && OperatorClass.operatorDescription)
    || (OperatorClass && typeof OperatorClass.description === "string" && OperatorClass.description)
    || (signature && signature.description)
    || null;
  const sigLine = `Executes operator ${formatSignature(operatorId, signature.exposedParams)} from module ${moduleId}.`;

  return desc ? `${label}. ${desc}. ${sigLine}` : `${label}. ${sigLine}`;
}

// Runtime type inference map for common operator parameter names.
// Priority: static operatorParams > KNOWN_PARAM_TYPES > { type: "string" }
const KNOWN_PARAM_TYPES = {
  // IDs / references
  GlobalId:            { type: "string", description: "IFC element GlobalId" },
  globalId:            { type: "string", description: "IFC element GlobalId" },
  globalIds:           { type: "array", items: { type: "string" }, description: "IFC GlobalId strings (22-char); avoid confusing with ifc_info element_id unless values are decimal express ids as strings" },
  entityGlobalId:      { type: "string", description: "IFC entity GlobalId" },
  elementId:           { type: "integer", description: "IFC STEP element ID" },
  scheduleId:          { type: "string", description: "Work schedule GlobalId" },
  workScheduleGlobalId:      { type: "string", description: "Work schedule GlobalId" },
  workscheduleId:      { type: "string", description: "Work schedule GlobalId" },
  taskId:              { type: "string", description: "Task GlobalId" },
  psetGlobalId:        { type: "string", description: "Property set GlobalId" },
  scriptGuid:          { type: "string", description: "Script GlobalId" },
  terminalGuid:        { type: "string", description: "Terminal GlobalId" },
  layerGuid:           { type: "string", description: "Layer GUID" },
  tilesetId:           { type: "string", description: "Tileset identifier" },
  measurementId:       { type: "string", description: "Measurement identifier" },
  stateId:             { type: "string", description: "History state identifier" },
  pathGlobalId:        { type: "string", description: "Animation path GlobalId" },
  viewpointGlobalId:   { type: "string", description: "Viewpoint GlobalId" },

  // Model
  modelName:           { type: "string", description: "IFC model name (omit for active model)" },
  model:               { type: "string", description: "IFC model name" },

  // Names / labels
  name:                { type: "string", description: "Name value" },
  newName:             { type: "string", description: "New name" },
  scheduleName:        { type: "string", description: "Schedule name" },
  layerName:           { type: "string", description: "Layer name" },
  qtoName:             { type: "string", description: "Quantity set name" },

  // Code / scripting
  code:                { type: "string", description: "Source code to execute" },
  newCode:             { type: "string", description: "Updated source code" },
  command:             { type: "string", description: "Command to execute" },
  language:            { type: "string", description: "Programming language" },

  // Objects / compound args
  params:              { type: "object", description: "Operation parameters object" },
  attributes:          { type: "object", description: "Key-value attribute pairs to set" },
  properties:          { type: "object", description: "Property set values" },
  quantities:          { type: "object", description: "Quantity values" },
  options:             { type: "object", description: "Configuration options" },
  settings:            { type: "object", description: "Settings object" },
  args:                { type: "object", description: "Arguments object" },
  data:                { type: "object", description: "Data payload" },
  json:                { type: "object", description: "JSON data" },
  navigationConfig:    { type: "object", description: "Navigation configuration" },
  modules:             { type: "object", description: "Module configuration" },

  // Geometry / coordinates
  start:               { type: "object", description: "Start point {x, y, z}" },
  end:                 { type: "object", description: "End point {x, y, z}" },
  position:            { type: "object", description: "Position {x, y, z}" },
  min:                 { type: "object", description: "Minimum bounds {x, y, z}" },
  max:                 { type: "object", description: "Maximum bounds {x, y, z}" },
  point:               { type: "object", description: "Point {x, y, z}" },
  point1:              { type: "object", description: "First point {x, y, z}" },
  vertex:              { type: "object", description: "Vertex point {x, y, z}" },
  point3:              { type: "object", description: "Third point {x, y, z}" },
  lineStart:           { type: "object", description: "Line start point {x, y, z}" },
  lineEnd:             { type: "object", description: "Line end point {x, y, z}" },
  points:              { type: "array", description: "Array of points [{x, y, z}, ...]" },

  // Numeric
  speed:               { type: "number", description: "Speed value" },
  newIndex:            { type: "integer", description: "New index position" },
  assetId:             { type: "integer", description: "Cesium Ion asset ID" },
  errorTarget:         { type: "number", description: "Error target for tile quality" },
  latitude:            { type: "number", description: "Latitude coordinate" },
  longitude:           { type: "number", description: "Longitude coordinate" },

  // Strings
  path:                { type: "string", description: "File path or URL" },
  url:                 { type: "string", description: "URL to load" },
  format:              { type: "string", description: "File format" },
  mode:                { type: "string", description: "Mode identifier" },
  theme:               { type: "string", description: "Theme name" },
  color:               { type: "string", description: "Color value" },
  axis:                { type: "string", description: "Axis identifier (x, y, or z)" },
  viewType:            { type: "string", description: "View type identifier" },
  pathType:            { type: "string", description: "Path type identifier" },
  targetDate:          { type: "string", description: "Target date string" },
  targetLayerPath:     { type: "string", description: "Target layer path" },
  geometryBackend:     { type: "string", description: "Geometry backend name" },
  query:               { type: "string", description: "Query or selector string" },
  presetKey:           { type: "string", description: "Preset key identifier" },
  avatarId:            { type: "string", description: "Avatar identifier" },
  message:             { type: "string", description: "Message text" },

  // Booleans
  additive:            { type: "boolean", description: "If true, add to current selection instead of replacing it" },
  animate:             { type: "boolean", description: "Whether to animate the transition" },
  enabled:             { type: "boolean", description: "Enable or disable" },
  force:               { type: "boolean", description: "Force the operation" },
  skipConfirm:         { type: "boolean", description: "Skip confirmation dialog" },

  // Generic
  id:                  { type: "string", description: "Item identifier" },
  key:                 { type: "string", description: "Setting key" },
  value:               { type: "string", description: "Setting value" },
  type:                { type: "string", description: "Type identifier" },
};

function inferParamSchema(paramName) {
  if (KNOWN_PARAM_TYPES[paramName]) {
    return { ...KNOWN_PARAM_TYPES[paramName] };
  }

  // Heuristic: names ending in Id/Guid are strings, names like is*/has* are booleans
  if (/Id$|Guid$/.test(paramName)) {
    return { type: "string", description: `${paramName} identifier` };
  }

  if (/^is[A-Z]|^has[A-Z]|^enable|^disable|^show|^hide|^toggle/.test(paramName)) {
    return { type: "boolean", description: `${paramName} flag` };
  }

  return { type: "string" };
}

function buildOperatorToolSchema(signatureParams, OperatorClass) {
  const properties = {};
  const required = [];
  const paramMapping = [];

  const operatorParams = OperatorClass && OperatorClass.operatorParams
    ? OperatorClass.operatorParams
    : null;

  for (const param of signatureParams) {
    if (param.isDestructured && Array.isArray(param.destructuredProps)) {
      for (const prop of param.destructuredProps) {
        const override = operatorParams && operatorParams[prop.name] ? operatorParams[prop.name] : null;
        properties[prop.name] = override
          ? { ...override }
          : inferParamSchema(prop.name);

        if (!prop.hasDefault && !(override && override.required === false)) {
          required.push(prop.name);
        }
      }

      paramMapping.push({
        kind: "destructured",
        paramName: param.name,
        props: param.destructuredProps.map((p) => p.name),
      });
    } else {
      const override = operatorParams && operatorParams[param.name] ? operatorParams[param.name] : null;
      properties[param.name] = override
        ? { ...override }
        : inferParamSchema(param.name);

      if (!param.hasDefault && !(override && override.required === false)) {
        required.push(param.name);
      }

      paramMapping.push({
        kind: "positional",
        paramName: param.name,
      });
    }
  }

  // Clean out non-JSON-Schema keys from property overrides
  for (const key of Object.keys(properties)) {
    delete properties[key].required;
  }

  properties.dryRun = { type: "boolean" };

  return {
    schema: {
      type: "object",
      properties,
      required,
      additionalProperties: false,
    },
    paramMapping,
  };
}

function resolveOperatorCallArgs(options, paramMapping) {
  const callArgs = [];

  for (const mapping of paramMapping) {
    if (mapping.kind === "destructured") {
      const obj = {};
      let hasAny = false;

      for (const propName of mapping.props) {
        if (options[propName] !== undefined) {
          obj[propName] = options[propName];
          hasAny = true;
        }
      }

      callArgs.push(hasAny ? obj : undefined);
    } else {
      callArgs.push(options[mapping.paramName]);
    }
  }

  // Trim trailing undefined values to let JS defaults work
  while (callArgs.length > 0 && callArgs[callArgs.length - 1] === undefined) {
    callArgs.pop();
  }

  return callArgs;
}

function buildSafeDynamicToolName(prefix, sourceId, usedNames) {
  const fallback = toSnakeCaseIdentifier(sourceId) || "entry";
  const maxLength = 64;
  const baseCandidate = `${prefix}_${fallback}`.slice(0, maxLength).replace(/^_+|_+$/g, "") || prefix;
  let candidate = baseCandidate;
  let counter = 2;

  while (usedNames.has(candidate)) {
    const counterSuffix = `_${counter}`;
    const maxCandidateLength = maxLength - counterSuffix.length;

    candidate = `${baseCandidate.slice(0, maxCandidateLength)}${counterSuffix}`;
    counter += 1;
  }

  usedNames.add(candidate);

  return candidate;
}

function OlympusOperatorToolsContext(context) {
  const handlers = {};
  const toolDefinitions = [];
  const catalogEntries = [];
  const usedNames = new Set(ALL_TOOL_DEFINITIONS.map((definition) => definition.name));

  const activeModuleIds = moduleRegistry.listActive().slice().sort();

  for (const moduleId of activeModuleIds) {
    const moduleDef = moduleRegistry.get(moduleId);

    if (!moduleDef) {
      continue;
    }

    for (const OperatorClass of moduleDef.operators || []) {
      const operatorId = OperatorClass && typeof OperatorClass.operatorName === "string"
        ? OperatorClass.operatorName
        : "";

      if (!operatorId || operatorId.indexOf("llm.chat.") === 0) {
        continue;
      }

      const dynamicToolName = buildSafeDynamicToolName("operator", operatorId, usedNames);
      const signature = getOperatorSignature(operatorId, OperatorClass);
      const description = buildOperatorToolDescription(operatorId, moduleId, OperatorClass, signature);
      const { schema, paramMapping } = buildOperatorToolSchema(signature.params, OperatorClass);

      toolDefinitions.push({
        type: "function",
        name: dynamicToolName,
        description,
        parameters: schema,
      });

      catalogEntries.push({
        id: `operator:${operatorId}`,
        name: dynamicToolName,
        description,
        sourceKind: "operator",
        categoryId: "module_operators",
        subcategoryId: moduleId,
        moduleId,
        operatorId,
        exposedParams: signature.exposedParams,
      });

      handlers[dynamicToolName] = async (args) => {
        const options = toPlainObject(args);
        const callArgs = resolveOperatorCallArgs(options, paramMapping);

        if (options.dryRun === true) {
          return {
            operatorId,
            moduleId,
            canExecute: operators.canExecute(operatorId, context, ...callArgs),
          };
        }

        const result = await operators.execute(operatorId, context, ...callArgs);

        return {
          operatorId,
          moduleId,
          result,
        };
      };
    }
  }

  return {
    handlers,
    catalogEntries,
    toolDefinitions,
  };
}

export { OlympusOperatorToolsContext };
