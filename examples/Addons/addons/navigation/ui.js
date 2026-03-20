import { DrawUI } from "../../../../drawUI/index.js";

import { MobileJoystick } from "./MobileJoystick.js";

class AddonNavigationUI  {
  constructor({ context, operators }) {
    this.context = context;

    this.operators = operators;

    this.mobileJoystick = null;

    this.listen(context, operators);

    this.initMobileJoystick(context);
  }

  /**
   * Initialize mobile joystick if on touch device
   */
  initMobileJoystick(context) {
    // Wait for editor to be ready
    if (context.editor && context.editor.navigationController) {
      this.setupMobileJoystick(context.editor.navigationController);
    } else {
      // Listen for editor ready
      const checkEditor = setInterval(() => {
        if (context.editor && context.editor.navigationController) {
          clearInterval(checkEditor);

          this.setupMobileJoystick(context.editor.navigationController);
        }
      }, 100);

      // Clear after 10 seconds if not found
      setTimeout(() => clearInterval(checkEditor), 10000);
    }
  }

  /**
   * Setup mobile joystick with navigation controller
   */
  setupMobileJoystick(navigationController) {
    this.mobileJoystick = new MobileJoystick(navigationController);
    
    // Auto-enable on mobile devices
     this.mobileJoystick.enable();
     
    if (this.mobileJoystick.detectMobile()) {
      this.mobileJoystick.enable();

      console.log('Mobile joystick auto-enabled for touch device');
    }
  }

  /**
   * Enable mobile joystick manually (for testing on desktop)
   */
  enableMobileJoystick() {
    if (this.mobileJoystick) {
      this.mobileJoystick.forceEnable();
    }
  }

  /**
   * Disable mobile joystick
   */
  disableMobileJoystick() {
    if (this.mobileJoystick) {
      this.mobileJoystick.disable();
    }
  }

  /**
   * Get mobile joystick instance
   */
  getMobileJoystick() {
    return this.mobileJoystick;
  }

  listen(context, operators) {
    context.addListener(['displaySettings']);

    context.signals.displaySettings.add((args) => {
      this.draw(context, operators);
    });
  }

  draw(context, operators) {
    const floatingWindow = DrawUI.floatingPanel({title: 'Navigation Settings'});

    const settings = {
      "moveSpeed": 30,
    }

    const buttonFlyMode = DrawUI.number(settings.moveSpeed);

    const callback = () => {
      operators.execute("addon.navigation.configure_fly", context, {"moveSpeed": buttonFlyMode.getValue()} );
    }

    buttonFlyMode.onblur(callback);

    floatingWindow.setContent(buttonFlyMode);

    floatingWindow.setStyle('top', ['10px']);

    floatingWindow.setStyle('left', ['calc(100vw - var(--sidebar-width) - var(--margin))']);

    document.body.appendChild(floatingWindow.dom);
    
  }

  draw2(context, operators) {
    console.log("TODO");
  }
}

export { AddonNavigationUI };
