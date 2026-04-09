import { Operator } from "../../operators/Operator.js";

import operators from "../../operators/index.js";

import AECO_TOOLS from "../../tool/index.js";

import dataStore from "../../data/index.js";

import * as Core from "../../core/bim.pset.js";


class BIM_OP_EditPropertySet extends Operator {
  static operatorName = "bim.edit_property_set";

  static operatorLabel = "Edit Property Set";

  static operatorOptions = ["REGISTER"];

  constructor(context, modelName, psetGlobalId, properties) {
    super(context);

    this.context = context;

    this.modelName = modelName;

    this.psetGlobalId = psetGlobalId;

    this.properties = properties;
  }

  poll() {
    return AECO_TOOLS.code.pyWorker.initialized.bim && this.psetGlobalId && this.properties;
  }

  async execute() {

    const result = await AECO_TOOLS.bim.ifc.runAPI(this.modelName, "pset.edit_pset", {
      pset: this.psetGlobalId,
      properties: this.properties,
    }, ["pset"]);
    
    return { status: "FINISHED", success: true };
  }
}

class BIM_OP_EditQuantitySet extends Operator {
  static operatorName = "bim.edit_quantity_set";

  static operatorLabel = "Edit Quantity Set";

  static operatorOptions = ["REGISTER"];

  constructor(context, modelName, GlobalId, qtoName, quantities) {
    super(context);

    this.context = context;

    this.modelName = modelName;

    this.GlobalId = GlobalId;

    this.qtoName = qtoName;

    this.quantities = quantities;
  }

  poll() {
    return AECO_TOOLS.code.pyWorker.initialized.bim && this.GlobalId && this.qtoName && this.quantities;
  }

  async execute() {
    const result = await AECO_TOOLS.code.pyWorker.run_api("editQuantitySet", {
      modelName: this.modelName,
      GlobalId: this.GlobalId,
      qtoName: this.qtoName,
      quantities: this.quantities,
    });

    return { status: "FINISHED", result, success: result?.success === true };
  }
}

class BIM_OP_LoadProperties extends Operator {
  static operatorName = "bim.load_properties";

  static operatorLabel = "Load Properties";

  static operatorOptions = ["REGISTER"];

  constructor(context, modelName, GlobalId) {
    super(context);

    this.context = context;

    this.modelName = modelName;

    this.GlobalId = GlobalId;
  }

  poll() {
    return AECO_TOOLS.code.pyWorker.initialized.bim && this.GlobalId;
  }

  async execute() {
 
    Core.loadProperties(this.modelName, this.GlobalId, {context: this.context, psetTool: AECO_TOOLS.bim.pset});

    return { status: "FINISHED" };
  }
}

class BIM_OP_CalculateQuantities extends Operator {
  static operatorName = "bim.calculate_quantities";

  static operatorLabel = "Calculate Quantities";

  static operatorOptions = ["REGISTER"];

  constructor(context, modelName, GlobalId) {
    super(context);

    this.context = context;

    this.modelName = modelName;

    this.GlobalId = GlobalId;
  }

  poll() {
    return AECO_TOOLS.code.pyWorker.initialized.bim && this.GlobalId;
  }

  async execute() {

    const result = await AECO_TOOLS.bim.ifc.runTool(this.modelName, {
      toolName: "pset",
      functionName: "calculate_element_quantities",
      args: {
        model: this.modelName,
        element_guids: [this.GlobalId]
      },
      entityArgs: ["model"],
    });

    await operators.execute("bim.load_properties", this.context, this.modelName, this.GlobalId);

    this.context.signals.enableEditingAttributes.dispatch({
      GlobalId: this.GlobalId,
      Attributes: dataStore.getCollection("BIMAttributes", this.GlobalId),
      PropertiesData: dataStore.getCollection("BIMPropertiesData", this.GlobalId),
    });

  return { status: "FINISHED"};
  }
}
export default [BIM_OP_EditPropertySet, BIM_OP_EditQuantitySet, BIM_OP_LoadProperties, BIM_OP_CalculateQuantities];
