import { Operator } from "../../operators/Operator.js";

import AECO_TOOLS from "../../tool/index.js";

import * as AnimationPathCore from "../../core/animationPath.js";

/**
 * CreateAnimationPath - Create a new animation path
 */
class CreateAnimationPath extends Operator {
  static operatorName = "animationPath.create";

  static operatorLabel = "Create Animation Path";

  static operatorOptions = ["REGISTER"];

  constructor(context, name = 'New Animation Path') {
    super(context);

    this.context = context;

    this.name = name;
  }

  poll() {
    return this.context?.editor;
  }

  execute() {
    const path = AnimationPathCore.create(this.name, {
      animationPathTool: AECO_TOOLS.world.animationPath,
      context: this.context,
      signals: this.context.signals
    });

    return { status: "FINISHED", path };
  }
}

/**
 * RemoveAnimationPath - Remove an animation path by ID
 */
class RemoveAnimationPath extends Operator {
  static operatorName = "animationPath.remove";

  static operatorLabel = "Remove Animation Path";

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
    const result = AnimationPathCore.remove(this.GlobalId, {
      animationPathTool: AECO_TOOLS.world.animationPath,
      context: this.context,
      signals: this.context.signals
    });

    return { status: "FINISHED", removed: result };
  }
}

/**
 * RenameAnimationPath - Rename an animation path
 */
class RenameAnimationPath extends Operator {
  static operatorName = "animationPath.rename";

  static operatorLabel = "Rename Animation Path";

  static operatorOptions = ["REGISTER"];

  constructor(context, GlobalId, newName) {
    super(context);

    this.context = context;

    this.GlobalId = GlobalId;

    this.newName = newName;
  }

  poll() {
    return this.context?.editor && this.GlobalId && this.newName;
  }

  execute() {
    const result = AnimationPathCore.rename(this.GlobalId, this.newName, {
      animationPathTool: AECO_TOOLS.world.animationPath,
      context: this.context,
      signals: this.context.signals
    });

    return { status: "FINISHED", renamed: result };
  }
}

/**
 * ActivateAnimationPath - Activate an animation path for visualization
 */
class ActivateAnimationPath extends Operator {
  static operatorName = "animationPath.activate";

  static operatorLabel = "Activate Animation Path";

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
    const result = AnimationPathCore.activate(this.GlobalId, {
      animationPathTool: AECO_TOOLS.world.animationPath,
      context: this.context,
      signals: this.context.signals
    });

    return { status: "FINISHED", activated: result };
  }
}

/**
 * ToggleAnimationPathVisibility - Toggle path visualization visibility
 */
class ToggleAnimationPathVisibility extends Operator {
  static operatorName = "animationPath.toggle_visibility";

  static operatorLabel = "Toggle Animation Path Visibility";

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
    const result = AnimationPathCore.toggleVisibility(this.GlobalId, {
      animationPathTool: AECO_TOOLS.world.animationPath,
      context: this.context,
      signals: this.context.signals
    });

    return { status: "FINISHED", toggled: result };
  }
}

/**
 * PlayAnimationPath - Play the animation sequence
 */
class PlayAnimationPath extends Operator {
  static operatorName = "animationPath.play";

  static operatorLabel = "Play Animation Path";

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
    const result = AnimationPathCore.play(this.GlobalId, {
      animationPathTool: AECO_TOOLS.world.animationPath,
      context: this.context,
      signals: this.context.signals
    });

    return { status: "FINISHED", playing: result };
  }
}

/**
 * StopAnimationPath - Stop the animation
 */
class StopAnimationPath extends Operator {
  static operatorName = "animationPath.stop";

  static operatorLabel = "Stop Animation Path";

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
    const result = AnimationPathCore.stop(this.GlobalId, {
      animationPathTool: AECO_TOOLS.world.animationPath,
      context: this.context,
      signals: this.context.signals
    });

    return { status: "FINISHED", stopped: result };
  }
}

/**
 * AddViewpointToAnimationPath - Add a viewpoint to an animation path
 */
class AddViewpointToAnimationPath extends Operator {
  static operatorName = "animationPath.add_viewpoint";

  static operatorLabel = "Add Viewpoint to Animation Path";

  static operatorOptions = ["REGISTER"];

  constructor(context, pathGlobalId, viewpointGlobalId) {
    super(context);

    this.context = context;

    this.pathGlobalId = pathGlobalId;

    this.viewpointGlobalId = viewpointGlobalId;
  }

  poll() {
    return this.context?.editor && this.pathGlobalId && this.viewpointGlobalId;
  }

  execute() {
    AnimationPathCore.addViewpoint(this.pathGlobalId, this.viewpointGlobalId, {
      animationPathTool: AECO_TOOLS.world.animationPath,
      context: this.context,
      signals: this.context.signals
    });

    return { status: "FINISHED" };
  }
}

/**
 * RemoveViewpointFromAnimationPath - Remove a viewpoint from an animation path
 */
class RemoveViewpointFromAnimationPath extends Operator {
  static operatorName = "animationPath.remove_viewpoint";

  static operatorLabel = "Remove Viewpoint from Animation Path";

  static operatorOptions = ["REGISTER"];

  constructor(context, pathGlobalId, viewpointGlobalId) {
    super(context);

    this.context = context;

    this.pathGlobalId = pathGlobalId;

    this.viewpointGlobalId = viewpointGlobalId;
  }

  poll() {
    return this.context?.editor && this.pathGlobalId && this.viewpointGlobalId;
  }

  execute() {
    AnimationPathCore.removeViewpoint(this.pathGlobalId, this.viewpointGlobalId, {
      animationPathTool: AECO_TOOLS.world.animationPath,
      context: this.context,
      signals: this.context.signals
    });

    return { status: "FINISHED" };
  }
}

/**
 * MoveViewpointInPath - Move a viewpoint to a new position in the path
 */
class MoveViewpointInPath extends Operator {
  static operatorName = "animationPath.move_viewpoint";

  static operatorLabel = "Move Viewpoint in Path";

  static operatorOptions = ["REGISTER"];

  constructor(context, pathGlobalId, viewpointGlobalId, newIndex) {
    super(context);

    this.context = context;

    this.pathGlobalId = pathGlobalId;

    this.viewpointGlobalId = viewpointGlobalId;

    this.newIndex = newIndex;
  }

  poll() {
    return this.context?.editor && this.pathGlobalId && this.viewpointGlobalId !== undefined;
  }

  execute() {
    AnimationPathCore.moveViewpoint(this.pathGlobalId, this.viewpointGlobalId, this.newIndex, {
      animationPathTool: AECO_TOOLS.world.animationPath,
      context: this.context,
      signals: this.context.signals
    });

    return { status: "FINISHED" };
  }
}

/**
 * UpdateAnimationSettings - Update animation settings for a path
 */
class UpdateAnimationSettings extends Operator {
  static operatorName = "animationPath.update_settings";

  static operatorLabel = "Update Animation Settings";

  static operatorOptions = ["REGISTER"];

  constructor(context, GlobalId, settings) {
    super(context);

    this.context = context;

    this.GlobalId = GlobalId;

    this.settings = settings;
  }

  poll() {
    return this.context?.editor && this.GlobalId && this.settings;
  }

  execute() {
    AnimationPathCore.updateSettings(this.GlobalId, this.settings, {
      animationPathTool: AECO_TOOLS.world.animationPath,
      context: this.context,
      signals: this.context.signals
    });

    return { status: "FINISHED" };
  }
}

/**
 * SetPathColor - Set path color
 */
class SetPathColor extends Operator {
  static operatorName = "animationPath.set_path_color";

  static operatorLabel = "Set Path Color";

  static operatorOptions = ["REGISTER"];

  constructor(context, GlobalId, color) {
    super(context);

    this.context = context;

    this.GlobalId = GlobalId;

    this.color = color;
  }

  poll() {
    return this.context?.editor && this.GlobalId && this.color;
  }

  execute() {
    AnimationPathCore.setPathColor(this.GlobalId, this.color, {
      animationPathTool: AECO_TOOLS.world.animationPath,
      context: this.context,
      signals: this.context.signals
    });

    return { status: "FINISHED" };
  }
}

/**
 * SetMarkerColor - Set marker color
 */
class SetMarkerColor extends Operator {
  static operatorName = "animationPath.set_marker_color";

  static operatorLabel = "Set Marker Color";

  static operatorOptions = ["REGISTER"];

  constructor(context, GlobalId, color) {
    super(context);

    this.context = context;

    this.GlobalId = GlobalId;

    this.color = color;
  }

  poll() {
    return this.context?.editor && this.GlobalId && this.color;
  }

  execute() {
    AnimationPathCore.setMarkerColor(this.GlobalId, this.color, {
      animationPathTool: AECO_TOOLS.world.animationPath,
      context: this.context,
      signals: this.context.signals
    });

    return { status: "FINISHED" };
  }
}

/**
 * SetTargetColor - Set target color
 */
class SetTargetColor extends Operator {
  static operatorName = "animationPath.set_target_color";

  static operatorLabel = "Set Target Color";

  static operatorOptions = ["REGISTER"];

  constructor(context, GlobalId, color) {
    super(context);

    this.context = context;

    this.GlobalId = GlobalId;

    this.color = color;
  }

  poll() {
    return this.context?.editor && this.GlobalId && this.color;
  }

  execute() {
    AnimationPathCore.setTargetColor(this.GlobalId, this.color, {
      animationPathTool: AECO_TOOLS.world.animationPath,
      context: this.context,
      signals: this.context.signals
    });

    return { status: "FINISHED" };
  }
}

/**
 * CreateAnimationPathTemplate - Create a template animation path with default viewpoints
 */
class CreateAnimationPathTemplate extends Operator {
  static operatorName = "animationPath.create_template";

  static operatorLabel = "Create Animation Path Template";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;
  }

  poll() {
    return this.context?.editor;
  }

  execute() {
    const template = AnimationPathCore.createTemplate({
      animationPathTool: AECO_TOOLS.world.animationPath,
      context: this.context,
      signals: this.context.signals
    });

    return { status: "FINISHED", template };
  }
}

/**
 * UpdateViewpointSettings - Update settings for a specific viewpoint in a path
 */
class UpdateViewpointSettings extends Operator {
  static operatorName = "animationPath.update_viewpoint_settings";

  static operatorLabel = "Update Viewpoint Settings";

  static operatorOptions = ["REGISTER"];

  constructor(context, pathGlobalId, viewpointGlobalId, settings) {
    super(context);

    this.context = context;

    this.pathGlobalId = pathGlobalId;

    this.viewpointGlobalId = viewpointGlobalId;

    this.settings = settings;
  }

  poll() {
    return this.context?.editor && this.pathGlobalId && this.viewpointGlobalId && this.settings;
  }

  execute() {
    AnimationPathCore.updateViewpointSettings(this.pathGlobalId, this.viewpointGlobalId, this.settings, {
      animationPathTool: AECO_TOOLS.world.animationPath,
      context: this.context,
      signals: this.context.signals
    });

    return { status: "FINISHED" };
  }
}

export default [
  CreateAnimationPath,
  RemoveAnimationPath,
  RenameAnimationPath,
  ActivateAnimationPath,
  ToggleAnimationPathVisibility,
  PlayAnimationPath,
  StopAnimationPath,
  AddViewpointToAnimationPath,
  RemoveViewpointFromAnimationPath,
  MoveViewpointInPath,
  UpdateAnimationSettings,
  UpdateViewpointSettings,
  SetPathColor,
  SetMarkerColor,
  SetTargetColor,
  CreateAnimationPathTemplate
];