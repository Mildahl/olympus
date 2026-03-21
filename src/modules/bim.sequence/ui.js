import { Components as UIComponents } from "../../ui/Components/Components.js";

import dataStore from "../../data/index.js";

import AECO_tools from "../../tool/index.js";

import { HierarchyToggleUtil } from "../../utils/HierarchyToggleUtil.js";

import { SequenceData } from "./data.js";

import { getTasksForNodeView } from "../../ui/Components/Nodes.js";

import PythonSandbox from "../../tool/pyodide/Python.js";

async function loadData(context) {
  if (!SequenceData.is_loaded)
    await SequenceData.load(context.ifc.activeModel);
}

async function refreshSchedules(context) {
  SequenceData.is_loaded = false;

    await loadData(context);
}

class Schedule_Documentation {
  constructor(context) {
    this.context = context;

    this.currentEntity = "IfcWorkSchedule";

    this.bimReady = PythonSandbox.initialized?.bim === true;
    
    this.panel = UIComponents.floatingPanel();

    this.panel.setTitle("Schedule Documentation");

    this.panel.setIcon("menu_book");

    this.panel.setStyles({
      width: "320px",
      maxHeight: "60vh",
      top: "var(--headerbar-height)",
      right: "var(--phi-1)",
    });

    this.contentContainer = UIComponents.column()
      .setStyle("gap", ["var(--phi-0-5)"])
      .setStyle("padding", ["var(--phi-0-5)"]);

    this.panel.setContent(this.contentContainer);

    this._showEmptyState();

    this.listen(context)
  }

  listen(context) {

    context.signals.bimEnabled.add(() => {

        this.bimReady = true;

        this._buildContent();
        
    });

  }

  _showEmptyState() {
    this.contentContainer.clear();

    const emptyMessage = UIComponents.text("BIM AECO_tools not initialized. Documentation will load when available.");

    emptyMessage.setStyle("font-size", ["12px"]);

    emptyMessage.setStyle("color", ["var(--theme-text-light)"]);

    emptyMessage.setStyle("padding", ["var(--phi-1)"]);

    emptyMessage.setStyle("text-align", ["center"]);

    this.contentContainer.add(emptyMessage);
  }

  _buildContent() {
    if (!this.bimReady) {
      this._showEmptyState();

      return;
    }

    this.contentContainer.clear();

    const entities = ["IfcWorkSchedule", "IfcWorkPlan", "IfcTask", "IfcProcess", "IfcTrigger"];

    const icons = {
      IfcWorkSchedule: "schedule",
      IfcWorkPlan: "calendar_view_week",
      IfcTask: "task",
      IfcProcess: "settings",
      IfcTrigger: "flash_on",
    };

    const entitiesRow = UIComponents.row().gap("var(--phi-0-5)");

    entities.forEach((ent) => {
      const icon = UIComponents.icon(icons[ent]).addClass("clickable");

      icon.onClick(() => this._updateDescription(ent));

      if (ent === this.currentEntity) icon.addClass("Active");

      entitiesRow.add(icon);
    });

    this.contentContainer.add(entitiesRow);

    this._updateDescription(this.currentEntity);
  }

  async _updateDescription(entity = "IfcWorkSchedule") {
    
    if (!this.bimReady) {
      return;
    }

    this.currentEntity = entity;

    const description = await AECO_tools.ifc.getDescription(entity);

    const children = Array.from(this.contentContainer.dom.children);

    children.slice(1).forEach(child => child.remove());

    const icons = this.contentContainer.dom.querySelectorAll('.clickable');

    icons.forEach(icon => icon.classList.remove('Active'));

    const entities = ["IfcWorkSchedule", "IfcWorkPlan", "IfcTask", "IfcProcess", "IfcTrigger"];

    const idx = entities.indexOf(entity);

    if (idx >= 0 && icons[idx]) icons[idx].classList.add('Active');

    const collapsibleDesc = UIComponents.collapsibleSection({
      title: `${entity} Description`,
      collapsed: false,
    });

    const descText = UIComponents.text(description.description);

    descText.setStyle("font-size", ["12px"]);

    descText.setStyle("color", ["var(--theme-text-light)"]);

    collapsibleDesc.addContent(descText);

    const predefinedSection = UIComponents.collapsibleSection({
      title: "Predefined Types",
      collapsed: true,
    });

    const predefinedList = UIComponents.list();

    predefinedList.setStyle("gap", ["2px"]);

    if (description.predefined_types) {
      for (const [key, value] of Object.entries(description.predefined_types)) {
        if (value) {
          const item = UIComponents.listItem().addClass("justify-between");

          const label = UIComponents.text(key);

          label.setStyle("font-size", ["12px"]);

          const val = UIComponents.text(value);

          val.setStyle("font-size", ["12px"]);

          val.setStyle("color", ["var(--theme-text-light)"]);

          item.add(label, val);

          predefinedList.add(item);
        }
      }
    } else {
      predefinedList.add(UIComponents.text("No predefined types available."));
    }

    predefinedSection.setContent(predefinedList);

    collapsibleDesc.addContent(predefinedSection);

    const attributesSection = UIComponents.collapsibleSection({
      title: "Attributes",
      collapsed: true,
    });

    const attributesList = UIComponents.list();

    attributesList.setStyle("gap", ["2px"]);

    if (description.attributes) {
      for (const [key, value] of Object.entries(description.attributes)) {
        const item = UIComponents.listItem().addClass("justify-between");

        const label = UIComponents.text(key);

        label.setStyle("font-size", ["12px"]);

        const val = UIComponents.text(String(value));

        val.setStyle("font-size", ["12px"]);

        val.setStyle("color", ["var(--theme-text-light)"]);

        item.add(label, val);

        attributesList.add(item);
      }
    } else {
      attributesList.add(UIComponents.text("No attributes available."));
    }

    attributesSection.setContent(attributesList);

    collapsibleDesc.addContent(attributesSection);

    if (description.spec_url) {
      const specLink = UIComponents.link("ISO SPEC Reference", description.spec_url, "auto_stories", true);

      specLink.addClass("Link");

      collapsibleDesc.addContent(specLink);
    }

    this.contentContainer.add(collapsibleDesc);
  }

  show() {
    if (!this.panel.dom.parentNode) {
      this.context.dom.appendChild(this.panel.dom);
    }

    this.panel.dom.style.display = "flex";

    return this;
  }

  hide() {
    this.panel.dom.style.display = "none";

    return this;
  }

  toggle() {
    if (this.panel.dom.style.display === "none") {
      return this.show();
    }

    return this.hide();
  }
}

class SchedulingUI {
  constructor({ context, operators }) {
    this.context = context;
    this.operators = operators;

    this.position = "bottom";
    this.tabId = "sequence-scheduling";
    this.tabLabel = "Scheduling";

    this.panel = UIComponents.div();
    this.panel.addClass("Panel");
    this.panel.setStyle("display", ["flex"]);
    this.panel.setStyle("flex-direction", ["column"]);
    this.panel.setStyle("height", ["100%"]);
    this.panel.setStyle("width", ["100%"]);
    this.panel.setStyle("overflow", ["hidden"]);

    // Scrollable main content area
    this.content = UIComponents.div();
    this.content.addClass("PanelContent");
    this.content.setStyle("flex", ["1"]);
    this.content.setStyle("overflow-y", ["auto"]);
    this.content.setStyle("min-height", ["0"]);
    this.panel.add(this.content);

    // Fixed footer area
    this.footer = UIComponents.row();
    this.footer.addClass("PanelFooter");
    this.footer.setStyle("flex-shrink", ["0"]);
    this.panel.add(this.footer);

    this._isShown = false;

    this.viewTypes = {
      list: "List View",
      gantt: "Gantt Chart View",
      kanban: "Kanban Board",
      hierarchy: "Hierarchical View",
      spreadsheet: "Spreadsheet View",
      node: "Node View",
      default: "hierarchy",
    };

    /** Tab strip labels (short) for the task-view TabbedPanel (bottom workspace). */
    this.taskViewTabLabels = {
      hierarchy: "Hierarchy",
      list: "List",
      gantt: "Gantt",
      kanban: "Kanban",
      spreadsheet: "Sheet",
      node: "Node",
    };

    this.taskViewOrder = ["hierarchy", "list", "gantt", "kanban", "spreadsheet", "node"];

    this.taskFieldConfig = [
      {
        field: "pName",
        label: "Name",
        type: "text",
        editable: false,
        display: true,
      },
      {
        field: "pStart",
        label: "Start Date",
        type: "date",
        editable: true,
        includeTime: true,
        display: true,
      },
      {
        field: "pEnd",
        label: "End Date",
        type: "date",
        editable: true,
        includeTime: true,
        display: true,
      },
      {
        field: "status",
        label: "Status",
        type: "select",
        options: () => ["NOTSTARTED", "STARTED", "FINISHED", "ONHOLD"],
        editable: true,
        display: true,
      },
      {
        field: "pComp",
        label: "Progress (%)",
        type: "number",
        editable: true,
        display: false,
      },
      {
        field: "ifcduration",
        label: "Duration",
        type: "text",
        editable: false,
        display: false,
      },
      {
        field: "pID",
        label: "ID",
        type: "text",
        editable: false,
        display: false,
      },
      {
        field: "pRes",
        label: "Resources",
        type: "text",
        editable: true,
        display: false,
      },
      {
        field: "pCost",
        label: "Cost",
        type: "number",
        editable: true,
        display: false,
      },
    ];

    this.hierarchyToggleUtil = new HierarchyToggleUtil();

    /** Bottom workspace tab for editing tasks (list, Gantt, hierarchy, etc.). */
    this.taskPanelTabId = "sequence-schedule-tasks";
    this.taskPanelTabLabel = "Schedule tasks";
    this.taskPanelRoot = null;
    this.taskPanelContentHost = null;
    this.taskViewWrapper = null;
    this.taskViewsTabbedPanel = null;
    this.taskViewHosts = new Map();

    this.documentationPanel = null;

    this.spreadsheetComponent = null;

    this.taskCheckboxes = new Map();

    this.showTaskInformation = false;

    this.selectionCounter = null;

    this._registerSchedulingWorkspaceTab(context.layoutManager);

    this.draw(context, operators);
  }

  _registerSchedulingWorkspaceTab(layoutManager) {
    if (!layoutManager) {
      return;
    }

    if (this.position !== "left" && layoutManager.hasTab("left", this.tabId)) {
      layoutManager.removeTab("left", this.tabId);
    }

    layoutManager.ensureTab(this.position, this.tabId, this.tabLabel, this.panel, {
      open: false,
      replace: false,
    });

    this._bindCleanup = layoutManager.bindToggleForModule(
      "bim.sequence",
      this.position,
      this.tabId,
    );

    this._isShown = true;
  }

  /**
   * Registers the task editor (views + task details) as a tab in the bottom workspace.
   * Created when the user opens a work schedule for editing.
   */
  addTaskPanelTab() {
    const lm = this.context.layoutManager;
    const workspace = this.context.ui.workspaces.bottom;

    if (!workspace || !this.taskPanelRoot) return;

    if (lm) {
      lm.ensureTab("bottom", this.taskPanelTabId, this.taskPanelTabLabel, this.taskPanelRoot, {
        open: false,
        replace: false,
      });
      if (typeof lm.reorderBottomWorkspaceTabsByModuleOrder === "function") {
        lm.reorderBottomWorkspaceTabsByModuleOrder(this.context);
      }
    } else if (!Array.isArray(workspace.tabs) || !workspace.tabs.some((tab) => tab.dom && tab.dom.id === this.taskPanelTabId)) {
      workspace.addTab(this.taskPanelTabId, this.taskPanelTabLabel, this.taskPanelRoot);
    }
  }

  draw(context, operators) {
    this.panelMessage = UIComponents.disclaimer(
      "No IFC models available. Create a new model first."
    );

    this.content.addClass("Column");

    this.content.setStyles({ gap: "var(--phi-1)" });

    const sourceSection = createProjectSelection(context, operators);

    this.documentationPanel = new Schedule_Documentation(context);
    
    this.content.add(sourceSection);

    this.content.add(this._createSchedulesSection());

    this.footer.add(this._scheduleActions(context, operators));

    this.footer.setStyles({ marginTop: "var(--phi-1)" });

    this.listen(context, operators);
  }

  /**
   * ag-Grid and the embedded node canvas measure while `display: none` on other tabs.
   * Re-run layout after the active tab is shown (UITabbedPanel already dispatches `resize`).
   */
  _refreshVisibleTaskViewLayout(activeTabId) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (activeTabId === "spreadsheet" && this.spreadsheetComponent?.notifyLayout) {
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

  drawTaskWindow(context, tasks) {
    if (!this.taskPanelRoot) {
      this.taskPanelRoot = UIComponents.div();
      this.taskPanelRoot.addClass("Panel");
      this.taskPanelRoot.setStyle("display", ["flex"]);
      this.taskPanelRoot.setStyle("flex-direction", ["column"]);
      this.taskPanelRoot.setStyle("height", ["100%"]);
      this.taskPanelRoot.setStyle("width", ["100%"]);
      this.taskPanelRoot.setStyle("overflow", ["hidden"]);
      this.taskPanelRoot.setStyle("min-height", ["0"]);

      this.taskPanelContentHost = UIComponents.div();
      this.taskPanelContentHost.addClass("PanelContent");
      this.taskPanelContentHost.setStyle("flex", ["1"]);
      this.taskPanelContentHost.setStyle("min-height", ["0"]);
      this.taskPanelContentHost.setStyle("overflow", ["hidden"]);
      this.taskPanelContentHost.setStyle("display", ["flex"]);
      this.taskPanelContentHost.setStyle("flex-direction", ["column"]);

      this.taskPanelRoot.add(this.taskPanelContentHost);

      this.taskViewWrapper = UIComponents.column()
        .addClass("fill-height")
        .addClass("task-view-wrapper")
        .setStyle("flex", ["1"])
        .setStyle("min-height", ["0"])
        .setStyle("gap", ["var(--phi-0-5)"]);

      this.taskViewSelectorRow = UIComponents.row()
        .gap("var(--phi-0-5)")
        .addClass("fill-width")
        .setStyle("justify-content", ["flex-end"]);

      this.taskViewSelectorRow.add(this._createSelectionToggle());

      this.taskViewsTabbedPanel = UIComponents.tabbedPanel();
      this.taskViewsTabbedPanel.addClass("inner-tabbed-panel");
      this.taskViewsTabbedPanel.addClass("sequence-task-views-panel");
      this.taskViewsTabbedPanel.setStyle("flex", ["1"]);
      this.taskViewsTabbedPanel.setStyle("min-height", ["0"]);
      this.taskViewsTabbedPanel.setStyle("overflow", ["hidden"]);
      this.taskViewsTabbedPanel.setStyle("width", ["100%"]);
      this.taskViewsTabbedPanel.setStyle("max-width", ["100%"]);

      this.taskViewHosts.clear();

      for (const id of this.taskViewOrder) {
        const host = UIComponents.div();
        host.addClass("sequence-task-view-host");
        host.setStyle("display", ["flex"]);
        host.setStyle("flex-direction", ["column"]);
        host.setStyle("height", ["100%"]);
        host.setStyle("min-height", ["0"]);
        host.setStyle("overflow", ["hidden"]);

        this.taskViewHosts.set(id, host);

        const tabLabel = this.taskViewTabLabels[id] || id;

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

      this.taskViewsTabbedPanel.select(this.viewTypes.default);

      const tp = this.taskViewsTabbedPanel;
      const self = this;
      const origSelect = tp.select.bind(tp);
      tp.select = function (id) {
        const ret = origSelect(id);
        self._refreshVisibleTaskViewLayout(id);
        return ret;
      };

      this.taskViewWrapper.add(this.taskViewSelectorRow);
      this.taskViewWrapper.add(this.taskViewsTabbedPanel);

      this._createTaskDetailsSection();

      this.taskViewWrapper.add(this.taskDetailsResizer);
      this.taskViewWrapper.add(this.taskDetailsSection);

      this.taskPanelContentHost.add(this.taskViewWrapper);

      this._setTaskInformationPanelVisible(false);

      this.addTaskPanelTab();
    }
  }

  _setTaskInformationPanelVisible(visible) {
    if (!this.taskDetailsSection || !this.taskDetailsResizer) {
      return;
    }

    const displayValue = visible ? "flex" : "none";

    this.taskDetailsSection.setStyle("display", [displayValue]);

    this.taskDetailsResizer.setStyle("display", [visible ? "block" : "none"]);
  }

  focusTaskForDetails(taskId) {
    if (!this.showTaskInformation || taskId === undefined || taskId === null) {
      return;
    }

    AECO_tools.scheduler.clearSelectedTasks();

    this.operators.execute("bim.select_task", this.context, taskId);
  }

  _createTaskDetailsSection() {
    this.taskDetailsSection = UIComponents.div();

    this.taskDetailsSection.addClass('TaskDetails-section');

    this.taskDetailsSection.setStyles({
      height: '180px',
      minHeight: '100px',
      maxHeight: '50vh',
      display: 'flex',
      flexDirection: 'column',
      borderTop: '1px solid var(--border)',
      background: 'var(--glass-surface)',
      overflow: 'hidden'
    });

    const header = UIComponents.row()
      .addClass('TaskDetails-header')
      .gap('var(--phi-0-5)')
      .setStyles({
        padding: '0.5rem',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--border)',
        background: 'var(--theme-background-2)',
        cursor: 'pointer'
      });

    const headerLeft = UIComponents.row().gap('var(--phi-0-5)');

    const headerIcon = UIComponents.icon('info');

    headerIcon.setStyle('fontSize', ['14px']);

    const headerTitle = UIComponents.text('Task Details');

    headerTitle.setStyle('fontWeight', ['600']);

    headerTitle.setStyle('fontSize', ['0.85rem']);

    headerLeft.add(headerIcon, headerTitle);

    this.taskDetailsToggle = UIComponents.icon('expand_more');

    this.taskDetailsToggle.setStyle('transition', ['transform 0.2s']);

    this.taskDetailsVisible = true;

    header.onClick(() => {
      this.taskDetailsVisible = !this.taskDetailsVisible;

      this.taskDetailsContent.dom.style.display = this.taskDetailsVisible ? 'flex' : 'none';

      this.taskDetailsToggle.dom.textContent = this.taskDetailsVisible ? 'expand_more' : 'expand_less';
    });

    header.add(headerLeft, this.taskDetailsToggle);

    this.taskDetailsContent = UIComponents.row()
      .addClass('TaskDetails-content')
      .setStyles({
        flex: '1',
        overflow: 'auto',
        padding: 'var(--phi-0-5)',
        gap: 'var(--phi-1)'
      });

    this._renderEmptyTaskDetails();

    this.taskDetailsSection.add(header, this.taskDetailsContent);

    this.taskDetailsResizer = this._createTaskDetailsResizer();
  }

  _createTaskDetailsResizer() {
    const resizer = UIComponents.div();

    resizer.addClass('TaskDetails-resizer');

    resizer.setStyles({
      height: '6px',
      cursor: 'ns-resize',
      background: 'transparent',
      position: 'relative',
      flexShrink: '0'
    });

    const handle = UIComponents.div();

    handle.setStyles({
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      width: '40px',
      height: '4px',
      borderRadius: '2px',
      background: 'var(--border)'
    });

    resizer.add(handle);

    let isResizing = false;

    let startY = 0;

    let startHeight = 0;

    resizer.dom.addEventListener('mousedown', (e) => {
      isResizing = true;

      startY = e.clientY;

      startHeight = this.taskDetailsSection.dom.offsetHeight;

      document.body.style.cursor = 'ns-resize';

      document.body.style.userSelect = 'none';

      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;

      const deltaY = startY - e.clientY;

      const newHeight = Math.max(100, Math.min(startHeight + deltaY, window.innerHeight * 0.5));

      this.taskDetailsSection.dom.style.height = newHeight + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;

        document.body.style.cursor = '';

        document.body.style.userSelect = '';
      }
    });

    return resizer;
  }

  _renderEmptyTaskDetails() {
    this.taskDetailsContent.clear();

    const emptyState = UIComponents.text('Click a task to view details');

    emptyState.setStyles({
      color: 'var(--theme-text-light)',
      fontStyle: 'italic',
      padding: 'var(--phi-1)',
      textAlign: 'center',
      width: '100%'
    });

    this.taskDetailsContent.add(emptyState);
  }

  _updateTaskDetails(details) {
    this.taskDetailsContent.clear();

    const createSection = (title, icon, items) => {
      const section = UIComponents.column()
        .setStyles({
          flex: '1',
          minWidth: '150px',
          maxHeight: '100%',
          overflow: 'hidden'
        });

      const sectionHeader = UIComponents.row()
        .gap('var(--phi-0-25)')
        .setStyles({
          alignItems: 'center',
          marginBottom: 'var(--phi-0-5)'
        });

      const sectionIcon = UIComponents.icon(icon);

      sectionIcon.setStyle('fontSize', ['14px']);

      sectionIcon.setStyle('color', ['var(--theme-accent)']);

      const sectionTitle = UIComponents.text(title);

      sectionTitle.setStyles({
        fontWeight: '600',
        fontSize: '0.8rem'
      });

      const countBadge = UIComponents.badge(String(items.length));

      countBadge.setStyles({
        fontSize: '10px',
        padding: '1px 6px',
        marginLeft: 'var(--phi-0-25)'
      });

      sectionHeader.add(sectionIcon, sectionTitle, countBadge);

      const itemList = UIComponents.column()
        .setStyles({
          gap: '2px',
          overflow: 'auto',
          flex: '1',
          paddingRight: 'var(--phi-0-25)'
        });

      if (items.length === 0) {
        const noItems = UIComponents.text('None');

        noItems.setStyles({
          color: 'var(--theme-text-light)',
          fontSize: '0.75rem',
          fontStyle: 'italic'
        });

        itemList.add(noItems);
      } else {
        items.forEach(item => {
          const itemRow = UIComponents.row()
            .gap('var(--phi-0-25)')
            .setStyles({
              padding: '3px 6px',
              background: 'var(--theme-background)',
              borderRadius: '3px',
              alignItems: 'center',
              cursor: 'pointer'
            });

          itemRow.dom.addEventListener('mouseenter', () => {
            itemRow.dom.style.background = 'var(--theme-background-hover)';
          });

          itemRow.dom.addEventListener('mouseleave', () => {
            itemRow.dom.style.background = 'var(--theme-background)';
          });

          const itemName = UIComponents.text(item.Name);

          itemName.setStyles({
            fontSize: '0.75rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          });

          itemRow.add(itemName);

          itemList.add(itemRow);
        });
      }

      section.add(sectionHeader, itemList);

      return section;
    };

    const outputsSection = createSection('Outputs', 'output', details.outputs || []);

    const inputsSection = createSection('Inputs', 'input', details.inputs || []);

    const resourcesSection = createSection('Resources', 'person', details.resources || []);

    this.taskDetailsContent.add(outputsSection, inputsSection, resourcesSection);
  }

  show() {
    const lm = this.context?.layoutManager;
    const panelWorkspace = this.context.ui?.workspaces?.[this.position];

    if (lm && panelWorkspace && typeof panelWorkspace.select === "function") {
      lm.ensureTab(this.position, this.tabId, this.tabLabel, this.panel, {
        open: false,
        replace: false,
      });

      lm.openWorkspace(this.position);
      panelWorkspace.select(this.tabId);
      this._isShown = true;
    }

    if (this.documentationPanel) {
      this.documentationPanel.show();
    }

    return this;
  }

  hide() {
    const lm = this.context?.layoutManager;
    if (lm && lm.isTabSelected(this.position, this.tabId)) {
      lm.closeWorkspace(this.position);
    }

    if (this.documentationPanel) {
      this.documentationPanel.hide();
    }

    return this;
  }

  destroy() {
    if (this._bindCleanup) {
      this._bindCleanup();
      this._bindCleanup = null;
    }
  }

  updateCount(count) {
    if (this.schedulesSection) this.schedulesSection.setTitle("Available Schedules " + (count ?? 0));
  }

  async refreshScheduleUI(context) {

      await refreshSchedules(context);
      
      this.updateSchedulesList(
        SequenceData.data.work_schedules?.work_schedules_enum
      );

      this.updateCount(
        SequenceData.data.work_schedules?.work_schedules_enum.length
      );

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
    });

    signals.workschedulechanged.add(async () => {
      await this.refreshScheduleUI(context);
    });

    signals.enableEditingWorkScheduleTasks.add(({ model, workscheduleGlobalId, tasks, viewType }) => {
      AECO_tools.scheduler.setActiveSchedule(workscheduleGlobalId);

      AECO_tools.scheduler.setTasks(tasks);

      this.clearTaskCheckboxes();

      const initialViewType = viewType || this.viewTypes.default;

      this.openTaskViewPanel(context, workscheduleGlobalId, initialViewType, tasks);
    });

    signals.taskSelected.add(({ taskId, selected }) => {
      this.updateTaskSelectionUI(taskId, selected);
    });

    signals.taskDetailsLoaded.add(({ taskId, outputs, inputs, resources }) => {
      this._updateTaskDetails({ outputs, inputs, resources });
    });


  }

  createScheduleRow({ GlobalId, Name, StartTime, FinishTime, PredefinedType }) {
    const item = UIComponents.listItem();

    item.setStyle("flex-direction", ["column"]);

    item.setStyle("gap", ["var(--phi-0-5)"]);

    item.setStyle("padding", ["var(--phi-0-5)"]);

    item.setStyle("border-radius", ["var(--phi-0-5)"]);

    item.setStyle("background", ["var(--glass-surface)"]);

    const getModel = () => this.context.ifc.activeModel;

    const headerRow = UIComponents.row().gap("var(--phi-0-5)").addClass("fill-width").addClass("justify-between");

    const name = UIComponents.text(Name || "Unnamed");

    name.setStyle("font-weight", ["600"]);

    const predefinedType = UIComponents.badge(PredefinedType || "N/A");

    predefinedType.setStyle("font-size", ["10px"]);

    predefinedType.setStyle("padding", ["2px 6px"]);

    headerRow.add(name, predefinedType);

    const dateRow = UIComponents.row().gap("var(--phi-0-5)");

    const dateIcon = UIComponents.icon("date_range");

    dateIcon.setStyle("font-size", ["14px"]);

    dateIcon.setStyle("color", ["var(--theme-text-light)"]);

    const dateRange = UIComponents.text(`${StartTime || "?"} - ${FinishTime || "?"}`);

    dateRange.setStyle("font-size", ["12px"]);

    dateRange.setStyle("color", ["var(--theme-text-light)"]);

    dateRow.add(dateIcon, dateRange);

    const actionsRow = UIComponents.row().gap("var(--phi-0-5)").addClass("fill-width");

    const editBtn = UIComponents.button("Edit");

    editBtn.setIcon("edit");

    editBtn.addClass("Button-secondary");

    editBtn.onClick(() => {
      this.operators.execute("bim.enable_editing_attributes", this.context, getModel(), GlobalId);
    });

    const tasksBtn = UIComponents.button("Tasks");

    tasksBtn.setIcon("task");

    tasksBtn.addClass("Button-primary");

    tasksBtn.onClick(() => {
      this.operators.execute("bim.enable_editing_work_schedule_tasks", this.context, GlobalId);
    });

    const deleteBtn = UIComponents.button("Delete");

    deleteBtn.setIcon("delete");

    deleteBtn.addClass("Button-danger");

    deleteBtn.onClick(() => {
      this.operators.execute("bim.remove_work_schedule", this.context, getModel(), GlobalId);
    });

    actionsRow.add(editBtn, tasksBtn, deleteBtn);

    item.add(headerRow, dateRow, actionsRow);

    this.schedulesLists.add(item);
  }

  updateSchedulesList(schedules) {
    this.schedulesLists.clear();

    schedules.forEach((workSchedule) => {
      const workscheduleData =
        SequenceData.data.work_schedules.work_schedules[workSchedule[0]];

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

  _createSchedulesSection() {
    this.schedulesSection = UIComponents.collapsibleSection({
      title: "Available Schedules 0",
      icon: "schedule",
      collapsed: false,
    });

    this.schedulesLists = UIComponents.list();

    this.schedulesLists.setStyle("gap", ["2px"]);

    this.schedulesSection.setContent(this.schedulesLists);

    return this.schedulesSection;
  }

  _scheduleActions(context, operators) {
    const label = UIComponents.text("Create New Work Schedule:").addClass("hud-label");

    const nameInput = UIComponents.input().addClass("hud-input");

    nameInput.setValue("Schedule Name");

    this.nameInput = nameInput;

    this.addButton = UIComponents.operator("add");

    this.addButton.onClick(() => {
      const model = this.context.ifc.activeModel;

      operators.execute("bim.add_work_schedule", context, model, nameInput.getValue());
    });

    const addRow = UIComponents.row().gap("var(--phi-0-5)").add(nameInput, this.addButton);

    const addSection = UIComponents.column().gap("var(--phi-0-5)");

    addSection.add(label, addRow);

    return addSection;
  }


  _createSelectionToggle() {
    const container = UIComponents.row().gap("var(--phi-0-5)").addClass("centered-vertical");

    const toggle = UIComponents.div();

    toggle.addClass("SelectionToggle");

    const icon = UIComponents.icon("info");

    icon.setStyle("font-size", ["16px"]);

    const label = UIComponents.text("Show task information");

    label.setStyle("font-size", ["12px"]);

    toggle.add(icon, label);

    this.selectionCounter = UIComponents.div();

    this.selectionCounter.addClass("SelectionCounter");

    this.selectionCounter.dom.textContent = "0";

    this.selectionCounter.setStyle("display", ["none"]);

    toggle.onClick(() => {
      this.showTaskInformation = !this.showTaskInformation;

      const wrapper = this.taskPanelRoot?.dom?.querySelector(".task-view-wrapper");

      if (this.showTaskInformation) {
        toggle.addClass("active");

        wrapper?.classList.add("selection-enabled");

        this._setTaskInformationPanelVisible(true);
      } else {
        toggle.removeClass("active");

        wrapper?.classList.remove("selection-enabled");

        this._setTaskInformationPanelVisible(false);

        AECO_tools.scheduler.clearSelectedTasks();

        this.updateSelectionCounter(0);

        this.taskCheckboxes.forEach(({ checkbox, taskItem }) => {
          checkbox.removeClass("checked");

          taskItem.removeClass("selected");
        });
      }
    });

    container.add(toggle, this.selectionCounter);

    return container;
  }

  updateSelectionCounter(count) {
    if (!this.selectionCounter) return;

    this.selectionCounter.dom.textContent = String(count);

    this.selectionCounter.setStyle("display", [count > 0 ? "block" : "none"]);
  }

  openTaskViewPanel(
    context,
    workscheduleID,
    initialViewType = "hierarchy",
    tasks
  ) {
    this.currentWorkscheduleID = workscheduleID;

    this.drawTaskWindow(context, tasks);

    this.updateTaskViewContent(context, workscheduleID, initialViewType, tasks);

    const lm = this.context.layoutManager;
    if (lm && this.taskPanelTabId) {
      lm.selectTab("bottom", this.taskPanelTabId);
    }
  }

  updateTaskViewContent(context, workscheduleID, viewType, tasks) {
    this.tasks = tasks || this.tasks;

    this.clearTaskCheckboxes();

    const ctx = context || this.context;

    if (!this.taskViewsTabbedPanel || !this.taskViewHosts.size) {
      return;
    }

    const renderViewElement = (id) => {
      switch (id) {
        case "list":
          return this.renderListViewContent(workscheduleID, tasks);

        case "gantt":
          return this.renderGanttchart(ctx, workscheduleID, tasks);

        case "kanban":
          return this.renderKanbanViewContent(workscheduleID, tasks);

        case "hierarchy":
          return this.renderHierarchyViewContent(workscheduleID, tasks);

        case "spreadsheet":
          return this.renderSpreadsheetViewContent(ctx, workscheduleID, tasks);

        case "node":
          return this.renderNodeViewContent(ctx, workscheduleID, tasks);

        default:
          return UIComponents.text("Unknown view type");
      }
    };

    for (const id of this.taskViewOrder) {
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
      this.viewTypes.default;

    if (!this.taskViewOrder.includes(tabId)) {
      tabId = this.viewTypes.default;
    }

    this.taskViewsTabbedPanel.select(tabId);

    if (this.taskViewWrapper) {
      if (this.showTaskInformation) {
        this.taskViewWrapper.addClass("selection-enabled");
      } else {
        this.taskViewWrapper.removeClass("selection-enabled");
      }

      this._setTaskInformationPanelVisible(this.showTaskInformation);
    }

    const selectedCount = AECO_tools.scheduler.getSelectionCount();

    this.updateSelectionCounter(selectedCount);
  }

  renderHierarchyViewContent(workscheduleID, tasks) {
    this.tasks = tasks;

    if (tasks.length === 0) {
      const empty = UIComponents.text("No tasks to display");

      empty.setStyle("color", ["var(--theme-text-light)"]);

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
    const statusColors = {
      NOTSTARTED: "var(--theme-warning)",
      STARTED: "var(--theme-info)",
      COMPLETED: "var(--theme-success)",
      FINISHED: "var(--theme-success)",
      ONHOLD: "var(--theme-text-light)"
    };

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

        toggleIcon.setStyle("color", ["var(--theme-text-light)"]);

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
        this.focusTaskForDetails(taskId);
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

        dateIcon.setStyle("color", ["var(--theme-text-light)"]);

        dateIcon.setStyle("flex-shrink", ["0"]);

        const dates = UIComponents.text(
          `${this.formatDate(node.task.pStart) || "?"} - ${this.formatDate(node.task.pEnd) || "?"}`
        );

        dates.setStyle("font-size", ["11px"]);

        dates.setStyle("color", ["var(--theme-text-light)"]);

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

      statusBadge.setStyle("background", [statusColors[status] || "var(--theme-text-light)"]);

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
      onNodeClick: (node) => {
        const taskId = node.data && node.data.pID !== undefined ? node.data.pID : node.id;

        if (!taskId) return;

        this.focusTaskForDetails(taskId);
      },
      onEdit: (node) => {
        const GlobalId = node.data?.GlobalId;

        if (GlobalId) {
          this.operators.execute("bim.enable_editing_attributes", this.context, getModel(), GlobalId);
        }
      },
      onDelete: (node) => {
        const GlobalId = node.data?.GlobalId;

        if (GlobalId) {
          this.operators.execute("bim.remove_task", this.context, getModel(), GlobalId);
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

      const { selected } = eventData;

    });

    container.add(this.spreadsheetComponent);

  }

  renderGanttchart(context, workscheduleID, tasks) {

    const ganttChartContainer = UIComponents.gantt(context, tasks, {
      operators: this.operators,
      onTaskRowClick: (taskId) => {
        this.focusTaskForDetails(taskId);
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

        emptyState.setStyle("color", ["var(--theme-text-light)"]);

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

      startIcon.setStyle("color", ["var(--theme-text-light)"]);

      const startDate = UIComponents.text(this.formatDate(task.pStart));

      startDate.setStyle("font-size", ["11px"]);

      startDate.setStyle("color", ["var(--theme-text-light)"]);

      startRow.add(startIcon, startDate);

      meta.add(startRow);
    }

    if (task.pEnd) {
      const endRow = UIComponents.row().gap("var(--phi-0-5)");

      const endIcon = UIComponents.icon("event_available");

      endIcon.setStyle("font-size", ["12px"]);

      endIcon.setStyle("color", ["var(--theme-text-light)"]);

      const endDate = UIComponents.text(this.formatDate(task.pEnd));

      endDate.setStyle("font-size", ["11px"]);

      endDate.setStyle("color", ["var(--theme-text-light)"]);

      endRow.add(endIcon, endDate);

      meta.add(endRow);
    }

    if (task.ifcduration) {
      const durationRow = UIComponents.row().gap("var(--phi-0-5)");

      const durationIcon = UIComponents.icon("timelapse");

      durationIcon.setStyle("font-size", ["12px"]);

      durationIcon.setStyle("color", ["var(--theme-text-light)"]);

      const duration = UIComponents.text(task.ifcduration);

      duration.setStyle("font-size", ["11px"]);

      duration.setStyle("color", ["var(--theme-text-light)"]);

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

      progressText.setStyle("color", ["var(--theme-text-light)"]);

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
      this.focusTaskForDetails(task.pID);
    });

    return card;
  }

  formatDate(dateStr) {
    if (!dateStr) return "";

    const date = new Date(dateStr);

    if (isNaN(date.getTime())) return dateStr;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  renderListViewContent(workscheduleID, tasks) {
    const container = UIComponents.column().gap("var(--phi-0-5)");

    container.setClass("ws-list-container");

    container.setStyle("padding", ["var(--phi-0-5)"]);

    if (tasks.length === 0) {
      const emptyState = UIComponents.text("No tasks available");

      emptyState.setStyle("color", ["var(--theme-text-light)"]);

      emptyState.setStyle("text-align", ["center"]);

      emptyState.setStyle("padding", ["var(--phi-2)"]);

      container.add(emptyState);

      return container;
    }

    const statusColors = {
      NOTSTARTED: "var(--theme-warning)",
      STARTED: "var(--theme-info)",
      COMPLETED: "var(--theme-success)",
      FINISHED: "var(--theme-success)",
      ONHOLD: "var(--theme-text-light)"
    };

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

        dateIcon.setStyle("color", ["var(--theme-text-light)"]);

        const dates = UIComponents.text(
          `${this.formatDate(task.pStart) || "?"} - ${this.formatDate(task.pEnd) || "?"}`
        );

        dates.setStyle("font-size", ["12px"]);

        dates.setStyle("color", ["var(--theme-text-light)"]);

        dateRow.add(dateIcon, dates);

        metaRow.add(dateRow);
      }

      if (task.ifcduration) {
        const durationRow = UIComponents.row().gap("var(--phi-0-5)");

        const durationIcon = UIComponents.icon("timelapse");

        durationIcon.setStyle("font-size", ["12px"]);

        durationIcon.setStyle("color", ["var(--theme-text-light)"]);

        const duration = UIComponents.text(task.ifcduration);

        duration.setStyle("font-size", ["12px"]);

        duration.setStyle("color", ["var(--theme-text-light)"]);

        durationRow.add(durationIcon, duration);

        metaRow.add(durationRow);
      }

      content.add(taskName, metaRow);

      const status = (task.status || "NOTSTARTED").toUpperCase();

      const statusBadge = UIComponents.badge(status);

      statusBadge.setStyle("background", [statusColors[status] || "var(--theme-text-light)"]);

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
        this.focusTaskForDetails(task.pID);
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

    const selectedCount = AECO_tools.scheduler.getSelectionCount();

    this.updateSelectionCounter(selectedCount);
  }

  clearTaskCheckboxes() {
    this.taskCheckboxes.clear();
  }

  enableSelection({ taskId, taskItem, addCheckbox = true }) {
    const isSelected = AECO_tools.scheduler.isTaskSelected(taskId);

    let checkbox = null;

    if (addCheckbox) {
      checkbox = this.createTaskSelectionCheckbox(taskId);

      if (isSelected) {
        checkbox.addClass("checked");
      }

      this.taskCheckboxes.set(taskId, { checkbox, taskItem });

      taskItem.dom.insertBefore(checkbox.dom, taskItem.dom.firstChild);
    }

    if (isSelected) {
      taskItem.addClass("selected");
    }

    return checkbox;
  }
}

function createProjectSelection(context, operators) {
  const options = { "": "Data sources" };

  context.ifc.availableModels.forEach((modelName) => {
    options[modelName] = modelName;
  });

  const modelSelect = UIComponents.select();

  modelSelect.setOptions(options);

  modelSelect.setValue(context.ifc.activeModel || "");

  modelSelect.addClass("hud-input");

  modelSelect.onBlur(async () => {
    await operators.execute("bim.set_active_model", context, modelSelect.getValue());
  });

  context.signals.newIFCModel.add(() => {
    const opts = { "": "select source" };

    context.ifc.availableModels.forEach((m) => { opts[m] = m; });

    modelSelect.setOptions(opts);

    modelSelect.setValue(context.ifc.activeModel || "");
  });

  const row = UIComponents.row().gap("var(--phi-0-5)");

  row.add(modelSelect);

  return row;
}

export default [ SchedulingUI ];

