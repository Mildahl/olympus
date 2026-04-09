const ACTIVE_MODEL_ALIASES = new Set([
  "active",
  "active_model",
  "active_model_name",
  "current",
  "current_model",
  "current_model_name",
  "selected",
  "selected_model",
  "this_model",
]);

function normalizeModelNameToken(modelName) {
  return typeof modelName === "string" ? modelName.trim() : "";
}

function getActiveModelAliasKey(modelName) {
  return normalizeModelNameToken(modelName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getCurrentActiveModelName(context) {
  if (!context || !context.ifc) {
    return null;
  }

  const activeModelName = normalizeModelNameToken(context.ifc.activeModel);

  return activeModelName || null;
}

function getResolvedModelName(context, modelName) {
  const normalizedModelName = normalizeModelNameToken(modelName);

  if (normalizedModelName && !ACTIVE_MODEL_ALIASES.has(getActiveModelAliasKey(normalizedModelName))) {
    return normalizedModelName;
  }

  return getCurrentActiveModelName(context);
}

function requireModelName(context, args, toolName) {
  const modelName = getResolvedModelName(context, args.modelName);

  if (!modelName) {
    throw new Error(`No active model available for ${toolName}.`);
  }

  return modelName;
}

export {
  getCurrentActiveModelName,
  getResolvedModelName,
  requireModelName,
};
