import { Operator } from "../../operators/Operator.js";

import AECO_TOOLS from "../../tool/index.js";

import * as LLMChatCore from "../../core/llm.chat.js";

import { createBIMChatAdapter } from "./llm.js";

function dispatchLLMConnectionSignal(context, payload) {
  context.signals.llmAPIConnected.dispatch(payload);
}

function dispatchLLMToolEventSignal(context, payload) {
  if (!context || !context.signals || !context.signals.llmChatToolEvent) {
    return;
  }

  context.signals.llmChatToolEvent.dispatch(payload);
}

class LLM_ChatToolCall extends Operator {
  static operatorName = "llm.chat.tool_call";

  static operatorLabel = "LLM Chat Tool Call";

  static operatorOptions = ["REGISTER"];

  constructor(context, options) {
    super(context);

    const safeOptions = options && typeof options === "object" ? options : {};

    this.context = context;
    this.functionCall = safeOptions.functionCall && typeof safeOptions.functionCall === "object"
      ? safeOptions.functionCall
      : null;
    this.parsedArguments = safeOptions.parsedArguments && typeof safeOptions.parsedArguments === "object"
      ? safeOptions.parsedArguments
      : {};
    this.enabledToolNames = Array.isArray(safeOptions.enabledToolNames)
      ? safeOptions.enabledToolNames.filter((name) => typeof name === "string")
      : null;
  }

  poll() {
    return Boolean(AECO_TOOLS.code.pyWorker.initialized.bim && this.functionCall);
  }

  async execute() {
    const adapter = createBIMChatAdapter({
      context: this.context,
      tools: AECO_TOOLS,
      enabledToolNames: this.enabledToolNames,
    });

    const result = await adapter.executeToolCall(this.functionCall, this.parsedArguments);

    return { status: "FINISHED", result };
  }
}

class LLM_ChatTurn extends Operator {
  static operatorName = "llm.chat.turn";

  static operatorLabel = "LLM Chat Turn";

  static operatorOptions = ["REGISTER"];

  constructor(context, options) {
    super(context);

    const safeOptions = options && typeof options === "object" ? options : {};

    this.context = context;
    this.userText = typeof safeOptions.userText === "string" ? safeOptions.userText : "";
    this.inputItems = Array.isArray(safeOptions.inputItems) ? safeOptions.inputItems : [];
    this.apiKey = typeof safeOptions.apiKey === "string" ? safeOptions.apiKey : "";
    this.modelName = typeof safeOptions.modelName === "string" ? safeOptions.modelName : "";
    this.apiEndpoint = typeof safeOptions.apiEndpoint === "string" ? safeOptions.apiEndpoint : "";
    this.systemInstructions = typeof safeOptions.systemInstructions === "string" ? safeOptions.systemInstructions : "";
    this.turnId = typeof safeOptions.turnId === "string" ? safeOptions.turnId : "";
    this.activeModelName = typeof safeOptions.activeModelName === "string" ? safeOptions.activeModelName : "";
    this.maxIterations = Number.isFinite(Number(safeOptions.maxIterations))
      ? Number(safeOptions.maxIterations)
      : 64;
    this.enabledToolNames = Array.isArray(safeOptions.enabledToolNames)
      ? safeOptions.enabledToolNames.filter((name) => typeof name === "string")
      : null;
  }

  poll() {
    const bimReady = Boolean(AECO_TOOLS.code.pyWorker.initialized.bim);
    const hasUserText = this.userText.trim().length > 0;
    const hasApiKey = this.apiKey.trim().length > 0;
    const hasModelName = this.modelName.trim().length > 0;

    if (!bimReady) {
      throw new Error("BIM is not ready");
    }
    if (!hasUserText) {
      throw new Error("No user text");
    }
    if (!hasApiKey) {
      throw new Error("No API key");
    }
    if (!hasModelName) {
      throw new Error("No model name");
    }

    return true;
  }

  async execute() {
    if (this.activeModelName && this.context && this.context.ifc) {
      this.context.ifc.activeModel = this.activeModelName;
    }

    const adapter = createBIMChatAdapter({
      context: this.context,
      tools: AECO_TOOLS,
      enabledToolNames: this.enabledToolNames,
    });

    try {
      const result = await LLMChatCore.runChatTurn(this.userText, {
        inputItems: this.inputItems,
        apiKey: this.apiKey,
        modelName: this.modelName,
        apiEndpoint: this.apiEndpoint,
        maxIterations: this.maxIterations,
        systemInstructions: this.systemInstructions,
        adapter,
        onConnectionState: (payload) => {
          dispatchLLMConnectionSignal(this.context, payload);
        },
        onToolEvent: (payload) => {
          dispatchLLMToolEventSignal(this.context, {
            ...payload,
            turnId: this.turnId,
          });
        },
      });

      return { status: "FINISHED", result };
    } catch (error) {
      dispatchLLMConnectionSignal(this.context, {
        connected: false,
        modelName: this.modelName,
        apiEndpoint: this.apiEndpoint,
        error: error && error.message ? error.message : String(error),
        source: "chat_turn",
        checkedAt: Date.now(),
      });

      throw error;
    }
  }
}

class LLM_ChatCheckConnection extends Operator {
  static operatorName = "llm.chat.check_connection";

  static operatorLabel = "LLM Chat Check Connection";

  static operatorOptions = ["REGISTER"];

  constructor(context, options) {
    super(context);

    const safeOptions = options && typeof options === "object" ? options : {};

    this.context = context;
    this.apiKey = typeof safeOptions.apiKey === "string" ? safeOptions.apiKey : "";
    this.modelName = typeof safeOptions.modelName === "string" ? safeOptions.modelName : "";
    this.apiEndpoint = typeof safeOptions.apiEndpoint === "string" ? safeOptions.apiEndpoint : "";
  }

  poll() {
    const hasApiKey = this.apiKey.trim().length > 0;
    const hasModelName = this.modelName.trim().length > 0;

    return hasApiKey && hasModelName;
  }

  async execute() {
    try {
      const result = await LLMChatCore.checkChatConnection({
        apiEndpoint: this.apiEndpoint,
        apiKey: this.apiKey,
        modelName: this.modelName,
        onConnectionState: (payload) => {
          dispatchLLMConnectionSignal(this.context, payload);
        },
      });

      return {
        status: "FINISHED",
        result,
      };
    } catch (error) {
      const result = {
        connected: false,
        modelName: this.modelName,
        apiEndpoint: this.apiEndpoint,
        error: error && error.message ? error.message : String(error),
        source: "health_check",
        checkedAt: Date.now(),
      };

      dispatchLLMConnectionSignal(this.context, result);

      return {
        status: "FINISHED",
        result,
      };
    }
  }
}

export default [LLM_ChatToolCall, LLM_ChatTurn, LLM_ChatCheckConnection];
