import { applyPresetToContext } from "../configuration/config.presets.js";

function applyModulePresetAndReload(context, presetKey) {
  if (!context || typeof presetKey !== "string" || presetKey.length === 0) {
    return { ok: false };
  }

  const applied = applyPresetToContext(context, presetKey);

  if (!applied) {
    return { ok: false };
  }

  if (typeof context._saveConfig === "function") {
    context._saveConfig();
  }

  if (
    typeof window !== "undefined" &&
    window.location &&
    typeof window.location.reload === "function"
  ) {
    window.location.reload();
  }

  return { ok: true };
}

export { applyModulePresetAndReload };
