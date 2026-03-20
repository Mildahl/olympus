/**
 * Mobile Joystick Controller - PlayStation-style dual joystick for touch devices
 * 
 * Left Joystick: Movement (forward/backward/left/right)
 * Right Joystick: Camera look (yaw/pitch)
 * 
 * Works with both FLY and ORBIT navigation modes
 */
class MobileJoystick {
  constructor(navigationController) {
    this.navigationController = navigationController;
    
    this.isEnabled = false;
    
    this.isMobile = this.detectMobile();

    // Joystick states
    this.leftJoystick = {
      active: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      deltaX: 0,
      deltaY: 0,
      touchId: null,
      element: null,
      knob: null,
    };

    this.rightJoystick = {
      active: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      deltaX: 0,
      deltaY: 0,
      touchId: null,
      element: null,
      knob: null,
    };

    // Configuration
    this.config = {
      joystickSize: 120,
      knobSize: 50,
      maxDistance: 50,
      deadzone: 0.1,
      moveSensitivity: 1.0,
      lookSensitivity: 0.03,
      opacity: 0.6,
      activeOpacity: 0.8,
    };

    // Container element
    this.container = null;

    // Bound methods
    this.onTouchStart = this.onTouchStart.bind(this);

    this.onTouchMove = this.onTouchMove.bind(this);

    this.onTouchEnd = this.onTouchEnd.bind(this);

    this.update = this.update.bind(this);

    // Animation frame
    this.animationId = null;
  }

  /**
   * Detect if device is mobile/touch
   */
  detectMobile() {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      ('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0)
    );
  }

  /**
   * Initialize and show joysticks if on mobile device
   */
  enable() {
    if (!this.isMobile) {
      return false;
    }

    if (this.isEnabled) return true;

    this.createUI();

    this.attachEventListeners();

    this.startUpdateLoop();
    
    this.isEnabled = true;

    console.log('MobileJoystick: Enabled');
    
    return true;
  }

  /**
   * Disable and hide joysticks
   */
  disable() {
    if (!this.isEnabled) return;

    this.stopUpdateLoop();

    this.removeEventListeners();

    this.removeUI();
    
    this.isEnabled = false;

    console.log('MobileJoystick: Disabled');
  }

  /**
   * Create the joystick UI elements
   */
  createUI() {
    // Main container
    this.container = document.createElement('div');

    this.container.id = 'mobile-joystick-container';

    Object.assign(this.container.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '9999',
      touchAction: 'none',
    });

    // Create left joystick (movement)
    this.leftJoystick.element = this.createJoystickElement('left');

    this.leftJoystick.knob = this.leftJoystick.element.querySelector('.joystick-knob');

    // Create right joystick (camera)
    this.rightJoystick.element = this.createJoystickElement('right');

    this.rightJoystick.knob = this.rightJoystick.element.querySelector('.joystick-knob');

    // Add action buttons
    this.createActionButtons();

    this.container.appendChild(this.leftJoystick.element);

    this.container.appendChild(this.rightJoystick.element);
    
    document.body.appendChild(this.container);
  }

  /**
   * Create a single joystick element
   */
  createJoystickElement(side) {
    const { joystickSize, knobSize, opacity } = this.config;

    const joystick = document.createElement('div');

    joystick.className = `joystick joystick-${side}`;

    joystick.dataset.side = side;
    
    Object.assign(joystick.style, {
      position: 'absolute',
      bottom: '30px',
      [side]: '30px',
      width: `${joystickSize}px`,
      height: `${joystickSize}px`,
      borderRadius: '50%',
      backgroundColor: `rgba(255, 255, 255, ${opacity * 0.3})`,
      border: `3px solid rgba(255, 255, 255, ${opacity})`,
      boxSizing: 'border-box',
      pointerEvents: 'auto',
      touchAction: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
    });

    // Inner knob
    const knob = document.createElement('div');

    knob.className = 'joystick-knob';

    Object.assign(knob.style, {
      width: `${knobSize}px`,
      height: `${knobSize}px`,
      borderRadius: '50%',
      backgroundColor: `rgba(255, 255, 255, ${opacity})`,
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
      transition: 'transform 0.05s ease-out',
      pointerEvents: 'none',
    });

    // Label
    const label = document.createElement('div');

    label.className = 'joystick-label';

    label.textContent = side === 'left' ? 'MOVE' : 'LOOK';

    Object.assign(label.style, {
      position: 'absolute',
      bottom: '-25px',
      left: '50%',
      transform: 'translateX(-50%)',
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
      pointerEvents: 'none',
    });

    joystick.appendChild(knob);

    joystick.appendChild(label);

    return joystick;
  }

  /**
   * Create action buttons (sprint, up, down)
   */
  createActionButtons() {
    const buttonsContainer = document.createElement('div');

    buttonsContainer.id = 'joystick-buttons';

    Object.assign(buttonsContainer.style, {
      position: 'absolute',
      right: '30px',
      bottom: `${this.config.joystickSize + 60}px`,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      pointerEvents: 'auto',
    });

    // Up button (Space equivalent)
    const upButton = this.createButton('▲', 'up', () => {
      if (this.navigationController) {
        this.navigationController.moveState.up = true;
      }
    }, () => {
      if (this.navigationController) {
        this.navigationController.moveState.up = false;
      }
    });

    // Down button (Q equivalent)
    const downButton = this.createButton('▼', 'down', () => {
      if (this.navigationController) {
        this.navigationController.moveState.down = true;
      }
    }, () => {
      if (this.navigationController) {
        this.navigationController.moveState.down = false;
      }
    });

    // Sprint button
    const sprintButton = this.createButton('⚡', 'sprint', () => {
      if (this.navigationController) {
        this.navigationController.moveState.sprint = true;
      }
    }, () => {
      if (this.navigationController) {
        this.navigationController.moveState.sprint = false;
      }
    });

    buttonsContainer.appendChild(upButton);

    buttonsContainer.appendChild(downButton);

    buttonsContainer.appendChild(sprintButton);

    // Mode toggle button (on left side)
    const modeButton = document.createElement('div');

    modeButton.id = 'joystick-mode-button';

    modeButton.textContent = 'MODE';

    Object.assign(modeButton.style, {
      position: 'absolute',
      left: '30px',
      bottom: `${this.config.joystickSize + 60}px`,
      width: '60px',
      height: '40px',
      borderRadius: '8px',
      backgroundColor: 'rgba(100, 150, 255, 0.6)',
      border: '2px solid rgba(255, 255, 255, 0.8)',
      color: 'white',
      fontSize: '12px',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'auto',
      touchAction: 'none',
      cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    });

    modeButton.addEventListener('touchstart', (e) => {
      e.preventDefault();

      this.toggleNavigationMode();
    });

    this.container.appendChild(buttonsContainer);

    this.container.appendChild(modeButton);
  }

  /**
   * Create a single action button
   */
  createButton(icon, id, onPress, onRelease) {
    const button = document.createElement('div');

    button.id = `joystick-btn-${id}`;

    button.textContent = icon;

    Object.assign(button.style, {
      width: '50px',
      height: '50px',
      borderRadius: '50%',
      backgroundColor: 'rgba(255, 255, 255, 0.4)',
      border: '2px solid rgba(255, 255, 255, 0.8)',
      color: 'white',
      fontSize: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      touchAction: 'none',
      cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
      userSelect: 'none',
    });

    button.addEventListener('touchstart', (e) => {
      e.preventDefault();

      button.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';

      onPress();
    });

    button.addEventListener('touchend', (e) => {
      e.preventDefault();

      button.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';

      onRelease();
    });

    button.addEventListener('touchcancel', (e) => {
      button.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';

      onRelease();
    });

    return button;
  }

  /**
   * Toggle between FLY and ORBIT modes
   */
  toggleNavigationMode() {
    if (!this.navigationController) return;

    const currentMode = this.navigationController.getMode();
    
    if (currentMode === 'ORBIT') {
      this.navigationController.setMode('FLY');
    } else {
      this.navigationController.setMode('ORBIT');
    }

    this.updateModeButtonUI();
  }

  /**
   * Update mode button appearance
   */
  updateModeButtonUI() {
    const modeButton = document.getElementById('joystick-mode-button');

    if (!modeButton || !this.navigationController) return;

    const mode = this.navigationController.getMode();

    modeButton.textContent = mode;
    
    if (mode === 'FLY') {
      modeButton.style.backgroundColor = 'rgba(100, 200, 100, 0.6)';
    } else if (mode === 'FIRST_PERSON') {
      modeButton.style.backgroundColor = 'rgba(0, 200, 180, 0.6)';
    } else if (mode === 'DRIVE') {
      modeButton.style.backgroundColor = 'rgba(200, 150, 100, 0.6)';
    } else {
      modeButton.style.backgroundColor = 'rgba(100, 150, 255, 0.6)';
    }
  }

  /**
   * Remove UI elements
   */
  removeUI() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    this.container = null;

    this.leftJoystick.element = null;

    this.leftJoystick.knob = null;

    this.rightJoystick.element = null;

    this.rightJoystick.knob = null;
  }

  /**
   * Attach touch event listeners
   */
  attachEventListeners() {
    document.addEventListener('touchstart', this.onTouchStart, { passive: false });

    document.addEventListener('touchmove', this.onTouchMove, { passive: false });

    document.addEventListener('touchend', this.onTouchEnd, { passive: false });

    document.addEventListener('touchcancel', this.onTouchEnd, { passive: false });
  }

  /**
   * Remove touch event listeners
   */
  removeEventListeners() {
    document.removeEventListener('touchstart', this.onTouchStart);

    document.removeEventListener('touchmove', this.onTouchMove);

    document.removeEventListener('touchend', this.onTouchEnd);

    document.removeEventListener('touchcancel', this.onTouchEnd);
  }

  /**
   * Handle touch start
   */
  onTouchStart(event) {
    for (const touch of event.changedTouches) {
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      
      // Check if touching left joystick
      if (this.isInsideJoystick(touch, this.leftJoystick.element) && !this.leftJoystick.active) {
        event.preventDefault();

        this.activateJoystick(this.leftJoystick, touch);
      }
      
      // Check if touching right joystick
      if (this.isInsideJoystick(touch, this.rightJoystick.element) && !this.rightJoystick.active) {
        event.preventDefault();

        this.activateJoystick(this.rightJoystick, touch);
      }
    }
  }

  /**
   * Handle touch move
   */
  onTouchMove(event) {
    for (const touch of event.changedTouches) {
      // Update left joystick
      if (this.leftJoystick.active && touch.identifier === this.leftJoystick.touchId) {
        event.preventDefault();

        this.updateJoystickPosition(this.leftJoystick, touch);
      }
      
      // Update right joystick
      if (this.rightJoystick.active && touch.identifier === this.rightJoystick.touchId) {
        event.preventDefault();

        this.updateJoystickPosition(this.rightJoystick, touch);
      }
    }
  }

  /**
   * Handle touch end
   */
  onTouchEnd(event) {
    for (const touch of event.changedTouches) {
      // Deactivate left joystick
      if (this.leftJoystick.active && touch.identifier === this.leftJoystick.touchId) {
        this.deactivateJoystick(this.leftJoystick);
      }
      
      // Deactivate right joystick
      if (this.rightJoystick.active && touch.identifier === this.rightJoystick.touchId) {
        this.deactivateJoystick(this.rightJoystick);
      }
    }
  }

  /**
   * Check if touch is inside joystick element
   */
  isInsideJoystick(touch, element) {
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();

    return (
      touch.clientX >= rect.left &&
      touch.clientX <= rect.right &&
      touch.clientY >= rect.top &&
      touch.clientY <= rect.bottom
    );
  }

  /**
   * Activate a joystick
   */
  activateJoystick(joystick, touch) {
    const rect = joystick.element.getBoundingClientRect();

    const centerX = rect.left + rect.width / 2;

    const centerY = rect.top + rect.height / 2;

    joystick.active = true;

    joystick.touchId = touch.identifier;

    joystick.startX = centerX;

    joystick.startY = centerY;

    joystick.currentX = touch.clientX;

    joystick.currentY = touch.clientY;

    joystick.element.style.opacity = this.config.activeOpacity;
    
    this.updateJoystickPosition(joystick, touch);
  }

  /**
   * Deactivate a joystick
   */
  deactivateJoystick(joystick) {
    joystick.active = false;

    joystick.touchId = null;

    joystick.deltaX = 0;

    joystick.deltaY = 0;

    // Reset knob position
    if (joystick.knob) {
      joystick.knob.style.transform = 'translate(0, 0)';
    }

    joystick.element.style.opacity = this.config.opacity;

    // Reset navigation controller state if left joystick
    if (joystick === this.leftJoystick && this.navigationController) {
      this.navigationController.moveState.forward = false;

      this.navigationController.moveState.backward = false;

      this.navigationController.moveState.left = false;

      this.navigationController.moveState.right = false;
    }
  }

  /**
   * Update joystick position based on touch
   */
  updateJoystickPosition(joystick, touch) {
    const dx = touch.clientX - joystick.startX;

    const dy = touch.clientY - joystick.startY;
    
    const distance = Math.sqrt(dx * dx + dy * dy);

    const maxDist = this.config.maxDistance;
    
    // Clamp to max distance
    let clampedX = dx;

    let clampedY = dy;
    
    if (distance > maxDist) {
      const ratio = maxDist / distance;

      clampedX = dx * ratio;

      clampedY = dy * ratio;
    }

    // Normalize to -1 to 1 range
    joystick.deltaX = clampedX / maxDist;

    joystick.deltaY = clampedY / maxDist;

    // Apply deadzone
    if (Math.abs(joystick.deltaX) < this.config.deadzone) joystick.deltaX = 0;

    if (Math.abs(joystick.deltaY) < this.config.deadzone) joystick.deltaY = 0;

    // Update visual knob position
    if (joystick.knob) {
      joystick.knob.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
    }
  }

  /**
   * Start the update loop
   */
  startUpdateLoop() {
    const loop = () => {
      this.update();

      this.animationId = requestAnimationFrame(loop);
    };

    loop();
  }

  /**
   * Stop the update loop
   */
  stopUpdateLoop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);

      this.animationId = null;
    }
  }

  /**
   * Main update loop - apply joystick input to navigation
   */
  update() {
    if (!this.navigationController) return;

    const mode = this.navigationController.getMode();

    // Update mode button UI periodically
    this.updateModeButtonUI();

    // Apply left joystick (movement)
    if (this.leftJoystick.active) {
      this.applyMovementInput();
    }

    // Apply right joystick (camera look)
    if (this.rightJoystick.active) {
      this.applyCameraInput(mode);
    }
  }

  /**
   * Apply movement input from left joystick
   */
  applyMovementInput() {
    if (!this.navigationController) return;

    const { deltaX, deltaY } = this.leftJoystick;

    const mode = this.navigationController.getMode();

    if (mode === 'ORBIT') {
      // In orbit mode, joystick pans/moves the camera target
      const controls = this.navigationController.controls;

      if (controls) {
        const panSpeed = 0.5 * this.config.moveSensitivity;

        // Pan in screen space
        controls.target.x -= deltaX * panSpeed;

        controls.target.y += deltaY * panSpeed;
      }
    } else {
      this.navigationController.moveState.forward = deltaY < -this.config.deadzone;

      this.navigationController.moveState.backward = deltaY > this.config.deadzone;

      this.navigationController.moveState.left = deltaX < -this.config.deadzone;

      this.navigationController.moveState.right = deltaX > this.config.deadzone;

      if (this.navigationController.triggerMovementUpdate) {
        this.navigationController.triggerMovementUpdate();
      }
    }
  }

  /**
   * Apply camera input from right joystick
   */
  applyCameraInput(mode) {
    if (!this.navigationController) return;

    const { deltaX, deltaY } = this.rightJoystick;

    const sensitivity = this.config.lookSensitivity;

    const clampFlyPitch = (pitch) => {
      if (typeof this.navigationController.clampFlyPitch === 'function') {
        return this.navigationController.clampFlyPitch(pitch);
      }

      return Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, pitch));
    };

    if (mode === 'ORBIT') {
      const controls = this.navigationController.controls;

      if (controls) {
        controls.rotateLeft(deltaX * sensitivity * 2);
        controls.rotateUp(deltaY * sensitivity * 2);
      }
    } else if (mode === 'FLY' || mode === 'FIRST_PERSON') {
      if (this.navigationController.targetFlyObject) {
        this.navigationController.flyLookYaw -= deltaX * sensitivity;

        this.navigationController.flyLookPitch = clampFlyPitch(
          this.navigationController.flyLookPitch - deltaY * sensitivity
        );
      } else {
        this.navigationController.yaw -= deltaX * sensitivity;

        this.navigationController.pitch = clampFlyPitch(
          this.navigationController.pitch - deltaY * sensitivity
        );
      }
    } else if (mode === 'DRIVE') {
      this.navigationController.driveLookYaw -= deltaX * sensitivity;

      this.navigationController.driveLookPitch -= deltaY * sensitivity;

      this.navigationController.driveLookPitch = Math.max(
        -Math.PI / 3,
        Math.min(Math.PI / 3, this.navigationController.driveLookPitch)
      );
    }
  }

  /**
   * Set navigation controller reference
   */
  setNavigationController(controller) {
    this.navigationController = controller;
  }

  /**
   * Configure joystick settings
   */
  configure(settings) {
    Object.assign(this.config, settings);
  }

  /**
   * Check if currently enabled
   */
  getIsEnabled() {
    return this.isEnabled;
  }

  /**
   * Force enable even on non-mobile (for testing)
   */
  forceEnable() {
    this.isMobile = true;

    return this.enable();
  }
}

export { MobileJoystick };
