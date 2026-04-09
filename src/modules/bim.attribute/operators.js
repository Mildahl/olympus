import { Operator } from "../../operators/Operator.js";

import operators from "../../operators/index.js";

import AECO_TOOLS from "../../tool/index.js";

import * as Core from "../../core/bim.attribute.js";


class BIM_OP_EnableEditingAttributes extends Operator {
  static operatorName = "bim.enable_editing_attributes";

  static operatorLabel = "Enable Editing Attributes";

  static operatorOptions = ["REGISTER"];

  static operatorParams = {
    modelName: { type: "string", description: "IFC model name (omit for active model)" },
    GlobalId: { type: "string", description: "GlobalId of the IFC element" },
  };

  constructor(context, modelName, GlobalId) {
    super(context);

    this.modelName = modelName || context.ifc.activeModel;

    this.GlobalId =
      GlobalId || AECO_TOOLS.world.scene.getEntityGlobalId(context.editor.selected);

  }

  poll() {
    return AECO_TOOLS.code.pyWorker.initialized.bim && this.modelName !== null && this.GlobalId !== null;
  }

  async execute() {

    Core.enableEditingAttributes(this.modelName, this.GlobalId, {context: this.context, attributeTool: AECO_TOOLS.bim.attribute, psetTool: AECO_TOOLS.bim.pset});

    return { status: "FINISHED" };
  }
}

class BIM_OP_EditAttributes extends Operator {
  static operatorName = "bim.edit_attributes";

  static operatorLabel = "Edit Attributes";

  static operatorOptions = ["REGISTER"];

  static operatorParams = {
    modelName: { type: "string", description: "IFC model name" },
    GlobalId: { type: "string", description: "GlobalId of the IFC element to edit" },
    attributes: { type: "object", description: "Key-value pairs of attributes to update" },
  };

  constructor(context, modelName, GlobalId, attributes) {
    super(context);

    this.modelName = modelName;

    this.GlobalId = GlobalId;

    this.attributes = attributes;
  }

  poll() {
    return AECO_TOOLS.code.pyWorker.initialized.bim && this.GlobalId && this.attributes;
  }

  async execute() {

    await AECO_TOOLS.bim.ifc.beginTransaction(this.modelName);

    const result2 = await AECO_TOOLS.code.pyWorker.run_api("editAttributes", {
      modelName: this.modelName,
      GlobalId: this.GlobalId,
      attributes: this.attributes,
    });

    await AECO_TOOLS.bim.ifc.endTransaction(this.modelName);
    
    return { status: "FINISHED", result: result2, success: true };
  }

  
    undo() {

        AECO_TOOLS.bim.ifc.undo(this.modelName);

      return { status: "CANCELLED" };
    }

    redo() {

      AECO_TOOLS.bim.ifc.redo(this.modelName);

      return { status: "FINISHED" };
    }
}

export default [
  BIM_OP_EnableEditingAttributes,
  BIM_OP_EditAttributes,
];
