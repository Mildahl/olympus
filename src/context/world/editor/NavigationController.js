import * as THREE from "three";

import FocusManager from '../../../utils/FocusManager.js';

class NavigationController extends THREE.EventDispatcher {
  constructor(editor, config) {
    super();
    
    this.editor = editor;
    
    this.keyMappings = {
      fly: {
        keys: {
          forward: 'KeyW',
          backward: 'KeyS',
          left: 'KeyA',
          right: 'KeyD',
          up: 'KeyE',
          down: 'KeyQ',
          sprint: 'ShiftLeft',
        }
      },
      drive: {
        keys: {
          accelerate: 'KeyW',
          brake: 'KeyS',
          left: 'KeyA',
          right: 'KeyD',
          boost: 'ShiftLeft',
        }
      }
    };

    this.mode = 'ORBIT';

    this.previousMode = null;

    this.moveState = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: false,
      sprint: false,
    };

    this.flySettings = {
      moveSpeed: config?.fly?.movementSpeed ?? 10,
      sprintMultiplier: 2.5,
      lookSensitivity: config?.fly?.lookSpeed ?? 0.002,
      verticalSpeed: 8,
      verticalMin: config?.fly?.verticalMin ?? -100,
      verticalMax: config?.fly?.verticalMax ?? 100,
      cameraDistance: 6,
      cameraHeight: 2,
      smoothing: 0.15,
      turnSpeed: 2.0,
    };

    this.driveSettings = {
      moveSpeed: config?.drive?.movementSpeed ?? 5,
      turnSpeed: 2.0,
      cameraDistance: 8,
      cameraHeight: 3,
      cameraLookAhead: 2,
      smoothing: 0.1,
      verticalMin: config?.drive?.verticalMin ?? -10,
      verticalMax: config?.drive?.verticalMax ?? 10,
    };

    this.yaw = 0;

    this.pitch = 0;

    this.velocity = new THREE.Vector3();

    this.direction = new THREE.Vector3();

    this.targetVehicle = null;

    this.vehicleRotation = 0;

    this.vehicleVelocity = new THREE.Vector3();

    this.driveGrounds = [];

    this.driveExtents = null;

    this.resetPosition = null;

    this.driveLookYaw = 0;

    this.driveLookPitch = 0;

    this.targetFlyObject = null;

    this.flyObjectRotation = 0;

    this.flyLookYaw = 0;

    this.flyLookPitch = 0;

    this.cameraViewMode = 'THIRD_PERSON';

    this.driverPOV = null;

    this.targetBoundingBox = null;

    this.crosshair = null;
    this.crosshairResizeObserver = null;

    this.clock = new THREE.Clock();

    this.lastTime = 0;

    this.isLocked = false;

    this._animationFrameId = null;

    this.isAnimating = false;

    this._attachedObjectData = null;

    this.onKeyDown = this.onKeyDown.bind(this);

    this.onKeyUp = this.onKeyUp.bind(this);

    this.onMouseMove = this.onMouseMove.bind(this);

    this.onPointerLockChange = this.onPointerLockChange.bind(this);

    this.onPointerLockError = this.onPointerLockError.bind(this);

    this.onClick = this.onClick.bind(this);

    this.onViewportLeave = this.onViewportLeave.bind(this);

    this._updateLoop = this._updateLoop.bind(this);

    this._onVisibilityChange = this._onVisibilityChange.bind(this);

    this._onWindowBlur = this._onWindowBlur.bind(this);
    this.updateCrosshairPosition = this.updateCrosshairPosition.bind(this);

    this.setupEventListeners();
  }

  get camera() {
    return this.editor.camera;
  }

  get renderer() {
    return this.editor.renderer;
  }

  get controls() {
    return this.editor.controls;
  }

  isFlyMode(mode = this.mode) {
    return mode === 'FLY' || mode === 'FIRST_PERSON';
  }

  isFirstPersonMode(mode = this.mode) {
    return mode === 'FIRST_PERSON';
  }

  setCursorVisibility(isVisible) {
    const cursor = isVisible ? 'auto' : 'none';

    if (document.body) {
      document.body.style.cursor = cursor;
    }

    if (this.renderer?.domElement) {
      this.renderer.domElement.style.cursor = cursor;
    }
  }

  normalizeControlledTarget(target) {
    if (target?.isObject3D) {
      return target;
    }

    if (target?.object?.isObject3D) {
      return target.object;
    }

    return target || null;
  }

  isPointerLockedToViewport() {
    return document.pointerLockElement === this.renderer?.domElement;
  }

  syncPointerLockState({ resetMovement = false, dispatchChange = false } = {}) {
    const isLocked = this.isPointerLockedToViewport();

    this.isLocked = isLocked;

    if (isLocked) {
      document.addEventListener('mousemove', this.onMouseMove);
    } else {
      document.removeEventListener('mousemove', this.onMouseMove);

      if (resetMovement) {
        this._resetMoveState();
      }
    }

    if (this.isFirstPersonMode()) {
      this.setCursorVisibility(!isLocked);
    }

    if (dispatchChange && resetMovement) {
      this._dispatchChange();
    }

    return isLocked;
  }

  requestViewportPointerLock() {
    const domElement = this.renderer?.domElement;

    if (!domElement) {
      return false;
    }

    if (this.syncPointerLockState()) {
      return true;
    }

    const pointerLockRequest = domElement.requestPointerLock?.();

    if (pointerLockRequest?.catch) {
      pointerLockRequest.catch(() => {
        this.syncPointerLockState();
      });
    }

    return false;
  }

  getFlyPitchLimits() {
    const min = THREE.MathUtils.degToRad(this.flySettings.verticalMin);

    const max = THREE.MathUtils.degToRad(this.flySettings.verticalMax);

    return {
      min: Math.max(-Math.PI / 2 + 0.01, min),
      max: Math.min(Math.PI / 2 - 0.01, max),
    };
  }

  clampFlyPitch(pitch) {
    const { min, max } = this.getFlyPitchLimits();

    return Math.max(min, Math.min(max, pitch));
  }

  findDriverPOV(target) {
    if (!target) return null;

    return target.getObjectByName('DriverPOV') || null;
  }

  getTargetBoundingBox(target) {
    if (!target) return null;

    const box = new THREE.Box3().setFromObject(target);

    this.targetBoundingBox = box;

    return box;
  }

  getSmartCameraSettings(target) {
    const box = this.getTargetBoundingBox(target);

    if (!box) return null;

    const size = new THREE.Vector3();

    box.getSize(size);

    const horizontalSize = Math.sqrt(size.x * size.x + size.z * size.z);

    const cameraDistance = Math.max(horizontalSize * 1.2, 4);

    const cameraHeight = Math.max(size.y * 0.6, 2);

    return { cameraDistance, cameraHeight };
  }

  toggleCameraViewMode() {
    if (this.isFirstPersonMode()) return;

    if (this.cameraViewMode === 'THIRD_PERSON') {
      const target = this.targetFlyObject || this.targetVehicle;

      const pov = this.findDriverPOV(target);

      if (pov) {
        this.cameraViewMode = 'DRIVER_POV';

        this.driverPOV = pov;
      }
    } else {
      this.cameraViewMode = 'THIRD_PERSON';

      this.driverPOV = null;
    }

    if (this.isFlyMode()) {
      this.updateFlyCamera(1.0);
    } else if (this.mode === 'DRIVE') {
      this.updateDriveCamera(1.0);
    }

    this._dispatchChange();
  }

  getCameraViewMode() {
    return this.cameraViewMode;
  }

  getYawFromQuaternion(quaternion) {
    const dir = new THREE.Vector3(1, 0, 0);

    dir.applyQuaternion(quaternion);

    return Math.atan2(-dir.z, dir.x);
  }

  getForwardDirection(yaw) {
    return new THREE.Vector3(-Math.cos(yaw), 0, Math.sin(yaw));
  }

  getLookDirection(yaw, pitch) {
    const cosPitch = Math.cos(pitch);

    return new THREE.Vector3(
      -Math.cos(yaw) * cosPitch,
      Math.sin(pitch),
      Math.sin(yaw) * cosPitch
    ).normalize();
  }

  setCameraPose(position, lookAt) {
    this.camera.position.copy(position);

    if (this.controls?.center) {
      this.controls.center.copy(lookAt);
    }

    this.camera.up.set(0, 1, 0);

    this.camera.lookAt(this.controls?.center ?? lookAt);
  }

  getCameraOffset(yaw, distance, height, pitch = 0) {
    const hDist = distance * Math.cos(pitch);

    const vDist = distance * Math.sin(pitch);

    return new THREE.Vector3(
      Math.cos(yaw) * hDist,
      height + vDist,
      -Math.sin(yaw) * hDist
    );
  }

  updateFollowCamera(target, yaw, pitch, settings, smoothFactor, lookAtHeightOffset = 0.5) {
    if (!target) return;

    if (this.isFirstPersonMode()) {
      this.updateFirstPersonCamera(smoothFactor);

      return;
    }

    const targetPos = target.position;

    if (this.cameraViewMode === 'DRIVER_POV' && this.driverPOV) {
      const povWorldPos = new THREE.Vector3();

      this.driverPOV.getWorldPosition(povWorldPos);

      let lookDir = this.driverPOV.userData.lookDirection;

      if (!lookDir) {
        lookDir = new THREE.Vector3(-1, 0, 0);
      }

      const worldLookDir = lookDir.clone();

      const parentQuat = new THREE.Quaternion();

      this.driverPOV.parent?.getWorldQuaternion(parentQuat);

      worldLookDir.applyQuaternion(parentQuat);

      const lookAtPoint = povWorldPos.clone().addScaledVector(worldLookDir, 100);

      this.setCameraPose(povWorldPos, lookAtPoint);

      return;
    }

    const camOffset = this.getCameraOffset(yaw, settings.cameraDistance, settings.cameraHeight, pitch);

    const targetCamPos = targetPos.clone().add(camOffset);

    const targetLookAt = new THREE.Vector3(targetPos.x, targetPos.y + lookAtHeightOffset, targetPos.z);

    this.setCameraPose(targetCamPos, targetLookAt);
  }

  getFirstPersonCameraPosition(target, yaw, pitch) {
    const box = this.getTargetBoundingBox(target);

    if (!box) {
      const fallbackPosition = target.getWorldPosition(new THREE.Vector3());

      fallbackPosition.add(this.getCameraOffset(yaw, Math.max(this.flySettings.cameraDistance * 0.55, 2.5), Math.max(this.flySettings.cameraHeight * 0.65, 1.2), pitch * 0.2));

      return fallbackPosition;
    }

    const size = new THREE.Vector3();

    const targetPosition = target.getWorldPosition(new THREE.Vector3());

    box.getSize(size);

    const horizontalSize = Math.max(Math.sqrt(size.x * size.x + size.z * size.z), 1);

    const distance = Math.max(horizontalSize * 0.7, this.flySettings.cameraDistance * 0.55, 2.5);

    const height = Math.max(size.y * 0.45, this.flySettings.cameraHeight * 0.65, 1.2);

    const cameraPos = targetPosition.clone().add(this.getCameraOffset(yaw, distance, height, pitch * 0.2));

    return cameraPos;
  }

  updateFirstPersonCamera(smoothFactor = 0.1) {
    if (this.targetFlyObject) {
      const totalYaw = this.flyObjectRotation + this.flyLookYaw;

      const pitch = this.flyLookPitch;

      const cameraPos = this.getFirstPersonCameraPosition(this.targetFlyObject, totalYaw, pitch);

      const lookDirection = this.getLookDirection(totalYaw, pitch);

      const lookAtPoint = cameraPos.clone().addScaledVector(lookDirection, 100);

      this.setCameraPose(cameraPos, lookAtPoint);

      return;
    }

    this._updateFreeFlyCamera();
  }

  applyObjectMovement(target, yaw, delta, settings, allowVertical = true) {
    const speed = this.moveState.sprint 
      ? settings.moveSpeed * (settings.sprintMultiplier || 2) 
      : settings.moveSpeed;

    const prevRotation = yaw;

    if (this.moveState.left) yaw += settings.turnSpeed * delta;

    if (this.moveState.right) yaw -= settings.turnSpeed * delta;

    const rotationDelta = yaw - prevRotation;

    if (rotationDelta !== 0) {
      const worldUp = new THREE.Vector3(0, 1, 0);

      target.rotateOnWorldAxis(worldUp, rotationDelta);
    }

    const forwardDir = this.getForwardDirection(yaw);

    if (this.moveState.forward) target.position.addScaledVector(forwardDir, speed * delta);

    if (this.moveState.backward) target.position.addScaledVector(forwardDir, -speed * delta * 0.5);

    if (allowVertical) {
      const verticalSpeed = settings.verticalSpeed || settings.moveSpeed;

      if (this.moveState.up) target.position.y += verticalSpeed * delta;

      if (this.moveState.down) target.position.y -= verticalSpeed * delta;
    }

    return yaw;
  }

  _dispatchChange() {
    this.editor.signals.cameraChanged.dispatch(this.camera);

    if (this._hasActiveMovement() && this.editor.signals.navigationMovement) {
      this.editor.signals.navigationMovement.dispatch({
        mode: this.mode,
        object: this.getControlledObject(),
        moveState: { ...this.moveState }
      });
    }
  }

  _dispatchModeChange(mode, options = {}) {
    if (this.editor.signals.navigationModeChanged) {
      this.editor.signals.navigationModeChanged.dispatch({
        mode,
        previousMode: this.previousMode,
        options,
        controlledObject: this.getControlledObject(),
        showInstructions: options.showInstructions ?? false
      });
    }
  }

  _hasActiveMovement() {
    return this.moveState.forward || this.moveState.backward || 
           this.moveState.left || this.moveState.right || 
           this.moveState.up || this.moveState.down;
  }

  _requiresContinuousUpdate() {
    return this.isControllingObject();
  }

  _startUpdateLoop() {
    if (this._animationFrameId !== null) return;

    this._lastFrameTime = performance.now();

    this._animationFrameId = requestAnimationFrame(this._updateLoop);
  }

  _stopUpdateLoop() {
    if (this._animationFrameId !== null) {
      cancelAnimationFrame(this._animationFrameId);

      this._animationFrameId = null;
    }
  }

  _updateLoop() {
    if (this.mode === 'ORBIT') {
      this._animationFrameId = null;

      return;
    }

    const now = performance.now();

    const delta = Math.min((now - this._lastFrameTime) / 1000, 0.1);

    this._lastFrameTime = now;

    if (this.isAnimating) {
      this._animationFrameId = requestAnimationFrame(this._updateLoop);

      return;
    }

    const hasActiveMovement = this._hasActiveMovement();

    if (!hasActiveMovement && !this._requiresContinuousUpdate()) {
      this._animationFrameId = null;

      return;
    }
    
    if (this.isFlyMode()) {
      this.updateFlyMode(delta);
    } else if (this.mode === 'DRIVE') {
      this.updateDriveMode(delta);
    }

    this._dispatchChange();

    this._animationFrameId = requestAnimationFrame(this._updateLoop);
  }

  setupEventListeners() {
    document.addEventListener('keydown', this.onKeyDown);

    document.addEventListener('keyup', this.onKeyUp);

    document.addEventListener('pointerlockchange', this.onPointerLockChange);

    document.addEventListener('pointerlockerror', this.onPointerLockError);

    document.addEventListener('visibilitychange', this._onVisibilityChange);

    window.addEventListener('blur', this._onWindowBlur);

    this.renderer?.domElement?.addEventListener('click', this.onClick);

    this.renderer?.domElement?.addEventListener('mouseleave', this.onViewportLeave);
  }

  _onVisibilityChange() {
    if (document.hidden) {
      this._resetMoveState();

      this._dispatchChange();
    }
  }

  _onWindowBlur() {
    this._resetMoveState();

    this._dispatchChange();
  }

  dispose() {
    this._stopUpdateLoop();

    this.isAnimating = false;

    this.detachControlledObjectFromCamera();

    document.removeEventListener('keydown', this.onKeyDown);

    document.removeEventListener('keyup', this.onKeyUp);

    document.removeEventListener('mousemove', this.onMouseMove);

    document.removeEventListener('pointerlockchange', this.onPointerLockChange);

    document.removeEventListener('pointerlockerror', this.onPointerLockError);

    document.removeEventListener('visibilitychange', this._onVisibilityChange);

    window.removeEventListener('blur', this._onWindowBlur);

    this.renderer?.domElement?.removeEventListener('click', this.onClick);

    this.renderer?.domElement?.removeEventListener('mouseleave', this.onViewportLeave);
  }

  setMode(mode, options = {}) {
    if (this.mode === mode) {
      this.refreshMode(mode, options);

      return;
    }

    this.exitCurrentMode();

    this.previousMode = this.mode;

    this.mode = mode;

    switch (mode) {
      case 'FLY':
        this.enterFlyMode(options.flyObject);

        break;

      case 'FIRST_PERSON':
        this.enterFirstPersonMode(options.flyObject);

        break;

      case 'DRIVE':
        this.enterDriveMode(options.vehicle, options);

        break;

      default:
        this.enterOrbitMode();

        break;
    }

    this._dispatchModeChange(mode, options);
  }

  refreshMode(mode, options = {}) {
    const nextFlyObject = this.normalizeControlledTarget(options.flyObject);

    const nextVehicle = this.normalizeControlledTarget(options.vehicle);

    if (mode === 'FIRST_PERSON') {
      const requiresReentry = nextFlyObject ? nextFlyObject !== this.targetFlyObject : false;

      if (requiresReentry) {
        this.exitCurrentMode();

        this.enterFirstPersonMode(nextFlyObject);
      } else {
        this.requestViewportPointerLock();

        this.updateFirstPersonCamera(1.0);

        if (this._requiresContinuousUpdate()) {
          this._startUpdateLoop();
        }

        this._dispatchChange();
      }

      this._dispatchModeChange(mode, {
        ...options,
        flyObject: nextFlyObject || this.targetFlyObject
      });

      return;
    }

    if (mode === 'FLY') {
      if (nextFlyObject && nextFlyObject !== this.targetFlyObject) {
        this.exitCurrentMode();

        this.enterFlyMode(nextFlyObject);

        this._dispatchModeChange(mode, {
          ...options,
          flyObject: nextFlyObject
        });

        return;
      }

      this.updateFlyCamera(1.0);

      if (this._requiresContinuousUpdate()) {
        this._startUpdateLoop();
      }

      this._dispatchChange();

      this._dispatchModeChange(mode, {
        ...options,
        flyObject: this.targetFlyObject
      });

      return;
    }

    if (mode === 'DRIVE') {
      if (nextVehicle && nextVehicle !== this.targetVehicle) {
        this.exitCurrentMode();

        this.enterDriveMode(nextVehicle, options);

        this._dispatchModeChange(mode, {
          ...options,
          vehicle: nextVehicle
        });

        return;
      }

      this.updateDriveCamera(1.0);

      if (this._requiresContinuousUpdate()) {
        this._startUpdateLoop();
      }

      this._dispatchChange();

      this._dispatchModeChange(mode, {
        ...options,
        vehicle: this.targetVehicle
      });

      return;
    }

    if (mode === 'ORBIT') {
      this.enterOrbitMode();

      this._dispatchModeChange(mode, options);
    }
  }

  exitCurrentMode() {
    this._stopUpdateLoop();

    switch (this.mode) {
      case 'FLY':
        this.exitFlyMode();

        break;

      case 'FIRST_PERSON':
        this.exitFirstPersonMode();

        break;

      case 'DRIVE':
        this.exitDriveMode();

        break;
    }
  }

  enterOrbitMode() {
    if (this.controls) this.controls.enabled = true;

    this.removeCrosshair();

    this.setCursorVisibility(true);

    if (typeof this.editor.defaultControls === 'function') {
      this.editor.defaultControls({ block_movement: false });
    }

    this.syncPointerLockState();

    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  enterFlyMode(flyObject = null) {
    flyObject = this.normalizeControlledTarget(flyObject) || this.editor.scene.getObjectByName('Drone');

    if (this.controls) this.controls.enabled = false;

    this.removeCrosshair();

    this.setCursorVisibility(true);

    this.targetFlyObject = flyObject;

    if (!flyObject) {
      const dir = new THREE.Vector3();

      this.camera.getWorldDirection(dir);

      this.yaw = Math.atan2(dir.x, dir.z);

      this.pitch = this.clampFlyPitch(Math.asin(Math.max(-1, Math.min(1, dir.y))));

      this._startUpdateLoop();

      return;
    }

    this.flyObjectRotation = this.getYawFromQuaternion(flyObject.quaternion);

    this.flyLookYaw = 0;

    this.flyLookPitch = 0;

    this.driverPOV = this.findDriverPOV(flyObject);

    this.getTargetBoundingBox(flyObject);

    this.updateFlyCamera(1.0);

    this._dispatchChange();

    this._startUpdateLoop();
  }

  enterFirstPersonMode(flyObject = null) {
    flyObject = this.normalizeControlledTarget(flyObject) || this.editor.scene.getObjectByName('Drone');

    if (this.controls) this.controls.enabled = false;

    this.targetFlyObject = flyObject;

    this.driverPOV = this.findDriverPOV(flyObject);

    this.cameraViewMode = 'FIRST_PERSON';

    this.createCrosshair();

    this.syncPointerLockState();

    this.requestViewportPointerLock();

    if (!flyObject) {
      const dir = new THREE.Vector3();

      this.camera.getWorldDirection(dir);

      this.yaw = Math.atan2(dir.x, dir.z);

      this.pitch = this.clampFlyPitch(Math.asin(Math.max(-1, Math.min(1, dir.y))));

      this._updateFreeFlyCamera();

      this._dispatchChange();

      this._startUpdateLoop();

      return;
    }

    this.flyObjectRotation = this.getYawFromQuaternion(flyObject.quaternion);

    this.flyLookYaw = 0;

    this.flyLookPitch = 0;

    this.getTargetBoundingBox(flyObject);

    this.updateFirstPersonCamera(1.0);

    this._dispatchChange();

    this._startUpdateLoop();
  }

  exitFlyMode() {
    this.targetFlyObject = null;

    this.driverPOV = null;

    this.targetBoundingBox = null;

    this.cameraViewMode = 'THIRD_PERSON';

    this._resetMoveState();

    this.removeCrosshair();

    this.setCursorVisibility(true);
  }

  exitFirstPersonMode() {
    this.targetFlyObject = null;

    this.driverPOV = null;

    this.targetBoundingBox = null;

    this.cameraViewMode = 'THIRD_PERSON';

    this._resetMoveState();

    this.removeCrosshair();

    this.setCursorVisibility(true);
  }

  enterDriveMode(vehicle, options = {}) {
    if (!vehicle) {
      this.setMode('ORBIT');

      return;
    }

    vehicle = this.normalizeControlledTarget(vehicle);

    if (!vehicle.position) {
      this.setMode('ORBIT');

      return;
    }

    this.targetVehicle = vehicle;

    this.driveGrounds = options.grounds || [];

    this.driveExtents = options.extents || null;

    this.resetPosition = options.resetPosition || vehicle.position.clone();

    if (this.controls) this.controls.enabled = false;

    this.vehicleRotation = this.getYawFromQuaternion(vehicle.quaternion);

    this.driveLookYaw = 0;

    this.driveLookPitch = 0;

    this.driverPOV = this.findDriverPOV(vehicle);

    this.getTargetBoundingBox(vehicle);

    this.updateDriveCamera(1.0);

    this._dispatchChange();

    this._startUpdateLoop();
  }

  exitDriveMode() {
    this.targetVehicle = null;

    this.driveGrounds = [];

    this.driveExtents = null;

    this.resetPosition = null;

    this.driverPOV = null;

    this.targetBoundingBox = null;

    this.cameraViewMode = 'THIRD_PERSON';

    this._resetMoveState();

    this.removeCrosshair();

    this.setCursorVisibility(true);
  }

  _resetMoveState() {
    this.moveState.forward = false;

    this.moveState.backward = false;

    this.moveState.left = false;

    this.moveState.right = false;

    this.moveState.up = false;

    this.moveState.down = false;

    this.moveState.sprint = false;
  }

  setVehicle(vehicle) {
    this.targetVehicle = vehicle;

    if (this.mode === 'DRIVE') {
      this.updateDriveCamera(1.0);

      this._dispatchChange();
    }
  }

  onClick() {
    if (this.isFlyMode() || this.mode === 'DRIVE') {
      this.requestViewportPointerLock();
    }
  }

  onPointerLockChange() {
    this.syncPointerLockState({ resetMovement: !this.isPointerLockedToViewport(), dispatchChange: !this.isPointerLockedToViewport() });
  }

  onPointerLockError() {
    this.syncPointerLockState();
  }

  onViewportLeave() {
    if (this.isLocked || this.mode === 'ORBIT') return;

    this._resetMoveState();

    this._dispatchChange();
  }

  onMouseMove(event) {
    if (!this.isLocked) return;

    const movementX = event.movementX || 0;

    const movementY = event.movementY || 0;

    if (this.isFirstPersonMode()) {
      if (this.targetFlyObject) {
        this.flyLookYaw -= movementX * this.flySettings.lookSensitivity;

        this.flyLookPitch = this.clampFlyPitch(this.flyLookPitch - movementY * this.flySettings.lookSensitivity);

        this.updateFirstPersonCamera(1.0);
      } else {
        this.yaw -= movementX * this.flySettings.lookSensitivity;

        this.pitch = this.clampFlyPitch(this.pitch - movementY * this.flySettings.lookSensitivity);

        this._updateFreeFlyCamera();
      }

      this._dispatchChange();

      return;
    }

    if (this.mode === 'FLY' && !this.targetFlyObject) {
      this.yaw -= movementX * this.flySettings.lookSensitivity;

      this.pitch = this.clampFlyPitch(this.pitch - movementY * this.flySettings.lookSensitivity);

      this._updateFreeFlyCamera();

      this._dispatchChange();

      return;
    }

    if (this.mode === 'FLY' && this.targetFlyObject) {
      this.flyLookYaw -= movementX * this.flySettings.lookSensitivity;

      this.flyLookPitch = this.clampFlyPitch(this.flyLookPitch - movementY * this.flySettings.lookSensitivity);

      this.updateFlyCamera(1.0);

      this._dispatchChange();

      return;
    }

    if (this.mode === 'DRIVE') {
      this.driveLookYaw -= movementX * this.driveSettings.lookSensitivity;

      this.driveLookPitch = Math.max(
        THREE.MathUtils.degToRad(this.driveSettings.verticalMin),
        Math.min(THREE.MathUtils.degToRad(this.driveSettings.verticalMax), this.driveLookPitch - movementY * this.driveSettings.lookSensitivity)
      );

      this.updateDriveCamera(1.0);

      this._dispatchChange();
    }
  }

  _updateFreeFlyCamera() {
    const cosPitch = Math.cos(this.pitch);

    const forward = new THREE.Vector3(
      Math.sin(this.yaw) * cosPitch,
      Math.sin(this.pitch),
      Math.cos(this.yaw) * cosPitch
    );

    this.controls?.center.copy(this.camera.position).addScaledVector(forward, 10);

    this.camera.lookAt(this.controls?.center);
  }

  onKeyDown(event) {
    if (this.mode === 'ORBIT') {
      if (!FocusManager.canHandleViewportShortcuts()) return;

      return;
    }

    if (FocusManager.isInputFocused()) return;

    if (this.isAnimating) {
      this.isAnimating = false;
    }

    const allKeys = [
      ...Object.values(this.keyMappings.fly.keys),
      ...Object.values(this.keyMappings.drive.keys)
    ];

    if (allKeys.includes(event.code)) {
      event.preventDefault();
    }

    let stateChanged = false;

    if (this.isFlyMode()) {
      const keys = this.keyMappings.fly.keys;

      if (this.checkKey(event, keys.forward) && !this.moveState.forward) { this.moveState.forward = true;

 stateChanged = true; }

      if (this.checkKey(event, keys.backward) && !this.moveState.backward) { this.moveState.backward = true;

 stateChanged = true; }

      if (this.checkKey(event, keys.left) && !this.moveState.left) { this.moveState.left = true;

 stateChanged = true; }

      if (this.checkKey(event, keys.right) && !this.moveState.right) { this.moveState.right = true;

 stateChanged = true; }

      if (this.checkKey(event, keys.up) && !this.moveState.up) { this.moveState.up = true;

 stateChanged = true; }

      if (this.checkKey(event, keys.down) && !this.moveState.down) { this.moveState.down = true;

 stateChanged = true; }

      if (this.checkKey(event, keys.sprint) && !this.moveState.sprint) { this.moveState.sprint = true;

 stateChanged = true; }
    } else if (this.mode === 'DRIVE') {
      const keys = this.keyMappings.drive.keys;

      if (this.checkKey(event, keys.accelerate) && !this.moveState.forward) { this.moveState.forward = true;

 stateChanged = true; }

      if (this.checkKey(event, keys.brake) && !this.moveState.backward) { this.moveState.backward = true;

 stateChanged = true; }

      if (this.checkKey(event, keys.left) && !this.moveState.left) { this.moveState.left = true;

 stateChanged = true; }

      if (this.checkKey(event, keys.right) && !this.moveState.right) { this.moveState.right = true;

 stateChanged = true; }

      if (this.checkKey(event, keys.boost) && !this.moveState.sprint) { this.moveState.sprint = true;

 stateChanged = true; }
    }

    if (stateChanged) {
      this._startUpdateLoop();
    }

    if (event.code === 'Escape') {
      if (this.mode !== 'ORBIT') {
        this.setMode('ORBIT');
      }
    }

    if (event.ctrlKey && event.code === 'Space') {
      event.preventDefault();

      this.toggleCameraViewMode();
    }

  }

  onKeyUp(event) {
    if (this.mode === 'ORBIT') return;

    let stateChanged = false;

    if (this.isFlyMode()) {
      const keys = this.keyMappings.fly.keys;

      if (this.checkKey(event, keys.forward) && this.moveState.forward) { this.moveState.forward = false; stateChanged = true; }

      if (this.checkKey(event, keys.backward) && this.moveState.backward) { this.moveState.backward = false; stateChanged = true; }

      if (this.checkKey(event, keys.left) && this.moveState.left) { this.moveState.left = false; stateChanged = true; }

      if (this.checkKey(event, keys.right) && this.moveState.right) { this.moveState.right = false; stateChanged = true; }

      if (this.checkKey(event, keys.up) && this.moveState.up) { this.moveState.up = false; stateChanged = true; }

      if (this.checkKey(event, keys.down) && this.moveState.down) { this.moveState.down = false; stateChanged = true; }

      if (this.checkKey(event, keys.sprint) && this.moveState.sprint) { this.moveState.sprint = false; stateChanged = true; }
    } else if (this.mode === 'DRIVE') {
      const keys = this.keyMappings.drive.keys;

      if (this.checkKey(event, keys.accelerate) && this.moveState.forward) { this.moveState.forward = false; stateChanged = true; }

      if (this.checkKey(event, keys.brake) && this.moveState.backward) { this.moveState.backward = false; stateChanged = true; }

      if (this.checkKey(event, keys.left) && this.moveState.left) { this.moveState.left = false; stateChanged = true; }

      if (this.checkKey(event, keys.right) && this.moveState.right) { this.moveState.right = false; stateChanged = true; }

      if (this.checkKey(event, keys.boost) && this.moveState.sprint) { this.moveState.sprint = false; stateChanged = true; }
    }

    if (!stateChanged) return;

    if (this._hasActiveMovement()) {
      this._startUpdateLoop();
    } else {
      this._dispatchChange();
    }
  }

  checkKey(event, keyCode) {
    return event.code === keyCode;
  }

  update() {
    if (this.mode === 'ORBIT') return false;

    if (!this._hasActiveMovement()) return false;

    return true;
  }

  updateFlyMode(delta) {
    if (this.isFirstPersonMode()) {
      this.updateFirstPersonMode(delta);

      return;
    }

    if (this.targetFlyObject) {
      this.updateObjectFlyMode(delta);

      return;
    }

    this.updateFreeFlyMode(delta);
  }

  updateFreeFlyMode(delta) {
    const speed = this.moveState.sprint 
      ? this.flySettings.moveSpeed * this.flySettings.sprintMultiplier 
      : this.flySettings.moveSpeed;

    const cosPitch = Math.cos(this.pitch);

    const forward = new THREE.Vector3(
      Math.sin(this.yaw) * cosPitch,
      Math.sin(this.pitch),
      Math.cos(this.yaw) * cosPitch
    );

    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    this.direction.set(0, 0, 0);

    if (this.moveState.forward) this.direction.add(forward);

    if (this.moveState.backward) this.direction.sub(forward);

    if (this.moveState.left) this.direction.sub(right);

    if (this.moveState.right) this.direction.add(right);

    if (this.direction.length() > 0) this.direction.normalize();

    this.camera.position.addScaledVector(this.direction, speed * delta);

    if (this.moveState.up) this.camera.position.y += this.flySettings.verticalSpeed * delta;

    if (this.moveState.down) this.camera.position.y -= this.flySettings.verticalSpeed * delta;

    this.controls?.center.copy(this.camera.position).addScaledVector(forward, 10);
  }

  updateFirstPersonMode(delta) {
    if (this.targetFlyObject?.position) {
      this.flyObjectRotation = this.applyObjectMovement(
        this.targetFlyObject,
        this.flyObjectRotation,
        delta,
        this.flySettings,
        true
      );

      this.updateFirstPersonCamera(1.0);

      return;
    }

    this.updateFreeFlyMode(delta);

    this._updateFreeFlyCamera();
  }

  updateObjectFlyMode(delta) {
    if (!this.targetFlyObject?.position) return;

    this.flyObjectRotation = this.applyObjectMovement(
      this.targetFlyObject,
      this.flyObjectRotation,
      delta,
      this.flySettings,
      true
    );

    this.updateFlyCamera(1.0);
  }

  updateFlyCamera(smoothFactor = 0.1) {
    if (this.isFirstPersonMode()) {
      this.updateFirstPersonCamera(smoothFactor);

      return;
    }

    if (!this.targetFlyObject?.position) return;

    const objectPos = this.targetFlyObject.position;

    if (typeof objectPos.x !== 'number' || typeof objectPos.y !== 'number' || typeof objectPos.z !== 'number') return;

    const totalYaw = this.flyObjectRotation + this.flyLookYaw;

    const pitch = this.flyLookPitch;

    this.updateFollowCamera(this.targetFlyObject, totalYaw, pitch, this.flySettings, smoothFactor, 0.5);
  }

  updateDriveMode(delta) {
    if (!this.targetVehicle) return;

    const isOnGround = this.isVehicleOnGround(this.targetVehicle);

    if (isOnGround) {
      this.vehicleRotation = this.applyObjectMovement(
        this.targetVehicle,
        this.vehicleRotation,
        delta,
        this.driveSettings,
        false
      );
    } else {
      const gravity = -9.8 * delta;

      this.targetVehicle.position.y += gravity;
    }

    if (this.targetVehicle.position.y < -10) {
      if (this.resetPosition) {
        this.targetVehicle.position.copy(this.resetPosition);

        this.targetVehicle.rotation.set(0, 0, 0);

        this.vehicleRotation = 0;
      }
    }

    this.updateDriveCamera(1.0);
  }

  updateDriveCamera(smoothFactor = 0.1) {
    if (!this.targetVehicle) return;

    const totalYaw = this.vehicleRotation + this.driveLookYaw;

    const pitch = this.driveLookPitch;

    this.updateFollowCamera(this.targetVehicle, totalYaw, pitch, this.driveSettings, smoothFactor, 1.0);
  }

  isVehicleOnGround(vehicle) {
    if (!this.driveGrounds.length) return true;

    const vehiclePos = vehicle.position.clone();

    vehiclePos.y += 0.1;

    const raycaster = new THREE.Raycaster();

    const downDirection = new THREE.Vector3(0, -1, 0);

    const maxDistance = 5;

    raycaster.set(vehiclePos, downDirection);

    for (const ground of this.driveGrounds) {
      if (!ground.geometry) continue;

      const intersects = raycaster.intersectObject(ground, true);

      if (intersects.length > 0 && intersects[0].distance <= maxDistance) {
        return true;
      }
    }

    return false;
  }

  createCrosshair() {
    if (this.crosshair) return;

    this.crosshair = document.createElement('div');
    this.crosshair.className = 'navigation-crosshair';

    const dot = document.createElement('div');
    dot.className = 'navigation-crosshair-dot';

    const vLine = document.createElement('div');
    vLine.className = 'navigation-crosshair-vline';

    const hLine = document.createElement('div');
    hLine.className = 'navigation-crosshair-hline';

    this.crosshair.appendChild(dot);

    this.crosshair.appendChild(vLine);

    this.crosshair.appendChild(hLine);

    document.body.appendChild(this.crosshair);
    this.updateCrosshairPosition();
    window.addEventListener('resize', this.updateCrosshairPosition);

    if (this.renderer?.domElement && typeof ResizeObserver !== 'undefined') {
      this.crosshairResizeObserver = new ResizeObserver(this.updateCrosshairPosition);
      this.crosshairResizeObserver.observe(this.renderer.domElement);
    }
  }

  removeCrosshair() {
    window.removeEventListener('resize', this.updateCrosshairPosition);

    if (this.crosshairResizeObserver) {
      this.crosshairResizeObserver.disconnect();
      this.crosshairResizeObserver = null;
    }

    if (this.crosshair) {
      if (this.crosshair.parentNode) {
        this.crosshair.parentNode.removeChild(this.crosshair);
      }

      this.crosshair = null;
    }
  }

  updateCrosshairPosition() {
    if (!this.crosshair) return;

    const canvas = this.renderer?.domElement;

    if (!canvas) {
      this.crosshair.style.left = '50%';
      this.crosshair.style.top = '50%';
      return;
    }

    const rect = canvas.getBoundingClientRect();

    this.crosshair.style.left = `${rect.left + (rect.width / 2)}px`;
    this.crosshair.style.top = `${rect.top + (rect.height / 2)}px`;
  }

  getMode() {
    return this.mode;
  }

  toggleFlyMode(flyObject = null) {
    if (this.mode === 'FLY') {
      this.setMode('ORBIT');
    } else {
      this.setMode('FLY', { flyObject });
    }
  }

  setFlyObject(flyObject) {
    this.targetFlyObject = flyObject;

    if (flyObject && this.isFlyMode()) {
      this.flyObjectRotation = this.getYawFromQuaternion(flyObject.quaternion);

      if (this.isFirstPersonMode()) {
        this.updateFirstPersonCamera(1.0);
      } else {
        this.updateFlyCamera(1.0);
      }

      this._dispatchChange();
    }
  }

  toggleDriveMode(vehicle, options = {}) {
    if (this.mode === 'DRIVE') {
      this.setMode('ORBIT');
    } else {
      this.setMode('DRIVE', { vehicle, ...options });
    }
  }

  setFlySettings(settings) {
    Object.assign(this.flySettings, settings);
  }

  setDriveSettings(settings) {
    Object.assign(this.driveSettings, settings);
  }

  triggerMovementUpdate() {
    if (!this._hasActiveMovement() && !this._requiresContinuousUpdate()) return;

    this._startUpdateLoop();
  }

  getControlledObject() {
    if (this.isFlyMode() && this.targetFlyObject) {
      return this.targetFlyObject;
    }

    if (this.mode === 'DRIVE' && this.targetVehicle) {
      return this.targetVehicle;
    }

    return null;
  }

  isControllingObject() {
    return (this.isFlyMode() && this.targetFlyObject !== null) ||
           (this.mode === 'DRIVE' && this.targetVehicle !== null);
  }

  syncStateFromCurrentPosition() {
    if (this.isFlyMode() && this.targetFlyObject) {
      this.flyObjectRotation = this.getYawFromQuaternion(this.targetFlyObject.quaternion);

      this.flyLookYaw = 0;

      this.flyLookPitch = 0;
    } else if (this.mode === 'DRIVE' && this.targetVehicle) {
      this.vehicleRotation = this.getYawFromQuaternion(this.targetVehicle.quaternion);

      this.driveLookYaw = 0;

      this.driveLookPitch = 0;

      if (this.isFirstPersonMode()) {
        this.updateFirstPersonCamera(1.0);
      }
    } else if (this.mode === 'ORBIT' || (this.isFlyMode() && !this.targetFlyObject)) {
      const dir = new THREE.Vector3();

      this.camera.getWorldDirection(dir);

      this.yaw = Math.atan2(dir.x, dir.z);

      this.pitch = this.clampFlyPitch(Math.asin(Math.max(-1, Math.min(1, dir.y))));
    }

    this._dispatchChange();
  }

  pauseInput(attachToCamera = false) {
    this.isAnimating = true;

    if (attachToCamera) {
      this.attachControlledObjectToCamera();
    }
  }

  resumeInput() {
    this.detachControlledObjectFromCamera();

    this.isAnimating = false;

    this.syncStateFromCurrentPosition();

    if (this._requiresContinuousUpdate()) {
      this._startUpdateLoop();
    }
  }

  attachControlledObjectToCamera() {
    const obj = this.getControlledObject();

    if (!obj || this._attachedObjectData) return; 

    this._attachedObjectData = {
      object: obj,
      originalParent: obj.parent,
      originalMatrix: obj.matrix.clone()
    };

    const cameraWorldPos = this.camera.getWorldPosition(new THREE.Vector3());

    const objWorldPos = obj.getWorldPosition(new THREE.Vector3());

    const offset = objWorldPos.sub(cameraWorldPos);

    const cameraWorldQuat = this.camera.getWorldQuaternion(new THREE.Quaternion());

    const objWorldQuat = obj.getWorldQuaternion(new THREE.Quaternion());

    const relativeQuat = cameraWorldQuat.clone().invert().multiply(objWorldQuat);

    this.camera.add(obj);

    obj.position.copy(offset);

    obj.quaternion.copy(relativeQuat);
  }

  detachControlledObjectFromCamera() {
    if (!this._attachedObjectData) return;

    const { object, originalParent } = this._attachedObjectData;

    const worldPos = object.getWorldPosition(new THREE.Vector3());

    const worldQuat = object.getWorldQuaternion(new THREE.Quaternion());

    const newParent = originalParent?.parent ? originalParent : this.editor.scene;

    newParent.add(object);

    if (newParent !== this.editor.scene) {
      const parentInverseMatrix = new THREE.Matrix4().copy(newParent.matrixWorld).invert();

      worldPos.applyMatrix4(parentInverseMatrix);
    }

    object.position.copy(worldPos);

    object.quaternion.copy(worldQuat);

    this._attachedObjectData = null;
  }
}

export { NavigationController };
