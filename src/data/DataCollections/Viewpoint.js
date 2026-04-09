import { Attribute } from './Attribute.js';

import { Collection } from './Collection.js';

import * as THREE from "three";
class PositionAttribute extends Attribute {
  constructor({ name = 'Position', x = 0, y = 0, z = 0, id = THREE.MathUtils.generateUUID() } = {}) {
    super({ name, type: 'PositionAttribute', dataType: 'vector3' });

    this.id = id;

    this.x = x;

    this.y = y;

    this.z = z;
  }

  set(x, y, z) {
    this.x = x;

    this.y = y;

    this.z = z;

    return this;
  }

  fromVector3(vector) {
    this.x = vector.x;

    this.y = -vector.z;

    this.z = vector.y;

    return this;
  }

  toVector3() {
    return new THREE.Vector3(this.x, this.z, -this.y);
  }

  clone() {
    return new PositionAttribute({ name: this.name, x: this.x, y: this.y, z: this.z });
  }

  toJSON() {
    return { id: this.id, name: this.name, type: this.type, x: this.x, y: this.y, z: this.z };
  }
}

class ViewpointAttribute extends Attribute {
  constructor({
    id = THREE.MathUtils.generateUUID(),
    name = 'Viewpoint',
    description = '',
    createdAt = Date.now(),
    modifiedAt = Date.now(),
    thumbnail = null
  } = {}) {
    super({ name, type: 'ViewpointAttribute', dataType: 'object' });

    this.id = id;

    this.description = description;

    this.createdAt = createdAt;

    this.modifiedAt = modifiedAt;

    this.thumbnail = thumbnail;
  }

  updateModifiedTime() {
    this.modifiedAt = Date.now();

    return this;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      description: this.description,
      createdAt: this.createdAt,
      modifiedAt: this.modifiedAt,
      thumbnail: this.thumbnail
    };
  }
}

class ViewpointCollection extends Collection {
  constructor({
    id = THREE.MathUtils.generateUUID(),
    name = 'New Viewpoint',
    cameraPosition = { x: 0, y: 0, z: 10 },
    cameraTarget = { x: 0, y: 0, z: 0 },
    description = ''
  } = {}) {
    super({ name, type: 'ViewpointCollection', GlobalId: id });

    this.id = id;

    this.active = false;

    this.visible = false;

    this.cameraPosition = new PositionAttribute({
      name: 'Camera Position',
      x: cameraPosition.x,
      y: cameraPosition.y,
      z: cameraPosition.z
    });

    this.cameraTarget = new PositionAttribute({
      name: 'Camera Target',
      x: cameraTarget.x,
      y: cameraTarget.y,
      z: cameraTarget.z
    });

    this.metadata = new ViewpointAttribute({ id: this.id, name, description });

    this.attributes = [this.cameraPosition, this.cameraTarget, this.metadata];
  }

  setName(name) {
    this.name = name;

    this.metadata.name = name;

    this.metadata.updateModifiedTime();

    return this;
  }

  setCameraPosition(x, y, z) {
    this.cameraPosition.set(x, y, z);

    this.metadata.updateModifiedTime();

    return this;
  }

  setCameraTarget(x, y, z) {
    this.cameraTarget.set(x, y, z);

    this.metadata.updateModifiedTime();

    return this;
  }

  captureFromEditor(editor) {
    this.cameraPosition.fromVector3(editor.camera.position);

    this.cameraTarget.fromVector3(editor.controls.center);

    this.metadata.updateModifiedTime();

    return this;
  }
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      cameraPosition: this.cameraPosition.toJSON(),
      cameraTarget: this.cameraTarget.toJSON(),
      metadata: this.metadata.toJSON()
    };
  }

  static fromJSON(data) {
    return new ViewpointCollection({
      id: data.id,
      name: data.name,
      cameraPosition: data.cameraPosition,
      cameraTarget: data.cameraTarget,
      description: data.metadata?.description || ''
    });
  }
}

class ViewpointsCollection extends Collection {
  constructor({ name = 'Viewpoints', id = THREE.MathUtils.generateUUID() } = {}) {
    super({ name, type: 'ViewpointsCollection', GlobalId: id });

    this.id = id;

    this.activeViewpoint = null;

    this.navigationHistory = [];

    this.historyIndex = -1;

    this.maxHistorySize = 50;

    this.template();
  }

  template() {
    const presets = [
      { name: 'Front View', cameraPosition: { x: 0, y: -20, z: 5 }, cameraTarget: { x: 0, y: 0, z: 0 } },
      { name: 'Top View', cameraPosition: { x: 0, y: 0, z: 30 }, cameraTarget: { x: 0, y: 0, z: 0 } },
      { name: 'Right View', cameraPosition: { x: 20, y: 0, z: 5 }, cameraTarget: { x: 0, y: 0, z: 0 } },
      { name: 'Perspective', cameraPosition: { x: 15, y: -15, z: 10 }, cameraTarget: { x: 0, y: 0, z: 0 } },
      { name: 'Crane Cabins', cameraPosition: { x: -19.11, y: 19.7, z: 21 }, cameraTarget: { x: 17, y: 18, z: 5 } }
    ];

    presets.forEach(preset => this.add(preset));
  }

  add(viewpoint) {
    if (!(viewpoint instanceof ViewpointCollection)) {
      viewpoint = new ViewpointCollection(viewpoint);
    }

    this.children.push(viewpoint);

    return viewpoint;
  }

  remove(GlobalId) {
    const index = this.children.findIndex(vp => vp.GlobalId === GlobalId);

    if (index === -1) return false;
    
    this.children.splice(index, 1);

    this.navigationHistory = this.navigationHistory.filter(hId => hId !== GlobalId);
    
    if (this.activeViewpoint?.GlobalId === GlobalId) {
      this.activeViewpoint = null;
    }

    return true;
  }

  get(GlobalId) {
    return this.children.find(vp => vp.GlobalId === GlobalId) || null;
  }

  getByName(name) {
    return this.children.find(vp => vp.name === name) || null;
  }

  rename(GlobalId, newName) {
    const viewpoint = this.get(GlobalId);

    if (!viewpoint) return false;

    viewpoint.setName(newName);

    return true;
  }

  activate(viewpoint, editor, animate = true) {
    if (this.activeViewpoint) {
      this.activeViewpoint.active = false;
    }

    viewpoint.active = true;

    this.activeViewpoint = viewpoint;

    this._addToHistory(viewpoint.GlobalId);

    return viewpoint;
  }

  _addToHistory(GlobalId) {
    if (this.historyIndex < this.navigationHistory.length - 1) {
      this.navigationHistory = this.navigationHistory.slice(0, this.historyIndex + 1);
    }

    if (this.navigationHistory[this.navigationHistory.length - 1] !== GlobalId) {
      this.navigationHistory.push(GlobalId);

      if (this.navigationHistory.length > this.maxHistorySize) {
        this.navigationHistory.shift();
      }
    }

    this.historyIndex = this.navigationHistory.length - 1;
  }

  navigateBack(editor) {
    if (this.historyIndex <= 0) return null;
    
    this.historyIndex--;

    const viewpoint = this.get(this.navigationHistory[this.historyIndex]);

    if (!viewpoint) return null;

    if (this.activeViewpoint) this.activeViewpoint.active = false;

    viewpoint.active = true;

    this.activeViewpoint = viewpoint;

    return viewpoint;
  }

  navigateForward(editor) {
    if (this.historyIndex >= this.navigationHistory.length - 1) return null;
    
    this.historyIndex++;

    const viewpoint = this.get(this.navigationHistory[this.historyIndex]);

    if (!viewpoint) return null;

    if (this.activeViewpoint) this.activeViewpoint.active = false;

    viewpoint.active = true;

    this.activeViewpoint = viewpoint;

    return viewpoint;
  }

  canNavigateBack() {
    return this.historyIndex > 0;
  }

  canNavigateForward() {
    return this.historyIndex < this.navigationHistory.length - 1;
  }

  getHistory() {
    return this.navigationHistory.map((GlobalId, index) => ({
      GlobalId,
      viewpoint: this.get(GlobalId),
      isCurrent: index === this.historyIndex
    }));
  }

  clearHistory() {
    this.navigationHistory = [];

    this.historyIndex = -1;

    if (this.activeViewpoint) {
      this.navigationHistory.push(this.activeViewpoint.GlobalId);

      this.historyIndex = 0;
    }
  }

  getAll() {
    return this.children;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      viewpoints: this.children.map(vp => vp.toJSON()),
      activeViewpointGlobalId: this.activeViewpoint?.GlobalId || null,
      navigationHistory: this.navigationHistory,
      historyIndex: this.historyIndex
    };
  }

  static fromJSON(data) {
    const collection = new ViewpointsCollection({ name: data.name, id: data.id });

    data.viewpoints.forEach(vpData => collection.add(ViewpointCollection.fromJSON(vpData)));

    collection.navigationHistory = data.navigationHistory || [];

    collection.historyIndex = data.historyIndex ?? -1;

    if (data.activeViewpointGlobalId) {
      collection.activeViewpoint = collection.get(data.activeViewpointGlobalId);

      if (collection.activeViewpoint) collection.activeViewpoint.active = true;
    }

    return collection;
  }
}

export {
  PositionAttribute,
  ViewpointAttribute,
  ViewpointCollection,
  ViewpointsCollection
};
