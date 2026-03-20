import { Components as UIComponents } from "../../ui/Components/Components.js";

import { UIDiv, UIRow, UISpan } from "../../../drawUI/ui.js";

class NavigationUI {
  constructor({ context, operators }) {
    this.context = context;

    this.instructionsPanel = null;

    this.hideTimeout = null;

    this.timeout = 10000; 

    context.addListeners(['navigationModeChanged'])

    this.createNavigationToolbar(context, operators);

    this.listen(context, operators);
  }

  createNavigationToolbar(context, operators) {
    const toolbar = document.getElementById("NavigationToolbar");

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

    const currentMode = context.editor?.navigationController?.getMode?.() ?? "ORBIT";
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

    const navConfig = context.config.app.Navigation;

    context.signals.navigationModeChanged.add(({ mode, options, showInstructions }) => {
      this.updateToolbarActiveState(mode);
      if (showInstructions) {
        this.showInstructions(mode, context);
      }
    });
    document.addEventListener("keydown", (keyboard) => {
      if (
        keyboard.shiftKey && keyboard.code === `Key${navConfig.fly.shortcut[1]}` && 
        !keyboard.ctrlKey &&
        !keyboard.altKey &&
        !keyboard.metaKey
      ) {
        editor.toggleFlyMode();
      }
      if (
        keyboard.shiftKey && keyboard.code === `Key${navConfig.firstPerson.shortcut[1]}` &&
        !keyboard.ctrlKey &&
        !keyboard.altKey &&
        !keyboard.metaKey
      ) {
        editor.setNavigationMode("FIRST_PERSON");
      }
      if (
        keyboard.shiftKey && keyboard.code === `Key${navConfig.drive.shortcut[1]}` &&
        !keyboard.ctrlKey &&
        !keyboard.altKey &&
        !keyboard.metaKey
      ) {
        editor.toggleDriveMode();
      }
      if (
        keyboard.shiftKey && keyboard.code === `Key${navConfig.orbit.shortcut[1]}` &&
        !keyboard.ctrlKey &&
        !keyboard.altKey &&
        !keyboard.metaKey
      ) {
        editor.setNavigationMode("ORBIT");
      }
      if (
        keyboard.shiftKey && keyboard.code === "NumpadDecimal" &&
        !keyboard.ctrlKey &&
        !keyboard.altKey &&
        !keyboard.metaKey
      ) {
        if (editor.selector.active_object ) {
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

    if (mode === "FLY") {
      floatingWindow.setTitle("FLY MODE");

      floatingWindow.setIcon("flight");

      content.add(
        this.createInstructionRow([
          { key: "W", label: "Forward" },
          { key: "A", label: "Left" },
          { key: "S", label: "Back" },
          { key: "D", label: "Right" },
        ])
      );

      content.add(
        this.createInstructionRow([
          { key: "Space", label: "Up" },
          { key: "Q", label: "Down" },
          { key: "Shift", label: "Sprint" },
        ])
      );

      content.add(UIComponents.spacer("12px"));

      content.add(this.createTipRow("Mouse", "Look around"));

      content.add(this.createTipRow("Click", "Enable mouse look"));

      content.add(this.createTipRow("ESC", "Exit fly mode"));
    } else if (mode === "FIRST_PERSON") {
      floatingWindow.setTitle("FIRST PERSON MODE");

      floatingWindow.setIcon("my_location");

      content.add(
        this.createInstructionRow([
          { key: "W", label: "Forward" },
          { key: "A", label: "Turn Left" },
          { key: "S", label: "Back" },
          { key: "D", label: "Turn Right" },
        ])
      );

      content.add(
        this.createInstructionRow([
          { key: "Space", label: "Up" },
          { key: "Q", label: "Down" },
          { key: "Shift", label: "Sprint" },
        ])
      );

      content.add(UIComponents.spacer("12px"));

      content.add(this.createTipRow("Crosshair", "Aim from screen center"));

      content.add(this.createTipRow("Mouse", "Look around"));

      content.add(this.createTipRow("Click", "Lock pointer"));

      content.add(this.createTipRow("ESC", "Exit first person mode"));
    } else if (mode === "DRIVE") {
      floatingWindow.setTitle("DRIVE MODE");

      floatingWindow.setIcon("directions_car");

      content.add(
        this.createInstructionRow([
          { key: "W", label: "Accelerate" },
          { key: "S", label: "Brake" },
        ])
      );

      content.add(
        this.createInstructionRow([
          { key: "A", label: "Steer Left" },
          { key: "D", label: "Steer Right" },
        ])
      );

      content.add(UIComponents.spacer("12px"));

      content.add(this.createTipRow("Shift", "Boost"));

      content.add(this.createTipRow("ESC", "Exit drive mode"));
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
}

export { NavigationUI };
