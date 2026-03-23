import { Components as UIComponents } from "../../ui/Components/Components.js";

import { UIDiv, UIRow, UISpan } from "../../../drawUI/ui.js";

import { DrawUI } from "../../../drawUI/index.js";

import { ViewportNavigationSticks } from "./ViewportNavigationSticks.js";

import {
  humanizeKeyCode,
  NAVIGATION_KEYBOARD_ARROW_UP,
  NAVIGATION_KEYBOARD_ARROW_LEFT,
  NAVIGATION_KEYBOARD_ARROW_DOWN,
  NAVIGATION_KEYBOARD_ARROW_RIGHT,
  placeMovementKeyOnGrid,
  isUnmodifiedShiftKeyEvent,
  NAVIGATION_INSTRUCTION_PANELS_WITH_KEY_ROWS,
  buildNavigationInstructionRows,
} from "./navigationInstructionContent.js";


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
    this.overlayInnerElement = null;
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
      const button = UIComponents.operator(tool.icon);
      button.dom.title = tool.name;
      button.onClick(() => {
        if (tool.operator === "navigation.set_mode") {
          operators.execute(tool.operator, context, tool.mode, tool.operatorOptions ?? {});
        } else {
          operators.execute(tool.operator, context, tool.operatorOptions ?? {});
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

    const floatingWindow = UIComponents.floatingPanel();

    floatingWindow.setSize("auto", "auto");

    floatingWindow.setStyle("left", ["10px"]);

    floatingWindow.setStyle("top", ["50vh"]);

    this.instructionsPanel = floatingWindow;

    const content = new UIDiv();

    content.setClass("nav-instructions-content");

    const navigationConfiguration = context.config.app.Navigation;
    const instructionRows = this.getInstructionRows(mode, navigationConfiguration);
    const instructionPanelWithKeyRows = NAVIGATION_INSTRUCTION_PANELS_WITH_KEY_ROWS[mode];

    if (instructionPanelWithKeyRows) {
      floatingWindow.setTitle(instructionPanelWithKeyRows.title);
      floatingWindow.setIcon(instructionPanelWithKeyRows.icon);
      instructionRows.forEach((row) => {
        content.add(this.createInstructionRow(row));
      });
      content.add(UIComponents.spacer("12px"));
      const tips = instructionPanelWithKeyRows.tips;
      for (let tipIndex = 0; tipIndex < tips.length; tipIndex++) {
        const tipEntry = tips[tipIndex];
        content.add(this.createTipRow(tipEntry[0], tipEntry[1]));
      }
    } else if (mode === "ORBIT") {
      floatingWindow.setTitle("ORBIT MODE");

      floatingWindow.setIcon("3d_rotation");

      content.add(this.createTipRow("Left Click + Drag", "Rotate view"));

      content.add(this.createTipRow("Right Click + Drag", "Pan"));

      content.add(this.createTipRow("Scroll", "Zoom in/out"));
    }

    floatingWindow.setContent(content);

    context.dom.appendChild(floatingWindow.dom);
    this.hideTimeout = setTimeout(() => {
      this.hideInstructions();
    }, this.timeout);
  }

  getInstructionRows(mode, navigationConfiguration) {
    return buildNavigationInstructionRows(mode, navigationConfiguration);
  }

  createInstructionRow(keys) {
    const row = new UIRow();

    row.setClass("nav-key-row");

    keys.forEach(({ key, label }, index) => {
      const keyGroup = new UIDiv();

      keyGroup.setClass("nav-key-group");

      const kbd = new UISpan();

      kbd.setClass("nav-kbd");

      kbd.setTextContent(key);

      const labelText = new UISpan();

      labelText.setClass("nav-key-label");

      labelText.setTextContent(label);

      keyGroup.add(kbd);

      keyGroup.add(labelText);

      row.add(keyGroup);
      if (index < keys.length - 1) {
        const sep = new UISpan();

        sep.setClass("nav-key-separator");

        row.add(sep);
      }
    });

    return row;
  }

  createTipRow(key, description) {
    const row = new UIRow();

    row.setClass("nav-tip-row");

    const kbd = new UISpan();

    kbd.setClass("nav-kbd nav-kbd-small");

    kbd.setTextContent(key);

    const desc = new UISpan();

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
    this.keysMoveModeCheckboxInput.checked = this.leftControlMode === "move";
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
    this.aboveCameraCheckboxSuppressChange = true;
    this.aboveCameraCheckboxInput.checked = cameraViewMode === "THIRD_PERSON";
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
    const row = document.createElement("div");
    row.className = "addon-navigation-move-aux-row";
    const navigationController = this.context.editor && this.context.editor.navigationController;
    const applyMoveStateBoolean = (propertyName, value) => {
      if (navigationController && navigationController.moveState) {
        navigationController.moveState[propertyName] = value;
      }
    };
    const addHoldButton = (label, onPress, onRelease) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "addon-navigation-move-aux-button";
      button.textContent = label;
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        onPress();
      });
      button.addEventListener("pointerup", (event) => {
        event.preventDefault();
        if (button.hasPointerCapture(event.pointerId)) {
          button.releasePointerCapture(event.pointerId);
        }
        onRelease();
      });
      button.addEventListener("pointercancel", () => {
        onRelease();
      });
      button.addEventListener("lostpointercapture", () => {
        onRelease();
      });
      return button;
    };
    const mode = navigationController && navigationController.getMode ? navigationController.getMode() : "";
    if (mode === "DRIVE") {
      const sprintButton = addHoldButton(
        "\u26a1",
        () => {
          applyMoveStateBoolean("sprint", true);
        },
        () => {
          applyMoveStateBoolean("sprint", false);
        }
      );
      row.appendChild(sprintButton);
      return row;
    }
    const upButton = addHoldButton(
      "\u25b2",
      () => {
        applyMoveStateBoolean("up", true);
      },
      () => {
        applyMoveStateBoolean("up", false);
      }
    );
    const downButton = addHoldButton(
      "\u25bc",
      () => {
        applyMoveStateBoolean("down", true);
      },
      () => {
        applyMoveStateBoolean("down", false);
      }
    );
    const sprintButton = addHoldButton(
      "\u26a1",
      () => {
        applyMoveStateBoolean("sprint", true);
      },
      () => {
        applyMoveStateBoolean("sprint", false);
      }
    );
    row.appendChild(upButton);
    row.appendChild(downButton);
    row.appendChild(sprintButton);
    return row;
  }

  createLabeledCheckboxRow({ inputId, ariaLabel, labelText, onChange }) {
    const rowElement = document.createElement("div");
    rowElement.className = "addon-navigation-keys-move-checkbox-row";
    const inputElement = document.createElement("input");
    inputElement.type = "checkbox";
    inputElement.className = "addon-navigation-keys-move-checkbox";
    inputElement.id = inputId;
    inputElement.setAttribute("aria-label", ariaLabel);
    inputElement.addEventListener("change", onChange);
    const labelElement = document.createElement("label");
    labelElement.className = "addon-navigation-keys-move-checkbox-label";
    labelElement.setAttribute("for", inputId);
    labelElement.textContent = labelText;
    rowElement.appendChild(inputElement);
    rowElement.appendChild(labelElement);
    return { rowElement, inputElement };
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

    const overlayInner = document.createElement("div");
    overlayInner.className = "addon-navigation-viewport-overlay-inner";
    this.overlayInnerElement = overlayInner;

    const leftStack = document.createElement("div");
    leftStack.className = "addon-navigation-left-stack";
    this.leftStackElement = leftStack;

    const leftPrimaryRow = document.createElement("div");
    leftPrimaryRow.className = "addon-navigation-left-primary-row";

    const leftColumnContent = document.createElement("div");
    leftColumnContent.className = "addon-navigation-left-column-content";

    const leftKeysHost = document.createElement("div");
    leftKeysHost.className = "addon-navigation-left-keys-host";
    this.leftKeysHostElement = leftKeysHost;

    const leftMoveSection = document.createElement("div");
    leftMoveSection.className = "addon-navigation-left-move-section";
    this.leftMoveSectionElement = leftMoveSection;

    const moveStickHost = document.createElement("div");
    moveStickHost.className = "addon-navigation-move-stick-host";

    const rightStack = document.createElement("div");
    rightStack.className = "addon-navigation-right-stack";

    const lookStickHost = document.createElement("div");
    lookStickHost.className = "addon-navigation-look-stick-host";

    const keysMoveModeCheckboxParts = this.createLabeledCheckboxRow({
      inputId: "addon-navigation-keys-move-mode-checkbox",
      ariaLabel: "Move stick instead of keys",
      labelText: "Move stick",
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

    leftColumnContent.appendChild(leftKeysHost);
    leftMoveSection.appendChild(moveStickHost);
    leftColumnContent.appendChild(leftMoveSection);
    leftPrimaryRow.appendChild(leftColumnContent);
    leftPrimaryRow.appendChild(keysMoveModeCheckboxParts.rowElement);
    leftPrimaryRow.appendChild(aboveCameraCheckboxParts.rowElement);
    leftStack.appendChild(leftPrimaryRow);
    rightStack.appendChild(lookStickHost);

    overlayInner.appendChild(leftStack);
    overlayInner.appendChild(rightStack);
    root.dom.appendChild(overlayInner);
    viewportElement.appendChild(root.dom);

    this.viewportKeyboardRoot = root;

    const sticks = new ViewportNavigationSticks(context.editor.navigationController);
    sticks.mountMoveAndLook(moveStickHost, lookStickHost);
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
    const sprintKeyLegend = "Shift";
    const sprintAccessibilityLabel = mode === "DRIVE" ? "Boost" : "Sprint";

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
