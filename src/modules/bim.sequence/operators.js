import { Operator } from "../../operators/Operator.js";

import operators from "../../operators/Operators.js";

import * as ScheduleCore from "../../core/bim.sequence.js";

import AECO_tools from "../../tool/index.js";

import { IfcRoot } from "../../data/index.js";

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
      ifc: AECO_tools.ifc,
      sequence: AECO_tools.bim.sequence,
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
      ifc: AECO_tools.ifc,
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
    return AECO_tools.ifc !== null;
  }

  execute() {
    if (!this.context.activeWorkScheduleSource) {
      console.error("Model name is required");

      return { status: "CANCELLED" };
    }

    try {
      const model = AECO_tools.ifc.get(this.context.activeWorkScheduleSource);

      if (!model) {
        console.error("Model not found:", this.context.activeWorkScheduleSource);

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

class BIM_OP_enableEditingWorkSchedules extends Operator {
  static operatorName = "bim.enable_editing_work_schedules"

  static operatorLabel = "Enable Editing Work Schedule"

  static operatorOptions = ["REGISTER"];

  constructor( context, model ) {
    super( context );

    this.model = model;
  }

  poll() {
    
    return true
  }

   async execute() {

    ScheduleCore.enable_editing_work_schedules(this.model, {
      sequence: AECO_tools.bim.sequence,
      signals: this.context.signals
    });
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

    return AECO_tools.bim.sequence !== null && this.context.ifc.activeModel;
    
  }

   async execute() {

      const model = this.context.ifc.activeModel

      const workScheduleId = this.scheduleId

      ScheduleCore.enable_editing_workschedule_tasks( model, workScheduleId,  { 
        ifc:AECO_tools.ifc, 
        sequence:AECO_tools.bim.sequence, 
        signals: this.context.signals, 
        context: this.context 
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

class BIM_OP_selectTask extends Operator {
  static operatorName = "bim.select_task"

  static operatorLabel = "Select Schedule Task"

  static operatorOptions = ["REGISTER"];

  constructor( context,  taskId ) {
    super( context );

    this.taskId = taskId;
  }

  poll() {
    return AECO_tools.ifc !== null && AECO_tools.scheduler !== null;
  }

    async execute() { 

      AECO_tools.scheduler.addSelectedTask(this.taskId);

      const selectedTasks = AECO_tools.scheduler.getSelectedTasks();

      console.log("Selected tasks:", selectedTasks);

      const lastSelected = selectedTasks[selectedTasks.length - 1];

      console.log("Last selected task ID:", lastSelected);

      const activeModel = this.context.ifc.activeModel;

      const taskDetails = await AECO_tools.bim.sequence.getTaskDetails(activeModel, lastSelected);

      const outputGuids = taskDetails.outputs?.map(o => o.GlobalId) || [];

      if (outputGuids.length > 0) {
        console.log("Output elements for task", lastSelected, ":", outputGuids);

        AECO_tools.world.scene.selectObjectsByGuid(this.context, outputGuids);
      }

      this.context.signals.taskSelected.dispatch({ taskId: this.taskId, selected: true });
      
      this.context.signals.taskSelectionChanged.dispatch({ selectedCount: selectedTasks.length });

      this.context.signals.taskDetailsLoaded.dispatch({ 
        taskId: this.taskId,
        outputs: taskDetails.outputs || [],
        inputs: taskDetails.inputs || [],
        resources: taskDetails.resources || []
      });
    
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
    return AECO_tools.initialized.bim;
  }

    async execute() {
      AECO_tools.scheduler.removeSelectedTask(this.taskId);

      const selectedTasks = AECO_tools.scheduler.getSelectedTasks();

      this.context.signals.taskSelected.dispatch({ taskId: this.taskId, selected: false });
      
      this.context.signals.taskSelectionChanged.dispatch({ selectedCount: selectedTasks.length });
    
    }

}

class BIM_OP_expandNodePath extends Operator {
  static operatorName = "bim.expand_node_path"

  static operatorLabel = "Expand Node Path"

  static operatorOptions = ["REGISTER"];

  constructor( context, workscheduleId, pathType ) {
    super( context );

    this.workscheduleId = workscheduleId;

    this.pathType = pathType;
  }

  poll() {
    return AECO_tools.initialized.bim;
  }

   async execute() {
      const modelName =
        this.context.activeWorkScheduleSource || this.context.ifc?.activeModel;

      if (!modelName) {
        console.error("bim.expand_node_path: no model name (activeWorkScheduleSource / ifc.activeModel)");

        return { status: "CANCELLED" };
      }

      let nodeIds = [];

      try {
        if (this.pathType === "critical") {
          const result = await AECO_tools.ifc.runTool(modelName, {
            toolName: "sequence",
            functionName: "get_critical_path_tasks",
            args: {
              work_schedule: new IfcRoot(this.workscheduleId),
            },
          });

          nodeIds = Array.isArray(result) ? result : [];
        }

        this.context.signals.nodePathExpanded.dispatch({
          workscheduleId: this.workscheduleId,
          pathType: this.pathType,
          nodeIds,
        });

        return { status: "FINISHED" };
      } catch (error) {
        console.error("bim.expand_node_path failed:", error);

        return { status: "CANCELLED" };
      }
    }

}



class BIM_OP_test extends Operator {
  static operatorName = "bim.test"

  static operatorLabel = "Test Scheduler"

  static operatorOptions = ["REGISTER"];

  constructor( context, model, workscheduleGlobalId, path ) {
    super( context );

    this.model = model || context.activeModel ;

    this.workscheduleGlobalId = workscheduleGlobalId || "dus1jb-sdaze";

    this.path = path || "/data/tasks/sample_tasks.json";
  }

  poll() {
    return true
  }

  async execute() {

    const response = await fetch(this.path);

    const SAMPLE_TASKS = await response.json();

    const model =  this.model

    const GlobalId = this.workscheduleGlobalId

    const tasks  = await AECO_tools.bim.sequence.create_tasks_json(model, GlobalId)
    
    this.context.signals.enableEditingWorkScheduleTasks.dispatch({ model: model, workscheduleGlobalId: GlobalId, tasks: tasks });
    
  }

}


class BIM_OP_loadAnimationData extends Operator {
  static operatorName = "bim.load_animation_data"

  static operatorLabel = "Load Animation Data"

  static operatorOptions = ["REGISTER"];

  constructor(context, workScheduleId) {
    super(context);

    this.workScheduleId = workScheduleId;
  }

  poll() {
    return AECO_tools.bim.sequence !== null && this.context.ifc.activeModel;
  }

  async execute() {
    const model = this.context.ifc.activeModel;

    const scheduleId = this.workScheduleId || AECO_tools.scheduler?.getActiveSchedule();

    if (!scheduleId) {
      return { status: "CANCELLED", error: "No active schedule" };
    }

    const animationData = await AECO_tools.bim.sequence.getAnimationData(model, scheduleId);

    this.context.signals.scheduleAnimationDataLoaded?.dispatch(animationData);

    return { status: "FINISHED", result: animationData };
  }
}


class BIM_OP_getElementsAtDate extends Operator {
  static operatorName = "bim.get_elements_at_date"

  static operatorLabel = "Get Elements At Date"

  static operatorOptions = ["REGISTER"];

  constructor(context, workScheduleId, targetDate) {
    super(context);

    this.workScheduleId = workScheduleId;

    this.targetDate = targetDate;
  }

  poll() {
    return AECO_tools.bim.sequence !== null && this.context.ifc.activeModel;
  }

  async execute() {
    const model = this.context.ifc.activeModel;

    const scheduleId = this.workScheduleId || AECO_tools.scheduler?.getActiveSchedule();

    if (!scheduleId || !this.targetDate) {
      return { status: "CANCELLED", error: "Missing schedule or date" };
    }

    const elementsData = await AECO_tools.bim.sequence.getElementsAtDate(
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

  constructor(context, workScheduleId) {
    super(context);

    this.workScheduleId = workScheduleId;
  }

  poll() {
    return AECO_tools.bim.sequence !== null && this.context.ifc.activeModel;
  }

  async execute() {
    const model = this.context.ifc.activeModel;

    const scheduleId = this.workScheduleId || AECO_tools.scheduler?.getActiveSchedule();

    if (!scheduleId) {
      return { status: "CANCELLED", error: "No active schedule" };
    }

    const dateRange = await AECO_tools.bim.sequence.getScheduleDateRange(model, scheduleId);

    return { status: "FINISHED", result: dateRange };
  }
}


class BIM_OP_playAnimation extends Operator {
  static operatorName = "bim.play_animation"

  static operatorLabel = "Play Animation"

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);
  }

  poll() {
    return !!this.context?.timelinePlayerController;
  }

  execute() {
    return operators.execute("timeline_player.play_animation", this.context);
  }
}


class BIM_OP_pauseAnimation extends Operator {
  static operatorName = "bim.pause_animation"

  static operatorLabel = "Pause Animation"

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);
  }

  poll() {
    return !!this.context?.timelinePlayerController;
  }

  execute() {
    return operators.execute("timeline_player.pause_animation", this.context);
  }
}


class BIM_OP_stopAnimation extends Operator {
  static operatorName = "bim.stop_animation"

  static operatorLabel = "Stop Animation"

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);
  }

  poll() {
    return !!this.context?.timelinePlayerController;
  }

  execute() {
    return operators.execute("timeline_player.stop_animation", this.context);
  }
}


class BIM_OP_setAnimationDate extends Operator {
  static operatorName = "bim.set_animation_date"

  static operatorLabel = "Set Animation Date"

  static operatorOptions = ["REGISTER"];

  constructor(context, targetDate) {
    super(context);

    this.targetDate = targetDate;
  }

  poll() {
    return !!this.context?.timelinePlayerController;
  }

  execute() {
    return operators.execute("timeline_player.set_animation_date", this.context, this.targetDate);
  }
}


class BIM_OP_setAnimationColorScheme extends Operator {
  static operatorName = "bim.set_animation_color_scheme"

  static operatorLabel = "Set Animation Color Scheme"

  static operatorOptions = ["REGISTER"];

  constructor(context, scheme, mode) {
    super(context);

    this.scheme = scheme;

    this.mode = mode;
  }

  poll() {
    return !!this.context?.timelinePlayerController;
  }

  execute() {
    return operators.execute("timeline_player.set_animation_color_scheme", this.context, this.scheme, this.mode);
  }
}


class BIM_OP_wireAnimationSchedule extends Operator {
  static operatorName = "bim.wire_animation_schedule"

  static operatorLabel = "Wire Animation to Schedule"

  static operatorOptions = ["REGISTER"];

  constructor(context, workScheduleId) {
    super(context);

    this.workScheduleId = workScheduleId;
  }

  poll() {
    return AECO_tools.bim.sequence !== null && this.context.ifc.activeModel;
  }

  async execute() {
    const model = this.context.ifc.activeModel;

    const scheduleId = this.workScheduleId;

    console.log("[WireAnimation] Starting wire for schedule:", scheduleId);

    if (!scheduleId) {
      return { status: "CANCELLED", error: "No schedule specified" };
    }

    AECO_tools.scheduler.setActiveSchedule(scheduleId);

    const tasks = await AECO_tools.bim.sequence.create_tasks_json(model, scheduleId);

    console.log("[WireAnimation] Loaded tasks:", tasks.length);

    AECO_tools.scheduler.setTasks(tasks);

    const dateRange = await AECO_tools.bim.sequence.getScheduleDateRange(model, scheduleId);

    console.log("[WireAnimation] Date range from Python:", dateRange);

    const animationData = await AECO_tools.bim.sequence.getAnimationData(model, scheduleId);

    console.log("[WireAnimation] Animation data:", {
      taskCount: animationData.tasks ? animationData.tasks.length : 0,
      totalOutputs: animationData.totalOutputs || 0,
      totalInputs: animationData.totalInputs || 0
    });

    if ((animationData.totalOutputs || 0) === 0 && (animationData.totalInputs || 0) === 0) {
      console.warn("[WireAnimation] WARNING: No elements linked to tasks. Animation will run but no elements will be affected.");
      console.warn("[WireAnimation] To link elements, the IFC file needs IfcRelAssignsToProcess relationships between tasks and products.");
    }

    this.context.signals.scheduleAnimationWired.dispatch({
      workScheduleId: scheduleId,
      tasks,
      dateRange,
      animationData
    });

    return { status: "FINISHED", result: { scheduleId, tasks, dateRange, animationData } };
  }
}


export default [
  BIM_OP_addWorkSchedule,
  BIM_OP_removeWorkSchedule,
  BIM_OP_switchView,
  BIM_OP_listWorkSchedules,
  BIM_OP_enableEditingWorkSchedules,
  BIM_OP_EnableEditingWorkScheduleTasks,
  BIM_OP_selectTask,
  BIM_OP_deselectTask,
  BIM_OP_expandNodePath,
  BIM_OP_test,
  BIM_OP_loadAnimationData,
  BIM_OP_getElementsAtDate,
  BIM_OP_getScheduleDateRange,
  BIM_OP_playAnimation,
  BIM_OP_pauseAnimation,
  BIM_OP_stopAnimation,
  BIM_OP_setAnimationDate,
  BIM_OP_setAnimationColorScheme,
  BIM_OP_wireAnimationSchedule
];

export function updateTaskProperties(params) {
    const { selectedTasks, workSchedule, scheduler } = params;

    selectedTasks.forEach(taskId => {
        const task = scheduler.getTask(taskId);

        if (task && task.task) {
            
            if (params.name) {
                task.task.Name = params.name;
            }

            if (params.description) {
                task.task.Description = params.description;
            }
            // TODO: Update other properties as needed
        }
    });

    return { status: 'success', updatedTasks: selectedTasks.length };
}

/**
 * Create task dependency operation
 */
export function createTaskDependency(params) {
    const { selectedTasks, workSchedule, scheduler } = params;

    if (selectedTasks.length !== 2) {
        throw new Error('Dependency creation requires exactly 2 selected tasks');
    }

    const [predecessorId, successorId] = selectedTasks;

    const predecessor = scheduler.getTask(predecessorId);

    const successor = scheduler.getTask(successorId);

    if (!predecessor || !successor) {
        throw new Error('Invalid tasks selected for dependency');
    }

    // TODO: Implement actual dependency creation using ifcopenshell
    return { status: 'success', dependency: { predecessor: predecessorId, successor: successorId } };
}

/**
 * Assign resources to task operation
 */
export function assignTaskResources(params) {
    const { selectedTasks, workSchedule, scheduler, resourceIds } = params;

    if (!resourceIds || resourceIds.length === 0) {
        throw new Error('Resource IDs are required');
    }

    selectedTasks.forEach(taskId => {
        const task = scheduler.getTask(taskId);

        if (task && task.task) {
            // TODO: Implement resource assignment using ifcopenshell
   
          }
    });

    return { status: 'success', assignedTasks: selectedTasks.length, resources: resourceIds };
}

/**
 * Update task dates operation
 */
export function updateTaskDates(params) {
    const { selectedTasks, workSchedule, scheduler, startDate, endDate } = params;

    selectedTasks.forEach(taskId => {
        const task = scheduler.getTask(taskId);

        if (task && task.task && task.task.TaskTime) {
            if (startDate) {
                task.task.TaskTime.ScheduleStart = startDate;
            }

            if (endDate) {
                task.task.TaskTime.ScheduleFinish = endDate;
            }
          }
    });

    return { status: 'success', updatedTasks: selectedTasks.length };
}

/**
 * Delete tasks operation
 */
export function deleteTasks(params) {
    const { selectedTasks, workSchedule, scheduler } = params;

    return { status: 'success', deletedTasks: selectedTasks.length };
}

export { BIM_OP_selectTask, BIM_OP_deselectTask };