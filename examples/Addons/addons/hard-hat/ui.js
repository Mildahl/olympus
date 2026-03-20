import { UIComponents, moduleRegistry } from "aeco";
import { tools } from "aeco";

import * as Core from "./core.js";

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

    this.store = Core.loadStore();

    this.liftingSpreadsheet = null;

    this.scheduleViewPanel = null;

    this.currentViewType = "spreadsheet";

    // Equipment schedule state
    this.selectedEquipmentId = "ALL";

    this.selectedDateStr = "ALL"; // Default to show seeded demo data

    this.equipmentSpreadsheets = {}; // Cache spreadsheets per equipment tab

    const panelStyles = {
      boxSizing: "border-box",
      width: "100%",
      height: "100%",
      maxHeight: "100%",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      position: "relative",
      parentId: "AddonHardHatSchedule",
    };

    const panel = UIComponents.div()
      .addClass("Panel")
      .setStyles(panelStyles);

    const content = UIComponents.div()
      .addClass("PanelContent")
      .setStyles({ flex: "1", overflowY: "auto", minHeight: "0" });

    panel.add(content);

    this.content = { panel, content };

    context.layoutManager.ensureTab("bottom", "addon.hardhat.schedule", "Lifting Schedule", panel, {
      open: false,
      replace: false,
    });

    this._unbindToggle = context.layoutManager?.bindToggle("AddonHardHatSchedule", "bottom", "addon.hardhat.schedule") || null;

    this.firstDisplay = true;

    this.drawDevUI(context);

    this.listen(context);

    // Populate panel content on first open (refactoring: _redraw was only called from signals)
    this._redraw();
  }

  destroy() {
    if (this._unbindToggle) this._unbindToggle();
    this.context?.layoutManager?.removeTab("bottom", "addon.hardhat.schedule");
  }

  listen(context) {
    // Signals are registered in app.js before createUI
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
        Core.updateWeather(this.store, weather);
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

    const equipmentScheduleSection = this._drawEquipmentScheduleSection(data);

    const statsSection = this._drawLiftingStatsSection(data.stats, data.craneOverviewStatics);

    this.content.content.clear();

    this.content.content.add(equipmentScheduleSection, statsSection);
  }

  _prepareDrawData() {
    // Sync UI state from store
    this.selectedEquipmentId = Core.getActiveEquipment(this.store);

    this.selectedDateStr = Core.getActiveDateFilter(this.store);

    // Get filtered lifts based on active equipment and date
    const activeLifts = Core.getActiveLifts(this.store);

    const allLifts = [...this.store.lifts];

    const craneSpeed = this.store.crane?.speed || DEFAULT_CRANE_SPEED;

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
      icon: "precision_manufacturing",
      collapsed: false,
      maxHeight: "50vh",
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
        subcontractor: Core.DEFAULT_SUBCONTRACTORS[0],
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
      title: "Lifting Stats",
      icon: "analytics",
      collapsed: false,
      maxHeight: "30vh",
    });

    const overviewSection = this._drawLiftingOverviewSection(stats);

    const liftStats = this._drawLiftStatsGrid(craneOverviewStatics, overviewSection.craneUsageValueSpan);

    const statsContent = UIComponents.column().gap("0.75rem");

    statsContent.add(overviewSection.section, liftStats);

    statsSection.setContent(statsContent);

    return statsSection;
  }

  _drawCapacityProgressBarRow(stats) {
    const row = UIComponents.row().gap("0.5rem").addClass("centered-vertical").setStyles({
      padding: "0.5rem",
      backgroundColor: "var(--background-tertiary)",
      borderRadius: "var(--border-radius)",
    });

    const currentHours = this.store.workingParams?.workingHours || DEFAULT_WORKING_HOURS;

    const progressBarContainer = this._createCapacityProgressBar();

    const usageLabel = UIComponents.span("").addClass("hud-label").setStyles({ minWidth: "50px", textAlign: "right" });

    const { craneUsagePercent, remainingPercent } = computeDayCapacity(stats.totalTimeUsedSec, currentHours);

    this._updateCapacityProgressBar(progressBarContainer, craneUsagePercent, remainingPercent);

    usageLabel.dom.textContent = `${craneUsagePercent.toFixed(1)}%`;

    row.add(
      UIComponents.icon("trending_up").addClass("lifting-overview-icon"),
      UIComponents.div().setStyles({ flex: "1" }).add(progressBarContainer),
      usageLabel,
    );

    return row;
  }

  _drawLiftingOverviewSection(stats) {
    const craneUsageValueSpan = UIComponents.span("").addClass("hud-input");

    const currentSpeed = this.store.crane?.speed || DEFAULT_CRANE_SPEED;

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

    const currentHours = this.store.workingParams?.workingHours || DEFAULT_WORKING_HOURS;

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
        this.ops.execute("addon.navigation.open_map_link", this.context, locationDisplayData.lat, locationDisplayData.lon);
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
      title: "Lifting Schedule",
      icon: "precision_manufacturing",
      collapsed: false,
      maxHeight: "60vh",
    });

    const content = UIComponents.column().gap("0.75rem").setStyles({ width: "100%" });

    // Capacity progress bar row
    const progressBarRow = this._drawCapacityProgressBarRow(data.stats);

    // Actions toolbar (add, delete, export, import, etc.)
    const actionsToolbar = this._drawScheduleActionsToolbar();

    // Date filter toolbar
    const filterToolbar = this._drawDateFilterToolbar();

    // Equipment tabbed panel
    const tabbedPanel = this._drawEquipmentTabbedPanel(data);

    // Add lift button row
    const addButtonRow = this._drawAddLiftRow();

    content.add(progressBarRow, actionsToolbar, filterToolbar, tabbedPanel, addButtonRow);

    section.setContent(content);

    return section;
  }

  _drawScheduleActionsToolbar() {
    const toolbar = UIComponents.row().gap("0.5rem").addClass("centered-vertical").setStyles({
      padding: "0.5rem",
      backgroundColor: "var(--background-tertiary)",
      borderRadius: "var(--border-radius)",
      marginBottom: "0.5rem",
    });

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

    const labelSpan = UIComponents.span("Total Lifts: " + this.store.lifts.length).addClass("hud-label");

    toolbar.add(deleteBtn, exportBtn, exportTaskBtn, importBtn, scheduleViewBtn, clearBtn, labelSpan);

    return toolbar;
  }

  _drawDateFilterToolbar() {
    const toolbar = UIComponents.row().gap("0.75rem").addClass("centered-vertical").setStyles({
      padding: "0.5rem",
      backgroundColor: "var(--background-secondary)",
      borderRadius: "var(--border-radius)",
      marginBottom: "0.5rem",
    });

    // Date filter label
    const dateLabel = UIComponents.span("Filter by date:").addClass("hud-label");

    // Get unique dates from all lifts
    const allLifts = this.store.lifts;

    const uniqueDates = Core.getUniqueLiftDates(allLifts);

    const todayStr = Core.getTodayDateStr();

    // Build options with formatted display
    const dateOptions = { ALL: "All Dates" };

    uniqueDates.forEach((dateStr) => {
      const isToday = dateStr === todayStr;

      dateOptions[dateStr] = Core.formatDateForDisplay(dateStr) + (isToday ? " (Today)" : "");
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
    const activeLifts = Core.getActiveLifts(this.store);

    const countLabel = UIComponents.span(`${activeLifts.length} lift(s) shown`).addClass("hud-input").setStyles({
      marginLeft: "auto",
    });

    toolbar.add(dateLabel, dateSelect, todayBtn, allBtn, refreshBtn, countLabel);

    return toolbar;
  }

  _drawEquipmentTabbedPanel(data) {
    const container = UIComponents.div().setStyles({
      width: "100%",
      minHeight: "200px",
    });

    // Create tabbed panel
    const tabbedPanel = UIComponents.tabbedPanel();

    tabbedPanel.setStyles({ width: "100%" });

    // Get equipment list
    const equipmentList = Core.LIFTING_EQUIPMENT_LIST;

    const allLifts = this.store.lifts;

    const filteredAllLifts = Core.filterLiftsByDate(allLifts, this.selectedDateStr);

    // Add "All Equipment" tab first
    const allContent = this._createEquipmentTabContent("ALL", filteredAllLifts, data);

    const allCount = filteredAllLifts.length;

    tabbedPanel.addTab("ALL", `All Equipment (${allCount})`, allContent);

    // Add tab for each equipment type
    equipmentList.forEach((equipment) => {
      const equipmentLifts = Core.filterLifts(allLifts, equipment.id, this.selectedDateStr);

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
    const content = UIComponents.div().setStyles({
      padding: "0.5rem",
      width: "100%",
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
      const equipmentInfo = Core.LIFTING_EQUIPMENT[equipmentId];

      if (equipmentInfo) {
        const header = UIComponents.row().gap("0.5rem").addClass("centered-vertical").setStyles({
          padding: "0.5rem",
          marginBottom: "0.5rem",
          backgroundColor: "var(--background-tertiary)",
          borderRadius: "var(--border-radius)",
          borderLeft: `4px solid ${equipmentInfo.color}`,
        });

        header.add(
          UIComponents.icon(equipmentInfo.icon).setStyles({ color: equipmentInfo.color }),
          UIComponents.span(equipmentInfo.name).addClass("hud-label"),
          UIComponents.span(`Type: ${equipmentInfo.type}`).addClass("hud-input"),
          UIComponents.span(`Max Capacity: ${equipmentInfo.maxCapacity}t`).addClass("hud-input"),
          UIComponents.span(`Speed: ${equipmentInfo.speed} m/min`).addClass("hud-input")
        );

        content.add(header);
      }
    }

    // Stats summary for this equipment/date
    const stats = this._computeEquipmentStats(lifts);

    const statsRow = UIComponents.row().gap("1rem").setStyles({
      padding: "0.5rem",
      marginBottom: "0.5rem",
    });

    statsRow.add(
      this._createStatBadge("Completed", stats.completed, "check_circle", "#22c55e"),
      this._createStatBadge("In Progress", stats.started, "pending", "#f59e0b"),
      this._createStatBadge("Pending", stats.notStarted, "schedule", "#6b7280"),
      this._createStatBadge("Total Weight", `${stats.totalWeight.toFixed(1)}t`, "fitness_center", "#3b82f6")
    );

    content.add(statsRow);

    // Spreadsheet for this equipment
    const enrichedLifts = [...lifts];

    const craneSpeed = this.store.crane?.speed || DEFAULT_CRANE_SPEED;

    enrichLiftsWithEstimates(enrichedLifts, craneSpeed);

    const gridData = buildLiftDataForGrid(enrichedLifts);

    const rowCount = gridData.length || 1;

    const calculatedHeight = Math.min(48 + (rowCount * 41) + 10, 300);

    const spreadsheet = UIComponents.spreadsheet({
      data: gridData,
      columnConfig: LIFT_COLUMN_CONFIG,
      columnOrder: LIFT_COLUMN_ORDER,
      height: `${calculatedHeight}px`,
      gridOptions: {
        rowSelection: 'multiple',
        rowMultiSelectWithClick: true,
      }
    });

    spreadsheet.init();

    // Store reference to active spreadsheet if this is the active tab
    if (equipmentId === this.selectedEquipmentId) {
      this.activeSpreadsheet = spreadsheet;
    }

    content.add(spreadsheet);

    return content;
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

  _createStatBadge(label, value, icon, color) {
    const badge = UIComponents.row().gap("0.25rem").addClass("centered-vertical").setStyles({
      padding: "0.25rem 0.5rem",
      backgroundColor: "var(--background-secondary)",
      borderRadius: "var(--border-radius)",
      fontSize: "0.85rem",
    });

    badge.add(
      UIComponents.icon(icon).setStyles({ fontSize: "1rem", color }),
      UIComponents.span(label + ":").addClass("hud-label"),
      UIComponents.span(String(value)).setStyles({ fontWeight: "600", color })
    );

    return badge;
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

    const ticksContainer = UIComponents.div().setStyles({
      position: "absolute",
      left: "0",
      top: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: "1",
    });

    for (let i = 1; i < 10; i++) {
      const tick = UIComponents.div().setStyles({
        position: "absolute",
        left: `${i * 10}%`,
        top: "0",
        width: "1px",
        height: "100%",
        backgroundColor: "#242222",
      });

      ticksContainer.add(tick);
    }

    container.add(fill, ticksContainer, leftLabel, rightLabel);

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

    const craneSpeed = this.store.crane?.speed || DEFAULT_CRANE_SPEED;

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
    const container = UIComponents.gantt(this.context, taskData);

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
    const toolbar = UIComponents.column().setId("Dev").addClass("dev-toolbar");

    const button = UIComponents.operator("home");

    button.onClick(() => window.location.reload());

    toolbar.add(button);

    const capturePosition = UIComponents.operator("camera");

    toolbar.add(capturePosition);

    capturePosition.onClick(() => console.log(tools.world.viewpoint.capturePosition(context.editor)));

    context.dom.appendChild(toolbar.dom);
  }
}

class HardHatEnvironmentUI {
  constructor({ context, operators }) {
    this.context = context;
    this.ops = operators;
    this.store = Core.loadStore();

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

    context.layoutManager.ensureTab("bottom", "addon.hardhat.environment", "Environment", panel, {
      open: false,
      replace: false,
    });
    this._unbindToggle = context.layoutManager?.bindToggle("AddonHardHatEnvironment", "bottom", "addon.hardhat.environment") || null;

    this.listen(context);
    this._redraw();
  }

  destroy() {
    if (this._unbindToggle) this._unbindToggle();
    this.context?.layoutManager?.removeTab("bottom", "addon.hardhat.environment");
  }

  listen(context) {
    context.signals.hardHatStoreChanged.add(({ store }) => {
      this.store = store;
      this._redraw();
    });

    context.signals.weatherChanged.add(({ weather }) => {
      if (weather) {
        Core.updateWeather(this.store, weather);
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
        this.ops.execute("addon.navigation.open_map_link", this.context, locationDisplayData.lat, locationDisplayData.lon);
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
