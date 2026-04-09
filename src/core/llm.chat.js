const DEFAULT_RESPONSE_ENDPOINT = "https://api.openai.com/v1/responses";

const DEFAULT_REQUEST_TIMEOUT_MS = 45000;

const DEFAULT_CONNECTION_TIMEOUT_MS = 12000;

const DEFAULT_CONTEXT_CHAR_BUDGET = 72000;

const RETRY_CONTEXT_CHAR_BUDGET = 36000;

const DEFAULT_CONTEXT_ITEM_LIMIT = 120;

const RETRY_CONTEXT_ITEM_LIMIT = 56;

const DEFAULT_MIN_CONTEXT_ITEMS = 8;

const DEFAULT_TOOL_OUTPUT_CHAR_LIMIT = 12000;

const RETRY_TOOL_OUTPUT_CHAR_LIMIT = 4000;

const TOOL_EVENT_RESULT_CHAR_LIMIT = 40000;

const TOOL_EVENT_THOUGHT_CHAR_LIMIT = 8000;

const MAX_DIRECT_TEXT_CHAR_LIMIT = 32000;

const MAX_FUNCTION_ARGUMENT_CHAR_LIMIT = 16000;

const REQUEST_ENVELOPE_CHAR_OVERHEAD = 4000;

const MIN_INPUT_CHAR_BUDGET = 8000;

function safeJSONStringify(value) {
  try {
    const text = JSON.stringify(value);

    if (typeof text === "string") {
      return text;
    }

    return JSON.stringify(String(value));
  } catch (error) {
    return JSON.stringify({
      error: "Failed to serialize value",
    });
  }
}

function getApproximateCharSize(value) {
  return safeJSONStringify(value).length;
}

function truncateTextMiddle(text, maxChars) {
  if (typeof text !== "string") {
    return "";
  }

  const numericMaxChars = Number(maxChars);
  const resolvedMaxChars = Number.isFinite(numericMaxChars) && numericMaxChars > 0
    ? Math.floor(numericMaxChars)
    : MAX_DIRECT_TEXT_CHAR_LIMIT;

  if (text.length <= resolvedMaxChars) {
    return text;
  }

  const headChars = Math.max(32, Math.floor(resolvedMaxChars * 0.7));
  const tailChars = Math.max(16, resolvedMaxChars - headChars - 48);
  const removedChars = Math.max(0, text.length - headChars - tailChars);
  const head = text.slice(0, headChars);
  const tail = text.slice(Math.max(0, text.length - tailChars));

  return `${head}\n...[truncated ${removedChars} chars]...\n${tail}`;
}

function sanitizeToolOutputForContext(outputValue, maxChars = DEFAULT_TOOL_OUTPUT_CHAR_LIMIT) {
  const serializedOutput = typeof outputValue === "string" ? outputValue : safeJSONStringify(outputValue);
  const numericMaxChars = Number(maxChars);
  const resolvedMaxChars = Number.isFinite(numericMaxChars) && numericMaxChars > 0
    ? Math.floor(numericMaxChars)
    : DEFAULT_TOOL_OUTPUT_CHAR_LIMIT;

  if (serializedOutput.length <= resolvedMaxChars) {
    return serializedOutput;
  }

  const previewChars = Math.max(512, resolvedMaxChars - 240);
  const compactedOutput = safeJSONStringify({
    truncated: true,
    reason: "tool_output_compacted_for_context_budget",
    originalChars: serializedOutput.length,
    preview: truncateTextMiddle(serializedOutput, previewChars),
  });

  if (compactedOutput.length <= resolvedMaxChars) {
    return compactedOutput;
  }

  return truncateTextMiddle(compactedOutput, resolvedMaxChars);
}

function sanitizeToolEventResult(toolResult, maxChars = TOOL_EVENT_RESULT_CHAR_LIMIT) {
  const serialized = safeJSONStringify(toolResult);
  const numericMaxChars = Number(maxChars);
  const resolvedMaxChars = Number.isFinite(numericMaxChars) && numericMaxChars > 0
    ? Math.floor(numericMaxChars)
    : TOOL_EVENT_RESULT_CHAR_LIMIT;

  if (serialized.length <= resolvedMaxChars) {
    return toolResult;
  }

  return {
    truncated: true,
    reason: "tool_result_compacted_for_ui",
    originalChars: serialized.length,
    preview: truncateTextMiddle(serialized, Math.max(1024, resolvedMaxChars - 240)),
  };
}

function sanitizeConversationItemForContext(item, { maxToolOutputChars = DEFAULT_TOOL_OUTPUT_CHAR_LIMIT } = {}) {
  if (!item || typeof item !== "object") {
    return item;
  }

  if (item.type === "function_call_output") {
    return {
      ...item,
      output: sanitizeToolOutputForContext(item.output, maxToolOutputChars),
    };
  }

  if (item.type === "function_call" && typeof item.arguments === "string") {
    return {
      ...item,
      arguments: truncateTextMiddle(item.arguments, MAX_FUNCTION_ARGUMENT_CHAR_LIMIT),
    };
  }

  if ((item.role === "user" || item.role === "assistant") && typeof item.content === "string") {
    return {
      ...item,
      content: truncateTextMiddle(item.content, MAX_DIRECT_TEXT_CHAR_LIMIT),
    };
  }

  if (item.type === "message" && item.role === "assistant" && Array.isArray(item.content)) {
    return {
      ...item,
      content: item.content.map((contentItem) => {
        if (!contentItem || typeof contentItem !== "object") {
          return contentItem;
        }

        if (contentItem.type === "output_text" && typeof contentItem.text === "string") {
          return {
            ...contentItem,
            text: truncateTextMiddle(contentItem.text, MAX_DIRECT_TEXT_CHAR_LIMIT),
          };
        }

        return contentItem;
      }),
    };
  }

  return item;
}

function resolveInputCharBudget({ instructions, tools, maxTotalChars }) {
  const numericMaxTotalChars = Number(maxTotalChars);
  const resolvedMaxTotalChars = Number.isFinite(numericMaxTotalChars) && numericMaxTotalChars > 0
    ? Math.floor(numericMaxTotalChars)
    : DEFAULT_CONTEXT_CHAR_BUDGET;
  const instructionChars = typeof instructions === "string" ? instructions.length : 0;
  const toolChars = getApproximateCharSize(Array.isArray(tools) ? tools : []);
  const availableChars = resolvedMaxTotalChars - instructionChars - toolChars - REQUEST_ENVELOPE_CHAR_OVERHEAD;

  return Math.max(MIN_INPUT_CHAR_BUDGET, availableChars);
}

function buildBudgetedInputItems(
  conversationItems,
  {
    instructions,
    tools,
    maxTotalChars = DEFAULT_CONTEXT_CHAR_BUDGET,
    maxItems = DEFAULT_CONTEXT_ITEM_LIMIT,
    minItems = DEFAULT_MIN_CONTEXT_ITEMS,
    maxToolOutputChars = DEFAULT_TOOL_OUTPUT_CHAR_LIMIT,
  }
) {
  const items = Array.isArray(conversationItems) ? conversationItems : [];

  if (items.length === 0) {
    return [];
  }

  const numericMaxItems = Number(maxItems);
  const resolvedMaxItems = Number.isFinite(numericMaxItems) && numericMaxItems > 0
    ? Math.floor(numericMaxItems)
    : DEFAULT_CONTEXT_ITEM_LIMIT;
  const windowStart = Math.max(0, items.length - resolvedMaxItems);
  const itemOptions = { maxToolOutputChars };
  const budgetedItems = items
    .slice(windowStart)
    .map((item) => sanitizeConversationItemForContext(item, itemOptions));

  // Preserve paired call metadata if the trimmed window starts with tool output.
  if (windowStart > 0 && budgetedItems[0] && budgetedItems[0].type === "function_call_output") {
    const precedingItem = sanitizeConversationItemForContext(items[windowStart - 1], itemOptions);
    budgetedItems.unshift(precedingItem);
  }

  const maxInputChars = resolveInputCharBudget({
    instructions,
    tools,
    maxTotalChars,
  });
  const resolvedMinItems = Math.min(
    budgetedItems.length,
    Math.max(1, Math.floor(Number.isFinite(Number(minItems)) ? Number(minItems) : DEFAULT_MIN_CONTEXT_ITEMS))
  );

  while (budgetedItems.length > resolvedMinItems && getApproximateCharSize(budgetedItems) > maxInputChars) {
    const firstItem = budgetedItems[0];
    const secondItem = budgetedItems[1];
    const dropPair = firstItem
      && secondItem
      && firstItem.type === "function_call"
      && secondItem.type === "function_call_output"
      && typeof firstItem.call_id === "string"
      && firstItem.call_id === secondItem.call_id;

    budgetedItems.splice(0, dropPair ? 2 : 1);
  }

  if (getApproximateCharSize(budgetedItems) <= maxInputChars) {
    return budgetedItems;
  }

  for (let index = 0; index < budgetedItems.length; index += 1) {
    const item = budgetedItems[index];

    if (item && item.type === "function_call_output") {
      budgetedItems[index] = {
        ...item,
        output: sanitizeToolOutputForContext(item.output, Math.max(400, Math.floor(maxToolOutputChars / 3))),
      };
    }
  }

  while (budgetedItems.length > 1 && getApproximateCharSize(budgetedItems) > maxInputChars) {
    budgetedItems.shift();
  }

  return budgetedItems;
}

function isLikelyRequestTooLargeError(error) {
  const status = error && typeof error.status === "number" ? error.status : null;
  const message = normalizeErrorMessage(error).toLowerCase();

  if (status === 413 || status === 414) {
    return true;
  }

  if (status === 429 && /token|tpm|requested|input|output|context/.test(message)) {
    return true;
  }

  return /request too large|context length|too many tokens|maximum context length|input or output tokens must be reduced|token limit|prompt is too long|requested\s+\d+/.test(message);
}

function createCompactedContextError(error) {
  const providerMessage = normalizeErrorMessage(error);
  const compactedError = /** @type {Error & { status?: number }} */ (
    new Error(
      `LLM request exceeded provider token limits even after compacting chat context. Start a new chat or narrow the request. Provider details: ${providerMessage}`
    )
  );

  if (error && typeof error.status === "number") {
    compactedError.status = error.status;
  }

  return compactedError;
}

function extractAssistantText(responseOutput) {
  const outputItems = Array.isArray(responseOutput) ? responseOutput : [];
  const textParts = [];

  for (const outputItem of outputItems) {
    if (!outputItem || outputItem.type !== "message" || outputItem.role !== "assistant") {
      continue;
    }

    const contentItems = Array.isArray(outputItem.content) ? outputItem.content : [];

    for (const contentItem of contentItems) {
      if (contentItem && contentItem.type === "output_text" && typeof contentItem.text === "string") {
        textParts.push(contentItem.text);
      }
    }
  }

  return textParts.join("\n").trim();
}

function extractModelThoughtText(responseOutput, assistantText = "") {
  const outputItems = Array.isArray(responseOutput) ? responseOutput : [];
  const thoughtParts = [];

  const appendThoughtPart = (textValue) => {
    if (typeof textValue !== "string") {
      return;
    }

    const trimmed = textValue.trim();

    if (trimmed.length > 0) {
      thoughtParts.push(trimmed);
    }
  };

  for (const outputItem of outputItems) {
    if (!outputItem || typeof outputItem !== "object") {
      continue;
    }

    if (outputItem.type === "reasoning") {
      appendThoughtPart(outputItem.text);
      appendThoughtPart(outputItem.summary);

      const summaryItems = Array.isArray(outputItem.summary) ? outputItem.summary : [];

      for (const summaryItem of summaryItems) {
        if (!summaryItem || typeof summaryItem !== "object") {
          continue;
        }

        appendThoughtPart(summaryItem.text);
      }

      continue;
    }

    if (outputItem.type === "message" && outputItem.role === "assistant") {
      const contentItems = Array.isArray(outputItem.content) ? outputItem.content : [];

      for (const contentItem of contentItems) {
        if (!contentItem || typeof contentItem !== "object") {
          continue;
        }

        if (contentItem.type === "reasoning" || contentItem.type === "summary_text") {
          appendThoughtPart(contentItem.text);
        }
      }
    }
  }

  appendThoughtPart(assistantText);

  if (thoughtParts.length === 0) {
    return "";
  }

  const dedupedThoughtParts = [];
  const seenThoughtParts = new Set();

  for (const thoughtPart of thoughtParts) {
    const normalizedThoughtPart = thoughtPart.toLowerCase();

    if (seenThoughtParts.has(normalizedThoughtPart)) {
      continue;
    }

    seenThoughtParts.add(normalizedThoughtPart);
    dedupedThoughtParts.push(thoughtPart);
  }

  return truncateTextMiddle(dedupedThoughtParts.join("\n\n"), TOOL_EVENT_THOUGHT_CHAR_LIMIT);
}

function parseFunctionCallArguments(argumentsText) {
  if (typeof argumentsText !== "string" || argumentsText.length === 0) {
    return {};
  }

  try {
    const parsed = JSON.parse(argumentsText);

    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch (error) {
    return {};
  }

  return {};
}

function normalizeErrorMessage(error) {
  if (error && typeof error.message === "string" && error.message.length > 0) {
    return error.message;
  }

  return String(error || "Unknown error");
}

function extractErrorMessageFromPayload(payload) {
  if (!payload) {
    return "";
  }

  if (typeof payload === "string") {
    return payload.trim();
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const message = extractErrorMessageFromPayload(item);

      if (message) {
        return message;
      }
    }

    return "";
  }

  if (typeof payload !== "object") {
    return "";
  }

  if (typeof payload.message === "string" && payload.message.trim().length > 0) {
    return payload.message.trim();
  }

  if (payload.error) {
    const nestedMessage = extractErrorMessageFromPayload(payload.error);

    if (nestedMessage) {
      return nestedMessage;
    }
  }

  if (payload.detail) {
    const detailMessage = extractErrorMessageFromPayload(payload.detail);

    if (detailMessage) {
      return detailMessage;
    }
  }

  return "";
}

function getProviderErrorMessage(errorText) {
  const trimmedText = typeof errorText === "string" ? errorText.trim() : "";

  if (!trimmedText) {
    return "";
  }

  try {
    const parsed = JSON.parse(trimmedText);
    return extractErrorMessageFromPayload(parsed) || trimmedText;
  } catch (error) {
    return trimmedText;
  }
}

function emitConnectionState(onConnectionState, payload) {
  if (typeof onConnectionState !== "function") {
    return;
  }

  try {
    onConnectionState(payload);
  } catch (error) {
    console.warn("Failed to report LLM connection state:", error);
  }
}

function normalizeConnectionPayload({ connected, modelName, apiEndpoint, error, source }) {
  return {
    connected: Boolean(connected),
    modelName: typeof modelName === "string" ? modelName : "",
    apiEndpoint: typeof apiEndpoint === "string" ? apiEndpoint : DEFAULT_RESPONSE_ENDPOINT,
    error: typeof error === "string" && error.length > 0 ? error : null,
    source: typeof source === "string" && source.length > 0 ? source : "unknown",
    checkedAt: Date.now(),
  };
}

function buildResponseRequestBody({ modelName, instructions, tools, inputItems }) {
  return {
    model: modelName,
    instructions,
    tools,
    input: inputItems,
  };
}

function isChatCompletionsEndpoint(endpoint) {
  return typeof endpoint === "string" && endpoint.includes("/chat/completions");
}

function isGeminiNativeEndpoint(endpoint) {
  return typeof endpoint === "string"
    && endpoint.includes("generativelanguage.googleapis.com")
    && !endpoint.includes("/openai/");
}

function isAnthropicEndpoint(endpoint) {
  return typeof endpoint === "string" && endpoint.includes("api.anthropic.com");
}

function convertToolsToChatCompletions(tools) {
  if (!Array.isArray(tools)) {
    return [];
  }

  return tools.map((tool) => {
    if (tool && tool.type === "function") {
      return {
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      };
    }

    return tool;
  });
}

function convertInputToChatMessages(instructions, inputItems) {
  const messages = [];

  if (typeof instructions === "string" && instructions.length > 0) {
    messages.push({ role: "system", content: instructions });
  }

  const items = Array.isArray(inputItems) ? inputItems : [];

  for (const item of items) {
    if (!item) {
      continue;
    }

    if (item.role === "user" || (item.role === "assistant" && !item.type)) {
      if (typeof item.content === "string") {
        messages.push({ role: item.role, content: item.content });
      } else if (Array.isArray(item.content)) {
        const text = item.content
          .filter((c) => c && c.type === "output_text" && typeof c.text === "string")
          .map((c) => c.text)
          .join("\n");

        if (text) {
          messages.push({ role: item.role, content: text });
        }
      }

      continue;
    }

    if (item.type === "message" && item.role === "assistant") {
      const contentItems = Array.isArray(item.content) ? item.content : [];
      const text = contentItems
        .filter((c) => c && c.type === "output_text" && typeof c.text === "string")
        .map((c) => c.text)
        .join("\n");

      if (text) {
        messages.push({ role: "assistant", content: text });
      }

      continue;
    }

    if (item.type === "function_call") {
      let lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;

      if (!lastMsg || lastMsg.role !== "assistant" || !lastMsg.tool_calls) {
        lastMsg = { role: "assistant", content: null, tool_calls: [] };
        messages.push(lastMsg);
      }

      lastMsg.tool_calls.push({
        id: item.call_id,
        type: "function",
        function: {
          name: item.name,
          arguments: typeof item.arguments === "string"
            ? item.arguments
            : JSON.stringify(item.arguments || {}),
        },
      });

      continue;
    }

    if (item.type === "function_call_output") {
      messages.push({
        role: "tool",
        tool_call_id: item.call_id,
        content: typeof item.output === "string" ? item.output : JSON.stringify(item.output),
      });

      continue;
    }
  }

  return messages;
}

function buildChatCompletionsRequestBody({ modelName, instructions, tools, inputItems }) {
  const body = {
    model: modelName,
    messages: convertInputToChatMessages(instructions, inputItems),
  };

  const convertedTools = convertToolsToChatCompletions(tools);

  if (convertedTools.length > 0) {
    body.tools = convertedTools;
  }

  return body;
}

function convertChatCompletionsResponse(ccResponse) {
  const output = [];
  const choices = Array.isArray(ccResponse.choices) ? ccResponse.choices : [];

  for (const choice of choices) {
    const message = choice && choice.message ? choice.message : null;

    if (!message) {
      continue;
    }

    const reasoningCandidates = [];

    if (typeof message.reasoning_content === "string") {
      reasoningCandidates.push(message.reasoning_content);
    }

    if (typeof message.reasoning === "string") {
      reasoningCandidates.push(message.reasoning);
    }

    if (typeof message.thinking === "string") {
      reasoningCandidates.push(message.thinking);
    }

    if (Array.isArray(message.reasoning)) {
      for (const reasoningItem of message.reasoning) {
        if (typeof reasoningItem === "string") {
          reasoningCandidates.push(reasoningItem);
          continue;
        }

        if (reasoningItem && typeof reasoningItem === "object") {
          if (typeof reasoningItem.text === "string") {
            reasoningCandidates.push(reasoningItem.text);
          }

          if (typeof reasoningItem.content === "string") {
            reasoningCandidates.push(reasoningItem.content);
          }
        }
      }
    } else if (message.reasoning && typeof message.reasoning === "object") {
      if (typeof message.reasoning.text === "string") {
        reasoningCandidates.push(message.reasoning.text);
      }

      if (typeof message.reasoning.content === "string") {
        reasoningCandidates.push(message.reasoning.content);
      }
    }

    for (const reasoningText of reasoningCandidates) {
      const trimmedReasoningText = typeof reasoningText === "string" ? reasoningText.trim() : "";

      if (!trimmedReasoningText) {
        continue;
      }

      output.push({
        type: "reasoning",
        summary: [{ type: "summary_text", text: truncateTextMiddle(trimmedReasoningText, TOOL_EVENT_THOUGHT_CHAR_LIMIT) }],
      });
    }

    if (typeof message.content === "string" && message.content.length > 0) {
      output.push({
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: message.content }],
      });
    }

    if (Array.isArray(message.tool_calls)) {
      for (const toolCall of message.tool_calls) {
        if (toolCall && toolCall.type === "function" && toolCall.function) {
          output.push({
            type: "function_call",
            call_id: toolCall.id,
            name: toolCall.function.name,
            arguments: toolCall.function.arguments,
          });
        }
      }
    }
  }

  return { output };
}

function convertToolsToGemini(tools) {
  if (!Array.isArray(tools) || tools.length === 0) {
    return [];
  }

  const declarations = [];

  for (const tool of tools) {
    if (tool && tool.type === "function") {
      declarations.push({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      });
    }
  }

  if (declarations.length === 0) {
    return [];
  }

  return [{ functionDeclarations: declarations }];
}

function convertInputToGeminiContents(inputItems) {
  const contents = [];
  const items = Array.isArray(inputItems) ? inputItems : [];

  for (const item of items) {
    if (!item) {
      continue;
    }

    if (item.role === "user") {
      const text = typeof item.content === "string" ? item.content : "";

      if (text) {
        contents.push({ role: "user", parts: [{ text }] });
      }

      continue;
    }

    if (item.role === "assistant" && !item.type) {
      const text = typeof item.content === "string" ? item.content : "";

      if (text) {
        contents.push({ role: "model", parts: [{ text }] });
      }

      continue;
    }

    if (item.type === "message" && item.role === "assistant") {
      const contentItems = Array.isArray(item.content) ? item.content : [];
      const text = contentItems
        .filter((c) => c && c.type === "output_text" && typeof c.text === "string")
        .map((c) => c.text)
        .join("\n");

      if (text) {
        contents.push({ role: "model", parts: [{ text }] });
      }

      continue;
    }

    if (item.type === "function_call") {
      const args = typeof item.arguments === "string"
        ? parseFunctionCallArguments(item.arguments)
        : (item.arguments || {});

      contents.push({
        role: "model",
        parts: [{ functionCall: { name: item.name, args } }],
      });

      continue;
    }

    if (item.type === "function_call_output") {
      let parsedOutput;

      try {
        parsedOutput = typeof item.output === "string" ? JSON.parse(item.output) : item.output;
      } catch (error) {
        parsedOutput = { result: item.output };
      }

      contents.push({
        role: "user",
        parts: [{
          functionResponse: {
            name: item._toolName || "unknown",
            response: parsedOutput,
          },
        }],
      });

      continue;
    }
  }

  return contents;
}

function buildGeminiRequestBody({ modelName, instructions, tools, inputItems }) {
  const body = {
    contents: convertInputToGeminiContents(inputItems),
  };

  if (typeof instructions === "string" && instructions.length > 0) {
    body.systemInstruction = { parts: [{ text: instructions }] };
  }

  const geminiTools = convertToolsToGemini(tools);

  if (geminiTools.length > 0) {
    body.tools = geminiTools;
  }

  return body;
}

function convertGeminiResponse(geminiResponse) {
  const output = [];
  const candidates = Array.isArray(geminiResponse.candidates) ? geminiResponse.candidates : [];

  for (const candidate of candidates) {
    const content = candidate && candidate.content ? candidate.content : null;

    if (!content || !Array.isArray(content.parts)) {
      continue;
    }

    for (const part of content.parts) {
      if (!part) {
        continue;
      }

      if (typeof part.text === "string" && part.text.length > 0) {
        output.push({
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: part.text }],
        });
      }

      if (part.functionCall) {
        output.push({
          type: "function_call",
          call_id: `gemini_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: part.functionCall.name,
          arguments: JSON.stringify(part.functionCall.args || {}),
        });
      }
    }
  }

  return { output };
}

function convertToolsToAnthropic(tools) {
  if (!Array.isArray(tools)) {
    return [];
  }

  return tools.map((tool) => {
    if (tool && tool.type === "function") {
      return {
        name: tool.name,
        description: tool.description,
        input_schema: tool.parameters,
      };
    }

    return tool;
  });
}

function convertInputToAnthropicMessages(inputItems) {
  const messages = [];
  const items = Array.isArray(inputItems) ? inputItems : [];

  for (const item of items) {
    if (!item) {
      continue;
    }

    if (item.role === "user") {
      const text = typeof item.content === "string" ? item.content : "";

      if (text) {
        messages.push({ role: "user", content: text });
      }

      continue;
    }

    if (item.role === "assistant" && !item.type) {
      const text = typeof item.content === "string" ? item.content : "";

      if (text) {
        messages.push({ role: "assistant", content: text });
      }

      continue;
    }

    if (item.type === "message" && item.role === "assistant") {
      const contentItems = Array.isArray(item.content) ? item.content : [];
      const text = contentItems
        .filter((c) => c && c.type === "output_text" && typeof c.text === "string")
        .map((c) => c.text)
        .join("\n");

      if (text) {
        messages.push({ role: "assistant", content: text });
      }

      continue;
    }

    if (item.type === "function_call") {
      let lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;

      if (!lastMsg || lastMsg.role !== "assistant" || !Array.isArray(lastMsg.content)) {
        lastMsg = { role: "assistant", content: [] };
        messages.push(lastMsg);
      }

      const args = typeof item.arguments === "string"
        ? parseFunctionCallArguments(item.arguments)
        : (item.arguments || {});

      lastMsg.content.push({
        type: "tool_use",
        id: item.call_id,
        name: item.name,
        input: args,
      });

      continue;
    }

    if (item.type === "function_call_output") {
      let lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;

      if (!lastMsg || lastMsg.role !== "user" || !Array.isArray(lastMsg.content)) {
        lastMsg = { role: "user", content: [] };
        messages.push(lastMsg);
      }

      lastMsg.content.push({
        type: "tool_result",
        tool_use_id: item.call_id,
        content: typeof item.output === "string" ? item.output : JSON.stringify(item.output),
      });

      continue;
    }
  }

  return messages;
}

function buildAnthropicRequestBody({ modelName, instructions, tools, inputItems }) {
  const body = {
    model: modelName,
    max_tokens: 8096,
    messages: convertInputToAnthropicMessages(inputItems),
  };

  if (typeof instructions === "string" && instructions.length > 0) {
    body.system = instructions;
  }

  const anthropicTools = convertToolsToAnthropic(tools);

  if (anthropicTools.length > 0) {
    body.tools = anthropicTools;
  }

  return body;
}

function convertAnthropicResponse(anthropicResponse) {
  const output = [];
  const content = Array.isArray(anthropicResponse.content) ? anthropicResponse.content : [];

  for (const block of content) {
    if (!block) {
      continue;
    }

    if (block.type === "text" && typeof block.text === "string" && block.text.length > 0) {
      output.push({
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: block.text }],
      });
    }

    if (block.type === "tool_use") {
      output.push({
        type: "function_call",
        call_id: block.id,
        name: block.name,
        arguments: JSON.stringify(block.input || {}),
      });
    }
  }

  return { output };
}

async function createResponse({
  apiEndpoint,
  apiKey,
  modelName,
  instructions,
  tools,
  inputItems,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
}) {
  const rawEndpoint = typeof apiEndpoint === "string" && apiEndpoint.length > 0
    ? apiEndpoint
    : DEFAULT_RESPONSE_ENDPOINT;

  const useGeminiNative = isGeminiNativeEndpoint(rawEndpoint);
  const useAnthropic = !useGeminiNative && isAnthropicEndpoint(rawEndpoint);
  const useChatCompletions = !useGeminiNative && !useAnthropic && isChatCompletionsEndpoint(rawEndpoint);

  let endpoint;
  const headers = { "Content-Type": "application/json" };

  if (useGeminiNative) {
    const base = rawEndpoint.replace(/\/+$/, "");

    endpoint = `${base}/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  } else if (useAnthropic) {
    endpoint = rawEndpoint;
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
  } else {
    endpoint = rawEndpoint;
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  let requestBody;

  if (useGeminiNative) {
    requestBody = buildGeminiRequestBody({ modelName, instructions, tools, inputItems });
  } else if (useAnthropic) {
    requestBody = buildAnthropicRequestBody({ modelName, instructions, tools, inputItems });
  } else if (useChatCompletions) {
    requestBody = buildChatCompletionsRequestBody({ modelName, instructions, tools, inputItems });
  } else {
    requestBody = buildResponseRequestBody({ modelName, instructions, tools, inputItems });
  }

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutValue = Number(timeoutMs);
  const resolvedTimeoutMs = Number.isFinite(timeoutValue) && timeoutValue > 0
    ? timeoutValue
    : DEFAULT_REQUEST_TIMEOUT_MS;
  let timeoutId = null;

  if (controller) {
    timeoutId = setTimeout(() => {
      controller.abort();
    }, resolvedTimeoutMs);
  }

  let response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      signal: controller ? controller.signal : undefined,
    });
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw new Error(`LLM request timed out after ${resolvedTimeoutMs}ms`);
    }

    throw error;
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    const providerErrorMessage = getProviderErrorMessage(errorText);
    const err = /** @type {Error & { status?: number }} */ (
      new Error(providerErrorMessage || `LLM response error ${response.status}`)
    );
    err.status = response.status;
    throw err;
  }

  const json = await response.json();

  if (useGeminiNative) {
    return convertGeminiResponse(json);
  }

  if (useAnthropic) {
    return convertAnthropicResponse(json);
  }

  if (useChatCompletions) {
    return convertChatCompletionsResponse(json);
  }

  return json;
}

async function createResponseWithAdaptiveContext({
  apiEndpoint,
  apiKey,
  modelName,
  instructions,
  tools,
  inputItems,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
}) {
  const retryProfiles = [
    {
      maxTotalChars: DEFAULT_CONTEXT_CHAR_BUDGET,
      maxItems: DEFAULT_CONTEXT_ITEM_LIMIT,
      maxToolOutputChars: DEFAULT_TOOL_OUTPUT_CHAR_LIMIT,
    },
    {
      maxTotalChars: RETRY_CONTEXT_CHAR_BUDGET,
      maxItems: RETRY_CONTEXT_ITEM_LIMIT,
      maxToolOutputChars: RETRY_TOOL_OUTPUT_CHAR_LIMIT,
    },
  ];

  for (let profileIndex = 0; profileIndex < retryProfiles.length; profileIndex += 1) {
    const profile = retryProfiles[profileIndex];
    const budgetedInputItems = buildBudgetedInputItems(inputItems, {
      instructions,
      tools,
      maxTotalChars: profile.maxTotalChars,
      maxItems: profile.maxItems,
      minItems: DEFAULT_MIN_CONTEXT_ITEMS,
      maxToolOutputChars: profile.maxToolOutputChars,
    });

    try {
      return await createResponse({
        apiEndpoint,
        apiKey,
        modelName,
        instructions,
        tools,
        inputItems: budgetedInputItems,
        timeoutMs,
      });
    } catch (error) {
      const hasNextProfile = profileIndex < retryProfiles.length - 1;

      if (hasNextProfile && isLikelyRequestTooLargeError(error)) {
        continue;
      }

      if (isLikelyRequestTooLargeError(error)) {
        throw createCompactedContextError(error);
      }

      throw error;
    }
  }

  throw new Error("Failed to create LLM response after adaptive retries.");
}

async function checkChatConnection({
  apiEndpoint,
  apiKey,
  modelName,
  timeoutMs = DEFAULT_CONNECTION_TIMEOUT_MS,
  onConnectionState,
}) {
  if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
    const payload = normalizeConnectionPayload({
      connected: false,
      modelName,
      apiEndpoint,
      error: "No API key",
      source: "health_check",
    });

    emitConnectionState(onConnectionState, payload);

    return payload;
  }

  if (typeof modelName !== "string" || modelName.trim().length === 0) {
    const payload = normalizeConnectionPayload({
      connected: false,
      modelName,
      apiEndpoint,
      error: "No model name",
      source: "health_check",
    });

    emitConnectionState(onConnectionState, payload);

    return payload;
  }

  try {
    const response = await createResponse({
      apiEndpoint,
      apiKey,
      modelName,
      instructions: "Perform a short connectivity check and answer with 'OK'.",
      tools: [],
      inputItems: [{ role: "user", content: "Connection test. Reply with OK." }],
      timeoutMs,
    });

    const responseOutput = Array.isArray(response.output) ? response.output : [];
    const assistantText = extractAssistantText(responseOutput);
    const payload = normalizeConnectionPayload({
      connected: true,
      modelName,
      apiEndpoint,
      error: null,
      source: "health_check",
    });

    emitConnectionState(onConnectionState, payload);

    return {
      ...payload,
      assistantText,
    };
  } catch (error) {
    const isRateLimited = error && error.status === 429;

    if (isRateLimited) {
      const payload = normalizeConnectionPayload({
        connected: true,
        modelName,
        apiEndpoint,
        error: null,
        source: "health_check",
      });

      emitConnectionState(onConnectionState, payload);

      return payload;
    }

    const payload = normalizeConnectionPayload({
      connected: false,
      modelName,
      apiEndpoint,
      error: normalizeErrorMessage(error),
      source: "health_check",
    });

    emitConnectionState(onConnectionState, payload);

    return payload;
  }
}

function snapshotToolEvents(toolEvents) {
  return toolEvents.map((toolEvent) => ({
    kind: typeof toolEvent.kind === "string" ? toolEvent.kind : "tool_call",
    callId: toolEvent.callId,
    name: toolEvent.name,
    args: toolEvent.args,
    result: toolEvent.result,
    text: typeof toolEvent.text === "string" ? toolEvent.text : "",
    status: toolEvent.status,
    iteration: toolEvent.iteration,
  }));
}

function emitToolEvent(onToolEvent, payload) {
  if (typeof onToolEvent === "function") {
    onToolEvent(payload);
  }
}

async function runChatTurn(
  userText,
  {
    inputItems,
    apiKey,
    modelName,
    apiEndpoint,
    maxIterations = 64,
    systemInstructions,
    adapter,
    onConnectionState,
    onToolEvent,
  },
) {
  const conversationItems = Array.isArray(inputItems)
    ? inputItems.map((item) => sanitizeConversationItemForContext(item, {
      maxToolOutputChars: DEFAULT_TOOL_OUTPUT_CHAR_LIMIT,
    }))
    : [];
  const toolDefinitions = adapter.getToolDefinitions();
  const adapterInstructions = typeof adapter.getSystemInstructions === "function"
    ? String(adapter.getSystemInstructions() || "")
    : "";
  const customInstructions = typeof systemInstructions === "string" ? systemInstructions.trim() : "";
  const instructions = [adapterInstructions, customInstructions]
    .filter((value) => value.length > 0)
    .join("\n\n");

  conversationItems.push({
    role: "user",
    content: userText,
  });

  const toolEvents = [];
  let lastAssistantText = "";
  let connectedReported = false;

  for (let iterationIndex = 0; iterationIndex < maxIterations; iterationIndex += 1) {
    let response;

    try {
      response = await createResponseWithAdaptiveContext({
        apiEndpoint,
        apiKey,
        modelName,
        instructions,
        tools: toolDefinitions,
        inputItems: conversationItems,
      });
    } catch (error) {
      emitConnectionState(
        onConnectionState,
        normalizeConnectionPayload({
          connected: false,
          modelName,
          apiEndpoint,
          error: normalizeErrorMessage(error),
          source: "chat_turn",
        })
      );
      throw error;
    }

    if (!connectedReported) {
      connectedReported = true;
      emitConnectionState(
        onConnectionState,
        normalizeConnectionPayload({
          connected: true,
          modelName,
          apiEndpoint,
          error: null,
          source: "chat_turn",
        })
      );
    }

    const responseOutput = Array.isArray(response.output) ? response.output : [];

    for (const outputItem of responseOutput) {
      conversationItems.push(sanitizeConversationItemForContext(outputItem, {
        maxToolOutputChars: DEFAULT_TOOL_OUTPUT_CHAR_LIMIT,
      }));
    }

    const assistantText = extractAssistantText(responseOutput);

    if (assistantText) {
      lastAssistantText = assistantText;
    }

    const functionCalls = responseOutput.filter((outputItem) => {
      return outputItem && outputItem.type === "function_call";
    });

    if (functionCalls.length > 0) {
      const thoughtText = extractModelThoughtText(responseOutput, assistantText);

      if (thoughtText) {
        const thoughtEvent = {
          kind: "model_thought",
          callId: `thought_${iterationIndex + 1}_${toolEvents.length + 1}`,
          name: "model.thought",
          args: {},
          result: null,
          text: thoughtText,
          status: "completed",
          iteration: iterationIndex + 1,
        };

        toolEvents.push(thoughtEvent);

        emitToolEvent(onToolEvent, {
          phase: "model_thought",
          iteration: iterationIndex + 1,
          toolEvent: {
            ...thoughtEvent,
          },
          toolEvents: snapshotToolEvents(toolEvents),
        });
      }
    }

    if (functionCalls.length === 0) {
      return {
        inputItems: conversationItems,
        assistantText,
        toolEvents,
        reachedLimit: false,
      };
    }

    for (const functionCall of functionCalls) {
      const parsedArguments = parseFunctionCallArguments(functionCall.arguments);
      const toolEvent = {
        callId: typeof functionCall.call_id === "string"
          ? functionCall.call_id
          : `call_${iterationIndex + 1}_${toolEvents.length + 1}`,
        name: functionCall.name,
        args: parsedArguments,
        result: null,
        status: "running",
        iteration: iterationIndex + 1,
      };
      let toolResult = null;

      toolEvents.push(toolEvent);

      emitToolEvent(onToolEvent, {
        phase: "tool_call_started",
        iteration: iterationIndex + 1,
        toolEvent: {
          ...toolEvent,
        },
        toolEvents: snapshotToolEvents(toolEvents),
      });

      try {
        toolResult = await adapter.executeToolCall(functionCall, parsedArguments);
      } catch (error) {
        toolResult = {
          error: normalizeErrorMessage(error),
        };
      }

      toolEvent.result = sanitizeToolEventResult(toolResult);
      toolEvent.status = "completed";

      const callId = typeof functionCall.call_id === "string" ? functionCall.call_id : toolEvent.callId;
      const compactedToolOutput = sanitizeToolOutputForContext(toolResult, DEFAULT_TOOL_OUTPUT_CHAR_LIMIT);

      conversationItems.push({
        type: "function_call_output",
        call_id: callId,
        output: compactedToolOutput,
      });

      emitToolEvent(onToolEvent, {
        phase: "tool_call_completed",
        iteration: iterationIndex + 1,
        toolEvent: {
          ...toolEvent,
        },
        toolEvents: snapshotToolEvents(toolEvents),
      });
    }
  }

  return {
    inputItems: conversationItems,
    assistantText: lastAssistantText,
    toolEvents,
    reachedLimit: true,
  };
}

export {
  runChatTurn,
  checkChatConnection,
  parseFunctionCallArguments,
  extractAssistantText,
};
