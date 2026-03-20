import dataStore from "../../data/index.js";

import { Collection } from "../../data/index.js";

import tools from "../index.js";

import * as THREE from "three";

/**
 * AnimationPathCollection - Stores an animation path with viewpoint IDs
 */
class AnimationPathCollection extends Collection {
  constructor({
    id = THREE.MathUtils.generateUUID(),
    name = 'Animation Path',
    viewpointIds = [],
    pathColor = '#ff0000',
    markerColor = '#00ff00',
    targetColor = '#0000ff',
    
    totalDuration = 20, 
    showPathDuringPlay = true, 
    defaultStopBehavior = 'pause', 
    defaultStopDuration = 2, 
    defaultStopDurationMode = 'seconds', 
    cameraSpeedMode = 'auto', 
    manualCameraSpeed = 5, 
    easing = 'ease-out-cubic', 
    loop = false, 
    viewpointSettings = {} 
  } = {}) {
    super({
      name,
      type: 'AnimationPathCollection',
      GlobalId: id
    });

    this.id = id;

    this.viewpointIds = viewpointIds;
    this.viewpointOrder = new Map();

    viewpointIds.forEach((vpId, index) => {
      this.viewpointOrder.set(vpId, index);
    });

    this.active = false;

    this.visible = false; 

    this.sceneObjects = []; 
    this.pathColor = pathColor;

    this.markerColor = markerColor;

    this.targetColor = targetColor;
    this.totalDuration = totalDuration;

    this.showPathDuringPlay = showPathDuringPlay;

    this.defaultStopBehavior = defaultStopBehavior;

    this.defaultStopDuration = defaultStopDuration;

    this.defaultStopDurationMode = defaultStopDurationMode;

    this.cameraSpeedMode = cameraSpeedMode;

    this.manualCameraSpeed = manualCameraSpeed;

    this.easing = easing;

    this.loop = loop;

    this.viewpointSettings = viewpointSettings;
    this.isPlaying = false;

    this.isPaused = false;

    this.playbackProgress = 0;
  }

  /**
   * Get settings for a specific viewpoint
   */
  getViewpointSettings(viewpointId) {
    return this.viewpointSettings[viewpointId] || {
      stopBehavior: this.defaultStopBehavior,
      stopDuration: this.defaultStopDuration,
      durationMode: this.defaultStopDurationMode
    };
  }

  /**
   * Set settings for a specific viewpoint
   */
  setViewpointSettings(viewpointId, settings) {
    this.viewpointSettings[viewpointId] = {
      ...this.getViewpointSettings(viewpointId),
      ...settings
    };

    return this;
  }

  /**
   * Calculate camera speed based on path length and duration
   */
  calculateCameraSpeed(pathLength) {
    if (this.cameraSpeedMode === 'manual') {
      return this.manualCameraSpeed;
    }
    let totalStopTime = 0;

    this.viewpointIds.forEach(vpId => {
      const settings = this.getViewpointSettings(vpId);

      if (settings.stopBehavior === 'pause') {
        if (settings.durationMode === 'seconds') {
          totalStopTime += settings.stopDuration;
        } else {
          totalStopTime += this.totalDuration * settings.stopDuration;
        }
      }
    });

    const travelTime = Math.max(1, this.totalDuration - totalStopTime);

    return pathLength / travelTime;
  }

  /**
   * Get stop duration in seconds for a viewpoint
   */
  getStopDurationSeconds(viewpointId) {
    const settings = this.getViewpointSettings(viewpointId);

    if (settings.stopBehavior === 'flythrough') {
      return 0;
    }

    if (settings.durationMode === 'seconds') {
      return settings.stopDuration;
    }
    return this.totalDuration * settings.stopDuration;
  }

  addViewpoint(viewpointId) {
    if (!this.viewpointIds.includes(viewpointId)) {
      this.viewpointIds.push(viewpointId);
      this.viewpointOrder.set(viewpointId, this.viewpointIds.length - 1);
    }

    return this;
  }

  removeViewpoint(viewpointId) {
    this.viewpointIds = this.viewpointIds.filter(id => id !== viewpointId);

    this.viewpointOrder.delete(viewpointId);
    this._reindexViewpoints();

    return this;
  }

  /**
   * Reorder viewpoints based on new order array
   * @param {Array} newOrder - Array of viewpoint IDs in new order
   */
  reorderViewpoints(newOrder) {
    
    const validIds = newOrder.filter(id => this.viewpointIds.includes(id));

    if (validIds.length !== this.viewpointIds.length) {
      console.warn('Invalid viewpoint order - some IDs not found');

      return this;
    }
    
    this.viewpointIds = [...validIds];

    this._reindexViewpoints();

    return this;
  }

  /**
   * Move a viewpoint to a new position
   * @param {string} viewpointId - ID of viewpoint to move
   * @param {number} newIndex - New index position (0-based)
   */
  moveViewpoint(viewpointId, newIndex) {
    const currentIndex = this.viewpointIds.indexOf(viewpointId);

    if (currentIndex === -1) return this;
    this.viewpointIds.splice(currentIndex, 1);
    const clampedIndex = Math.max(0, Math.min(newIndex, this.viewpointIds.length));

    this.viewpointIds.splice(clampedIndex, 0, viewpointId);
    
    this._reindexViewpoints();

    return this;
  }

  /**
   * Reindex viewpoint order map after changes
   */
  _reindexViewpoints() {
    this.viewpointOrder.clear();

    this.viewpointIds.forEach((vpId, index) => {
      this.viewpointOrder.set(vpId, index);
    });
  }

  /**
   * Get sorted viewpoints by order
   */
  getSortedViewpointIds() {
    return [...this.viewpointIds];
  }

  getViewpoints() {
    return this.viewpointIds.map(id => tools.world.viewpoint.get(id)).filter(vp => vp);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      viewpointIds: this.viewpointIds,
      pathColor: this.pathColor,
      markerColor: this.markerColor,
      targetColor: this.targetColor,
      
      totalDuration: this.totalDuration,
      showPathDuringPlay: this.showPathDuringPlay,
      defaultStopBehavior: this.defaultStopBehavior,
      defaultStopDuration: this.defaultStopDuration,
      defaultStopDurationMode: this.defaultStopDurationMode,
      cameraSpeedMode: this.cameraSpeedMode,
      manualCameraSpeed: this.manualCameraSpeed,
      easing: this.easing,
      loop: this.loop,
      viewpointSettings: this.viewpointSettings
    };
  }

  static fromJSON(data) {
    return new AnimationPathCollection({
      id: data.id,
      name: data.name,
      viewpointIds: data.viewpointIds || [],
      pathColor: data.pathColor || '#ff0000',
      markerColor: data.markerColor || '#00ff00',
      targetColor: data.targetColor || '#0000ff',
      
      totalDuration: data.totalDuration || 20,
      showPathDuringPlay: data.showPathDuringPlay !== false,
      defaultStopBehavior: data.defaultStopBehavior || 'pause',
      defaultStopDuration: data.defaultStopDuration || 2,
      defaultStopDurationMode: data.defaultStopDurationMode || 'seconds',
      cameraSpeedMode: data.cameraSpeedMode || 'auto',
      manualCameraSpeed: data.manualCameraSpeed || 5,
      easing: data.easing || 'ease-out-cubic',
      loop: data.loop || false,
      viewpointSettings: data.viewpointSettings || {}
    });
  }
}

/**
 * AnimationPathTool - Static tool for managing animation paths
 */
class AnimationPathTool {
  
  static EASINGS = {
    linear: "linear",
    easeInQuad: "ease-in-quad",
    easeOutQuad: "ease-out-quad",
    easeInOutQuad: "ease-in-out-quad",
    easeInCubic: "ease-in-cubic",
    easeOutCubic: "ease-out-cubic",
    easeInOutCubic: "ease-in-out-cubic",
    easeInExpo: "ease-in-expo",
    easeOutExpo: "ease-out-expo"
  }

  static collection = new Collection({
      name: 'AnimationPaths',
      type: 'AnimationPathsCollection'
    });
  static getCollection() {
    
    return this.collection;
  }

  static createPath(context, name = 'New Path') {
    const path = new AnimationPathCollection({ name });

    this.collection.children.push(path);

    return path;
  }

  static removePath(context, GlobalId) {
    const path = this.collection.children.find(p => p.GlobalId === GlobalId);

    if (path) {
      
      this.removeVisualization(context, path);

      this.collection.children = this.collection.children.filter(p => p.GlobalId !== GlobalId);

      return true;
    }

    return false;
  }

  static renamePath(context, GlobalId, newName) {
    const path = this.collection.children.find(p => p.GlobalId === GlobalId);

    if (path) {
      path.name = newName;

      return true;
    }

    return false;
  }

  static activatePath(context, GlobalId) {
    this.collection.children.forEach(p => {
      if (p.active) {
        p.active = false;
      }
    });

    const path = this.collection.children.find(p => p.GlobalId === GlobalId);

    if (path) {
      path.active = true;
      if (path.visible) {
        this.updateVisualization(context, path);
      }

      return true;
    }

    return false;
  }

  static setPathVisibility(context, GlobalId, visible) {
    const path = this.collection.children.find(p => p.GlobalId === GlobalId);

    if (path) {
      path.visible = visible;

      if (visible) {
        this.addVisualization(context, path);
      } else {
        this.removeVisualization(context, path);
      }

      return true;
    }

    return false;
  }

  static addViewpointToPath(context, pathGlobalId, viewpointGlobalId) {
    const path = this.collection.children.find(p => p.GlobalId === pathGlobalId);

    if (path) {
      path.addViewpoint(viewpointGlobalId);

      if (path.visible) {
        this.updateVisualization(context, path);
      }

      return true;
    }

    return false;
  }

  static removeViewpointFromPath(context, pathGlobalId, viewpointGlobalId) {
    const path = this.collection.children.find(p => p.GlobalId === pathGlobalId);

    if (path) {
      path.removeViewpoint(viewpointGlobalId);

      if (path.visible) {
        this.updateVisualization(context, path);
      }

      return true;
    }

    return false;
  }

  static calculateCameraSpeed(p1, p2, travelTime) {

    const pathLength = p1.distanceTo(p2);

    return pathLength / travelTime;
  }

  static playPath(context, GlobalId) {

    const path = this.collection.children.find(p => p.GlobalId === GlobalId);

    if (path && path.viewpointIds.length > 0) {
      path.isPlaying = true;

      path.isPaused = false;

      path.playbackProgress = 0;
      const nav = context.editor.navigationController;

      const isControllingObject = nav?.isControllingObject();
      
      context.editor.controls.enabled = false;

      nav?.pauseInput(isControllingObject); 

      if (!path.showPathDuringPlay && path.visible) {
        this.removeVisualization(context, path);
      }

      const viewpoints = path.getViewpoints();
      
      if (viewpoints.length === 0) {
        path.isPlaying = false;

        return;
      }

      let fullPath = 0;

      for (let i = 0; i < viewpoints.length - 1; i++) {
        const p1 = viewpoints[i].cameraPosition.toVector3();

        const p2 = viewpoints[i + 1].cameraPosition.toVector3();

        fullPath += p1.distanceTo(p2);
      }

      const cameraSpeed = path.calculateCameraSpeed(fullPath);
      
      let currentIndex = 0;

      let animationFrameId = null;

      const animateToNextViewpoint = () => {
        if (!path.isPlaying || currentIndex >= viewpoints.length) {
          path.isPlaying = false;

          path.playbackProgress = 1;

          if (!path.showPathDuringPlay && path.visible) {
            this.addVisualization(context, path);
          }
          context.editor.controls.enabled = true;

          nav?.resumeInput();
          if (path.loop && currentIndex >= viewpoints.length) {
            currentIndex = 0;

            path.playbackProgress = 0;

            path.isPlaying = true;

            animateToNextViewpoint();
          }

          return;
        }

        const currentVp = viewpoints[currentIndex];

        const vpId = path.viewpointIds[currentIndex];

        const settings = path.getViewpointSettings(vpId);
        let transitionDuration = 1000; 

        if (currentIndex > 0) {
          const prevVp = viewpoints[currentIndex - 1];

          const distance = prevVp.cameraPosition.toVector3().distanceTo(
            currentVp.cameraPosition.toVector3()
          );

          transitionDuration = (distance / cameraSpeed) * 1000;
        }
        const easingFn = this._getEasingFunction(path.easing);
        this._animateCameraToViewpoint(context, currentVp, transitionDuration, easingFn, () => {
          
          path.playbackProgress = (currentIndex + 1) / viewpoints.length;
          const stopDuration = path.getStopDurationSeconds(vpId) * 1000;
          
          if (settings.stopBehavior === 'pause' && stopDuration > 0) {
            
            setTimeout(() => {
              currentIndex++;

              animateToNextViewpoint();
            }, stopDuration);
          } else {
            
            currentIndex++;

            animateToNextViewpoint();
          }
        });
      };

      animateToNextViewpoint();
    }
  }

  /**
   * Stop the currently playing animation
   */
  static stopPath(context, GlobalId) {
    const path = this.collection.children.find(p => p.GlobalId === GlobalId);

    if (path) {
      path.isPlaying = false;

      path.isPaused = false;

      path.playbackProgress = 0;

      if (!path.showPathDuringPlay && path.visible) {
        this.addVisualization(context, path);
      }
      context.editor.controls.enabled = true;

      context.editor.navigationController?.resumeInput();

      return true;
    }

    return false;
  }

  /**
   * Pause/resume the animation
   */
  static togglePausePath(context, GlobalId) {
    const path = this.collection.children.find(p => p.GlobalId === GlobalId);

    if (path && path.isPlaying) {
      path.isPaused = !path.isPaused;

      return path.isPaused;
    }

    return null;
  }
  /**
   * Get easing function by name
   */
  static _getEasingFunction(easingName) {
    const easings = {
      'linear': t => t,
      'ease-in-quad': t => t * t,
      'ease-out-quad': t => t * (2 - t),
      'ease-in-out-quad': t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
      'ease-in-cubic': t => t * t * t,
      'ease-out-cubic': t => 1 - Math.pow(1 - t, 3),
      'ease-in-out-cubic': t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
      'ease-in-expo': t => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
      'ease-out-expo': t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
    };

    return easings[easingName] || easings['ease-out-cubic'];
  }

  /**
   * Animate camera to a viewpoint with custom duration and easing
   */
  static _animateCameraToViewpoint(context, viewpoint, duration, easingFn, onComplete) {
    const camera = context.editor.camera;

    const controls = context.editor.controls;

    if (!camera || !controls) {
      onComplete?.();

      return;
    }

    const startPosition = camera.position.clone();

    const startTarget = controls.center.clone();

    const endPosition = viewpoint.cameraPosition.toVector3();

    const endTarget = viewpoint.cameraTarget.toVector3();

    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;

      const linearProgress = Math.min(elapsed / duration, 1);

      const easedProgress = easingFn(linearProgress);

      camera.position.lerpVectors(startPosition, endPosition, easedProgress);

      controls.center.lerpVectors(startTarget, endTarget, easedProgress);

      camera.lookAt(controls.center);

      controls.dispatchEvent({ type: 'change' });

      if (linearProgress < 1) {
        requestAnimationFrame(animate);
      } else {
        onComplete?.();
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Animate camera to specific position and target with custom duration and easing.
   * If in FLY/DRIVE mode with a controlled object, the object follows the camera automatically
   * via the attachment system in NavigationController.
   */
  static animateToPositionAndTarget(context, {position, target, duration = 2000, easing = 'ease-out-cubic', onComplete}) {
    const editor = context.editor || context;

    if (!editor?.camera || !editor?.controls) {
      console.warn('AnimationPathTool.animateToPositionAndTarget: editor.camera or editor.controls not available');

      onComplete?.();

      return;
    }

    const camera = editor.camera;

    const controls = editor.controls;

    const nav = editor.navigationController;
    const isControllingObject = nav?.isControllingObject();

    nav?.pauseInput(isControllingObject);

    const startCameraPos = camera.position.clone();

    const startTarget = controls.center.clone();

    const endPosition = position.clone ? position.clone() : new THREE.Vector3(position.x, position.y, position.z);

    const endTarget = target.clone ? target.clone() : new THREE.Vector3(target.x, target.y, target.z);

    const easingFn = this._getEasingFunction(easing);

    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;

      const progress = Math.min(elapsed / duration, 1);

      const easedProgress = easingFn(progress);

      camera.position.lerpVectors(startCameraPos, endPosition, easedProgress);

      controls.center.lerpVectors(startTarget, endTarget, easedProgress);

      camera.lookAt(controls.center);

      controls.dispatchEvent({ type: 'change' });

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        
        nav?.resumeInput();

        onComplete?.();
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Update animation settings for a path
   */
  static updateAnimationSettings(context, GlobalId, settings) {
    const path = this.collection.children.find(p => p.GlobalId === GlobalId);

    if (path) {
      
      if (settings.totalDuration !== undefined) path.totalDuration = settings.totalDuration;

      if (settings.showPathDuringPlay !== undefined) path.showPathDuringPlay = settings.showPathDuringPlay;

      if (settings.defaultStopBehavior !== undefined) path.defaultStopBehavior = settings.defaultStopBehavior;

      if (settings.defaultStopDuration !== undefined) path.defaultStopDuration = settings.defaultStopDuration;

      if (settings.defaultStopDurationMode !== undefined) path.defaultStopDurationMode = settings.defaultStopDurationMode;

      if (settings.cameraSpeedMode !== undefined) path.cameraSpeedMode = settings.cameraSpeedMode;

      if (settings.manualCameraSpeed !== undefined) path.manualCameraSpeed = settings.manualCameraSpeed;

      if (settings.easing !== undefined) path.easing = settings.easing;

      if (settings.loop !== undefined) path.loop = settings.loop;

      return true;
    }

    return false;
  }

  /**
   * Update settings for a specific viewpoint in a path
   */
  static updateViewpointSettings(context, pathGlobalId, viewpointGlobalId, settings) {
    const path = this.collection.children.find(p => p.GlobalId === pathGlobalId);

    if (path) {
      path.setViewpointSettings(viewpointGlobalId, settings);

      return true;
    }

    return false;
  }

  /**
   * Set path color
   */
  static setPathColor(context, GlobalId, color) {
    const path = this.collection.children.find(p => p.GlobalId === GlobalId);

    if (path) {
      path.pathColor = color;

      if (path.visible) {
        this.updateVisualization(context, path);
      }

      return true;
    }

    return false;
  }

  /**
   * Set marker color (camera position markers)
   */
  static setMarkerColor(context, GlobalId, color) {
    const path = this.collection.children.find(p => p.GlobalId === GlobalId);

    if (path) {
      path.markerColor = color;

      if (path.visible) {
        this.updateVisualization(context, path);
      }

      return true;
    }

    return false;
  }

  /**
   * Set target color (camera target markers)
   */
  static setTargetColor(context, GlobalId, color) {
    const path = this.collection.children.find(p => p.GlobalId === GlobalId);

    if (path) {
      path.targetColor = color;

      if (path.visible) {
        this.updateVisualization(context, path);
      }

      return true;
    }

    return false;
  }

  /**
   * Reorder viewpoints in a path
   */
  static reorderViewpoints(context, pathGlobalId, newOrder) {
    const path = this.collection.children.find(p => p.GlobalId === pathGlobalId);

    if (path) {
      path.reorderViewpoints(newOrder);

      if (path.visible) {
        this.updateVisualization(context, path);
      }

      return true;
    }

    return false;
  }

  /**
   * Move a viewpoint to a new position in the path
   */
  static moveViewpointInPath(context, pathGlobalId, viewpointGlobalId, newIndex) {
    const path = this.collection.children.find(p => p.GlobalId === pathGlobalId);

    if (path) {
      path.moveViewpoint(viewpointGlobalId, newIndex);

      if (path.visible) {
        this.updateVisualization(context, path);
      }

      return true;
    }

    return false;
  }

  static addVisualization(context, path) {
    const scene = context.editor.scene;

    const viewpoints = path.getViewpoints();

    if (viewpoints.length === 0) return;

    if (viewpoints.length >= 2) {
      const points = viewpoints.map(vp => vp.cameraPosition.toVector3());

      const curve = new THREE.CatmullRomCurve3(points);

      const tubeMesh = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 100, 0.1, 8, false),
        new THREE.MeshBasicMaterial({ color: path.pathColor })
      );

      scene.add(tubeMesh);

      path.sceneObjects.push(tubeMesh);
    }

    viewpoints.forEach((vp, index) => {
      const camPos = vp.cameraPosition.toVector3();

      const targetPos = vp.cameraTarget.toVector3();
      
      const camHelper = tools.world.viewpoint._createCameraHelper(path.markerColor, 1);

      camHelper.position.copy(camPos);

      camHelper.lookAt(targetPos);

      camHelper.userData.viewpointIndex = index;

      camHelper.userData.viewpointGlobalId = vp.GlobalId;

      scene.add(camHelper);

      path.sceneObjects.push(camHelper);
      
      const targetMarker = tools.world.viewpoint._createTargetMarker(path.targetColor, 0.5);

      targetMarker.position.copy(targetPos);

      scene.add(targetMarker);

      path.sceneObjects.push(targetMarker);
      
      const lineGeo = new THREE.BufferGeometry().setFromPoints([camPos, targetPos]);

      const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: path.targetColor, opacity: 0.5, transparent: true }));

      scene.add(line);

      path.sceneObjects.push(line);
    });
  }

  static removeVisualization(context, path) {
    const scene = context.editor.scene;

    path.sceneObjects.forEach(obj => {
      scene.remove(obj);

      obj.traverse?.(child => {
        child.geometry?.dispose();

        child.material?.dispose();
      });
    });

    path.sceneObjects = [];
  }

  static updateVisualization(context, path) {
    this.removeVisualization(context, path);

    this.addVisualization(context, path);
  }

  static getAllPaths() {
    return this.collection.children;
  }

  static getPath(GlobalId) {
    return this.collection.children.find(p => p.GlobalId === GlobalId);
  }

  static getCount() {
    return this.collection.children.length;
  }

  static createTemplate(context) {
    const existingTemplate = this.collection.children.find(p => p.name === 'Template Animation Path');

    if (existingTemplate) {
      return existingTemplate;
    }
    const viewpoints = [];

    const editor = context.editor || context;

    const vp1 = tools.world.viewpoint.create(editor, 'Overview');

    vp1.cameraPosition.set(10, 10, 10);

    vp1.cameraTarget.set(0, 0, 0);

    viewpoints.push(vp1);

    const vp2 = tools.world.viewpoint.create(editor, 'Side View');

    vp2.cameraPosition.set(15, 0, 5);

    vp2.cameraTarget.set(0, 0, 0);

    viewpoints.push(vp2);

    const vp3 = tools.world.viewpoint.create(editor, 'Close-up');

    vp3.cameraPosition.set(2, 2, 2);

    vp3.cameraTarget.set(0, 0, 0);

    viewpoints.push(vp3);

    const vp4 = tools.world.viewpoint.create(editor, 'Aerial View');

    vp4.cameraPosition.set(0, 20, 0);

    vp4.cameraTarget.set(0, 0, 0);

    viewpoints.push(vp4);
    const templatePath = new AnimationPathCollection({
      name: 'Template Animation Path',
      viewpointIds: viewpoints.map(vp => vp.GlobalId)
    });

    this.collection.children.push(templatePath);

    return templatePath;
  }
}

export default AnimationPathTool;