import AECO_TOOLS from "../../tool/index.js";

export function refreshData() {
  SequenceData.is_loaded = false;
}

export class SequenceData {
  static data = {
    has_work_schedules: false,
    work_schedules: {},
    work_calendars: {},
    number_of_work_calendars_loaded : 0,
    work_times: {},
    tasks: {},
    task_times: {},
    recurrence_patterns: {},
    sequences: {},
    time_periods: {},
  };
// 
  static is_loaded = false;

  static async load(model) {

    const work_schedules = await AECO_TOOLS.bim.sequence.getWorkSchedules(model);
    const work_calendars = await AECO_TOOLS.bim.sequence.getCalendars(model);
    const work_times = await AECO_TOOLS.bim.sequence.getWorkingTimes(model);
    const tasks = await AECO_TOOLS.bim.sequence.getTasks(model);
    const task_times = await AECO_TOOLS.bim.sequence.getTaskTimes(model);
    const recurrence_patterns = await AECO_TOOLS.bim.sequence.getRecurrencePatterns(model);
    const sequences = await AECO_TOOLS.bim.sequence.getSequences(model);
    const time_periods = await AECO_TOOLS.bim.sequence.getTimePeriods(model);

    SequenceData.data = {
      has_work_schedules: await AECO_TOOLS.bim.sequence.hasWorkSchedules(model),
      work_schedules,
      work_calendars,
      number_of_work_calendars_loaded: Object.keys(work_calendars).length,
      work_times: work_times,
      tasks,
      task_times,
      recurrence_patterns,
      sequences,
      time_periods,
    };

    SequenceData.is_loaded = true;
  }

}