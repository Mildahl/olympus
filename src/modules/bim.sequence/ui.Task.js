import { Components as UIComponents } from "../../ui/Components/Components.js";

import { SequenceData } from "./data.js";

import Paths from "../../utils/paths.js";


async function loadData(context) {
  if (!SequenceData.is_loaded)
    await SequenceData.load(context.ifc.activeModel);
}

async function refreshSchedules(context) {
  SequenceData.is_loaded = false;

    await loadData(context);
}

class TaskUI {
  constructor({ context, operators }) {
    this.context = context;
    this.operators = operators;
    this.isActive = false;
    this.panel = UIComponents.floatingPanel({
      context,
      title: "Task data",
      icon: "info",
      minimizedImageSrc: Paths.data("resources/images/task.svg"),
      
      workspaceTabId: "sequence-task-details",
      workspaceTabLabel: "Task data",
      startMinimized: true,
    });
    this.panel
      .setStyle("width", ["min(48vw, 760px)"])
      .setStyle("height", ["min(58vh, 520px)"])
      .setStyle("min-width", ["320px"])
      .setStyle("max-width", ["70vw"]);
    this.content = UIComponents.column();
    this.content.setStyle("height", ["100%"]);
    this.panel.setContent(this.content);


    this.taskDetailsBody = UIComponents.column()
      .addClass("TaskDetails-content")
      .setStyle("flex", ["1"])
      .setStyle("overflow", ["auto"])
      .setStyle("padding", ["var(--phi-0-5)"])
      .setStyle("gap", ["var(--phi-1)"]);

    this.content.add(this.taskDetailsBody);

    this.context.viewport.dom.appendChild(this.panel.dom);

    this.isActive = true;
    
    this.showEmptyTaskDetails();

    context.signals.taskClicked.add(({ taskId }) => {
      this.refreshTaskDetails(taskId);
    });
    
  }

  show() {
    if (this.panel && this.panel.isMinimized) {
      this.panel.restore();
    }

    this.context.viewport.dom.appendChild(this.panel.dom);

    this.isActive = true;
    return this;
  }

  hide() {
    if (this.panel && this.panel.dom.parentNode) {
      this.panel.dom.parentNode.removeChild(this.panel.dom);
    }
    this.isActive = false;
    return this;
  }



  requestTaskDetails(taskId) {
    if (taskId === undefined || taskId === null) {
      return;
    }

    this.operators.execute("bim.enable_editing_task", this.context, taskId);
  }

  showEmptyTaskDetails() {
    if (!this.taskDetailsBody) {
      return;
    }

    this.taskDetailsBody.clear();

    const emptyState = UIComponents.text("Select a task to view its details");

    emptyState.setStyle("font-style", ["italic"]);
    emptyState.setStyle("padding", ["var(--phi-1)"]);
    emptyState.setStyle("text-align", ["center"]);
    emptyState.setStyle("width", ["100%"]);

    this.taskDetailsBody.add(emptyState);
  }

  _resolveTasksByIds(taskIds = []) {
    const tasksStore = SequenceData.data.tasks || {};

    return taskIds
      .map((relatedTaskId) => {
        const task = tasksStore[relatedTaskId];

        if (!task) {
          return null;
        }

        return {
          id: relatedTaskId,
          task,
        };
      })
      .filter(Boolean);
  }

  /**
   * Resolve IfcRelSequence IDs into task + sequence metadata.
   * @param {number[]} sequenceIds - entity IDs of IfcRelSequence
   * @param {"predecessor"|"successor"} side - which side of the relationship to extract
   *   "predecessor" → extract RelatingProcess (the predecessor task)
   *   "successor"   → extract RelatedProcess  (the successor task)
   */
  _resolveSequenceRelationships(sequenceIds = [], side = "successor") {
    const sequencesStore = SequenceData.data.sequences || {};
    const tasksStore = SequenceData.data.tasks || {};

    return sequenceIds
      .map((seqId) => {
        const seq = sequencesStore[seqId];
        if (!seq) return null;

        const taskId = side === "predecessor" ? seq.RelatingProcess : seq.RelatedProcess;
        const task = tasksStore[taskId];
        if (!task) return null;

        return {
          id: taskId,
          task,
          sequenceType: seq.SequenceType || "FINISH_START",
          timeLag: seq.TimeLag,
          userDefinedSequenceType: seq.UserDefinedSequenceType || null,
        };
      })
      .filter(Boolean);
  }

  _createRelatedEntitySection(title, icon, items = []) {
    const section = UIComponents.column();

    section.setStyle("flex", ["1"]);
    section.setStyle("min-width", ["170px"]);
    section.setStyle("max-height", ["100%"]);
    section.setStyle("overflow", ["hidden"]);

    const sectionHeader = UIComponents.row()
      .gap("var(--phi-0-25)")
      .setStyle("align-items", ["center"])
      .setStyle("margin-bottom", ["var(--phi-0-5)"]);

    const sectionIcon = UIComponents.icon(icon);

    sectionIcon.setStyle("fontSize", ["14px"]);
    sectionIcon.setStyle("color", ["var(--theme-accent)"]);

    const sectionTitle = UIComponents.text(title);

    sectionTitle.setStyle("font-weight", ["600"]);
    sectionTitle.setStyle("font-size", ["0.8rem"]);

    const countBadge = UIComponents.badge(String(items.length));

    countBadge.setStyle("font-size", ["10px"]);
    countBadge.setStyle("padding", ["1px 6px"]);
    countBadge.setStyle("margin-left", ["var(--phi-0-25)"]);

    sectionHeader.add(sectionIcon, sectionTitle, countBadge);

    const itemList = UIComponents.column();

    itemList.setStyle("gap", ["2px"]);
    itemList.setStyle("overflow", ["auto"]);
    itemList.setStyle("flex", ["1"]);
    itemList.setStyle("padding-right", ["var(--phi-0-25)"]);

    if (items.length === 0) {
      const noItems = UIComponents.text("None");

      noItems.setStyle("font-size", ["0.75rem"]);
      noItems.setStyle("font-style", ["italic"]);

      itemList.add(noItems);
    } else {
      items.forEach((item) => {
        const itemRow = UIComponents.row()
          .gap("var(--phi-0-25)")
          .setStyle("padding", ["3px 6px"])
          .setStyle("background", ["var(--theme-background)"])
          .setStyle("border-radius", ["3px"])
          .setStyle("align-items", ["center"])
          .setStyle("cursor", ["default"]);

        const itemName = UIComponents.text(item.Name || "Unnamed");

        itemName.setStyle("font-size", ["0.75rem"]);
        itemName.setStyle("white-space", ["nowrap"]);
        itemName.setStyle("overflow", ["hidden"]);
        itemName.setStyle("text-overflow", ["ellipsis"]);

        itemName.setTooltip(item.Name || "Unnamed");

        itemRow.add(itemName);

        itemList.add(itemRow);
      });
    }

    section.add(sectionHeader, itemList);

    return section;
  }

  _createRelatedTaskItem(taskId, task, fallbackLabel = "Unnamed Task", sequenceInfo = null) {
    const item = UIComponents.listItem().addClass("Clickable");

    item.setStyle("justify-content", ["space-between"]);
    item.setStyle("align-items", ["center"]);
    item.setStyle("gap", ["var(--phi-0-5)"]);

    const meta = UIComponents.column().gap("2px");

    meta.setStyle("min-width", ["0"]);
    meta.setStyle("flex", ["1"]);

    const taskName = UIComponents.text(task.Name || task.pName || fallbackLabel);

    taskName.setStyle("font-weight", ["500"]);
    taskName.setStyle("white-space", ["nowrap"]);
    taskName.setStyle("overflow", ["hidden"]);
    taskName.setStyle("text-overflow", ["ellipsis"]);

    const subLabelParts = [];

    if (task.Identification) {
      subLabelParts.push(task.Identification);
    }

    subLabelParts.push(`#${taskId}`);

    if (sequenceInfo) {
      const seqType = sequenceInfo.sequenceType || "FINISH_START";
      const seqLabel = { FINISH_START: "FS", START_START: "SS", FINISH_FINISH: "FF", START_FINISH: "SF" }[seqType] || seqType;
      subLabelParts.push(seqLabel);
    }

    const taskMeta = UIComponents.text(subLabelParts.join(" • "));

    taskMeta.setStyle("font-size", ["0.75rem"]);
    taskMeta.setStyle("color", ["var(--theme-text-light)"]);
    taskMeta.setStyle("white-space", ["nowrap"]);
    taskMeta.setStyle("overflow", ["hidden"]);
    taskMeta.setStyle("text-overflow", ["ellipsis"]);

    meta.add(taskName, taskMeta);

    const navigateOperator = UIComponents.operator("open_in_new");

    navigateOperator.addClass("CodeEditor-toolbar-btn");
    navigateOperator.dom.title = "Open task details";
    navigateOperator.onClick((event) => {
      if (event && event.stopPropagation) {
        event.stopPropagation();
      }

      this.operators.execute("bim.enable_editing_task", this.context, taskId);
    });

    item.onClick(() => {
      this.operators.execute("bim.enable_editing_task", this.context, taskId);
    });

    item.add(meta, navigateOperator);

    return item;
  }

  _createRelatedTasksSection(title, icon, relatedTasks = []) {
    const section = UIComponents.collapsibleSection({
      title: `${title} (${relatedTasks.length})`,
      icon,
      collapsed : relatedTasks.length === 0 ? false : true,
    });

    const content = UIComponents.column().gap("var(--phi-0-5)");
    const list = UIComponents.column().gap("2px");

    if (relatedTasks.length === 0) {
      const emptyState = UIComponents.text("None");

      emptyState.setStyle("font-size", ["0.75rem"]);
      emptyState.setStyle("font-style", ["italic"]);
      emptyState.setStyle("padding", ["var(--phi-0-5)"]);

      content.add(emptyState);
    } else {
      relatedTasks.forEach((entry) => {
        const seqInfo = entry.sequenceType ? entry : null;
        list.add(this._createRelatedTaskItem(entry.id, entry.task, "Unnamed Task", seqInfo));
      });

      content.add(list);
    }

    section.setContent(content);

    return section;
  }

  _createRelatedCostsSection(title, icon, relatedCosts = []) {
    const section = UIComponents.collapsibleSection({
      title: `${title} (${relatedCosts.length})`,
      icon,
      collapsed : relatedCosts.length === 0 ? false : true,
    });

    const content = UIComponents.column().gap("var(--phi-0-5)");
    const list = UIComponents.column().gap("2px");

    if (relatedCosts.length === 0) {
      const emptyState = UIComponents.text("None");

      emptyState.setStyle("font-size", ["0.75rem"]);
      emptyState.setStyle("font-style", ["italic"]);
      emptyState.setStyle("padding", ["var(--phi-0-5)"]);
      content.add(emptyState);
    } else {
      relatedCosts.forEach((cost) => {
        const costItem = UIComponents.row().gap("var(--phi-0-25)").setStyle("align-items", ["center"]);
        const costName = UIComponents.text().addClass("Badge");
        costName.setValue(cost);
        // costName.setValue(cost.Name || "Unnamed Cost");
        costName.setStyle("font-size", ["0.75rem"]);
        costName.setStyle("white-space", ["nowrap"]);
        costName.setStyle("overflow", ["hidden"]);
        costName.setStyle("text-overflow", ["ellipsis"]);
        costName.setTooltip(cost.Name || "Unnamed Cost");
        costItem.add(costName);
        list.add(costItem);
      });

      content.add(list);
    }

    section.setContent(content);
    return section;
  }

  refreshTaskDetails(taskId) {
    if (!this.taskDetailsBody) {
      return;
    }

    const tasksStore = SequenceData.data.tasks || {};
    const details = tasksStore[taskId];

    if (!details) {
      this.showEmptyTaskDetails();
      return;
    }
    
    this.taskDetailsBody.clear();

    const list = UIComponents.column().gap("2px").addClass("Column");

    const propertyRows = [
      ["Is Milestone", details.IsMilestone ? "Yes" : "No"],
      ["Identification", details.Identification || "N/A"],
      ["Name", details.Name || "Unnamed Task"],
      ["Description", details.Description || details.LongDescription || "N/A"],
      ["Type", details.type || details.ObjectType || "N/A"],
      ["Predefined Type", details.PredefinedType || "N/A"],
      ["Status", details.Status || details.status || "N/A"],
      ["Work Method", details.WorkMethod || "N/A"],
      ["Priority", details.Priority ?? "N/A"],
      ["Related Objects", details.RelatedObjects ? details.RelatedObjects : "N/A"],
    ];

    propertyRows.forEach(([label, value]) => {
      list.add(UIComponents.createPropertyRow(label, value));
    });

    const grid = UIComponents.div();

    grid.setStyle("display", ["grid"]);
    grid.setStyle("grid-template-columns", ["repeat(auto-fit, minmax(150px, 1fr))"]);
    grid.setStyle("gap", ["var(--phi-1)"]);

    const outputsList = details.Outputs ? details.Outputs : [];

    const inputsList = details.Inputs ? details.Inputs : [];

    const resourcesList = details.Resources ? details.Resources : [];

    // IsPredecessorTo = IfcRelSequence IDs where this task is the predecessor (RelatingProcess)
    //   → the other tasks (RelatedProcess) are this task's successors
    // IsSuccessorFrom = IfcRelSequence IDs where this task is the successor (RelatedProcess)
    //   → the other tasks (RelatingProcess) are this task's predecessors
    const predecessors = this._resolveSequenceRelationships(details.IsSuccessorFrom || [], "predecessor");

    const successors = this._resolveSequenceRelationships(details.IsPredecessorTo || [], "successor");

    const nestedTasks = this._resolveTasksByIds(details.Nests || []);

    const outputsSection = this._createRelatedEntitySection("Outputs", "output", outputsList);

    const inputsSection = this._createRelatedEntitySection("Inputs", "input", inputsList);

    const resourcesSection = this._createRelatedEntitySection("Resources", "person", resourcesList);

    const relatedTaskSections = UIComponents.column().gap("var(--phi-0-75)");

    const associatedCosts = details.Controls && details.Controls.length > 0 ? details.Controls : [];



    relatedTaskSections.add(
      this._createRelatedTasksSection("Predecessors", "call_split", predecessors),
      this._createRelatedTasksSection("Successors", "merge", successors),
      this._createRelatedTasksSection("Parent", "account_tree", nestedTasks),
      this._createRelatedCostsSection("Associated Costs", "attach_money", associatedCosts)
    );

    grid.add(outputsSection, inputsSection, resourcesSection);

    // --- TaskTime section ---
    const taskTimeSection = this._createTaskTimeSection(details.TaskTime);

    // --- Calendar section (from TaskTime or task-level assignments) ---
    const calendarSection = this._createCalendarSection(details);

    this.taskDetailsBody.add(list, taskTimeSection, calendarSection, relatedTaskSections, grid);
  }

  _createTaskTimeSection(taskTimeId) {
    const taskTimesStore = SequenceData.data.task_times || {};
    const taskTime = taskTimeId != null ? taskTimesStore[taskTimeId] : null;

    const section = UIComponents.collapsibleSection({
      title: `Task Time${taskTime ? "" : " (none)"}`,
      icon: "schedule",
      collapsed: false,
    });

    const content = UIComponents.column().gap("2px");

    if (!taskTime) {
      const empty = UIComponents.text("No TaskTime assigned");
      empty.setStyle("font-size", ["0.75rem"]);
      empty.setStyle("font-style", ["italic"]);
      empty.setStyle("padding", ["var(--phi-0-5)"]);
      content.add(empty);
    } else {
      const fmt = (v) => v != null && v !== "" ? String(v) : "N/A";

      const fields = [
        ["Name", fmt(taskTime.Name)],
        ["Duration Type", fmt(taskTime.DurationType)],
        ["Schedule Duration", fmt(taskTime.ScheduleDuration)],
        ["Schedule Start", fmt(taskTime.ScheduleStart)],
        ["Schedule Finish", fmt(taskTime.ScheduleFinish)],
        ["Early Start", fmt(taskTime.EarlyStart)],
        ["Early Finish", fmt(taskTime.EarlyFinish)],
        ["Late Start", fmt(taskTime.LateStart)],
        ["Late Finish", fmt(taskTime.LateFinish)],
        ["Free Float", fmt(taskTime.FreeFloat)],
        ["Total Float", fmt(taskTime.TotalFloat)],
        ["Is Critical", taskTime.IsCritical != null ? String(taskTime.IsCritical) : "N/A"],
        ["Status Time", fmt(taskTime.StatusTime)],
        ["Actual Start", fmt(taskTime.ActualStart)],
        ["Actual Finish", fmt(taskTime.ActualFinish)],
        ["Actual Duration", fmt(taskTime.ActualDuration)],
        ["Remaining Time", fmt(taskTime.RemainingTime)],
        ["Completion", fmt(taskTime.Completion)],
      ];

      fields.forEach(([label, value]) => {
        content.add(UIComponents.createPropertyRow(label, value));
      });
    }

    section.setContent(content);
    return section;
  }

  _createCalendarSection(taskDetails) {
    const taskTimesStore = SequenceData.data.task_times || {};
    const calendarsStore = SequenceData.data.work_calendars || {};

    // Resolve calendar ID: prefer TaskTime.Calendar, fall back to task-level assignments
    let calendarId = null;
    if (taskDetails.TaskTime != null) {
      const tt = taskTimesStore[taskDetails.TaskTime];
      if (tt && tt.Calendar != null) {
        calendarId = tt.Calendar;
      }
    }
    if (calendarId == null && taskDetails.HasAssignmentsWorkCalendar && taskDetails.HasAssignmentsWorkCalendar.length > 0) {
      calendarId = taskDetails.HasAssignmentsWorkCalendar[0];
    }

    const calendar = calendarId != null ? calendarsStore[calendarId] : null;

    const section = UIComponents.collapsibleSection({
      title: `Calendar${calendar ? `: ${calendar.Name || "Unnamed"}` : " (none)"}`,
      icon: "calendar_today",
      collapsed: true,
    });

    const content = UIComponents.column().gap("var(--phi-0-5)");

    if (!calendar) {
      const empty = UIComponents.text("No calendar assigned");
      empty.setStyle("font-size", ["0.75rem"]);
      empty.setStyle("font-style", ["italic"]);
      empty.setStyle("padding", ["var(--phi-0-5)"]);
      content.add(empty);
    } else {
      const calendarProps = UIComponents.column().gap("2px");
      calendarProps.add(UIComponents.createPropertyRow("Name", calendar.Name || "Unnamed"));
      calendarProps.add(UIComponents.createPropertyRow("Calendar ID", String(calendarId)));
      content.add(calendarProps);

      const workingTimeIds = calendar.WorkingTimes || [];
      content.add(this._createWorkTimeListSection("Working Times", "schedule", workingTimeIds));

      const exceptionTimeIds = calendar.ExceptionTimes || [];
      content.add(this._createWorkTimeListSection("Exception Times", "event_busy", exceptionTimeIds));
    }

    section.setContent(content);
    return section;
  }

  _createWorkTimeListSection(title, icon, workTimeIds = []) {
    const workTimesStore = SequenceData.data.work_times || {};
    const recurrenceStore = SequenceData.data.recurrence_patterns || {};
    const timePeriodsStore = SequenceData.data.time_periods || {};

    const section = UIComponents.collapsibleSection({
      title: `${title} (${workTimeIds.length})`,
      icon,
      collapsed: workTimeIds.length === 0,
    });

    const content = UIComponents.column().gap("var(--phi-0-5)");

    if (workTimeIds.length === 0) {
      const empty = UIComponents.text("None");
      empty.setStyle("font-size", ["0.75rem"]);
      empty.setStyle("font-style", ["italic"]);
      empty.setStyle("padding", ["var(--phi-0-5)"]);
      content.add(empty);
    } else {
      workTimeIds.forEach((wtId, index) => {
        const wt = workTimesStore[wtId];

        const card = UIComponents.column().gap("2px");
        card.setStyle("background", ["var(--theme-background)"]);
        card.setStyle("border-radius", ["var(--phi-0-5)"]);
        card.setStyle("padding", ["var(--phi-0-5)"]);

        if (!wt) {
          card.add(UIComponents.createPropertyRow(`#${index + 1}`, `ID ${wtId} (not loaded)`));
          content.add(card);
          return;
        }

        const fmt = (v) => v != null && v !== "" && v !== "None" ? String(v) : "N/A";

        card.add(UIComponents.createPropertyRow("Name", fmt(wt.Name)));
        card.add(UIComponents.createPropertyRow("Start", fmt(wt.Start)));
        card.add(UIComponents.createPropertyRow("Finish", fmt(wt.Finish)));

        // Recurrence pattern
        if (wt.RecurrencePattern != null) {
          const rp = recurrenceStore[wt.RecurrencePattern];
          if (rp) {
            card.add(UIComponents.createPropertyRow("Recurrence Type", fmt(rp.RecurrenceType)));
            if (rp.Occurrences != null) {
              card.add(UIComponents.createPropertyRow("Occurrences", fmt(rp.Occurrences)));
            }
            if (rp.Interval != null) {
              card.add(UIComponents.createPropertyRow("Interval", fmt(rp.Interval)));
            }
            if (rp.DayComponent && rp.DayComponent.length > 0) {
              card.add(UIComponents.createPropertyRow("Days", rp.DayComponent.join(", ")));
            }
            if (rp.WeekdayComponent && rp.WeekdayComponent.length > 0) {
              card.add(UIComponents.createPropertyRow("Weekdays", rp.WeekdayComponent.join(", ")));
            }
            if (rp.MonthComponent && rp.MonthComponent.length > 0) {
              card.add(UIComponents.createPropertyRow("Months", rp.MonthComponent.join(", ")));
            }
            if (rp.Position != null) {
              card.add(UIComponents.createPropertyRow("Position", fmt(rp.Position)));
            }

            // Time periods within recurrence
            const tpIds = rp.TimePeriods || [];
            if (tpIds.length > 0) {
              const tpLabel = UIComponents.text(`Time Periods (${tpIds.length})`);
              tpLabel.setStyle("font-weight", ["600"]);
              tpLabel.setStyle("font-size", ["0.75rem"]);
              tpLabel.setStyle("margin-top", ["var(--phi-0-25)"]);
              card.add(tpLabel);

              tpIds.forEach((tpId) => {
                const tp = timePeriodsStore[tpId];
                if (tp) {
                  card.add(UIComponents.createPropertyRow("Period", `${fmt(tp.StartTime)} — ${fmt(tp.EndTime)}`));
                }
              });
            }
          } else {
            card.add(UIComponents.createPropertyRow("Recurrence", `ID ${wt.RecurrencePattern} (not loaded)`));
          }
        }

        content.add(card);
      });
    }

    section.setContent(content);
    return section;
  }

}

export default TaskUI;