import { Operator } from "../../operators/Operator.js";

import AECO_TOOLS from "../../tool/index.js";

import * as ViewpointCore from "../../core/viewpoint.js";

class CreateViewpoint extends Operator {
  static operatorName = "viewpoint.create";

  static operatorLabel = "Create Viewpoint";

  static operatorOptions = ["REGISTER"];

  constructor(context, name = 'New Viewpoint') {
    super(context);

    this.context = context;

    this.name = name;
  }

  poll() {
    return this.context?.editor;
  }

  execute() {
    const viewpoint = ViewpointCore.create(this.name, {
      viewpointTool: AECO_TOOLS.world.viewpoint,
      context: this.context
    });

    return { status: "FINISHED", viewpoint };
  }
}

class RemoveViewpoint extends Operator {
  static operatorName = "viewpoint.remove";

  static operatorLabel = "Remove Viewpoint";

  static operatorOptions = ["REGISTER"];

  constructor(context, GlobalId) {
    super(context);

    this.context = context;

    this.GlobalId = GlobalId;
  }

  poll() {
    return this.context && this.GlobalId;
  }

  execute() {
    const result = ViewpointCore.remove(this.GlobalId, {
      viewpointTool: AECO_TOOLS.world.viewpoint,
      context: this.context
    });

    return { status: "FINISHED", removed: result };
  }
}

class RenameViewpoint extends Operator {
  static operatorName = "viewpoint.rename";

  static operatorLabel = "Rename Viewpoint";

  static operatorOptions = ["REGISTER"];

  constructor(context, GlobalId, newName) {
    super(context);

    this.context = context;

    this.GlobalId = GlobalId;

    this.newName = newName;
  }

  poll() {
    return this.context && this.GlobalId && this.newName;
  }

  execute() {
    const result = ViewpointCore.rename(this.GlobalId, this.newName, {
      viewpointTool: AECO_TOOLS.world.viewpoint,
      context: this.context
    });

    return { status: "FINISHED", renamed: result };
  }
}

class UpdateViewpointPosition extends Operator {
  static operatorName = "viewpoint.update_position";

  static operatorLabel = "Update Viewpoint Camera Position";

  static operatorOptions = ["REGISTER"];

  constructor(context, GlobalId, { x, y, z }) {
    super(context);

    this.context = context;

    this.GlobalId = GlobalId;

    this.x = x;

    this.y = y;

    this.z = z;
  }

  poll() {
    return this.context && this.GlobalId;
  }

  execute() {
    const result = ViewpointCore.updatePosition(this.GlobalId, this.x, this.y, this.z, {
      viewpointTool: AECO_TOOLS.world.viewpoint,
      context: this.context
    });

    return { status: "FINISHED", updated: result };
  }
}

class UpdateViewpointTarget extends Operator {
  static operatorName = "viewpoint.update_target";

  static operatorLabel = "Update Viewpoint Camera Target";

  static operatorOptions = ["REGISTER"];

  constructor(context, GlobalId, { x, y, z }) {
    super(context);

    this.context = context;

    this.GlobalId = GlobalId;

    this.x = x;

    this.y = y;

    this.z = z;
  }

  poll() {
    return this.context && this.GlobalId;
  }

  execute() {
    const result = ViewpointCore.updateTarget(this.GlobalId, this.x, this.y, this.z, {
      viewpointTool: AECO_TOOLS.world.viewpoint,
      context: this.context
    });

    return { status: "FINISHED", updated: result };
  }
}

class UpdateViewpointFromEditor extends Operator {
  static operatorName = "viewpoint.update_from_editor";

  static operatorLabel = "Update Viewpoint From Current View";

  static operatorOptions = ["REGISTER"];

  constructor(context, GlobalId) {
    super(context);

    this.context = context;

    this.GlobalId = GlobalId;
  }

  poll() {
    return this.context?.editor && this.GlobalId;
  }

  execute() {
    const result = ViewpointCore.updateFromEditor(this.GlobalId, {
      viewpointTool: AECO_TOOLS.world.viewpoint,
      context: this.context
    });

    return { status: "FINISHED", updated: result };
  }
}

class ActivateViewpoint extends Operator {
  static operatorName = "viewpoint.activate";

  static operatorLabel = "Activate Viewpoint";

  static operatorOptions = ["REGISTER"];

  constructor(context, GlobalId, animate = true) {
    super(context);

    this.context = context;

    this.GlobalId = GlobalId;

    this.animate = animate;
  }

  poll() {
    return this.context?.editor && this.GlobalId;
  }

  execute() {
    const viewpoint = ViewpointCore.activate(this.GlobalId, this.animate, {
      viewpointTool: AECO_TOOLS.world.viewpoint,
      context: this.context
    });

    return { status: "FINISHED", viewpoint };
  }
}

class NavigateViewpointBack extends Operator {
  static operatorName = "viewpoint.navigate_back";

  static operatorLabel = "Navigate Back";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;
  }

  poll() {
    return this.context?.editor && AECO_TOOLS.world.viewpoint.canNavigateBack();
  }

  execute() {
    const viewpoint = ViewpointCore.navigateBack({
      viewpointTool: AECO_TOOLS.world.viewpoint,
      context: this.context
    });

    return { status: "FINISHED", viewpoint };
  }
}

class NavigateViewpointForward extends Operator {
  static operatorName = "viewpoint.navigate_forward";

  static operatorLabel = "Navigate Forward";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;
  }

  poll() {
    return this.context?.editor && AECO_TOOLS.world.viewpoint.canNavigateForward();
  }

  execute() {
    const viewpoint = ViewpointCore.navigateForward({
      viewpointTool: AECO_TOOLS.world.viewpoint,
      context: this.context
    });

    return { status: "FINISHED", viewpoint };
  }
}

class ClearViewpointHistory extends Operator {
  static operatorName = "viewpoint.clear_history";

  static operatorLabel = "Clear Navigation History";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;
  }

  poll() {
    return !!this.context;
  }

  execute() {
    ViewpointCore.clearHistory({
      viewpointTool: AECO_TOOLS.world.viewpoint,
      context: this.context
    });

    return { status: "FINISHED" };
  }
}

class GetViewpoint extends Operator {
  static operatorName = "viewpoint.get";

  static operatorLabel = "Get Viewpoint";

  static operatorOptions = ["REGISTER"];

  constructor(context, GlobalId) {
    super(context);

    this.context = context;

    this.GlobalId = GlobalId;
  }

  poll() {
    return this.context && this.GlobalId;
  }

  execute() {
    const viewpoint = AECO_TOOLS.world.viewpoint.get(this.GlobalId);

    return { status: "FINISHED", viewpoint };
  }
}

class GetViewpointByName extends Operator {
  static operatorName = "viewpoint.get_by_name";

  static operatorLabel = "Get Viewpoint By Name";

  static operatorOptions = ["REGISTER"];

  constructor(context, name) {
    super(context);

    this.context = context;

    this.name = name;
  }

  poll() {
    return this.context && this.name;
  }

  execute() {
    const viewpoint = AECO_TOOLS.world.viewpoint.getByName(this.name);

    return { status: "FINISHED", viewpoint };
  }
}

class ExportViewpoints extends Operator {
  static operatorName = "viewpoint.export";

  static operatorLabel = "Export Viewpoints";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;
  }

  poll() {
    return !!this.context;
  }

  execute() {
    const data = ViewpointCore.exportJSON({
      viewpointTool: AECO_TOOLS.world.viewpoint
    });

    return { status: "FINISHED", data };
  }
}

class ImportViewpoints extends Operator {
  static operatorName = "viewpoint.import";

  static operatorLabel = "Import Viewpoints";

  static operatorOptions = ["REGISTER"];

  constructor(context, data) {
    super(context);

    this.context = context;

    this.data = data;
  }

  poll() {
    return this.context && this.data;
  }

  execute() {
    const collection = ViewpointCore.importJSON(this.data, {
      viewpointTool: AECO_TOOLS.world.viewpoint,
      context: this.context
    });

    return { status: "FINISHED", collection };
  }
}
class ToggleViewpointVisibility extends Operator {
  static operatorName = "viewpoint.toggle_visibility";

  static operatorLabel = "Toggle Viewpoint Visibility";

  static operatorOptions = ["REGISTER"];

  constructor(context, GlobalId, settings = {}) {
    super(context);

    this.context = context;

    this.GlobalId = GlobalId;

    this.settings = settings;
  }

  poll() {
    return this.context && this.GlobalId;
  }

  execute() {
    
    const result = ViewpointCore.toggleVisibility(this.GlobalId, this.settings, {
      viewpointTool: AECO_TOOLS.world.viewpoint,
      context: this.context
    });

    return { status: "FINISHED", toggled: result };
  }
}

export default [
  CreateViewpoint,
  RemoveViewpoint,
  RenameViewpoint,
  UpdateViewpointPosition,
  UpdateViewpointTarget,
  UpdateViewpointFromEditor,
  ActivateViewpoint,
  NavigateViewpointBack,
  NavigateViewpointForward,
  ClearViewpointHistory,
  GetViewpoint,
  GetViewpointByName,
  ExportViewpoints,
  ImportViewpoints,
  ToggleViewpointVisibility
];