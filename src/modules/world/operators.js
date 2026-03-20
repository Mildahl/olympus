import { Operator } from "../../operators/Operator.js";

import AECO_tools from "../../tool/index.js";

import * as WorldCore from "../../core/world.js";

import { WorldStructure } from "./data/layers.config.js";
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
    
    const editor = this.context.editor;

    const world = editor.sceneLayers.World;
    const worldDataCollection = WorldCore.initWorld(world, {
      layerTool: AECO_tools.world.layer,
      signals: this.context.signals
    });
    WorldCore.createWorldStructure(WorldStructure.full, {
      layerTool: AECO_tools.world.layer,
      sceneTool: AECO_tools.world.scene,
      context: this.context,
    });

    return { status: "FINISHED" };
  }
}

class FocusOnSelection extends Operator {
  static operatorName = "viewer.focus_on_selection";

  static operatorLabel = "Focus on Selection";

  execute() {
    const editor = this.context.editor;

    const selectedObject = editor.selector.active_object;

    if (selectedObject) {
      editor.signals.objectFocused.dispatch(selectedObject);
    }

    return { status: "FINISHED" };
  }
}

class IsolateElements extends Operator {
  static operatorName = "viewer.isolate_elements";

  static operatorLabel = "Isolate Elements";

  execute() {
    const editor = this.context.editor;
    if (editor.isIsolated()) {
      editor.unisolateObjects();
      return { status: "FINISHED" };
    }

    const selectedObjects = editor.selector.selected_objects;

    if (!selectedObjects || selectedObjects.length === 0) {
      console.warn("No objects selected to isolate");

      return { status: "CANCELLED" };
    }

    editor.isolateObjects(selectedObjects);

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

class SetView extends Operator {
  static operatorName = "viewer.set_view";

  static operatorLabel = "Set View";

  execute({ position, target }) {
    const editor = this.context.editor;

    editor.setView({ position, target });

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
  SetView
];