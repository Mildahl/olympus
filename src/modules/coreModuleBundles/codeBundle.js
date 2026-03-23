import codeScriptingModule from "../code.scripting/module.js";

import codeTerminalModule from "../code.terminal/module.js";

const coreModuleById = {
  "code.scripting": codeScriptingModule,
  "code.terminal": codeTerminalModule,
};

export function getCoreModuleDefinition(moduleId) {
  const definition = coreModuleById[moduleId];

  if (!definition) {
    throw new Error(`Unknown core module in code bundle: ${moduleId}`);
  }

  return definition;
}
