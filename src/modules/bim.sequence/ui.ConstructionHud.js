import { Components as UIComponents } from "../../ui/Components/Components.js";

import { SequenceData } from "./data.js";

const STATUS_OPTIONS = ["NOTSTARTED", "STARTED", "COMPLETED"];

const PLANNED_FIELDS = [
  { key: "ScheduleStart",    label: "START",    inputType: "datetime-local", valueType: "datetime" },
  { key: "ScheduleFinish",   label: "FINISH",   inputType: "datetime-local", valueType: "datetime" },
  { key: "ScheduleDuration", label: "DURATION", inputType: "text",           valueType: "text" },
];

const ACTUAL_FIELDS = [
  { key: "ActualStart",    label: "START",    inputType: "datetime-local", valueType: "datetime" },
  { key: "ActualFinish",   label: "FINISH",   inputType: "datetime-local", valueType: "datetime" },
  { key: "ActualDuration", label: "DURATION", inputType: "text",           valueType: "text" },
];

const TASK_TIME_EDITABLE_FIELDS = [...PLANNED_FIELDS, ...ACTUAL_FIELDS];

function fmt(v) {
  return v != null && v !== "" ? String(v) : "—";
}

function formatDisplayDate(value) {
  if (value == null || value === "") return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  const mo  = String(parsed.getMonth() + 1).padStart(2, "0");
  const dd  = String(parsed.getDate()).padStart(2, "0");
  const yy  = parsed.getFullYear();
  const hh  = parsed.getHours();
  const min = String(parsed.getMinutes()).padStart(2, "0");
  const ampm = hh >= 12 ? "PM" : "AM";
  const hh12 = String(hh % 12 || 12).padStart(2, "0");
  return `${mo}/${dd}/${yy} ${hh12}:${min} ${ampm}`;
}

function toDateTimeLocalValue(value) {
  if (value == null || value === "") return "";
  if (typeof value === "string") {
    const directMatch = value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
    if (directMatch) return directMatch[0];
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const yyyy = parsed.getFullYear();
  const mm   = String(parsed.getMonth() + 1).padStart(2, "0");
  const dd   = String(parsed.getDate()).padStart(2, "0");
  const hh   = String(parsed.getHours()).padStart(2, "0");
  const min  = String(parsed.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function toISODateTimeValue(value) {
  if (value == null || value === "") return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString();
}

// A display-only text field (task name, parent task)
function createHudTextSection(labelText) {
  const section = UIComponents.row().gap("var(--phi-1)");
  const label = UIComponents.span(labelText).addClass("hud-label");
  const value = UIComponents.span("—").setClass("ConstructionHud-task-name");
  section.add(label, value);
  return { section, value };
}

// Date field: label + [calendar-icon] [display text] + hidden input triggered on click
function createDateDisplayField(labelText, onPickedCallback) {
  const cell = UIComponents.div().setClass("ConstructionHud-date-cell");

  const label = UIComponents.span(labelText).addClass("hud-label");

  const row = UIComponents.div().setClass("ConstructionHud-date-row");

  const icon = UIComponents.icon("event");

  const displayText = UIComponents.span("—").setClass("ConstructionHud-date-text");

  const hiddenInput = UIComponents.input().setClass("hud-hidden-input");
  hiddenInput.dom.type = "datetime-local";
  hiddenInput.dom.step = "60";

  row.add(icon, displayText);

  row.onClick(() => {
    if (typeof hiddenInput.dom.showPicker === "function") {
      hiddenInput.dom.showPicker();
    } else {
      hiddenInput.dom.click();
    }
  });

  hiddenInput.onEnter(() => {
    displayText.setTextContent(formatDisplayDate(hiddenInput.getValue()));
    if (typeof onPickedCallback === "function") {
      onPickedCallback(hiddenInput.getValue());
    }
  });

  cell.add(label, row, hiddenInput);

  return { cell, displayText, hiddenInput };
}

// Text field (duration)
function createDurationField(labelText) {
  const cell = UIComponents.div().setClass("ConstructionHud-duration-cell");

  const label = UIComponents.span(labelText).addClass("hud-label");

  const input = UIComponents.input().setClass("hud-input");

  cell.add(label, input);

  return { cell, input };
}

function createCriticalRow(isCritical) {
  const row = UIComponents.div().setClass("ConstructionHud-critical-row");

  const label = UIComponents.span("CRITICAL").addClass("hud-label");

  const badge = UIComponents.badge(isCritical ? "YES" : "NO");
  badge.addClass("hud-coins");
  if (isCritical) badge.setStyles({ color: "var(--red, #ef4444)" });

  row.add(label, badge);

  return { row, badge };
}

function createStatusStrip(currentStatus) {
  const strip = UIComponents.div().setClass("ConstructionHud-status-strip");

  const label = UIComponents.span("STATUS").addClass("hud-label");

  const options = {};
  STATUS_OPTIONS.forEach((opt) => { options[opt] = opt; });

  const normalized = (currentStatus || "NOTSTARTED").toUpperCase();
  if (!STATUS_OPTIONS.includes(normalized)) {
    options[normalized] = normalized;
  }

  const select = UIComponents.select().addClass("hud-input");
  select.setOptions(options);
  select.setValue(normalized);

  strip.add(label, select);

  return { strip, select };
}

// Build one CollapsibleSection containing a 2-col date grid + duration row
function createTimeSection(title, iconName, fields2, durationField, collapsed) {
  const section = UIComponents.collapsibleSection({ title, icon: iconName, collapsed });

  const grid = UIComponents.div()
    .setClass("OlympusGrid")
    .setStyles({
      gridTemplateColumns: "1fr 1fr",
      gap: "var(--phi-1)",
    });
  grid.add(fields2[0].cell, fields2[1].cell);

  const body = UIComponents.div();
  body.add(grid, durationField.cell);

  section.addContent(body);
  return section;
}

class ConstructionHud {
  constructor({ context, operators }) {
    this.context = context;
    this.operators = operators;
    this.panel = null;
    this.isVisible = false;
    this.activeTaskId = null;
    
    this.operator = {
      edit_task_time: (payload) => {
        if (typeof this.operators?.edit_task_time === "function") {
          return this.operators.edit_task_time(payload);
        }
        if (typeof this.operators?.execute === "function") {
          return this.operators.execute("bim.edit_task_time", this.context, payload);
        }
        return null;
      },
    };

    this.draw(context);
  }

  draw(context) {
    const panel = UIComponents.column().addClass("ConstructionHud");
    panel.addClass("ConstructionHud--sequence");
    this.panel = panel;
    panel.setStyles({ 
      display: "none",
    });

    const fields = {};

    // ---- Critical row (top accent strip) ----
    const critical = createCriticalRow(false);
    fields.criticalBadge = critical.badge;

    // ---- Inner padded area ----
    const inner = UIComponents.div().setClass("ConstructionHud-inner");

    // Task name + parent
    const taskNameSection = createHudTextSection("TASK");
    fields.taskName = taskNameSection.value;

    const parentSection = createHudTextSection("PARENT TASK");
    parentSection.value.setClass("ConstructionHud-parent-name");
    fields.parentTask = parentSection.value;

    const headerBlock = UIComponents.div().setClass("ConstructionHud-header");
    headerBlock.add(taskNameSection.section, parentSection.section);

    inner.add(headerBlock);
    panel.add(critical.row);
    panel.add(inner);

    // ---- Planned section ----
    const schedStart = createDateDisplayField("START", (v) => {
      this.emitTaskTimeEdit(PLANNED_FIELDS[0], v);
    });
    const schedFinish = createDateDisplayField("FINISH", (v) => {
      this.emitTaskTimeEdit(PLANNED_FIELDS[1], v);
    });
    const schedDuration = createDurationField("DURATION");
    schedDuration.input.onEnter(() => {
      this.emitTaskTimeEdit(PLANNED_FIELDS[2], schedDuration.input.getValue());
    });

    fields.ScheduleStart    = { displayText: schedStart.displayText,    hiddenInput: schedStart.hiddenInput };
    fields.ScheduleFinish   = { displayText: schedFinish.displayText,   hiddenInput: schedFinish.hiddenInput };
    fields.ScheduleDuration = schedDuration.input;

    const plannedSection = createTimeSection("PLANNED", "schedule", [schedStart, schedFinish], schedDuration, false);

    // ---- Actual section ----
    const actStart = createDateDisplayField("START", (v) => {
      this.emitTaskTimeEdit(ACTUAL_FIELDS[0], v);
    });
    const actFinish = createDateDisplayField("FINISH", (v) => {
      this.emitTaskTimeEdit(ACTUAL_FIELDS[1], v);
    });
    const actDuration = createDurationField("DURATION");
    actDuration.input.onEnter(() => {
      this.emitTaskTimeEdit(ACTUAL_FIELDS[2], actDuration.input.getValue());
    });

    fields.ActualStart    = { displayText: actStart.displayText,    hiddenInput: actStart.hiddenInput };
    fields.ActualFinish   = { displayText: actFinish.displayText,   hiddenInput: actFinish.hiddenInput };
    fields.ActualDuration = actDuration.input;

    const actualSection = createTimeSection("ACTUAL", "timelapse", [actStart, actFinish], actDuration, true);

    panel.add(plannedSection, actualSection);

    // ---- Status strip ----
    const status = createStatusStrip("NOTSTARTED");
    fields.statusSelect = status.select;
    panel.add(status.strip);

    // ---- Signal handler ----
    context.signals.displayConstructionHudTask.add(async ({ GlobalId, inputTasks, outputTasks }) => {
      
      if (!SequenceData.is_loaded){
        await SequenceData.load(context.ifc.activeModel)
      }
      const allTaskIds = [...(outputTasks || []), ...(inputTasks || [])];
      if (allTaskIds.length === 0) { this.hide(); return; }

      const taskId = allTaskIds[0];
      const task = SequenceData.data.tasks[taskId];

      const parentTaskId = task.Nests
      const parentTask = parentTaskId != null ? SequenceData.data.tasks[parentTaskId] : null;

      task.parentTaskName = parentTask ? parentTask.Name : null;
      if (!task) { this.hide(); return; }

      this.activeTaskId = taskId;
      this.drawTaskdata(task, taskId, fields);
      
      this.show();
    });


    context.viewport.add(panel);
  }

  emitTaskTimeEdit(fieldDef, rawValue) {
    if (!this.activeTaskId || !fieldDef?.key) return;

    const normalizedValue = fieldDef.valueType === "datetime"
      ? toISODateTimeValue(rawValue)
      : rawValue;

    this.operator.edit_task_time({
      taskId: this.activeTaskId,
      attrName: fieldDef.key,
      attrValue: normalizedValue,
      [fieldDef.key]: normalizedValue,
    });
  }

  drawTaskdata(task, taskId, taskFields) {
    const taskTime = task.TaskTime != null
      ? (SequenceData.data.task_times || {})[task.TaskTime]
      : null;

    const parentName = task.Nests != null
      ? (SequenceData.data.tasks[task.Nests]?.Name || "Unnamed parent")
      : "—";

    const isCritical = taskTime ? Boolean(taskTime.IsCritical) : false;

    taskFields.taskName.setTextContent(fmt(task.Name));
    taskFields.parentTask.setTextContent(parentName);

    this.activeTaskId = taskId;

    TASK_TIME_EDITABLE_FIELDS.forEach((fieldDef) => {
      const rawValue = taskTime?.[fieldDef.key] ?? "";
      const fieldRef = taskFields[fieldDef.key];

      if (fieldDef.valueType === "datetime") {
        fieldRef.displayText.setTextContent(formatDisplayDate(rawValue));
        fieldRef.hiddenInput.setValue(toDateTimeLocalValue(rawValue));
      } else {
        fieldRef.setValue(String(rawValue || ""));
      }
    });

    taskFields.criticalBadge.setValue(isCritical ? "YES" : "NO");
    taskFields.criticalBadge.setStyles({
      color: isCritical ? "var(--red, #ef4444)" : "",
    });

    const currentStatus = (task.Status || "NOTSTARTED").toUpperCase();
    const statusOptions = {};
    STATUS_OPTIONS.forEach((opt) => { statusOptions[opt] = opt; });
    if (!STATUS_OPTIONS.includes(currentStatus)) {
      statusOptions[currentStatus] = currentStatus;
    }
    taskFields.statusSelect.setOptions(statusOptions);
    taskFields.statusSelect.setValue(currentStatus);
  }

  show() {
    if (this.panel) {
      this.panel.dom.style.display = "flex";
      this.isVisible = true;
    }
  }

  hide() {
    if (this.panel) {
      this.panel.dom.style.display = "none";
      this.isVisible = false;
    }
  }
}

export default ConstructionHud;

