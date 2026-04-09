export const NavigationConfig = {
  defaultMode: "ORBIT",
  fly: {
    shortcut: ["Shift", "F"],
    movementSpeed: 25,
    lookSpeed: 0.1,
    verticalMin: -85,
    verticalMax: 85,
    chaseCameraDistance: 1.5,
    chaseCameraHeight: 0.72,
    chaseDistanceMax: 2.6,
    chaseHeightMax: 1.55,
    cockpitEyeForwardOffset: 0.11,
    keys: {
      forward: ["", "KeyW"],
      backward: ["", "KeyS"],
      left: ["", "KeyA"],
      right: ["", "KeyD"],
      up: ["", "KeyE"],
      down: ["", "KeyQ"],
      sprint: ["", "ShiftLeft"],
    },
    instructionPanel: {
      title: "FLY MODE",
      icon: "flight",
      tips: [
        { controls: [{ type: "mouse", button: "move" }], description: "Look around" },
        { controls: [{ type: "mouse", button: "left" }], description: "Enable mouse look" },
        { controls: [{ type: "key", value: "Ctrl" }, { type: "key", value: "Space" }], description: "Toggle above camera / cockpit" },
        { controls: [{ type: "key", value: "ESC" }], description: "Exit fly mode" },
      ],
      keyRows: [
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
  },
  firstPerson: {
    shortcut: ["Shift", "P"],
    movementSpeed: 25,
    lookSpeed: 0.1,
    verticalMin: -85,
    verticalMax: 85,
    keys: {
      forward: ["", "KeyW"],
      backward: ["", "KeyS"],
      left: ["", "KeyA"],
      right: ["", "KeyD"],
      up: ["", "Space"],
      down: ["", "KeyQ"],
      sprint: ["", "ShiftLeft"],
    },
    instructionPanel: {
      title: "FIRST PERSON MODE",
      icon: "my_location",
      tips: [
        { controls: [{ type: "key", value: "Crosshair" }], description: "Aim from screen center" },
        { controls: [{ type: "mouse", button: "move" }], description: "Look around" },
        { controls: [{ type: "mouse", button: "left" }], description: "Lock pointer" },
        { controls: [{ type: "key", value: "Ctrl" }, { type: "key", value: "Space" }], description: "Toggle above camera / cockpit" },
        { controls: [{ type: "key", value: "ESC" }], description: "Exit first person mode" },
      ],
      keyRows: [
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
  },
  drive: {
    shortcut: ["Shift", "V"],
    movementSpeed: 30,
    lookSpeed: 0.1,
    verticalMin: -45,
    verticalMax: 45,
    keys: {
      accelerate: ["", "KeyW"],
      brake: ["", "KeyS"],
      left: ["", "KeyA"],
      right: ["", "KeyD"],
      boost: ["", "ShiftLeft"],
    },
    instructionPanel: {
      title: "DRIVE MODE",
      icon: "directions_car",
      tips: [
        { controls: [{ type: "key", value: "Shift" }], description: "Boost" },
        { controls: [{ type: "key", value: "ESC" }], description: "Exit drive mode" },
      ],
      keyRows: [
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
  },
  orbit: {
    shortcut: ["Shift", "O"],
    rotationSpeed: 0.3,
    keys: {},
    instructionPanel: {
      title: "ORBIT MODE",
      icon: "3d_rotation",
      tips: [
        { controls: [{ type: "mouse", button: "middle" }, { type: "key", value: "Drag" }], description: "Rotate view" },
        { controls: [{ type: "key", value: "Shift" }, { type: "mouse", button: "middle" }, { type: "key", value: "Drag" }], description: "Pan" },
        { controls: [{ type: "mouse", button: "scroll" }], description: "Zoom in/out" },
      ],
      keyRows: [],
    },
  },
  focus: {
    shortcut: ["Shift", "NumpadDecimal"],
  },
};
