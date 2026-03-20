import * as THREE from 'three';

import { TransformControls } from 'three/addons/controls/TransformControls.js';

/**
 * SectionBoxTool - Stateless section box utility functions
 *
 * All methods are static. State is managed externally (in operators.js).
 * All dependencies (scene, camera, renderer, etc.) are passed as parameters.
 *
 * Features:
 * - Interactive section box with handles
 * - Clip planes for each face (real clipping of 3D objects)
 * - Resize via drag handles or transform gizmo
 * - Show/hide box visualization while keeping clipping active
 * - Transparent box with edge-only display
 * - Transform gizmo for move/rotate/scale
 * - Fit to selection / fit to all
 * - Export/Import section box settings
 */
class SectionBoxTool {
  /**
   * Create default section box bounds
   * @returns {THREE.Box3} Default box
   */
  static createDefaultBox() {
    return new THREE.Box3(
      new THREE.Vector3(-10, -10, -10),
      new THREE.Vector3(10, 10, 10)
    );
  }

  /**
   * Create the section box helper group
   * @param {THREE.Scene} sceneHelpers - Scene helpers group
   * @returns {THREE.Group} Section box group
   */
  static createSectionGroup(sceneHelpers) {
    const group = new THREE.Group();

    group.name = 'SectionBoxHelpers';

    sceneHelpers.add(group);

    return group;
  }

  /**
   * Create box pivot for transform gizmo
   * @param {THREE.Group} sectionGroup - Section group to add pivot to
   * @returns {THREE.Object3D} Box pivot object
   */
  static createBoxPivot(sectionGroup) {
    const pivot = new THREE.Object3D();

    pivot.name = 'SectionBoxPivot';

    sectionGroup.add(pivot);

    return pivot;
  }

  /**
   * Create box visual representation (edge-only style)
   * @param {THREE.Box3} box - Box bounds
   * @param {THREE.Group} sectionGroup - Section group
   * @param {Object} options - Visual options
   * @returns {Object} { boxEdges, boxMesh }
   */
  static createBoxVisual(box, sectionGroup, options = {}) {
    const {
      edgeColor = 0x00ccff,
      edgeOpacity = 1.0,
      showFaces = false
    } = options;

    const size = new THREE.Vector3();

    box.getSize(size);

    const center = new THREE.Vector3();

    box.getCenter(center);
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const edgesGeometry = new THREE.EdgesGeometry(geometry);

    const edgesMaterial = new THREE.LineBasicMaterial({
      color: edgeColor,
      linewidth: 2,
      transparent: true,
      opacity: edgeOpacity,
      depthTest: true,
      depthWrite: false,
    });

    const boxEdges = new THREE.LineSegments(edgesGeometry, edgesMaterial);

    boxEdges.position.copy(center);

    boxEdges.renderOrder = 999;

    sectionGroup.add(boxEdges);
    let boxMesh = null;

    if (showFaces) {
      const material = new THREE.MeshBasicMaterial({
        color: edgeColor,
        transparent: true,
        opacity: 0.03,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      boxMesh = new THREE.Mesh(geometry.clone(), material);

      boxMesh.position.copy(center);

      boxMesh.userData.isSectionBox = true;

      sectionGroup.add(boxMesh);
    }

    geometry.dispose();

    return { boxEdges, boxMesh };
  }

  /**
   * Create center axis gizmo
   * @param {THREE.Vector3} center - Box center
   * @param {THREE.Vector3} size - Box size
   * @param {THREE.Group} sectionGroup - Section group
   * @returns {THREE.Group} Center gizmo group
   */
  static createCenterGizmo(center, size, sectionGroup) {
    const gizmo = new THREE.Group();

    gizmo.name = 'SectionBoxCenterGizmo';
    const axisLength = Math.min(size.x, size.y, size.z) * 0.3;

    const arrowHeadLength = axisLength * 0.2;

    const arrowHeadWidth = axisLength * 0.1;
    const xArrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 0),
      axisLength,
      0xff4444,
      arrowHeadLength,
      arrowHeadWidth
    );

    xArrow.line.material.linewidth = 2;

    xArrow.cone.material.opacity = 0.9;

    xArrow.cone.material.transparent = true;

    gizmo.add(xArrow);
    const yArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 0),
      axisLength,
      0x44ff44,
      arrowHeadLength,
      arrowHeadWidth
    );

    yArrow.line.material.linewidth = 2;

    yArrow.cone.material.opacity = 0.9;

    yArrow.cone.material.transparent = true;

    gizmo.add(yArrow);
    const zArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, 0),
      axisLength,
      0x4444ff,
      arrowHeadLength,
      arrowHeadWidth
    );

    zArrow.line.material.linewidth = 2;

    zArrow.cone.material.opacity = 0.9;

    zArrow.cone.material.transparent = true;

    gizmo.add(zArrow);
    const sphereGeom = new THREE.SphereGeometry(axisLength * 0.12, 16, 16);

    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
    });

    const centerSphere = new THREE.Mesh(sphereGeom, sphereMat);

    gizmo.add(centerSphere);

    gizmo.position.copy(center);

    gizmo.renderOrder = 1000;

    sectionGroup.add(gizmo);

    return gizmo;
  }

  /**
   * Create resize handles for box faces
   * @param {THREE.Box3} box - Box bounds
   * @param {THREE.Group} sectionGroup - Section group
   * @param {boolean} isBoxVisible - Whether box is visible
   * @returns {THREE.Mesh[]} Array of handle meshes
   */
  static createHandles(box, sectionGroup, isBoxVisible = true) {
    const handles = [];

    const size = new THREE.Vector3();

    box.getSize(size);

    const center = new THREE.Vector3();

    box.getCenter(center);
    const avgSize = (size.x + size.y + size.z) / 3;

    const handleRadius = Math.max(0.1, Math.min(avgSize * 0.04, 0.3));
    const handleDefinitions = [
      { pos: new THREE.Vector3(1, 0, 0), axis: 'x', direction: 1, color: 0xff4444 },   
      { pos: new THREE.Vector3(-1, 0, 0), axis: 'x', direction: -1, color: 0xff4444 }, 
      { pos: new THREE.Vector3(0, 1, 0), axis: 'y', direction: 1, color: 0x44ff44 },   
      { pos: new THREE.Vector3(0, -1, 0), axis: 'y', direction: -1, color: 0x44ff44 }, 
      { pos: new THREE.Vector3(0, 0, 1), axis: 'z', direction: 1, color: 0x4444ff },   
      { pos: new THREE.Vector3(0, 0, -1), axis: 'z', direction: -1, color: 0x4444ff }, 
    ];

    handleDefinitions.forEach((def, index) => {
      const handle = SectionBoxTool.createHandle(def, size, center, index, handleRadius, isBoxVisible);

      handles.push(handle);

      sectionGroup.add(handle);
    });

    return handles;
  }

  /**
   * Create a single handle mesh
   * @param {Object} def - Handle definition
   * @param {THREE.Vector3} size - Box size
   * @param {THREE.Vector3} center - Box center
   * @param {number} index - Handle index
   * @param {number} handleRadius - Handle radius
   * @param {boolean} visible - Visibility
   * @returns {THREE.Mesh} Handle mesh
   */
  static createHandle(def, size, center, index, handleRadius, visible) {
    const geometry = new THREE.SphereGeometry(handleRadius, 16, 16);

    const material = new THREE.MeshBasicMaterial({
      color: def.color,
      transparent: true,
      opacity: 0.85,
      depthTest: false,
    });

    const handle = new THREE.Mesh(geometry, material);

    const position = new THREE.Vector3(
      center.x + (def.pos.x * size.x / 2),
      center.y + (def.pos.y * size.y / 2),
      center.z + (def.pos.z * size.z / 2)
    );

    handle.position.copy(position);

    handle.userData.isHandle = true;

    handle.userData.handleIndex = index;

    handle.userData.handleDef = def;

    handle.userData.originalColor = def.color;

    handle.renderOrder = 1001;

    handle.visible = visible;

    return handle;
  }

  /**
   * Update handle positions based on box bounds
   * @param {THREE.Mesh[]} handles - Handle meshes
   * @param {THREE.Box3} box - Box bounds
   */
  static updateHandlePositions(handles, box) {
    const size = new THREE.Vector3();

    box.getSize(size);

    const center = new THREE.Vector3();

    box.getCenter(center);

    handles.forEach(handle => {
      const def = handle.userData.handleDef;

      const position = new THREE.Vector3(
        center.x + (def.pos.x * size.x / 2),
        center.y + (def.pos.y * size.y / 2),
        center.z + (def.pos.z * size.z / 2)
      );

      handle.position.copy(position);
    });
  }
  /**
   * Create 6 clipping planes for the box
   * @param {THREE.Box3} box - Box bounds
   * @returns {THREE.Plane[]} Array of 6 clip planes
   */
  static createClipPlanes(box) {
    return [
      
      new THREE.Plane(new THREE.Vector3(-1, 0, 0), box.max.x),
      
      new THREE.Plane(new THREE.Vector3(1, 0, 0), -box.min.x),
      
      new THREE.Plane(new THREE.Vector3(0, -1, 0), box.max.y),
      
      new THREE.Plane(new THREE.Vector3(0, 1, 0), -box.min.y),
      
      new THREE.Plane(new THREE.Vector3(0, 0, -1), box.max.z),
      
      new THREE.Plane(new THREE.Vector3(0, 0, 1), -box.min.z),
    ];
  }

  /**
   * Update clipping plane constants based on box bounds
   * @param {THREE.Plane[]} clipPlanes - Clip planes array
   * @param {THREE.Box3} box - Box bounds
   */
  static updateClipPlanes(clipPlanes, box) {
    if (clipPlanes.length !== 6) return;

    clipPlanes[0].constant = box.max.x;

    clipPlanes[1].constant = -box.min.x;

    clipPlanes[2].constant = box.max.y;

    clipPlanes[3].constant = -box.min.y;

    clipPlanes[4].constant = box.max.z;

    clipPlanes[5].constant = -box.min.z;
  }

  /**
   * Apply clip planes to all materials in scene
   * @param {THREE.Scene} scene - Main scene
   * @param {THREE.Plane[]} clipPlanes - Clip planes
   */
  static applyClipPlanesToScene(scene, clipPlanes) {
    scene.traverse((object) => {
      if (object.isMesh && object.material && !object.userData.isSectionBox && !object.userData.isHandle) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];

        materials.forEach(material => {
          material.clippingPlanes = clipPlanes;

          material.clipShadows = true;

          material.needsUpdate = true;
        });
      }
    });
  }

  /**
   * Remove clip planes from all materials in scene
   * @param {THREE.Scene} scene - Main scene
   */
  static removeClipPlanesFromScene(scene) {
    scene.traverse((object) => {
      if (object.isMesh && object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];

        materials.forEach(material => {
          material.clippingPlanes = [];

          material.clipShadows = false;

          material.needsUpdate = true;
        });
      }
    });
  }

  /**
   * Enable or disable clipping on renderer and scene
   * @param {THREE.WebGLRenderer} renderer - Renderer
   * @param {THREE.Scene} scene - Scene
   * @param {THREE.Plane[]} clipPlanes - Clip planes
   * @param {boolean} enable - Enable/disable
   */
  static enableClipping(renderer, scene, clipPlanes, enable) {
    renderer.localClippingEnabled = enable;

    if (enable) {
      SectionBoxTool.applyClipPlanesToScene(scene, clipPlanes);
    } else {
      SectionBoxTool.removeClipPlanesFromScene(scene);
    }

    console.log(`Clipping ${enable ? 'enabled' : 'disabled'}`);
  }
  /**
   * Create transform controls for the section box
   * @param {THREE.Camera} camera - Camera
   * @param {HTMLElement} domElement - Renderer DOM element
   * @param {THREE.Object3D} boxPivot - Box pivot object
   * @param {THREE.Scene} sceneHelpers - Scene helpers
   * @param {string} mode - Gizmo mode ('translate', 'rotate', 'scale')
   * @returns {TransformControls} Transform controls
   */
  static createTransformGizmo(camera, domElement, boxPivot, sceneHelpers, mode = 'translate') {
    const gizmo = new TransformControls(camera, domElement);

    gizmo.attach(boxPivot);

    gizmo.setMode(mode);

    gizmo.setSize(0.8);

    gizmo.setSpace('world');

    sceneHelpers.add(gizmo.getHelper());

    return gizmo;
  }

  /**
   * Dispose transform gizmo
   * @param {TransformControls} gizmo - Transform controls
   * @param {THREE.Scene} sceneHelpers - Scene helpers
   */
  static disposeTransformGizmo(gizmo, sceneHelpers) {
    if (!gizmo) return;

    gizmo.detach();

    sceneHelpers.remove(gizmo.getHelper());

    gizmo.dispose();
  }
  /**
   * Resize box based on handle movement
   * @param {THREE.Box3} box - Box to modify (mutates in place)
   * @param {Object} handleDef - Handle definition { axis, direction }
   * @param {THREE.Vector3} newPosition - New handle position
   * @returns {THREE.Box3} Modified box
   */
  static resizeBoxFromHandle(box, handleDef, newPosition) {
    const { axis, direction } = handleDef;

    if (direction > 0) {
      
      const newValue = Math.max(newPosition[axis], box.min[axis] + 0.1);

      box.max[axis] = newValue;
    } else {
      
      const newValue = Math.min(newPosition[axis], box.max[axis] - 0.1);

      box.min[axis] = newValue;
    }

    return box;
  }

  /**
   * Set box from center and size
   * @param {THREE.Box3} box - Box to modify
   * @param {THREE.Vector3} center - Center position
   * @param {THREE.Vector3} size - Size vector
   * @returns {THREE.Box3} Modified box
   */
  static setBoxFromCenterAndSize(box, center, size) {
    const halfSize = size.clone().multiplyScalar(0.5);

    box.set(
      center.clone().sub(halfSize),
      center.clone().add(halfSize)
    );

    return box;
  }

  /**
   * Fit box to selected objects
   * @param {THREE.Object3D[]} selectedObjects - Array of selected objects
   * @param {number} padding - Padding around selection
   * @returns {THREE.Box3|null} Fitted box or null if no selection
   */
  static fitToSelection(selectedObjects, padding = 0.5) {
    if (!selectedObjects || selectedObjects.length === 0) {
      console.log('No objects selected');

      return null;
    }

    const selectionBox = new THREE.Box3();

    selectedObjects.forEach(object => {
      const objectBox = new THREE.Box3().setFromObject(object);

      selectionBox.union(objectBox);
    });

    selectionBox.min.subScalar(padding);

    selectionBox.max.addScalar(padding);

    return selectionBox;
  }

  /**
   * Fit box to all objects in scene
   * @param {THREE.Scene} scene - Scene to fit to
   * @param {number} padding - Padding around scene
   * @returns {THREE.Box3|null} Fitted box or null if scene is empty
   */
  static fitToAll(scene, padding = 1) {
    const sceneBox = new THREE.Box3();

    scene.traverse((object) => {
      if (object.isMesh && !object.userData.isSectionBox && !object.userData.isHandle) {
        const objectBox = new THREE.Box3().setFromObject(object);

        sceneBox.union(objectBox);
      }
    });

    if (sceneBox.isEmpty()) {
      console.log('No objects in scene');

      return null;
    }

    sceneBox.min.subScalar(padding);

    sceneBox.max.addScalar(padding);

    return sceneBox;
  }
  /**
   * Update visibility of section box elements
   * @param {Object} elements - { boxEdges, boxMesh, handles, centerGizmo, transformGizmo }
   * @param {boolean} visible - Visibility
   * @param {boolean} showFaces - Show faces option
   */
  static updateVisibility(elements, visible, showFaces = false) {
    const { boxEdges, boxMesh, handles, centerGizmo, transformGizmo } = elements;

    if (boxEdges) {
      boxEdges.visible = visible;
    }

    if (boxMesh) {
      boxMesh.visible = visible && showFaces;
    }

    if (handles) {
      handles.forEach(handle => {
        handle.visible = visible;
      });
    }

    if (centerGizmo) {
      centerGizmo.visible = visible;
    }

    if (transformGizmo) {
      transformGizmo.visible = visible;
    }
  }
  /**
   * Get mouse position in normalized device coordinates
   * @param {MouseEvent} event - Mouse event
   * @param {HTMLElement} domElement - DOM element
   * @returns {THREE.Vector2} Normalized mouse position
   */
  static getMousePosition(event, domElement) {
    const rect = domElement.getBoundingClientRect();

    return new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
  }

  /**
   * Raycast to find handle intersections
   * @param {THREE.Vector2} mouse - Mouse position
   * @param {THREE.Camera} camera - Camera
   * @param {THREE.Mesh[]} handles - Handle meshes
   * @returns {THREE.Intersection[]} Intersections
   */
  static raycastHandles(mouse, camera, handles) {
    const raycaster = new THREE.Raycaster();

    raycaster.setFromCamera(mouse, camera);

    return raycaster.intersectObjects(handles);
  }

  /**
   * Setup drag plane for handle dragging
   * @param {Object} handleDef - Handle definition
   * @param {THREE.Vector3} handlePosition - Handle position
   * @returns {THREE.Plane} Drag plane
   */
  static createDragPlane(handleDef, handlePosition) {
    const normal = new THREE.Vector3();

    if (handleDef.axis === 'x') {
      normal.set(1, 0, 0);
    } else if (handleDef.axis === 'y') {
      normal.set(0, 1, 0);
    } else {
      normal.set(0, 0, 1);
    }

    const plane = new THREE.Plane();

    plane.setFromNormalAndCoplanarPoint(normal, handlePosition);

    return plane;
  }

  /**
   * Calculate drag offset for smooth dragging
   * @param {THREE.Vector2} mouse - Mouse position
   * @param {THREE.Camera} camera - Camera
   * @param {THREE.Plane} dragPlane - Drag plane
   * @param {THREE.Vector3} handlePosition - Handle position
   * @returns {THREE.Vector3} Drag offset
   */
  static calculateDragOffset(mouse, camera, dragPlane, handlePosition) {
    const raycaster = new THREE.Raycaster();

    raycaster.setFromCamera(mouse, camera);

    const intersectPoint = new THREE.Vector3();

    raycaster.ray.intersectPlane(dragPlane, intersectPoint);

    return handlePosition.clone().sub(intersectPoint);
  }

  /**
   * Get new handle position during drag
   * @param {THREE.Vector2} mouse - Mouse position
   * @param {THREE.Camera} camera - Camera
   * @param {THREE.Plane} dragPlane - Drag plane
   * @param {THREE.Vector3} dragOffset - Drag offset
   * @returns {THREE.Vector3|null} New position or null
   */
  static getDragPosition(mouse, camera, dragPlane, dragOffset) {
    const raycaster = new THREE.Raycaster();

    raycaster.setFromCamera(mouse, camera);

    const intersectPoint = new THREE.Vector3();

    if (raycaster.ray.intersectPlane(dragPlane, intersectPoint)) {
      return intersectPoint.add(dragOffset);
    }

    return null;
  }
  /**
   * Export section box data as JSON string
   * @param {THREE.Box3} box - Box bounds
   * @param {boolean} isActive - Is active
   * @param {boolean} isBoxVisible - Is visible
   * @returns {string} JSON string
   */
  static exportSectionBox(box, isActive, isBoxVisible) {
    return JSON.stringify({
      min: box.min.toArray(),
      max: box.max.toArray(),
      isActive,
      isBoxVisible,
    });
  }

  /**
   * Import section box data from JSON
   * @param {string|Object} json - JSON string or object
   * @returns {Object|null} { min, max, isActive, isBoxVisible } or null on error
   */
  static importSectionBox(json) {
    try {
      const data = typeof json === 'string' ? JSON.parse(json) : json;

      return {
        min: new THREE.Vector3().fromArray(data.min),
        max: new THREE.Vector3().fromArray(data.max),
        isActive: data.isActive,
        isBoxVisible: data.isBoxVisible,
      };
    } catch (e) {
      console.error('Failed to import section box:', e);

      return null;
    }
  }

  /**
   * Download section box as JSON file
   * @param {THREE.Box3} box - Box bounds
   * @param {boolean} isActive - Is active
   * @param {boolean} isBoxVisible - Is visible
   * @param {string} filename - Filename
   */
  static downloadSectionBox(box, isActive, isBoxVisible, filename = 'section_box.json') {
    const json = SectionBoxTool.exportSectionBox(box, isActive, isBoxVisible);

    const blob = new Blob([json], { type: 'application/json' });

    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');

    a.href = url;

    a.download = filename;

    a.click();

    URL.revokeObjectURL(url);
  }
  /**
   * Get box data object
   * @param {THREE.Box3} box - Box bounds
   * @param {boolean} isActive - Is active
   * @param {boolean} isBoxVisible - Is visible
   * @param {boolean} isClippingEnabled - Is clipping enabled
   * @returns {Object} Box data object
   */
  static getBoxData(box, isActive, isBoxVisible, isClippingEnabled) {
    const center = new THREE.Vector3();

    box.getCenter(center);

    const size = new THREE.Vector3();

    box.getSize(size);

    return {
      min: box.min.clone(),
      max: box.max.clone(),
      center,
      size,
      isActive,
      isBoxVisible,
      isClippingEnabled,
    };
  }
  /**
   * Dispose of box edges
   * @param {THREE.LineSegments} boxEdges - Box edges
   * @param {THREE.Group} sectionGroup - Section group
   */
  static disposeBoxEdges(boxEdges, sectionGroup) {
    if (!boxEdges) return;

    sectionGroup.remove(boxEdges);

    boxEdges.geometry.dispose();

    boxEdges.material.dispose();
  }

  /**
   * Dispose of box mesh
   * @param {THREE.Mesh} boxMesh - Box mesh
   * @param {THREE.Group} sectionGroup - Section group
   */
  static disposeBoxMesh(boxMesh, sectionGroup) {
    if (!boxMesh) return;

    sectionGroup.remove(boxMesh);

    boxMesh.geometry.dispose();

    boxMesh.material.dispose();
  }

  /**
   * Dispose of center gizmo
   * @param {THREE.Group} centerGizmo - Center gizmo
   * @param {THREE.Group} sectionGroup - Section group
   */
  static disposeCenterGizmo(centerGizmo, sectionGroup) {
    if (!centerGizmo) return;

    sectionGroup.remove(centerGizmo);

    centerGizmo.traverse(child => {
      if (child.geometry) child.geometry.dispose();

      if (child.material) child.material.dispose();
    });
  }

  /**
   * Dispose of handles
   * @param {THREE.Mesh[]} handles - Handle meshes
   * @param {THREE.Group} sectionGroup - Section group
   */
  static disposeHandles(handles, sectionGroup) {
    if (!handles) return;

    handles.forEach(handle => {
      sectionGroup.remove(handle);

      handle.geometry.dispose();

      handle.material.dispose();
    });
  }

  /**
   * Clear all visual elements
   * @param {Object} state - State with boxEdges, boxMesh, centerGizmo, handles
   * @param {THREE.Group} sectionGroup - Section group
   */
  static clearVisuals(state, sectionGroup) {
    SectionBoxTool.disposeBoxEdges(state.boxEdges, sectionGroup);

    SectionBoxTool.disposeBoxMesh(state.boxMesh, sectionGroup);

    SectionBoxTool.disposeCenterGizmo(state.centerGizmo, sectionGroup);

    SectionBoxTool.disposeHandles(state.handles, sectionGroup);
  }

  /**
   * Full dispose - remove everything
   * @param {Object} state - Full state object
   * @param {THREE.Group} sectionGroup - Section group
   * @param {THREE.Scene} sceneHelpers - Scene helpers
   */
  static dispose(state, sectionGroup, sceneHelpers) {
    SectionBoxTool.clearVisuals(state, sectionGroup);

    if (state.transformGizmo) {
      SectionBoxTool.disposeTransformGizmo(state.transformGizmo, sceneHelpers);
    }

    sceneHelpers.remove(sectionGroup);
  }
}

export default SectionBoxTool;
