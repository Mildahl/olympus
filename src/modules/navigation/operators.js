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

class ToggleFlyCameraRig extends Operator {
  static operatorName = "navigation.toggle_fly_camera_rig";

  static operatorLabel = "Toggle fly camera rig";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;
  }

  poll() {
    return this.context.editor && this.context.editor.navigationController;
  }

  execute() {
    NavigationCore.toggleFlyCameraRig({
      editor: this.context.editor,
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

class ConfigureFlyMode extends Operator {
  static operatorName = "navigation.configure_fly";

  static operatorLabel = "Configure Fly Mode";

  static operatorOptions = ["REGISTER"];

  constructor(context, settings) {
    super(context);

    this.context = context;

    this.settings = settings;
  }

  poll() {
    return this.context.editor && this.context.editor.navigationController;
  }

  execute() {
    const navController = this.context.editor.navigationController;

    navController.setFlySettings(this.settings);

    return { status: "FINISHED" };
  }
}

class ConfigureDriveMode extends Operator {
  static operatorName = "navigation.configure_drive";

  static operatorLabel = "Configure Drive Mode";

  static operatorOptions = ["REGISTER"];

  constructor(context, settings) {
    super(context);

    this.context = context;

    this.settings = settings;
  }

  poll() {
    return this.context.editor && this.context.editor.navigationController;
  }

  execute() {
    const navController = this.context.editor.navigationController;

    navController.setDriveSettings(this.settings);

    return { status: "FINISHED" };
  }
}

class EnableMobileJoystick extends Operator {
  static operatorName = "navigation.enable_mobile_joystick";

  static operatorLabel = "Enable Mobile Joystick";

  static operatorOptions = ["REGISTER"];

  constructor(context, force = false) {
    super(context);

    this.context = context;

    this.force = force;
  }

  poll() {
    return this.context.editor && this.context.editor.navigationController;
  }

  execute() {
    const navigationController = this.context.editor.navigationController;
    navigationController.touchOverlaySuppressed = false;
    if (navigationController.touchSticks) {
      if (this.force) {
        navigationController.touchSticks.forceEnable();
      } else {
        navigationController.touchSticks.enable();
      }
    }
    const navigationUI = this.context.navigationUI;
    if (navigationUI && typeof navigationUI.refreshViewportKeyboard === "function") {
      navigationUI.refreshViewportKeyboard(this.context);
    }
    return { status: "FINISHED" };
  }
}

class DisableMobileJoystick extends Operator {
  static operatorName = "navigation.disable_mobile_joystick";

  static operatorLabel = "Disable Mobile Joystick";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;
  }

  poll() {
    return this.context.editor && this.context.editor.navigationController;
  }

  execute() {
    const navigationController = this.context.editor.navigationController;
    navigationController.touchOverlaySuppressed = true;
    if (navigationController.touchSticks) {
      navigationController.touchSticks.disable();
    }
    const navigationUI = this.context.navigationUI;
    if (
      navigationUI &&
      navigationUI.viewportKeyboardRoot &&
      navigationUI.viewportKeyboardRoot.dom
    ) {
      navigationUI.viewportKeyboardRoot.dom.style.display = "none";
    }

    return { status: "FINISHED" };
  }
}

class ConfigureMobileJoystick extends Operator {
  static operatorName = "navigation.configure_mobile_joystick";

  static operatorLabel = "Configure Mobile Joystick";

  static operatorOptions = ["REGISTER"];

  constructor(context, settings) {
    super(context);

    this.context = context;

    this.settings = settings;
  }

  poll() {
    const navigationController =
      this.context.editor && this.context.editor.navigationController;
    return navigationController && navigationController.touchSticks;
  }

  execute() {
    this.context.editor.navigationController.touchSticks.configure(this.settings);

    return { status: "FINISHED" };
  }
}

class SetOrbitNavigationMode extends Operator {
  static operatorName = "navigation.set_orbit";

  static operatorLabel = "Set orbit navigation";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;
  }

  poll() {
    return this.context.editor && this.context.editor.navigationController;
  }

  execute() {
    NavigationCore.setOrbitMode({
      context: this.context,
      editor: this.context.editor,
      signals: this.context.signals,
    });
    return { status: "FINISHED" };
  }
}

class SetNavigationSpeed extends Operator {
  static operatorName = "navigation.set_speed";

  static operatorLabel = "Set navigation speed";

  static operatorOptions = ["REGISTER"];

  constructor(context, speed) {
    super(context);

    this.context = context;

    this.speed = speed;
  }

  poll() {
    return this.context.editor && this.context.editor.navigationController;
  }

  execute() {
    NavigationCore.setNavigationSpeed(this.speed, {
      editor: this.context.editor,
      signals: this.context.signals,
    });
    return { status: "FINISHED" };
  }
}

class ResetNavigationCamera extends Operator {
  static operatorName = "navigation.reset_camera";

  static operatorLabel = "Reset camera";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;
  }

  poll() {
    return this.context.editor && this.context.editor.resetCamera;
  }

  execute() {
    NavigationCore.resetCamera({
      editor: this.context.editor,
      signals: this.context.signals,
    });
    return { status: "FINISHED" };
  }
}

class FitCameraToSelection extends Operator {
  static operatorName = "navigation.fit_selection";

  static operatorLabel = "Fit camera to selection";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;
  }

  poll() {
    return this.context.editor && this.context.editor.fitToSelection;
  }

  execute() {
    NavigationCore.fitCameraToSelection({
      editor: this.context.editor,
      signals: this.context.signals,
    });
    return { status: "FINISHED" };
  }
}

class FitCameraToAll extends Operator {
  static operatorName = "navigation.fit_all";

  static operatorLabel = "Fit camera to scene";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;
  }

  poll() {
    return this.context.editor && this.context.editor.fitToAll;
  }

  execute() {
    NavigationCore.fitCameraToAll({
      editor: this.context.editor,
      signals: this.context.signals,
    });
    return { status: "FINISHED" };
  }
}

class OpenMapLink extends Operator {
  static operatorName = "navigation.open_map_link";

  static operatorLabel = "Open map link";

  static operatorOptions = ["REGISTER"];

  constructor(context, latitude, longitude) {
    super(context);

    this.context = context;

    this.latitude = latitude;

    this.longitude = longitude;
  }

  poll() {
    return this.latitude != null && this.longitude != null;
  }

  execute() {
    const query =
      encodeURIComponent(String(this.latitude)) + "," + encodeURIComponent(String(this.longitude));
    window.open("https://www.google.com/maps?q=" + query, "_blank", "noopener,noreferrer");

    return { status: "FINISHED" };
  }
}

export default [
  ToggleFlyMode,
  ToggleDriveMode,
  ToggleFlyCameraRig,
  SetNavigationMode,
  SetOrbitNavigationMode,
  SetNavigationSpeed,
  ResetNavigationCamera,
  FitCameraToSelection,
  FitCameraToAll,
  ConfigureFlyMode,
  ConfigureDriveMode,
  EnableMobileJoystick,
  DisableMobileJoystick,
  ConfigureMobileJoystick,
  OpenMapLink,
];