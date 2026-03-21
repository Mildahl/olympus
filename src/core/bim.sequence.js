import { IfcRoot, IfcModel } from "../data/index.js";

import  IfcTool from '../tool/bim/ifc.js';

import SequenceTool from "../tool/bim/sequence.js";

import { refreshData } from "../modules/bim.sequence/data.js";

/**
 * Adds a work schedule to the specified IFC model.
 * 
 * @param {IfcModel} model - The IFC model to which the work schedule will be added.
 * @param {string} scheduleName - The name of the work schedule.
 * @param {string} predefinedType - The predefined type of the work schedule.
 * @param {string} objectType - The object type of the work schedule.
 * @param {Object} options - Additional options.
 * @param {IfcTool} options.ifc - The IFC tool to use for operations.
 * @param {Object} options.signals - The signals object for dispatching events.
 */
async function add_work_schedule(model, scheduleName, predefinedType, objectType, { ifc=IfcTool, sequence=SequenceTool, signals }) {

    const result = await ifc.runAPI(model, 'sequence.add_work_schedule', {
        name:scheduleName, 
        predefined_type: predefinedType, 
    })

    refreshData();

    signals.workschedulechanged.dispatch();

    return result;
}

async function enable_editing_workschedule_tasks( activeModel, GlobalId,  { ifc=IfcTool, sequence=SequenceTool, signals, context, viewType = "gantt" }) {
    if (!GlobalId) return false;

    const tasks =  await sequence.create_tasks_json( activeModel, GlobalId );

    context.activeWorkSchedule = GlobalId;

    context.signals.enableEditingWorkScheduleTasks.dispatch({
        model: activeModel,
        workscheduleGlobalId: GlobalId,
        viewType,
        tasks,
    });

    return true;
}

async function remove_work_schedule(model, scheduleId, { ifc, signals }) {

    if (!model || !scheduleId) {
        console.error("Model and scheduleId are required to remove a work schedule.");

        return "Invalid parameters";
    }

    const isWorkSchedule = await ifc.isA(model, scheduleId, "IfcWorkSchedule")

    if (!isWorkSchedule) {
        console.error("The specified GlobalId does not correspond to an IfcWorkSchedule:", this.GlobalId);

        return "Not a work schedule";
    }

    const result = await ifc.runAPI(model, 'sequence.remove_work_schedule', {
        work_schedule: new IfcRoot(scheduleId)
    });

    refreshData();

    signals.workschedulechanged.dispatch();

    return result;

}

async function add_work_plan(workPlanName = 'default', { ifc, signals }) {

    const result = await ifc.runAPI('sequence.add_work_plan', {name: workPlanName});
    return result;
}

async function remove_work_plan(GlobalId, { ifc, signals }) {

    const result = await ifc.runAPI('sequence.remove_work_plan', {work_plan: new IfcRoot(GlobalId)});
}
async function enable_editing_work_plan( GlobalId, { sequence , signals }) {

    const workScheduleData = await sequence.get_work_plan_attributes( GlobalId );

    await sequence.load_work_plan_attributes( GlobalId, workScheduleData);

    signals.enableEditingWorkplan.dispatch({ GlobalId });
}

async function disable_editing_work_plan( GlobalId, { bimTools, signals }) {
}

function enable_editing_work_schedules( model, { sequence , signals }) {

    refreshData();

    signals.workschedulechanged.dispatch();

}
export {
    add_work_plan,
    remove_work_plan,
    enable_editing_work_plan,
    disable_editing_work_plan,
    add_work_schedule,
    remove_work_schedule,
    enable_editing_workschedule_tasks,
    enable_editing_work_schedules,
    computeScheduleFrame,
};

/**
 * Compute schedule-driven timeline frame data (task-agnostic output).
 *
 * Returns guids to show, active guids to tint, and a color map for active elements.
 */
function computeScheduleFrame(tasks, date, { schemeName = "standard", mode = "predefinedType", schemes = {}, resolveGuid } = {}) {
    const d = date instanceof Date ? date : new Date(date);
    if (!d || Number.isNaN(d.getTime())) return null;

    const scheme = schemes[schemeName] || schemes.standard;
    if (!scheme) return null;

    const activeGuids = new Set();
    const completedGuids = new Set();
    const colorByGuid = new Map();

    for (const task of tasks || []) {
        const taskStart = task?.startDate ? new Date(task.startDate) : null;
        const taskEnd = task?.endDate ? new Date(task.endDate) : null;
        if (!taskStart || !taskEnd) continue;

        const isActive = d >= taskStart && d <= taskEnd;
        const isCompleted = d > taskEnd;
        if (!isActive && !isCompleted) continue;

        const outputs = task?.outputs || [];
        const inputs = task?.inputs || [];

        const getGuid = (value) => {
            if (typeof resolveGuid === "function") return resolveGuid(value);
            if (typeof value === "string") return value;
            return value?.GlobalId || null;
        };

        const pushGuid = (rawGuid, isInput = false) => {
            const guid = getGuid(rawGuid);
            if (!guid) return;

            if (isCompleted) completedGuids.add(guid);
            else activeGuids.add(guid);

            if (!isCompleted) {
                // Only active items are tinted (completed reverts to original).
                let color;
                if (mode === "predefinedType") {
                    const predefinedType = task?.predefinedType || "CONSTRUCTION";
                    color = scheme.predefinedTypes?.[predefinedType] ?? scheme.predefinedTypes?.NOTDEFINED;
                } else if (mode === "status") {
                    const status = isActive ? "STARTED" : "NOTSTARTED";
                    color = scheme.status?.[status];
                } else {
                    color = isInput ? scheme.input : scheme.output;
                }

                if (color != null) colorByGuid.set(guid, color);
            }
        };

        outputs.forEach((o) => pushGuid(o, false));
        inputs.forEach((i) => pushGuid(i, true));
    }

    const visibleGuids = new Set([...activeGuids, ...completedGuids]);

    return { visibleGuids, activeGuids, completedGuids, colorByGuid };
}
