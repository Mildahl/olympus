import { UIComponents } from "aeco";
import { tools } from "aeco";

import * as hardHatStore from "./hardHatStore.js";

import {
  enrichLiftsWithEstimates,
  buildLiftDataForGrid,
  liftsToTaskFormat,
  computeLiftStats,
  computeDayCapacity,
  buildLiftStatsDisplay,
  getWeatherDisplayData,
  getLocationDisplayData,
  LIFT_COLUMN_ORDER,
  LIFT_COLUMN_CONFIG,
  DEFAULT_WORKING_HOURS,
  DEFAULT_CRANE_SPEED,
} from "./utils.js";

const SIGNALS = ["hardHatStoreChanged", "hardHatLiftRemoved", "weatherChanged", "hardHatScheduleViewToggled"];

// View types for schedule panel (similar to bim.sequence)
const VIEW_TYPES = {
  spreadsheet: "Spreadsheet View",
  gantt: "Gantt Chart",
  hierarchy: "Hierarchy View",
};

// Default filter state
const DEFAULT_FILTER = {
  equipmentId: "ALL",
  dateStr: "ALL",
};

class AppointedPersonUI {
  constructor({ context, operators }) {
    this.context = context;

    this.ops = operators;

    this.store = hardHatStore.loadStore();

    this.liftingSpreadsheet = null;

    this.scheduleViewPanel = null;

    this.currentViewType = "spreadsheet";

    // Equipment schedule state
    this.selectedEquipmentId = "ALL";

    this.selectedDateStr = "ALL"; // Default to show seeded demo data

    this.equipmentSpreadsheets = {}; // Cache spreadsheets per equipment tab

    this.panel = UIComponents.floatingPanel({
      context,
      title: "Lifting schedule",
      icon: "engineering",
      workspaceTabId: "addon.hardhat.schedule",
      workspaceTabLabel: "Lifting schedule",
      startMinimized: true,
    });

    this.panel
      .setStyle("width", ["min(72vw, 1100px)"])
      .setStyle("height", ["min(72vh, 820px)"])
      .setStyle("min-width", ["480px"])
      .setStyle("max-width", ["90vw"])
      .setStyle("max-height", ["90vh"]);

    this.contentArea = UIComponents.column()
      .addClass("HardHatLiftingDashboard-panelContent")
      .setStyles({
        flex: "1",
        overflowX: "hidden",
        overflowY: "auto",
        minHeight: "0",
      });

    this.panel.setContent(this.contentArea);

    // this.drawDevUI(context);

    this.appendDom(context);

    this.listen(context);

    this._redraw();
  }

  appendDom(context) {
    if (!this.panel.dom.parentNode) {
      context.dom.appendChild(this.panel.dom);
    }
  }

  show() {
    if (this.panel.isMinimized) {
      this.panel.restore();
    }
    this.appendDom(this.context);
  }

  hide() {
    if (this.panel.dom.parentNode) {
      this.panel.dom.parentNode.removeChild(this.panel.dom);
    }
  }

  destroy() {
    this.hide();
  }

  listen(context) {
    // Signals are registered in app.js before initWorld
    // No need to call addListeners here - they must be available

    context.signals.hardHatStoreChanged.add(({ store }) => {
      this.store = store;

      this._redraw();
      
      // Update schedule view panel if open
      if (this.scheduleViewPanel && this.scheduleViewPanel.dom.style.display !== "none") {
        this._updateScheduleViewContent();
      }
    });

    context.signals.weatherChanged.add(({ weather }) => {
      if (weather) {
        hardHatStore.updateWeather(this.store, weather);
      }

      this._redraw();
    });

    context.signals.hardHatScheduleViewToggled.add(({ viewType }) => {
      if (viewType) {
        this.currentViewType = viewType;
      }

      this._toggleScheduleViewPanel();
    });
  }

  _redraw() {
    const data = this._prepareDrawData();

    const rootColumn = UIComponents.column()
      .addClass("HardHatLiftingDashboard-root")
      .setStyles({
        width: "100%",
        flex: "1",
        minHeight: "0",
        gap: "0.5rem",
      });

    const equipmentScheduleSection = this._drawEquipmentScheduleSection(data);

    const statsSection = this._drawLiftingStatsSection(data.stats, data.craneOverviewStatics);

    rootColumn.add(equipmentScheduleSection, statsSection);

    this.contentArea.clear();

    this.contentArea.add(rootColumn);
  }

  _prepareDrawData() {
    // Sync UI state from store
    this.selectedEquipmentId = hardHatStore.getActiveEquipment(this.store);

    this.selectedDateStr = hardHatStore.getActiveDateFilter(this.store);

    // Get filtered lifts based on active equipment and date
    const activeLifts = hardHatStore.getActiveLifts(this.store);

    const allLifts = [...this.store.lifts];

    const craneForEstimates = this.store.crane;

    const craneSpeed = craneForEstimates && craneForEstimates.speed != null ? craneForEstimates.speed : DEFAULT_CRANE_SPEED;

    enrichLiftsWithEstimates(activeLifts, craneSpeed);

    enrichLiftsWithEstimates(allLifts, craneSpeed);

    const liftDataForGrid = buildLiftDataForGrid(activeLifts);

    const stats = computeLiftStats(activeLifts);

    const craneOverviewStatics = buildLiftStatsDisplay(stats);

    const weather = this.store.weather;

    const weatherDisplayData = getWeatherDisplayData(weather);

    const locationDisplayData = getLocationDisplayData(weather);

    return { lifts: allLifts, activeLifts, liftDataForGrid, stats, craneOverviewStatics, weatherDisplayData, locationDisplayData };
  }

  _drawLiftingSection(data) {
    const { liftDataForGrid } = data;

    const liftingSection = UIComponents.collapsibleSection({
      title: "Lifting schedule",
      icon: "engineering",
      collapsed: false,
    });

    const toolbarRow = this._drawLiftingToolbar();

    const liftingSpreadsheet = this._drawLiftingSpreadsheet(liftDataForGrid);

    const addButtonRow = this._drawAddLiftRow();

    const lifSection = UIComponents.column().setStyles({
      width: "100%",
      minHeight: "100%",
      gap: "0.5rem",
    });

    lifSection.add(toolbarRow, liftingSpreadsheet, addButtonRow);

    liftingSection.setContent(lifSection);

    return liftingSection;
  }

  _drawAddLiftRow() {
    const row = UIComponents.row().gap("0.5rem").addClass("centered-vertical").setStyles({ marginTop: "0.5rem" });

    const addLiftBtn = UIComponents.operator("add");

    addLiftBtn.setTooltip("Add new lift");

    addLiftBtn.onClick(() => {
      this.ops.execute("hardhat.add_lift", this.context, {
        name: "New Lift",
        weight: 1.0,
        subcontractor: hardHatStore.DEFAULT_SUBCONTRACTORS[0],
      });
    });

    row.add(addLiftBtn);

    return row;
  }

  _drawLiftingToolbar() {
    const toolbarRow = UIComponents.row().gap("0.5rem").addClass("centered-vertical").setStyles({ marginBottom: "0.5rem" });

    const deleteBtn = UIComponents.operator("delete");

    deleteBtn.setTooltip("Delete selected lift(s)");

    deleteBtn.onClick(() => {
      if (!this.liftingSpreadsheet) return;

      const selectedRows = this.liftingSpreadsheet.getSelectedRows();

      if (selectedRows.length === 0) return;

      const selectedIds = selectedRows.map(row => row.pID);

      for (const id of selectedIds) {
        this.ops.execute("hardhat.remove_lift", this.context, id);
      }
    });

    const exportBtn = UIComponents.operator("download");

    exportBtn.setTooltip("Export lifting schedule");

    exportBtn.onClick(() => this.ops.execute("hardhat.export_schedule", this.context));

    const exportTaskBtn = UIComponents.operator("task");

    exportTaskBtn.setTooltip("Export as task data (Gantt-compatible)");

    exportTaskBtn.onClick(() => this.ops.execute("hardhat.export_task_data", this.context));

    const importBtn = UIComponents.operator("upload");

    importBtn.setTooltip("Import lifting schedule");

    importBtn.onClick(() => this._handleImport());

    const scheduleViewBtn = UIComponents.operator("timeline");

    scheduleViewBtn.setTooltip("Open schedule views (Gantt, Hierarchy)");

    scheduleViewBtn.onClick(() => this.ops.execute("hardhat.toggle_schedule_view", this.context));

    const clearBtn = UIComponents.operator("delete_sweep");

    clearBtn.setTooltip("Clear all lifts");

    clearBtn.onClick(() => {
      if (confirm("Are you sure you want to clear all lifts?")) {
        this.ops.execute("hardhat.clear_schedule", this.context);
      }
    });

    const labelSpan = UIComponents.span("Lifts: " + this.store.lifts.length).addClass("hud-label");

    toolbarRow.add(deleteBtn, exportBtn, exportTaskBtn, importBtn, scheduleViewBtn, clearBtn, labelSpan);

    return toolbarRow;
  }

  _drawLiftingSpreadsheet(liftDataForGrid) {
    const rowCount = liftDataForGrid.length || 1;

    const calculatedHeight = 48 + (rowCount * 41) + 10;

    const liftingSpreadsheet = UIComponents.spreadsheet({
      data: liftDataForGrid,
      columnConfig: LIFT_COLUMN_CONFIG,
      columnOrder: LIFT_COLUMN_ORDER,
      columnNameMapper: {},
      height: `${calculatedHeight}px`,
      gridOptions: {
        rowSelection: 'multiple',
        rowMultiSelectWithClick: true,
        suppressRowClickSelection: false,
      }
    });

    liftingSpreadsheet.init();

    this.liftingSpreadsheet = liftingSpreadsheet;

    return liftingSpreadsheet;
  }

  _handleImport() {
    const input = document.createElement("input");

    input.type = "file";

    input.accept = ".json";

    input.onchange = async (e) => {
      const inputEl = /** @type {HTMLInputElement} */ (e.currentTarget);
      const file = inputEl?.files?.[0];

      if (!file) return;

      const text = await file.text();

      this.ops.execute("hardhat.import_schedule", this.context, text);
    };

    input.click();
  }

  _drawLiftingStatsSection(stats, craneOverviewStatics) {
    const statsSection = UIComponents.collapsibleSection({
      title: "Lifting stats",
      icon: "analytics",
      collapsed: true,
      maxHeight: "28vh",
      className: "HardHatLiftingDashboard-stats",
    });

    const overviewSection = this._drawLiftingOverviewSection(stats);

    const liftStats = this._drawLiftStatsGrid(craneOverviewStatics, overviewSection.craneUsageValueSpan);

    const statsContent = UIComponents.column().gap("0.75rem");

    statsContent.add(overviewSection.section, liftStats);

    statsSection.setContent(statsContent);

    return statsSection;
  }

  _drawCapacityProgressBarRow(stats, layoutOptions) {
    const showLeadingIcon = !layoutOptions || layoutOptions.showLeadingIcon !== false;

    const workingParams = this.store.workingParams;

    const currentHours =
      workingParams && workingParams.workingHours != null
        ? workingParams.workingHours
        : DEFAULT_WORKING_HOURS;

    const progressBarContainer = this._createCapacityProgressBar();

    const usageLabel = UIComponents.span("").addClass("hud-label").setStyles({ minWidth: "50px", textAlign: "right" });

    const { craneUsagePercent, remainingPercent } = computeDayCapacity(stats.totalTimeUsedSec, currentHours);

    this._updateCapacityProgressBar(progressBarContainer, craneUsagePercent, remainingPercent);

    usageLabel.dom.textContent = `${craneUsagePercent.toFixed(1)}%`;

    const barWrap = UIComponents.div().setStyles({ flex: "1", minWidth: "120px" }).add(progressBarContainer);

    if (showLeadingIcon) {
      const row = UIComponents.row().gap("0.5rem").addClass("centered-vertical").setStyles({
        padding: "0.5rem",
        backgroundColor: "var(--background-tertiary)",
        borderRadius: "var(--border-radius)",
      });

      row.add(
        UIComponents.icon("trending_up").addClass("lifting-overview-icon"),
        barWrap,
        usageLabel,
      );

      return row;
    }

    const row = UIComponents.row().gap("0.5rem").addClass("centered-vertical").setStyles({
      flex: "1 1 200px",
      minWidth: "160px",
    });

    row.add(barWrap, usageLabel);

    return row;
  }

  _drawLiftingOverviewSection(stats) {
    const craneUsageValueSpan = UIComponents.span("").addClass("hud-input");

    const craneState = this.store.crane;

    const currentSpeed = craneState && craneState.speed != null ? craneState.speed : DEFAULT_CRANE_SPEED;

    const craneSpeedInput = UIComponents.input();

    craneSpeedInput.setValue(String(currentSpeed));

    craneSpeedInput.setStyles({ width: "56px" });

    craneSpeedInput.addClass("hud-input");

    craneSpeedInput.onEnter(() => {
      const val = parseFloat(craneSpeedInput.getValue());

      if (!isNaN(val) && val > 0) {
        this.ops.execute("hardhat.update_crane_speed", this.context, val);
      }
    });

    const workingParamsOverview = this.store.workingParams;

    const currentHours =
      workingParamsOverview && workingParamsOverview.workingHours != null
        ? workingParamsOverview.workingHours
        : DEFAULT_WORKING_HOURS;

    const workingTimeInput = UIComponents.input();

    workingTimeInput.setValue(String(currentHours));

    workingTimeInput.setStyles({ width: "48px" });

    workingTimeInput.addClass("hud-input");

    workingTimeInput.onEnter(() => {
      const val = parseFloat(workingTimeInput.getValue());

      if (!isNaN(val) && val > 0) {
        this.ops.execute("hardhat.update_working_hours", this.context, val);
      }
    });

    const { craneUsagePercent } = computeDayCapacity(stats.totalTimeUsedSec, currentHours);

    craneUsageValueSpan.dom.textContent = `${craneUsagePercent.toFixed(1)}%`;

    const overviewSection = UIComponents.div().addClass("lifting-overview").setStyles({ width: "100%" });

    const overviewRow = UIComponents.row().gap("1rem").addClass("centered-vertical").setStyles({ width: "100%" });

    overviewRow.add(
      UIComponents.row().gap("0.5rem").addClass("centered-vertical").add(
        UIComponents.icon("speed").addClass("lifting-overview-icon"),
        UIComponents.span("Crane speed (m/min)").addClass("lifting-overview-label"),
        craneSpeedInput.addClass("lifting-overview-input"),
      ),
      UIComponents.row().gap("0.5rem").addClass("centered-vertical").add(
        UIComponents.icon("schedule").addClass("lifting-overview-icon"),
        UIComponents.span("Working time (h)").addClass("lifting-overview-label"),
        workingTimeInput.addClass("lifting-overview-input"),
      ),
    );

    overviewSection.add(overviewRow);

    return { section: overviewSection, craneUsageValueSpan };
  }

  _drawLiftStatsGrid(craneOverviewStatics, craneUsageValueSpan) {
    const liftStats = UIComponents.div().setStyles({
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: "0.25rem",
    });

    const craneUsageItem = UIComponents.div().gap("0.25rem").addClass("SquareOperator");

    craneUsageItem.add(
      UIComponents.icon("construction"),
      UIComponents.span("Crane Usage").addClass("hud-label"),
      craneUsageValueSpan,
    );

    liftStats.add(craneUsageItem);

    craneOverviewStatics.forEach((stat) => {
      const statItem = UIComponents.div().addClass("SquareOperator").gap("0.25rem");

      statItem.add(
        UIComponents.icon(stat.icon),
        UIComponents.span(stat.key).addClass("hud-label"),
        UIComponents.span(stat.value).addClass("hud-input"),
      );

      liftStats.add(statItem);
    });

    return liftStats;
  }

  _drawWeatherSection(weatherDisplayData) {
    const weatherDetails = UIComponents.collapsibleSection({
      title: "Weather",
      icon: "nest_farsight_weather",
      collapsed: true,
      maxHeight: "30vh",
    });

    const details = UIComponents.list();

    weatherDetails.setContent(details);

    weatherDisplayData.forEach((data) => {
      const item = UIComponents.listItem();

      item.add(
        UIComponents.icon(data.icon),
        UIComponents.span(data.label).addClass("hud-label"),
        UIComponents.span(data.value).addClass("hud-input"),
      );

      details.add(item);
    });

    return weatherDetails;
  }

  _drawLocationSection(locationDisplayData) {
    const locationSection = UIComponents.collapsibleSection({
      title: "Location",
      icon: "location_on",
      collapsed: false,
      maxHeight: "30vh",
    });

    const locationDetails = UIComponents.row().gap("0.5rem");

    locationSection.setContent(locationDetails);

    const { section: latSection } = this._createHudInputSection("Latitude", locationDisplayData.lat ?? "");

    const { section: lonSection } = this._createHudInputSection("Longitude", locationDisplayData.lon ?? "", { width: "100px" });

    const openLink = UIComponents.operator("nest_farsight_weather");

    openLink.onClick(() => {
      if (locationDisplayData.lat != null && locationDisplayData.lon != null) {
        this.ops.execute("navigation.open_map_link", this.context, locationDisplayData.lat, locationDisplayData.lon);
      }
    });

    locationDetails.add(lonSection, this._createHudDivider(), latSection, openLink);

    return locationSection;
  }

  _createHudInputSection(labelText, defaultValue, options = {}) {
    const { width = "140px", placeholder = "" } = options;

    const section = UIComponents.column().gap("0.25rem");

    const label = UIComponents.span(labelText).addClass("hud-label");

    const input = UIComponents.input();

    input.setValue(defaultValue);

    input.addClass("hud-input");

    input.setStyles({ width });

    if (placeholder) input.dom.placeholder = placeholder;

    section.add(label, input);

    return { section, input };
  }

  _createHudDivider() {
    return UIComponents.div().addClass("hud-divider");
  }

  // ─────────────────────────────────────────────────────────────
  // EQUIPMENT SCHEDULE SECTION (Tabbed panel with date filter)
  // ─────────────────────────────────────────────────────────────

  _drawEquipmentScheduleSection(data) {
    const section = UIComponents.collapsibleSection({
      title: "Lifting schedule",
      icon: "precision_manufacturing",
      collapsed: false,
      className: "HardHatLiftingDashboard-schedule",
    });

    const content = UIComponents.column()
      .addClass("HardHatLiftingDashboard-scheduleInner")
      .setStyles({
        width: "100%",
        flex: "1",
        minHeight: "0",
        gap: "0.5rem",
      });

    const dashboardCard = UIComponents.div()
      .addClass("HardHatLiftingDashboard-card")
      .setStyles({
        width: "100%",
        flex: "1",
        minHeight: "0",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        boxSizing: "border-box",
      });

    const topRow = this._drawScheduleDashboardTopRow(data);

    const filterToolbar = this._drawDateFilterToolbar();

    const tabbedPanel = this._drawEquipmentTabbedPanel(data);

    const addButtonRow = this._drawAddLiftRow();

    dashboardCard.add(topRow, filterToolbar, tabbedPanel, addButtonRow);

    content.add(dashboardCard);

    section.setContent(content);

    return section;
  }

  _drawScheduleDashboardTopRow(data) {
    const row = UIComponents.row()
      .addClass("HardHatLiftingDashboard-topRow")
      .addClass("centered-vertical")
      .setStyles({
        width: "100%",
        flexWrap: "wrap",
        gap: "0.5rem 0.75rem",
        alignItems: "center",
      });

    const capacityBlock = this._drawCapacityProgressBarRow(data.stats, { showLeadingIcon: false });

    const actionsToolbar = this._drawScheduleActionsToolbar();

    const totalLiftCount = this.store.lifts.length;

    const meta = UIComponents.span(`Total lifts ${totalLiftCount}`)
      .addClass("hud-label")
      .addClass("HardHatLiftingDashboard-meta");

    row.add(capacityBlock, actionsToolbar, meta);

    return row;
  }

  _drawScheduleActionsToolbar() {
    const toolbar = UIComponents.row().gap("0.35rem").addClass("centered-vertical").addClass("HardHatLiftingDashboard-actions");

    const deleteBtn = UIComponents.operator("delete");

    deleteBtn.setTooltip("Delete selected lift(s)");

    deleteBtn.onClick(() => {
      if (!this.activeSpreadsheet) return;

      const selectedRows = this.activeSpreadsheet.getSelectedRows();

      if (selectedRows.length === 0) return;

      // Use pID directly from the selected rows (now included in grid data)
      selectedRows.forEach((row) => {
        if (row.pID) {
          this.ops.execute("hardhat.remove_lift", this.context, row.pID);
        }
      });
    });

    const exportBtn = UIComponents.operator("download");

    exportBtn.setTooltip("Export lifting schedule");

    exportBtn.onClick(() => this.ops.execute("hardhat.export_schedule", this.context));

    const exportTaskBtn = UIComponents.operator("task");

    exportTaskBtn.setTooltip("Export as task data (Gantt-compatible)");

    exportTaskBtn.onClick(() => this.ops.execute("hardhat.export_task_data", this.context));

    const importBtn = UIComponents.operator("upload");

    importBtn.setTooltip("Import lifting schedule");

    importBtn.onClick(() => this._handleImport());

    const scheduleViewBtn = UIComponents.operator("timeline");

    scheduleViewBtn.setTooltip("Open schedule views (Gantt, Hierarchy)");

    scheduleViewBtn.onClick(() => this.ops.execute("hardhat.toggle_schedule_view", this.context));

    const clearBtn = UIComponents.operator("delete_sweep");

    clearBtn.setTooltip("Clear all lifts");

    clearBtn.onClick(() => {
      if (confirm("Are you sure you want to clear all lifts?")) {
        this.ops.execute("hardhat.clear_schedule", this.context);
      }
    });

    toolbar.add(deleteBtn, exportBtn, exportTaskBtn, importBtn, scheduleViewBtn, clearBtn);

    return toolbar;
  }

  _drawDateFilterToolbar() {
    const toolbar = UIComponents.row()
      .gap("0.5rem")
      .addClass("centered-vertical")
      .addClass("HardHatLiftingDashboard-filterRow")
      .setStyles({
        width: "100%",
        flexWrap: "wrap",
      });

    const dateLabel = UIComponents.span("Date").addClass("hud-label");

    // Get unique dates from all lifts
    const allLifts = this.store.lifts;

    const uniqueDates = hardHatStore.getUniqueLiftDates(allLifts);

    const todayStr = hardHatStore.getTodayDateStr();

    // Build options with formatted display
    const dateOptions = { ALL: "All Dates" };

    uniqueDates.forEach((dateStr) => {
      const isToday = dateStr === todayStr;

      dateOptions[dateStr] = hardHatStore.formatDateForDisplay(dateStr) + (isToday ? " (Today)" : "");
    });

    // Date select dropdown
    const dateSelect = UIComponents.select();

    dateSelect.setOptions(dateOptions);

    dateSelect.setValue(this.selectedDateStr);

    dateSelect.setStyles({ minWidth: "180px" });

    dateSelect.dom.addEventListener("change", (e) => {
      // Use operator to set the date filter
      this.ops.execute("hardhat.set_active_date", this.context, e.target.value);
    });

    // Today shortcut button
    const todayBtn = UIComponents.operator("today");

    todayBtn.setTooltip("Show today's lifts only");

    todayBtn.onClick(() => {
      this.ops.execute("hardhat.set_active_date", this.context, todayStr);
    });

    // Show all button
    const allBtn = UIComponents.operator("calendar_month");

    allBtn.setTooltip("Show all dates");

    allBtn.onClick(() => {
      this.ops.execute("hardhat.set_active_date", this.context, "ALL");
    });

    // Refresh button
    const refreshBtn = UIComponents.operator("refresh");

    refreshBtn.setTooltip("Refresh schedule");

    refreshBtn.onClick(() => {
      this._redraw();
    });

    // Count display based on current filter
    const activeLifts = hardHatStore.getActiveLifts(this.store);

    const countLabel = UIComponents.span(`${activeLifts.length} shown`)
      .addClass("hud-input")
      .addClass("HardHatLiftingDashboard-filterCount");

    toolbar.add(dateLabel, dateSelect, todayBtn, allBtn, refreshBtn, countLabel);

    return toolbar;
  }

  _drawEquipmentTabbedPanel(data) {
    const container = UIComponents.div()
      .addClass("HardHatLiftingDashboard-tabbedHost")
      .setStyles({
        width: "100%",
        flex: "1",
        minHeight: "0",
      });

    const tabbedPanel = UIComponents.tabbedPanel();

    tabbedPanel.addClass("HardHatLiftingDashboard-tabbedPanel");

    tabbedPanel.setStyles({ width: "100%", flex: "1", minHeight: "0" });

    // Get equipment list
    const equipmentList = hardHatStore.LIFTING_EQUIPMENT_LIST;

    const allLifts = this.store.lifts;

    const filteredAllLifts = hardHatStore.filterLiftsByDate(allLifts, this.selectedDateStr);

    // Add "All Equipment" tab first
    const allContent = this._createEquipmentTabContent("ALL", filteredAllLifts, data);

    const allCount = filteredAllLifts.length;

    tabbedPanel.addTab("ALL", `All Equipment (${allCount})`, allContent);

    // Add tab for each equipment type
    equipmentList.forEach((equipment) => {
      const equipmentLifts = hardHatStore.filterLifts(allLifts, equipment.id, this.selectedDateStr);

      const tabContent = this._createEquipmentTabContent(equipment.id, equipmentLifts, data);

      const count = equipmentLifts.length;

      tabbedPanel.addTab(equipment.id, `${equipment.name} (${count})`, tabContent);
    });

    // Select the appropriate tab
    tabbedPanel.select(this.selectedEquipmentId);

    // Listen for tab changes - use operator to set active equipment
    tabbedPanel.dom.addEventListener("click", (e) => {
      const tab = e.target.closest(".Tab");

      if (tab && tab.id !== this.selectedEquipmentId) {
        // Use operator to change active equipment
        this.ops.execute("hardhat.set_active_equipment", this.context, tab.id);
      }
    });

    container.add(tabbedPanel);

    return container;
  }

  _createEquipmentTabContent(equipmentId, lifts, data) {
    const content = UIComponents.div()
      .addClass("HardHatLiftingDashboard-tabPanel")
      .setStyles({
        padding: "0.25rem 0 0 0",
        width: "100%",
        height: "100%",
        flex: "1",
        minHeight: "0",
        display: "flex",
        flexDirection: "column",
        gap: "0.35rem",
        boxSizing: "border-box",
      });

    if (lifts.length === 0) {
      const emptyMsg = UIComponents.div().setStyles({
        padding: "2rem",
        textAlign: "center",
        color: "var(--text-secondary)",
      });

      emptyMsg.add(
        UIComponents.icon("inbox").setStyles({ fontSize: "2rem", marginBottom: "0.5rem" }),
        UIComponents.paragraph("No lifts scheduled for this equipment/date combination.")
      );

      content.add(emptyMsg);

      return content;
    }

    // Equipment info header (for specific equipment tabs)
    if (equipmentId !== "ALL") {
      const equipmentInfo = hardHatStore.LIFTING_EQUIPMENT[equipmentId];

      if (equipmentInfo) {
        const header = UIComponents.row()
          .gap("0.5rem")
          .addClass("centered-vertical")
          .addClass("HardHatLiftingDashboard-equipmentLine")
          .setStyles({
          flexWrap: "wrap",
        });

        header.add(
          UIComponents.icon(equipmentInfo.icon).setStyles({ color: equipmentInfo.color }),
          UIComponents.span(equipmentInfo.name).addClass("hud-label"),
          UIComponents.span(`${equipmentInfo.type} · ${equipmentInfo.maxCapacity}t · ${equipmentInfo.speed} m/min`).addClass(
            "hud-input"
          )
        );

        content.add(header);
      }
    }

    const stats = this._computeEquipmentStats(lifts);

    const statsRow = this._drawCompactEquipmentStatsRow(stats);

    content.add(statsRow);

    const enrichedLifts = [...lifts];

    const craneForSpeed = this.store.crane;

    const craneSpeed = craneForSpeed && craneForSpeed.speed != null ? craneForSpeed.speed : DEFAULT_CRANE_SPEED;

    enrichLiftsWithEstimates(enrichedLifts, craneSpeed);

    const gridData = buildLiftDataForGrid(enrichedLifts);

    const spreadsheetShell = UIComponents.div().addClass("hardhat-spreadsheet-shell");

    const spreadsheet = UIComponents.spreadsheet({
      data: gridData,
      columnConfig: LIFT_COLUMN_CONFIG,
      columnOrder: LIFT_COLUMN_ORDER,
      height: "100%",
      minHeight: "240px",
      gridOptions: {
        rowSelection: "multiple",
        rowMultiSelectWithClick: true,
      },
    });

    spreadsheet.init();

    if (equipmentId === this.selectedEquipmentId) {
      this.activeSpreadsheet = spreadsheet;
    }

    spreadsheetShell.add(spreadsheet);

    content.add(spreadsheetShell);

    return content;
  }

  _drawCompactEquipmentStatsRow(stats) {
    const row = UIComponents.row()
      .addClass("HardHatLiftingDashboard-kpiRow")
      .addClass("centered-vertical")
      .setStyles({
        width: "100%",
        flexWrap: "wrap",
        gap: "0.35rem 0.75rem",
      });

    const segments = [
      { label: "Done", value: String(stats.completed), color: "#22c55e" },
      { label: "Active", value: String(stats.started), color: "#f59e0b" },
      { label: "Pending", value: String(stats.notStarted), color: "#9ca3af" },
      { label: "Weight", value: `${stats.totalWeight.toFixed(1)} t`, color: "#60a5fa" },
    ];

    segments.forEach((segment, index) => {
      if (index > 0) {
        row.add(UIComponents.span("·").addClass("HardHatLiftingDashboard-kpiSep"));
      }

      const chunk = UIComponents.row().gap("0.25rem").addClass("centered-vertical");

      chunk.add(
        UIComponents.span(segment.label).addClass("hud-label"),
        UIComponents.span(segment.value).setStyles({ fontWeight: "600", color: segment.color })
      );

      row.add(chunk);
    });

    return row;
  }

  _computeEquipmentStats(lifts) {
    return {
      total: lifts.length,
      completed: lifts.filter(l => l.status === "FINISHED").length,
      started: lifts.filter(l => l.status === "STARTED").length,
      notStarted: lifts.filter(l => l.status === "NOTSTARTED").length,
      onHold: lifts.filter(l => l.status === "ONHOLD").length,
      totalWeight: lifts.reduce((sum, l) => sum + (l.pWeight || 0), 0),
    };
  }

  _createCapacityProgressBar() {
    const container = UIComponents.div().setStyles({
      position: "relative",
      flex: "1",
      height: "24px",
      backgroundColor: "var(--background-tertiary, #de994a)",
      borderRadius: "4px",
      overflow: "hidden",
      border: "1px solid var(--border-color, #333)",
    });

    const fill = UIComponents.div().setStyles({
      position: "absolute",
      left: "0",
      top: "0",
      height: "100%",
      width: "0%",
      backgroundColor: "var(--accent-color, #4ade80)",
      transition: "width 0.3s ease",
    });

    fill.dom.dataset.role = "fill";

    const leftLabel = UIComponents.badge("").setStyles({
      position: "absolute",
      top: "50%",
      transform: "translateY(-50%)",
      left: "8px",
      zIndex: "2",
      backgroundColor: "#4ade80",
      color: "#000000",
    });

    leftLabel.dom.dataset.role = "leftLabel";

    const rightLabel = UIComponents.badge("").setStyles({
      position: "absolute",
      top: "50%",
      transform: "translateY(-50%)",
      right: "var(--phi-0-5)",
      zIndex: "2",
      backgroundColor: "#de994a",
      borderRadius: "12px",
      color: "#000000",
    });

    rightLabel.dom.dataset.role = "rightLabel";

    container.add(fill, leftLabel, rightLabel);

    return container;
  }

  _updateCapacityProgressBar(container, usagePercent, remainingPercent) {
    const fill = container.dom.querySelector('[data-role="fill"]');

    const leftLabel = container.dom.querySelector('[data-role="leftLabel"]');

    const rightLabel = container.dom.querySelector('[data-role="rightLabel"]');

    if (fill) {
      fill.style.width = `${Math.min(100, usagePercent)}%`;

      if (usagePercent > 80) {
        fill.style.backgroundColor = "var(--error-color, #ef4444)";
      } else if (usagePercent > 60) {
        fill.style.backgroundColor = "var(--warning-color, #f59e0b)";
      } else {
        fill.style.backgroundColor = "var(--accent-color, #4ade80)";
      }
    }

    if (leftLabel) {
      leftLabel.textContent = `${usagePercent.toFixed(0)}% used`;
    }

    if (rightLabel) {
      rightLabel.textContent = `${remainingPercent.toFixed(0)}% remaining`;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SCHEDULE VIEW PANEL (Multiple Views: Gantt, Spreadsheet, Hierarchy)
  // ─────────────────────────────────────────────────────────────

  _toggleScheduleViewPanel() {
    if (!this.scheduleViewPanel) {
      this._createScheduleViewPanel();
    }

    const isVisible = this.scheduleViewPanel.dom.style.display !== "none";
    
    if (isVisible) {
      this.scheduleViewPanel.dom.style.display = "none";
    } else {
      this.scheduleViewPanel.dom.style.display = "flex";

      this._updateScheduleViewContent();
    }
  }

  _createScheduleViewPanel() {
    const panelStyles = {
      width: "50vw",
      height: "calc(100vh - var(--headerbar-height) - var(--phi-2))",
      top: "var(--headerbar-height)",
      right: "var(--phi-1)",
    };

    this.scheduleViewPanel = UIComponents.floatingPanel();

    this.scheduleViewPanel.setIcon("timeline");

    this.scheduleViewPanel.setStyles(panelStyles);

    this.scheduleViewPanel.setTitle("Lifting Schedule Views");

    // View selector
    const viewSelector = UIComponents.select();

    viewSelector.setOptions(VIEW_TYPES);

    viewSelector.setValue(this.currentViewType);

    viewSelector.dom.addEventListener("change", (e) => {
      this.currentViewType = e.target.value;

      this._updateScheduleViewContent();
    });

    this.viewSelectorRow = UIComponents.row().gap("var(--phi-0-5)");

    this.viewSelectorRow.add(
      UIComponents.span("View: ").addClass("hud-label"),
      viewSelector
    );

    this.context.dom.appendChild(this.scheduleViewPanel.dom);
  }

  _updateScheduleViewContent() {
    if (!this.scheduleViewPanel) return;

    // Prepare task data
    const lifts = [...this.store.lifts];

    const craneForPanel = this.store.crane;

    const craneSpeed = craneForPanel && craneForPanel.speed != null ? craneForPanel.speed : DEFAULT_CRANE_SPEED;

    enrichLiftsWithEstimates(lifts, craneSpeed);

    const taskData = liftsToTaskFormat(lifts);

    let viewElement = null;

    switch (this.currentViewType) {
      case "gantt":
        viewElement = this._renderGanttView(taskData);

        break;

      case "hierarchy":
        viewElement = this._renderHierarchyView(taskData);

        break;

      case "spreadsheet":

      default:
        viewElement = this._renderSpreadsheetView(taskData);

        break;
    }

    const wrapper = UIComponents.column()
      .setStyle("gap", ["var(--phi-0-5)"])
      .addClass("fill-height")
      .setStyle("flex", ["1"])
      .setStyle("min-height", ["0"])
      .setStyle("padding", ["var(--phi-0-5)"]);

    wrapper.add(this.viewSelectorRow);

    if (viewElement) {
      const contentArea = UIComponents.div()
        .addClass("fill-height")
        .setStyle("flex", ["1"])
        .setStyle("min-height", ["0"])
        .setStyle("display", ["flex"])
        .setStyle("flex-direction", ["column"])
        .setStyle("overflow", ["auto"]);

      contentArea.add(viewElement);

      wrapper.add(contentArea);
    }

    this.scheduleViewPanel.setContent(wrapper);
  }

  _renderGanttView(taskData) {
    const container = UIComponents.gantt(this.context, taskData, {
      operators: this.ops,
    });

    return container;
  }

  _renderSpreadsheetView(taskData) {
    const container = UIComponents.div().addClass("fill-width").addClass("fill-height");

    const columnConfig = {
      pID: { headerName: "ID", width: 80 },
      pName: { headerName: "Lift Name", width: 200 },
      pRes: { headerName: "Subcontractor", width: 150 },
      pStart: { headerName: "Start", width: 150 },
      pEnd: { headerName: "End", width: 150 },
      ifcduration: { headerName: "Duration", width: 100 },
      status: { headerName: "Status", width: 100 },
      pDepend: { headerName: "Dependencies", width: 120 },
      pCost: { headerName: "Weight (T)", width: 100 },
    };

    const spreadsheet = UIComponents.spreadsheet({
      data: taskData,
      columnConfig,
      columnNameMapper: {},
    });

    spreadsheet.init();

    container.add(spreadsheet);

    return container;
  }

  _renderHierarchyView(taskData) {
    const container = UIComponents.div()
      .setStyle("padding", ["var(--phi-0-5)"])
      .setStyle("overflow", ["auto"]);

    if (taskData.length === 0) {
      container.add(UIComponents.text("No lifts to display"));

      return container;
    }

    // Build hierarchy tree (flat list for lifts, but structure is ready for nesting)
    const list = UIComponents.list();

    list.setStyle("gap", ["var(--phi-0-5)"]);

    taskData.forEach((task, index) => {
      const item = UIComponents.listItem();

      item.setStyle("display", ["flex"]);

      item.setStyle("align-items", ["center"]);

      item.setStyle("gap", ["var(--phi-0-5)"]);

      item.setStyle("padding", ["var(--phi-0-5)"]);

      item.setStyle("border-radius", ["4px"]);

      item.setStyle("background", ["var(--background-secondary)"]);

      const statusIcon = task.status === "FINISHED" ? "check_circle" : 
                         task.status === "STARTED" ? "play_circle" : 
                         task.status === "ONHOLD" ? "pause_circle" : "radio_button_unchecked";

      const statusColor = task.status === "FINISHED" ? "var(--success-color)" : 
                          task.status === "STARTED" ? "var(--accent-color)" : 
                          task.status === "ONHOLD" ? "var(--warning-color)" : "var(--text-secondary)";

      item.add(
        UIComponents.span(`${index + 1}.`).addClass("hud-label").setStyle("min-width", ["24px"]),
        UIComponents.icon(statusIcon).setStyle("color", [statusColor]),
        UIComponents.column().gap("2px").add(
          UIComponents.span(task.pName).addClass("hud-input"),
          UIComponents.row().gap("var(--phi-0-5)").add(
            UIComponents.smallText(task.pRes).setStyle("color", ["var(--text-secondary)"]),
            UIComponents.smallText("•").setStyle("color", ["var(--text-secondary)"]),
            UIComponents.smallText(task.ifcduration).setStyle("color", ["var(--text-secondary)"]),
          ),
        ),
      );

      list.add(item);
    });

    container.add(list);

    return container;
  }

  drawDevUI(context) {
    const toolbar = UIComponents.column().setId("DevelopperTesting")
    .setStyles({
      position: "absolute",
      zIndex: "2",
      top: "calc( 3 * var(--phi-1))",
      left: "var(--phi-1)",
    })

    const button = UIComponents.operator("home");

    button.onClick(() => window.location.reload());

    toolbar.add(button);

    const capturePosition = UIComponents.operator("camera");

    toolbar.add(capturePosition);

    capturePosition.onClick(() => console.log(tools.world.viewpoint.capturePosition(context.editor)));

    context.viewport.dom.appendChild(toolbar.dom);
  }
}

class HardHatEnvironmentUI {
  constructor({ context, operators }) {
    this.context = context;
    this.ops = operators;
    this.store = hardHatStore.loadStore();

    const panelStyles = {
      boxSizing: "border-box",
      width: "100%",
      height: "100%",
      maxHeight: "100%",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      position: "relative",
      parentId: "AddonHardHatEnvironment",
    };

    const panel = UIComponents.div().addClass("Panel").setStyles(panelStyles);
    const content = UIComponents.div().addClass("PanelContent").setStyles({ flex: "1", overflowY: "auto", minHeight: "0" });
    panel.add(content);
    this.content = { panel, content };

    const window = UIComponents.floatingPanel({
      context,
      title: "Weather",
      icon: "weather_snowy",
      workspaceTabId: "addon.hardhat.schedule",
      workspaceTabLabel: "Weather",
      startMinimized: true,
    });
    
    window.setContent(panel);

    this.draw(context)

  }

  draw(context) {
    this._listen(context);
    this._redraw();
  }

  _listen(context) {
    context.signals.hardHatStoreChanged.add(({ store }) => {
      this.store = store;
      this._redraw();
    });

    context.signals.weatherChanged.add(({ weather }) => {
      if (weather) {
        hardHatStore.updateWeather(this.store, weather);
      }
      this._redraw();
    });
  }

  _redraw() {
    const { weatherDisplayData, locationDisplayData } = this._prepareDrawData();
    const weatherSection = this._drawWeatherSection(weatherDisplayData);
    const locationSection = this._drawLocationSection(locationDisplayData);

    this.content.content.clear();
    this.content.content.add(weatherSection, locationSection);
  }

  _prepareDrawData() {
    const weather = this.store.weather;
    const weatherDisplayData = getWeatherDisplayData(weather);
    const locationDisplayData = getLocationDisplayData(weather);
    return { weatherDisplayData, locationDisplayData };
  }

  _drawWeatherSection(weatherDisplayData) {
    const weatherDetails = UIComponents.collapsibleSection({
      title: "Current weather",
      icon: "nest_farsight_weather",
      collapsed: false,
      maxHeight: "50vh",
    });

    const details = UIComponents.row().gap("0.5rem");

    weatherDetails.setContent(details);

    weatherDisplayData.forEach((data) => {
      const { section } = this._createHudInputSection(data.label, data.value);
      details.add(section, this._createHudDivider());
    });

    if (details.dom.lastChild && details.dom.lastChild.classList?.contains("hud-divider")) {
      details.dom.lastChild.remove();
    }

    return weatherDetails;
  }

  _drawLocationSection(locationDisplayData) {
    const locationSection = UIComponents.collapsibleSection({
      title: "Location",
      icon: "location_on",
      collapsed: false,
      maxHeight: "50vh",
    });

    const locationDetails = UIComponents.row().gap("0.5rem");

    locationSection.setContent(locationDetails);

    const { section: latSection } = this._createHudInputSection("Latitude", locationDisplayData.lat ?? "");
    const { section: lonSection } = this._createHudInputSection("Longitude", locationDisplayData.lon ?? "", { width: "100px" });

    const openLink = UIComponents.operator("nest_farsight_weather");

    openLink.onClick(() => {
      if (locationDisplayData.lat != null && locationDisplayData.lon != null) {
        this.ops.execute("navigation.open_map_link", this.context, locationDisplayData.lat, locationDisplayData.lon);
      }
    });

    locationDetails.add(lonSection, this._createHudDivider(), latSection, openLink);

    return locationSection;
  }

  _createHudInputSection(labelText, defaultValue, options = {}) {
    const { width = "140px", placeholder = "" } = options;

    const section = UIComponents.column().gap("0.25rem");
    const label = UIComponents.span(labelText).addClass("hud-label");
    const input = UIComponents.input();

    input.setValue(defaultValue);
    input.addClass("hud-input");
    input.setStyles({ width });

    if (placeholder) input.dom.placeholder = placeholder;

    section.add(label, input);

    return { section, input };
  }

  _createHudDivider() {
    return UIComponents.div().addClass("hud-divider");
  }
}

export default [AppointedPersonUI, HardHatEnvironmentUI];
