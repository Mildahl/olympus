import AECO_TOOLS from "../../tool/index.js";

export function refreshData() {
  CostingData.is_loaded = false;
}

export class CostingData {
  static data = {
    has_cost_schedules: false,
    cost_schedules: {},
    cost_items: {},
    cost_values: {},
    total_cost_schedules: 0,
  };

  static is_loaded = false;

  static async load(model) {

    const [cost_schedules, cost_items, cost_values] = await Promise.all([
      AECO_TOOLS.bim.cost.getCostSchedules(model),
      AECO_TOOLS.bim.cost.getCostItems(model),
      AECO_TOOLS.bim.cost.getCostValues(model),
    ]);

    CostingData.data = {
      has_cost_schedules: await AECO_TOOLS.bim.cost.hasCostSchedules(model),
      cost_schedules,
      cost_items,
      cost_values,
      total_cost_schedules: Object.keys(cost_schedules).length,
    };

    CostingData.is_loaded = true;

  }

}