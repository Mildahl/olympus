import { Operator } from "../../operators/Operator.js";

import operators from "../../operators/index.js";

import { IfcRoot, IfcModel } from "../../data/index.js";

import AECO_tools from "../../tool/index.js";

import dataStore from "../../data/index.js";
class BIM_EditPropertySet extends Operator {
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
    return AECO_tools.initialized.bim && this.psetGlobalId && this.properties;
  }

  async execute() {

    const result = await AECO_tools.ifc.runAPI(this.modelName, "pset.edit_pset", {
      pset: new IfcRoot(this.psetGlobalId),
      properties: this.properties,
    });
    
    return { status: "FINISHED", success: true };
  }
}

class BIM_EditQuantitySet extends Operator {
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
    return AECO_tools.initialized.bim && this.GlobalId && this.qtoName && this.quantities;
  }

  async execute() {
    const result = await AECO_tools.code.pyWorker.run_api("editQuantitySet", {
      modelName: this.modelName,
      GlobalId: this.GlobalId,
      qtoName: this.qtoName,
      quantities: this.quantities,
    });

    return { status: "FINISHED", result, success: result?.success === true };
  }
}

class BIM_LoadProperties extends Operator {
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
    return AECO_tools.initialized.bim && this.GlobalId;
  }

  async execute() {
 
    let propertiesData = null;

    const psetResult = await AECO_tools.bim.pset.loadProperties(this.modelName, this.GlobalId);

    if (psetResult.psets?.length > 0 || psetResult.qtos?.length > 0) {

      AECO_tools.bim.pset.storeProperties(this.GlobalId, psetResult);
      
    }

    return { status: "FINISHED" };
  }
}
class BIM_CalculateQuantities extends Operator {
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
    return AECO_tools.initialized.bim && this.GlobalId;
  }

  async execute() {

    const result = await AECO_tools.ifc.runTool(this.modelName, {
      toolName: "pset",
      functionName: "calculate_element_quantities",
      args: {
        model: new IfcModel(this.modelName),
        element_guids: [this.GlobalId]
      },
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
export default [BIM_EditPropertySet, BIM_EditQuantitySet, BIM_LoadProperties, BIM_CalculateQuantities];
