import { Operator, tools } from "aeco";

/**
 * Configure Fly Mode Settings
 */
class ConfigureFlyMode extends Operator {
  static operatorName = "addon.navigation.configure_fly";

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

/**
 * Configure Drive Mode Settings
 */
class ConfigureDriveMode extends Operator {
  static operatorName = "addon.navigation.configure_drive";

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

/**
 * Enable Mobile Joystick Controls
 */
class EnableMobileJoystick extends Operator {
  static operatorName = "addon.navigation.enable_mobile_joystick";

  static operatorLabel = "Enable Mobile Joystick";

  static operatorOptions = ["REGISTER"];

  constructor(context, force = false) {
    super(context);

    this.context = context;

    this.force = force;
  }

  poll() {
    return this.context.navigationUI && this.context.navigationUI.mobileJoystick;
  }

  execute() {
    const joystick = this.context.navigationUI.mobileJoystick;

    if (this.force) {
      joystick.forceEnable();
    } else {
      joystick.enable();
    }

    console.log("Mobile joystick enabled");

    return { status: "FINISHED" };
  }
}

/**
 * Disable Mobile Joystick Controls
 */
class DisableMobileJoystick extends Operator {
  static operatorName = "addon.navigation.disable_mobile_joystick";

  static operatorLabel = "Disable Mobile Joystick";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;
  }

  poll() {
    return this.context.navigationUI && this.context.navigationUI.mobileJoystick;
  }

  execute() {
    this.context.navigationUI.disableMobileJoystick();

    console.log("Mobile joystick disabled");

    return { status: "FINISHED" };
  }
}

/**
 * Configure Mobile Joystick Settings
 */
class ConfigureMobileJoystick extends Operator {
  static operatorName = "addon.navigation.configure_mobile_joystick";

  static operatorLabel = "Configure Mobile Joystick";

  static operatorOptions = ["REGISTER"];

  constructor(context, settings) {
    super(context);

    this.context = context;

    this.settings = settings;
  }

  poll() {
    return this.context.navigationUI && this.context.navigationUI.mobileJoystick;
  }

  execute() {
    const joystick = this.context.navigationUI.mobileJoystick;

    joystick.configure(this.settings);

    console.log("Mobile joystick configured:", this.settings);

    return { status: "FINISHED" };
  }
}

export default [
  ConfigureFlyMode,
  ConfigureDriveMode,
  EnableMobileJoystick,
  DisableMobileJoystick,
  ConfigureMobileJoystick
];
