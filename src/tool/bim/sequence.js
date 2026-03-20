import dataStore from "../../data/index.js";

import IfcTool from "./ifc.js";

import { Collection } from "../../data/index.js";

import { IfcRoot, IfcModel } from "../../data/index.js";

function parseRunToolJson(result, contextLabel) {
  if (result instanceof Error) {
    console.error(`[SequenceTool] ${contextLabel}:`, result.message);

    return null;
  }

  if (result !== null && typeof result === "object") {
    return result;
  }

  if (typeof result !== "string") {
    console.error(
      `[SequenceTool] ${contextLabel}: expected JSON string, got ${typeof result}`,
    );

    return null;
  }

  const trimmed = result.trim();

  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    console.error(
      `[SequenceTool] ${contextLabel}: worker did not return JSON:`,
      trimmed.slice(0, 200),
    );

    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch (e) {
    console.error(`[SequenceTool] ${contextLabel}:`, e.message);

    return null;
  }
}

class BIMWorkScheduleProperties extends Collection {
  constructor(GlobalId, name) {
    super({
      GlobalId: GlobalId,
      type: "BIMWorkScheduleProperties",
      classificationCode: "IFC",
    });

    this.name = name;
  }

  static predefinedTypes = [];
}

class SequenceTool {

  static async getSchedules(modelName) {
    return await IfcTool.get(modelName, "IfcWorkSchedule");
  }

  static async hasWorkSchedules(modelName) {
    return await IfcTool.get(modelName, "IfcWorkSchedule").then((schedules) => {
      return schedules && schedules.length > 0;
    });
  }

  static async getTaskParentSchedule(modelName, taskGlobalId) {
    return await IfcTool.runTool(modelName, {
      toolName:"sequence",
      functionName :"get_task_parent_schedule",
      args: {
        task: new IfcRoot(taskGlobalId),
      }
    })
  }

  static async getWorkSchedules(modelName) {

    const result = await IfcTool.runTool(modelName, {
        toolName:"sequence",
        functionName :"load_work_schedules",
        args: {
            model: new IfcModel(modelName),
        }
    });

    return (
      parseRunToolJson(result, "getWorkSchedules") ?? {
        work_schedules: {},
        work_schedules_enum: [],
      }
    );
  }

  static async create_tasks_json(modelName, work_schedule) {

    const result = await IfcTool.runTool(modelName, {
        toolName:"sequence",
        functionName :"create_tasks_json",
        args: {
            work_schedule: new IfcRoot(work_schedule),
        }
    })

    return parseRunToolJson(result, "create_tasks_json") ?? [];

  }

  static async loadSchedules(modelName) {
    const schedules = await SequenceTool.getSchedules(modelName);

    if (!schedules || !Array.isArray(schedules)) {
      console.error("[SequenceTool] Invalid schedules data received");

      return;
    }

    SequenceTool.storeSchedules(schedules);
  }

  static storeSchedules(schedules) {
    for (const schedule of schedules) {
      let collection;

      collection = dataStore.getCollection(
        "BIMWorkScheduleProperties",
        schedule.GlobalId
      );

      if (collection) {
        
        collection.name = schedule.Name;

        continue;
      } else {
        const scheduleCollection = new BIMWorkScheduleProperties(
          schedule.GlobalId,
          schedule.Name
        );

        dataStore.registerCollection(schedule.GlobalId, scheduleCollection);

        console.log(
          "[SequenceTool] Registered BIMWorkScheduleProperties:",
          scheduleCollection
        );
      }
    }
  }

  static async getTaskOutputs(modelName, stepID) {
    const globalID = await IfcTool.getGLobalId(modelName, stepID);

    const result = await IfcTool.runTool(modelName, {
      toolName: "sequence",
      functionName: "get_task_outputs",
      args: {
        task: new IfcRoot(globalID),
      },
    })

    return result;
  }

  static async getTaskInputs(modelName, stepID) {
    const globalID = await IfcTool.getGLobalId(modelName, stepID);

    const result = await IfcTool.runTool(modelName, {
      toolName: "sequence",
      functionName: "get_task_inputs",
      args: {
        task: new IfcRoot(globalID),
      },
    })

    return result;
  }

  static async getTaskResources(modelName, stepID) {
    const globalID = await IfcTool.getGLobalId(modelName, stepID);

    const result = await IfcTool.runTool(modelName, {
      toolName: "sequence",
      functionName: "get_task_resources",
      args: {
        task: new IfcRoot(globalID),
      },
    })

    return result;
  }

  static async getTaskDetails(modelName, stepID) {
    const [outputs, inputs, resources] = await Promise.all([
      SequenceTool.getTaskOutputs(modelName, stepID),
      SequenceTool.getTaskInputs(modelName, stepID),
      SequenceTool.getTaskResources(modelName, stepID)
    ]);

    return { outputs, inputs, resources };
  }

  static async getAnimationData(modelName, workScheduleId) {
    const result = await IfcTool.runTool(modelName, {
      toolName: "sequence",
      functionName: "get_animation_data",
      args: {
        work_schedule: new IfcRoot(workScheduleId),
      },
    });

    return parseRunToolJson(result, "getAnimationData") ?? {};
  }

  static async getElementsAtDate(modelName, workScheduleId, targetDate) {
    const dateStr = targetDate instanceof Date ? targetDate.toISOString() : targetDate;

    const result = await IfcTool.runTool(modelName, {
      toolName: "sequence",
      functionName: "get_elements_at_date",
      args: {
        work_schedule: new IfcRoot(workScheduleId),
        target_date: dateStr,
      },
    });

    return parseRunToolJson(result, "getElementsAtDate") ?? [];
  }

  static async getScheduleDateRange(modelName, workScheduleId) {
    const result = await IfcTool.runTool(modelName, {
      toolName: "sequence",
      functionName: "get_schedule_date_range",
      args: {
        work_schedule: new IfcRoot(workScheduleId),
      },
    });

    return parseRunToolJson(result, "getScheduleDateRange");
  }

}

export default SequenceTool;
