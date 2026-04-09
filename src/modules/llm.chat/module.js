import operators from "./operators.js";

import LLMChatUI from "./ui.js";

const ModuleDefinition = {
  id: "llm.chat",
  name: "AI Agent (IFCBowt)",
  description: "Reusable LLM chat module with BIM adapter",
  version: "1.0.0",
  dependsOn: ["bim.project", "world.notification"],
  operators: operators,
  ui: LLMChatUI,
};

export default ModuleDefinition;
