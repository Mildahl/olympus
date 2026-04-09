import { Collection } from "../../data/index.js";

import dataStore from "../../data/index.js";

import IfcTool from "./ifc.js";

import SceneTool from "../viewer/SceneTool.js";


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
        task: taskGlobalId,
      },
      entityArgs: ["task"],
    })
  }

  static async getWorkSchedules(modelName) {

    const result = await IfcTool.runTool(modelName, {
        toolName:"sequence",
        functionName :"load_work_schedules",
        args: {
            model: modelName,
        },
        entityArgs: ["model"]
    });
    return JSON.parse(result) ?? [];
  
  }

  static async getTasks(modelName) {
    const result = await IfcTool.runTool(modelName, {
        toolName:"sequence",
        functionName :"load_tasks",
        args: {
            model: modelName,
        },
        entityArgs: ["model"]
    });

    return JSON.parse(result) ?? [];
  }

  static async getTaskTimes(modelName) {
    const result = await IfcTool.runTool(modelName, {
        toolName:"sequence",
        functionName :"load_task_times",
        args: {
            model: modelName,
        },
        entityArgs: ["model"]
    });

    return JSON.parse(result) ?? [];
  }

  static async getRecurrencePatterns(modelName) {
    const result = await IfcTool.runTool(modelName, {
        toolName:"sequence",
        functionName :"load_recurrence_patterns",
        args: {
            model: modelName,
        },
        entityArgs: ["model"]
    });

    return JSON.parse(result) ?? [];
  }

  static async getSequences(modelName) {
    const result = await IfcTool.runTool(modelName, {
        toolName:"sequence",
        functionName :"load_sequences",
        args: {
            model: modelName,
        },
        entityArgs: ["model"]
    });

    return JSON.parse(result) ?? [];
  }


  static async getTimePeriods(modelName) {
    const result = await IfcTool.runTool(modelName, {
        toolName:"sequence",
        functionName :"load_time_periods",
        args: {
            model: modelName,
        },
        entityArgs: ["model"]
    });

    return JSON.parse(result) ?? [];
  }

  static async getCalendars(modelName) {
    const result = await IfcTool.runTool(modelName, {
        toolName:"sequence",
        functionName :"load_work_calendars",
        args: {
            model: modelName,
        },
        entityArgs: ["model"]
    });

    return JSON.parse(result) ?? [];
  }


  static async getWorkingTimes(modelName) {
    const result = await IfcTool.runTool(modelName, {
        toolName:"sequence",
        functionName :"load_work_times",
        args: {
            model: modelName,
        },
        entityArgs: ["model"]
    });

    return JSON.parse(result) ?? [];
  }

  static async create_tasks_json(modelName, work_schedule) {

    const result = await IfcTool.runTool(modelName, {
        toolName:"sequence",
        functionName :"create_tasks_json",
        args: {
            work_schedule: work_schedule,
        },
        entityArgs: ["work_schedule"]
    })

    return JSON.parse(result) ?? [];

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

  static async getTasksForProduct(modelName, productGlobalId) {
    const result = await IfcTool.runTool(modelName, {
      toolName: "sequence",
      functionName: "get_tasks_for_product",
      args: {
        product: productGlobalId,
      },
      entityArgs: ["product"],
    });

    return JSON.parse(result) ?? { inputs: [], outputs: [] };
  }

  static async getTaskOutputs(modelName, taskID) {
    const globalID = await IfcTool.getGLobalId(modelName, taskID);

    const result = await IfcTool.runTool(modelName, {
      toolName: "sequence",
      functionName: "get_task_outputs",
      args: {
        task: globalID,
        is_deep: false,
      },
      entityArgs: ["task"],
    })

    return result;
  }
  

  static async getTaskInputs(modelName, taskID) {
    const globalID = await IfcTool.getGLobalId(modelName, taskID);

    const result = await IfcTool.runTool(modelName, {
      toolName: "sequence",
      functionName: "get_task_inputs",
      args: {
        task: globalID,
        is_deep: false,
      },
      entityArgs: ["task"],
    })

    return result;
  }

  static async getTaskResources(modelName, taskID) {
    const globalID = await IfcTool.getGLobalId(modelName, taskID);

    const result = await IfcTool.runTool(modelName, {
      toolName: "sequence",
      functionName: "get_task_resources",
      args: {
        task: globalID,
        is_deep: false,
      },
      entityArgs: ["task"],
    })

    return result;
  }

  static async getTaskDetails(modelName, taskID) {
    const [outputs, inputs, resources] = await Promise.all([
      SequenceTool.getTaskOutputs(modelName, taskID),
      SequenceTool.getTaskInputs(modelName, taskID),
      SequenceTool.getTaskResources(modelName, taskID)
    ]);

    return { outputs, inputs, resources };
  }


  static async higlight_task_elements(modelName, taskID){
    
    const inputs = await SequenceTool.getTaskInputs(modelName, taskID)

    const outputs = await SequenceTool.getTaskOutputs(modelName, taskID)

    const guids = [];

      for (const element of [...inputs, ...outputs]) {
        if (element.GlobalId) {
          guids.push(element.GlobalId);
        }
      }
    
    const getThreeObjs = IfcTool.getObjects(guids)

    console.log(guids, "resolved to", getThreeObjs)
    
    SceneTool.highlight("off");

    SceneTool.highlight("on", getThreeObjs);

  }


  static async getAnimationData(modelName, workScheduleGlobalId) {
    const result = await IfcTool.runTool(modelName, {
      toolName: "sequence",
      functionName: "get_animation_data",
      args: {
        work_schedule: workScheduleGlobalId,
      },
      entityArgs: ["work_schedule"],
    });

    return JSON.parse(result) ?? {};
  }

  static async getElementsAtDate(modelName, workScheduleGlobalId, targetDate) {
    const dateStr = targetDate instanceof Date ? targetDate.toISOString() : targetDate;

    const result = await IfcTool.runTool(modelName, {
      toolName: "sequence",
      functionName: "get_elements_at_date",
      args: {
        work_schedule: workScheduleGlobalId,
        target_date: dateStr,
      },
      entityArgs: ["work_schedule"],
    });

    return JSON.parse(result) ?? [];
  }

  static async getScheduleDateRange(modelName, workScheduleGlobalId) {
    const result = await IfcTool.runTool(modelName, {
      toolName: "sequence",
      functionName: "get_schedule_date_range",
      args: {
        work_schedule: workScheduleGlobalId,
      },
      entityArgs: ["work_schedule"],
    });

    return JSON.parse(result) ?? {};
  }

}

export default SequenceTool;
