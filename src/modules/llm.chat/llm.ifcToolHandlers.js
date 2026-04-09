import { getResolvedModelName, requireModelName } from "./llm.ifcModelContext.js";

function isMissingPytestDependencyError(error) {
  const message = error && error.message ? String(error.message) : String(error || "");
  const lowered = message.toLowerCase();

  return lowered.includes("no module named '_pytest'")
    || lowered.includes("no module named 'pytest'")
    || lowered.includes("module named _pytest");
}

function IfcOpenShellToolsContext(context, tools) {
  return {
    ifc_summary(args) {
      const modelName = requireModelName(context, args, "ifc_summary");
      return tools.bim.ifc.runMCPTool(modelName, "ifc_summary", {});
    },

    ifc_tree(args) {
      const modelName = requireModelName(context, args, "ifc_tree");
      return tools.bim.ifc.runMCPTool(modelName, "ifc_tree", {});
    },

    ifc_select(args) {
      const modelName = requireModelName(context, args, "ifc_select");
      const query = typeof args.query === "string" ? args.query : "";

      if (!query) {
        throw new Error("ifc_select requires query.");
      }

      return tools.bim.ifc.runMCPTool(modelName, "ifc_select", { query });
    },

    ifc_info(args) {
      const modelName = requireModelName(context, args, "ifc_info");
      const element_id = Number(args.element_id);

      if (!Number.isFinite(element_id)) {
        throw new Error("ifc_info requires numeric element_id.");
      }

      return tools.bim.ifc.runMCPTool(modelName, "ifc_info", { element_id });
    },

    ifc_relations(args) {
      const modelName = requireModelName(context, args, "ifc_relations");
      const element_id = Number(args.element_id);

      if (!Number.isFinite(element_id)) {
        throw new Error("ifc_relations requires numeric element_id.");
      }

      const mcpArgs = { element_id };

      if (typeof args.traverse === "string" && args.traverse.length > 0) {
        mcpArgs.traverse = args.traverse;
      }

      return tools.bim.ifc.runMCPTool(modelName, "ifc_relations", mcpArgs);
    },

    ifc_clash(args) {
      const modelName = requireModelName(context, args, "ifc_clash");
      const element_id = Number(args.element_id);

      if (!Number.isFinite(element_id)) {
        throw new Error("ifc_clash requires numeric element_id.");
      }

      const mcpArgs = { element_id };

      if (typeof args.clearance === "number") {
        mcpArgs.clearance = args.clearance;
      }
      if (typeof args.tolerance === "number") {
        mcpArgs.tolerance = args.tolerance;
      }
      if (typeof args.scope === "string" && args.scope.length > 0) {
        mcpArgs.scope = args.scope;
      }

      return tools.bim.ifc.runMCPTool(modelName, "ifc_clash", mcpArgs);
    },

    ifc_list(args) {
      const modelName = getResolvedModelName(context, args.modelName);
      const mcpArgs = {};

      if (typeof args.module === "string" && args.module.length > 0) {
        mcpArgs.module = args.module;
      }

      return tools.bim.ifc.runMCPTool(modelName, "ifc_list", mcpArgs);
    },

    ifc_docs(args) {
      const modelName = getResolvedModelName(context, args.modelName);
      const function_path = typeof args.function_path === "string" ? args.function_path : "";

      if (!function_path) {
        throw new Error("ifc_docs requires function_path.");
      }

      return tools.bim.ifc.runMCPTool(modelName, "ifc_docs", { function_path });
    },

    ifc_edit(args) {
      const modelName = requireModelName(context, args, "ifc_edit");
      const function_path = typeof args.function_path === "string" ? args.function_path : "";

      if (!function_path) {
        throw new Error("ifc_edit requires function_path.");
      }

      const mcpArgs = { function_path };

      if (typeof args.params === "string") {
        mcpArgs.params = args.params;
      }

      return tools.bim.ifc.runMCPTool(modelName, "ifc_edit", mcpArgs);
    },

    async ifc_validate(args) {
      const modelName = requireModelName(context, args, "ifc_validate");
      const mcpArgs = {};
      const requestedExpressRules = args && args.express_rules === true;

      if (typeof args.express_rules === "boolean") {
        mcpArgs.express_rules = args.express_rules;
      }

      try {
        return await tools.bim.ifc.runMCPTool(modelName, "ifc_validate", mcpArgs);
      } catch (error) {
        if (!requestedExpressRules || !isMissingPytestDependencyError(error)) {
          throw error;
        }

        const fallbackResult = await tools.bim.ifc.runMCPTool(modelName, "ifc_validate", {
          express_rules: false,
        });
        const normalizedFallback = fallbackResult && typeof fallbackResult === "object"
          ? fallbackResult
          : { result: fallbackResult };

        return {
          ...normalizedFallback,
          warning: "EXPRESS validation skipped because the Pyodide runtime is missing pytest (_pytest).",
          express_rules_requested: true,
          express_rules_executed: false,
        };
      }
    },

    ifc_schedule(args) {
      const modelName = requireModelName(context, args, "ifc_schedule");
      const mcpArgs = {};

      if (Number.isFinite(Number(args.max_depth))) {
        mcpArgs.max_depth = Number(args.max_depth);
      }

      return tools.bim.ifc.runMCPTool(modelName, "ifc_schedule", mcpArgs);
    },

    ifc_cost(args) {
      const modelName = requireModelName(context, args, "ifc_cost");
      const mcpArgs = {};

      if (Number.isFinite(Number(args.max_depth))) {
        mcpArgs.max_depth = Number(args.max_depth);
      }

      return tools.bim.ifc.runMCPTool(modelName, "ifc_cost", mcpArgs);
    },

    ifc_schema(args) {
      const modelName = requireModelName(context, args, "ifc_schema");
      const entity_type = typeof args.entity_type === "string" ? args.entity_type : "";

      if (!entity_type) {
        throw new Error("ifc_schema requires entity_type.");
      }

      return tools.bim.ifc.runMCPTool(modelName, "ifc_schema", { entity_type });
    },

    ifc_quantify(args) {
      const modelName = requireModelName(context, args, "ifc_quantify");
      const rule = typeof args.rule === "string" ? args.rule : "";

      if (!rule) {
        throw new Error("ifc_quantify requires rule.");
      }

      const mcpArgs = { rule };

      if (typeof args.selector === "string" && args.selector.length > 0) {
        mcpArgs.selector = args.selector;
      }

      return tools.bim.ifc.runMCPTool(modelName, "ifc_quantify", mcpArgs);
    },

    ifc_contexts(args) {
      const modelName = requireModelName(context, args, "ifc_contexts");
      return tools.bim.ifc.runMCPTool(modelName, "ifc_contexts", {});
    },

    ifc_materials(args) {
      const modelName = requireModelName(context, args, "ifc_materials");
      return tools.bim.ifc.runMCPTool(modelName, "ifc_materials", {});
    },
  };
}

export { IfcOpenShellToolsContext };
