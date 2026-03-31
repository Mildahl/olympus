import { Operator } from "../../operators/Operator.js";

import * as ProjectionCore from "../../core/projection.js";

import AECO_tools from "../../tool/index.js";


class SetProjectionCutPlane extends Operator {
  static operatorName = "world.projection.set_cut_plane";

  static operatorLabel = "Set projection cut plane";

  static operatorOptions = ["REGISTER", "SKIP_HISTORY"];

  constructor(context, axis, position) {
    super(context);

    this.context = context;

    this.axis = axis;

    this.position = position;
  }

  poll() {
    const context = this.context;

    if (!context || !context.editor || !context.editor.sceneHelpers) return false;
    
    const axis = AECO_tools.world.projection.normalizePlanarAxisKey(this.axis);

    return (axis === 'x' || axis === 'y' || axis === 'z') && Number.isFinite(this.position);
  }


  execute() {

    ProjectionCore.setCutPlane(this.axis, this.position, {projectionTool: AECO_tools.world.projection, context: this.context});

    return { status: "FINISHED", axis: AECO_tools.world.projection.axis, position: AECO_tools.world.projection.position };
  }
}

class ClearProjectionViewportIndicator extends Operator {
  static operatorName = "world.projection.clear_viewport_indicator";

  static operatorLabel = "Clear projection viewport indicator";

  static operatorOptions = ["REGISTER", "SKIP_HISTORY"];

  constructor(context) {
    super(context);

    this.context = context;
  }

  poll() {
    const context = this.context;

    return Boolean(context && context.editor && AECO_tools.world.projection.viewportPlaneGroup);
  }

  execute() {

    AECO_tools.world.projection.removeCutPlane(this.context.editor, AECO_tools.world.projection.viewportPlaneGroup);

    AECO_tools.world.projection.disposeCutPlaneGroup(AECO_tools.world.projection.viewportPlaneGroup);

    AECO_tools.world.projection.viewportPlaneGroup = null;

    return { status: "FINISHED" };
  }
}

class GenerateSectionCut extends Operator {
  static operatorName = "world.projection.generate_section_cut";

  static operatorLabel = "Generate section cut";

  static operatorOptions = ["REGISTER", "SKIP_HISTORY"];

  constructor(context, axis, position) {
    super(context);

    this.context = context;

    this.axis = axis;

    this.position = position;
  }

  poll() {
    const context = this.context;

    if (!context || !context.editor) return false;

    const axis = AECO_tools.world.projection.normalizePlanarAxisKey(this.axis);

    return (axis === 'x' || axis === 'y' || axis === 'z') && Number.isFinite(this.position);
  }

  execute() {

    ProjectionCore.generateCutPlaneSection(this.axis, this.position, {projectionTool: AECO_tools.world.projection, context: this.context});

    return { status: "FINISHED" };
  }
}

class MountPlanarSectionPreview extends Operator {
  static operatorName = "world.projection.mount_planar_preview";

  static operatorLabel = "Mount planar section preview";

  static operatorOptions = ["REGISTER", "SKIP_HISTORY"];

  constructor(context, hostDomElement) {
    super(context);

    this.context = context;

    this.hostDomElement = hostDomElement;
  }

  poll() {
    return Boolean(this.context && this.hostDomElement && this.hostDomElement.nodeType === 1);
  }

  execute() {
    AECO_tools.world.projection.mountPlanarSectionPreview(this.hostDomElement);

    return { status: "FINISHED" };
  }
}

class UnmountPlanarSectionPreview extends Operator {
  static operatorName = "world.projection.unmount_planar_preview";

  static operatorLabel = "Unmount planar section preview";

  static operatorOptions = ["REGISTER", "SKIP_HISTORY"];

  constructor(context) {
    super(context);

    this.context = context;
  }

  poll() {
    return Boolean(this.context);
  }

  execute() {
    AECO_tools.world.projection.disposePlanarSectionPreview();

    return { status: "FINISHED" };
  }
}

export default [
  SetProjectionCutPlane,
  ClearProjectionViewportIndicator,
  GenerateSectionCut,
  MountPlanarSectionPreview,
  UnmountPlanarSectionPreview,
];
