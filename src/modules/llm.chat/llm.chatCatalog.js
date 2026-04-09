import { ALL_TOOL_DEFINITIONS } from "./llm.ifcToolDefinitions.js";
import { IfcOpenShellToolsContext } from "./llm.ifcToolHandlers.js";
import { OlympusOperatorToolsContext } from "./llm.operatorTools.js";

const TOOL_CATEGORY_ORDER = ["aeco_ifc", "module_operators"];

const TOOL_CATEGORY_LABELS = {
  aeco_ifc: "IfcOpenShell/tools",
  module_operators: "olympus operators",
};

function resolveToolCategoryId(toolName) {
  const name = typeof toolName === "string" ? toolName : "";

  if (name.indexOf("operator_") === 0) {
    return "module_operators";
  }

  if (name === "module_operator_list" || name === "module_operator_call") {
    return "module_operators";
  }

  if (name.indexOf("ifc_") === 0) {
    return "aeco_ifc";
  }

  return "module_operators";
}

function buildRuntimeToolCatalog(context, tools) {
  const integrated = integrateBimChatTools(context, tools);
  const entries = [];

  for (const toolDefinition of ALL_TOOL_DEFINITIONS) {
    entries.push({
      id: `curated:${toolDefinition.name}`,
      name: toolDefinition.name,
      description: toolDefinition.description,
      sourceKind: "curated_tool",
      categoryId: resolveToolCategoryId(toolDefinition.name),
      subcategoryId: null,
    });
  }

  for (const catalogEntry of integrated.operatorCatalogEntries) {
    entries.push(catalogEntry);
  }

  const categories = [];
  const allToolNames = [];

  for (const categoryId of TOOL_CATEGORY_ORDER) {
    const toolsInCategory = entries
      .filter((entry) => entry.categoryId === categoryId)
      .sort((left, right) => {
        const subA = typeof left.subcategoryId === "string" ? left.subcategoryId : "";
        const subB = typeof right.subcategoryId === "string" ? right.subcategoryId : "";

        if (subA !== subB) {
          return subA.localeCompare(subB);
        }

        return left.name.localeCompare(right.name);
      })
      .map((entry) => {
        allToolNames.push(entry.name);

        return {
          name: entry.name,
          description: entry.description,
          sourceKind: entry.sourceKind,
          subcategoryId: entry.subcategoryId || null,
        };
      });

    if (toolsInCategory.length === 0) {
      continue;
    }

    categories.push({
      id: categoryId,
      label: TOOL_CATEGORY_LABELS[categoryId] || categoryId,
      tools: toolsInCategory,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    categories,
    allToolNames,
    entries,
  };
}

function getBIMChatToolCatalog(tools, context = null) {
  return buildRuntimeToolCatalog(context, tools);
}

function normalizeEnabledToolSet(enabledToolNames) {
  if (!Array.isArray(enabledToolNames)) {
    return null;
  }

  const enabledSet = new Set();

  for (const toolName of enabledToolNames) {
    if (typeof toolName !== "string" || toolName.length === 0) {
      continue;
    }

    enabledSet.add(toolName);
  }

  return enabledSet;
}

function integrateBimChatTools(context, tools) {
  const staticHandlers = IfcOpenShellToolsContext(context, tools);
  const operatorSurface = OlympusOperatorToolsContext(context);

  return {
    allToolDefinitions: [...ALL_TOOL_DEFINITIONS, ...operatorSurface.toolDefinitions],
    mergedHandlers: { ...staticHandlers, ...operatorSurface.handlers },
    operatorCatalogEntries: operatorSurface.catalogEntries,
  };
}

export {
  buildRuntimeToolCatalog,
  getBIMChatToolCatalog,
  integrateBimChatTools,
  normalizeEnabledToolSet,
};
