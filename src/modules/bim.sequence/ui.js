import { Components as UIComponents } from "../../ui/Components/Components.js";

import { TabPanel } from "../../../drawUI/TabPanel.js";

import { focusDockedWorkspaceTab } from "../../../drawUI/utils/workspacePanelDock.js";

import AECO_tools from "../../tool/index.js";

import { HierarchyToggleUtil } from "../../utils/HierarchyToggleUtil.js";

import { SequenceData } from "./data.js";

import { getTasksForNodeView } from "../../ui/Components/Nodes.js";

import { formatSchedulingDate } from "../../utils/formatSchedulingDate.js";

import Paths from "../../utils/paths.js";

const TASK_VIEW_TYPES = {
  list: "List View",
  gantt: "Gantt Chart View",
  kanban: "Kanban Board",
  hierarchy: "Hierarchical View",
  spreadsheet: "Spreadsheet View",
  node: "Node View",
  default: "gantt",
};

const TASK_VIEW_TAB_LABELS = {
  hierarchy: "Hierarchy",
  list: "List",
  gantt: "Gantt",
  kanban: "Kanban",
  spreadsheet: "Sheet",
  node: "Node",
};

const TASK_VIEW_ORDER = ["gantt", "spreadsheet", "node", "hierarchy", "list", "kanban"];

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
      minimizedImageSrc: Paths.data("/resources/images/task.svg"),
      
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


    this.taskDetailsBody = UIComponents.row()
      .addClass("TaskDetails-content")
      .setStyles({
        flex: "1",
        overflow: "auto",
        padding: "var(--phi-0-5)",
        gap: "var(--phi-1)",
      });

    this.content.add(this.taskDetailsBody);
    this.appendDom(context);
    this.isActive = true;

    this.showEmptyTaskDetails();

    const signals = context.signals;

    if (signals && signals.taskDetailsLoaded) {
      signals.taskDetailsLoaded.add(({ outputs, inputs, resources }) => {
        this.refreshTaskDetails({ outputs, inputs, resources });
      });
    }
  }

  appendDom(context) {
    const panelDom = this.panel.dom;
    if (!panelDom.parentNode) {
      context.dom.appendChild(panelDom);
    }
  }

  show() {
    if (this.panel && this.panel.isMinimized) {
      this.panel.restore();
    }

    if (focusDockedWorkspaceTab(this.context, this.panel)) {
      this.isActive = true;
      return this;
    }

    this.appendDom(this.context);
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

    this.operators.execute("bim.load_task_details", this.context, taskId);
  }

  showEmptyTaskDetails() {
    if (!this.taskDetailsBody) {
      return;
    }

    this.taskDetailsBody.clear();

    const emptyState = UIComponents.text("Select a task to view its details");

    emptyState.setStyles({
      fontStyle: "italic",
      padding: "var(--phi-1)",
      textAlign: "center",
      width: "100%",
    });

    this.taskDetailsBody.add(emptyState);
  }

  refreshTaskDetails(details) {
    if (!this.taskDetailsBody) {
      return;
    }

    this.taskDetailsBody.clear();

    const createSection = (title, icon, items) => {
      const section = UIComponents.column()
        .setStyles({
          flex: "1",
          minWidth: "150px",
          maxHeight: "100%",
          overflow: "hidden",
        });

      const sectionHeader = UIComponents.row()
        .gap("var(--phi-0-25)")
        .setStyles({
          alignItems: "center",
          marginBottom: "var(--phi-0-5)",
        });

      const sectionIcon = UIComponents.icon(icon);

      sectionIcon.setStyle("fontSize", ["14px"]);

      sectionIcon.setStyle("color", ["var(--theme-accent)"]);

      const sectionTitle = UIComponents.text(title);

      sectionTitle.setStyles({
        fontWeight: "600",
        fontSize: "0.8rem",
      });

      const countBadge = UIComponents.badge(String(items.length));

      countBadge.setStyles({
        fontSize: "10px",
        padding: "1px 6px",
        marginLeft: "var(--phi-0-25)",
      });

      sectionHeader.add(sectionIcon, sectionTitle, countBadge);

      const itemList = UIComponents.column()
        .setStyles({
          gap: "2px",
          overflow: "auto",
          flex: "1",
          paddingRight: "var(--phi-0-25)",
        });

      if (items.length === 0) {
        const noItems = UIComponents.text("None");

        noItems.setStyles({
          fontSize: "0.75rem",
          fontStyle: "italic",
        });

        itemList.add(noItems);
      } else {
        items.forEach((item) => {
          const itemRow = UIComponents.row()
            .gap("var(--phi-0-25)")
            .setStyles({
              padding: "3px 6px",
              background: "var(--theme-background)",
              borderRadius: "3px",
              alignItems: "center",
              cursor: "pointer",
            });

          itemRow.dom.addEventListener("mouseenter", () => {
            itemRow.dom.style.background = "var(--theme-background-hover)";
          });

          itemRow.dom.addEventListener("mouseleave", () => {
            itemRow.dom.style.background = "var(--theme-background)";
          });

          const itemName = UIComponents.text(item.Name);

          itemName.setStyles({
            fontSize: "0.75rem",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          });

          itemRow.add(itemName);

          itemList.add(itemRow);
        });
      }

      section.add(sectionHeader, itemList);

      return section;
    };

    const outputsList = details.outputs ? details.outputs : [];

    const inputsList = details.inputs ? details.inputs : [];

    const resourcesList = details.resources ? details.resources : [];

    const outputsSection = createSection("Outputs", "output", outputsList);

    const inputsSection = createSection("Inputs", "input", inputsList);

    const resourcesSection = createSection("Resources", "person", resourcesList);

    this.taskDetailsBody.add(outputsSection, inputsSection, resourcesSection);
  }
}

class SchedulingUI extends TabPanel {
  constructor({ context, operators }) {
    super({
      context,
      operators,
      position: "bottom",
      tabId: "sequence-scheduling",
      tabLabel: "Construction",
      icon: "schedule",
      title: "Work schedules",
      showHeader: false,
      floatable: true,
      moduleId: "bim.sequence",
      autoShow: true,
    });

    this.panel.addClass("Panel");

    this.hierarchyToggleUtil = new HierarchyToggleUtil();

    this.scheduleTasksPanelRoot = null;
    this.taskViewWrapper = null;
    this.taskViewsTabbedPanel = null;
    this.taskViewHosts = new Map();
    this.schedulingRoot = null;
    this.schedulesSidebar = null;
    this.scheduleCountLabel = null;
    this.scheduleEditOperator = null;
    this.scheduleDeleteOperator = null;
    this.schedulesSidebarVisible = true;
    this.schedulesSidebarToggleButton = null;

    this.spreadsheetComponent = null;

    this.taskCheckboxes = new Map();

    this.spreadsheetSyncedSchedulerTaskIds = new Set();

    this.taskBatchSelectionMode = false;

    this._initScheduleTasksPanel();
    this.draw(context, operators);
  }

  _initScheduleTasksPanel() {
    if (this.taskViewsTabbedPanel) {
      return;
    }

    this.scheduleTasksPanelRoot = UIComponents.div();
    this.scheduleTasksPanelRoot.addClass("Panel");
    this.scheduleTasksPanelRoot.setStyle("display", ["flex"]);
    this.scheduleTasksPanelRoot.setStyle("flex-direction", ["column"]);
    this.scheduleTasksPanelRoot.setStyle("height", ["100%"]);
    this.scheduleTasksPanelRoot.setStyle("width", ["100%"]);
    this.scheduleTasksPanelRoot.setStyle("overflow", ["hidden"]);
    this.scheduleTasksPanelRoot.setStyle("min-height", ["0"]);

    this.taskViewWrapper = UIComponents.column()
      .addClass("fill-height")
      .addClass("task-view-wrapper")
      .setStyle("flex", ["1"])
      .setStyle("min-height", ["0"])
      .setStyle("gap", ["var(--phi-0-5)"]);

    const taskViewSelectorRow = UIComponents.row()
      .gap("var(--phi-0-5)")
      .addClass("fill-width")
      .addClass("space-between")
      .padding("var(--phi-0-5)")

    taskViewSelectorRow.add(this.drawSchedulesSidebarToggle());
    taskViewSelectorRow.add(this.drawTaskViewScheduleActions());



    // TODO: Add selection toggle back in WHEN FEATURES ARE READY
    // taskViewSelectorRow.add(this.drawSelectionToggle());

    this.taskViewContentStack = UIComponents.column()
      .addClass("fill-width")
      .setStyle("flex", ["1"])
      .setStyle("min-height", ["0"])
      .setStyle("overflow", ["hidden"]);

    this.taskViewsTabbedPanel = UIComponents.tabbedPanel();
    this.taskViewsTabbedPanel.addClass("inner-tabbed-panel");
    this.taskViewsTabbedPanel.addClass("sequence-task-views-panel");
    this.taskViewsTabbedPanel.setStyle("flex", ["1"]);
    this.taskViewsTabbedPanel.setStyle("min-height", ["0"]);
    this.taskViewsTabbedPanel.setStyle("overflow", ["hidden"]);
    this.taskViewsTabbedPanel.setStyle("width", ["100%"]);
    this.taskViewsTabbedPanel.setStyle("max-width", ["100%"]);

    this.taskViewHosts.clear();

    for (const id of TASK_VIEW_ORDER) {
      const host = UIComponents.div();
      host.addClass("sequence-task-view-host");
      host.setStyle("display", ["flex"]);
      host.setStyle("flex-direction", ["column"]);
      host.setStyle("height", ["100%"]);
      host.setStyle("min-height", ["0"]);
      host.setStyle("overflow", ["hidden"]);

      this.taskViewHosts.set(id, host);

      const tabLabel = TASK_VIEW_TAB_LABELS[id] || id;

      this.taskViewsTabbedPanel.addTab(id, tabLabel, host);
    }

    const nodeTaskHost = this.taskViewHosts.get("node");

    if (nodeTaskHost && typeof ResizeObserver !== "undefined") {
      if (this._scheduleNodeViewResizeObserver) {
        this._scheduleNodeViewResizeObserver.disconnect();
      }

      const self = this;

      this._scheduleNodeViewResizeObserver = new ResizeObserver(function () {
        self._syncScheduleNodeViewCanvasHeight(nodeTaskHost);
      });

      this._scheduleNodeViewResizeObserver.observe(nodeTaskHost.dom);
    }

    this.taskViewsTabbedPanel.select(TASK_VIEW_TYPES.default);

    const tp = this.taskViewsTabbedPanel;
    const self = this;
    const origSelect = tp.select.bind(tp);
    tp.select = function (id) {
      const ret = origSelect(id);
      self._refreshVisibleTaskViewLayout(id);
      return ret;
    };

    this.taskViewWrapper.add(taskViewSelectorRow);
    this.taskViewContentStack.add(this.taskViewsTabbedPanel);
    this.taskViewWrapper.add(this.taskViewContentStack);

    this.scheduleTasksPanelRoot.add(this.taskViewWrapper);
    this.syncScheduleActionOperatorsState();
  }

  draw(context, operators) {
    this.content.addClass("Column");
    this.content.setStyle("height", ["100%"]);
    this.content.setStyle("min-height", ["0"]);

    this.schedulingRoot = this._createSchedulingLayout(context, operators);
    this.content.add(this.schedulingRoot);

    this.footer.clear();
    this.footer.setStyle("display", ["none"]);

    this.listen(context, operators);
  }

  _createSchedulingLayout(context, operators) {
    const root = UIComponents.row().addClass("fill-width").addClass("fill-height");
    this.schedulesSidebar = UIComponents.column()
      .setStyle("border-right", ["1px solid var(--border)"])
    const sidebarHeader = UIComponents.row()
      .addClass("fill-width")
      .addClass("justify-between")
      .setStyle("padding", ["var(--phi-0-5) var(--phi-0-75)"]);

    const sidebarTitle = UIComponents.row().gap("var(--phi-0-5)").addClass("centered-vertical");
    sidebarTitle.add(UIComponents.icon("schedule"));
    this.scheduleCountLabel = UIComponents.text("Work Schedules: 0");
    sidebarTitle.add(this.scheduleCountLabel);
    sidebarHeader.add(sidebarTitle);
    this.schedulesSidebar.add(sidebarHeader);

    this.schedulesGrid = UIComponents.column();
    this.schedulesGrid.addClass("ws-schedules-list");
    this.schedulesSidebar.add(this.schedulesGrid);
    this.schedulesSidebar.add(this._scheduleActions(context, operators));

    this.scheduleTasksPanelRoot.setStyle("flex", ["1"]);
    this.scheduleTasksPanelRoot.setStyle("min-width", ["0"]);

    root.add(this.schedulesSidebar);
    root.add(this.scheduleTasksPanelRoot);

    this.schedulingRoot = root;
    this._applySchedulesSidebarVisibility();

    return root;
  }

  /**
   * ag-Grid and the embedded node canvas measure while `display: none` on other tabs.
   * Re-run layout after the active tab is shown (UITabbedPanel already dispatches `resize`).
   */
  _refreshVisibleTaskViewLayout(activeTabId) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (
          activeTabId === "spreadsheet" &&
          this.spreadsheetComponent &&
          this.spreadsheetComponent.notifyLayout
        ) {
          this.spreadsheetComponent.notifyLayout();
        }

        if (activeTabId === "node") {
          const nodeHost = this.taskViewHosts && this.taskViewHosts.get("node");

          if (nodeHost) {
            this._syncScheduleNodeViewCanvasHeight(nodeHost);
          }

          window.dispatchEvent(new Event("resize"));
        }
      });
    });
  }

  _syncScheduleNodeViewCanvasHeight(host) {
    if (!host || !host.dom) {
      return;
    }

    const canvas = host.dom.querySelector(".ws-node-canvas");

    if (!canvas) {
      return;
    }

    const column = host.dom.querySelector(".Network.Column");

    let reservedHeight = 0;

    if (column) {
      const toolbarRow = column.querySelector(".Row.fill-width");

      if (toolbarRow) {
        reservedHeight += toolbarRow.offsetHeight;
      }

      const columnStyle = window.getComputedStyle(column);
      const gapText = columnStyle.rowGap || columnStyle.gap;
      const gapValue = parseFloat(gapText);

      if (!isNaN(gapValue)) {
        reservedHeight += gapValue;
      }
    }

    let hostHeight = host.dom.clientHeight;

    if (hostHeight < 2) {
      hostHeight = Math.floor(window.innerHeight * 0.38);
    }

    const minCanvasHeight = Math.max(240, hostHeight - reservedHeight - 8);

    canvas.style.minHeight = minCanvasHeight + "px";
  }

  updateCount(count) {
    if (this.scheduleCountLabel) {
      this.scheduleCountLabel.setValue(
        "Work Schedules: " + (count === undefined || count === null ? 0 : count)
      );
    }
  }

  async refreshScheduleUI(context) {

      await refreshSchedules(context);

      const sequenceData = SequenceData.data;
      const workSchedulesData =
        sequenceData && sequenceData["work_schedules"]
          ? sequenceData["work_schedules"]
          : null;

      const workScheduleCollection =
        workSchedulesData && workSchedulesData["work_schedules_enum"]
          ? workSchedulesData["work_schedules_enum"]
          : [];

      this.updateSchedulesList(workScheduleCollection);
      this.updateCount(workScheduleCollection.length);

  }

  listen(context, operators) {
    const signals = context.signals;

    signals.bimEnabled.add(async () => {
      
    });

    signals.newIFCModel.add(async () => {

      await this.refreshScheduleUI(context);

    });

    signals.activeModelChanged.add(async () => {
      await this.refreshScheduleUI(context);

      this.updateTaskViewContent(context, null, null, null);
    });

    signals.workschedulechanged.add(async () => {
      const previousWorkscheduleGlobalId = this.currentWorkscheduleID;

      await this.refreshScheduleUI(context);

      const sequenceData = SequenceData.data;
      const workSchedulesData =
        sequenceData && sequenceData["work_schedules"]
          ? sequenceData["work_schedules"]
          : null;

      const workSchedulesEnumeration =
        workSchedulesData && workSchedulesData["work_schedules_enum"];

      let activeWorkscheduleStillExists = false;

      if (
        previousWorkscheduleGlobalId &&
        workSchedulesEnumeration &&
        workSchedulesEnumeration.length
      ) {
        for (let index = 0; index < workSchedulesEnumeration.length; index++) {
          const workScheduleEntry = workSchedulesEnumeration[index];

          if (
            workScheduleEntry &&
            workScheduleEntry[0] === previousWorkscheduleGlobalId
          ) {
            activeWorkscheduleStillExists = true;

            break;
          }
        }
      }

      if (previousWorkscheduleGlobalId && !activeWorkscheduleStillExists) {
        AECO_tools.scheduler.setActiveSchedule(null);

        AECO_tools.scheduler.clearTasks();

        this.updateTaskViewContent(context, null, null, null);
      }
    });

    signals.enableEditingWorkScheduleTasks.add(({ model, workscheduleGlobalId, tasks, viewType }) => {
      AECO_tools.scheduler.setActiveSchedule(workscheduleGlobalId);

      AECO_tools.scheduler.setTasks(tasks);

      this.clearTaskCheckboxes();

      const initialViewType = viewType || TASK_VIEW_TYPES.default;

      this.openTaskViewPanel(context, workscheduleGlobalId, initialViewType, tasks);
    });

    signals.taskSelected.add(({ taskId, selected }) => {
      this.updateTaskSelectionUI(taskId, selected);
    });

  }

  createScheduleRow({ GlobalId, Name, StartTime, FinishTime, PredefinedType }) {
    const item = UIComponents.listItem().addClass("Clickable");

    const mainRow = UIComponents.row().gap("var(--phi-0-5)");
    mainRow.setStyle("justify-content", ["space-between"]);
    mainRow.setStyle("align-items", ["center"]);

    const nameContainer = UIComponents.div();
    nameContainer.setStyle("flex", ["1"]);

    const scheduleName = UIComponents.text(Name || "Unnamed");
    scheduleName.addClass("ListboxItem-name");
    nameContainer.add(scheduleName);

    const info = UIComponents.column().gap("2px");
    info.setStyle("min-width", ["0"]);
    info.add(nameContainer);

    const dateRangeText = UIComponents.text(
      `${formatSchedulingDate(StartTime) || "?"} - ${formatSchedulingDate(FinishTime) || "?"}`
    );
    dateRangeText.addClass("Tab-meta");
    info.add(dateRangeText);

    mainRow.add(info);

    const rightSide = UIComponents.row().gap("var(--phi-0-5)");
    rightSide.addClass("ListboxItem-info");

    const predefinedTypeBadge = UIComponents.badge(PredefinedType || "N/A");
    predefinedTypeBadge.setStyle("font-size", ["10px"]);
    rightSide.add(predefinedTypeBadge);

    mainRow.add(rightSide);

    item.add(mainRow);

    item.dom.addEventListener("click", () => {
      this.operators.execute("bim.enable_editing_work_schedule_tasks", this.context, GlobalId);
    });

    if (this.currentWorkscheduleID === GlobalId) {
      item.addClass("active");
    }

    this.schedulesGrid.add(item);
  }

  updateSchedulesList(schedules) {
    this.schedulesGrid.clear();

    if (!schedules || schedules.length === 0) {
      const emptyState = UIComponents.text("No schedules yet");
      emptyState
        .setStyle("padding", ["1rem"])
        .setStyle("text-align", ["center"])
        .setStyle("color", ["var(--theme-text-light)"])
        .setStyle("font-size", ["0.8rem"]);
      this.schedulesGrid.add(emptyState);
      return;
    }

    schedules.forEach((workSchedule) => {
      const sequenceData = SequenceData.data;
      const workSchedulesData =
        sequenceData && sequenceData["work_schedules"]
          ? sequenceData["work_schedules"]
          : null;
      const scheduleDataStore =
        workSchedulesData && workSchedulesData["work_schedules"]
          ? workSchedulesData["work_schedules"]
          : {};
      const workscheduleData =
        scheduleDataStore[workSchedule[0]] || {};

      const GlobalId = workSchedule[0];

      const Name = workSchedule[1] || "Unnamed";

      this.createScheduleRow({
        GlobalId,
        Name,
        StartTime: workscheduleData.StartTime,
        FinishTime: workscheduleData.FinishTime,
        PredefinedType: workscheduleData.PredefinedType,
      });
    });
  }

  _scheduleActions(context, operators) {
    const label = UIComponents.text("Create New Work Schedule").addClass("hud-label");

    const nameInput = UIComponents.input().addClass("hud-input");

    nameInput.setValue("Schedule Name");

    const addButton = UIComponents.operator("add");

    addButton.onClick(() => {
      const model = this.context.ifc.activeModel;

      operators.execute("bim.add_work_schedule", context, model, nameInput.getValue());
    });

    const addRow = UIComponents.row().gap("var(--phi-0-5)").add(nameInput, addButton);

    const addSection = UIComponents.column().gap("var(--phi-0-5)");
    addSection.setStyle("border-top", ["1px solid var(--border)"]);
    addSection.setStyle("padding", ["var(--phi-0-5)"]);

    addSection.add(label, addRow);

    return addSection;
  }


  drawSelectionToggle() {

    const toggle = UIComponents.div();

    toggle.addClass("SelectionToggle");

    const icon = UIComponents.icon("checklist");

    icon.setStyle("font-size", ["16px"]);

    const label = UIComponents.text("Select tasks");

    label.setStyle("font-size", ["12px"]);

    toggle.add(icon, label);

    toggle.onClick(() => {
      this.taskBatchSelectionMode = !this.taskBatchSelectionMode;

      const wrapperDom =
        this.taskViewWrapper && this.taskViewWrapper.dom ? this.taskViewWrapper.dom : null;

      if (this.taskBatchSelectionMode) {
        toggle.addClass("active");

        if (wrapperDom) {
          wrapperDom.classList.add("selection-enabled");
        }
      } else {
        toggle.removeClass("active");

        if (wrapperDom) {
          wrapperDom.classList.remove("selection-enabled");
        }

        AECO_tools.scheduler.clearSelectedTasks();

        this.spreadsheetSyncedSchedulerTaskIds.clear();

        this.taskCheckboxes.forEach(({ checkbox, taskItem }) => {
          checkbox.removeClass("checked");

          taskItem.removeClass("selected");
        });
      }
    });

    return toggle;
  }

  drawSchedulesSidebarToggle() {
    const toggle = UIComponents.operator("dock_to_left");
    toggle.addClass("CodeEditor-toolbar-btn");
    toggle.dom.title = "Hide schedules";
    toggle.onClick(() => {
      this.schedulesSidebarVisible = !this.schedulesSidebarVisible;
      this._applySchedulesSidebarVisibility();
    });

    this.schedulesSidebarToggleButton = toggle;

    return toggle;
  }

  drawTaskViewScheduleActions() {
    const scheduleActionsRow = UIComponents.row().gap("var(--phi-0-5)");

    const editOperator = UIComponents.operator("settings");
    editOperator.addClass("CodeEditor-toolbar-btn");
    editOperator.dom.title = "Edit selected schedule";
    editOperator.onClick(() => {
      if (!this.currentWorkscheduleID) {
        return;
      }

      const activeModel = this.context.ifc.activeModel;

      if (!activeModel) {
        return;
      }

      this.operators.execute(
        "bim.enable_editing_attributes",
        this.context,
        activeModel,
        this.currentWorkscheduleID
      );
    });

    const deleteOperator = UIComponents.operator("delete");
    deleteOperator.addClass("CodeEditor-toolbar-btn");
    deleteOperator.setStyle("color", ["var(--red)"]);
    deleteOperator.dom.title = "Delete selected schedule";
    deleteOperator.onClick(() => {
      if (!this.currentWorkscheduleID) {
        return;
      }

      const activeModel = this.context.ifc.activeModel;

      if (!activeModel) {
        return;
      }

      this.operators.execute(
        "bim.remove_work_schedule",
        this.context,
        activeModel,
        this.currentWorkscheduleID
      );
    });

    this.scheduleEditOperator = editOperator;
    this.scheduleDeleteOperator = deleteOperator;

    scheduleActionsRow.add(editOperator, deleteOperator);

    return scheduleActionsRow;
  }

  syncScheduleActionOperatorsState() {
    const hasSelectedSchedule =
      this.currentWorkscheduleID !== undefined &&
      this.currentWorkscheduleID !== null &&
      this.currentWorkscheduleID !== "";

    const controls = [this.scheduleEditOperator, this.scheduleDeleteOperator];

    controls.forEach((operatorControl) => {
      if (!operatorControl) {
        return;
      }

      operatorControl.dom.style.opacity = hasSelectedSchedule ? "1" : "0.45";
      operatorControl.dom.style.pointerEvents = hasSelectedSchedule ? "auto" : "none";
      operatorControl.dom.setAttribute("aria-disabled", hasSelectedSchedule ? "false" : "true");
    });
  }

  _applySchedulesSidebarVisibility() {
    if (!this.schedulingRoot || !this.schedulesSidebar) {
      return;
    }

    if (this.schedulesSidebarVisible) {
      this.schedulingRoot.addClass("SequenceScheduling-sidebar-open");
      this.schedulesSidebar.setStyle("display", ["flex"]);
    } else {
      this.schedulingRoot.removeClass("SequenceScheduling-sidebar-open");
      this.schedulesSidebar.setStyle("display", ["none"]);
    }

    if (this.schedulesSidebarToggleButton && this.schedulesSidebarToggleButton.dom) {
      this.schedulesSidebarToggleButton.dom.title = this.schedulesSidebarVisible
        ? "Hide schedules"
        : "Show schedules";

      this.schedulesSidebarVisible
        ? this.schedulesSidebarToggleButton.addClass("active")
        : this.schedulesSidebarToggleButton.removeClass("active");
    }

    const selectedTaskViewTab =
      this.taskViewsTabbedPanel && this.taskViewsTabbedPanel.selected
        ? this.taskViewsTabbedPanel.selected
        : TASK_VIEW_TYPES.default;

    if (this.taskViewsTabbedPanel) {
      this._refreshVisibleTaskViewLayout(selectedTaskViewTab);
    }
  }

  openTaskViewPanel(
    context,
    workscheduleID,
    initialViewType = "gantt",
    tasks
  ) {
    this.currentWorkscheduleID = workscheduleID;

    this.updateTaskViewContent(context, workscheduleID, initialViewType, tasks);
  }

  updateTaskViewContent(context, workscheduleID, viewType, tasks) {
    this.clearTaskCheckboxes();

    const ctx = context || this.context;

    if (!this.taskViewsTabbedPanel || !this.taskViewHosts.size) {
      return;
    }

    const missingWorkschedule =
      workscheduleID === undefined ||
      workscheduleID === null ||
      workscheduleID === "";
    const resolvedTasks = missingWorkschedule ? [] : tasks || this.tasks || [];

    this.currentWorkscheduleID = missingWorkschedule ? null : workscheduleID;
    this.tasks = resolvedTasks;
    this.syncScheduleActionOperatorsState();

    const renderNoScheduleState = () => {
      const empty = UIComponents.text("Select a schedule in the Construction tab");
      empty.setStyle("text-align", ["center"]);
      empty.setStyle("font-style", ["italic"]);
      empty.setStyle("padding", ["var(--phi-2)"]);
      return empty;
    };

    const renderViewElement = (id) => {
      if (missingWorkschedule) {
        return renderNoScheduleState();
      }

      switch (id) {
        case "list":
          return this.renderListViewContent(workscheduleID, resolvedTasks);

        case "gantt":
          return this.renderGanttchart(ctx, workscheduleID, resolvedTasks);

        case "kanban":
          return this.renderKanbanViewContent(workscheduleID, resolvedTasks);

        case "hierarchy":
          return this.renderHierarchyViewContent(workscheduleID, resolvedTasks);

        case "spreadsheet":
          return this.renderSpreadsheetViewContent(ctx, workscheduleID, resolvedTasks);

        case "node":
          return this.renderNodeViewContent(ctx, workscheduleID, resolvedTasks);

        default:
          return UIComponents.text("Unknown view type");
      }
    };

    for (const id of TASK_VIEW_ORDER) {
      const host = this.taskViewHosts.get(id);

      if (!host) continue;

      const viewElement = renderViewElement(id);

      host.clear();

      if (viewElement) {
        host.add(viewElement);
      }
    }

    let tabId =
      viewType ||
      this.taskViewsTabbedPanel.selected ||
      TASK_VIEW_TYPES.default;

    if (!TASK_VIEW_ORDER.includes(tabId)) {
      tabId = TASK_VIEW_TYPES.default;
    }

    this.taskViewsTabbedPanel.select(tabId);

    if (this.taskViewWrapper) {
      if (this.taskBatchSelectionMode) {
        this.taskViewWrapper.addClass("selection-enabled");
      } else {
        this.taskViewWrapper.removeClass("selection-enabled");
      }
    }
  }

  renderHierarchyViewContent(workscheduleID, tasks) {
    this.tasks = tasks;

    if (tasks.length === 0) {
      const empty = UIComponents.text("No tasks to display");

      empty.setStyle("text-align", ["center"]);

      empty.setStyle("padding", ["var(--phi-2)"]);

      return empty;
    }

    const { taskMap, rootTasks } = this.buildHierarchy(tasks);

    if (this.hierarchyToggleUtil.expanded.size === 0) {
      const expandNodes = (nodes) => {
        nodes.forEach(node => {
          this.hierarchyToggleUtil.expandNode(node.task.pID);

          if (node.children && node.children.length > 0) {
            expandNodes(node.children);
          }
        });
      };

      expandNodes(rootTasks);
    }

    const hierarchyContainer = UIComponents.column().gap("2px");

    hierarchyContainer.setClass("ws-hierarchy-list");

    hierarchyContainer.setStyle("padding", ["var(--phi-0-5)"]);

    this.renderHierarchyNode(
      hierarchyContainer,
      taskMap,
      rootTasks,
      workscheduleID
    );

    return hierarchyContainer;
  }

  buildHierarchy(flatTasks) {
    const taskMap = new Map();

    const rootTasks = [];

    flatTasks.forEach((task) => {
      taskMap.set(task.pID, { task, children: [] });
    });

    flatTasks.forEach((task) => {
      if (task.pParent && taskMap.has(task.pParent)) {
        const parent = taskMap.get(task.pParent);

        parent.children.push(taskMap.get(task.pID));
      } else {
        rootTasks.push(taskMap.get(task.pID));
      }
    });

    return { taskMap, rootTasks };
  }

  renderHierarchyNode(container, taskMap, currentTasks, workscheduleID, level = 0) {
    currentTasks.forEach((node) => {
      node.level = level;

      const taskId = node.task.pID;

      const handleToggleClick = () => {
        this.hierarchyToggleUtil.toggleNode(taskId);

        this.updateTaskViewContent(null, workscheduleID, "hierarchy", this.tasks || []);
      };

      const showChildren = node.children && node.children.length > 0 && this.hierarchyToggleUtil.isExpanded(taskId);

      const hasChildren = node.children && node.children.length > 0;

      const taskItem = UIComponents.row().gap("var(--phi-0-5)").addClass('fill-width').addClass('centered-vertical');

      taskItem.setStyle("background", ["var(--glass-surface)"]);

      taskItem.setStyle("border-radius", ["var(--phi-0-5)"]);

      const indentPadding = (node.level || 0) * 12;

      taskItem.setStyle("padding", [`var(--phi-0-5) var(--phi-0-5) var(--phi-0-5) calc(var(--phi-0-5) + ${indentPadding}px)`]);

      taskItem.dom.setAttribute('data-level', node.level || 0);

      if (hasChildren) {
        const toggleIcon = UIComponents.icon(showChildren ? 'expand_more' : 'chevron_right');

        toggleIcon.addClass('clickable');

        toggleIcon.onClick((event) => {
          if (event && event.stopPropagation) {
            event.stopPropagation();
          }

          handleToggleClick();
        });

        taskItem.add(toggleIcon);
      } else {
        const spacer = UIComponents.div();

        spacer.setStyle("width", ["24px"]);

        taskItem.add(spacer);
      }

      const taskContent = UIComponents.column().gap("2px");

      taskContent.setStyle("flex", ["1"]);

      taskContent.setStyle("min-width", ["0"]);

      taskContent.setStyle("overflow", ["hidden"]);

      taskContent.setStyle("cursor", ["pointer"]);

      taskContent.onClick(() => {

        this.operators.execute("bim.load_task_details", this.context, taskId);
      
      });

      const taskName = UIComponents.text(node.task.pName);

      taskName.setStyle("font-weight", [hasChildren ? "600" : "400"]);

      taskName.setStyle("white-space", ["nowrap"]);

      taskName.setStyle("overflow", ["hidden"]);

      taskName.setStyle("text-overflow", ["ellipsis"]);

      taskContent.add(taskName);

      if (node.task.pStart || node.task.pEnd) {
        const dateRow = UIComponents.row().gap("var(--phi-0-5)");

        dateRow.setStyle("overflow", ["hidden"]);

        const dateIcon = UIComponents.icon("date_range");

        dateIcon.setStyle("font-size", ["12px"]);

        dateIcon.setStyle("flex-shrink", ["0"]);

        const dates = UIComponents.text(
          `${formatSchedulingDate(node.task.pStart) || "?"} - ${formatSchedulingDate(node.task.pEnd) || "?"}`
        );

        dates.setStyle("font-size", ["11px"]);

        dates.setStyle("white-space", ["nowrap"]);

        dates.setStyle("overflow", ["hidden"]);

        dates.setStyle("text-overflow", ["ellipsis"]);

        dateRow.add(dateIcon, dates);

        taskContent.add(dateRow);
      }

      taskItem.add(taskContent);

      if (hasChildren) {
        const childCount = UIComponents.badge(String(node.children.length));

        childCount.setStyle("font-size", ["10px"]);

        childCount.setStyle("padding", ["2px 6px"]);

        childCount.setStyle("flex-shrink", ["0"]);

        taskItem.add(childCount);
      }

      const status = (node.task.status || "NOTSTARTED").toUpperCase();

      const statusBadge = UIComponents.badge(status);

      statusBadge.setStyle("color", ["var(--theme-background-0204)"]);

      statusBadge.setStyle("font-size", ["9px"]);

      statusBadge.setStyle("padding", ["2px 6px"]);

      statusBadge.setStyle("flex-shrink", ["0"]);

      statusBadge.setStyle("white-space", ["nowrap"]);

      taskItem.add(statusBadge);

      const isSelected = AECO_tools.scheduler.isTaskSelected(taskId);

      const checkbox = this.createTaskSelectionCheckbox(taskId);

      if (isSelected) {
        checkbox.addClass("checked");

        taskItem.addClass("selected");
      }

      this.taskCheckboxes.set(taskId, { checkbox, taskItem });

      taskItem.dom.insertBefore(checkbox.dom, taskItem.dom.firstChild);

      container.add(taskItem);

      if (showChildren) {
        const childTasks = node.children.slice().sort((a, b) => a.task.pID - b.task.pID);

        this.renderHierarchyNode(container, taskMap, childTasks, workscheduleID, level + 1);
      }
    });
  }

  renderNodeViewContent(context, workscheduleID, tasks) {
    const { nodes, connections } = getTasksForNodeView(context, workscheduleID, tasks);

    const getModel = () => this.context.ifc.activeModel;

    const nodeContainer = UIComponents.column()
      .addClass('Network')
      .setStyle('flex', ['1'])
      .setStyle('min-height', ['0'])
      .setStyle('gap', ['var(--phi-0-5)']);

    const toolbar = UIComponents.row().gap("var(--phi-0-5)").addClass("fill-width");

    toolbar.setStyle("padding", ["var(--phi-0-5)"]);

    toolbar.setStyle("background", ["var(--theme-background-0810)"]);

    toolbar.setStyle("border-radius", ["var(--phi-0-5)"]);

    const criticalPathButton = UIComponents.button('Critical Path');

    criticalPathButton.setIcon('timeline');

    criticalPathButton.addClass('Button-secondary');

    criticalPathButton.onClick(() => {
      this.operators.execute("bim.expand_node_path", this.context, workscheduleID, "critical");
    });

    const expandAllBtn = UIComponents.button('Expand All');

    expandAllBtn.setIcon('unfold_more');

    expandAllBtn.addClass('Button-secondary');

    const collapseAllBtn = UIComponents.button('Collapse All');

    collapseAllBtn.setIcon('unfold_less');

    collapseAllBtn.addClass('Button-secondary');

    toolbar.add(criticalPathButton, expandAllBtn, collapseAllBtn);

    nodeContainer.add(toolbar);

    const nodesView = UIComponents.nodes({
      nodes,
      connections,
      embedded: true,
      readOnly: true,
      allowConnections: false,
      onNodeClick: (node) => {
        const taskId = node.data && node.data.pID !== undefined ? node.data.pID : node.id;

        if (!taskId) return;

        this.operators.execute("bim.load_task_details", this.context, taskId);
      },
      onEdit: (node) => {
        const GlobalId = node.data && node.data.GlobalId !== undefined ? node.data.GlobalId : null;

        if (GlobalId) {
          this.operators.execute("bim.enable_editing_attributes", this.context, getModel(), GlobalId);
        }
      }
    });

    nodesView.setStyle('flex', ['1']);

    nodesView.setStyle('min-height', ['0']);

    nodesView.setStyle('overflow', ['hidden']);

    nodeContainer.add(nodesView);

    return nodeContainer;
  }

  renderSpreadsheetViewContent(context, workscheduleID, tasks) {
    const shell = UIComponents.div();

    shell.addClass("sequence-spreadsheet-shell");
    shell.setStyle("display", ["flex"]);
    shell.setStyle("flex-direction", ["column"]);
    shell.setStyle("flex", ["1"]);
    shell.setStyle("min-height", ["0"]);
    shell.setStyle("width", ["100%"]);
    shell.setStyle("overflow", ["hidden"]);

    if (this.spreadsheetComponent) {
      this.spreadsheetComponent.loadData(tasks);

      shell.add(this.spreadsheetComponent);
    } else {
      this.createSpreadsheetComponent(context, shell, tasks);
    }

    return shell;
  }

  createSpreadsheetComponent(context, container, tasks) {

    const columnConfig = {
      pID: { headerName: "ID", width: 80 },
      pName: { headerName: "Task Name", width: 200 },
      pMile: { headerName: "isMilestone", type: "boolean", width: 100 },
      pDepend: { headerName: "Dependencies", width: 150 },
      pLevel: { headerName: "Level", type: "number", width: 80 },
      status: { headerName: "Status", width: 120 },
      pStart: { headerName: "Start Date", type: "date", width: 150 },
      pEnd: { headerName: "End Date", type: "date", width: 150 },
      pRes: { headerName: "Resources", width: 150 },
      ifcduration: { headerName: "Duration", width: 120 },
      pPlanEnd: { headerName: "Planned End", type: "date", width: 150 },
      pPlanStart: { headerName: "Planned Start", type: "date", width: 150 },
      pParent: { headerName: "Parent Task ID", width: 100 },
      duration: { headerName: "Duration", width: 120 },
      progress: { headerName: "Progress (%)", type: "number", width: 120 },
      resources: { headerName: "Resources", width: 150 },
      description: { headerName: "Description", width: 200 },
    };

    this.spreadsheetComponent = UIComponents.spreadsheet({
      data: tasks,
      columnConfig: columnConfig,
      columnNameMapper: {},
      height: "100%",
      minHeight: "220px",
    });

    this.spreadsheetComponent.init();

    this.spreadsheetComponent.on("cellChanged", (eventData) => {

      const { rowData, field, newValue, oldValue } = eventData;

      if (oldValue !== newValue) {

        const detail = {
            taskId: rowData.id,
            taskData: rowData,
            field: field,
            oldValue: oldValue,
            newValue: newValue,
          }

        context.signals.spreadsheetCellChanged.dispatch(detail);

      }

    });

    this.spreadsheetComponent.on("selectionChanged", (eventData) => {
      const selected = eventData && eventData.selected;

      if (!selected || !selected.data || selected.data.length === 0) {
        if (this.taskBatchSelectionMode) {
          const previousIds = this.spreadsheetSyncedSchedulerTaskIds;

          previousIds.forEach((taskId) => {
            this.operators.execute("bim.deselect_task", this.context, taskId);
          });

          previousIds.clear();
        }

        return;
      }

      const rowData = selected.data[0];

      let taskId = null;

      if (rowData && rowData.pID !== undefined && rowData.pID !== null) {
        taskId = rowData.pID;
      } else if (rowData && rowData.id !== undefined && rowData.id !== null) {
        taskId = rowData.id;
      }

      if (taskId === undefined || taskId === null) {
        return;
      }

      if (this.taskBatchSelectionMode) {
        const currentIds = new Set([taskId]);

        const previousIds = this.spreadsheetSyncedSchedulerTaskIds;

        previousIds.forEach((id) => {
          if (!currentIds.has(id)) {
            this.operators.execute("bim.deselect_task", this.context, id);
          }
        });

        currentIds.forEach((id) => {
          if (!previousIds.has(id)) {
            this.operators.execute("bim.select_task", this.context, id);
          }
        });

        previousIds.clear();

        currentIds.forEach((id) => {
          previousIds.add(id);
        });
      } else {
        this.operators.execute("bim.load_task_details", this.context, taskId);
      }
    });

    container.add(this.spreadsheetComponent);

  }

  renderGanttchart(context, workscheduleID, tasks) {

    const ganttChartContainer = UIComponents.gantt(context, tasks, {
      operators: this.operators,
      onTaskRowClick: (taskId) => {
        this.operators.execute("bim.load_task_details", this.context, taskId);
      },
    });

    return ganttChartContainer;
  }

  renderKanbanViewContent(workscheduleID, tasks)  {
    const container = UIComponents.row().gap("var(--phi-1)");

    container.setClass("Kanban-container");

    container.setStyle("flex", ["1"]);

    container.setStyle("min-height", ["0"]);

    container.setStyle("overflow-x", ["auto"]);

    container.setStyle("padding", ["var(--phi-0-5)"]);

    const columnColors = {
      NOTSTARTED: "var(--theme-warning)",
      STARTED: "var(--theme-info)",
      COMPLETED: "var(--theme-success)",
      ONHOLD: "var(--theme-text-light)"
    };

    const columns = {
      NOTSTARTED: { title: "Not Started", tasks: [], icon: "hourglass_empty" },
      STARTED: { title: "In Progress", tasks: [], icon: "play_circle" },
      COMPLETED: { title: "Completed", tasks: [], icon: "check_circle" },
      ONHOLD: { title: "On Hold", tasks: [], icon: "pause_circle" }
    };

    tasks.forEach(task => {
      const status = (task.status || "NOTSTARTED").toUpperCase();

      if (columns[status]) {
        columns[status].tasks.push(task);
      } else {
        columns.NOTSTARTED.tasks.push(task);
      }
    });

    Object.entries(columns).forEach(([status, columnData]) => {
      const column = UIComponents.column().gap("var(--phi-0-5)");

      column.setClass("Kanban-column");

      column.setStyle("min-width", ["280px"]);

      column.setStyle("max-width", ["320px"]);

      column.setStyle("flex", ["1"]);

      column.setStyle("background", ["var(--theme-background-0810)"]);

      column.setStyle("border-radius", ["var(--phi-0-5)"]);

      column.setStyle("padding", ["var(--phi-0-5)"]);

      const header = UIComponents.row().gap("var(--phi-0-5)").addClass("fill-width").addClass("justify-between");

      header.setStyle("padding-bottom", ["var(--phi-0-5)"]);

      header.setStyle("border-bottom", ["1px solid var(--glass-surface)"]);

      const titleRow = UIComponents.row().gap("var(--phi-0-5)");

      const icon = UIComponents.icon(columnData.icon);

      icon.setStyle("color", [columnColors[status]]);

      const title = UIComponents.text(columnData.title);

      title.setStyle("font-weight", ["600"]);

      titleRow.add(icon, title);

      const count = UIComponents.badge(String(columnData.tasks.length));

      count.setStyle("background", [columnColors[status]]);

      count.setStyle("color", ["var(--theme-background-0204)"]);

      header.add(titleRow, count);

      column.add(header);

      const cardsContainer = UIComponents.column().gap("var(--phi-0-5)");

      cardsContainer.setStyle("flex", ["1"]);

      cardsContainer.setStyle("overflow-y", ["auto"]);

      if (columnData.tasks.length === 0) {
        const emptyState = UIComponents.text("No tasks");

        emptyState.setStyle("text-align", ["center"]);

        emptyState.setStyle("padding", ["var(--phi-1)"]);

        cardsContainer.add(emptyState);
      } else {
        columnData.tasks.forEach(task => {
          const card = this.createKanbanCard(workscheduleID, task, status);

          cardsContainer.add(card);
        });
      }

      column.add(cardsContainer);

      container.add(column);
    });

    return container;
  }

  createKanbanCard(workscheduleId, task, status) {
    const card = UIComponents.column().gap("var(--phi-0-5)");

    card.setClass("Kanban-card");

    card.setStyle("background", ["var(--glass-surface)"]);

    card.setStyle("border-radius", ["var(--phi-0-5)"]);

    card.setStyle("padding", ["var(--phi-0-5)"]);

    card.setStyle("cursor", ["pointer"]);

    card.dom.setAttribute("data-task-id", task.pID);

    const title = UIComponents.text(task.pName || "Untitled Task");

    title.setStyle("font-weight", ["500"]);

    title.setStyle("font-size", ["13px"]);

    card.add(title);

    const meta = UIComponents.column().gap("2px");

    if (task.pStart) {
      const startRow = UIComponents.row().gap("var(--phi-0-5)");

      const startIcon = UIComponents.icon("event");

      startIcon.setStyle("font-size", ["12px"]);

      const startDate = UIComponents.text(formatSchedulingDate(task.pStart));

      startDate.setStyle("font-size", ["11px"]);

      startRow.add(startIcon, startDate);

      meta.add(startRow);
    }

    if (task.pEnd) {
      const endRow = UIComponents.row().gap("var(--phi-0-5)");

      const endIcon = UIComponents.icon("event_available");

      endIcon.setStyle("font-size", ["12px"]);

      const endDate = UIComponents.text(formatSchedulingDate(task.pEnd));

      endDate.setStyle("font-size", ["11px"]);

      endRow.add(endIcon, endDate);

      meta.add(endRow);
    }

    if (task.ifcduration) {
      const durationRow = UIComponents.row().gap("var(--phi-0-5)");

      const durationIcon = UIComponents.icon("timelapse");

      durationIcon.setStyle("font-size", ["12px"]);

      const duration = UIComponents.text(task.ifcduration);

      duration.setStyle("font-size", ["11px"]);

      durationRow.add(durationIcon, duration);

      meta.add(durationRow);
    }

    card.add(meta);

    if (task.pComp !== undefined && task.pComp > 0) {
      const progressContainer = UIComponents.row().gap("var(--phi-0-5)").addClass("fill-width");

      const progressBar = UIComponents.div();

      progressBar.setStyle("flex", ["1"]);

      progressBar.setStyle("height", ["4px"]);

      progressBar.setStyle("background", ["var(--theme-background-0810)"]);

      progressBar.setStyle("border-radius", ["2px"]);

      progressBar.setStyle("overflow", ["hidden"]);

      const progressFill = UIComponents.div();

      progressFill.setStyle("width", [`${task.pComp}%`]);

      progressFill.setStyle("height", ["100%"]);

      progressFill.setStyle("background", ["var(--theme-success)"]);

      progressBar.add(progressFill);

      const progressText = UIComponents.text(`${task.pComp}%`);

      progressText.setStyle("font-size", ["10px"]);

      progressContainer.add(progressBar, progressText);

      card.add(progressContainer);
    }

    const isSelected = AECO_tools.scheduler.isTaskSelected(task.pID);

    const checkboxRow = UIComponents.row().gap("var(--phi-0-5)").addClass("fill-width").addClass("justify-end");

    const checkbox = this.createTaskSelectionCheckbox(task.pID);

    if (isSelected) {
      checkbox.addClass("checked");

      card.addClass("selected");
    }

    this.taskCheckboxes.set(task.pID, { checkbox, taskItem: card });

    checkboxRow.add(checkbox);

    card.dom.insertBefore(checkboxRow.dom, card.dom.firstChild);

    card.onClick(() => {
      this.operators.execute("bim.load_task_details", this.context, task.pID);
    });

    return card;
  }

  renderListViewContent(workscheduleID, tasks) {
    const container = UIComponents.column().gap("var(--phi-0-5)");

    container.setClass("ws-list-container");

    container.setStyle("padding", ["var(--phi-0-5)"]);

    if (tasks.length === 0) {
      const emptyState = UIComponents.text("No tasks available");

      emptyState.setStyle("text-align", ["center"]);

      emptyState.setStyle("padding", ["var(--phi-2)"]);

      container.add(emptyState);

      return container;
    }

    tasks.forEach((task) => {
      const taskItem = UIComponents.row().gap("var(--phi-1)").addClass("fill-width").addClass("justify-between");

      taskItem.setStyle("background", ["var(--glass-surface)"]);

      taskItem.setStyle("border-radius", ["var(--phi-0-5)"]);

      taskItem.setStyle("padding", ["var(--phi-0-5) var(--phi-1)"]);

      taskItem.setStyle("cursor", ["pointer"]);

      taskItem.dom.setAttribute("data-task-id", task.pID);

      const content = UIComponents.column().gap("2px");

      content.setStyle("flex", ["1"]);

      const taskName = UIComponents.text(task.pName || "Untitled");

      taskName.setStyle("font-weight", ["500"]);

      const metaRow = UIComponents.row().gap("var(--phi-1)");

      if (task.pStart || task.pEnd) {
        const dateRow = UIComponents.row().gap("var(--phi-0-5)");

        const dateIcon = UIComponents.icon("date_range");

        dateIcon.setStyle("font-size", ["12px"]);

        const dates = UIComponents.text(
          `${formatSchedulingDate(task.pStart) || "?"} - ${formatSchedulingDate(task.pEnd) || "?"}`
        );

        dates.setStyle("font-size", ["12px"]);

        dateRow.add(dateIcon, dates);

        metaRow.add(dateRow);
      }

      if (task.ifcduration) {
        const durationRow = UIComponents.row().gap("var(--phi-0-5)");

        const durationIcon = UIComponents.icon("timelapse");

        durationIcon.setStyle("font-size", ["12px"]);

        const duration = UIComponents.text(task.ifcduration);

        duration.setStyle("font-size", ["12px"]);

        durationRow.add(durationIcon, duration);

        metaRow.add(durationRow);
      }

      content.add(taskName, metaRow);

      const status = (task.status || "NOTSTARTED").toUpperCase();

      const statusBadge = UIComponents.badge(status);

      statusBadge.setStyle("color", ["var(--theme-background-0204)"]);

      statusBadge.setStyle("font-size", ["10px"]);

      statusBadge.setStyle("padding", ["2px 8px"]);

      const isSelected = AECO_tools.scheduler.isTaskSelected(task.pID);

      const checkbox = this.createTaskSelectionCheckbox(task.pID);

      if (isSelected) {
        checkbox.addClass("checked");

        taskItem.addClass("selected");
      }

      this.taskCheckboxes.set(task.pID, { checkbox, taskItem });

      taskItem.dom.insertBefore(checkbox.dom, taskItem.dom.firstChild);

      taskItem.add(content, statusBadge);

      taskItem.onClick(() => {
        this.operators.execute("bim.load_task_details", this.context, task.pID);
      });

      container.add(taskItem);
    });

    return container;
  }

  createTaskSelectionCheckbox(taskId) {
    const checkbox = UIComponents.div();

    checkbox.addClass("TaskSelectCheckbox");

    checkbox.onClick((e) => {
      e.stopPropagation();

      const isChecked = checkbox.dom.classList.contains("checked");

      if (isChecked) {
        this.operators.execute("bim.deselect_task", this.context, taskId);
      } else {
        this.operators.execute("bim.select_task", this.context, taskId);
      }
    });

    return checkbox;
  }

  updateTaskSelectionUI(taskId, isSelected) {
    const entry = this.taskCheckboxes.get(taskId);

    if (!entry) return;

    const { checkbox, taskItem } = entry;

    if (isSelected) {
      checkbox.addClass("checked");

      taskItem.addClass("selected");
    } else {
      checkbox.removeClass("checked");

      taskItem.removeClass("selected");
    }
  }

  clearTaskCheckboxes() {
    this.taskCheckboxes.clear();

    this.spreadsheetSyncedSchedulerTaskIds.clear();
  }
}



export default [ SchedulingUI, TaskUI ];

