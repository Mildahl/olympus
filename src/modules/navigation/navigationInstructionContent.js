export function humanizeKeyCode(keyCode) {
  if (!keyCode || typeof keyCode !== "string") {
    return "";
  }
  if (keyCode === "Space") {
    return "Space";
  }
  if (keyCode === "ShiftLeft" || keyCode === "ShiftRight") {
    return "Shift";
  }
  if (keyCode.indexOf("Key") === 0) {
    return keyCode.slice(3);
  }
  return keyCode;
}

export const NAVIGATION_KEYBOARD_ARROW_UP = "\u2191";
export const NAVIGATION_KEYBOARD_ARROW_LEFT = "\u2190";
export const NAVIGATION_KEYBOARD_ARROW_DOWN = "\u2193";
export const NAVIGATION_KEYBOARD_ARROW_RIGHT = "\u2192";

export function placeMovementKeyOnGrid(keyElement, gridRow, gridColumn) {
  keyElement.dom.style.gridRow = String(gridRow);
  keyElement.dom.style.gridColumn = String(gridColumn);
}

export function isUnmodifiedShiftKeyEvent(keyboardEvent) {
  return (
    keyboardEvent.shiftKey &&
    !keyboardEvent.ctrlKey &&
    !keyboardEvent.altKey &&
    !keyboardEvent.metaKey
  );
}

export const NAVIGATION_INSTRUCTION_PANELS_WITH_KEY_ROWS = {
  FLY: {
    title: "FLY MODE",
    icon: "flight",
    tips: [
      ["Mouse", "Look around"],
      ["Click", "Enable mouse look"],
      ["Ctrl+Space", "Toggle above camera / cockpit"],
      ["ESC", "Exit fly mode"],
    ],
  },
  FIRST_PERSON: {
    title: "FIRST PERSON MODE",
    icon: "my_location",
    tips: [
      ["Crosshair", "Aim from screen center"],
      ["Mouse", "Look around"],
      ["Click", "Lock pointer"],
      ["Ctrl+Space", "Toggle above camera / cockpit"],
      ["ESC", "Exit first person mode"],
    ],
  },
  DRIVE: {
    title: "DRIVE MODE",
    icon: "directions_car",
    tips: [
      ["Shift", "Boost"],
      ["ESC", "Exit drive mode"],
    ],
  },
};

const NAVIGATION_MODE_INSTRUCTION_ROW_TEMPLATES = {
  FLY: {
    modeConfig: "fly",
    rows: [
      [
        { action: "forward", label: "Forward", fallback: "W" },
        { action: "left", label: "Left", fallback: "A" },
        { action: "backward", label: "Back", fallback: "S" },
        { action: "right", label: "Right", fallback: "D" },
      ],
      [
        { action: "up", label: "Up", fallback: "Space" },
        { action: "down", label: "Down", fallback: "Q" },
        { action: "sprint", label: "Sprint", fallback: "Shift" },
      ],
    ],
  },
  FIRST_PERSON: {
    modeConfig: "firstPerson",
    rows: [
      [
        { action: "forward", label: "Forward", fallback: "W" },
        { action: "left", label: "Turn Left", fallback: "A" },
        { action: "backward", label: "Back", fallback: "S" },
        { action: "right", label: "Turn Right", fallback: "D" },
      ],
      [
        { action: "up", label: "Up", fallback: "Space" },
        { action: "down", label: "Down", fallback: "Q" },
        { action: "sprint", label: "Sprint", fallback: "Shift" },
      ],
    ],
  },
  DRIVE: {
    modeConfig: "drive",
    rows: [
      [
        { action: "accelerate", label: "Accelerate", fallback: "W" },
        { action: "brake", label: "Brake", fallback: "S" },
      ],
      [
        { action: "left", label: "Steer Left", fallback: "A" },
        { action: "right", label: "Steer Right", fallback: "D" },
      ],
    ],
  },
};

export function buildNavigationInstructionRows(mode, navigationConfiguration) {
  const modeTemplate = NAVIGATION_MODE_INSTRUCTION_ROW_TEMPLATES[mode];

  if (!modeTemplate || !navigationConfiguration) {
    return [];
  }

  const modeConfiguration = navigationConfiguration[modeTemplate.modeConfig];
  const keysConfiguration = modeConfiguration ? modeConfiguration.keys : {};

  return modeTemplate.rows.map((row) =>
    row.map(({ action, label, fallback }) => {
      const configuredValue = keysConfiguration[action];
      const configuredKey = Array.isArray(configuredValue)
        ? configuredValue[1] || configuredValue[0]
        : configuredValue;
      const keyLabel =
        typeof configuredKey === "string" && configuredKey.length > 0
          ? configuredKey.replace(/^Key/, "").replace("ShiftLeft", "Shift")
          : fallback;

      return { key: keyLabel, label };
    })
  );
}
