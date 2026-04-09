import * as THREE from 'three';

import SnapTool from '../viewer/SnapTool.js';

import { SnapState } from '../../modules/world.snap/operators.js';

import context from '../../context/index.js';

const raycaster = new THREE.Raycaster();

const DRAWING_MODES = {
  IDLE: null,
  TWO_POINT_EXTRUSION: 'two_point_extrusion',
  PLACEMENT: 'placement',
  POLYLINE: 'polyline',
};
const STATES = {
  IDLE: 'idle',
  PICKING_START: 'picking_start',
  PICKING_END: 'picking_end',
  PICKING_POLYLINE: 'picking_polyline',
  PREVIEW: 'preview'
};

class DrawingTool {

  static DRAWING_MODES = {
    IDLE: null,
    TWO_POINT_EXTRUSION: 'two_point_extrusion',
    PLACEMENT: 'placement',
    POLYLINE: 'polyline',
  };

  static AVAILABLETOOLS = {
    IDLE: null,
    IfcWallType: {
      operator: "bim.vertical_layer",
      drawMode: DRAWING_MODES.TWO_POINT_EXTRUSION,
      constructionType: "layer",
      requiresWallHost: false,
    },
    IfcCoveringType: {
      operator: "bim.vertical_layer",
      drawMode: DRAWING_MODES.TWO_POINT_EXTRUSION,
      constructionType: "layer",
      requiresWallHost: false,
    },
    IfcSlabType: {
      operator: "bim.horizontal_layer",
      drawMode: DRAWING_MODES.POLYLINE,
      constructionType: "layer_horizontal",
      requiresWallHost: false,
    },
    IfcBeamType: {
      operator: "bim.profiled_construction",
      drawMode: DRAWING_MODES.TWO_POINT_EXTRUSION,
      constructionType: "profiled",
      requiresWallHost: false,
    },
    IfcColumnType: {
      operator: "bim.profiled_construction",
      drawMode: DRAWING_MODES.PLACEMENT,
      constructionType: "profiled",
      requiresWallHost: false,
    },
    IfcPileType: {
      operator: "bim.profiled_construction",
      drawMode: DRAWING_MODES.PLACEMENT,
      constructionType: "profiled_foundation",  
      requiresWallHost: false,
    },
    IfcWindowType: {
      operator: "bim.new_occurence",
      drawMode: DRAWING_MODES.PLACEMENT,
      constructionType: "bounding_box",
      requiresWallHost: true,
    },
    IfcDoorType: {
      operator: "bim.new_occurence",
      drawMode: DRAWING_MODES.PLACEMENT,
      constructionType: "bounding_box",
      requiresWallHost: true,
    },
    IfcFurnitureType: {
      operator: "bim.new_occurence",
      drawMode: DRAWING_MODES.PLACEMENT,
      constructionType: "bounding_box",
      requiresWallHost: false,
    },
    IfcSystemFurnitureType: {
      operator: "bim.new_occurence",
      drawMode: DRAWING_MODES.PLACEMENT,
      constructionType: "bounding_box",
      requiresWallHost: false,
    },
  };

  static ready = false;

  static mode = DrawingTool.DRAWING_MODES.IDLE;

  static activeTool = null; 

  static state = STATES.IDLE;

  static startPoint = null;

  static currentPoint = null;

  static polylinePoints = []; 

  static previewObject = null;

  static snapIndicator = null;

  static snapRing = null;

  static constraintAxis = null; 

  static previewMaterial = null;

  static previewText = null;

  static _onMouseMove = null;

  static _onMouseClick = null;

  static _onKeyDown = null;

  static onPlacementFinished = null;

  static onModeChanged = null;

  static onStateChanged = null;

  static onOptionsChanged = null;

  static _lastSnapObject = null; 

  static _lastSnapFace = null; 

  /**
   * Locked parameters - when a parameter is locked, its value is used instead of mouse-driven value
   * Keys: parameter names (e.g., 'height', 'width', 'depth', 'x', 'y', 'z')
   * Values: locked value (number) or null if unlocked
   */
  static lockedParams = {};

  static options = {
    snapEnabled: true,
    snapThreshold: 0.5
  };

  /**
   * Initialize the tool (call once per context)
   */
  static init() {

    if(DrawingTool.ready)  return;

    const { indicator, ring } = SnapTool.createSnapIndicator({
      snapIndicatorColor: 0x00ff88
    });

    DrawingTool.snapIndicator = indicator;

    DrawingTool.snapRing = ring;
  
    context.editor.sceneHelpers.add(DrawingTool.snapIndicator);

    context.editor.sceneHelpers.add(DrawingTool.snapRing);
  
    DrawingTool.previewMaterial = new THREE.MeshBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });

    DrawingTool._onMouseMove = DrawingTool._handleMouseMove.bind(null);

    DrawingTool._onMouseClick = DrawingTool._handleMouseClick.bind(null);

    DrawingTool._onKeyDown = DrawingTool._handleKeyDown.bind(null);

    DrawingTool.ready = true;
  }

  /**
   * Handle mouse move

   * @param {Event} event - Mouse event
   */
  static _handleMouseMove(event) {

    if (DrawingTool.mode === DrawingTool.DRAWING_MODES.IDLE) return;

    const snapResult = DrawingTool._getSnapPoint(event);

    if (!snapResult) {

      SnapTool.updateSnapIndicator(
        DrawingTool.snapIndicator,
        DrawingTool.snapRing,
        null,
        null
      );

      DrawingTool._clearPreview();

      return;
    }

    let point = snapResult.point;
    if (Object.keys(DrawingTool.lockedParams).length > 0) {
      point = DrawingTool._applyLockedParams(point);
    }

    DrawingTool.currentPoint = point;
    DrawingTool._lastSnapObject = snapResult.object || null;
    DrawingTool._lastSnapFace = snapResult.face || null;

    SnapTool.updateSnapIndicator(
      DrawingTool.snapIndicator,
      DrawingTool.snapRing,
      point,
      context.editor.camera
    );

    let constrainedPoint = point;
    switch (DrawingTool.mode) {
      case DrawingTool.DRAWING_MODES.TWO_POINT_EXTRUSION:

        if (DrawingTool.state === STATES.PICKING_END && DrawingTool.startPoint) {

          DrawingTool._updateExtrustionPreview(DrawingTool.startPoint, constrainedPoint);
          
        }

        break;

      case DrawingTool.DRAWING_MODES.PLACEMENT: {
        const needsWall = DrawingTool.requiresWallHost();
        
        if (needsWall) {
          
          if (snapResult.object?.isIfc && DrawingTool._isWall(snapResult.object)) {
            DrawingTool._updatePlacementPreview(snapResult);
          } else {
            DrawingTool._clearPreview();
          }
        } else {
          
          DrawingTool._updatePlacementPreview(snapResult);
        }

        break;
      }

      case DrawingTool.DRAWING_MODES.POLYLINE: {
        
        DrawingTool._updatePolylinePreview(constrainedPoint);
        break;
      }

      default:
        break;
    }

    DrawingTool._requestRender();
  }

  /**
   * Handle mouse click

   * @param {Event} event - Mouse event
   */
  static _handleMouseClick(event) {

    if (DrawingTool.mode === DrawingTool.DRAWING_MODES.IDLE) return;

    const snapResult = DrawingTool._getSnapPoint(event);

    if (!snapResult) return;

    const point = snapResult.point;

    switch (DrawingTool.mode) {
      case DrawingTool.DRAWING_MODES.TWO_POINT_EXTRUSION:
        DrawingTool._handleTwoPointExtrusion(point);

        break;

      case DrawingTool.DRAWING_MODES.PLACEMENT:
        DrawingTool._handlePlacementClick(snapResult);

        break;

      case DrawingTool.DRAWING_MODES.POLYLINE:
        DrawingTool._handlePolylineClick(point);

        break;
    }
  }

  /**
   * Handle key down

   * @param {Event} event - Key event
   */
  static _handleKeyDown(event) {
    switch (event.key) {
      case 'Escape':
        if (DrawingTool.mode === DrawingTool.DRAWING_MODES.POLYLINE && DrawingTool.polylinePoints.length > 0) {
          
          DrawingTool.polylinePoints = [];
          DrawingTool._clearPreview();
        } else {
          DrawingTool.cancel();
        }

        break;

      case 'x':

      case 'X':
        
        DrawingTool.constraintAxis = DrawingTool.constraintAxis === 'x' ? null : 'x';

        break;

      case 'y':

      case 'Y':

        DrawingTool.constraintAxis = DrawingTool.constraintAxis === 'y' ? null : 'y';

        break;

      case 'Enter':
        
        if (DrawingTool.mode === DrawingTool.DRAWING_MODES.POLYLINE && DrawingTool.polylinePoints.length >= 3) {
          DrawingTool._finishPolyline();
          break;
        }

        if (DrawingTool.mode === DrawingTool.DRAWING_MODES.TWO_POINT_EXTRUSION && DrawingTool.state === STATES.PICKING_END) {
          
          DrawingTool.startPoint = null; 

          DrawingTool.state = STATES.PICKING_START;

          DrawingTool._clearPreview();
        }

        break;
    }
  }

  /**
   * Set the drawing mode

   * @param {string} mode - 'two_point_extrusion', 'placement', or null
   * @param {string} ifcClass - The IFC class being drawn (e.g., 'IfcWallType', 'IfcColumnType')
   */
  static setMode(mode, ifcClass = null) {
    const previousMode = DrawingTool.mode;
    const previousTool = DrawingTool.activeTool;
    if (mode === previousMode && ifcClass === previousTool) {
      DrawingTool.cancel();
      return;
    }
    if (previousMode) {
      DrawingTool._detachEventListeners();
    }

    DrawingTool.mode = mode;
    DrawingTool.activeTool = ifcClass;

    if (mode) {
      
      DrawingTool.startPoint = null;
      DrawingTool.currentPoint = null;
      DrawingTool.polylinePoints = [];
      if (mode === DrawingTool.DRAWING_MODES.TWO_POINT_EXTRUSION) {
        DrawingTool.state = STATES.PICKING_START;
      } else if (mode === DrawingTool.DRAWING_MODES.POLYLINE) {
        DrawingTool.state = STATES.PICKING_POLYLINE;
      } else {
        DrawingTool.state = STATES.IDLE;
      }

      DrawingTool._attachEventListeners();

      context.editor.selector.disabled = true;
    } else {
      DrawingTool.state = STATES.IDLE;
      DrawingTool.activeTool = null;
      DrawingTool.startPoint = null;
      DrawingTool.currentPoint = null;
      DrawingTool.polylinePoints = [];

      context.editor.selector.disabled = false;
    }

    DrawingTool._clearPreview();
    if (DrawingTool.onStateChanged) {
      DrawingTool.onStateChanged(DrawingTool.state);
    }

    if (DrawingTool.onModeChanged) {
      DrawingTool.onModeChanged(mode, previousMode);
    }
  }

  /**
   * Cancel current drawing operation

   */
  static cancel() {
    const previousMode = DrawingTool.mode;
    const previousTool = DrawingTool.activeTool;

    DrawingTool.mode = DrawingTool.DRAWING_MODES.IDLE;

    DrawingTool.state = STATES.IDLE;

    DrawingTool.activeTool = null;

    DrawingTool.startPoint = null;

    DrawingTool.currentPoint = null;

    DrawingTool.polylinePoints = [];

    DrawingTool.constraintAxis = null;

    DrawingTool.clearLockedParams();

    DrawingTool._clearPreview();

    DrawingTool._detachEventListeners();

    context.editor.selector.disabled = false;
    if (context.ifc) {
      context.ifc.activeType = null;
    }

    if (DrawingTool.onStateChanged) {
      DrawingTool.onStateChanged(STATES.IDLE);
    }
    if (DrawingTool.onModeChanged) {
      DrawingTool.onModeChanged(null, previousMode);
    }
  }

  /**
   * Update drawing options
   * @param {Object} newOptions - New options to merge
   */
  static setOptions(newOptions) {
    DrawingTool.options = { ...DrawingTool.options, ...newOptions };
    if (DrawingTool.onOptionsChanged) {
      DrawingTool.onOptionsChanged(DrawingTool.options);
    }
  }

  /**
   * Refresh the preview with current options (call after changing options programmatically)
   * @param {Object} context - Optional context, uses stored context if not provided
   */
  static refreshPreview() {
      if ( !DrawingTool.mode || !DrawingTool.currentPoint) return;

    const snapResult = { 
      point: DrawingTool.currentPoint, 
      object: DrawingTool._lastSnapObject || null, 
      face: DrawingTool._lastSnapFace || null 
    };

    switch (DrawingTool.mode) {
      case DrawingTool.DRAWING_MODES.TWO_POINT_EXTRUSION:
        if (DrawingTool.startPoint) {
          DrawingTool._updateExtrustionPreview(DrawingTool.startPoint, DrawingTool.currentPoint);
        }
        break;
      case DrawingTool.DRAWING_MODES.PLACEMENT:
        DrawingTool._updatePlacementPreview(snapResult);
        break;
    }

    DrawingTool._requestRender();
  }

  /**
   * Get the current active tool configuration
   * @returns {Object|null} Tool configuration or null if no active tool
   */
  static getActiveToolConfig() {
    if (!DrawingTool.activeTool) return null;
    return DrawingTool.AVAILABLETOOLS[DrawingTool.activeTool] || null;
  }

  /**
   * Check if the current active tool requires a wall host
   * @returns {boolean} True if the tool requires placement on a wall
   */
  static requiresWallHost() {
    const toolConfig = DrawingTool.getActiveToolConfig();
    return toolConfig?.requiresWallHost === true;
  }

  /**
   * Lock a parameter to a specific value
   * @param {string} paramName - Parameter name (e.g., 'height', 'x', 'y', 'z')
   * @param {number} value - Value to lock to
   */
  static lockParam(paramName, value) {
    DrawingTool.lockedParams[paramName] = value;
  }

  /**
   * Unlock a parameter
   * @param {string} paramName - Parameter name to unlock
   */
  static unlockParam(paramName) {
    delete DrawingTool.lockedParams[paramName];
  }

  /**
   * Check if a parameter is locked
   * @param {string} paramName - Parameter name
   * @returns {boolean} True if parameter is locked
   */
  static isParamLocked(paramName) {
    return paramName in DrawingTool.lockedParams;
  }

  /**
   * Get locked value for a parameter
   * @param {string} paramName - Parameter name
   * @returns {number|null} Locked value or null if not locked
   */
  static getLockedValue(paramName) {
    return DrawingTool.lockedParams[paramName] ?? null;
  }

  /**
   * Clear all locked parameters
   */
  static clearLockedParams() {
    DrawingTool.lockedParams = {};
  }

  /**
   * Apply locked parameters to a point
   * @param {THREE.Vector3} point - Point to modify
   * @returns {THREE.Vector3} Modified point with locked values applied
   */
  static _applyLockedParams(point) {
    const locked = DrawingTool.lockedParams;
    const constrained = point.clone();

    if (locked.x !== undefined) {
      constrained.x = locked.x;
    }
    if (locked.y !== undefined) {
      constrained.y = locked.y;
    }
    if (locked.z !== undefined) {
      constrained.z = locked.z;
    }

    return constrained;
  }

  static _getSnapPoint(event) {
    const editor = context.editor;

    if (!editor) return null;

    const mouse = DrawingTool._getNormalizedMouse(event);
    let snapOptions = { ...SnapState.snapOptions };

    if (DrawingTool.mode === DrawingTool.DRAWING_MODES.TWO_POINT_EXTRUSION) {
      snapOptions.snapToVertex = false;

      snapOptions.snapToEdge = false;

      snapOptions.snapThreshold = Math.max(snapOptions.snapThreshold, 0.3); 
    }

    let elevation = 0;

    if (DrawingTool.startPoint && DrawingTool.state === STATES.PICKING_END) {
      elevation = DrawingTool.startPoint.y;
    }

    return SnapTool.getSnapPoint({
      raycaster,
      mouse,
      camera: editor.camera,
      scene: editor.scene,
      snapOptions,
      elevation
    });
  }

  /**
   * Get normalized mouse coordinates

   * @param {Event} event - Mouse event
   */
  static _getNormalizedMouse(event) {
    const editor = context.editor;

    if (!editor || !editor.renderer) return new THREE.Vector2();

    const rect = editor.renderer.domElement.getBoundingClientRect();

    return new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
  }
  /**
   * Handle two point  drawing click

   * @param {THREE.Vector3} point - Click point
   */
  static _handleTwoPointExtrusion(point) {
    let constrainedPoint = point;

    if (DrawingTool.state === STATES.PICKING_START) {

      DrawingTool.startPoint = point.clone();

      DrawingTool.state = STATES.PICKING_END;

      if (DrawingTool.onStateChanged) {
        DrawingTool.onStateChanged(STATES.PICKING_END);
      }

    } else if (DrawingTool.state === STATES.PICKING_END) {
      const start = DrawingTool.startPoint;

      const end = constrainedPoint;

      if (start.distanceTo(end) < 0.1) {
        console.warn('Wall too short - minimum length is 0.1 units');

        return;
      }

      const params = {
        start: { x: start.x, y: start.y, z: start.z || 0 },
        end: { x: end.x, y: end.y, z: end.z || 0 },
        elevation: start.z || 0,
      };
      DrawingTool.onPlacementFinished({
          params,
        });

      DrawingTool.startPoint = end.clone();

      DrawingTool._clearPreview();

      return 
    }
  }

  /**
   * Handle placement click for various element types

   * @param {Object} snapResult - Snap result
   */
  static _handlePlacementClick(snapResult) {
    const needsWall = DrawingTool.requiresWallHost();
    const hostObject = snapResult.object;
    const point = snapResult.point;

    if (needsWall) {
      
      if (!hostObject?.isIfc || !DrawingTool._isWall(hostObject)) {
        console.warn(`Cannot place ${DrawingTool.activeTool} - must click on a wall`);
        return;
      }

      const hostGuid = DrawingTool._getGlobalId(hostObject);

      if (!hostGuid) {
        console.warn('Could not find wall GlobalId');
        return;
      }
      const position = DrawingTool._calculateLocalPosition(hostObject, point);
      const type = DrawingTool.activeTool === 'IfcWindowType' ? 'window' : 'door';
      DrawingTool._createOpening(type, hostGuid, position);

    } else {
      
      const toolConfig = DrawingTool.getActiveToolConfig();
      const constructionType = toolConfig?.constructionType;
      const depth = DrawingTool.options.depth || 3.0;
      
      let position = { x: point.x, y: point.y, z: point.z };
      if (constructionType === 'profiled_foundation') {
        position.z = -depth;  
      }
      const params = {
        position,
        depth: depth,
        width: DrawingTool.options.width,
        height: DrawingTool.options.height,
      };

      if (DrawingTool.onPlacementFinished) {
        DrawingTool.onPlacementFinished({ params });
      }
    }
  }

  /**
   * Create window/door through operator

   * @param {string} type - 'window' or 'door'
   * @param {string} hostGuid - Host wall GUID
   * @param {Object} position - Local position
   */
  static async _createOpening(type, hostGuid, position) {
    const params = {
      hostGuid,
      position,
      width: type === 'window' ? DrawingTool.options.windowWidth : DrawingTool.options.doorWidth,
      height: type === 'window' ? DrawingTool.options.windowHeight : DrawingTool.options.doorHeight,
      sillHeight: type === 'window' ? DrawingTool.options.windowSillHeight : 0
    };

    if (DrawingTool.onPlacementFinished) {
      DrawingTool.onPlacementFinished({
        type,
        params,
        operatorName: type === 'window' ? 'bim.create_window' : 'bim.create_door'
      });
    }
  }

  /**
   * Handle polyline click - adds point to polyline

   * @param {THREE.Vector3} point - Click point
   */
  static _handlePolylineClick(point) {
    
    if (DrawingTool.polylinePoints.length >= 3) {
      const firstPoint = DrawingTool.polylinePoints[0];
      const distance = point.distanceTo(firstPoint);
      
      if (distance < 0.3) {  
        DrawingTool._finishPolyline();
        return;
      }
    }
    DrawingTool.polylinePoints.push(point.clone());
    DrawingTool._updatePolylinePreview(point);

    if (DrawingTool.onStateChanged) {
      DrawingTool.onStateChanged(STATES.PICKING_POLYLINE);
    }
  }

  /**
   * Finish polyline drawing and create the element

   */
  static _finishPolyline() {
    if (DrawingTool.polylinePoints.length < 3) {
      console.warn('Need at least 3 points to create a polyline element');
      return;
    }
    const polyline = DrawingTool.polylinePoints.map(p => ({
      x: p.x,
      y: -p.z,  
      z: p.y    
    }));
    const first = polyline[0];
    const last = polyline[polyline.length - 1];
    if (first.x !== last.x || first.y !== last.y) {
      polyline.push({ x: first.x, y: first.y, z: first.z });
    }

    const params = {
      polyline,
      thickness: DrawingTool.options.thickness || 0.2,
      elevation: DrawingTool.polylinePoints[0]?.y || 0,  
    };

    if (DrawingTool.onPlacementFinished) {
      DrawingTool.onPlacementFinished({ params });
    }
    DrawingTool.polylinePoints = [];
    DrawingTool._clearPreview();
  }

  /**
   * Update polyline preview

   * @param {THREE.Vector3} currentPoint - Current mouse point
   */
  static _updatePolylinePreview(currentPoint) {
    DrawingTool._clearPreview();

    const points = [...DrawingTool.polylinePoints];
    
    if (points.length === 0) return;
    const previewPoints = [...points, currentPoint];

    const previewGroup = new THREE.Group();
    const options = DrawingTool.options;
    const thickness = options.thickness || 0.2;
    const outlinePoints = [...previewPoints, previewPoints[0]];  
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(outlinePoints);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x00ff88,
      depthTest: false,
      linewidth: 2,
    });
    const outline = new THREE.Line(lineGeometry, lineMaterial);
    previewGroup.add(outline);
    if (previewPoints.length >= 3) {
      const shape = new THREE.Shape();
      shape.moveTo(previewPoints[0].x, -previewPoints[0].z);
      for (let i = 1; i < previewPoints.length; i++) {
        shape.lineTo(previewPoints[i].x, -previewPoints[i].z);
      }
      shape.closePath();
      const extrudeSettings = {
        depth: thickness,
        bevelEnabled: false,
      };
      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geometry.rotateX(-Math.PI / 2);

      const material = new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        depthTest: false,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = previewPoints[0].y;  
      previewGroup.add(mesh);
      const edges = new THREE.EdgesGeometry(geometry);
      const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x00ff88 });
      const wireframe = new THREE.LineSegments(edges, edgeMaterial);
      wireframe.position.y = previewPoints[0].y;
      previewGroup.add(wireframe);
      const area = DrawingTool._calculatePolygonArea(previewPoints);
      const centroid = DrawingTool._calculateCentroid(previewPoints);
      const areaText = DrawingTool._createTextSprite(`${area.toFixed(2)} m²`);
      areaText.position.copy(centroid);
      areaText.position.y += 0.5;
      previewGroup.add(areaText);
    }
    points.forEach((p, index) => {
      const markerGeometry = new THREE.SphereGeometry(0.05, 16, 16);
      const markerMaterial = new THREE.MeshBasicMaterial({
        color: index === 0 ? 0xff6600 : 0x00ff88,  
        depthTest: false,
      });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.copy(p);
      previewGroup.add(marker);
    });
    if (points.length >= 3) {
      const firstPoint = points[0];
      const distance = currentPoint.distanceTo(firstPoint);
      if (distance < 0.5) {
        const closeIndicator = new THREE.Mesh(
          new THREE.RingGeometry(0.15, 0.25, 32),
          new THREE.MeshBasicMaterial({ color: 0xff6600, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
        );
        closeIndicator.position.copy(firstPoint);
        closeIndicator.rotation.x = -Math.PI / 2;  
        previewGroup.add(closeIndicator);
      }
    }

    DrawingTool.previewObject = previewGroup;
    context.editor.sceneHelpers.add(previewGroup);
  }

  /**
   * Calculate polygon area using shoelace formula
   * @param {THREE.Vector3[]} points - Polygon points
   * @returns {number} Area in square meters
   */
  static _calculatePolygonArea(points) {
    if (points.length < 3) return 0;

    let area = 0;
    const n = points.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      
      area += points[i].x * points[j].z;
      area -= points[j].x * points[i].z;
    }

    return Math.abs(area) / 2;
  }

  /**
   * Calculate centroid of polygon
   * @param {THREE.Vector3[]} points - Polygon points
   * @returns {THREE.Vector3} Centroid position
   */
  static _calculateCentroid(points) {
    if (points.length === 0) return new THREE.Vector3();

    const centroid = new THREE.Vector3();
    points.forEach(p => centroid.add(p));
    centroid.divideScalar(points.length);

    return centroid;
  }

  /**
   * Apply axis constraint to point
   * @param {THREE.Vector3} point - Original point
   */
  static _applyConstraint(point) {
    if (!DrawingTool.startPoint || !DrawingTool.constraintAxis) return point;

    const constrained = point.clone();

    if (DrawingTool.constraintAxis === 'x') {
      constrained.y = DrawingTool.startPoint.y;
    } else if (DrawingTool.constraintAxis === 'y') {
      constrained.z = DrawingTool.startPoint.z;
    }

    return constrained;
  }

  /**
   * Create a text sprite for displaying distance
   * @param {string} text - Text to display
   * @param {number} fontSize - Font size
   * @returns {THREE.Sprite} - Text sprite
   */
  static _createTextSprite(text, fontSize = 16) {
    const canvas = document.createElement('canvas');

    const context = canvas.getContext('2d');

    context.font = `${fontSize}px Arial`;

    const metrics = context.measureText(text);

    canvas.width = metrics.width + 20;

    canvas.height = fontSize + 10;

    context.fillStyle = 'rgba(0, 0, 0, 0.7)';

    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = 'white';

    context.font = `${fontSize}px Arial`;

    context.fillText(text, 10, fontSize + 2);

    const texture = new THREE.CanvasTexture(canvas);

    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });

    const sprite = new THREE.Sprite(spriteMaterial);

    sprite.scale.set(canvas.width / 100, canvas.height / 100, 1);

    return sprite;
  }

  /**
   * Create a profile outline (rectangular cross-section) for beam preview
   * @param {number} width - Profile width (Y dimension in IFC)
   * @param {number} depth - Profile depth (Z dimension in IFC)
   * @param {number} color - Line color
   * @returns {THREE.Line} - Profile outline (closed loop using Line instead of LineLoop for WebGPU compatibility)
   */
  static _createProfileOutline(width, depth, color = 0xffaa00) {
    const halfWidth = width / 2;
    const points = [
      new THREE.Vector3(0, -halfWidth, 0),
      new THREE.Vector3(0, halfWidth, 0),
      new THREE.Vector3(0, halfWidth, -depth),
      new THREE.Vector3(0, -halfWidth, -depth),
      new THREE.Vector3(0, -halfWidth, 0),  
    ];
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: color, linewidth: 2 });
    const outline = new THREE.Line(geometry, material);
    
    return outline;
  }

  /**
   * Update extrusion preview geometry (walls, beams, coverings)

   * @param {THREE.Vector3} start - Start point (in Y-up scene coords)
   * @param {THREE.Vector3} end - End point (in Y-up scene coords)
   * 
   * Note: Preview is built to match IFC geometry which uses Z-up.
   * The preview is rotated -90 degrees around X to display correctly in Y-up scene.
   */
  static _updateExtrustionPreview(start, end) {
    DrawingTool._clearPreview();

    const length = start.distanceTo(end);

    if (length < 0.01) return;

    const options = DrawingTool.options;
    const toolConfig = DrawingTool.getActiveToolConfig();
    const constructionType = toolConfig?.constructionType || 'layer';
    const activeTool = DrawingTool.activeTool;
    const previewGroup = new THREE.Group();

    let previewMesh;

    if (constructionType === 'layer') {
      
      const height = options.height || 3.0;
      const thickness = options.thickness || 0.2;
      const geometry = new THREE.BoxGeometry(length, thickness, height);
      previewMesh = new THREE.Mesh(geometry, DrawingTool.previewMaterial);
      previewMesh.position.set(length / 2, 0, height / 2);
      const edges = new THREE.EdgesGeometry(geometry);
      const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x00aaff });
      const wireframe = new THREE.LineSegments(edges, edgeMaterial);
      wireframe.position.copy(previewMesh.position);
      previewGroup.add(wireframe);

    } else if (constructionType === 'profiled') {
      const profileWidth = options.width || 0.3;   
      const profileDepth = options.depth || 0.3;   
      const beamMaterial = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
      });
      const geometry = new THREE.BoxGeometry(length, profileWidth, profileDepth);
      previewMesh = new THREE.Mesh(geometry, beamMaterial);
      previewMesh.position.set(length / 2, 0, -profileDepth / 2);
      const profileOutline = DrawingTool._createProfileOutline(profileWidth, profileDepth, 0xffaa00);
      profileOutline.position.set(0, 0, 0);
      previewGroup.add(profileOutline);

      const profileOutlineEnd = DrawingTool._createProfileOutline(profileWidth, profileDepth, 0xffaa00);
      profileOutlineEnd.position.set(length, 0, 0);
      previewGroup.add(profileOutlineEnd);
      const edges = new THREE.EdgesGeometry(geometry);
      const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xffaa00 });
      const wireframe = new THREE.LineSegments(edges, edgeMaterial);
      wireframe.position.copy(previewMesh.position);
      previewGroup.add(wireframe);
    }

    if (previewMesh) {
      previewGroup.add(previewMesh);
    }
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(length, 0, 0)
    ]);
    const axisColor = constructionType === 'profiled' ? 0xffaa00 : 0x00aaff;
    const axisLine = new THREE.Line(lineGeometry, new THREE.LineDashedMaterial({ 
      color: axisColor, 
      dashSize: 0.1, 
      gapSize: 0.05 
    }));
    axisLine.computeLineDistances();
    previewGroup.add(axisLine);
    const direction = new THREE.Vector3().subVectors(end, start).normalize();
    const angle = Math.atan2(direction.z, direction.x);  
    previewGroup.rotation.x = -Math.PI / 2;
    
    previewGroup.rotation.z = -angle;

    previewGroup.position.copy(start);

    DrawingTool.previewObject = previewGroup;
    context.editor.sceneHelpers.add(previewGroup);
    const distance = length.toFixed(2);
    const textSprite = DrawingTool._createTextSprite(`${distance} m`);
    const midpoint = start.clone().add(end).multiplyScalar(0.5);
    textSprite.position.copy(midpoint);
    textSprite.position.y += 0.5;

    DrawingTool.previewText = textSprite;
    context.editor.sceneHelpers.add(textSprite);
  }

  /**
   * Update placement preview geometry

   * @param {Object} snapResult - Snap result
   * 
   * Note: IFC uses Z-up coordinate system, but Three.js uses Y-up.
   * The preview is built in IFC coordinates then rotated -90 degrees around X
   * to match how IFC geometry is displayed in the scene.
   */
  static _updatePlacementPreview(snapResult) {
    DrawingTool._clearPreview();

    const needsWall = DrawingTool.requiresWallHost();
    const options = DrawingTool.options;
    const activeTool = DrawingTool.activeTool;

    let width, height, depth;

    if (needsWall) {
      
      width = options.width || 1.0;
      height = options.height || 2.0;
      depth = 0.15;  
    } else {
      width = options.width || 0.3;
      height = options.depth || options.height || 3.0;  
      depth = options.thickness || options.width || 0.3;
    }
    const preview = new THREE.Mesh(
      new THREE.BoxGeometry(width, depth, height),
      DrawingTool.previewMaterial
    );

    preview.position.copy(snapResult.point);

    if (needsWall) {
      const sillHeight = activeTool === 'IfcWindowType' ? (options.sillHeight || 0.9) : 0;
      if (snapResult.face && snapResult.object) {
        const normal = snapResult.face.normal.clone();
        normal.transformDirection(snapResult.object.matrixWorld);
        const angle = Math.atan2(normal.x, normal.z);
        preview.rotation.set(-Math.PI / 2, 0, -angle);
      } else {
        
        preview.rotation.x = -Math.PI / 2;
      }
      preview.position.y += sillHeight + height / 2;

    } else {
      
      const toolConfig = DrawingTool.getActiveToolConfig();
      const constructionType = toolConfig?.constructionType;
      preview.rotation.x = -Math.PI / 2;

      if (constructionType === 'profiled_foundation') {
        preview.position.y -= height / 2;
      } else {
        preview.position.y += height / 2;
      }
    }

    DrawingTool.previewObject = preview;

    if (context.editor?.scene) {
      context.editor.scene.add(preview);
      DrawingTool._requestRender();
    }
  }

  /**
   * Clear preview geometry

   */
  static _clearPreview() {
    if (DrawingTool.previewObject) {
      if (DrawingTool.previewObject.parent) {
        DrawingTool.previewObject.parent.remove(DrawingTool.previewObject);
      }

      if (DrawingTool.previewObject.geometry) {
        DrawingTool.previewObject.geometry.dispose();
      }

      DrawingTool.previewObject = null;
    }

    if (DrawingTool.previewText) {
      if (DrawingTool.previewText.parent) {
        DrawingTool.previewText.parent.remove(DrawingTool.previewText);
      }

      if (DrawingTool.previewText.material.map) {
        DrawingTool.previewText.material.map.dispose();
      }

      DrawingTool.previewText.material.dispose();

      DrawingTool.previewText = null;
    }
    DrawingTool._requestRender();
  }

  /**
   * Request a render frame (debounced to avoid excessive renders during mouse move)

   */
  static _requestRender() {
      
    context.editor.signals.cameraChanged.dispatch();
      
  }

  /**
   * Check if object is a wall
   * @param {THREE.Object3D} object - Object to check
   */
  static _isWall(object) {
    
    let current = object;

    while (current) {
      if (current.userData?.entityType === 'IfcWall' ||
          current.userData?.ifcType === 'IfcWall' ||
          current.name?.includes('Wall')) {
        return true;
      }

      current = current.parent;
    }

    return false;
  }

  /**
   * Get GlobalId from object
   * @param {THREE.Object3D} object - Object to get ID from
   */
  static _getGlobalId(object) {
    let current = object;

    while (current) {
      if (current.GlobalId && !current.GlobalId.startsWith('IFC/BodyRepresentation/')) {
        return current.GlobalId;
      }

      if (current.GlobalId?.startsWith('IFC/BodyRepresentation/')) {
        return current.GlobalId.replace('IFC/BodyRepresentation/', '');
      }

      current = current.parent;
    }

    return null;
  }

  /**
   * Calculate local position on wall
   * @param {THREE.Object3D} wallObject - Wall object
   * @param {THREE.Vector3} hitPoint - Hit point
   */
  static _calculateLocalPosition(wallObject, hitPoint) {
    
    const localPoint = hitPoint.clone();

    if (wallObject.matrixWorld) {
      const inverseMatrix = new THREE.Matrix4().copy(wallObject.matrixWorld).invert();

      localPoint.applyMatrix4(inverseMatrix);
    }

    return {
      x: localPoint.x,
      y: localPoint.y,
      z: localPoint.z
    };
  }

  /**
   * Attach event listeners

   */
  static _attachEventListeners() {
    const canvas = context.editor?.renderer?.domElement;

    if (!canvas) return;

    canvas.addEventListener('mousemove', DrawingTool._onMouseMove);

    canvas.addEventListener('click', DrawingTool._onMouseClick);

    document.addEventListener('keydown', DrawingTool._onKeyDown);
  }

  /**
   * Detach event listeners

   */
  static _detachEventListeners() {
    const canvas = context.editor?.renderer?.domElement;

    if (!canvas) return;

    canvas.removeEventListener('mousemove', DrawingTool._onMouseMove);

    canvas.removeEventListener('click', DrawingTool._onMouseClick);

    document.removeEventListener('keydown', DrawingTool._onKeyDown);
  }

  /**
   * Dispose resources

   */
  static dispose() {
    DrawingTool.cancel();

    if (DrawingTool.snapIndicator?.parent) {
      DrawingTool.snapIndicator.parent.remove(DrawingTool.snapIndicator);
    }

    if (DrawingTool.snapRing?.parent) {
      DrawingTool.snapRing.parent.remove(DrawingTool.snapRing);
    }

    if (DrawingTool.previewMaterial) {
      DrawingTool.previewMaterial.dispose();
    }
  }
}

export default DrawingTool;

export { STATES };