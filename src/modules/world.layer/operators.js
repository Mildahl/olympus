import { Operator } from "../../operators/Operator.js";

import AECO_TOOLS from "../../tool/index.js";

import * as LayerCore from "../../core/layer.js";

import * as SpatialCore from "../../core/spatial.js";
class ActivateLayer extends Operator {
  static operatorName = "world.activate_layer";

  static operatorLabel = "Activate Layer";

  static operatorOptions = ["REGISTER"];

  constructor(context, layerGuid) {
    super(context);

    this.context = context;

    this.layerGuid = layerGuid;
  }

  poll() {
    return this.context;
  }

  execute() {

    const result = LayerCore.activateLayer(this.layerGuid, {
      layerTool: AECO_TOOLS.world.layer,
      signals: this.context.signals,
      context: this.context,
      editor: this.context.editor
    });

    if (result.status === 'ERROR' || !result.layer) {
      console.warn("Failed to activate layer with GUID:", this.layerGuid);

      return { status: "CANCELLED" };
    }

    const layer = result.layer;

    SpatialCore.enableEditingForLayer(this.layerGuid, {
      signals: this.context.signals
    });

    SpatialCore.refreshSpatialManager(this.layerGuid, {
      editor: this.context.editor
    });

    return { status: "FINISHED", layerGuid: this.layerGuid };
  }
}

class GetLayerByName extends Operator {
  static operatorName = "world.get_layer_by_name";

  static operatorLabel = "Get Layer By Name";

  static operatorOptions = ["REGISTER"];

  constructor(context, layerName) {
    super(context);

    this.context = context;

    this.layerName = layerName;
  }

  poll() {
    return this.context;
  }

  execute() {
    const layer = LayerCore.getLayerByName(this.layerName, {
      layerTool: AECO_TOOLS.world.layer
    });

    return { status: "FINISHED", layer };
  }
}

class CreateWorldLayer extends Operator {
  static operatorName = "world.create_root_layer";

  static operatorLabel = "Create World Layer";

  static operatorOptions = ["REGISTER"];

  constructor(context, layerName) {
    super(context);

    this.context = context;

    this.layerName = layerName;
  }

  poll() {
    return AECO_TOOLS.world.layer.World;
  }

  execute() {

    const world = AECO_TOOLS.world.layer.World;

    const layer = LayerCore.createLayer(world, this.layerName, {
      layerTool: AECO_TOOLS.world.layer,
      signals: this.context.signals
    });

    return { status: "FINISHED", layer };
  }
}
export default [GetLayerByName, ActivateLayer, CreateWorldLayer];