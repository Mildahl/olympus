import { Operator } from "../../operators/Operator.js";

import * as SpatialCore from "../../core/spatial.js";
class Spatial_Open extends Operator {
  static operatorName = "spatial.open";

  static operatorLabel = "Open Spatial Manager";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;
  }

  poll() {
    return this.context;
  }

  execute() {
    const result = SpatialCore.openSpatialManager({
      signals: this.context.signals
    });

    return result;
  }
}

class Spatial_EnableEditing extends Operator {
  static operatorName = "spatial.enable_editing";

  static operatorLabel = "Enable Spatial Editing";

  static operatorOptions = ["REGISTER"];

  constructor(context, layerGuid = null) {
    super(context);

    this.context = context;

    this.layerGuid = layerGuid;
  }

  poll() {
    return this.context;
  }

  execute() {
    const result = SpatialCore.enableEditingForLayer(this.layerGuid, {
      signals: this.context.signals
    });

    return result;
  }
}

class Spatial_Refresh extends Operator {
  static operatorName = "spatial.refresh";

  static operatorLabel = "Refresh Spatial Manager";

  static operatorOptions = ["REGISTER"];

  constructor(context, layerGuid = null) {
    super(context);

    this.context = context;

    this.layerGuid = layerGuid;
  }

  poll() {
    return this.context.editor;
  }

  execute() {
    const result = SpatialCore.refreshSpatialManager(this.layerGuid, {
      editor: this.context.editor
    });

    return result;
  }
}
class Spatial_CollapseAll extends Operator {
  static operatorName = "spatial.collapse_all";

  static operatorLabel = "Collapse All Spatial Tree";

  static operatorOptions = ["REGISTER"];

  constructor(context, args = {}) {
    super(context);

    this.context = context;

    this.args = args;
  }

  poll() {
    return this.context.editor;
  }

  execute() {
    SpatialCore.collapseAllNodes({
      signals: this.context.signals
    });

    return { status: "FINISHED" };
  }
}

class Spatial_ExpandAll extends Operator {
  static operatorName = "spatial.expand_all";

  static operatorLabel = "Expand Spatial Tree";

  static operatorOptions = ["REGISTER"];

  constructor(context, args = {}) {
    super(context);

    this.context = context;

    this.args = args;
  }

  poll() {
    return this.context.editor;
  }

  execute() {
    SpatialCore.expandAllNodes({
      signals: this.context.signals
    });

    return { status: "FINISHED" };
  }
}

class Spatial_MoveObject extends Operator {
  static operatorName = "spatial.move_object";

  static operatorLabel = "Move Object";

  static operatorOptions = ["REGISTER"];

  constructor(context, args = {}) {
    super(context);

    this.context = context;

    this.args = args;
  }

  execute() {
    const { objectId, newParentId, nextObjectId } = this.args;

    const scene = this.context.editor.scene;

    const object = scene.getObjectById(objectId);

    const newParent = scene.getObjectById(newParentId);

    const nextObject = nextObjectId ? scene.getObjectById(nextObjectId) : undefined;

    if (!object || !newParent) {
        console.warn("MoveObject: Object or Parent not found");

        return { status: "ERROR" };
    }

    let newParentIsChild = false;

    object.traverse((child) => {
        if (child === newParent) newParentIsChild = true;
    });

    if (newParentIsChild) {
        console.warn("MoveObject: Cannot move object into its own child");

        return { status: "ERROR" };
    }

    if (object.parent !== null) {
        object.parent.remove(object);
    }

    newParent.add(object);

    if (nextObject) {
        const index = newParent.children.indexOf(nextObject);

        if (index !== -1) {
            const currentIndex = newParent.children.indexOf(object);

            newParent.children.splice(currentIndex, 1);

            newParent.children.splice(index, 0, object);
        }
    }

    this.context.editor.signals.sceneGraphChanged.dispatch();

    return { status: "FINISHED" };
  }
}

class Spatial_Select extends Operator {
  static operatorName = "spatial.select";

  static operatorLabel = "Select Object in Spatial Tree";

  static operatorOptions = ["REGISTER"];

  constructor(context, args = {}) {
    super(context);

    this.context = context;

    this.args = args;
  }

  execute() {
    const { GlobalId, additive = false } = this.args;

    const result = SpatialCore.selectObject(GlobalId, additive, {
      editor: this.context.editor,
      signals: this.context.signals
    });

    return { status: "FINISHED", result };
  }
}

export default [ Spatial_Open, Spatial_EnableEditing, Spatial_Refresh, Spatial_CollapseAll, Spatial_ExpandAll, Spatial_MoveObject, Spatial_Select ];