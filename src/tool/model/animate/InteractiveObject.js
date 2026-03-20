import * as THREE from "three";

/**
 * InteractiveObject - A wrapper class that provides animation and interaction
 * controls for 3D objects like mobile cranes and tower cranes.
 *
 * Usage:
 *   const crane = WorldTool.createMobileCrane(options);
 *   const interactive = new InteractiveObject(crane);
 *   interactive.contractOutriggers(0.5); // speed 0-1
 */
class InteractiveObject {
  /**
   * @param {THREE.Object3D} object - The Three.js object to wrap
   * @param {Object} options - Configuration options
   * @param {string} [options.type] - Object type ('MobileCrane', 'TowerCrane', 'Truck', etc.)
   */
  constructor(object, options = {}) {
    this.isInteractiveObject = true;

    this.object = object;

    this.type = options.type || this._detectType(object);

    this.isInteractive = true;
    this.animations = new Map();

    this.animationMixer = null;

    this._animationId = null;

    this._lastTime = 0;
    this._components = {};

    this._cacheComponents();
    this._state = {
      outriggersExtended: true,
      outriggerPadsDeployed: true,
      boomAngle: 45,
      boomRotation: 0,
      trolleyPosition: 0.5,
      hookHeight: 15,
      
      jibAngle: 0,
      slewingAngle: 0,
      counterweightPosition: 0,
      jibLength: 1,
      operatingSpeed: 1,
      emergencyStop: false,
    };

    return this;
  }
  /**
   * Detect the type of object based on its name
   * @private
   */
  _detectType(object) {
    const name = object.name || "";

    if (name.includes("MobileCrane")) return "MobileCrane";

    if (name.includes("TowerCrane")) return "TowerCrane";

    if (name.includes("Truck")) return "Truck";

    if (name.includes("Forklift")) return "Forklift";

    if (name.includes("Digger")) return "Digger";

    if (name.includes("Robot")) return "Robot";

    return "Generic";
  }

  get isMobileCrane() {
    return this.type === "MobileCrane";
  }

  get isTowerCrane() {
    return this.type === "TowerCrane";
  }

  get isTruck() {
    return this.type === "Truck";
  }

  get isForklift() {
    return this.type === "Forklift";
  }

  get isDigger() {
    return this.type === "Digger";
  }

  get isRobot() {
    return this.type === "Robot";
  }
  /**
   * Cache references to important components for faster access
   * @private
   */
  _cacheComponents() {
    this._components = {
      outriggers: [],
      outriggerPads: [],
      outriggerJacks: [],
      wheels: [],
      boom: null,
      boomAssembly: null,
      superstructure: null,
      trolley: null,
      hookCable: null,
      hookBlock: null,
      hook: null,
      slewing: null,
      mast: null,
      forks: null,
      stick: null,
      bucket: null,
      legs: [],
      arms: [],
      head: null,
      
      counterweight: null,
      jibSections: [],
      mastSections: [],
      cabin: null,
    };

    this.object.traverse((child) => {
      const name = child.name || "";
      if (
        name.includes("Outrigger") &&
        !name.includes("Pad") &&
        !name.includes("Jack")
      ) {
        this._components.outriggers.push(child);
      }

      if (name.includes("OutriggerPad")) {
        this._components.outriggerPads.push(child);
      }

      if (name.includes("OutriggerJack")) {
        this._components.outriggerJacks.push(child);
      }
      if (name.includes("Wheel")) {
        this._components.wheels.push(child);
      }
      if (name === "MobileCrane_BoomAssembly" || name === "TowerCrane_Jib") {
        this._components.boomAssembly = child;
      }

      if (name.includes("_Boom") && !name.includes("Assembly")) {
        this._components.boom = child;
      }
      if (name === "MobileCrane_Superstructure" || name === "Digger_Body") {
        this._components.superstructure = child;
      }
      if (name === "TowerCrane_Slewing") {
        this._components.slewing = child;
      }
      if (name === "TowerCrane_Trolley") {
        this._components.trolley = child;
      }

      if (name === "TowerCrane_HookCable") {
        this._components.hookCable = child;
      }

      if (name === "TowerCrane_HookBlock") {
        this._components.hookBlock = child;
      }

      if (name === "TowerCrane_Hook") {
        this._components.hook = child;
      }
      if (name.includes("Forklift_Mast")) this._components.mast = child;

      if (name.includes("Forklift_Forks")) this._components.forks = child;
      if (name.includes("Digger_Stick")) this._components.stick = child;

      if (name.includes("Digger_Bucket")) this._components.bucket = child;
      if (name.includes("Robot_Leg")) this._components.legs.push(child);

      if (name.includes("Robot_Arm")) this._components.arms.push(child);

      if (name.includes("Robot_Head")) this._components.head = child;
      if (name === "TowerCrane_Counterweight") {
        this._components.counterweight = child;
      }

      if (name.includes("TowerCrane_JibSection")) {
        this._components.jibSections.push(child);
      }

      if (name.includes("TowerCrane_MastSection")) {
        this._components.mastSections.push(child);
      }

      if (name === "TowerCrane_Cabin") {
        this._components.cabin = child;
      }
    });
  }

  /**
   * Get a component by name pattern
   * @param {string} pattern - Name pattern to search for
   * @returns {THREE.Object3D|null}
   */
  getComponent(pattern) {
    let found = null;

    this.object.traverse((child) => {
      if (child.name && child.name.includes(pattern)) {
        found = child;
      }
    });

    return found;
  }

  /**
   * Get all components matching a name pattern
   * @param {string} pattern - Name pattern to search for
   * @returns {THREE.Object3D[]}
   */
  getComponents(pattern) {
    const found = [];

    this.object.traverse((child) => {
      if (child.name && child.name.includes(pattern)) {
        found.push(child);
      }
    });

    return found;
  }
  toggleWalking(enable = true, speed = 1) {
    if (!this.isRobot) return;

    if (!enable) {
      if (this.animations.has("walk")) {
        this.animations.get("walk").active = false;
      }

      return;
    }

    const walkAnim = {
      active: true,
      update: (deltaTime) => {
        const time = performance.now() * 0.005 * speed;

        if (this._components.legs.length >= 2) {
          this._components.legs[0].rotation.y = Math.sin(time) * 0.5;

          this._components.legs[1].rotation.y = Math.sin(time + Math.PI) * 0.5;
        }

        if (this._components.arms.length >= 2) {
          this._components.arms[0].rotation.y = Math.sin(time + Math.PI) * 0.5;

          this._components.arms[1].rotation.y = Math.sin(time) * 0.5;
        }
      },
      isComplete: () => false, 
    };

    this.animations.set("walk", walkAnim);

    this._startAnimationLoop();
  }
  setForkHeight(height, duration = 1) {
    if (!this.isForklift || !this._components.forks) return;

    const current = this._components.forks.position.y;

    const target = Math.max(-0.5, Math.min(2.5, height));

    this._createLerpAnimation("forkLift", {
      target: this._components.forks.position,
      property: "y",
      from: current,
      to: target,
      duration: duration,
    });
  }
  setBoomAngle(angle, duration = 1) {
    if (!this._components.boom) return;

    const current = this._components.boom.rotation.y;

    this._createLerpAnimation("boomAngle", {
      target: this._components.boom.rotation,
      property: "y",
      from: current,
      to: angle,
      duration: duration,
    });
  }

  setStickAngle(angle, duration = 1) {
    if (!this.isDigger || !this._components.stick) return;

    const current = this._components.stick.rotation.y;

    this._createLerpAnimation("stickAngle", {
      target: this._components.stick.rotation,
      property: "y",
      from: current,
      to: angle,
      duration: duration,
    });
  }
  /**
   * Contract all outriggers (retract beams and jacks)
   * @param {number} [speed=1] - Animation speed multiplier (0.1 to 2)
   * @param {Object} [options] - Additional options
   * @param {boolean} [options.removePads=true] - Whether to hide outrigger pads
   * @param {Function} [options.onComplete] - Callback when animation completes
   * @returns {Promise} Resolves when animation completes
   */
  contractOutriggers(speed = 1, options = {}) {
    if (!this.isMobileCrane) {
      console.warn(
        "contractOutriggers is only available for MobileCrane objects"
      );

      return Promise.resolve();
    }

    const { removePads = true, onComplete } = options;

    const duration = 2 / speed;

    return new Promise((resolve) => {
      let completedAnimations = 0;

      const totalAnimations =
        this._components.outriggerJacks.length +
        this._components.outriggers.length;

      const checkComplete = () => {
        completedAnimations++;

        if (completedAnimations >= totalAnimations) {
          this._state.outriggersExtended = false;

          if (onComplete) onComplete();

          resolve();
        }
      };
      if (removePads) {
        this._components.outriggerPads.forEach((pad) => {
          pad.visible = false;
        });

        this._state.outriggerPadsDeployed = false;
      }
      this._components.outriggerJacks.forEach((jack, index) => {
        const originalScaleY = jack.scale.y;

        this._createLerpAnimation(`jack_contract_${index}`, {
          target: jack.scale,
          property: "y",
          from: originalScaleY,
          to: 0.1,
          duration: duration * 0.6,
          onComplete: checkComplete,
        });
        const originalY = jack.position.y;

        this._createLerpAnimation(`jack_move_${index}`, {
          target: jack.position,
          property: "y",
          from: originalY,
          to: originalY + 0.5,
          duration: duration * 0.6,
        });
      });
      setTimeout(() => {
        this._components.outriggers.forEach((outrigger, index) => {
          const originalScaleY = outrigger.scale.y; 

          this._createLerpAnimation(`outrigger_contract_${index}`, {
            target: outrigger.scale,
            property: "y",
            from: originalScaleY,
            to: 0.3,
            duration: duration * 0.5,
            onComplete: checkComplete,
          });
        });
      }, duration * 400); 
    });
  }

  /**
   * Extend all outriggers (deploy beams and jacks)
   * @param {number} [speed=1] - Animation speed multiplier (0.1 to 2)
   * @param {Object} [options] - Additional options
   * @param {boolean} [options.deployPads=true] - Whether to show outrigger pads
   * @param {Function} [options.onComplete] - Callback when animation completes
   * @returns {Promise} Resolves when animation completes
   */
  extendOutriggers(speed = 1, options = {}) {
    if (!this.isMobileCrane) {
      console.warn(
        "extendOutriggers is only available for MobileCrane objects"
      );

      return Promise.resolve();
    }

    const { deployPads = true, onComplete } = options;

    const duration = 2 / speed;

    return new Promise((resolve) => {
      let completedAnimations = 0;

      const totalAnimations =
        this._components.outriggerJacks.length +
        this._components.outriggers.length;

      const checkComplete = () => {
        completedAnimations++;

        if (completedAnimations >= totalAnimations) {
          this._state.outriggersExtended = true;
          if (deployPads) {
            this._components.outriggerPads.forEach((pad) => {
              pad.visible = true;
            });

            this._state.outriggerPadsDeployed = true;
          }

          if (onComplete) onComplete();

          resolve();
        }
      };
      this._components.outriggers.forEach((outrigger, index) => {
        this._createLerpAnimation(`outrigger_extend_${index}`, {
          target: outrigger.scale,
          property: "y",
          from: outrigger.scale.y,
          to: 1,
          duration: duration * 0.5,
          onComplete: checkComplete,
        });
      });
      setTimeout(() => {
        this._components.outriggerJacks.forEach((jack, index) => {
          this._createLerpAnimation(`jack_extend_${index}`, {
            target: jack.scale,
            property: "y",
            from: jack.scale.y,
            to: 1,
            duration: duration * 0.6,
            onComplete: checkComplete,
          });
          this._createLerpAnimation(`jack_move_down_${index}`, {
            target: jack.position,
            property: "y",
            from: jack.position.y,
            to: jack.position.y - 0.5,
            duration: duration * 0.6,
          });
        });
      }, duration * 300);
    });
  }

  /**
   * Toggle outrigger pads visibility
   * @param {boolean} visible - Whether pads should be visible
   */
  setOutriggerPadsVisible(visible) {
    if (!this.isMobileCrane) return;

    this._components.outriggerPads.forEach((pad) => {
      pad.visible = visible;
    });

    this._state.outriggerPadsDeployed = visible;
  }

  /**
   * Set the boom/superstructure rotation (slewing)
   * @param {number} angle - Target angle in degrees
   * @param {number} [speed=1] - Animation speed multiplier
   * @param {Object} [options] - Additional options
   * @returns {Promise} Resolves when animation completes
   */
  setBoomRotation(angle, speed = 1, options = {}) {
    const { onComplete } = options;

    const duration = 4 / speed;

    const targetRadians = THREE.MathUtils.degToRad(angle);

    let rotatingPart = null;

    if (this.isMobileCrane) {
      rotatingPart = this._components.superstructure;
    } else if (this.isTowerCrane) {
      rotatingPart = this._components.slewing;
    }

    if (!rotatingPart) {
      console.warn("Rotating component not found");

      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this._createLerpAnimation("boom_rotation", {
        target: rotatingPart.rotation,
        property: "z",
        from: rotatingPart.rotation.z,
        to: targetRadians,
        duration: duration,
        onComplete: () => {
          this._state.boomRotation = angle;

          if (onComplete) onComplete();

          resolve();
        },
      });
    });
  }
  /**
   * Set the trolley position along the jib
   * @param {number} position - Target position (0-1, where 0 is near tower, 1 is at tip)
   * @param {number} [speed=1] - Animation speed multiplier
   * @param {Object} [options] - Additional options
   * @returns {Promise} Resolves when animation completes
   */
  setTrolleyPosition(position, speed = 1, options = {}) {
    if (!this.isTowerCrane) {
      console.warn(
        "setTrolleyPosition is only available for TowerCrane objects"
      );

      return Promise.resolve();
    }

    const { onComplete, boomLength = 50 } = options;

    const duration = 5 / speed;

    const trolley = this._components.trolley;

    const hookCable = this._components.hookCable;

    const hookBlock = this._components.hookBlock;

    const hook = this._components.hook;

    if (!trolley) {
      console.warn("Trolley not found");

      return Promise.resolve();
    }

    const targetX = position * boomLength;

    return new Promise((resolve) => {
      
      this._createLerpAnimation("trolley_position", {
        target: trolley.position,
        property: "x",
        from: trolley.position.x,
        to: targetX,
        duration: duration,
        onComplete: () => {
          this._state.trolleyPosition = position;

          if (onComplete) onComplete();

          resolve();
        },
      });
      if (hookCable) {
        this._createLerpAnimation("hook_cable_position", {
          target: hookCable.position,
          property: "x",
          from: hookCable.position.x,
          to: targetX,
          duration: duration,
        });
      }

      if (hookBlock) {
        this._createLerpAnimation("hook_block_position", {
          target: hookBlock.position,
          property: "x",
          from: hookBlock.position.x,
          to: targetX,
          duration: duration,
        });
      }

      if (hook) {
        this._createLerpAnimation("hook_position", {
          target: hook.position,
          property: "x",
          from: hook.position.x,
          to: targetX,
          duration: duration,
        });
      }
      this.getComponents("TrolleyWheel").forEach((wheel, index) => {
        this._createLerpAnimation(`trolley_wheel_${index}`, {
          target: wheel.position,
          property: "x",
          from: wheel.position.x,
          to: targetX + (index % 2 === 0 ? 0.4 : -0.4),
          duration: duration,
        });
      });
    });
  }

  /**
   * Set the hook height (lower/raise the hook)
   * @param {number} height - Target cable length in meters
   * @param {number} [speed=1] - Animation speed multiplier
   * @param {Object} [options] - Additional options
   * @returns {Promise} Resolves when animation completes
   */
  setHookHeight(height, speed = 1, options = {}) {
    if (!this.isTowerCrane) {
      console.warn("setHookHeight is only available for TowerCrane objects");

      return Promise.resolve();
    }

    const { onComplete, jibBaseHeight = 2 } = options;

    const duration = 3 / speed;

    const hookCable = this._components.hookCable;

    const hookBlock = this._components.hookBlock;

    const hook = this._components.hook;

    if (!hookCable) {
      console.warn("Hook cable not found");

      return Promise.resolve();
    }

    return new Promise((resolve) => {
      
      const currentLength = hookCable.geometry.parameters.height;

      this._createLerpAnimation("hook_cable_length", {
        target: hookCable.scale,
        property: "y",
        from: hookCable.scale.y,
        to: height / currentLength,
        duration: duration,
        onUpdate: (current) => {
          
          const newLength = currentLength * current;

          hookCable.position.y = jibBaseHeight - 0.4 - newLength / 2;
          if (hookBlock) {
            hookBlock.position.y = jibBaseHeight - 0.4 - newLength - 0.4;
          }

          if (hook) {
            hook.position.y = jibBaseHeight - 0.4 - newLength - 1;
          }
        },
        onComplete: () => {
          this._state.hookHeight = height;

          if (onComplete) onComplete();

          resolve();
        },
      });
    });
  }

  /**
   * Set the jib angle (luffing) for tower crane
   * @param {number} angle - Target angle in degrees (typically -5 to 85)
   * @param {number} [speed=1] - Animation speed multiplier
   * @param {Object} [options] - Additional options
   * @returns {Promise} Resolves when animation completes
   */
  setJibAngle(angle, speed = 1, options = {}) {
    if (!this.isTowerCrane) {
      console.warn("setJibAngle is only available for TowerCrane objects");

      return Promise.resolve();
    }

    const { onComplete, minAngle = -5, maxAngle = 85 } = options;
    const clampedAngle = Math.max(minAngle, Math.min(maxAngle, angle));

    const targetRadians = THREE.MathUtils.degToRad(clampedAngle);

    const duration = 4 / speed;

    const jib = this._components.boomAssembly || this._components.boom;

    if (!jib) {
      console.warn("Jib not found");

      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this._createLerpAnimation("jib_angle", {
        target: jib.rotation,
        property: "x", 
        from: jib.rotation.x,
        to: targetRadians,
        duration: duration,
        onComplete: () => {
          this._state.jibAngle = clampedAngle;

          if (onComplete) onComplete();

          resolve();
        },
      });
    });
  }

  /**
   * Set the slewing angle (rotation around mast) for tower crane
   * @param {number} angle - Target angle in degrees
   * @param {number} [speed=1] - Animation speed multiplier
   * @param {Object} [options] - Additional options
   * @returns {Promise} Resolves when animation completes
   */
  setSlewingAngle(angle, speed = 1, options = {}) {
    if (!this.isTowerCrane) {
      console.warn("setSlewingAngle is only available for TowerCrane objects");

      return Promise.resolve();
    }

    const { onComplete } = options;

    const targetRadians = THREE.MathUtils.degToRad(angle);

    const duration = 6 / speed; 

    const slewing = this._components.slewing;

    if (!slewing) {
      console.warn("Slewing unit not found");

      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this._createLerpAnimation("slewing_angle", {
        target: slewing.rotation,
        property: "y", 
        from: slewing.rotation.y,
        to: targetRadians,
        duration: duration,
        onComplete: () => {
          this._state.slewingAngle = angle;

          if (onComplete) onComplete();

          resolve();
        },
      });
    });
  }

  /**
   * Set the counterweight position for tower crane
   * @param {number} position - Target position (0-1, where 0 is retracted, 1 is extended)
   * @param {number} [speed=1] - Animation speed multiplier
   * @param {Object} [options] - Additional options
   * @returns {Promise} Resolves when animation completes
   */
  setCounterweightPosition(position, speed = 1, options = {}) {
    if (!this.isTowerCrane) {
      console.warn("setCounterweightPosition is only available for TowerCrane objects");

      return Promise.resolve();
    }

    const { onComplete, maxExtension = 10 } = options;

    const clampedPosition = Math.max(0, Math.min(1, position));

    const targetX = clampedPosition * maxExtension;

    const duration = 3 / speed;

    const counterweight = this._components.counterweight;

    if (!counterweight) {
      console.warn("Counterweight not found");

      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this._createLerpAnimation("counterweight_position", {
        target: counterweight.position,
        property: "x",
        from: counterweight.position.x,
        to: targetX,
        duration: duration,
        onComplete: () => {
          this._state.counterweightPosition = clampedPosition;

          if (onComplete) onComplete();

          resolve();
        },
      });
    });
  }

  /**
   * Set the jib length (telescoping) for tower crane
   * @param {number} length - Target length scale (0.5-1.5, where 1 is normal length)
   * @param {number} [speed=1] - Animation speed multiplier
   * @param {Object} [options] - Additional options
   * @returns {Promise} Resolves when animation completes
   */
  setJibLength(length, speed = 1, options = {}) {
    if (!this.isTowerCrane) {
      console.warn("setJibLength is only available for TowerCrane objects");

      return Promise.resolve();
    }

    const { onComplete, minLength = 0.5, maxLength = 1.5 } = options;

    const clampedLength = Math.max(minLength, Math.min(maxLength, length));

    const duration = 5 / speed;

    return new Promise((resolve) => {
      let completedSections = 0;

      const totalSections = this._components.jibSections.length;

      if (totalSections === 0) {
        console.warn("No jib sections found for telescoping");

        resolve();

        return;
      }

      const checkComplete = () => {
        completedSections++;

        if (completedSections >= totalSections) {
          this._state.jibLength = clampedLength;

          if (onComplete) onComplete();

          resolve();
        }
      };
      this._components.jibSections.forEach((section, index) => {
        this._createLerpAnimation(`jib_section_${index}`, {
          target: section.scale,
          property: "x", 
          from: section.scale.x,
          to: clampedLength,
          duration: duration + (index * 0.5), 
          onComplete: checkComplete,
        });
      });
    });
  }

  /**
   * Set the operating speed for all crane operations
   * @param {number} speed - Speed multiplier (0.1-2.0)
   */
  setOperatingSpeed(speed) {
    if (!this.isTowerCrane) {
      console.warn("setOperatingSpeed is only available for TowerCrane objects");

      return;
    }

    this._state.operatingSpeed = Math.max(0.1, Math.min(2.0, speed));
  }

  /**
   * Emergency stop - immediately halt all animations
   */
  emergencyStop() {
    this.stopAllAnimations();

    this._state.emergencyStop = true;
    setTimeout(() => {
      this._state.emergencyStop = false;
    }, 1000);
  }

  /**
   * Get load moment indicator (simulated)
   * @returns {Object} Load moment data
   */
  getLoadMomentIndicator() {
    if (!this.isTowerCrane) {
      console.warn("getLoadMomentIndicator is only available for TowerCrane objects");

      return null;
    }

    const radius = this._state.trolleyPosition * 50; 

    const load = 1000; 

    const moment = load * radius * 9.81 / 1000; 

    return {
      load: load,
      radius: radius,
      moment: moment,
      maxMoment: 500, 
      isOverload: moment > 500,
      percentage: (moment / 500) * 100
    };
  }

  /**
   * Simulate wind speed monitoring
   * @returns {Object} Wind data
   */
  getWindConditions() {
    if (!this.isTowerCrane) {
      console.warn("getWindConditions is only available for TowerCrane objects");

      return null;
    }
    const windSpeed = Math.random() * 20 + 5; 

    return {
      speed: windSpeed,
      direction: Math.random() * 360,
      isSafe: windSpeed < 15, 
      canOperate: windSpeed < 10
    };
  }
  /**
   * Rotate wheels (for driving animation)
   * @param {number} rotations - Number of full rotations
   * @param {number} [duration=2] - Duration in seconds
   * @returns {Promise} Resolves when animation completes
   */
  rotateWheels(rotations, duration = 2) {
    if (!this.isMobileCrane && !this.isTruck) {
      console.warn(
        "rotateWheels is only available for MobileCrane and Truck objects"
      );

      return Promise.resolve();
    }

    return new Promise((resolve) => {
      let completed = 0;

      const totalWheels = this._components.wheels.length;

      if (totalWheels === 0) {
        resolve();

        return;
      }

      this._components.wheels.forEach((wheel, index) => {
        const targetRotation = wheel.rotation.y + Math.PI * 2 * rotations;

        this._createLerpAnimation(`wheel_rotate_${index}`, {
          target: wheel.rotation,
          property: "y",
          from: wheel.rotation.y,
          to: targetRotation,
          duration: duration,
          easing: "linear",
          onComplete: () => {
            completed++;

            if (completed >= totalWheels) {
              resolve();
            }
          },
        });
      });
    });
  }

  /**
   * Helper to ensure all materials on the object are transparent and ready for opacity animation
   * @private
   */
  _setMaterialsTransparent() {
    this.object.traverse((child) => {
      if (child.isMesh && child.material) {
        
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];

        materials.forEach((mat) => {
          if (!mat.transparent) {
            
            child.material = mat.clone();

            child.material.transparent = true;
          }
        });
      }
    });
  }

  /**
   * Make the object disappear with a fade-out effect
   * @param {number} [duration=2] - Duration of the fade in seconds
   * @param {Object} [options] - Additional options
   * @param {Function} [options.onComplete] - Callback when animation completes
   * @returns {Promise} Resolves when animation completes
   */
  makeDisappear(duration = 2, options = {}) {
    const { onComplete } = options;
    this._setMaterialsTransparent();

    return new Promise((resolve) => {
      
      const materialAnimations = [];

      this.object.traverse((child) => {
        if (child.isMesh && child.material) {
          const materials = Array.isArray(child.material)
            ? child.material
            : [child.material];

          materials.forEach((mat, index) => {
            if (mat.transparent) {
              materialAnimations.push({
                target: mat,
                property: "opacity",
                from: mat.opacity,
                to: 0,
                duration: duration,
              });
            }
          });
        }
      });
      let completedCount = 0;

      const totalAnimations = materialAnimations.length;

      if (totalAnimations === 0) {
        
        this.object.visible = false;

        if (onComplete) onComplete();

        resolve();

        return;
      }

      materialAnimations.forEach((anim, index) => {
        this._createLerpAnimation(`fade_out_mat_${index}`, {
          ...anim,
          onComplete: () => {
            completedCount++;

            if (completedCount >= totalAnimations) {
              console.log('[Drone Visibility]', 'makeDisappear:complete', {
                name: this.object?.name,
                uuid: this.object?.uuid,
                visibleBeforeHide: this.object?.visible,
                position: this.object?.position ? {
                  x: this.object.position.x,
                  y: this.object.position.y,
                  z: this.object.position.z,
                } : null,
              });
              
              this.object.visible = false;

              console.log('[Drone Visibility]', 'makeDisappear:hidden', {
                name: this.object?.name,
                uuid: this.object?.uuid,
                visible: this.object?.visible,
              });

              if (onComplete) onComplete();

              resolve();
            }
          },
        });
      });
    });
  }

  /**
   * Make the object appear with a fade-in effect
   * @param {number} [duration=2] - Duration of the fade in seconds
   * @param {Object} [options] - Additional options
   * @param {Function} [options.onComplete] - Callback when animation completes
   * @returns {Promise} Resolves when animation completes
   */
  makeAppear(duration = 2, options = {}) {
    const { onComplete } = options;
    this._setMaterialsTransparent();
    this.object.traverse((child) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];

        materials.forEach((mat) => {
          if (mat.transparent) {
            mat.opacity = 0;
          }
        });
      }

      console.log('[Drone Visibility]', 'makeAppear:start', {
        name: this.object?.name,
        uuid: this.object?.uuid,
        visibleBeforeShow: this.object?.visible,
        position: this.object?.position ? {
          x: this.object.position.x,
          y: this.object.position.y,
          z: this.object.position.z,
        } : null,
      });

    });

      console.log('[Drone Visibility]', 'makeAppear:visible', {
        name: this.object?.name,
        uuid: this.object?.uuid,
        visible: this.object?.visible,
      });
    this.object.visible = true;

    return new Promise((resolve) => {
      
      const materialAnimations = [];

      this.object.traverse((child) => {
        if (child.isMesh && child.material) {
          const materials = Array.isArray(child.material)
            ? child.material
            : [child.material];

          materials.forEach((mat, index) => {
            if (mat.transparent) {
              materialAnimations.push({
                target: mat,
                property: "opacity",
                from: 0,
                to: 1,
                duration: duration,
              });
            }
          });
        }
      });
      let completedCount = 0;

      const totalAnimations = materialAnimations.length;

      if (totalAnimations === 0) {
        
        if (onComplete) onComplete();

        resolve();

        return;
      }

      materialAnimations.forEach((anim, index) => {
        this._createLerpAnimation(`fade_in_mat_${index}`, {
          ...anim,
          onComplete: () => {
            completedCount++;

            if (completedCount >= totalAnimations) {
              console.log('[Drone Visibility]', 'makeAppear:complete', {
                name: this.object?.name,
                uuid: this.object?.uuid,
                visible: this.object?.visible,
                position: this.object?.position ? {
                  x: this.object.position.x,
                  y: this.object.position.y,
                  z: this.object.position.z,
                } : null,
              });

              if (onComplete) onComplete();

              resolve();
            }
          },
        });
      });
    });
  }

  teleTransportation(toPosition) {
    console.log('[Drone Visibility]', 'teleTransportation:start', {
      name: this.object?.name,
      uuid: this.object?.uuid,
      visible: this.object?.visible,
      position: this.object?.position ? {
        x: this.object.position.x,
        y: this.object.position.y,
        z: this.object.position.z,
      } : null,
      toPosition,
    });

    return this.makeDisappear(0.5)
      .then(() => this.moveTo(toPosition, 10))
      .then(() => this.makeAppear(0.5))
      .then((result) => {
        console.log('[Drone Visibility]', 'teleTransportation:end', {
          name: this.object?.name,
          uuid: this.object?.uuid,
          visible: this.object?.visible,
          position: this.object?.position ? {
            x: this.object.position.x,
            y: this.object.position.y,
            z: this.object.position.z,
          } : null,
        });

        return result;
      });
  }

  /**
   * Move the object to a new position
   * @param {Object} position - Target position {x, y, z}
   * @param {number} [speed=1] - Animation speed multiplier
   * @param {Object} [options] - Additional options
   * @returns {Promise} Resolves when animation completes
   */
  moveTo(position, speed = 1, options = {}) {
    const { onComplete, animateWheels = true } = options;

    const from = this.object.position.clone();

    const to = new THREE.Vector3(position.x, position.y, position.z);

    const distance = from.distanceTo(to);

    const duration = distance / 5 / speed; 

    return new Promise((resolve) => {
      
      if (animateWheels && (this.isMobileCrane || this.isTruck)) {
        const wheelRotations = distance / (Math.PI * 2 * 0.5); 

        this.rotateWheels(wheelRotations, duration);
      }

      this._createVector3Animation("move_to", {
        target: this.object,
        property: "position",
        from: from,
        to: to,
        duration: duration,
        onComplete: () => {
          if (onComplete) onComplete();

          resolve();
        },
      });
    });
  }

  /**
   * Rotate the entire object around Y axis
   * @param {number} angle - Target angle in degrees
   * @param {number} [speed=1] - Animation speed multiplier
   * @returns {Promise} Resolves when animation completes
   */
  rotateTo(angle, speed = 1, options = {}) {
    const { onComplete } = options;

    const duration = 2 / speed;

    const targetRadians = THREE.MathUtils.degToRad(angle);

    return new Promise((resolve) => {
      this._createLerpAnimation("rotate_to", {
        target: this.object.rotation,
        property: "y",
        from: this.object.rotation.y,
        to: targetRadians,
        duration: duration,
        onComplete: () => {
          if (onComplete) onComplete();

          resolve();
        },
      });
    });
  }

  /**
   * Get current state of the interactive object
   * @returns {Object} Current state
   */
  getState() {
    return { ...this._state };
  }

  /**
   * Dispose of the interactive object and clean up
   */
  dispose() {
    this.stopAllAnimations();

    this._components = {};

    this.object = null;
  }
  /**
   * Start the animation loop
   * @private
   */
  _startAnimationLoop() {
    if (this._animationId !== null) return;

    this._lastTime = performance.now();

    const animate = () => {
      const currentTime = performance.now();

      const deltaTime = (currentTime - this._lastTime) / 1000; 

      this._lastTime = currentTime;
      let hasActiveAnimations = false;

      this.animations.forEach((animation, key) => {
        if (animation.active) {
          hasActiveAnimations = true;

          animation.update(deltaTime);
          if (animation.isComplete()) {
            animation.active = false;

            if (animation.onComplete) {
              animation.onComplete();
            }
          }
        }
      });
      if (hasActiveAnimations) {
        this._animationId = requestAnimationFrame(animate);
      } else {
        this._animationId = null;
      }
    };

    this._animationId = requestAnimationFrame(animate);
  }

  /**
   * Stop all animations
   */
  stopAllAnimations() {
    if (this._animationId !== null) {
      cancelAnimationFrame(this._animationId);

      this._animationId = null;
    }

    this.animations.clear();
  }

  /**
   * Create a lerp animation
   * @private
   */
  _createLerpAnimation(key, options) {
    const {
      target,
      property,
      from,
      to,
      duration,
      onUpdate,
      onComplete,
      easing = "easeInOut",
    } = options;

    const animation = {
      active: true,
      progress: 0,
      duration: duration,
      from: from,
      to: to,
      target: target,
      property: property,
      onUpdate: onUpdate,
      onComplete: onComplete,

      update(deltaTime) {
        this.progress += deltaTime / this.duration;

        this.progress = Math.min(this.progress, 1);
        let t = this.progress;

        if (easing === "easeInOut") {
          t = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        } else if (easing === "easeIn") {
          t = t * t;
        } else if (easing === "easeOut") {
          t = 1 - (1 - t) * (1 - t);
        }
        const current = this.from + (this.to - this.from) * t;
        if (this.target && this.property) {
          if (this.property.includes(".")) {
            const parts = this.property.split(".");

            let obj = this.target;

            for (let i = 0; i < parts.length - 1; i++) {
              obj = obj[parts[i]];
            }

            obj[parts[parts.length - 1]] = current;
          } else {
            this.target[this.property] = current;
          }
        }

        if (this.onUpdate) {
          this.onUpdate(current, t);
        }
      },

      isComplete() {
        return this.progress >= 1;
      },
    };

    this.animations.set(key, animation);

    this._startAnimationLoop();

    return animation;
  }

  /**
   * Create a Vector3 lerp animation
   * @private
   */
  _createVector3Animation(key, options) {
    const {
      target,
      property,
      from,
      to,
      duration,
      onUpdate,
      onComplete,
      easing = "easeInOut",
    } = options;

    const fromVec =
      from instanceof THREE.Vector3
        ? from
        : new THREE.Vector3(from.x, from.y, from.z);

    const toVec =
      to instanceof THREE.Vector3 ? to : new THREE.Vector3(to.x, to.y, to.z);

    const animation = {
      active: true,
      progress: 0,
      duration: duration,
      from: fromVec,
      to: toVec,
      target: target,
      property: property,
      onUpdate: onUpdate,
      onComplete: onComplete,

      update(deltaTime) {
        this.progress += deltaTime / this.duration;

        this.progress = Math.min(this.progress, 1);
        let t = this.progress;

        if (easing === "easeInOut") {
          t = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        } else if (easing === "easeIn") {
          t = t * t;
        } else if (easing === "easeOut") {
          t = 1 - (1 - t) * (1 - t);
        }
        const current = new THREE.Vector3().lerpVectors(this.from, this.to, t);
        if (this.target && this.property) {
          this.target[this.property].copy(current);
        }

        if (this.onUpdate) {
          this.onUpdate(current, t);
        }
      },

      isComplete() {
        return this.progress >= 1;
      },
    };

    this.animations.set(key, animation);

    this._startAnimationLoop();

    return animation;
  }
}

/**
 * Factory function to make any crane object interactive
 * @param {THREE.Object3D} object - The Three.js object to wrap
 * @param {Object} options - Configuration options
 * @returns {InteractiveObject} The interactive wrapper
 */
export function makeInteractive(object, options = {}) {
  return new InteractiveObject(object, options);
}

export default InteractiveObject;
