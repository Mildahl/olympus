class SchedulerTool {

  static selectedTasks = new Map();

  static taskCache = new Map();

  static activeScheduleId = null;

  static addSelectedTask(taskId) {
    const scheduleId = this.activeScheduleId;

    if (!this.selectedTasks.has(scheduleId)) {
      this.selectedTasks.set(scheduleId, new Set());
    }

    this.selectedTasks.get(scheduleId).add(taskId);

    return true;
  }

  static removeSelectedTask(taskId) {
    const scheduleId = this.activeScheduleId;

    const selection = this.selectedTasks.get(scheduleId);

    if (!selection) {
      return false;
    }

    return selection.delete(taskId);
  }

  static getSelectedTasks(scheduleId) {
    const id = scheduleId || this.activeScheduleId;

    const selection = this.selectedTasks.get(id);

    return selection ? Array.from(selection) : [];
  }

  static clearSelectedTasks(scheduleId) {
    const id = scheduleId || this.activeScheduleId;

    this.selectedTasks.delete(id);
  }

  static isTaskSelected(taskId, scheduleId) {
    const id = scheduleId || this.activeScheduleId;

    const selection = this.selectedTasks.get(id);

    return selection ? selection.has(taskId) : false;
  }

  static setActiveSchedule(scheduleId) {
    this.activeScheduleId = scheduleId;
  }

  static getActiveSchedule() {
    return this.activeScheduleId;
  }

  static setTask(taskId, taskData) {
    this.taskCache.set(taskId, taskData);
  }

  static getTask(taskId) {
    return this.taskCache.get(taskId);
  }

  static setTasks(tasks) {
    for (const task of tasks) {
      const id = task.id || task.GlobalId;

      this.taskCache.set(id, task);
    }
  }

  static getTasks() {
    return Array.from(this.taskCache.values());
  }

  static clearTasks() {
    this.taskCache.clear();
  }

  static clearAll() {
    this.selectedTasks.clear();

    this.taskCache.clear();

    this.activeScheduleId = null;
  }

  static getSelectionCount(scheduleId) {
    const id = scheduleId || this.activeScheduleId;

    const selection = this.selectedTasks.get(id);

    return selection ? selection.size : 0;
  }

  static selectAllTasks(scheduleId) {
    const id = scheduleId || this.activeScheduleId;

    if (!this.selectedTasks.has(id)) {
      this.selectedTasks.set(id, new Set());
    }

    const selection = this.selectedTasks.get(id);

    for (const [taskId] of this.taskCache) {
      selection.add(taskId);
    }

    return this.getSelectedTasks(id);
  }

  static deselectAllTasks(scheduleId) {
    const id = scheduleId || this.activeScheduleId;

    this.selectedTasks.delete(id);
  }

  static toggleTaskSelection(taskId, scheduleId) {
    const id = scheduleId || this.activeScheduleId;

    if (this.isTaskSelected(taskId, id)) {
      this.removeSelectedTask(taskId);

      return false;
    }

    this.addSelectedTask(taskId);

    return true;
  }
}

export default SchedulerTool;
