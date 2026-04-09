# LLM Chat Module

`llm.chat` is a reusable chat module with domain adapters. The first adapter is BIM.

## Architecture

- UI: `src/modules/llm.chat/ui.js`
- Operators: `src/modules/llm.chat/operators.js`
- Core orchestration: `src/core/llm.chat.js`
- BIM adapter: `src/modules/llm.chat/bimAdapter.js`

`llm.chat` follows the project layering:

- UI renders state and triggers operators.
- Operators validate and call core.
- Core runs the Responses API loop.
- Adapter executes domain tool calls through existing core/tools.

## Module wiring

- Manifest registration: `src/modules/coreModuleManifest.js`
- BIM bundle registration: `src/modules/coreModuleBundles/bimBundle.js`
- Module definition: `src/modules/llm.chat/module.js`

## Runtime flow

1. User prompt is sent from `llm.chat` UI.
2. `llm.chat.turn` operator invokes `runChatTurn(...)`.
3. Core posts to Responses API and receives output items.
4. `function_call` items are delegated to adapter execution.
5. Tool outputs are appended as `function_call_output`.
6. Loop continues until no tool calls or iteration limit.

## BIM adapter tool surface

- `bim_list_models`
- `bim_get_active_model`
- `bim_new_model`
- `bim_set_active_model`
- `bim_load_model_from_path`
- `bim_load_geometry`
- `bim_save_ifc`
- `ifc_query_by_type`
- `ifc_get_class`
- `ifc_get_global_id`
- `ifc_run_api`

## Smart Tool Gateway (Category-based)

The BIM adapter now exposes a compact smart gateway that gives the model full runtime context plus generic execution bridges.

Tool categories:

- `mcp tools`
  - `mcp_ifc_call`
- `aeco/world`
  - `aeco_world_call`
- `aeco/bim`
  - `aeco_bim_call`
- `aeco/ifc`
  - `aeco_ifc_call`
- `aeco/code`
  - `aeco_code_call`
- `module operators`
  - `module_operator_list`
  - `module_operator_call`

Discovery/context tools:

- `aeco_context_snapshot`
- `aeco_namespace_methods`

This means newly activated core modules and addons become available to chat through `module_operator_call` without writing one tool wrapper per operator.

The adapter uses existing BIM core and `tools.ifc` bridge paths, so no second IFC runtime is introduced.

## Configuration

Configure `llm.chat` in `context.config.app.LLMChat`:

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

Recommended operator-first usage pattern in prompts:

1. Call `aeco_context_snapshot` if active modules/state are unclear.
2. Call `module_operator_list` to discover currently active operator IDs.
3. Execute using `module_operator_call` with positional `args`.

> **Note:** API keys are never stored in configuration or `localStorage`. Users must enter their key each session via the composer UI. Model and endpoint are selected through the model dropdown.

## Extending with new domains

To add a new domain adapter:

1. Provide adapter methods:
   - `getToolDefinitions()`
   - `getSystemInstructions()`
   - `executeToolCall(functionCall, parsedArguments)`
2. Add domain selection in `llm.chat` operators/UI payload.
3. Keep adapter logic mapped to existing operators/core/tools for that domain.
