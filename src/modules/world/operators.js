import { Operator } from "../../operators/Operator.js";

import AECO_TOOLS from "../../tool/index.js";

import * as WorldCore from "../../core/world.js";

import { WorldStructure } from "./data/layers.config.js";

function getIsolatableObjects(editor) {
  const selectedObjects = editor.selector.selected_objects || [];
  const highlightedObjects = editor.getHighlightedObjects?.() || [];
  const uniqueObjects = new Map();

  for (const object of [...selectedObjects, ...highlightedObjects]) {
    if (!object?.uuid) continue;

    uniqueObjects.set(object.uuid, object);
  }

  return Array.from(uniqueObjects.values());
}

function isSameIsolationTargetSet(editor, objects) {
  const currentTargetIds = new Set(editor.getIsolationTargetIds?.() || []);

  if (currentTargetIds.size !== objects.length) {
    return false;
  }

  return objects.every((object) => currentTargetIds.has(object.uuid));
}

class CreateWorld extends Operator {
  static operatorName = "world.create_world_layers";

  static operatorLabel = "Operator CreateWorld";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;

    this.mode = "full";
  }

  poll() {
    return this.context;
  }

  execute() {
    
    const world = this.context.editor.sceneLayers.World;

    const worldDataCollection = WorldCore.initWorld(world, {
      layerTool: AECO_TOOLS.world.layer,
      signals: this.context.signals
    });

    WorldCore.createWorldStructure(WorldStructure.full, {
      layerTool: AECO_TOOLS.world.layer,
      sceneTool: AECO_TOOLS.world.scene,
      context: this.context,
    });

    return { status: "FINISHED" };
  }
}

class FocusOnSelection extends Operator {
  static operatorName = "viewer.focus_on_selection";

  static operatorLabel = "Focus on Selection";

  execute() {

    const selectedObject = this.context.editor.selector.active_object;

    if (selectedObject) this.context.editor.signals.objectFocused.dispatch(selectedObject);

    return { status: "FINISHED" };
  }
}

class IsolateElements extends Operator {
  static operatorName = "viewer.isolate_elements";

  static operatorLabel = "Isolate Elements";

  poll() {
    const editor = this.context.editor;

    return editor.isIsolated() || getIsolatableObjects(editor).length > 0;
  }

  execute() {
    const editor = this.context.editor;

    const targetObjects = getIsolatableObjects(editor);

    if (targetObjects.length === 0) {
      if (editor.isIsolated()) {
        editor.unisolateObjects();

        return { status: "FINISHED" };
      }

      console.warn("No selected or highlighted objects to isolate");

      return { status: "CANCELLED" };
    }

    if (editor.isIsolated() && isSameIsolationTargetSet(editor, targetObjects)) {
      editor.unisolateObjects();

      return { status: "FINISHED" };
    }

    if (editor.isIsolated()) {
      editor.unisolateObjects();
    }

    editor.isolateObjects(targetObjects);

    return { status: "FINISHED" };
  }

  undo() {
    const editor = this.context.editor;
    editor.unisolateObjects();

    return { status: "FINISHED" };
  }
}

class UnisolateElements extends Operator {
  static operatorName = "viewer.unisolate_elements";

  static operatorLabel = "Unisolate Elements (Undo Isolation)";

  execute() {
    const editor = this.context.editor;

    if (!editor.isIsolated()) {
      console.warn("Scene is not in isolated state");

      return { status: "CANCELLED" };
    }
    editor.unisolateObjects();

    return { status: "FINISHED" };
  }
}

class ShowAllElements extends Operator {
  static operatorName = "viewer.show_all_elements";

  static operatorLabel = "Show All Elements";

  execute() {
    const editor = this.context.editor;
    editor.showAllObjects();

    return { status: "FINISHED" };
  }
}

class SelectAll extends Operator {
  static operatorName = "viewer.select_all";

  static operatorLabel = "Select All";

  execute() {
    const editor = this.context.editor;

    const allObjects = [];

    editor.scene.traverse((object) => {
      allObjects.push(object);
    });

    editor.selected = allObjects;

    return { status: "FINISHED" };
  }
}

class DeselectAll extends Operator {
  static operatorName = "viewer.deselect_all";

  static operatorLabel = "Deselect All";

  execute() {
    const editor = this.context.editor;

    editor.selected = null;

    editor.signals.objectSelected.dispatch(null);

    return { status: "FINISHED" };
  }
}

function isLikelyIfcExpressIdString(value) {
  return typeof value === "string" && /^\d+$/.test(value);
}

class SelectObjectsByGuid extends Operator {
  static operatorName = "viewer.select_objects_by_guid";

  static operatorLabel = "Select Objects by IFC GlobalId";

  static operatorOptions = ["REGISTER"];

  static operatorDescription =
    "Uses SceneTool.selectObjectsByGuid. Pass IFC GlobalIds (22-character strings from attribute GlobalId), not STEP element_id integers from ifc_info. Purely numeric strings are treated as express ids and mapped via the active model when Python/BIM is available.";

  static operatorParams = {
    globalIds: {
      type: "array",
      items: { type: "string" },
      description:
        "IFC GlobalId strings for the 3D view. Do not use ifc_info element_id numbers unless you pass them as decimal strings; prefer GlobalId from tool output.",
    },
  };

  constructor(context, globalIds) {
    super(context);

    this.context = context;

    this.globalIds = globalIds;
  }

  poll() {
    return this.context?.editor;
  }

  async execute() {
    const rawValues = Array.isArray(this.globalIds)
      ? this.globalIds.filter((value) => typeof value === "string" && value.length > 0)
      : [];

    if (rawValues.length === 0) {
      return { status: "CANCELLED", message: "globalIds required" };
    }

    const modelName = this.context.ifc?.activeModel ?? null;

    const resolvedGlobalIds = [];

    const expressIdFailures = [];

    for (const value of rawValues) {
      if (isLikelyIfcExpressIdString(value)) {
        if (!modelName) {
          expressIdFailures.push(value);

          continue;
        }

        const globalId = await AECO_TOOLS.bim.ifc.getGLobalId(modelName, Number(value));

        if (typeof globalId === "string" && globalId.length > 0) {
          resolvedGlobalIds.push(globalId);
        } else {
          expressIdFailures.push(value);
        }
      } else {
        resolvedGlobalIds.push(value);
      }
    }

    if (resolvedGlobalIds.length === 0) {
      const detail =
        expressIdFailures.length > 0 && !modelName
          ? " Numeric ids need an active IFC model and BIM worker to map express id to GlobalId."
          : expressIdFailures.length > 0
            ? " Could not map some express ids to GlobalId."
            : "";

      return {
        status: "CANCELLED",
        message: `No scene objects matched.${detail}`,
        expressIdFailures,
      };
    }

    AECO_TOOLS.world.scene.selectObjectsByGuid(resolvedGlobalIds);

    return {
      status: "FINISHED",
      globalIdCount: resolvedGlobalIds.length,
      requestedCount: rawValues.length,
      expressIdFailures: expressIdFailures.length > 0 ? expressIdFailures : undefined,
    };
  }
}

class SetView extends Operator {
  static operatorName = "viewer.set_view";

  static operatorLabel = "Set View";

  execute({ position, target }) {
    const editor = this.context.editor;

    editor.setView({ position, target });

    return { status: "FINISHED" };
  }
}

class DimElements extends Operator {
  static operatorName = "viewer.dim_elements";

  static operatorLabel = "Dim Elements";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;
  }

  poll() {
    const selectedObjects = this.context.editor.selector.selected_objects;
    
    return selectedObjects && selectedObjects.length > 0;
  }

  execute() {
    this.objects = this.context.editor.selector.selected_objects;

    WorldCore.dimScene("on", {
      context: this.context,
      sceneTool: AECO_TOOLS.world.scene,
      objects: this.objects,
    });

    return { status: "FINISHED" };
  }

  undo() {
    WorldCore.dimScene("off", {
      context: this.context,
      sceneTool: AECO_TOOLS.world.scene,
      objects: this.objects,
    });

    return { status: "FINISHED" };
  }
}

class UndimElements extends Operator {
  static operatorName = "viewer.undim_elements";

  static operatorLabel = "Undim Elements";

  static operatorOptions = ["REGISTER"];

  constructor(context, objects = null) {
    super(context);

    this.context = context;

    this.objects = objects;
  }

  execute() {

    WorldCore.dimScene("off", {
      context: this.context,
      sceneTool: AECO_TOOLS.world.scene,
      objects: this.objects,
    });

    return { status: "FINISHED" };
  }
}

class HighlightElements extends Operator {
  static operatorName = "viewer.highlight_elements";

  static operatorLabel = "Highlight Elements";

  static operatorOptions = ["REGISTER"];

  constructor(context, objects = null) {
    super(context);

    this.context = context;

    this.objects = objects || this.context.editor.selector.selected_objects;
  }

  execute() {

    const result = WorldCore.highlightScene("on", {
      context: this.context,
      sceneTool: AECO_TOOLS.world.scene,
      objects: this.objects,
    });

    if (result === null) {
      return { status: "CANCELLED" };
    }

    return { status: "FINISHED" };
  }

  undo() {
    WorldCore.highlightScene("off", {
      context: this.context,
      sceneTool: AECO_TOOLS.world.scene,
      objects: this.objects,
    });

    return { status: "FINISHED" };
  }
}

class UnhighlightElements extends Operator {
  static operatorName = "viewer.unhighlight_elements";

  static operatorLabel = "Unhighlight Elements";

  static operatorOptions = ["REGISTER"];

  execute() {
    WorldCore.highlightScene("off", {
      context: this.context,
      sceneTool: AECO_TOOLS.world.scene,
    });

    return { status: "FINISHED" };
  }
}

export default [
  CreateWorld,
  FocusOnSelection,
  IsolateElements,
  UnisolateElements,
  ShowAllElements,
  SelectAll,
  DeselectAll,
  SelectObjectsByGuid,
  SetView,
  DimElements,
  UndimElements,
  HighlightElements,
  UnhighlightElements,
];