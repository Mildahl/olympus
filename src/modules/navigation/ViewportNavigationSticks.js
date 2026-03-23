export class ViewportNavigationSticks {
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

    const joystick = document.createElement("div");
    joystick.className = `addon-navigation-joystick addon-navigation-joystick--${side}`;
    joystick.dataset.side = side;

    const knob = document.createElement("div");
    knob.className = "addon-navigation-joystick-knob";

    const label = document.createElement("div");
    label.className = "addon-navigation-joystick-label";
    label.textContent = side === "left" ? "MOVE" : "LOOK";

    joystick.appendChild(knob);
    joystick.appendChild(label);

    joystick.style.width = `${joystickSize}px`;
    joystick.style.height = `${joystickSize}px`;
    joystick.style.opacity = String(opacity);

    knob.style.width = `${knobSize}px`;
    knob.style.height = `${knobSize}px`;

    return { joystick, knob };
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
