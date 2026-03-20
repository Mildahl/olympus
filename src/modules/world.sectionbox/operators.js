import * as THREE from 'three';

import { Operator } from "../../operators/Operator.js";

import SectionBoxTool from "../../tool/viewer/SectionBoxTool.js";

/**
 * SectionBoxState - Centralized state management for section box
 *
 * All state for the section box tool is managed here.
 * Operators modify this state and UI reads from it.
 */
export const SectionBoxState = {
  
  isActive: false,
  isClippingEnabled: false,
  isBoxVisible: true,
  box: new THREE.Box3(
    new THREE.Vector3(-10, -10, -10),
    new THREE.Vector3(10, 10, 10)
  ),
  sectionGroup: null,
  boxPivot: null,
  boxEdges: null,
  boxMesh: null,
  centerGizmo: null,
  handles: [],
  clipPlanes: [],
  transformGizmo: null,
  gizmoMode: 'translate',
  selectedHandle: null,
  isDragging: false,
  dragPlane: new THREE.Plane(),
  dragOffset: new THREE.Vector3(),
  initialBox: null,
  settings: {
    handleSize: 0.15,
    handleColor: 0x00aaff,
    handleHoverColor: 0xffaa00,
    edgeColor: 0x00ccff,
    edgeOpacity: 1.0,
    showFaces: false,
  },
  handlers: {
    onMouseDown: null,
    onMouseMove: null,
    onMouseUp: null,
    onKeyDown: null,
    onTransformChange: null,
    onDraggingChanged: null,
  },
};
/**
 * Activate the section box
 */
function activateSectionBox(context) {
  if (SectionBoxState.isActive) return;

  const editor = context.editor;

  if (!editor) {
    console.error('SectionBox: No editor available');

    return;
  }

  SectionBoxState.isActive = true;

  SectionBoxState.isBoxVisible = true;
  SectionBoxState.sectionGroup = SectionBoxTool.createSectionGroup(editor.sceneHelpers);

  SectionBoxState.boxPivot = SectionBoxTool.createBoxPivot(SectionBoxState.sectionGroup);
  const center = new THREE.Vector3();

  SectionBoxState.box.getCenter(center);

  SectionBoxState.boxPivot.position.copy(center);
  const visuals = SectionBoxTool.createBoxVisual(
    SectionBoxState.box,
    SectionBoxState.sectionGroup,
    SectionBoxState.settings
  );

  SectionBoxState.boxEdges = visuals.boxEdges;

  SectionBoxState.boxMesh = visuals.boxMesh;
  const size = new THREE.Vector3();

  SectionBoxState.box.getSize(size);

  SectionBoxState.centerGizmo = SectionBoxTool.createCenterGizmo(
    center,
    size,
    SectionBoxState.sectionGroup
  );
  SectionBoxState.handles = SectionBoxTool.createHandles(
    SectionBoxState.box,
    SectionBoxState.sectionGroup,
    SectionBoxState.isBoxVisible
  );
  SectionBoxState.clipPlanes = SectionBoxTool.createClipPlanes(SectionBoxState.box);
  SectionBoxState.transformGizmo = SectionBoxTool.createTransformGizmo(
    editor.camera,
    editor.renderer.domElement,
    SectionBoxState.boxPivot,
    editor.sceneHelpers,
    SectionBoxState.gizmoMode
  );
  SectionBoxState.handlers.onTransformChange = () => {
    onTransformChange(context);
  };

  SectionBoxState.handlers.onDraggingChanged = (event) => {
    if (editor.controls) {
      editor.controls.enabled = !event.value;
    }
  };

  SectionBoxState.transformGizmo.addEventListener('objectChange', SectionBoxState.handlers.onTransformChange);

  SectionBoxState.transformGizmo.addEventListener('dragging-changed', SectionBoxState.handlers.onDraggingChanged);
  SectionBoxState.isClippingEnabled = true;

  SectionBoxTool.enableClipping(
    editor.renderer,
    editor.scene,
    SectionBoxState.clipPlanes,
    true
  );
  SectionBoxState.handlers.onMouseDown = (e) => onMouseDown(e, context);

  SectionBoxState.handlers.onMouseMove = (e) => onMouseMove(e, context);

  SectionBoxState.handlers.onMouseUp = (e) => onMouseUp(e, context);

  SectionBoxState.handlers.onKeyDown = (e) => onKeyDown(e, context);

  editor.renderer.domElement.addEventListener('mousedown', SectionBoxState.handlers.onMouseDown);

  editor.renderer.domElement.addEventListener('mousemove', SectionBoxState.handlers.onMouseMove);

  editor.renderer.domElement.addEventListener('mouseup', SectionBoxState.handlers.onMouseUp);

  document.addEventListener('keydown', SectionBoxState.handlers.onKeyDown);

}

/**
 * Deactivate the section box
 */
function deactivateSectionBox(context) {
  if (!SectionBoxState.isActive) return;

  const editor = context.editor;

  if (!editor) return;

  SectionBoxState.isActive = false;
  if (SectionBoxState.handlers.onMouseDown) {
    editor.renderer.domElement.removeEventListener('mousedown', SectionBoxState.handlers.onMouseDown);
  }

  if (SectionBoxState.handlers.onMouseMove) {
    editor.renderer.domElement.removeEventListener('mousemove', SectionBoxState.handlers.onMouseMove);
  }

  if (SectionBoxState.handlers.onMouseUp) {
    editor.renderer.domElement.removeEventListener('mouseup', SectionBoxState.handlers.onMouseUp);
  }

  if (SectionBoxState.handlers.onKeyDown) {
    document.removeEventListener('keydown', SectionBoxState.handlers.onKeyDown);
  }
  if (SectionBoxState.transformGizmo) {
    SectionBoxState.transformGizmo.removeEventListener('objectChange', SectionBoxState.handlers.onTransformChange);

    SectionBoxState.transformGizmo.removeEventListener('dragging-changed', SectionBoxState.handlers.onDraggingChanged);

    SectionBoxTool.disposeTransformGizmo(SectionBoxState.transformGizmo, editor.sceneHelpers);

    SectionBoxState.transformGizmo = null;
  }
  SectionBoxTool.clearVisuals(SectionBoxState, SectionBoxState.sectionGroup);

  SectionBoxState.boxEdges = null;

  SectionBoxState.boxMesh = null;

  SectionBoxState.centerGizmo = null;

  SectionBoxState.handles = [];
  if (SectionBoxState.sectionGroup) {
    editor.sceneHelpers.remove(SectionBoxState.sectionGroup);

    SectionBoxState.sectionGroup = null;
  }

  SectionBoxState.boxPivot = null;
  SectionBoxState.isClippingEnabled = false;

  SectionBoxTool.enableClipping(
    editor.renderer,
    editor.scene,
    [],
    false
  );

  SectionBoxState.clipPlanes = [];

}
function onTransformChange(context) {
  const center = SectionBoxState.boxPivot.position;

  const size = new THREE.Vector3();

  SectionBoxState.box.getSize(size);
  if (SectionBoxState.gizmoMode === 'scale') {
    const scale = SectionBoxState.boxPivot.scale;

    size.multiply(scale);

    SectionBoxState.boxPivot.scale.set(1, 1, 1);
  }
  const halfSize = size.clone().multiplyScalar(0.5);

  SectionBoxState.box.set(
    center.clone().sub(halfSize),
    center.clone().add(halfSize)
  );
  updateVisualsFromTransform(context);
  if (context.signals.sectionBoxChanged) {
    context.signals.sectionBoxChanged.dispatch(
      SectionBoxTool.getBoxData(
        SectionBoxState.box,
        SectionBoxState.isActive,
        SectionBoxState.isBoxVisible,
        SectionBoxState.isClippingEnabled
      )
    );
  }
}

function updateVisualsFromTransform(context) {
  const editor = context.editor;

  const size = new THREE.Vector3();

  SectionBoxState.box.getSize(size);

  const center = new THREE.Vector3();

  SectionBoxState.box.getCenter(center);
  if (SectionBoxState.boxEdges) {
    SectionBoxState.sectionGroup.remove(SectionBoxState.boxEdges);

    SectionBoxState.boxEdges.geometry.dispose();

    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);

    const edgesGeometry = new THREE.EdgesGeometry(geometry);

    geometry.dispose();

    SectionBoxState.boxEdges.geometry = edgesGeometry;

    SectionBoxState.boxEdges.position.copy(center);
  }
  if (SectionBoxState.centerGizmo) {
    SectionBoxState.centerGizmo.position.copy(center);
  }
  SectionBoxTool.updateClipPlanes(SectionBoxState.clipPlanes, SectionBoxState.box);

  if (SectionBoxState.isClippingEnabled) {
    SectionBoxTool.applyClipPlanesToScene(editor.scene, SectionBoxState.clipPlanes);
  }
  SectionBoxTool.updateHandlePositions(SectionBoxState.handles, SectionBoxState.box);
}

function onMouseDown(event, context) {
  if (!SectionBoxState.isActive) return;

  if (event.button !== 0) return;

  const editor = context.editor;

  const mouse = SectionBoxTool.getMousePosition(event, editor.renderer.domElement);

  const intersects = SectionBoxTool.raycastHandles(mouse, editor.camera, SectionBoxState.handles);

  if (intersects.length > 0) {
    SectionBoxState.selectedHandle = intersects[0].object;

    SectionBoxState.isDragging = true;

    SectionBoxState.initialBox = SectionBoxState.box.clone();
    const def = SectionBoxState.selectedHandle.userData.handleDef;

    SectionBoxState.dragPlane = SectionBoxTool.createDragPlane(def, SectionBoxState.selectedHandle.position);

    SectionBoxState.dragOffset = SectionBoxTool.calculateDragOffset(
      mouse,
      editor.camera,
      SectionBoxState.dragPlane,
      SectionBoxState.selectedHandle.position
    );
    if (editor.controls) {
      editor.controls.enabled = false;
    }

    editor.renderer.domElement.style.cursor = 'grabbing';

    event.stopPropagation();

    event.preventDefault();
  }
}

function onMouseMove(event, context) {
  if (!SectionBoxState.isActive) return;

  const editor = context.editor;

  const mouse = SectionBoxTool.getMousePosition(event, editor.renderer.domElement);

  if (SectionBoxState.isDragging && SectionBoxState.selectedHandle) {
    const newPosition = SectionBoxTool.getDragPosition(
      mouse,
      editor.camera,
      SectionBoxState.dragPlane,
      SectionBoxState.dragOffset
    );

    if (newPosition) {
      const handleDef = SectionBoxState.selectedHandle.userData.handleDef;

      SectionBoxTool.resizeBoxFromHandle(SectionBoxState.box, handleDef, newPosition);

      updateVisuals(context);
    }
  } else {
    
    const intersects = SectionBoxTool.raycastHandles(mouse, editor.camera, SectionBoxState.handles);
    SectionBoxState.handles.forEach(handle => {
      handle.material.color.setHex(handle.userData.originalColor);

      handle.scale.setScalar(1);
    });

    if (intersects.length > 0) {
      const handle = intersects[0].object;

      handle.material.color.setHex(SectionBoxState.settings.handleHoverColor);

      handle.scale.setScalar(1.3);

      editor.renderer.domElement.style.cursor = 'grab';
    } else {
      editor.renderer.domElement.style.cursor = 'default';
    }
  }
}

function onMouseUp(event, context) {
  if (!SectionBoxState.isActive) return;

  const editor = context.editor;

  if (SectionBoxState.isDragging) {
    SectionBoxState.isDragging = false;

    SectionBoxState.selectedHandle = null;

    if (editor.controls) {
      editor.controls.enabled = true;
    }

    editor.renderer.domElement.style.cursor = 'default';
    if (context.signals.sectionBoxChanged) {
      context.signals.sectionBoxChanged.dispatch(
        SectionBoxTool.getBoxData(
          SectionBoxState.box,
          SectionBoxState.isActive,
          SectionBoxState.isBoxVisible,
          SectionBoxState.isClippingEnabled
        )
      );
    }
  }
}

function onKeyDown(event, context) {
  if (!SectionBoxState.isActive) return;

  const operators = context.operators || context.ops;

  switch (event.key.toLowerCase()) {
    case 'escape':
      deactivateSectionBox(context);

      if (context.signals.sectionBoxToggled) {
        context.signals.sectionBoxToggled.dispatch({ isActive: false, boxData: null });
      }

      break;

    case 'r':
      operators?.execute('world.sectionbox.reset', context);

      break;

    case 'f':
      operators?.execute('world.sectionbox.fit_selection', context);

      break;

    case 'a':
      operators?.execute('world.sectionbox.fit_all', context);

      break;

    case 'v':
      operators?.execute('world.sectionbox.toggle_visibility', context);

      break;

    case 'g':
      operators?.execute('world.sectionbox.set_gizmo_mode', context, 'translate');

      break;

    case 's':
      operators?.execute('world.sectionbox.set_gizmo_mode', context, 'scale');

      break;
  }
}

/**
 * Update all visual elements
 */
function updateVisuals(context) {
  const editor = context.editor;

  const size = new THREE.Vector3();

  SectionBoxState.box.getSize(size);

  const center = new THREE.Vector3();

  SectionBoxState.box.getCenter(center);
  if (SectionBoxState.boxEdges) {
    SectionBoxTool.disposeBoxEdges(SectionBoxState.boxEdges, SectionBoxState.sectionGroup);
  }

  if (SectionBoxState.centerGizmo) {
    SectionBoxTool.disposeCenterGizmo(SectionBoxState.centerGizmo, SectionBoxState.sectionGroup);
  }

  SectionBoxTool.disposeHandles(SectionBoxState.handles, SectionBoxState.sectionGroup);
  const visuals = SectionBoxTool.createBoxVisual(
    SectionBoxState.box,
    SectionBoxState.sectionGroup,
    SectionBoxState.settings
  );

  SectionBoxState.boxEdges = visuals.boxEdges;

  SectionBoxState.boxMesh = visuals.boxMesh;

  SectionBoxState.centerGizmo = SectionBoxTool.createCenterGizmo(
    center,
    size,
    SectionBoxState.sectionGroup
  );

  SectionBoxState.handles = SectionBoxTool.createHandles(
    SectionBoxState.box,
    SectionBoxState.sectionGroup,
    SectionBoxState.isBoxVisible
  );
  SectionBoxTool.updateClipPlanes(SectionBoxState.clipPlanes, SectionBoxState.box);

  if (SectionBoxState.isClippingEnabled) {
    SectionBoxTool.applyClipPlanesToScene(editor.scene, SectionBoxState.clipPlanes);
  }
  if (SectionBoxState.boxPivot) {
    SectionBoxState.boxPivot.position.copy(center);
  }
}
/**
 * Toggle Section Box
 */
class ToggleSectionBox extends Operator {
  static operatorName = "world.sectionbox.toggle";

  static operatorLabel = "Toggle Section Box";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;
  }

  poll() {
    return this.context.editor != null;
  }

  execute() {
    if (SectionBoxState.isActive) {
      deactivateSectionBox(this.context);
    } else {
      activateSectionBox(this.context);
    }

    if (this.context.signals.sectionBoxToggled) {
      this.context.signals.sectionBoxToggled.dispatch({
        isActive: SectionBoxState.isActive,
        boxData: SectionBoxState.isActive
          ? SectionBoxTool.getBoxData(
              SectionBoxState.box,
              SectionBoxState.isActive,
              SectionBoxState.isBoxVisible,
              SectionBoxState.isClippingEnabled
            )
          : null,
      });
    }

    return { status: "FINISHED" };
  }
}

/**
 * Activate Section Box
 */
class ActivateSectionBox extends Operator {
  static operatorName = "world.sectionbox.activate";

  static operatorLabel = "Activate Section Box";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;
  }

  poll() {
    return this.context.editor != null;
  }

  execute() {
    activateSectionBox(this.context);

    if (this.context.signals.sectionBoxToggled) {
      this.context.signals.sectionBoxToggled.dispatch({
        isActive: true,
        boxData: SectionBoxTool.getBoxData(
          SectionBoxState.box,
          SectionBoxState.isActive,
          SectionBoxState.isBoxVisible,
          SectionBoxState.isClippingEnabled
        ),
      });
    }

    return { status: "FINISHED" };
  }
}

/**
 * Deactivate Section Box
 */
class DeactivateSectionBox extends Operator {
  static operatorName = "world.sectionbox.deactivate";

  static operatorLabel = "Deactivate Section Box";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;
  }

  poll() {
    return this.context.editor != null;
  }

  execute() {
    deactivateSectionBox(this.context);

    if (this.context.signals.sectionBoxToggled) {
      this.context.signals.sectionBoxToggled.dispatch({
        isActive: false,
        boxData: null,
      });
    }

    return { status: "FINISHED" };
  }
}

/**
 * Reset Section Box to Default
 */
class ResetSectionBox extends Operator {
  static operatorName = "world.sectionbox.reset";

  static operatorLabel = "Reset Section Box";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;
  }

  poll() {
    return SectionBoxState.isActive;
  }

  execute() {
    SectionBoxState.box = SectionBoxTool.createDefaultBox();

    updateVisuals(this.context);

    if (this.context.signals.sectionBoxChanged) {
      this.context.signals.sectionBoxChanged.dispatch(
        SectionBoxTool.getBoxData(
          SectionBoxState.box,
          SectionBoxState.isActive,
          SectionBoxState.isBoxVisible,
          SectionBoxState.isClippingEnabled
        )
      );
    }

    return { status: "FINISHED" };
  }
}

/**
 * Fit Section Box to Selection
 */
class FitSectionBoxToSelection extends Operator {
  static operatorName = "world.sectionbox.fit_selection";

  static operatorLabel = "Fit Section Box to Selection";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;
  }

  poll() {
    return SectionBoxState.isActive && this.context.editor?.selector?.selectedObjects?.length > 0;
  }

  execute() {
    const selected = this.context.editor.selector.selectedObjects;

    const newBox = SectionBoxTool.fitToSelection(selected, 0.5);

    if (newBox) {
      SectionBoxState.box.copy(newBox);

      updateVisuals(this.context);

      if (this.context.signals.sectionBoxChanged) {
        this.context.signals.sectionBoxChanged.dispatch(
          SectionBoxTool.getBoxData(
            SectionBoxState.box,
            SectionBoxState.isActive,
            SectionBoxState.isBoxVisible,
            SectionBoxState.isClippingEnabled
          )
        );
      }

    }

    return { status: "FINISHED" };
  }
}

/**
 * Fit Section Box to All Objects
 */
class FitSectionBoxToAll extends Operator {
  static operatorName = "world.sectionbox.fit_all";

  static operatorLabel = "Fit Section Box to All";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;
  }

  poll() {
    return SectionBoxState.isActive && this.context.editor != null;
  }

  execute() {
    const newBox = SectionBoxTool.fitToAll(this.context.editor.scene, 1);

    if (newBox) {
      SectionBoxState.box.copy(newBox);

      updateVisuals(this.context);

      if (this.context.signals.sectionBoxChanged) {
        this.context.signals.sectionBoxChanged.dispatch(
          SectionBoxTool.getBoxData(
            SectionBoxState.box,
            SectionBoxState.isActive,
            SectionBoxState.isBoxVisible,
            SectionBoxState.isClippingEnabled
          )
        );
      }

    }

    return { status: "FINISHED" };
  }
}

/**
 * Set Section Box from Values
 */
class SetSectionBox extends Operator {
  static operatorName = "world.sectionbox.set_box";

  static operatorLabel = "Set Section Box";

  static operatorOptions = ["REGISTER"];

  constructor(context, min, max) {
    super(context);

    this.context = context;

    this.min = min;

    this.max = max;
  }

  poll() {
    return this.min && this.max;
  }

  execute() {
    SectionBoxState.box.set(this.min, this.max);

    if (SectionBoxState.isActive) {
      updateVisuals(this.context);
    }

    if (this.context.signals.sectionBoxChanged) {
      this.context.signals.sectionBoxChanged.dispatch(
        SectionBoxTool.getBoxData(
          SectionBoxState.box,
          SectionBoxState.isActive,
          SectionBoxState.isBoxVisible,
          SectionBoxState.isClippingEnabled
        )
      );
    }

    return { status: "FINISHED" };
  }
}

/**
 * Export Section Box
 */
class ExportSectionBox extends Operator {
  static operatorName = "world.sectionbox.export";

  static operatorLabel = "Export Section Box";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;
  }

  poll() {
    return true;
  }

  execute() {
    SectionBoxTool.downloadSectionBox(
      SectionBoxState.box,
      SectionBoxState.isActive,
      SectionBoxState.isBoxVisible,
      'section_box.json'
    );

    return { status: "FINISHED" };
  }
}

/**
 * Import Section Box
 */
class ImportSectionBox extends Operator {
  static operatorName = "world.sectionbox.import";

  static operatorLabel = "Import Section Box";

  static operatorOptions = ["REGISTER"];

  constructor(context, json) {
    super(context);

    this.context = context;

    this.json = json;
  }

  poll() {
    return this.json != null;
  }

  execute() {
    const data = SectionBoxTool.importSectionBox(this.json);

    if (data) {
      SectionBoxState.box.set(data.min, data.max);

      if (SectionBoxState.isActive) {
        updateVisuals(this.context);
      }

      if (data.isActive && !SectionBoxState.isActive) {
        activateSectionBox(this.context);
      }

      if (typeof data.isBoxVisible === 'boolean') {
        SectionBoxState.isBoxVisible = data.isBoxVisible;

        SectionBoxTool.updateVisibility(
          {
            boxEdges: SectionBoxState.boxEdges,
            boxMesh: SectionBoxState.boxMesh,
            handles: SectionBoxState.handles,
            centerGizmo: SectionBoxState.centerGizmo,
            transformGizmo: SectionBoxState.transformGizmo,
          },
          SectionBoxState.isBoxVisible,
          SectionBoxState.settings.showFaces
        );
      }

      if (this.context.signals.sectionBoxChanged) {
        this.context.signals.sectionBoxChanged.dispatch(
          SectionBoxTool.getBoxData(
            SectionBoxState.box,
            SectionBoxState.isActive,
            SectionBoxState.isBoxVisible,
            SectionBoxState.isClippingEnabled
          )
        );
      }

      return { status: "FINISHED" };
    }

    return { status: "CANCELLED" };
  }
}

/**
 * Toggle Section Box Visibility
 */
class ToggleSectionBoxVisibility extends Operator {
  static operatorName = "world.sectionbox.toggle_visibility";

  static operatorLabel = "Toggle Section Box Visibility";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;
  }

  poll() {
    return SectionBoxState.isActive;
  }

  execute() {
    SectionBoxState.isBoxVisible = !SectionBoxState.isBoxVisible;

    SectionBoxTool.updateVisibility(
      {
        boxEdges: SectionBoxState.boxEdges,
        boxMesh: SectionBoxState.boxMesh,
        handles: SectionBoxState.handles,
        centerGizmo: SectionBoxState.centerGizmo,
        transformGizmo: SectionBoxState.transformGizmo,
      },
      SectionBoxState.isBoxVisible,
      SectionBoxState.settings.showFaces
    );

    if (this.context.signals.sectionBoxChanged) {
      this.context.signals.sectionBoxChanged.dispatch(
        SectionBoxTool.getBoxData(
          SectionBoxState.box,
          SectionBoxState.isActive,
          SectionBoxState.isBoxVisible,
          SectionBoxState.isClippingEnabled
        )
      );
    }

    return { status: "FINISHED", data: { isVisible: SectionBoxState.isBoxVisible } };
  }
}

/**
 * Toggle Section Box Clipping
 */
class ToggleSectionBoxClipping extends Operator {
  static operatorName = "world.sectionbox.toggle_clipping";

  static operatorLabel = "Toggle Section Box Clipping";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;
  }

  poll() {
    return SectionBoxState.isActive && this.context.editor != null;
  }

  execute() {
    SectionBoxState.isClippingEnabled = !SectionBoxState.isClippingEnabled;

    const editor = this.context.editor;

    SectionBoxTool.enableClipping(
      editor.renderer,
      editor.scene,
      SectionBoxState.clipPlanes,
      SectionBoxState.isClippingEnabled
    );

    if (this.context.signals.sectionBoxChanged) {
      this.context.signals.sectionBoxChanged.dispatch(
        SectionBoxTool.getBoxData(
          SectionBoxState.box,
          SectionBoxState.isActive,
          SectionBoxState.isBoxVisible,
          SectionBoxState.isClippingEnabled
        )
      );
    }

    return { status: "FINISHED", data: { isClipping: SectionBoxState.isClippingEnabled } };
  }
}

/**
 * Set Section Box Gizmo Mode
 */
class SetSectionBoxGizmoMode extends Operator {
  static operatorName = "world.sectionbox.set_gizmo_mode";

  static operatorLabel = "Set Section Box Gizmo Mode";

  static operatorOptions = ["REGISTER"];

  constructor(context, mode) {
    super(context);

    this.context = context;

    this.mode = mode || 'translate';
  }

  poll() {
    
    return true;
  }

  execute() {
    
    SectionBoxState.gizmoMode = this.mode;
    if (SectionBoxState.transformGizmo) {
      SectionBoxState.transformGizmo.setMode(this.mode);
    }

    return { status: "FINISHED", data: { mode: this.mode } };
  }
}

const operators = [
  ToggleSectionBox,
  ActivateSectionBox,
  DeactivateSectionBox,
  ResetSectionBox,
  FitSectionBoxToSelection,
  FitSectionBoxToAll,
  SetSectionBox,
  ExportSectionBox,
  ImportSectionBox,
  ToggleSectionBoxVisibility,
  ToggleSectionBoxClipping,
  SetSectionBoxGizmoMode,
];

export default operators;
