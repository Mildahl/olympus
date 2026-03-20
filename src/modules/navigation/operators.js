import { Operator } from "../../operators/Operator.js";

import * as NavigationCore from "../../core/navigation.js";

class ToggleFlyMode extends Operator {
  static operatorName = "navigation.toggle_fly_mode";

  static operatorLabel = "Toggle Fly Mode";

  static operatorOptions = ["REGISTER"];

  constructor(context, options = {}) {
    super(context);

    this.context = context;

    if (options && (options.isObject3D || options.object)) {
      this.options = { flyObject: options.isObject3D ? options : options.object };
    } else if (options && typeof options === 'object') {
      this.options = options;
    } else {
      this.options = { flyObject: options };
    }
  }

  poll() {
    return this.context.editor && this.context.editor.navigationController;
  }

  execute() {
    NavigationCore.toggleFlyMode({
      context: this.context,
      editor: this.context.editor,
      signals: this.context.signals,
      flyObject: this.options.flyObject || null,
      showInstructions: this.options.showInstructions ?? false
    });

    return { status: "FINISHED" };
  }
}

class ToggleDriveMode extends Operator {
  static operatorName = "navigation.toggle_drive_mode";

  static operatorLabel = "Toggle Drive Mode";

  static operatorOptions = ["REGISTER"];

  constructor(context, options = {}) {
    super(context);

    this.context = context;

    if (options && typeof options === 'object' && !options.isObject3D && !options.object) {
      this.options = options;
    } else {
      
      this.options = { vehicle: options };
    }
  }

  poll() {
    return this.context.editor && this.context.editor.navigationController;
  }

  execute() {
    NavigationCore.toggleDriveMode({
      context: this.context,
      editor: this.context.editor,
      signals: this.context.signals,
      vehicle: this.options.vehicle || null,
      grounds: this.options.grounds || [],
      extents: this.options.extents || null,
      showInstructions: this.options.showInstructions ?? false
    });

    return { status: "FINISHED" };
  }
}

class SetNavigationMode extends Operator {
  static operatorName = "navigation.set_mode";

  static operatorLabel = "Set Navigation Mode";

  static operatorOptions = ["REGISTER"];

  constructor(context, mode, options = {}) {
    super(context);

    this.context = context;

    this.mode = mode; 

    this.options = options;
  }

  poll() {
    return this.context.editor && this.context.editor.navigationController;
  }

  execute() {
    const result = NavigationCore.setNavigationMode(this.mode, {
      context: this.context,
      editor: this.context.editor,
      signals: this.context.signals,
      vehicle: this.options.vehicle,
      flyObject: this.options.flyObject,
      showInstructions: this.options.showInstructions ?? false
    });

    return { status: "FINISHED" };
  }
}

export default [ ToggleFlyMode, ToggleDriveMode, SetNavigationMode ];