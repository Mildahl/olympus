import dataStore from "../../data/index.js";

import * as THREE from "three";

import {
  PositionAttribute,
  ViewpointAttribute,
  ViewpointCollection,
  ViewpointsCollection
} from "../../data/DataCollections/Viewpoint.js";

import tools from '../index.js'

class ViewpointTool {
  static collection = new ViewpointsCollection();

  static sceneObjects = [];

  static getCollection() {
    return ViewpointTool.collection;
  }

  static getAll() {
    return ViewpointTool.collection.getAll();
  }

  static get(GlobalId) {
    return ViewpointTool.collection.get(GlobalId);
  }

  static getByName(name) {
    return ViewpointTool.collection.getByName(name);
  }

  static getActive() {
    return ViewpointTool.collection.activeViewpoint;
  }

  static getCount() {
    return ViewpointTool.collection.children.length;
  }

  static create(editor, name = 'New Viewpoint') {
    const viewpoint = new ViewpointCollection({ name });

    viewpoint.captureFromEditor(editor);

    ViewpointTool.collection.add(viewpoint);

    return viewpoint;
  }

  static add(data) {
    return ViewpointTool.collection.add(data);
  }

  static remove(GlobalId) {
    return ViewpointTool.collection.remove(GlobalId);
  }

  static rename(GlobalId, newName) {
    return ViewpointTool.collection.rename(GlobalId, newName);
  }

  static updatePosition(editor, GlobalId, x, y, z) {
    const viewpoint = ViewpointTool.collection.get(GlobalId);

    if (!viewpoint) return false;
    
    viewpoint.setCameraPosition(x, y, z);

    if (viewpoint.active) {
      editor.camera.position.set(x, y, z);

      editor.controls?.update();
    }

    return true;
  }

  static updateTarget(editor, GlobalId, x, y, z) {
    const viewpoint = ViewpointTool.collection.get(GlobalId);

    if (!viewpoint) return false;
    
    viewpoint.setCameraTarget(x, y, z);

    if (viewpoint.active) {
      editor.controls.center.set(x, y, z);
    }

    return true;
  }

  static updateFromEditor(editor, GlobalId) {
    const viewpoint = ViewpointTool.collection.get(GlobalId);

    if (!viewpoint) return false;
    
    viewpoint.captureFromEditor(editor);

    return true;
  }

  static activate(editor, GlobalId, animate = true) {
    const viewpoint = ViewpointTool.collection.get(GlobalId);

    if (!viewpoint) return null;
    
    ViewpointTool.collection.activate(viewpoint, editor, animate);

    ViewpointTool.goToViewPoint(editor, viewpoint, animate);

    return viewpoint;
  }

  static goToViewPoint(editor, viewpoint, animate = true) {
    
    ViewpointTool.changeViewpoint(
      editor,
      viewpoint.cameraPosition.toVector3(),
      viewpoint.cameraTarget.toVector3(),
      animate
    );
  }

  static capturePosition(editor) {
    return {
      position: editor.camera.position.clone(),
      target: editor.controls.center.clone()
    };
  }

  static changeViewpoint(context, position, target, animate = true, onComplete = null) {
    const editor = context.editor || context;

    if (animate) {

        tools.world.animationPath.animateToPositionAndTarget({ editor }, {
          position,
          target,
          duration: 1000,
          easing: 'ease-out-cubic',
          onComplete
        });

    } else {
      editor.navigationController.pauseInput();

      editor.setView({ position, target });

      editor.navigationController.resumeInput();

      onComplete?.();
    }
  }

  static navigateBack(editor) {

  const viewpoint = ViewpointTool.collection.navigateBack(editor);

  ViewpointTool.goToViewPoint(editor, viewpoint);
  }

  static navigateForward(editor) {
    const viewpoint = ViewpointTool.collection.navigateForward(editor);

    ViewpointTool.goToViewPoint(editor, viewpoint);
  }

  static canNavigateBack() {
    return ViewpointTool.collection.canNavigateBack();
  }

  static canNavigateForward() {
    return ViewpointTool.collection.canNavigateForward();
  }

  static getNavigationHistory() {
    return ViewpointTool.collection.getHistory();
  }

  static clearHistory() {
    ViewpointTool.collection.clearHistory();
  }
  static _createCameraHelper(color = 0x00ff00, scale = 1) {
    const group = new THREE.Group();

    const s = scale;

    const bodyVerts = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-s, -s * 0.6, s * 1.5),
      new THREE.Vector3(s, -s * 0.6, s * 1.5),
      new THREE.Vector3(s, s * 0.6, s * 1.5),
      new THREE.Vector3(-s, s * 0.6, s * 1.5),
    ];

    const bodyGeo = new THREE.BufferGeometry();

    const indices = [0,1,2, 0,2,3, 0,3,4, 0,4,1, 1,3,2, 1,4,3];

    const positions = [];

    indices.forEach(i => positions.push(bodyVerts[i].x, bodyVerts[i].y, bodyVerts[i].z));

    bodyGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    bodyGeo.computeVertexNormals();

    const mat = new THREE.MeshBasicMaterial({ color, wireframe: true });

    group.add(new THREE.Mesh(bodyGeo, mat));

    const upVerts = [
      new THREE.Vector3(0, s * 1.0, s * 1.5),
      new THREE.Vector3(-s * 0.4, s * 0.6, s * 1.5),
      new THREE.Vector3(s * 0.4, s * 0.6, s * 1.5),
    ];

    const upGeo = new THREE.BufferGeometry();

    const upPos = [];

    [0,1,2].forEach(i => upPos.push(upVerts[i].x, upVerts[i].y, upVerts[i].z));

    upGeo.setAttribute('position', new THREE.Float32BufferAttribute(upPos, 3));

    group.add(new THREE.Mesh(upGeo, mat));

    return group;
  }

  static _createTargetMarker(color = 0x0000ff, scale = 0.5) {
    return new THREE.Mesh(
      new THREE.OctahedronGeometry(scale),
      new THREE.MeshBasicMaterial({ color, wireframe: true })
    );
  }

  static addVisualization(scene, viewpoint, options = {}) {
    const color = options.color || 0x00ff00;

    const targetColor = options.targetColor || 0x0000ff;

    const camPos = viewpoint.cameraPosition.toVector3();

    const targetPos = viewpoint.cameraTarget.toVector3();

    const camHelper = this._createCameraHelper(color, options.scale || 1);

    camHelper.position.copy(camPos);

    camHelper.lookAt(targetPos);

    camHelper.userData.viewpointGlobalId = viewpoint.GlobalId;

    scene.add(camHelper);

    console.log('Added viewpoint visualization:', camHelper);

    this.sceneObjects.push(camHelper);

    const targetMarker = this._createTargetMarker(targetColor, 0.5);

    targetMarker.position.copy(targetPos);

    targetMarker.userData.viewpointGlobalId = viewpoint.GlobalId;

    scene.add(targetMarker);

    this.sceneObjects.push(targetMarker);

    const lineGeo = new THREE.BufferGeometry().setFromPoints([camPos, targetPos]);

    const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: targetColor, opacity: 0.5, transparent: true }));

    line.userData.viewpointGlobalId = viewpoint.GlobalId;

    scene.add(line);

    this.sceneObjects.push(line);
  }

  static removeVisualization(scene, viewpointGlobalId = null) {
    const toRemove = viewpointGlobalId
      ? this.sceneObjects.filter(obj => obj.userData.viewpointGlobalId === viewpointGlobalId)
      : this.sceneObjects;

    toRemove.forEach(obj => {
      scene.remove(obj);

      obj.traverse?.(child => {
        child.geometry?.dispose();

        child.material?.dispose();
      });
    });

    this.sceneObjects = viewpointGlobalId
      ? this.sceneObjects.filter(obj => obj.userData.viewpointGlobalId !== viewpointGlobalId)
      : [];
  }

  static showAll(scene, options = {}) {
    this.removeVisualization(scene);

    ViewpointTool.collection.children.forEach(vp => {
      vp.visible = true;

      this.addVisualization(scene, vp, options);
    });
  }

  static hideAll(scene) {
    ViewpointTool.collection.children.forEach(vp => vp.visible = false);

    this.removeVisualization(scene);
  }

  static setVisibility(scene, GlobalId, visible, options = {}) {
    const viewpoint = ViewpointTool.collection.get(GlobalId);

    if (!viewpoint) return false;
    
    viewpoint.visible = visible;

    if (visible) {
      this.addVisualization(scene, viewpoint, options);
    } else {
      this.removeVisualization(scene, GlobalId);
    }

    return true;
  }

  static toggleVisibility(scene, GlobalId, options = {}) {
    const viewpoint = ViewpointTool.get(GlobalId);

    if (!viewpoint) {
      console.warn('Viewpoint not found for toggling visibility:', GlobalId);

      return false;
    }
    
    viewpoint.visible = !viewpoint.visible;

    if (viewpoint.visible) {
      ViewpointTool.addVisualization(scene, viewpoint, options);
    } else {
      ViewpointTool.removeVisualization(scene, GlobalId);
    }

    return true;
  }
}

export default ViewpointTool;
