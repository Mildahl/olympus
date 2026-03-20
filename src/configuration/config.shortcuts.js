export const Shortcuts = {
  "shortcuts/transform/translate": "w",
  "shortcuts/transform/rotate": "e",
  "shortcuts/transform/scale": "r",
  "shortcuts/undo": "ctrl+z",
  "shortcuts/redo": "ctrl+y",
  "shortcuts/controls/focus": ".",
  "shortcuts/navigation/orbit": "shift+o",
  "shortcuts/navigation/fly": "shift+f",
  "shortcuts/navigation/drive": "shift+v",
  "shortcuts/snap/toggle": "ctrl+s",
};

const RESERVED_SHORTCUTS = new Set(Object.values(Shortcuts));

export function isShortcutAvailable(shortcut) {
  const normalized = shortcut.toLowerCase().trim();
  return !RESERVED_SHORTCUTS.has(normalized);
}

export function normalizeShortcut(key, modifiers = {}) {
  const parts = [];
  if (modifiers.ctrl) parts.push('ctrl');
  if (modifiers.alt) parts.push('alt');
  if (modifiers.shift) parts.push('shift');
  parts.push(key.toLowerCase());
  return parts.join('+');
}
