import dataStore from "../../data/index.js";

import * as THREE from "three";

import tools from "../index.js";

import context from '../../context/index.js';

import InteractiveObject, { makeInteractive } from "../model/animate/InteractiveObject.js";

import { IfcRoot, IfcModel } from "../../data/index.js";

import PythonSandbox from "../pyodide/Python.js";

import NavigationTool from "./NavigationTool.js";

class SceneTool {

    static LAYERS = {
      World: {
        Name: "World",
        Layers: {
          NaturalEnvironment: new THREE.Group(),
          Infrastructure: new THREE.Group(),
          Buildings: new THREE.Group(),
          Logistics: new THREE.Group(),
        }
      }
    };

  static _baseLayers(context) {
    const scene = context.editor.scene;

    const layers = SceneTool.LAYERS;

    for (const layerKey in layers.World.Layers) {
      const layerGroup = layers.World.Layers[layerKey];

      layerGroup.name = layerKey;

      scene.add(layerGroup);
    } 

  }

  /**
   * Extract the entity GlobalId from a Three.js object
   * Handles mesh objects with IFC/BodyRepresentation/ prefix, instance proxy objects,
   * IFC groups, and parent traversal
   * @param {Object} object - Three.js object (mesh or group) or instance proxy
   * @returns {string|null} The entity GlobalId or null if not found
   */
  static getEntityGlobalId(object) {
    if (!object) return null;

    if (object.isInstanceProxy && object.GlobalId) {
      return object.GlobalId;
    }

    if (
      object.GlobalId &&
      !object.GlobalId.startsWith("IFC/BodyRepresentation/") &&
      !object.GlobalId.startsWith("IFC/InstancedMesh/")
    ) {
      return object.GlobalId;
    }

    let id = object.GlobalId || object.uuid;

    if (id && id.startsWith("IFC/BodyRepresentation/")) {
      return id.replace("IFC/BodyRepresentation/", "");
    }

    if (id && id.startsWith("IFC/InstancedMesh/")) {
      return id.replace("IFC/InstancedMesh/", "");
    }

    if (
      (object.isMesh || object.isInstancedProxy) &&
      object.parent &&
      object.parent.isIfc
    ) {
      return object.parent.GlobalId || object.parent.uuid;
    }

    return id || null;
  }

  static createLayerGroup(context, layerName) { 

    const newLayer = new THREE.Group();

    newLayer.name = layerName;
  
    return newLayer;
  }

  /**
   * Get a layer group by path (supports nested layers)
   * @param {Object} context - Application context
   * @param {string} layerPath - Path to layer (e.g., "Buildings" or "Buildings/IFC Architecture")
   * @returns {THREE.Group|null} The layer group or null if not found
   */
  static getLayerByPath(context, layerPath) {
    if (!layerPath) return null;

    const fullPath = "World/"+ layerPath

    const dataCollection =  tools.world.layer.getLayerByPath(fullPath)
    
    const SceneObj = dataCollection.scene

    return SceneObj

  }

  /**
   * Get the default buildings layer
   * @param {Object} context - Application context
   * @returns {THREE.Group} The buildings layer group
   */
  static getBuildingsLayer(context) {
    return SceneTool.getLayerByPath(context, "Buildings");
  }

  /**
   * Add a Three.js group to a specific layer by path
   * Falls back to Buildings layer if path not found
   * @param {Object} context - Application context
   * @param {THREE.Group} group - The group to add
   * @param {string} [layerPath] - Optional path to target layer
   * @returns {THREE.Group} The parent layer group the object was added to
   */
  static addToLayer(context, group, layerPath = null) {
    let targetLayer = null;
    
    if (layerPath) {
      targetLayer = SceneTool.getLayerByPath(context, layerPath);
    }

    if (!targetLayer) {
      targetLayer = SceneTool.getBuildingsLayer(context);
    }
    
    if (!targetLayer) {
      console.warn('[SceneTool.addToLayer] No valid layer found, adding to scene root');

      context.editor.scene.add(group);

      return context.editor.scene;
    }
    
    targetLayer.add(group);
    
    return targetLayer;
  }

  static findVehicle(context) {
    if (!context || !context.editor || !context.editor.scene) {
      return null;
    }
    return NavigationTool.findDefaultVehicleInScene(context.editor.scene);
  }

  static onSelection(callback) {
    context.editor.signals.objectSelected.add(function (object) {
      callback(object);
    });
  }

  static add(context, obj, parent = undefined) {
    
    if (obj && obj.__ifcProxy__) {
      
      return PythonSandbox._createGeometryForIfcEntity(obj).then(threeJsObject => {
        if (threeJsObject) {
          context.editor.addObject(threeJsObject, parent);

          return { success: true };
        } else {
          throw new Error(`Failed to create geometry for IFC entity ${obj.GlobalId}`);
        }
      });
    }

    context.editor.addObject(obj, parent);

    return { success: true };
  }

  static batchAdd(context, objects) {
    
    objects.forEach((obj) => {
      context.editor.addObject(obj);
    });
  }

  static fakeIfc(context, object) {
    return {
      GlobalId: object.guid,
      Name: "Fake Element",
      PredefinedType: "SOLIDAWALL",
      is_a() {
        return "IfcWall";
      },
      Properties: {
        Height: 3000,
        Width: 500,
        Material: "Concrete",
      },
    };
  }

  static getSelectedObjects(context) {
    return context.editor.selector.selected_objects;
  }

  /**
   * Get the currently selected element as an IFC entity
   * When called from Python via the viewer API, this automatically resolves
   * the GlobalId to an actual IfcOpenShell entity
   * @returns {Object} Object with __ifcEntityRef__ marker for automatic resolution
   */
  static get_selected_element() {
    const ifcProxy = tools.ifc.getSelectedEntity(context);

    if (!ifcProxy || !ifcProxy.GlobalId) {
      return null;
    }

    const activeModel = context.ifc?.activeModel || null;

    return {
      __ifcEntityRef__: true,
      globalId: ifcProxy.GlobalId,
      modelName: activeModel,
      
      _debug: {
        name: ifcProxy.Name,
        type: ifcProxy.type
      }
    };
  }

  /**
   * Get all currently selected elements as IFC entities
   * When called from Python via the viewer API, this automatically resolves
   * GlobalIds to actual IfcOpenShell entities
   * @param {Object} context - Application context
   * @returns {Object} Object with __ifcEntityRefsArray__ marker for automatic resolution
   */
  static get_selected_elements(context) {
    const entities = tools.ifc.getSelectedEntities(context);

    if (!entities || entities.length === 0) {
      return [];
    }

    const activeModel = context.ifc?.activeModel || null;

    return {
      __ifcEntityRefsArray__: true,
      globalIds: entities.map(e => e.GlobalId),
      modelName: activeModel,
      
      _debug: entities.map(e => ({
        globalId: e.GlobalId,
        name: e.Name,
        type: e.type
      }))
    };
  }

  static selectObjectsByGuid(context, guids) {

    const objects = [];

    for (const guid of guids) {
      const object = context.editor.scene.getObjectByProperty('GlobalId', guid);

      if (object) {
        objects.push(object);
      }
    }

    context.editor.selector.selectObjects(objects);
  }

  static focus(context) {

    const selected = context.editor.selected;

    selected? context.editor.focus(selected) : null;
  }

  static select(context, objects) {
    context.editor.selector.selectObjects(objects);
  }

  static deselect(context) {
    context.editor.deselect();
  }

  static hide(context, object) {
    context.editor.hideObject(object);
  }

  static show(context, object) {
    context.editor.showObject(object);
  }

  static setFog(context, {fogType, hex, near, far, density}) {

    context.editor.signals.sceneFogChanged.dispatch(fogType, hex, near, far, density);

    SceneTool._saveFogConfig(context, fogType, hex, near, far, density);
  }

  static _saveFogConfig(context, fogType, fogColor, fogNear, fogFar, fogDensity) {

    if (fogType === 'None') {

      context.editor.signals.settingUpdated.dispatch('app.Scene.enableFog', false);

      context.editor.signals.settingUpdated.dispatch('app.Scene.fog', null);

    } else {

      context.editor.signals.settingUpdated.dispatch('app.Scene.enableFog', true);

      context.editor.signals.settingUpdated.dispatch('app.Scene.fog', {
        fogType,
        fogColor,
        fogNear,
        fogFar,
        fogDensity
      });
    }
  }

  static addCube(context, size = 1, color = 0x00ff00) {
    const geometry = new THREE.BoxGeometry(size, size, size);

    const material = new THREE.MeshBasicMaterial({ color: color });

    const cube = new THREE.Mesh(geometry, material);

    context.editor.scene.add(cube);

    context.editor.signals.sceneGraphChanged.dispatch();

    return cube;
  }

  static addArrow(context, options = {}) {
    let opts = options;

    if (typeof options === 'object' && options !== null && typeof options.get === 'function') {
      opts = {};

      for (const key of options.keys()) {
        opts[key] = options.get(key);
      }
    }

    const angle = opts.angle !== undefined ? opts.angle : null;

    const vector = opts.vector !== undefined ? opts.vector : null;

    const size = opts.size !== undefined ? opts.size : 10;

    const text = opts.text !== undefined ? opts.text : '';

    let color = opts.color !== undefined ? opts.color : '#e53935';

    let origin = opts.origin !== undefined ? opts.origin : [0, 0, 0];

    const tipOffset = opts.tipOffset !== undefined ? opts.tipOffset : 0.8;

    if (typeof color === 'string' && color[0] !== '#') {
      color = '#' + color;
    }

    let dir;

    if (angle !== null) {
      dir = new THREE.Vector3(Math.cos(angle * Math.PI / 180), 0 , - Math.sin(angle * Math.PI / 180));
    } else if (vector) {
      dir = new THREE.Vector3(...vector).normalize();
    } else {
      dir = new THREE.Vector3(1, 0, 0);
    }

    const start = new THREE.Vector3(origin[0], -origin[2], origin[1]);

    const end = start.clone().add(dir.clone().multiplyScalar(size));

    const shaftGeom = new THREE.BufferGeometry().setFromPoints([start, end]);

    const shaftMat = new THREE.LineBasicMaterial({ color, linewidth: 6 });

    const shaft = new THREE.Line(shaftGeom, shaftMat);

    const headLength = size * 0.18;

    const headWidth = size * 0.12;

    const arrowDir = dir.clone();

    const left = arrowDir.clone().applyAxisAngle(new THREE.Vector3(0,0,1), Math.PI * 0.82).multiplyScalar(headWidth);

    const right = arrowDir.clone().applyAxisAngle(new THREE.Vector3(0,0,1), -Math.PI * 0.82).multiplyScalar(headWidth);

    const tip = end.clone();

    const leftPt = tip.clone().add(left).add(arrowDir.clone().multiplyScalar(-headLength));

    const rightPt = tip.clone().add(right).add(arrowDir.clone().multiplyScalar(-headLength));

    const headGeom = new THREE.BufferGeometry().setFromPoints([leftPt, tip, rightPt]);

    const headMat = new THREE.LineBasicMaterial({ color, linewidth: 6 });

    const head = new THREE.Line(headGeom, headMat);

    const arrowGroup = new THREE.Group();

    arrowGroup.add(shaft);

    arrowGroup.add(head);

    if (text) {
      const textSprite = SceneTool.createTextLabel(context, text, end.toArray(), color, size * 0.1);

      arrowGroup.add(textSprite);
    }

    context.editor.scene.add(arrowGroup);

    return arrowGroup;
  }

  static addPlane(context, options = {}) {
    let opts = options;

    if (typeof options === 'object' && options !== null && typeof options.get === 'function') {
      opts = {};

      for (const key of options.keys()) {
        opts[key] = options.get(key);
      }
    }

    const position = opts.position !== undefined ? opts.position : [0, 0, 0];

    const size = opts.size !== undefined ? opts.size : 10;

    let color = opts.color !== undefined ? opts.color : '#2196f3';

    const opacity = opts.opacity !== undefined ? opts.opacity : 0.5;

    if (typeof color === 'string' && color[0] !== '#') {
      color = '#' + color;
    }

    const geom = new THREE.PlaneGeometry(size, size);

    const mat = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity });

    const mesh = new THREE.Mesh(geom, mat);

    mesh.position.set(position[0], -position[2], position[1]);
    
    mesh.rotateX(-Math.PI / 2);

    context.editor.scene.add(mesh);

    return mesh;
  }

  static addMesh(context, verts, edges, faces) {
    const mesh = new THREE.Mesh();

    const geom = new THREE.BufferGeometry();

    geom.setFromPoints(verts);

    let idxSource = faces && faces.length ? faces : edges;

    if (idxSource && idxSource.length) {
      geom.setIndex(idxSource.flat());
    }

    geom.computeVertexNormals();

    mesh.geometry = geom;

    context.editor.scene.add(mesh);

    return mesh;
  }

  static addPrimitive(context, primitive = 'Cube', position = [0, 0, 0]) {
    let geometry;

    switch (primitive.toLowerCase()) {
      case 'cube':
        geometry = new THREE.BoxGeometry(1, 1, 1);

        break;

      case 'sphere':
        geometry = new THREE.SphereGeometry(0.5, 32, 32);

        break;

      case 'cylinder':
        geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);

        break;

      case 'cone':
        geometry = new THREE.ConeGeometry(0.5, 1, 32);

        break;

      default:
        geometry = new THREE.BoxGeometry(1, 1, 1);
    }

    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });

    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.set(...position);

    context.editor.scene.add(mesh);

    return mesh;
  }

  static addLineMesh(context, verts, edges, faces) {
    if (faces && faces.length) {
      const geom = new THREE.BufferGeometry();

      geom.setFromPoints(verts);

      geom.setIndex(faces.flat());

      geom.computeVertexNormals();

      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });

      const mesh = new THREE.Mesh(geom, mat);

      context.editor.scene.add(mesh);

      return mesh;
    }

    if (edges && edges.length) {
      const points = [];

      for (const edge of edges) {
        if (edge.length >= 2) {
          points.push(verts[edge[0]], verts[edge[1]]);
        }
      }

      const geom = new THREE.BufferGeometry().setFromPoints(points);

      const mat = new THREE.LineBasicMaterial({ color: 0xffffff });

      const lines = new THREE.LineSegments(geom, mat);

      context.editor.scene.add(lines);

      return lines;
    }
  }

  static addBIMAxes(context, total_x = 5, x_spacing = 5, total_y = 5, y_spacing = 7, size = 50) {
    const labelRadius = size * 0.18;

    const labelFontSize = 48;

    const lineWidth = 6;

    const axesGroup = new THREE.Group();

    for (let i = 0; i < total_x; i++) {
      const x = i * x_spacing;

      const start = new THREE.Vector3(x, 0, 0);

      const end = new THREE.Vector3(x, total_y * y_spacing, 0);

      const geom = new THREE.BufferGeometry().setFromPoints([start, end]);

      const mat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: lineWidth });

      const line = new THREE.Line(geom, mat);

      axesGroup.add(line);

      if (i > 0) {
        const label = SceneTool.createTextLabel(context, i.toString(), [x, -labelRadius, 0], '#000000', labelFontSize);

        axesGroup.add(label);
      }
    }

    for (let j = 0; j < total_y; j++) {
      const y = j * y_spacing;

      const start = new THREE.Vector3(0, y, 0);

      const end = new THREE.Vector3(total_x * x_spacing, y, 0);

      const geom = new THREE.BufferGeometry().setFromPoints([start, end]);

      const mat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: lineWidth });

      const line = new THREE.Line(geom, mat);

      axesGroup.add(line);

      if (j > 0) {
        const label = SceneTool.createTextLabel(context, String.fromCharCode(65 + j - 1), [-labelRadius, y, 0], '#000000', labelFontSize);

        axesGroup.add(label);
      }
    }

    context.editor.scene.add(axesGroup);

    return axesGroup;
  }

  static addAxis(context, start, end, name, ifc_axis, labelRadius = 5, labelFontSize = 2.25) {
    const startVec = new THREE.Vector3(...start);

    const endVec = new THREE.Vector3(...end);

    const geom = new THREE.BufferGeometry().setFromPoints([startVec, endVec]);

    const mat = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 6 });

    const line = new THREE.Line(geom, mat);

    const axisGroup = new THREE.Group();

    axisGroup.add(line);

    if (name) {
      const midPoint = startVec.clone().add(endVec).multiplyScalar(0.5);

      const label = SceneTool.createTextLabel(context, name, midPoint.toArray(), '#ff0000', labelFontSize);

      axisGroup.add(label);
    }

    context.editor.scene.add(axisGroup);

    return axisGroup;
  }

  static createTextLabel(context, text, position, color, size = 2) {
    const canvas = document.createElement('canvas');

    canvas.width = 256;

    canvas.height = 128;

    const ctx = canvas.getContext('2d');

    let fontSize = 60;

    ctx.font = `${fontSize}px Arial`;

    let metrics = ctx.measureText(text);

    const maxWidth = canvas.width * 0.9;

    while (metrics.width > maxWidth && fontSize > 16) {
      fontSize -= 2;

      ctx.font = `${fontSize}px Arial`;

      metrics = ctx.measureText(text);
    }

    ctx.fillStyle = color || '#000000';

    ctx.font = `${fontSize}px Arial`;

    ctx.textAlign = 'center';

    ctx.textBaseline = 'middle';

    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);

    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });

    const sprite = new THREE.Sprite(spriteMaterial);

    sprite.position.set(...position);

    sprite.scale.set(size, size * (canvas.height / canvas.width), 1);

    context.editor.scene.add(sprite);

    return sprite;
  }

  static addIfcElement(context, element, replace = false) {
    if (replace) {
      context.editor.removeObject(element);
    }

    context.editor.addObject(element);

    return element;
  }

  static updateHost(context, hostGuid) {
    console.log('Update host:', hostGuid);
  }

  /**
   * Creates an interactive info panel sprite attached to a 3D object.
   * The panel can toggle between collapsed (icon-only) and expanded states on click.
   * 
   * @param {Object} context - Application context with editor
   * @param {Object} options - Configuration options
   * @param {THREE.Object3D} options.target - The 3D object to attach the panel to
   * @param {Object} options.offset - Position offset from target {x, y, z}
   * @param {string} options.icon - URL or emoji for the collapsed icon
   * @param {string} options.title - Title for the expanded panel
   * @param {Array} options.data - Array of {label, value} objects for expanded view
   * @param {Function} options.onExpand - Callback when panel expands
   * @param {Function} options.onCollapse - Callback when panel collapses
   * @param {Object} options.colors - Color customization {background, text, accent, highlight}
   * @param {number} options.size - Base size for the sprite (default: 3)
   * @returns {Object} Info panel object with sprite, update methods, and state
   */
  static createInfoPanel(context, options = {}) {
    const {
      target = null,
      offset = { x: 0, y: 5, z: 0 },
      icon = '☀️',
      iconUrl = null,
      title = 'Info',
      data = [],
      onExpand = null,
      onCollapse = null,
      colors = {},
      size = 3,
      startExpanded = false,
    } = options;

    const defaultColors = {
      background: 'rgba(26, 58, 74, 0.9)',
      text: '#ffffff',
      accent: '#ffcc00',
      highlight: 'rgba(255, 204, 0, 0.3)',
      border: 'rgba(255, 204, 0, 0.6)',
    };

    const finalColors = { ...defaultColors, ...colors };

    const state = {
      isExpanded: startExpanded,
      data: data,
      title: title,
      icon: icon,
      iconUrl: iconUrl,
    };

    const panelGroup = new THREE.Group();

    panelGroup.name = 'InfoPanel';

    panelGroup.userData.isInfoPanel = true;

    panelGroup.userData.state = state;

    const collapsedSize = { width: 128, height: 128 };

    const expandedSize = { width: 400, height: 300 };

    const createCollapsedSprite = () => {
      const canvas = document.createElement('canvas');

      canvas.width = collapsedSize.width;

      canvas.height = collapsedSize.height;

      const ctx = canvas.getContext('2d');

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;

      const centerY = canvas.height / 2;

      const radius = 50;

      ctx.beginPath();

      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);

      ctx.strokeStyle = finalColors.border;

      ctx.lineWidth = 2;

      ctx.stroke();

      if (state.iconUrl) {
        
        const img = new Image();

        img.crossOrigin = 'anonymous';

        img.onload = () => {
          ctx.drawImage(img, centerX - 24, centerY - 24, 48, 48);

          texture.needsUpdate = true;
        };

        img.src = state.iconUrl;
      } else {
        
        ctx.font = '48px Arial';

        ctx.textAlign = 'center';

        ctx.textBaseline = 'middle';

        ctx.fillStyle = finalColors.text;

        ctx.fillText(state.icon, centerX, centerY);
      }

      ctx.font = '10px Arial';

      ctx.fillStyle = finalColors.accent;

      ctx.fillText('▼', centerX, centerY + radius - 8);

      const texture = new THREE.CanvasTexture(canvas);

      texture.needsUpdate = true;

      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.01,
        depthTest: false,
        sizeAttenuation: true,
      });

      const sprite = new THREE.Sprite(material);

      sprite.scale.set(size, size, 1);

      return { sprite, canvas, ctx, texture };
    };

    const createExpandedSprite = () => {
      const canvas = document.createElement('canvas');

      canvas.width = expandedSize.width;

      canvas.height = expandedSize.height;

      const ctx = canvas.getContext('2d');

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cornerRadius = 12;

      ctx.beginPath();

      ctx.roundRect(10, 10, canvas.width - 20, canvas.height - 20, cornerRadius);

      ctx.strokeStyle = finalColors.border;

      ctx.lineWidth = 2;

      ctx.stroke();

      const headerY = 40;
      
      if (state.iconUrl) {
        const img = new Image();

        img.crossOrigin = 'anonymous';

        img.onload = () => {
          ctx.drawImage(img, 25, headerY - 16, 32, 32);

          texture.needsUpdate = true;
        };

        img.src = state.iconUrl;
      } else {
        ctx.font = '24px Arial';

        ctx.fillStyle = finalColors.text;

        ctx.textAlign = 'left';

        ctx.textBaseline = 'middle';

        ctx.fillText(state.icon, 25, headerY);
      }

      ctx.font = 'bold 18px Arial';

      ctx.fillStyle = finalColors.text;

      ctx.textAlign = 'left';

      ctx.fillText(state.title, 65, headerY);

      ctx.font = '14px Arial';

      ctx.fillStyle = finalColors.accent;

      ctx.textAlign = 'right';

      ctx.fillText('▲ tap to close', canvas.width - 25, headerY);

      ctx.beginPath();

      ctx.moveTo(25, headerY + 20);

      ctx.lineTo(canvas.width - 25, headerY + 20);

      ctx.strokeStyle = finalColors.border;

      ctx.lineWidth = 1;

      ctx.stroke();

      const startY = headerY + 45;

      const itemHeight = 40;

      const colWidth = (canvas.width - 50) / 2;

      state.data.forEach((item, index) => {
        const col = index % 2;

        const row = Math.floor(index / 2);

        const x = 25 + col * colWidth;

        const y = startY + row * itemHeight;

        if (index > 1) {
          ctx.beginPath();

          ctx.moveTo(25, y - 4);

          ctx.lineTo(canvas.width - 25, y - 4);

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';

          ctx.lineWidth = 1;

          ctx.stroke();
        }

        ctx.font = '10px Arial';

        ctx.fillStyle = finalColors.accent;

        ctx.textAlign = 'left';

        ctx.textBaseline = 'top';

        ctx.fillText(item.label.toUpperCase(), x + 8, y + 6);

        ctx.font = 'bold 14px Arial';

        ctx.fillStyle = finalColors.text;

        ctx.fillText(item.value, x + 8, y + 20);
      });

      const texture = new THREE.CanvasTexture(canvas);

      texture.needsUpdate = true;

      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.01,
        depthTest: false,
        sizeAttenuation: true,
      });

      const sprite = new THREE.Sprite(material);

      const aspectRatio = canvas.width / canvas.height;

      sprite.scale.set(size * aspectRatio * 1.5, size * 1.5, 1);

      return { sprite, canvas, ctx, texture };
    };

    let collapsed = createCollapsedSprite();

    let expanded = createExpandedSprite();

    collapsed.sprite.visible = !state.isExpanded;

    expanded.sprite.visible = state.isExpanded;

    panelGroup.add(collapsed.sprite);

    panelGroup.add(expanded.sprite);

    if (target) {
      
      const targetPos = new THREE.Vector3();

      target.getWorldPosition(targetPos);
      
      panelGroup.position.set(
        targetPos.x + offset.x,
        targetPos.y + offset.y,
        targetPos.z + offset.z
      );

      panelGroup.userData.target = target;

      panelGroup.userData.offset = offset;
    } else {
      panelGroup.position.set(offset.x, offset.y, offset.z);
    }

    const toggle = () => {
      state.isExpanded = !state.isExpanded;

      collapsed.sprite.visible = !state.isExpanded;

      expanded.sprite.visible = state.isExpanded;

      context.editor.signals.sceneGraphChanged.dispatch();

      if (state.isExpanded && onExpand) {
        onExpand(panelGroup);
      } else if (!state.isExpanded && onCollapse) {
        onCollapse(panelGroup);
      }
    };

    const updateData = (newData) => {
      state.data = newData;

      panelGroup.remove(expanded.sprite);

      expanded.sprite.material.dispose();

      expanded.sprite.material.map.dispose();

      expanded = createExpandedSprite();

      expanded.sprite.visible = state.isExpanded;

      panelGroup.add(expanded.sprite);
    };

    const updateIcon = (newIcon, newIconUrl = null) => {
      state.icon = newIcon;

      state.iconUrl = newIconUrl;

      panelGroup.remove(collapsed.sprite);

      collapsed.sprite.material.dispose();

      collapsed.sprite.material.map.dispose();

      collapsed = createCollapsedSprite();

      collapsed.sprite.visible = !state.isExpanded;

      panelGroup.add(collapsed.sprite);
    };

    const updateTitle = (newTitle) => {
      state.title = newTitle;

      panelGroup.remove(expanded.sprite);

      expanded.sprite.material.dispose();

      expanded.sprite.material.map.dispose();

      expanded = createExpandedSprite();

      expanded.sprite.visible = state.isExpanded;

      panelGroup.add(expanded.sprite);
    };

    const updatePosition = () => {
      if (panelGroup.userData.target) {
        const targetPos = new THREE.Vector3();

        panelGroup.userData.target.getWorldPosition(targetPos);

        const off = panelGroup.userData.offset;

        panelGroup.position.set(
          targetPos.x + off.x,
          targetPos.y + off.y,
          targetPos.z + off.z
        );
      }
    };

    context.editor.scene.add(panelGroup);

    panelGroup.userData.onClick = toggle;

    panelGroup.userData.isClickable = true;

    return {
      group: panelGroup,
      toggle,
      updateData,
      updateIcon,
      updateTitle,
      updatePosition,
      expand: () => {
        if (!state.isExpanded) toggle();
      },
      collapse: () => {
        if (state.isExpanded) toggle();
      },
      getState: () => ({ ...state }),
      dispose: () => {
        panelGroup.remove(collapsed.sprite);

        panelGroup.remove(expanded.sprite);

        collapsed.sprite.material.dispose();

        collapsed.sprite.material.map.dispose();

        expanded.sprite.material.dispose();

        expanded.sprite.material.map.dispose();

        context.editor.scene.remove(panelGroup);
      },
    };
  }

  /**
   * Creates a weather info panel specifically designed for attachment to construction equipment
   * like tower cranes. Shows weather icon when collapsed, full weather details when expanded.
   * 
   * @param {Object} context - Application context
   * @param {Object} options - Configuration
   * @param {THREE.Object3D} options.target - Target object to attach to (e.g., crane)
   * @param {Object} options.weatherData - Weather data object with current, location properties
   * @param {Object} options.offset - Position offset from target
   * @returns {Object} Weather panel control object
   */
  static createWeatherPanel(context, options = {}) {
    const {
      target = null,
      weatherData = null,
      offset = { x: 0, y: 25, z: 0 },
      size = 3,
    } = options;

    if (!weatherData || !weatherData.current) {
      console.warn('SceneTool.createWeatherPanel: No weather data provided');

      return null;
    }

    const current = weatherData.current;

    const location = weatherData.location;

    const data = [
      { label: 'Temperature', value: `${current.temp_c}°C` },
      { label: 'Feels Like', value: `${current.feelslike_c}°C` },
      { label: 'Wind', value: `${current.wind_kph} km/h` },
      { label: 'Wind Gust', value: `${current.gust_kph} km/h` },
      { label: 'Humidity', value: `${current.humidity}%` },
      { label: 'Condition', value: current.condition.text },
      { label: 'Visibility', value: `${current.vis_km} km` },
      { label: 'UV Index', value: `${current.uv}` },
    ];

    const panel = SceneTool.createInfoPanel(context, {
      target,
      offset,
      icon: '🌤️',
      iconUrl: current.condition.icon ? `https:${current.condition.icon}` : null,
      title: location ? `${location.name}` : 'Weather',
      data,
      size,
      startExpanded: false, 
      colors: {
        background: 'rgba(26, 58, 74, 0.95)',
        text: '#ffffff',
        accent: '#4fc3f7',
        highlight: 'rgba(79, 195, 247, 0.3)',
        border: 'rgba(79, 195, 247, 0.6)',
      },
      onExpand: (panel) => {
        console.log('Weather panel expanded');
      },
      onCollapse: (panel) => {
        console.log('Weather panel collapsed');
      },
    });

    if (panel) {
      panel.updateWeather = (newWeatherData) => {
        if (!newWeatherData || !newWeatherData.current) return;
        
        const curr = newWeatherData.current;

        const loc = newWeatherData.location;

        const newData = [
          { label: 'Temperature', value: `${curr.temp_c}°C` },
          { label: 'Feels Like', value: `${curr.feelslike_c}°C` },
          { label: 'Wind', value: `${curr.wind_kph} km/h` },
          { label: 'Wind Gust', value: `${curr.gust_kph} km/h` },
          { label: 'Humidity', value: `${curr.humidity}%` },
          { label: 'Condition', value: curr.condition.text },
          { label: 'Visibility', value: `${curr.vis_km} km` },
          { label: 'UV Index', value: `${curr.uv}` },
        ];

        if (loc && loc.name) {
          panel.updateTitle(loc.name);
        }

        panel.updateData(newData);

        panel.updateIcon('🌤️', curr.condition.icon ? `https:${curr.condition.icon}` : null);
      };

      panel.group.userData.isWeatherPanel = true;
    }

    return panel;
  }

  /**
   * Find and return the tower crane object in the scene
   * @param {Object} context - Application context
   * @returns {THREE.Object3D|null} Tower crane object or null
   */
  static findTowerCrane(context) {
    let crane = null;
    
    context.editor.scene.traverse((obj) => {
      if (obj.name === 'TowerCrane' || obj.userData.isTowerCrane) {
        crane = obj;
      }
    });

    return crane;
  }

  /**
   * Attach a weather panel to the tower crane in the scene
   * @param {Object} context - Application context  
   * @param {Object} weatherData - Weather data
   * @param {Object} craneRef - Optional direct reference to crane (e.g., demo.towerCrane)
   * @returns {Object|null} Weather panel or null if no crane found
   */
  static attachWeatherToCrane(context, weatherData, craneRef = null) {
    let craneObject = null;

    if (craneRef && craneRef.object) {
      craneObject = craneRef.object;
    } else {
      
      craneObject = SceneTool.findTowerCrane(context);
    }

    if (!craneObject) {
      console.warn('SceneTool.attachWeatherToCrane: No tower crane found in scene');

      return null;
    }

    const craneConfig = craneRef?.config || { towerHeight: 30, scale: 0.5 };

    const towerHeight = (craneConfig.towerHeight || 30) * (craneConfig.scale || 1);
    
    const offset = {
      x: 2,
      y: towerHeight + 5,  
      z: 0,
    };

    return SceneTool.createWeatherPanel(context, {
      target: craneObject,
      weatherData,
      offset,
      size: 4,
    });
  }
}

export default SceneTool;
