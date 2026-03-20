import { Operator } from "../../operators/Operator.js";

import * as THREE from 'three';

import dataStore, { MeasurementCollection } from "../../data/index.js";

import SnapTool from "../../tool/viewer/SnapTool.js";

import MeasureTool from "../../tool/viewer/MeasureTool.js";

import { SnapState } from "../world.snap/operators.js";

/**
 * Measurement State Manager
 * 
 * Since MeasureTool is now stateless, we manage state here via signals and dataStore.
 * This state is initialized once and accessed by operators.
 */
const MeasureState = {
  isActive: false,
  currentMode: 'DISTANCE',
  measurements: [],
  currentPoints: [],
  collection: null,
  measureGroup: null,
  snapIndicator: null,
  snapRing: null,
  tempLine: null,
  tempLabel: null,
  areaPreview: null,
  raycaster: new THREE.Raycaster(),
  mouse: new THREE.Vector2(),
  
  handlers: {
    mouseDown: null,
    mouseMove: null,
    mouseUp: null,
    keyDown: null,
    contextMenu: null,
  },
  
  isDragging: false,
  draggedHandle: null,
  draggedMeasurement: null,
  dragPlane: new THREE.Plane(),
  dragOffset: new THREE.Vector3(),
};

/**
 * Initialize the measurement state (called once when module activates)
 */
function initializeMeasureState(editor) {
  if (MeasureState.measureGroup) return; 
  MeasureState.measureGroup = new THREE.Group();

  MeasureState.measureGroup.name = 'MeasureHelpers';

  editor.sceneHelpers.add(MeasureState.measureGroup);
  const { indicator, ring } = SnapTool.createSnapIndicator();

  MeasureState.snapIndicator = indicator;

  MeasureState.snapRing = ring;

  MeasureState.measureGroup.add(indicator);

  MeasureState.measureGroup.add(ring);
  MeasureState.collection = new MeasurementCollection({ name: 'ViewerMeasurements' });

  dataStore.registerCollection(MeasureState.collection.GlobalId, MeasureState.collection);
}

/**
 * Get mouse position in normalized device coordinates
 */
function updateMousePosition(event, renderer) {
  const rect = renderer.domElement.getBoundingClientRect();

  MeasureState.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;

  MeasureState.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function requestRender(editor) {
  editor.signals.measurementChanged.dispatch();
}

function clearTempVisuals() {
  if (!MeasureState.measureGroup) return;

  if (MeasureState.tempLine) {
    MeasureState.measureGroup.remove(MeasureState.tempLine);

    MeasureState.tempLine.geometry?.dispose();

    MeasureState.tempLine.material?.dispose();

    MeasureState.tempLine = null;
  }

  if (MeasureState.tempLabel) {
    MeasureState.measureGroup.remove(MeasureState.tempLabel);

    MeasureState.tempLabel = null;
  }

  if (MeasureState.areaPreview) {
    MeasureState.measureGroup.remove(MeasureState.areaPreview);

    MeasureState.areaPreview = null;
  }
  const toRemove = [];

  MeasureState.measureGroup.traverse((child) => {
    if (child.userData.isMeasurePoint) {
      toRemove.push(child);
    }
  });

  toRemove.forEach((obj) => {
    MeasureState.measureGroup.remove(obj);

    obj.geometry?.dispose();

    obj.material?.dispose();
  });
}
class ToggleMeasureTool extends Operator {
  static operatorName = "world.measure.toggle";

  static operatorLabel = "Toggle Measure Tool";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;
  }

  poll() {
    return this.context.editor;
  }

  execute() {
    initializeMeasureState(this.context.editor);

    if (MeasureState.isActive) {
      deactivateMeasureTool(this.context);
    } else {
      activateMeasureTool(this.context, MeasureState.currentMode);
    }

    this.context.signals.measureToolToggled?.dispatch({
      isActive: MeasureState.isActive,
      mode: MeasureState.currentMode,
    });

    return { status: "FINISHED" };
  }
}

/**
 * Activate Measure Tool
 */
class ActivateMeasureTool extends Operator {
  static operatorName = "world.measure.activate";

  static operatorLabel = "Activate Measure Tool";

  static operatorOptions = ["REGISTER"];

  constructor(context, mode = 'DISTANCE') {
    super(context);

    this.context = context;

    this.mode = mode;
  }

  poll() {
    return this.context.editor;
  }

  execute() {
    initializeMeasureState(this.context.editor);

    activateMeasureTool(this.context, this.mode);

    if (this.context.signals.measureToolToggled) {
      this.context.signals.measureToolToggled.dispatch({
        isActive: true,
        mode: this.mode,
      });
    }

    return { status: "FINISHED" };
  }
}

/**
 * Deactivate Measure Tool
 */
class DeactivateMeasureTool extends Operator {
  static operatorName = "world.measure.deactivate";

  static operatorLabel = "Deactivate Measure Tool";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;
  }

  poll() {
    return this.context.editor;
  }

  execute() {
    deactivateMeasureTool(this.context);

    if (this.context.signals.measureToolToggled) {
      this.context.signals.measureToolToggled.dispatch({
        isActive: false,
        mode: null,
      });
    }

    return { status: "FINISHED" };
  }
}

/**
 * Set Measure Mode
 */
class SetMeasureMode extends Operator {
  static operatorName = "world.measure.set_mode";

  static operatorLabel = "Set Measure Mode";

  static operatorOptions = ["REGISTER"];

  constructor(context, mode) {
    super(context);

    this.context = context;

    this.mode = mode;
  }

  poll() {
    return this.context.editor;
  }

  execute() {
    initializeMeasureState(this.context.editor);

    clearTempVisuals();

    MeasureState.currentPoints = [];

    MeasureState.currentMode = this.mode;

    if (this.context.signals.measureModeChanged) {
      this.context.signals.measureModeChanged.dispatch(this.mode);
    }

    return { status: "FINISHED" };
  }
}

/**
 * Create Distance Measurement
 */
class CreateDistanceMeasurement extends Operator {
  static operatorName = "world.measure.create_distance";

  static operatorLabel = "Create Distance Measurement";

  static operatorOptions = ["REGISTER"];

  constructor(context, start, end) {
    super(context);

    this.context = context;

    this.start = start;

    this.end = end;

    this.measurement = null;
  }

  poll() {
    return this.context.editor && this.start && this.end;
  }

  execute() {
    initializeMeasureState(this.context.editor);

    this.measurement = MeasureTool.createDistanceMeasurement({
      start: this.start,
      end: this.end,
    });

    MeasureTool.addToGroup(MeasureState.measureGroup, this.measurement);

    MeasureState.measurements.push(this.measurement);

    MeasureState.collection.addMeasurement(this.measurement);

    if (this.context.signals.measurementCreated) {
      this.context.signals.measurementCreated.dispatch(this.measurement);
    }
    requestRender(this.context.editor);

    return { status: "FINISHED", measurement: this.measurement };
  }

  undo() {
    if (this.measurement) {
      const index = MeasureState.measurements.findIndex(m => m.id === this.measurement.id);

      if (index !== -1) {
        MeasureState.measurements.splice(index, 1);
      }

      MeasureState.collection.removeMeasurement(this.measurement.id);

      MeasureTool.removeFromParent(this.measurement);

      MeasureTool.disposeMeasurement(this.measurement);
      requestRender(this.context.editor);
    }

    return { status: "CANCELLED" };
  }
}

/**
 * Create Angle Measurement
 */
class CreateAngleMeasurement extends Operator {
  static operatorName = "world.measure.create_angle";

  static operatorLabel = "Create Angle Measurement";

  static operatorOptions = ["REGISTER"];

  constructor(context, point1, vertex, point3) {
    super(context);

    this.context = context;

    this.point1 = point1;

    this.vertex = vertex;

    this.point3 = point3;

    this.measurement = null;
  }

  poll() {
    return this.context.editor && this.point1 && this.vertex && this.point3;
  }

  execute() {
    initializeMeasureState(this.context.editor);

    this.measurement = MeasureTool.createAngleMeasurement({
      point1: this.point1,
      vertex: this.vertex,
      point3: this.point3,
    });

    MeasureTool.addToGroup(MeasureState.measureGroup, this.measurement);

    MeasureState.measurements.push(this.measurement);

    MeasureState.collection.addMeasurement(this.measurement);

    if (this.context.signals.measurementCreated) {
      this.context.signals.measurementCreated.dispatch(this.measurement);
    }

    requestRender(this.context.editor, true);

    return { status: "FINISHED", measurement: this.measurement };
  }

  undo() {
    if (this.measurement) {
      const index = MeasureState.measurements.findIndex(m => m.id === this.measurement.id);

      if (index !== -1) {
        MeasureState.measurements.splice(index, 1);
      }

      MeasureState.collection.removeMeasurement(this.measurement.id);

      MeasureTool.removeFromParent(this.measurement);

      MeasureTool.disposeMeasurement(this.measurement);

      requestRender(this.context.editor);
    }

    return { status: "CANCELLED" };
  }
}

class CreateAreaMeasurement extends Operator {
  static operatorName = "world.measure.create_area";

  static operatorLabel = "Create Area Measurement";

  static operatorOptions = ["REGISTER"];

  constructor(context, points) {
    super(context);

    this.context = context;

    this.points = points;

    this.measurement = null;
  }

  poll() {
    return this.context.editor && this.points && this.points.length >= 3;
  }

  execute() {
    initializeMeasureState(this.context.editor);

    this.measurement = MeasureTool.createAreaMeasurement({
      points: this.points,
    });

    MeasureTool.addToGroup(MeasureState.measureGroup, this.measurement);

    MeasureState.measurements.push(this.measurement);

    MeasureState.collection.addMeasurement(this.measurement);

    if (this.context.signals.measurementCreated) {
      this.context.signals.measurementCreated.dispatch(this.measurement);
    }
    requestRender(this.context.editor);

    return { status: "FINISHED", measurement: this.measurement };
  }

  undo() {
    if (this.measurement) {
      const index = MeasureState.measurements.findIndex(m => m.id === this.measurement.id);

      if (index !== -1) {
        MeasureState.measurements.splice(index, 1);
      }

      MeasureState.collection.removeMeasurement(this.measurement.id);

      MeasureTool.removeFromParent(this.measurement);

      MeasureTool.disposeMeasurement(this.measurement);
      requestRender(this.context.editor);
    }

    return { status: "CANCELLED" };
  }
}

/**
 * Create Perpendicular Measurement
 */
class CreatePerpendicularMeasurement extends Operator {
  static operatorName = "world.measure.create_perpendicular";

  static operatorLabel = "Create Perpendicular Measurement";

  static operatorOptions = ["REGISTER"];

  constructor(context, lineStart, lineEnd, point) {
    super(context);

    this.context = context;

    this.lineStart = lineStart;

    this.lineEnd = lineEnd;

    this.point = point;

    this.measurement = null;
  }

  poll() {
    return this.context.editor && this.lineStart && this.lineEnd && this.point;
  }

  execute() {
    initializeMeasureState(this.context.editor);

    this.measurement = MeasureTool.createPerpendicularMeasurement({
      lineStart: this.lineStart,
      lineEnd: this.lineEnd,
      point: this.point,
    });

    MeasureTool.addToGroup(MeasureState.measureGroup, this.measurement);

    MeasureState.measurements.push(this.measurement);

    MeasureState.collection.addMeasurement(this.measurement);

    if (this.context.signals.measurementCreated) {
      this.context.signals.measurementCreated.dispatch(this.measurement);
    }
    requestRender(this.context.editor);

    return { status: "FINISHED", measurement: this.measurement };
  }

  undo() {
    if (this.measurement) {
      const index = MeasureState.measurements.findIndex(m => m.id === this.measurement.id);

      if (index !== -1) {
        MeasureState.measurements.splice(index, 1);
      }

      MeasureState.collection.removeMeasurement(this.measurement.id);

      MeasureTool.removeFromParent(this.measurement);

      MeasureTool.disposeMeasurement(this.measurement);
      requestRender(this.context.editor);
    }

    return { status: "CANCELLED" };
  }
}

/**
 * Clear All Measurements
 */
class ClearMeasurements extends Operator {
  static operatorName = "world.measure.clear_all";

  static operatorLabel = "Clear All Measurements";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;

    this.previousMeasurements = [];
  }

  poll() {
    return this.context.editor;
  }

  execute() {
    
    this.previousMeasurements = [...MeasureState.measurements];

    clearTempVisuals();

    MeasureState.currentPoints = [];
    MeasureState.collection.clearMeasurements();
    MeasureTool.disposeAllMeasurements(MeasureState.measurements, MeasureState.measureGroup);
    MeasureState.measurements = [];
    MeasureTool.clearGroup(MeasureState.measureGroup, [MeasureState.snapIndicator, MeasureState.snapRing]);

    if (this.context.signals.measurementsCleared) {
      this.context.signals.measurementsCleared.dispatch();
    }
    requestRender(this.context.editor);

    return { status: "FINISHED" };
  }
}

/**
 * Delete Last Measurement
 */
class DeleteLastMeasurement extends Operator {
  static operatorName = "world.measure.delete_last";

  static operatorLabel = "Delete Last Measurement";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;

    this.deletedMeasurement = null;
  }

  poll() {
    return this.context.editor && MeasureState.measurements.length > 0;
  }

  execute() {
    this.deletedMeasurement = MeasureState.measurements.pop();

    if (this.deletedMeasurement) {
      MeasureState.collection.removeMeasurement(this.deletedMeasurement.id);

      MeasureTool.removeFromParent(this.deletedMeasurement);

      MeasureTool.disposeMeasurement(this.deletedMeasurement);
      requestRender(this.context.editor);
    }

    return { status: "FINISHED" };
  }

  undo() {
    if (this.deletedMeasurement) {
    }

    return { status: "CANCELLED" };
  }
}

/**
 * Delete Measurement by ID
 */
class DeleteMeasurement extends Operator {
  static operatorName = "world.measure.delete";

  static operatorLabel = "Delete Measurement";

  static operatorOptions = ["REGISTER"];

  constructor(context, measurementId) {
    super(context);

    this.context = context;

    this.measurementId = measurementId;

    this.deletedMeasurement = null;
  }

  poll() {
    return this.context.editor && this.measurementId;
  }

  execute() {
    const index = MeasureState.measurements.findIndex(m => m.id === this.measurementId);
    
    if (index !== -1) {
      this.deletedMeasurement = MeasureState.measurements.splice(index, 1)[0];

      MeasureState.collection.removeMeasurement(this.measurementId);

      MeasureTool.removeFromParent(this.deletedMeasurement);

      requestRender(this.context.editor);
    }

    return { status: "FINISHED" };
  }
}

/**
 * Export Measurements
 */
class ExportMeasurements extends Operator {
  static operatorName = "world.measure.export";

  static operatorLabel = "Export Measurements";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;
  }

  poll() {
    return this.context.editor;
  }

  execute() {
    const json = MeasureTool.exportMeasurements(MeasureState.measurements);
    const blob = new Blob([json], { type: 'application/json' });

    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');

    a.href = url;

    a.download = 'measurements.json';

    a.click();

    URL.revokeObjectURL(url);

    return { status: "FINISHED" };
  }
}

/**
 * Get Measurements (for UI)
 */
class GetMeasurements extends Operator {
  static operatorName = "world.measure.get_measurements";

  static operatorLabel = "Get Measurements";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;
  }

  execute() {
    return { 
      status: "FINISHED", 
      measurements: MeasureTool.getMeasurementsSummary(MeasureState.measurements),
    };
  }
}
function activateMeasureTool(context, mode) {
  if (MeasureState.isActive) return;

  const editor = context.editor;

  editor.selector.disabled = true;

  MeasureState.isActive = true;

  MeasureState.currentMode = mode;

  MeasureState.currentPoints = [];
  MeasureState.handlers.mouseMove = (event) => onMouseMove(event, context);

  MeasureState.handlers.mouseDown = (event) => onMouseDown(event, context);

  MeasureState.handlers.mouseUp = (event) => onMouseUp(event, context);

  MeasureState.handlers.keyDown = (event) => onKeyDown(event, context);

  MeasureState.handlers.contextMenu = (event) => onContextMenu(event, context);
  editor.renderer.domElement.addEventListener('mousedown', MeasureState.handlers.mouseDown);

  editor.renderer.domElement.addEventListener('mousemove', MeasureState.handlers.mouseMove);

  editor.renderer.domElement.addEventListener('mouseup', MeasureState.handlers.mouseUp);

  document.addEventListener('keydown', MeasureState.handlers.keyDown);

  editor.renderer.domElement.addEventListener('contextmenu', MeasureState.handlers.contextMenu);
  editor.renderer.domElement.style.cursor = 'crosshair';

}

function deactivateMeasureTool(context) {
  if (!MeasureState.isActive) return;

  const editor = context.editor;

  editor.selector.disabled = false;

  MeasureState.isActive = false;
  if (MeasureState.handlers.mouseDown) {
    editor.renderer.domElement.removeEventListener('mousedown', MeasureState.handlers.mouseDown);
  }

  if (MeasureState.handlers.mouseMove) {
    editor.renderer.domElement.removeEventListener('mousemove', MeasureState.handlers.mouseMove);
  }

  if (MeasureState.handlers.mouseUp) {
    editor.renderer.domElement.removeEventListener('mouseup', MeasureState.handlers.mouseUp);
  }

  if (MeasureState.handlers.keyDown) {
    document.removeEventListener('keydown', MeasureState.handlers.keyDown);
  }

  if (MeasureState.handlers.contextMenu) {
    editor.renderer.domElement.removeEventListener('contextmenu', MeasureState.handlers.contextMenu);
  }
  editor.renderer.domElement.style.cursor = 'auto';
  clearTempVisuals();
  MeasureState.isDragging = false;

  MeasureState.draggedHandle = null;

  MeasureState.draggedMeasurement = null;

  if (MeasureState.snapIndicator) MeasureState.snapIndicator.visible = false;

  if (MeasureState.snapRing) MeasureState.snapRing.visible = false;

}
function onMouseMove(event, context) {
  if (!MeasureState.isActive) return;

  const editor = context.editor;

  updateMousePosition(event, editor.renderer);
  if (MeasureState.isDragging) {
    updateHandleDrag(context);

    return;
  }
  const handleHit = MeasureTool.checkHandleIntersection(
    MeasureState.raycaster,
    MeasureState.mouse,
    editor.camera,
    MeasureState.measurements
  );

  if (handleHit) {
    editor.renderer.domElement.style.cursor = 'grab';
  } else {
    editor.renderer.domElement.style.cursor = 'crosshair';
  }
  const snapPoint = SnapTool.getSnapPoint({
    raycaster: MeasureState.raycaster,
    mouse: MeasureState.mouse,
    camera: editor.camera,
    scene: editor.scene,
    snapOptions: SnapState.snapOptions,
  });
  SnapTool.updateSnapIndicator(
    MeasureState.snapIndicator,
    MeasureState.snapRing,
    snapPoint?.point || null,
    editor.camera
  );
  if (snapPoint && MeasureState.currentPoints.length > 0) {
    updateTempLine(snapPoint.point, context);
  }
  requestRender(editor);
}

function onMouseDown(event, context) {
  if (!MeasureState.isActive) return;

  if (event.button !== 0) return; 

  const editor = context.editor;

  updateMousePosition(event, editor.renderer);
  const handleHit = MeasureTool.checkHandleIntersection(
    MeasureState.raycaster,
    MeasureState.mouse,
    editor.camera,
    MeasureState.measurements
  );

  if (handleHit) {
    
    event.stopPropagation();

    startHandleDrag(handleHit, context);

    return;
  }
  const snapPoint = SnapTool.getSnapPoint({
    raycaster: MeasureState.raycaster,
    mouse: MeasureState.mouse,
    camera: editor.camera,
    scene: editor.scene,
    snapOptions: SnapState.snapOptions,
  });

  if (!snapPoint) return;

  const point = snapPoint.point.clone();
  if (MeasureState.currentMode === 'DISTANCE') {
    handleDistanceClick(point, snapPoint, context);
  } else if (MeasureState.currentMode === 'ANGLE') {
    handleAngleClick(point, snapPoint, context);
  } else if (MeasureState.currentMode === 'AREA') {
    handleAreaClick(point, snapPoint, context);
  } else if (MeasureState.currentMode === 'PERPENDICULAR') {
    handlePerpendicularClick(point, snapPoint, context);
  }
}

function onMouseUp(event, context) {
  if (MeasureState.isDragging) {
    endHandleDrag(context);
  }
}

function onKeyDown(event, context) {
  if (!MeasureState.isActive) return;

  switch (event.key) {
    case 'Escape':
      clearTempVisuals();

      MeasureState.currentPoints = [];

      break;

    case 'Enter':
      if (MeasureState.currentMode === 'AREA' && MeasureState.currentPoints.length >= 3) {
        finalizeAreaMeasurement(context);
      }

      break;

    case 'Delete':

    case 'Backspace':
      if (MeasureState.measurements.length > 0) {
        const op = new DeleteLastMeasurement(context);

        op.execute();
      }

      break;

    case 'c':

    case 'C':
      const clearOp = new ClearMeasurements(context);

      clearOp.execute();

      break;

    case 's':

    case 'S':
      const snapOp = new ToggleMeasureSnap(context);

      snapOp.execute();

      break;

    case '1':
      MeasureState.currentMode = 'DISTANCE';

      clearTempVisuals();

      MeasureState.currentPoints = [];

      if (context.signals.measureModeChanged) {
        context.signals.measureModeChanged.dispatch('DISTANCE');
      }

      break;

    case '2':
      MeasureState.currentMode = 'ANGLE';

      clearTempVisuals();

      MeasureState.currentPoints = [];

      if (context.signals.measureModeChanged) {
        context.signals.measureModeChanged.dispatch('ANGLE');
      }

      break;

    case '3':
      MeasureState.currentMode = 'AREA';

      clearTempVisuals();

      MeasureState.currentPoints = [];

      if (context.signals.measureModeChanged) {
        context.signals.measureModeChanged.dispatch('AREA');
      }

      break;

    case '4':
      MeasureState.currentMode = 'PERPENDICULAR';

      clearTempVisuals();

      MeasureState.currentPoints = [];

      if (context.signals.measureModeChanged) {
        context.signals.measureModeChanged.dispatch('PERPENDICULAR');
      }

      break;
  }
}

function onContextMenu(event, context) {
  event.preventDefault();

  if (MeasureState.currentMode === 'AREA' && MeasureState.currentPoints.length >= 3) {
    finalizeAreaMeasurement(context);
  } else {
    clearTempVisuals();

    MeasureState.currentPoints = [];
  }
}
function handleDistanceClick(point, snapInfo, context) {
  MeasureState.currentPoints.push({
    position: point,
    snapType: snapInfo.type,
    object: snapInfo.object,
  });
  const marker = MeasureTool.createPointMarker(point, context.editor.camera);

  MeasureState.measureGroup.add(marker);
  requestRender(context.editor);

  if (MeasureState.currentPoints.length === 2) {
    const op = new CreateDistanceMeasurement(
      context,
      MeasureState.currentPoints[0].position,
      MeasureState.currentPoints[1].position
    );

    op.execute();

    clearTempVisuals();

    MeasureState.currentPoints = [];
  }
}

function handleAngleClick(point, snapInfo, context) {
  MeasureState.currentPoints.push({
    position: point,
    snapType: snapInfo.type,
    object: snapInfo.object,
  });

  const marker = MeasureTool.createPointMarker(point, context.editor.camera);

  MeasureState.measureGroup.add(marker);
  requestRender(context.editor);

  if (MeasureState.currentPoints.length === 3) {
    const op = new CreateAngleMeasurement(
      context,
      MeasureState.currentPoints[0].position,
      MeasureState.currentPoints[1].position, 
      MeasureState.currentPoints[2].position
    );

    op.execute();

    clearTempVisuals();

    MeasureState.currentPoints = [];
  }
}

function handleAreaClick(point, snapInfo, context) {
  MeasureState.currentPoints.push({
    position: point,
    snapType: snapInfo.type,
    object: snapInfo.object,
  });

  const marker = MeasureTool.createPointMarker(point, context.editor.camera);

  MeasureState.measureGroup.add(marker);

  updateAreaPreview();
  requestRender(context.editor);
}

function handlePerpendicularClick(point, snapInfo, context) {
  MeasureState.currentPoints.push({
    position: point,
    snapType: snapInfo.type,
    object: snapInfo.object,
  });

  const marker = MeasureTool.createPointMarker(point, context.editor.camera);

  MeasureState.measureGroup.add(marker);
  requestRender(context.editor);

  if (MeasureState.currentPoints.length === 3) {
    const op = new CreatePerpendicularMeasurement(
      context,
      MeasureState.currentPoints[0].position,
      MeasureState.currentPoints[1].position,
      MeasureState.currentPoints[2].position
    );

    op.execute();

    clearTempVisuals();

    MeasureState.currentPoints = [];
  }
}

function finalizeAreaMeasurement(context) {
  if (MeasureState.currentPoints.length < 3) return;

  const op = new CreateAreaMeasurement(
    context,
    MeasureState.currentPoints.map(p => p.position)
  );

  op.execute();

  clearTempVisuals();

  MeasureState.currentPoints = [];
  requestRender(context.editor);
}
function updateTempLine(endPoint, context) {
  
  if (MeasureState.tempLine) {
    MeasureState.measureGroup.remove(MeasureState.tempLine);

    MeasureState.tempLine.geometry?.dispose();

    MeasureState.tempLine.material?.dispose();
  }

  if (MeasureState.currentPoints.length === 0) return;

  const startPoint = MeasureState.currentPoints[MeasureState.currentPoints.length - 1].position;

  MeasureState.tempLine = MeasureTool.createTempLine(startPoint, endPoint);

  MeasureState.measureGroup.add(MeasureState.tempLine);
  if (MeasureState.tempLabel) {
    MeasureState.measureGroup.remove(MeasureState.tempLabel);
  }

  const distance = startPoint.distanceTo(endPoint);

  const midPoint = new THREE.Vector3().addVectors(startPoint, endPoint).multiplyScalar(0.5);

  MeasureState.tempLabel = MeasureTool.createLabel(`${distance.toFixed(3)} m`, midPoint);

  MeasureState.measureGroup.add(MeasureState.tempLabel);
}

function updateAreaPreview() {
  if (MeasureState.areaPreview) {
    MeasureState.measureGroup.remove(MeasureState.areaPreview);

    MeasureState.areaPreview = null;
  }

  if (MeasureState.currentPoints.length < 3) return;

  const points = MeasureState.currentPoints.map(p => p.position);

  MeasureState.areaPreview = MeasureTool.createAreaPreview(points);

  if (MeasureState.areaPreview) {
    MeasureState.measureGroup.add(MeasureState.areaPreview);
  }
}
function startHandleDrag(handleHit, context) {
  const editor = context.editor;

  const handle = handleHit.handle;

  MeasureState.isDragging = true;

  MeasureState.draggedHandle = handle;

  MeasureState.draggedMeasurement = handleHit.measurement;

  const cameraDir = new THREE.Vector3();

  editor.camera.getWorldDirection(cameraDir);

  MeasureState.dragPlane.setFromNormalAndCoplanarPoint(cameraDir, handle.position);
  const intersectPoint = new THREE.Vector3();

  MeasureState.raycaster.ray.intersectPlane(MeasureState.dragPlane, intersectPoint);

  MeasureState.dragOffset.subVectors(handle.position, intersectPoint);
  editor.renderer.domElement.style.cursor = 'grabbing';
  if (handle.material) {
    handle.userData.originalColor = handle.material.color.getHex();

    handle.material.color.setHex(0xffff00);
  }
}

function updateHandleDrag(context) {
  if (!MeasureState.isDragging || !MeasureState.draggedHandle || !MeasureState.draggedMeasurement) return;

  const editor = context.editor;

  MeasureState.raycaster.setFromCamera(MeasureState.mouse, editor.camera);

  const intersectPoint = new THREE.Vector3();

  if (MeasureState.raycaster.ray.intersectPlane(MeasureState.dragPlane, intersectPoint)) {
    const newPosition = intersectPoint.add(MeasureState.dragOffset);
    if (SnapState.snapOptions.snapEnabled) {
      const snapResult = SnapTool.getSnapPoint({
        raycaster: MeasureState.raycaster,
        mouse: MeasureState.mouse,
        camera: editor.camera,
        scene: editor.scene,
        snapOptions: SnapState.snapOptions,
      });

      if (snapResult) {
        newPosition.copy(snapResult.point);
      }
    }
    MeasureState.draggedHandle.position.copy(newPosition);
    if (MeasureState.draggedMeasurement.type === 'DISTANCE') {
      MeasureTool.updateDistanceMeasurement(
        MeasureState.draggedMeasurement,
        MeasureState.draggedHandle.userData.handleType,
        newPosition
      );
    }
    requestRender(editor);
  }
}

function endHandleDrag(context) {
  if (!MeasureState.isDragging) return;

  const editor = context.editor;
  if (MeasureState.draggedHandle?.material && MeasureState.draggedHandle.userData.originalColor !== undefined) {
    MeasureState.draggedHandle.material.color.setHex(MeasureState.draggedHandle.userData.originalColor);
  }
  if (MeasureState.draggedMeasurement) {
    MeasureState.collection.removeMeasurement(MeasureState.draggedMeasurement.id);

    MeasureState.collection.addMeasurement(MeasureState.draggedMeasurement);
  }
  MeasureState.isDragging = false;

  MeasureState.draggedHandle = null;

  MeasureState.draggedMeasurement = null;

  editor.renderer.domElement.style.cursor = 'crosshair';

  requestRender(editor);
}
export { MeasureState };

const operators = [
  ToggleMeasureTool,
  ActivateMeasureTool,
  DeactivateMeasureTool,
  SetMeasureMode,
  CreateDistanceMeasurement,
  CreateAngleMeasurement,
  CreateAreaMeasurement,
  CreatePerpendicularMeasurement,
  ClearMeasurements,
  DeleteLastMeasurement,
  DeleteMeasurement,
  ExportMeasurements,
  GetMeasurements,
];

export default operators;
