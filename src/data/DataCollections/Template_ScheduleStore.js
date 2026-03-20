import tools from "../../tool/index.js";

class DataStoreModels {

    get available() {
        return this.getAvailableModels();
    }

    getAvailableModels() {
        if (!tools.ifc) {
            return [];
        }

        return tools.ifc.list_models() || [];
    }

    getAvailableSchedules(modelName) {
        if (!tools.ifc) {
            return { data: [] };
        }

        const model = tools.ifc.get(modelName);

        if (!model) {

            return { data: [] };
        }

        const workSchedules = model.by_type("IfcWorkSchedule");

        console.log("Work schedules for", modelName, ":", workSchedules);

        return { data: workSchedules.toJs() };
    }

    getModel(modelName) {
        if (!tools.ifc) {
            return null;
        }

        return tools.ifc.get(modelName);
    }

    getTotalSchedules(modelName) {
        if (!tools.ifc) {
            return 0;
        }

        const model = this.getModel(modelName);

        if (!model) {
            return 0;
        }

        const workSchedules = model.by_type("IfcWorkSchedule");

        return workSchedules.toJs().length;
    }

    getTotalTasks(modelName, workScheduleId) {
        if (!tools.scheduler) {
            return 0;
        }

        const model = this.getModel(modelName);

        if (!model) {
            return 0;
        }

        const schedule = model.by_id(workScheduleId);

        if (!schedule) {
            return 0;
        }

        const totalTasks = tools.sequence.total_tasks(schedule);

        return totalTasks;
    }
}

const dataStoreModels = new DataStoreModels();

export default dataStoreModels;