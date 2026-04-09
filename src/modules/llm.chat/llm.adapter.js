import {
  bimChatDefaultInstructionBlocks,
  buildBimChatActiveModelLines,
  stitchInstructionBlocks,
} from "./llm.instructions.js";
import { getCurrentActiveModelName } from "./llm.ifcModelContext.js";
import { integrateBimChatTools, normalizeEnabledToolSet } from "./llm.chatCatalog.js";

function buildBIMChatInstructions(context) {
  const activeModelName = getCurrentActiveModelName(context);

  return stitchInstructionBlocks([
    ...bimChatDefaultInstructionBlocks,
    buildBimChatActiveModelLines(activeModelName),
  ]);
}

function getBIMChatConfig(context) {
  const appConfig = context && context.config ? context.config.app : null;
  const llmChatConfig = appConfig && appConfig.LLMChat ? appConfig.LLMChat : {};
  const bimConfig = llmChatConfig && llmChatConfig.bim ? llmChatConfig.bim : {};

  const systemInstructions = typeof bimConfig.systemInstructions === "string" ? bimConfig.systemInstructions : "";
  const maxIterations = Number.isFinite(Number(llmChatConfig.maxIterations))
    ? Number(llmChatConfig.maxIterations)
    : 64;

  return {
    systemInstructions,
    maxIterations,
  };
}

function createBIMChatAdapter({ context, tools, enabledToolNames }) {
  const integrated = integrateBimChatTools(context, tools);
  const enabledToolSet = normalizeEnabledToolSet(enabledToolNames);
  const toolDefinitions = enabledToolSet === null
    ? integrated.allToolDefinitions
    : integrated.allToolDefinitions.filter((toolDefinition) => enabledToolSet.has(toolDefinition.name));

  async function executeToolCall(functionCall, parsedArguments) {
    const toolName = functionCall && typeof functionCall.name === "string" ? functionCall.name : "";
    const toolArguments = parsedArguments && typeof parsedArguments === "object" ? parsedArguments : {};
    const handler = integrated.mergedHandlers[toolName];

    if (enabledToolSet !== null && !enabledToolSet.has(toolName)) {
      throw new Error(`Tool is disabled by UI configuration: ${toolName}`);
    }

    if (!handler) {
      throw new Error(`Unsupported chat tool: ${toolName}`);
    }

    return handler(toolArguments);
  }

  return {
    getToolDefinitions: () => toolDefinitions,
    getSystemInstructions: () => buildBIMChatInstructions(context),
    executeToolCall,
  };
}

export { createBIMChatAdapter, getBIMChatConfig };
