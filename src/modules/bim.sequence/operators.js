import { Operator } from "../../operators/Operator.js";

import operators from "../../operators/Operators.js";

import * as ScheduleCore from "../../core/bim.sequence.js";

import AECO_TOOLS from "../../tool/index.js";

class BIM_OP_addWorkSchedule extends Operator {
  static operatorName = "bim.add_work_schedule";

  static operatorLabel = "Add Work Schedule";

  static operatorOptions = ["REGISTER"];

  constructor( context, model, scheduleName ) {
    super( context );

    this.model = model;

    this.scheduleName = scheduleName;

    this.predefinedType = "PLANNED"; 

    this.objectType = null; 
  }

  poll() {
    return this.context.ifc.activeModel;
  }

  async execute() {
    const model = this.model || this.context.ifc.activeModel;
    
    const name = this.scheduleName || "New Work Schedule";

    const predefinedType = this.predefinedType;

    const objectType = this.objectType;

    const result = await ScheduleCore.add_work_schedule(model, name, predefinedType, objectType, {
      ifc: AECO_TOOLS.bim.ifc,
      sequence: AECO_TOOLS.bim.sequence,
      signals: this.context.signals
    })

    return { status: "FINISHED", result: result };

  }

  undo() {
    // TODO: Implement undo for work schedule addition
    return { status: "CANCELLED" };
  }
}

class BIM_OP_removeWorkSchedule extends Operator {
  static operatorName = "bim.remove_work_schedule";

  static operatorLabel = "Remove Work Schedule";

  static operatorOptions = ["REGISTER"];

  constructor( context, modelName, GlobalId ) {
    super( context );

    this.modelName = modelName;

    this.GlobalId = GlobalId;
  }

  poll() {
    return this.context.ifc.activeModel;
  }

  async execute() {
    
    const result = await ScheduleCore.remove_work_schedule(this.modelName, this.GlobalId, {
      ifc: AECO_TOOLS.bim.ifc,
      signals: this.context.signals
    })

    return { status: "FINISHED", result: result };

  }

  undo() {
    // TODO: Implement undo for work schedule addition
    return { status: "CANCELLED" };
  }
}

class BIM_OP_listWorkSchedules extends Operator {
  static operatorName = "bim.list_work_schedules";

  static operatorLabel = "List Work Schedules";

  static operatorOptions = ["REGISTER"];

  constructor( context ) {
    super( context );
  }

  poll() {
    return AECO_TOOLS.bim.ifc !== null;
  }

  execute() {
    if (!this.context.ifc.activeWorkScheduleSource) {
      console.error("Model name is required");

      return { status: "CANCELLED" };
    }

    try {
      const model = AECO_TOOLS.bim.ifc.get(this.context.ifc.activeWorkScheduleSource);

      if (!model) {
        console.error("Model not found:", this.context.ifc.activeWorkScheduleSource);

        return { status: "CANCELLED" };
      }

      const workSchedules = model.by_type("IfcWorkSchedule");

      return { status: "FINISHED", data: workSchedules.toJs() };
    } catch (error) {
      console.error("Failed to list work schedules:", error);

      return { status: "CANCELLED" };
    }
  }

  undo() {
    return { status: "CANCELLED" };
  }
}


class BIM_OP_EnableEditingWorkScheduleTasks extends Operator {
  static operatorName = "bim.enable_editing_work_schedule_tasks"

  static operatorLabel = "Enable Editing Tasks"

  static operatorOptions = ["REGISTER"];

  constructor( context, scheduleId , viewType)  {

    super( context );

    this.scheduleId = scheduleId;

    this.viewType = viewType || 'gantt';

  }

  poll() {

    return AECO_TOOLS.bim.sequence !== null && this.context.ifc.activeModel;
    
  }

   async execute() {

      const model = this.context.ifc.activeModel

      const workScheduleGlobalId = this.scheduleId

      ScheduleCore.enable_editing_workschedule_tasks( model, workScheduleGlobalId,  { 
        ifc:AECO_TOOLS.bim.ifc, 
        sequence:AECO_TOOLS.bim.sequence, 
        signals: this.context.signals, 
        context: this.context,
        viewType: this.viewType,
      });

  }

}

class BIM_OP_switchView extends Operator {
  static operatorName = "bim.switch_view"

  static operatorLabel = "Switch Schedule View"

  static operatorOptions = ["REGISTER"];

  constructor( context, scheduleId, viewType ) {
    super( context );

    this.scheduleId = scheduleId;

    this.viewType = viewType;
  }

  poll() {
    
    return true
  }

   async execute() {

      this.context.signals.changeViewType.dispatch({ workscheduleGlobalId: this.scheduleId , viewType: this.viewType });

    }

}

class BIM_OP_enableEditingTask extends Operator {
  static operatorName = "bim.enable_editing_task";

  static operatorLabel = "Enable editing task";

  static operatorOptions = ["REGISTER"];

  constructor(context, taskId) {
    super(context);

    this.taskId = Number(taskId);
  }

  poll() {
    return AECO_TOOLS.bim.ifc !== null && AECO_TOOLS.bim.sequence !== null;
  }

  async execute() {
    const activeModel = this.context.ifc.activeModel;

    if (!activeModel) {
      return { status: "CANCELLED" };
    }
    
    await AECO_TOOLS.bim.sequence.higlight_task_elements(activeModel, this.taskId);

    this.context.signals.taskClicked.dispatch({
      taskId: this.taskId,
    });

    return { status: "FINISHED" };
  }
}


class BIM_OP_selectTask extends Operator {
  static operatorName = "bim.select_task"

  static operatorLabel = "Select Schedule Task"

  static operatorOptions = ["REGISTER"];

  constructor( context,  taskId ) {
    super( context );

    this.taskId = taskId;
  }

  poll() {
    return AECO_TOOLS.code.pyWorker.initialized.bim;
  }

    async execute() { 

      this.context.signals.taskSelected.dispatch({ taskId: this.taskId, selected: true });
      
    
    }
}

class BIM_OP_deselectTask extends Operator {
  static operatorName = "bim.deselect_task"

  static operatorLabel = "Deselect Schedule Task"

  static operatorOptions = ["REGISTER"];

  constructor( context, taskId ) {
    super( context );

    this.taskId = taskId;
  }

  poll() {
    return AECO_TOOLS.code.pyWorker.initialized.bim;
  }

    async execute() {

      this.context.signals.taskSelected.dispatch({ taskId: this.taskId, selected: false });
      

    }

}

class BIM_OP_expandNodePath extends Operator {
  static operatorName = "bim.expand_node_path"

  static operatorLabel = "Expand Node Path"

  static operatorOptions = ["REGISTER"];

  constructor( context, workscheduleId, pathType ) {
    super( context );

    this.workScheduleGlobalId = workscheduleId;

    this.pathType = pathType;
  }

  poll() {
    return AECO_TOOLS.code.pyWorker.initialized.bim;
  }

   async execute() {
      const modelName =
        this.context.ifc.activeWorkScheduleSource || this.context.ifc?.activeModel;

      if (!modelName) {
        console.error("bim.expand_node_path: no model name (activeWorkScheduleSource / ifc.activeModel)");

        return { status: "CANCELLED" };
      }

      let nodeIds = [];

      if (this.pathType === "critical") {
        const result = await AECO_TOOLS.bim.ifc.runTool(modelName, {
          toolName: "sequence",
          functionName: "get_critical_path_tasks",
          args: {
            work_schedule: this.workScheduleGlobalId,
          },
          entityArgs: ["work_schedule"],
        });

        nodeIds = Array.isArray(result) ? result : [];
      }

      this.context.signals.nodePathExpanded.dispatch({
        workscheduleId: this.workScheduleGlobalId,
        pathType: this.pathType,
        nodeIds,
      });

      return { status: "FINISHED" };

    }

}

class BIM_OP_loadAnimationData extends Operator {
  static operatorName = "bim.load_animation_data"

  static operatorLabel = "Load Animation Data"

  static operatorOptions = ["REGISTER"];

  constructor(context, workScheduleGlobalId) {
    super(context);

    this.workScheduleGlobalId = workScheduleGlobalId;
  }

  poll() {
    return AECO_TOOLS.bim.sequence !== null && this.context.ifc.activeModel;
  }

  async execute() {
    const model = this.context.ifc.activeModel;

    const scheduleId = this.workScheduleGlobalId || this.context.ifc.activeWorkSchedule

    if (!scheduleId) {
      return { status: "CANCELLED", error: "No active schedule" };
    }

    const animationData = await AECO_TOOLS.bim.sequence.getAnimationData(model, scheduleId);

    this.context.signals.scheduleAnimationDataLoaded?.dispatch(animationData);

    return { status: "FINISHED", result: animationData };
  }
}

class BIM_OP_getElementsAtDate extends Operator {
  static operatorName = "bim.get_elements_at_date"

  static operatorLabel = "Get Elements At Date"

  static operatorOptions = ["REGISTER"];

  constructor(context, workScheduleGlobalId, targetDate) {
    super(context);

    this.workScheduleGlobalId = workScheduleGlobalId;

    this.targetDate = targetDate;
  }

  poll() {
    return AECO_TOOLS.bim.sequence !== null && this.context.ifc.activeModel;
  }

  async execute() {
    const model = this.context.ifc.activeModel;

    const scheduleId = this.workScheduleGlobalId || this.context.ifc.activeWorkSchedule;

    if (!scheduleId || !this.targetDate) {
      return { status: "CANCELLED", error: "Missing schedule or date" };
    }

    const elementsData = await AECO_TOOLS.bim.sequence.getElementsAtDate(
      model,
      scheduleId,
      this.targetDate
    );

    return { status: "FINISHED", result: elementsData };
  }
}

class BIM_OP_getScheduleDateRange extends Operator {
  static operatorName = "bim.get_schedule_date_range"

  static operatorLabel = "Get Schedule Date Range"

  static operatorOptions = ["REGISTER"];

  constructor(context, workScheduleGlobalId) {
    super(context);

    this.workScheduleGlobalId = workScheduleGlobalId;
  }

  poll() {
    return AECO_TOOLS.bim.sequence !== null && this.context.ifc.activeModel;
  }

  async execute() {
    const model = this.context.ifc.activeModel;

    const scheduleId = this.workScheduleGlobalId || this.context.ifc.activeWorkSchedule;

    if (!scheduleId) {
      return { status: "CANCELLED", error: "No active schedule" };
    }

    const dateRange = await AECO_TOOLS.bim.sequence.getScheduleDateRange(model, scheduleId);

    return { status: "FINISHED", result: dateRange };
  }
}

class BIM_OP_editTaskTime extends Operator {
  static operatorName = "bim.edit_task_time"

  static operatorLabel = "Edit Task Time"

  static operatorOptions = ["REGISTER"];

  constructor(context, payload = {}) {
    super(context);

    this.payload = payload;
  }

  poll() {
    return AECO_TOOLS.bim.sequence !== null && this.context.ifc.activeModel;
  }

  async execute() {
    const { taskId, attrName, attrValue } = this.payload || {};

    if (!taskId || !attrName) {
      return { status: "CANCELLED", error: "Missing taskId or attrName" };
    }

    this.context.signals.taskTimeEdited?.dispatch({
      taskId,
      attrName,
      attrValue,
    });

    return {
      status: "FINISHED",
      result: {
        taskId,
        attrName,
        attrValue,
      },
    };
  }
}

class BIM_OP_wireAnimationSchedule extends Operator {
  static operatorName = "bim.wire_animation_schedule"

  static operatorLabel = "Wire Animation to Schedule"

  static operatorOptions = ["REGISTER"];

  constructor(context, workscheduleGlobalId) {
    super(context);

    this.workScheduleGlobalId = workscheduleGlobalId;
  }

  poll() {
    console.warn("BIM_OP_wireAnimationSchedule is currently disabled until a proper implementation is added");
    return false
  }

  async execute() {
    const model = this.context.ifc.activeModel;

    const scheduleId = this.workScheduleGlobalId;

    if (!scheduleId) {
      return { status: "CANCELLED", error: "No schedule specified" };
    }

    this.context.ifc.activeWorkSchedule = scheduleId;

    const tasks = await AECO_TOOLS.bim.sequence.create_tasks_json(model, scheduleId);

    const dateRange = await AECO_TOOLS.bim.sequence.getScheduleDateRange(model, scheduleId);

    const animationData = await AECO_TOOLS.bim.sequence.getAnimationData(model, scheduleId);


    return { status: "FINISHED", result: { scheduleId, tasks, dateRange, animationData } };
  }
}

export default [
  BIM_OP_addWorkSchedule,
  BIM_OP_removeWorkSchedule,
  BIM_OP_switchView,
  BIM_OP_listWorkSchedules,
  BIM_OP_EnableEditingWorkScheduleTasks,
  BIM_OP_enableEditingTask,
  BIM_OP_selectTask,
  BIM_OP_deselectTask,
  BIM_OP_expandNodePath,
  BIM_OP_loadAnimationData,
  BIM_OP_getElementsAtDate,
  BIM_OP_getScheduleDateRange,
  BIM_OP_editTaskTime,
  BIM_OP_wireAnimationSchedule
];

export { BIM_OP_selectTask, BIM_OP_deselectTask };