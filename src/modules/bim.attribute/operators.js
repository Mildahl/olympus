import { Operator } from "../../operators/Operator.js";

import operators from "../../operators/index.js";

import AECO_TOOLS from "../../tool/index.js";

import dataStore from "../../data/index.js";

import { refreshSelectionData as refreshTypeSelectionData } from "../bim.types/data.js";

let isSelectionEnabled = false;

class EnableBIMSelection extends Operator {
  static operatorName = "bim.enable_bim_selection";

  static operatorLabel = "Enable BIM Selection";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;
  }

  poll() {
    return !isSelectionEnabled;
  }

  execute() {
    AECO_TOOLS.world.scene.onSelection(async (object) => {
      if (!object)
        return

      const isIfcObject =
        object.isIfc || (object.isMesh && object.parent?.isIfc);

      if (!isIfcObject) return;

      const entityGlobalId = AECO_TOOLS.world.scene.getEntityGlobalId(object);

      if (!entityGlobalId || this.context.ifc.activeElement === entityGlobalId)
        return;

      this.context.ifc.activeElement = entityGlobalId;

      await operators.execute(
        "bim.enable_editing_attributes",
        this.context,
        null,
        entityGlobalId,
      );
    });

    isSelectionEnabled = true;

    return { status: "FINISHED" };
  }
}

class BIM_EnableEditingAttributes extends Operator {
  static operatorName = "bim.enable_editing_attributes";

  static operatorLabel = "Enable Editing Attributes";

  static operatorOptions = ["REGISTER"];

  constructor(context, modelName, GlobalId) {
    super(context);

    this.modelName = modelName || context.ifc.activeModel;

    this.GlobalId =
      GlobalId || AECO_TOOLS.world.scene.getEntityGlobalId(context.editor.selected);

  }

  poll() {
    return AECO_TOOLS.initialized.bim && this.modelName !== null && this.GlobalId !== null;
  }

  async execute() {

    const { attributes, ifcClass } = await AECO_TOOLS.bim.attribute.loadAttributes(this.modelName, this.GlobalId);

    AECO_TOOLS.bim.attribute.storeAttributes(this.GlobalId, attributes, ifcClass);

    await operators.execute("bim.load_properties", this.context, this.modelName, this.GlobalId);

    this.context.signals.enableEditingAttributes.dispatch({
      GlobalId: this.GlobalId,
      Attributes: dataStore.getCollection("BIMAttributes", this.GlobalId),
      PropertiesData: dataStore.getCollection("BIMPropertiesData", this.GlobalId),
    });
    return { status: "FINISHED" };
  }
}

class BIM_EditAttributes extends Operator {
  static operatorName = "bim.edit_attributes";

  static operatorLabel = "Edit Attributes";

  static operatorOptions = ["REGISTER"];

  constructor(context, modelName, GlobalId, attributes) {
    super(context);

    this.modelName = modelName;

    this.GlobalId = GlobalId;

    this.attributes = attributes;
  }

  poll() {
    return AECO_TOOLS.initialized.bim && this.GlobalId && this.attributes;
  }

  async execute() {
    const result2 = await AECO_TOOLS.code.pyWorker.run_api("editAttributes", {
      modelName: this.modelName,
      GlobalId: this.GlobalId,
      attributes: this.attributes,
    });
    const entityClass = await AECO_TOOLS.ifc.getClass(this.modelName, this.GlobalId);

    if (entityClass === "IfcWorkSchedule") {

      operators.execute("bim.enable_editing_work_schedules", this.context, this.modelName);
      
      await operators.execute("bim.enable_editing_work_schedule_tasks", this.context, this.GlobalId);

    } else if (entityClass === "IfcTask") {

      const scheduleGlobalId = await AECO_TOOLS.bim.sequence.getTaskParentSchedule(this.modelName, this.GlobalId);

      await operators.execute("bim.enable_editing_work_schedule_tasks", this.context, scheduleGlobalId);
    }
    return { status: "FINISHED", result: result2, success: true };
  }
}

export default [
  BIM_EnableEditingAttributes,
  BIM_EditAttributes,
  EnableBIMSelection,
];
