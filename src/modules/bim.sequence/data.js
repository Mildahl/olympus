import AECO_tools from "../../tool/index.js";

export function refreshData() {
  SequenceData.is_loaded = false;
}

export class SequenceData {
  static data = {
    has_work_schedules: false,
    work_schedules: [],
  };

  static is_loaded = false;

  static async load(model) {
    SequenceData.data = {
      has_work_schedules: await AECO_tools.bim.sequence.hasWorkSchedules(model),
      work_schedules: await AECO_tools.bim.sequence.getWorkSchedules(model),
    };

    SequenceData.is_loaded = true;
  }

}