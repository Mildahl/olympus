import IfcTool from "./ifc.js";

class CostTool {

  static async hasCostSchedules(modelName) {
    return await IfcTool.get(modelName, "IfcCostSchedule").then((schedules) => {
      return schedules && schedules.length > 0;
    });
  }

  static async getCostSchedules(modelName) {
    const result = await IfcTool.runTool(modelName, {
      toolName: "cost",
      functionName: "load_cost_schedules",
      args: { model: modelName },
      entityArgs: ["model"],
    });
    return JSON.parse(result) ?? {};
  }

  static async getCostItems(modelName) {
    const result = await IfcTool.runTool(modelName, {
      toolName: "cost",
      functionName: "load_cost_items",
      args: { model: modelName },
      entityArgs: ["model"],
    });
    return JSON.parse(result) ?? {};
  }

  static async getCostValues(modelName) {
    const result = await IfcTool.runTool(modelName, {
      toolName: "cost",
      functionName: "load_cost_values",
      args: { model: modelName },
      entityArgs: ["model"],
    });
    return JSON.parse(result) ?? {};
  }

  static async getCostItemsForProduct(modelName, productGlobalId) {
    const result = await IfcTool.runTool(modelName, {
      toolName: "cost",
      functionName: "get_cost_items_for_product",
      args: { product: productGlobalId },
      entityArgs: ["product"],
    });
    return JSON.parse(result) ?? [];
  }

}

export default CostTool;
