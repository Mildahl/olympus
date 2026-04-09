const DEFAULT_MODEL_ID = "openai:gpt-4o-mini";

const MODEL_PROVIDERS = {
  openai: {
    label: "OpenAI",
    endpoint: "https://api.openai.com/v1/responses",
    models: [
      { id: "gpt-4o", label: "GPT-4o", contextWindow: 128000 },
      { id: "gpt-4o-mini", label: "GPT-4o Mini", contextWindow: 128000 },
      { id: "gpt-4.1", label: "GPT-4.1", contextWindow: 1000000 },
      { id: "gpt-4.1-mini", label: "GPT-4.1 Mini", contextWindow: 1000000 },
    ],
  },
  gemini: {
    label: "Google Gemini",
    endpoint: "https://generativelanguage.googleapis.com/v1beta",
    models: [
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", contextWindow: 1000000 },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", contextWindow: 1000000 },
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", contextWindow: 1000000 },
      { id: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash-Lite", contextWindow: 1000000 },
    ],
  },
  anthropic: {
    label: "Anthropic",
    endpoint: "https://api.anthropic.com/v1/messages",
    models: [
      { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5", contextWindow: 200000 },
      { id: "claude-3-7-sonnet-20250219", label: "Claude 3.7 Sonnet", contextWindow: 200000 },
      { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet", contextWindow: 200000 },
    ],
  },
  deepseek: {
    label: "DeepSeek",
    endpoint: "https://api.deepseek.com/chat/completions",
    models: [
      { id: "deepseek-chat", label: "DeepSeek Chat", contextWindow: 128000 },
    ],
  },
};

const DEFAULT_MODEL_INFO = (() => {
  const colonIndex = DEFAULT_MODEL_ID.indexOf(":");
  const providerId = DEFAULT_MODEL_ID.slice(0, colonIndex);
  const modelName = DEFAULT_MODEL_ID.slice(colonIndex + 1);
  const provider = MODEL_PROVIDERS[providerId];
  const modelEntry = provider.models.find((m) => m.id === modelName);

  return {
    providerId,
    modelName,
    endpoint: provider.endpoint,
    providerLabel: provider.label,
    contextWindow: modelEntry.contextWindow,
  };
})();

function getModelOptions() {
  const options = {};

  for (const [providerId, provider] of Object.entries(MODEL_PROVIDERS)) {
    for (const model of provider.models) {
      const fullId = `${providerId}:${model.id}`;

      options[fullId] = `${provider.label} - ${model.label}`;
    }
  }

  return options;
}

function resolveModelInfo(modelId) {
  if (!modelId || typeof modelId !== "string") {
    return DEFAULT_MODEL_INFO;
  }

  const colonIndex = modelId.indexOf(":");

  if (colonIndex === -1) {
    return DEFAULT_MODEL_INFO;
  }

  const providerId = modelId.slice(0, colonIndex);
  const modelName = modelId.slice(colonIndex + 1);
  const provider = MODEL_PROVIDERS[providerId];

  if (!provider) {
    return DEFAULT_MODEL_INFO;
  }

  const modelEntry = provider.models.find((m) => m.id === modelName);
  const contextWindow = modelEntry ? modelEntry.contextWindow : 128000;

  return {
    providerId,
    modelName,
    endpoint: provider.endpoint,
    providerLabel: provider.label,
    contextWindow,
  };
}

function estimateContextUsage(inputItems, systemInstructions, modelId, draftPrompt = "", toolDefinitions = null) {
  const historyText = Array.isArray(inputItems) ? JSON.stringify(inputItems) : "";
  const sysText = typeof systemInstructions === "string" ? systemInstructions : "";
  const promptText = typeof draftPrompt === "string" ? draftPrompt : "";
  const toolsText = Array.isArray(toolDefinitions) ? JSON.stringify(toolDefinitions) : "";

  const sysTokens = Math.ceil(sysText.length / 4);
  const toolsTokens = Math.ceil(toolsText.length / 4);
  const messagesTokens = Math.ceil((historyText.length + promptText.length) / 4);
  const estimatedTokens = sysTokens + toolsTokens + messagesTokens;

  const modelInfo = resolveModelInfo(modelId);
  const contextWindow = modelInfo.contextWindow;
  const percent = contextWindow > 0 ? Math.min(100, Math.round((estimatedTokens / contextWindow) * 100)) : 0;

  const sysPercent = contextWindow > 0 ? Math.min(100, parseFloat(((sysTokens / contextWindow) * 100).toFixed(1))) : 0;
  const toolsPercent = contextWindow > 0 ? Math.min(100, parseFloat(((toolsTokens / contextWindow) * 100).toFixed(1))) : 0;
  const messagesPercent = contextWindow > 0 ? Math.min(100, parseFloat(((messagesTokens / contextWindow) * 100).toFixed(1))) : 0;

  return {
    estimatedTokens,
    contextWindow,
    percent,
    breakdown: {
      systemInstructions: { tokens: sysTokens, percent: sysPercent },
      toolDefinitions: { tokens: toolsTokens, percent: toolsPercent },
      messages: { tokens: messagesTokens, percent: messagesPercent },
    },
  };
}

function formatTokenCount(n) {
  if (n >= 1000000) {
    return `${(n / 1000000).toFixed(1)}M`;
  }

  if (n >= 1000) {
    return `${Math.round(n / 1000)}k`;
  }

  return String(n);
}

export {
  DEFAULT_MODEL_ID,
  MODEL_PROVIDERS,
  getModelOptions,
  resolveModelInfo,
  estimateContextUsage,
  formatTokenCount,
};
