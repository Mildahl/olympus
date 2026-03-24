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
      up: ["", "Space"],
      down: ["", "KeyQ"],
      sprint: ["", "ShiftLeft"],
    },
    instructionPanel: {
      title: "FLY MODE",
      icon: "flight",
      tips: [
        ["Mouse", "Look around"],
        ["Click", "Enable mouse look"],
        ["Ctrl+Space", "Toggle above camera / cockpit"],
        ["ESC", "Exit fly mode"],
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
        ["Crosshair", "Aim from screen center"],
        ["Mouse", "Look around"],
        ["Click", "Lock pointer"],
        ["Ctrl+Space", "Toggle above camera / cockpit"],
        ["ESC", "Exit first person mode"],
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
        ["Shift", "Boost"],
        ["ESC", "Exit drive mode"],
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
        ["Left Click + Drag", "Rotate view"],
        ["Right Click + Drag", "Pan"],
        ["Scroll", "Zoom in/out"],
      ],
      keyRows: [],
    },
  },
  focus: {
    shortcut: ["Shift", "NumpadDecimal"],
  },
};
