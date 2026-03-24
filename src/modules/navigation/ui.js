import { DrawUI } from "../../../drawUI/index.js";

import { UICheckbox, UILabel } from "../../../drawUI/ui.js";

function humanizeKeyCode(keyCode) {
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

const NAVIGATION_KEYBOARD_ARROW_UP = "\u2191";
const NAVIGATION_KEYBOARD_ARROW_LEFT = "\u2190";
const NAVIGATION_KEYBOARD_ARROW_DOWN = "\u2193";
const NAVIGATION_KEYBOARD_ARROW_RIGHT = "\u2192";

function placeMovementKeyOnGrid(keyElement, gridRow, gridColumn) {
  keyElement.dom.style.gridRow = String(gridRow);
  keyElement.dom.style.gridColumn = String(gridColumn);
}

function isUnmodifiedShiftKeyEvent(keyboardEvent) {
  return (
    keyboardEvent.shiftKey &&
    !keyboardEvent.ctrlKey &&
    !keyboardEvent.altKey &&
    !keyboardEvent.metaKey
  );
}

const NAVIGATION_UI_MODE_TO_SETTINGS_KEY = {
  FLY: "fly",
  FIRST_PERSON: "firstPerson",
  DRIVE: "drive",
  ORBIT: "orbit",
};

function navigationInstructionRowsFromConfig(mode, navigationConfiguration) {
  const settingsKey = NAVIGATION_UI_MODE_TO_SETTINGS_KEY[mode];
  if (!settingsKey || !navigationConfiguration) {
    return [];
  }
  const modeBlock = navigationConfiguration[settingsKey];
  if (
    !modeBlock ||
    !modeBlock.instructionPanel ||
    !modeBlock.instructionPanel.keyRows
  ) {
    return [];
  }
  const keysConfiguration = modeBlock.keys ? modeBlock.keys : {};
  return modeBlock.instructionPanel.keyRows.map((row) =>
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

class ViewportNavigationSticks {
  constructor(navigationController) {
    this.navigationController = navigationController;
    this.isEnabled = false;
    this.leftJoystick = {
      active: false,
      startX: 0,
      startY: 0,
      deltaX: 0,
      deltaY: 0,
      pointerId: null,
      element: null,
      knob: null,
    };
    this.rightJoystick = {
      active: false,
      startX: 0,
      startY: 0,
      deltaX: 0,
      deltaY: 0,
      pointerId: null,
      element: null,
      knob: null,
    };
    this.config = {
      joystickSize: 88,
      knobSize: 34,
      maxDistance: 34,
      deadzone: 0.1,
      moveSensitivity: 1.0,
      lookSensitivity: 0.03,
      opacity: 0.6,
      activeOpacity: 0.8,
    };
    this.animationId = null;
    this.onLeftPointerDown = (event) => this.onJoystickPointerDown(this.leftJoystick, event);
    this.onLeftPointerMove = (event) => this.onJoystickPointerMove(this.leftJoystick, event);
    this.onLeftPointerUp = (event) => this.onJoystickPointerUp(this.leftJoystick, event);
    this.onRightPointerDown = (event) => this.onJoystickPointerDown(this.rightJoystick, event);
    this.onRightPointerMove = (event) => this.onJoystickPointerMove(this.rightJoystick, event);
    this.onRightPointerUp = (event) => this.onJoystickPointerUp(this.rightJoystick, event);
    this.update = this.update.bind(this);
  }

  detectMobile() {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0
    );
  }

  setNavigationController(navigationController) {
    this.navigationController = navigationController;
  }

  createJoystickElement(side) {
    const joystickSize = this.config.joystickSize;
    const knobSize = this.config.knobSize;
    const opacity = this.config.opacity;

    const joystick = DrawUI.div();
    joystick.addClass("addon-navigation-joystick");
    joystick.addClass(`addon-navigation-joystick--${side}`);
    joystick.dom.dataset.side = side;

    const knob = DrawUI.div();
    knob.addClass("addon-navigation-joystick-knob");

    const label = DrawUI.div();
    label.addClass("addon-navigation-joystick-label");
    label.dom.textContent = side === "left" ? "MOVE" : "LOOK";

    joystick.add(knob);
    joystick.add(label);

    joystick.dom.style.width = `${joystickSize}px`;
    joystick.dom.style.height = `${joystickSize}px`;
    joystick.dom.style.opacity = String(opacity);

    knob.dom.style.width = `${knobSize}px`;
    knob.dom.style.height = `${knobSize}px`;

    return { joystick: joystick.dom, knob: knob.dom };
  }

  wireJoystickPointer(joystickElement, downHandler, moveHandler, upHandler) {
    joystickElement.addEventListener("pointerdown", downHandler);
    joystickElement.addEventListener("pointermove", moveHandler);
    joystickElement.addEventListener("pointerup", upHandler);
    joystickElement.addEventListener("pointercancel", upHandler);
    joystickElement.addEventListener("lostpointercapture", upHandler);
  }

  mountMoveAndLook(leftHost, rightHost) {
    const leftParts = this.createJoystickElement("left");
    this.leftJoystick.element = leftParts.joystick;
    this.leftJoystick.knob = leftParts.knob;
    leftHost.appendChild(leftParts.joystick);
    this.wireJoystickPointer(
      leftParts.joystick,
      this.onLeftPointerDown,
      this.onLeftPointerMove,
      this.onLeftPointerUp
    );

    const rightParts = this.createJoystickElement("right");
    this.rightJoystick.element = rightParts.joystick;
    this.rightJoystick.knob = rightParts.knob;
    rightHost.appendChild(rightParts.joystick);
    this.wireJoystickPointer(
      rightParts.joystick,
      this.onRightPointerDown,
      this.onRightPointerMove,
      this.onRightPointerUp
    );
  }

  onJoystickPointerDown(joystickState, event) {
    if (!joystickState.element || joystickState.active) {
      return;
    }
    if (event.button !== undefined && event.button !== 0) {
      return;
    }
    event.preventDefault();
    joystickState.element.setPointerCapture(event.pointerId);
    this.activateJoystick(joystickState, event.clientX, event.clientY, event.pointerId);
  }

  onJoystickPointerMove(joystickState, event) {
    if (!joystickState.active || event.pointerId !== joystickState.pointerId) {
      return;
    }
    event.preventDefault();
    this.updateJoystickPosition(joystickState, event.clientX, event.clientY);
  }

  onJoystickPointerUp(joystickState, event) {
    if (!joystickState.active || event.pointerId !== joystickState.pointerId) {
      return;
    }
    event.preventDefault();
    if (joystickState.element && joystickState.element.hasPointerCapture(event.pointerId)) {
      joystickState.element.releasePointerCapture(event.pointerId);
    }
    this.deactivateJoystick(joystickState);
  }

  activateJoystick(joystick, clientX, clientY, pointerId) {
    if (!joystick.element) {
      return;
    }
    const rect = joystick.element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    joystick.active = true;
    joystick.pointerId = pointerId;
    joystick.startX = centerX;
    joystick.startY = centerY;
    joystick.element.style.opacity = String(this.config.activeOpacity);
    this.updateJoystickPosition(joystick, clientX, clientY);
  }

  deactivateJoystick(joystick) {
    joystick.active = false;
    joystick.pointerId = null;
    joystick.deltaX = 0;
    joystick.deltaY = 0;
    if (joystick.knob) {
      joystick.knob.style.transform = "translate(0, 0)";
    }
    if (joystick.element) {
      joystick.element.style.opacity = String(this.config.opacity);
    }
    if (joystick === this.leftJoystick && this.navigationController) {
      this.navigationController.clearMoveStickAxes();
    }
  }

  updateJoystickPosition(joystick, clientX, clientY) {
    const dx = clientX - joystick.startX;
    const dy = clientY - joystick.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDist = this.config.maxDistance;
    let clampedX = dx;
    let clampedY = dy;
    if (distance > maxDist) {
      const ratio = maxDist / distance;
      clampedX = dx * ratio;
      clampedY = dy * ratio;
    }
    joystick.deltaX = clampedX / maxDist;
    joystick.deltaY = clampedY / maxDist;
    if (Math.abs(joystick.deltaX) < this.config.deadzone) {
      joystick.deltaX = 0;
    }
    if (Math.abs(joystick.deltaY) < this.config.deadzone) {
      joystick.deltaY = 0;
    }
    if (joystick.knob) {
      joystick.knob.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
    }
  }

  startUpdateLoop() {
    const loop = () => {
      this.update();
      this.animationId = requestAnimationFrame(loop);
    };
    loop();
  }

  stopUpdateLoop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  update() {
    if (!this.navigationController) {
      return;
    }
    const mode = this.navigationController.getMode();
    if (this.leftJoystick.active) {
      this.applyMovementInput();
    }
    if (this.rightJoystick.active) {
      this.applyCameraInput(mode);
    }
  }

  applyMovementInput() {
    if (!this.navigationController) {
      return;
    }
    const deltaX = this.leftJoystick.deltaX;
    const deltaY = this.leftJoystick.deltaY;
    const mode = this.navigationController.getMode();
    if (mode === "ORBIT") {
      this.navigationController.applyOrbitPanFromStick(
        deltaX,
        deltaY,
        this.config.moveSensitivity
      );
    } else {
      this.navigationController.applyMoveStickToMoveState(
        deltaX,
        deltaY,
        this.config.deadzone
      );
    }
  }

  applyCameraInput(mode) {
    if (!this.navigationController) {
      return;
    }
    const deltaX = this.rightJoystick.deltaX;
    const deltaY = this.rightJoystick.deltaY;
    const sensitivity = this.config.lookSensitivity;
    this.navigationController.applyLookStickForMode(mode, deltaX, deltaY, sensitivity);
  }

  configure(settings) {
    Object.assign(this.config, settings);
  }

  getIsEnabled() {
    return this.isEnabled;
  }

  enable() {
    if (this.isEnabled) {
      return true;
    }
    this.isEnabled = true;
    this.startUpdateLoop();
    return true;
  }

  disable() {
    if (!this.isEnabled) {
      return;
    }
    this.stopUpdateLoop();
    if (this.leftJoystick.active) {
      this.deactivateJoystick(this.leftJoystick);
    }
    if (this.rightJoystick.active) {
      this.deactivateJoystick(this.rightJoystick);
    }
    this.isEnabled = false;
  }

  forceEnable() {
    return this.enable();
  }
}

class NavigationUI {
  constructor({ context, operators }) {
    this.context = context;

    this.operators = operators;

    this.instructionsPanel = null;

    this.hideTimeout = null;

    this.timeout = 10000;

    this.mobileJoystick = null;
    this.navigationSettingsPanel = null;
    this.viewportKeyboardRoot = null;
    this.leftStackElement = null;
    this.leftKeysHostElement = null;
    this.leftMoveSectionElement = null;
    this.leftAuxRowElement = null;
    this.keysMoveModeCheckboxInput = null;
    this.keysMoveModeCheckboxRowElement = null;
    this.aboveCameraCheckboxInput = null;
    this.aboveCameraCheckboxRowElement = null;
    this.aboveCameraCheckboxSuppressChange = false;
    this.leftControlMode = "keys";
    this.activeKeyCodes = new Set();
    this.onViewportKeyboardBlur = this.releaseAllSimulatedKeys.bind(this);
    this.onKeysMoveModeCheckboxChange = this.onKeysMoveModeCheckboxChange.bind(this);
    this.onAboveCameraCheckboxChange = this.onAboveCameraCheckboxChange.bind(this);

    if (context) {
      context.navigationUI = this;
    }

    context.addListeners(["navigationModeChanged", "displaySettings", "navigationCameraRigChanged"]);

    this.createNavigationToolbar(context, operators);

    this.listen(context, operators);

    this.initViewportOverlayWhenReady(context);
  }

  createNavigationToolbar(context, operators) {
    const toolbar = document.getElementById("NavigationToolbar");
    if (!toolbar) {
      return;
    }

    const toolbarTools = [
      {
        id: "ToggleFlyModeTool",
        name: "Toggle Fly Mode",
        icon: "flight",
        mode: "FLY",
        operator: "navigation.toggle_fly_mode",
        operatorOptions: { showInstructions: true },
      },
      {
        id: "SetFirstPersonModeTool",
        name: "First Person Mode",
        icon: "my_location",
        mode: "FIRST_PERSON",
        operator: "navigation.set_mode",
        operatorOptions: { showInstructions: true },
      },
      {
        id: "SetNavigationModeTool",
        name: "Set Navigation Mode",
        icon: "navigation",
        mode: "ORBIT",
        operator: "navigation.set_mode",
        operatorOptions: { showInstructions: true },
      },
    ];

    this.toolbarButtonsByMode = new Map();

    toolbarTools.forEach((tool) => {
      const button = DrawUI.operator(tool.icon);
      button.dom.title = tool.name;
      const operatorOptions = tool.operatorOptions ? tool.operatorOptions : {};
      button.onClick(() => {
        if (tool.operator === "navigation.set_mode") {
          operators.execute(tool.operator, context, tool.mode, operatorOptions);
        } else {
          operators.execute(tool.operator, context, operatorOptions);
        }
      });
      toolbar.appendChild(button.dom);
      this.toolbarButtonsByMode.set(tool.mode, button);
    });

    let currentMode = "ORBIT";
    const editorInstance = context.editor;
    if (editorInstance && editorInstance.navigationController) {
      const navigationController = editorInstance.navigationController;
      if (typeof navigationController.getMode === "function") {
        currentMode = navigationController.getMode();
      }
    }
    this.updateToolbarActiveState(currentMode);
  }

  updateToolbarActiveState(mode) {
    if (!this.toolbarButtonsByMode) return;
    const normalizedMode = (mode || "ORBIT").toUpperCase();
    this.toolbarButtonsByMode.forEach((button, buttonMode) => {
      if (button.dom) {
        if (buttonMode === normalizedMode) {
          button.addClass("Active");
        } else {
          button.removeClass("Active");
        }
      }
    });
  }

  listen(context, operators) {
    const editor = context.editor;
    const navigationApplicationConfig =
      context.config && context.config.app ? context.config.app.Navigation : null;

    context.signals.navigationModeChanged.add(({ mode, showInstructions }) => {
      this.updateToolbarActiveState(mode);
      if (showInstructions) {
        this.showInstructions(mode, context);
      }
      if (this.context) {
        this.refreshViewportKeyboard(this.context);
      }
    });

    context.signals.displaySettings.add(() => {
      this.draw(context);
    });

    context.signals.navigationCameraRigChanged.add(() => {
      if (this.context) {
        this.syncAboveCameraCheckbox();
      }
    });

    document.addEventListener("keydown", (keyboard) => {
      if (!editor || !navigationApplicationConfig) {
        return;
      }
      const navConfig = navigationApplicationConfig;
      if (isUnmodifiedShiftKeyEvent(keyboard)) {
        const instructionOptions = { showInstructions: true };
        if (keyboard.code === `Key${navConfig.fly.shortcut[1]}`) {
          operators.execute("navigation.toggle_fly_mode", context, instructionOptions);
        }
        if (keyboard.code === `Key${navConfig.firstPerson.shortcut[1]}`) {
          operators.execute(
            "navigation.set_mode",
            context,
            "FIRST_PERSON",
            instructionOptions
          );
        }
        if (keyboard.code === `Key${navConfig.drive.shortcut[1]}`) {
          operators.execute("navigation.toggle_drive_mode", context, instructionOptions);
        }
        if (keyboard.code === `Key${navConfig.orbit.shortcut[1]}`) {
          operators.execute("navigation.set_mode", context, "ORBIT", instructionOptions);
        }
      }
      if (
        keyboard.shiftKey && keyboard.code === "NumpadDecimal" &&
        !keyboard.ctrlKey &&
        !keyboard.altKey &&
        !keyboard.metaKey
      ) {
        if (editor.selector.active_object) {
          editor.focus(editor.selector.active_object);
        }
      }
    });
  }

  showInstructions(mode, context) {
    this.hideInstructions();

    const navigationConfiguration =
      context.config && context.config.app ? context.config.app.Navigation : null;
    if (!navigationConfiguration) {
      return;
    }

    const settingsKey = NAVIGATION_UI_MODE_TO_SETTINGS_KEY[mode];
    const modeBlock = settingsKey ? navigationConfiguration[settingsKey] : null;
    const instructionPanelDefinition =
      modeBlock && modeBlock.instructionPanel ? modeBlock.instructionPanel : null;
    if (!instructionPanelDefinition) {
      return;
    }

    const floatingWindow = DrawUI.floatingPanel();

    floatingWindow.setSize("auto", "auto");

    floatingWindow.setStyle("left", ["10px"]);

    floatingWindow.setStyle("top", ["50vh"]);

    this.instructionsPanel = floatingWindow;

    floatingWindow.setTitle(instructionPanelDefinition.title);
    floatingWindow.setIcon(instructionPanelDefinition.icon);

    const content = DrawUI.div();
    content.addClass("nav-instructions-content");

    const instructionRows = navigationInstructionRowsFromConfig(mode, navigationConfiguration);
    for (let rowIndex = 0; rowIndex < instructionRows.length; rowIndex++) {
      content.add(this.createInstructionRow(instructionRows[rowIndex]));
    }
    if (instructionRows.length > 0) {
      content.add(DrawUI.spacer("12px"));
    }
    const tips = instructionPanelDefinition.tips;
    for (let tipIndex = 0; tipIndex < tips.length; tipIndex++) {
      const tipEntry = tips[tipIndex];
      content.add(this.createTipRow(tipEntry[0], tipEntry[1]));
    }

    floatingWindow.setContent(content);

    context.dom.appendChild(floatingWindow.dom);
    this.hideTimeout = setTimeout(() => {
      this.hideInstructions();
    }, this.timeout);
  }

  createInstructionRow(keys) {
    const row = DrawUI.row();
    row.setClass("nav-key-row");

    keys.forEach(({ key, label }, index) => {
      const keyGroup = DrawUI.div();
      keyGroup.setClass("nav-key-group");

      const kbd = DrawUI.span();
      kbd.setClass("nav-kbd");
      kbd.setTextContent(key);

      const labelText = DrawUI.span();
      labelText.setClass("nav-key-label");
      labelText.setTextContent(label);

      keyGroup.add(kbd);
      keyGroup.add(labelText);

      row.add(keyGroup);
      if (index < keys.length - 1) {
        const sep = DrawUI.span();
        sep.setClass("nav-key-separator");
        row.add(sep);
      }
    });

    return row;
  }

  createTipRow(key, description) {
    const row = DrawUI.row();
    row.setClass("nav-tip-row");

    const kbd = DrawUI.span();
    kbd.setClass("nav-kbd nav-kbd-small");
    kbd.setTextContent(key);

    const desc = DrawUI.span();
    desc.setClass("nav-tip-desc");
    desc.setTextContent(description);

    row.add(kbd);
    row.add(desc);

    return row;
  }

  hideInstructions() {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);

      this.hideTimeout = null;
    }

    if (this.instructionsPanel && this.instructionsPanel.dom.parentNode) {
      this.instructionsPanel.dom.remove();

      this.instructionsPanel = null;
    }
  }

  onKeysMoveModeCheckboxChange(event) {
    const inputElement = event.target;
    if (!inputElement || inputElement !== this.keysMoveModeCheckboxInput) {
      return;
    }
    if (inputElement.checked) {
      this.leftControlMode = "move";
    } else {
      this.leftControlMode = "keys";
    }
    if (this.mobileJoystick && this.mobileJoystick.leftJoystick && this.mobileJoystick.leftJoystick.active) {
      this.mobileJoystick.deactivateJoystick(this.mobileJoystick.leftJoystick);
    }
    if (!this.context) {
      return;
    }
    this.refreshViewportKeyboard(this.context);
  }

  syncKeysMoveModeCheckbox() {
    if (!this.keysMoveModeCheckboxInput) {
      return;
    }
    const keysInput = this.keysMoveModeCheckboxInput;
    if (!(keysInput instanceof HTMLInputElement)) {
      return;
    }
    keysInput.checked = this.leftControlMode === "move";
  }

  syncAboveCameraCheckbox() {
    if (!this.aboveCameraCheckboxInput) {
      return;
    }
    const navigationController =
      this.context && this.context.editor && this.context.editor.navigationController;
    if (!navigationController || typeof navigationController.getCameraViewMode !== "function") {
      return;
    }
    const navigationMode = navigationController.getMode();
    if (navigationMode !== "FLY" && navigationMode !== "FIRST_PERSON") {
      return;
    }
    const cameraViewMode = navigationController.getCameraViewMode();
    const aboveInput = this.aboveCameraCheckboxInput;
    if (!(aboveInput instanceof HTMLInputElement)) {
      return;
    }
    this.aboveCameraCheckboxSuppressChange = true;
    aboveInput.checked = cameraViewMode === "THIRD_PERSON";
    this.aboveCameraCheckboxSuppressChange = false;
  }

  onAboveCameraCheckboxChange(event) {
    if (this.aboveCameraCheckboxSuppressChange) {
      return;
    }
    const inputElement = event.target;
    if (!inputElement || inputElement !== this.aboveCameraCheckboxInput) {
      return;
    }
    if (!this.context || !this.operators) {
      return;
    }
    const navigationController = this.context.editor && this.context.editor.navigationController;
    if (!navigationController || typeof navigationController.getCameraViewMode !== "function") {
      return;
    }
    const wantsAboveChase = inputElement.checked;
    const isAboveChase = navigationController.getCameraViewMode() === "THIRD_PERSON";
    if (wantsAboveChase !== isAboveChase) {
      this.operators.execute("navigation.toggle_fly_camera_rig", this.context);
    }
    this.syncAboveCameraCheckbox();
  }

  syncLeftControlVisibility() {
    if (!this.context) {
      return;
    }
    if (!this.leftKeysHostElement || !this.leftMoveSectionElement || !this.keysMoveModeCheckboxInput) {
      return;
    }
    this.syncKeysMoveModeCheckbox();
    if (this.keysMoveModeCheckboxRowElement) {
      this.keysMoveModeCheckboxRowElement.style.display = "";
    }
    if (this.leftControlMode === "keys") {
      this.leftKeysHostElement.style.display = "";
      this.leftMoveSectionElement.style.display = "none";
    } else {
      this.leftKeysHostElement.style.display = "none";
      this.leftMoveSectionElement.style.display = "";
      if (this.leftAuxRowElement) {
        this.leftAuxRowElement.style.display = "";
      }
    }
  }

  initViewportOverlayWhenReady(context) {
    const tryMount = () => {
      if (context.editor && context.editor.navigationController) {
        this.mountViewportKeyboard(context);
        return true;
      }
      return false;
    };
    if (tryMount()) {
      return;
    }
    const checkEditor = setInterval(() => {
      if (tryMount()) {
        clearInterval(checkEditor);
      }
    }, 100);
    setTimeout(() => clearInterval(checkEditor), 10000);
  }

  buildAuxiliaryMoveRow() {
    const row = DrawUI.div();
    row.addClass("addon-navigation-move-aux-row");
    const navigationController = this.context.editor && this.context.editor.navigationController;
    const applyMoveStateBoolean = (propertyName, value) => {
      if (navigationController && navigationController.moveState) {
        navigationController.moveState[propertyName] = value;
      }
    };
    const addHoldButton = (label, onPress, onRelease) => {
      const button = DrawUI.button(label);
      button.dom.setAttribute("type", "button");
      button.dom.className = "addon-navigation-move-aux-button";
      button.dom.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        button.dom.setPointerCapture(event.pointerId);
        onPress();
      });
      button.dom.addEventListener("pointerup", (event) => {
        event.preventDefault();
        if (button.dom.hasPointerCapture(event.pointerId)) {
          button.dom.releasePointerCapture(event.pointerId);
        }
        onRelease();
      });
      button.dom.addEventListener("pointercancel", () => {
        onRelease();
      });
      button.dom.addEventListener("lostpointercapture", () => {
        onRelease();
      });
      row.add(button);
    };
    const mode = navigationController && navigationController.getMode ? navigationController.getMode() : "";
    if (mode === "DRIVE") {
      addHoldButton(
        "\u26a1",
        () => {
          applyMoveStateBoolean("sprint", true);
        },
        () => {
          applyMoveStateBoolean("sprint", false);
        }
      );
      return row.dom;
    }
    addHoldButton(
      "\u25b2",
      () => {
        applyMoveStateBoolean("up", true);
      },
      () => {
        applyMoveStateBoolean("up", false);
      }
    );
    addHoldButton(
      "\u25bc",
      () => {
        applyMoveStateBoolean("down", true);
      },
      () => {
        applyMoveStateBoolean("down", false);
      }
    );
    addHoldButton(
      "\u26a1",
      () => {
        applyMoveStateBoolean("sprint", true);
      },
      () => {
        applyMoveStateBoolean("sprint", false);
      }
    );
    return row.dom;
  }

  createLabeledCheckboxRow({ inputId, ariaLabel, labelText, onChange }) {
    const row = DrawUI.div();
    row.addClass("addon-navigation-keys-move-checkbox-row");
    const checkbox = new UICheckbox(false);
    checkbox.dom.id = inputId;
    checkbox.dom.className = "addon-navigation-keys-move-checkbox";
    checkbox.dom.setAttribute("aria-label", ariaLabel);
    checkbox.dom.addEventListener("change", onChange);
    const label = new UILabel(labelText);
    label.dom.className = "addon-navigation-keys-move-checkbox-label";
    label.setFor(inputId);
    row.add(checkbox);
    row.add(label);
    return { rowElement: row.dom, inputElement: checkbox.dom };
  }

  mountViewportKeyboard(context) {
    const viewportElement = this.getViewportElement(context);
    if (!viewportElement) {
      return;
    }
    if (this.viewportKeyboardRoot && this.viewportKeyboardRoot.dom.parentNode) {
      this.mobileJoystick.setNavigationController(context.editor.navigationController);
      if (context.editor && context.editor.navigationController) {
        context.editor.navigationController.touchSticks = this.mobileJoystick;
      }
      this.refreshViewportKeyboard(context);
      return;
    }
    if (viewportElement.style.position === "") {
      viewportElement.style.position = "relative";
    }

    const root = DrawUI.div();
    root.setId("addon-navigation-viewport-keyboard");
    root.addClass("nav-instructions-content");
    root.addClass("addon-navigation-viewport-overlay");

    const leftStack = DrawUI.div();
    leftStack.addClass("addon-navigation-left-stack");
    this.leftStackElement = leftStack.dom;

    const leftColumnContent = DrawUI.div();
    leftColumnContent.addClass("addon-navigation-left-column-content");

    const leftKeysHost = DrawUI.div();
    leftKeysHost.addClass("addon-navigation-left-keys-host");
    this.leftKeysHostElement = leftKeysHost.dom;

    const leftMoveSection = DrawUI.div();
    leftMoveSection.addClass("addon-navigation-left-move-section");
    this.leftMoveSectionElement = leftMoveSection.dom;

    const moveStickHost = DrawUI.div();
    moveStickHost.addClass("addon-navigation-move-stick-host");

    const rightStack = DrawUI.div();
    rightStack.addClass("addon-navigation-right-stack");

    const lookStickHost = DrawUI.div();
    lookStickHost.addClass("addon-navigation-look-stick-host");

    const keysMoveModeCheckboxParts = this.createLabeledCheckboxRow({
      inputId: "addon-navigation-keys-move-mode-checkbox",
      ariaLabel: "Joystick instead of keys",
      labelText: "joystick",
      onChange: this.onKeysMoveModeCheckboxChange,
    });
    this.keysMoveModeCheckboxRowElement = keysMoveModeCheckboxParts.rowElement;
    this.keysMoveModeCheckboxInput = keysMoveModeCheckboxParts.inputElement;

    const aboveCameraCheckboxParts = this.createLabeledCheckboxRow({
      inputId: "addon-navigation-above-camera-checkbox",
      ariaLabel: "Above chase camera instead of cockpit",
      labelText: "Above camera",
      onChange: this.onAboveCameraCheckboxChange,
    });
    this.aboveCameraCheckboxRowElement = aboveCameraCheckboxParts.rowElement;
    this.aboveCameraCheckboxInput = aboveCameraCheckboxParts.inputElement;

    const leftOptionsColumn = DrawUI.div();
    leftOptionsColumn.addClass("addon-navigation-left-options-column");
    leftOptionsColumn.dom.appendChild(keysMoveModeCheckboxParts.rowElement);
    leftOptionsColumn.dom.appendChild(aboveCameraCheckboxParts.rowElement);

    leftColumnContent.add(leftOptionsColumn);
    leftColumnContent.add(leftKeysHost);
    leftMoveSection.add(moveStickHost);
    leftColumnContent.add(leftMoveSection);
    leftStack.add(leftColumnContent);
    rightStack.add(lookStickHost);

    root.add(leftStack);
    root.add(rightStack);
    viewportElement.appendChild(root.dom);

    this.viewportKeyboardRoot = root;

    const sticks = new ViewportNavigationSticks(context.editor.navigationController);
    sticks.mountMoveAndLook(moveStickHost.dom, lookStickHost.dom);
    sticks.enable();
    this.mobileJoystick = sticks;
    if (context.editor && context.editor.navigationController) {
      context.editor.navigationController.touchSticks = sticks;
    }

    window.addEventListener("blur", this.onViewportKeyboardBlur);
    this.refreshViewportKeyboard(context);
  }

  enableMobileJoystick() {
    const navigationController =
      this.context && this.context.editor && this.context.editor.navigationController;
    if (navigationController) {
      navigationController.touchOverlaySuppressed = false;
    }
    if (this.context) {
      this.refreshViewportKeyboard(this.context);
    } else if (this.mobileJoystick) {
      this.mobileJoystick.forceEnable();
    }
  }

  disableMobileJoystick() {
    const navigationController =
      this.context && this.context.editor && this.context.editor.navigationController;
    if (navigationController) {
      navigationController.touchOverlaySuppressed = true;
    }
    if (this.mobileJoystick) {
      this.mobileJoystick.disable();
    }
    if (this.viewportKeyboardRoot && this.viewportKeyboardRoot.dom) {
      this.viewportKeyboardRoot.dom.style.display = "none";
    }
  }

  getMobileJoystick() {
    return this.mobileJoystick;
  }

  getViewportElement(context) {
    if (context.viewport && context.viewport.dom) {
      return context.viewport.dom;
    }
    const fallbackViewport = document.getElementById("Viewport");
    if (fallbackViewport) {
      return fallbackViewport;
    }
    return null;
  }

  draw(context) {
    if (!this.operators) {
      return;
    }
    if (this.navigationSettingsPanel && this.navigationSettingsPanel.dom.parentNode) {
      return;
    }
    const floatingWindow = DrawUI.floatingPanel({ title: "Navigation Settings" });
    const settings = { moveSpeed: 30 };
    const moveSpeedInput = DrawUI.number(settings.moveSpeed);
    moveSpeedInput.onblur(() => {
      this.operators.execute("navigation.configure_fly", context, { moveSpeed: moveSpeedInput.getValue() });
    });
    floatingWindow.setContent(moveSpeedInput);
    floatingWindow.setStyle("top", ["10px"]);
    floatingWindow.setStyle("left", ["calc(100vw - var(--sidebar-width) - var(--margin))"]);
    document.body.appendChild(floatingWindow.dom);
    this.navigationSettingsPanel = floatingWindow;
  }

  clearMovementKeyGridHost() {
    if (!this.leftKeysHostElement) {
      return;
    }
    while (this.leftKeysHostElement.firstChild) {
      this.leftKeysHostElement.removeChild(this.leftKeysHostElement.firstChild);
    }
  }

  removeAuxiliaryMoveRowFromSection() {
    if (!this.leftMoveSectionElement) {
      return;
    }
    const existingAuxiliaryRow = this.leftMoveSectionElement.querySelector(".addon-navigation-move-aux-row");
    if (existingAuxiliaryRow && existingAuxiliaryRow.parentNode) {
      existingAuxiliaryRow.parentNode.removeChild(existingAuxiliaryRow);
    }
    this.leftAuxRowElement = null;
  }

  refreshViewportKeyboard(context) {
    if (!this.viewportKeyboardRoot || !this.leftKeysHostElement || !this.leftMoveSectionElement) {
      return;
    }
    this.releaseAllSimulatedKeys();

    const navigationController = context.editor && context.editor.navigationController;
    if (!navigationController) {
      return;
    }
    if (this.mobileJoystick) {
      this.mobileJoystick.setNavigationController(navigationController);
    }

    if (navigationController.touchOverlaySuppressed) {
      this.viewportKeyboardRoot.dom.style.display = "none";
      if (this.mobileJoystick) {
        this.mobileJoystick.disable();
      }
      return;
    }

    const mode = navigationController.getMode();
    if (mode === "ORBIT") {
      this.clearMovementKeyGridHost();
      this.removeAuxiliaryMoveRowFromSection();
      if (this.mobileJoystick) {
        if (this.mobileJoystick.leftJoystick && this.mobileJoystick.leftJoystick.active) {
          this.mobileJoystick.deactivateJoystick(this.mobileJoystick.leftJoystick);
        }
        if (this.mobileJoystick.rightJoystick && this.mobileJoystick.rightJoystick.active) {
          this.mobileJoystick.deactivateJoystick(this.mobileJoystick.rightJoystick);
        }
        this.mobileJoystick.disable();
      }
      this.viewportKeyboardRoot.dom.style.display = "none";
      return;
    }

    this.viewportKeyboardRoot.dom.style.display = "";
    if (this.mobileJoystick) {
      this.mobileJoystick.enable();
    }

    this.clearMovementKeyGridHost();
    this.removeAuxiliaryMoveRowFromSection();

    const auxRow = this.buildAuxiliaryMoveRow();
    this.leftAuxRowElement = auxRow;
    this.leftMoveSectionElement.insertBefore(auxRow, this.leftMoveSectionElement.firstChild);
    this.syncLeftControlVisibility();

    if (this.aboveCameraCheckboxRowElement) {
      if (mode === "FLY" || mode === "FIRST_PERSON") {
        this.aboveCameraCheckboxRowElement.style.display = "";
        this.syncAboveCameraCheckbox();
      } else {
        this.aboveCameraCheckboxRowElement.style.display = "none";
      }
    }

    if (this.leftControlMode !== "keys") {
      return;
    }

    const flyKeys = navigationController.keyMappings && navigationController.keyMappings.fly
      ? navigationController.keyMappings.fly.keys
      : {};
    const driveKeys = navigationController.keyMappings && navigationController.keyMappings.drive
      ? navigationController.keyMappings.drive.keys
      : {};
    const keys = mode === "DRIVE" ? driveKeys : flyKeys;

    const forwardCode = keys.forward || keys.accelerate || "KeyW";
    const leftCode = keys.left || "KeyA";
    const backwardCode = keys.backward || keys.brake || "KeyS";
    const rightCode = keys.right || "KeyD";
    const upCode = mode === "DRIVE" ? "" : keys.up || "KeyE";
    const downCode = mode === "DRIVE" ? "" : keys.down || "KeyQ";
    const sprintKeyLegend = "accelerate";
    const sprintAccessibilityLabel = mode === "DRIVE" ? "Boost" : "Accelerate";

    const cluster = DrawUI.div();
    cluster.addClass("addon-navigation-kbd-cluster");

    const movementGrid = DrawUI.div();
    movementGrid.addClass("addon-navigation-kbd-grid");

    if (upCode && downCode) {
      movementGrid.add(this.createKeyCell("down", downCode, "vertical-word"));
      movementGrid.add(this.createKeyCell(NAVIGATION_KEYBOARD_ARROW_UP, forwardCode, "arrow"));
      movementGrid.add(this.createKeyCell("up", upCode, "vertical-word"));
      movementGrid.add(this.createKeyCell(NAVIGATION_KEYBOARD_ARROW_LEFT, leftCode, "arrow"));
      movementGrid.add(this.createKeyCell(NAVIGATION_KEYBOARD_ARROW_DOWN, backwardCode, "arrow"));
      movementGrid.add(this.createKeyCell(NAVIGATION_KEYBOARD_ARROW_RIGHT, rightCode, "arrow"));
    } else {
      const forwardCell = this.createKeyCell(NAVIGATION_KEYBOARD_ARROW_UP, forwardCode, "arrow");
      placeMovementKeyOnGrid(forwardCell, 1, 2);
      movementGrid.add(forwardCell);
      const leftCell = this.createKeyCell(NAVIGATION_KEYBOARD_ARROW_LEFT, leftCode, "arrow");
      placeMovementKeyOnGrid(leftCell, 2, 1);
      movementGrid.add(leftCell);
      const backwardCell = this.createKeyCell(NAVIGATION_KEYBOARD_ARROW_DOWN, backwardCode, "arrow");
      placeMovementKeyOnGrid(backwardCell, 2, 2);
      movementGrid.add(backwardCell);
      const rightCell = this.createKeyCell(NAVIGATION_KEYBOARD_ARROW_RIGHT, rightCode, "arrow");
      placeMovementKeyOnGrid(rightCell, 2, 3);
      movementGrid.add(rightCell);
    }

    cluster.add(movementGrid);

    const sprintCell = this.createSprintCell(context, sprintKeyLegend, sprintAccessibilityLabel);
    const sprintRow = DrawUI.div();
    sprintRow.addClass("addon-navigation-kbd-row");
    sprintRow.addClass("addon-navigation-kbd-row--sprint");
    sprintRow.add(sprintCell);

    cluster.add(sprintRow);

    this.leftKeysHostElement.appendChild(cluster.dom);
    this.syncLeftControlVisibility();
    this.syncAboveCameraCheckbox();
  }

  createKeyCell(displayText, keyCode, variant) {
    const keyGroup = DrawUI.div();
    keyGroup.setClass("addon-navigation-key-cell");

    const keycap = DrawUI.span();
    keycap.setClass("nav-kbd");
    if (variant === "vertical-word") {
      keycap.addClass("addon-navigation-kbd-cap--word");
    } else if (variant === "arrow") {
      keycap.addClass("addon-navigation-kbd-cap--arrow");
    }
    keycap.setTextContent(displayText);

    keyGroup.add(keycap);

    const keyboardEventLabel = humanizeKeyCode(keyCode);

    const activate = (event) => {
      event.preventDefault();
      this.pressSimulatedKey(keyCode, keyboardEventLabel);
      keycap.addClass("key--on");
    };
    const deactivate = (event) => {
      if (event) {
        event.preventDefault();
      }
      this.releaseSimulatedKey(keyCode, keyboardEventLabel);
      keycap.removeClass("key--on");
    };

    keyGroup.dom.addEventListener("pointerdown", activate);
    keyGroup.dom.addEventListener("pointerup", deactivate);
    keyGroup.dom.addEventListener("pointerleave", deactivate);
    keyGroup.dom.addEventListener("pointercancel", deactivate);
    keyGroup.dom.addEventListener("lostpointercapture", deactivate);

    return keyGroup;
  }

  createSprintCell(context, keyLegendText, accessibilityLabel) {
    const wrapper = DrawUI.div();
    wrapper.setClass("addon-nav-sprint-toggle");

    const keycap = DrawUI.span();
    keycap.setClass("nav-kbd addon-navigation-kbd-sprint-key");
    keycap.setTextContent(keyLegendText);
    keycap.dom.setAttribute("role", "button");
    keycap.dom.setAttribute("tabindex", "0");
    if (accessibilityLabel) {
      keycap.dom.setAttribute("aria-label", accessibilityLabel);
      keycap.dom.setAttribute("title", accessibilityLabel);
    }

    const syncSprintKeyVisual = () => {
      const controller = context.editor && context.editor.navigationController;
      const sprintIsOn = controller && controller.moveState && controller.moveState.sprint;
      if (sprintIsOn) {
        keycap.addClass("key--on");
        keycap.dom.setAttribute("aria-pressed", "true");
      } else {
        keycap.removeClass("key--on");
        keycap.dom.setAttribute("aria-pressed", "false");
      }
    };

    syncSprintKeyVisual();

    const toggleSprint = () => {
      const controller = context.editor && context.editor.navigationController;
      if (!controller || !controller.moveState) {
        return;
      }
      controller.moveState.sprint = !controller.moveState.sprint;
      if (typeof controller.triggerMovementUpdate === "function") {
        controller.triggerMovementUpdate();
      }
      syncSprintKeyVisual();
    };

    keycap.dom.addEventListener("click", (event) => {
      event.preventDefault();
      toggleSprint();
    });
    keycap.dom.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleSprint();
      }
    });

    wrapper.add(keycap);

    return wrapper;
  }

  createKeyboardEvent(type, keyCode, keyLabel) {
    const eventInit = {
      key: keyLabel === "Space" ? " " : keyLabel,
      code: keyCode,
      bubbles: true,
      cancelable: true,
      composed: true,
    };
    if (keyCode === "ShiftLeft" || keyCode === "ShiftRight") {
      eventInit.key = "Shift";
      eventInit.shiftKey = type === "keydown";
    }
    return new KeyboardEvent(type, eventInit);
  }

  pressSimulatedKey(keyCode, keyLabel) {
    if (!keyCode || this.activeKeyCodes.has(keyCode)) {
      return;
    }
    this.activeKeyCodes.add(keyCode);
    document.dispatchEvent(this.createKeyboardEvent("keydown", keyCode, keyLabel));
  }

  releaseSimulatedKey(keyCode, keyLabel) {
    if (!keyCode || !this.activeKeyCodes.has(keyCode)) {
      return;
    }
    this.activeKeyCodes.delete(keyCode);
    document.dispatchEvent(this.createKeyboardEvent("keyup", keyCode, keyLabel));
  }

  releaseAllSimulatedKeys() {
    const heldCodes = Array.from(this.activeKeyCodes);
    for (let index = 0; index < heldCodes.length; index++) {
      const keyCode = heldCodes[index];
      this.releaseSimulatedKey(keyCode, humanizeKeyCode(keyCode));
    }
  }
}

export { NavigationUI };
