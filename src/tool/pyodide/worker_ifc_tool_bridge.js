import { getPyodide, ifc } from "./worker_state.js";
import { getIfc } from "./worker_files_modules.js";

function convertPythonValueToJavaScript(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== "object") {
    return value;
  }

  if (typeof value.toJs === "function") {
    const javaScriptValue = value.toJs({ dict_converter: Object.fromEntries });

    if (typeof value.destroy === "function") {
      value.destroy();
    }

    return javaScriptValue;
  }

  return value;
}

function getModelIfProvided(modelName) {
  if (typeof modelName !== "string" || modelName.length === 0) {
    return null;
  }

  return getIfc(modelName);
}

function resolveEntityArgs(model, args, entityArgKeys) {
  const resolvedArgs = {};
  const inputArgs = args && typeof args === "object" ? args : {};
  const entityKeys = Array.isArray(entityArgKeys) ? entityArgKeys : [];

  for (const [argumentName, argumentValue] of Object.entries(inputArgs)) {
    resolvedArgs[argumentName] = argumentValue;
  }

  if (entityKeys.length === 0) {
    return resolvedArgs;
  }

  if (!model) {
    throw new Error("Model is required to resolve entity arguments.");
  }

  for (const entityArgumentName of entityKeys) {
    if (entityArgumentName === "model") {
      resolvedArgs.model = model;
      continue;
    }

    const globalId = resolvedArgs[entityArgumentName];

    if (typeof globalId !== "string") {
      continue;
    }

    resolvedArgs[entityArgumentName] = model.by_guid(globalId);
  }

  return resolvedArgs;
}

function callToolFunction(toolName, functionName, resolvedArgs) {
  const toolModule = ifc[toolName];

  if (!toolModule) {
    throw new Error(`IFC tool module '${toolName}' is not loaded.`);
  }

  const toolFunction = toolModule[functionName];

  if (typeof toolFunction !== "function") {
    throw new Error(`IFC tool function '${toolName}.${functionName}' was not found.`);
  }

  const keywordArguments = resolvedArgs && typeof resolvedArgs === "object"
    ? resolvedArgs
    : {};
  const argumentEntries = Object.entries(keywordArguments);

  if (argumentEntries.length === 0) {
    const pythonResult = toolFunction();
    return convertPythonValueToJavaScript(pythonResult);
  }

  if (typeof toolFunction.callKwargs === "function") {
    const pythonResult = toolFunction.callKwargs(keywordArguments);
    return convertPythonValueToJavaScript(pythonResult);
  }

  const pythonResult = toolFunction(keywordArguments);
  return convertPythonValueToJavaScript(pythonResult);
}

function callIfcApi(model, usecase, resolvedArgs) {
  if (!model) {
    throw new Error("Model is required for ifcopenshell.api calls.");
  }

  if (typeof usecase !== "string" || usecase.length === 0) {
    throw new Error("Usecase is required for ifcopenshell.api calls.");
  }

  const pyodide = getPyodide();
  const pythonArgs = pyodide.toPy(resolvedArgs);

  pyodide.globals.set("__ifc_bridge_usecase__", usecase);
  pyodide.globals.set("__ifc_bridge_model__", model);
  pyodide.globals.set("__ifc_bridge_args__", pythonArgs);

  try {
    const pythonResult = pyodide.runPython(`
import ifcopenshell.api
ifcopenshell.api.run(__ifc_bridge_usecase__, __ifc_bridge_model__, **__ifc_bridge_args__)
`);

    if (pythonResult === null || pythonResult === undefined) {
      return "Success";
    }

    return convertPythonValueToJavaScript(pythonResult);
  } finally {
    if (typeof pythonArgs.destroy === "function") {
      pythonArgs.destroy();
    }
    pyodide.globals.delete("__ifc_bridge_usecase__");
    pyodide.globals.delete("__ifc_bridge_model__");
    pyodide.globals.delete("__ifc_bridge_args__");
  }
}

function queryModel(model, queryType, params) {
  if (!model) {
    throw new Error("Model is required for query actions.");
  }

  const queryParams = params && typeof params === "object" ? params : {};

  if (queryType === "byType") {
    const entityType = queryParams.type;

    if (typeof entityType !== "string" || entityType.length === 0) {
      throw new Error("Query 'byType' requires a valid 'type' string.");
    }

    const entities = model.by_type(entityType);
    const result = [];
    const entityCount = entities.length;

    for (let index = 0; index < entityCount; index += 1) {
      const entity = entities[index];
      const globalId = typeof entity.GlobalId === "string" ? entity.GlobalId : String(entity.id());
      const name = entity.Name ? entity.Name : null;
      const entityClass = entity.is_a();

      result.push({
        GlobalId: globalId,
        Name: name,
        type: entityClass,
      });
    }

    if (typeof entities.destroy === "function") {
      entities.destroy();
    }

    return result;
  }

  if (queryType === "getGlobalId") {
    const elementId = parseInt(queryParams.id, 10);
    const element = model.by_id(elementId);
    return element ? element.GlobalId : null;
  }

  if (queryType === "isA") {
    const entity = model.by_guid(queryParams.GlobalId);

    if (!entity) {
      return false;
    }

    return entity.is_a(queryParams.type);
  }

  if (queryType === "getClass") {
    const entity = model.by_guid(queryParams.GlobalId);

    if (!entity) {
      return null;
    }

    return entity.is_a();
  }

  throw new Error(`Unknown queryType '${queryType}'.`);
}

let mcpSessionBound = false;

function ensureMCPSession(pyodide) {
  if (mcpSessionBound) return;

  pyodide.runPython(`
from ifcmcp.embedded import session as _mcp_session
from ifcmcp.embedded import call_tool as _mcp_call_tool
`);
  mcpSessionBound = true;
}

function callMCPTool(model, toolName, toolArgs) {
  const pyodide = getPyodide();

  ensureMCPSession(pyodide);

  // Sync the Olympus model into the ifcmcp session before dispatching.
  pyodide.globals.set("__mcp_bridge_model__", model);
  pyodide.runPython(`_mcp_session.model = __mcp_bridge_model__`);
  pyodide.globals.delete("__mcp_bridge_model__");

  const pyArgs = pyodide.toPy(toolArgs || {});
  pyodide.globals.set("__mcp_bridge_name__", toolName);
  pyodide.globals.set("__mcp_bridge_args__", pyArgs);

  try {
    const pythonResult = pyodide.runPython(`_mcp_call_tool(__mcp_bridge_name__, __mcp_bridge_args__)`);
    const result = convertPythonValueToJavaScript(pythonResult);
    return result;
  } finally {
    if (typeof pyArgs.destroy === "function") {
      pyArgs.destroy();
    }
    pyodide.globals.delete("__mcp_bridge_name__");
    pyodide.globals.delete("__mcp_bridge_args__");
  }
}

export function ifcToolCall(action, modelName, toolName, functionName, usecase, queryType, args, entityArgs, params) {
  const model = getModelIfProvided(modelName);

  if (action === "toolCall") {
    const resolvedArgs = resolveEntityArgs(model, args, entityArgs);
    return callToolFunction(toolName, functionName, resolvedArgs);
  }

  if (action === "apiCall") {
    const resolvedArgs = resolveEntityArgs(model, args, entityArgs);
    return callIfcApi(model, usecase, resolvedArgs);
  }

  if (action === "query") {
    return queryModel(model, queryType, params);
  }

  if (action === "mcpCall") {
    return callMCPTool(model, toolName, args);
  }

  throw new Error(`Unknown IFC bridge action '${action}'.`);
}
