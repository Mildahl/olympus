# BIM Project Chat Adapter

The AI chat implementation has been extracted into `llm.chat`.

`bim.project` no longer owns the chat UI or chat operators directly. It remains focused on IFC model management, while BIM chat behavior is now provided through the BIM adapter used by `llm.chat`.

## Current ownership

- Chat panel: `src/modules/llm.chat/ui.js`
- Chat operators: `src/modules/llm.chat/operators.js`
- Generic chat core loop: `src/core/llm.chat.js`
- BIM adapter mapping: `src/modules/llm.chat/bimAdapter.js`
- BIM project UI: `src/modules/bim.project/ui.js`

## BIM adapter responsibilities

The BIM adapter in `llm.chat` maps tool calls to existing BIM core/tools paths:

- BIM model list/active model queries
- new/load/set-active/save IFC actions
- geometry load execution with existing safeguards
- IFC queries and `ifcopenshell.api` execution through existing `tools.ifc` bridge

It also exposes a category-based smart gateway so chat can discover and execute runtime functionality with minimal hardcoded wrappers:

- `mcp tools`: `mcp_ifc_call`
- `aeco/world`: `aeco_world_call`
- `aeco/bim`: `aeco_bim_call`
- `aeco/ifc`: `aeco_ifc_call`
- `aeco/code`: `aeco_code_call`
- `module operators`: `module_operator_list`, `module_operator_call`

Use `aeco_context_snapshot` to inspect active modules/operators and runtime readiness before invoking tools.

This keeps the signal-driven behavior in existing BIM workflows unchanged.

## Configuration

Use `context.config.app.LLMChat` for shared chat settings, with BIM-specific instructions under `bim`:

```js
{
  app: {
    LLMChat: {
      maxIterations: 64,
      bim: {
        systemInstructions: ""
      }
    }
  }
}
```

> **Note:** API keys are entered per-session in the chat UI and are never persisted.

For full module details, see `docs/guides/llm-chat-module.md`.
