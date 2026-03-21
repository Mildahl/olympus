import { Components as UIComponents } from "../../ui/Components/Components.js";

import { TabPanel } from "../../../drawUI/TabPanel.js";

import AECO_tools from "../../tool/index.js";

const ANALYTICS_TAB_NO_TOOLBAR_TOGGLE_ELEMENT_ID =
  "__bimProjectModelAnalyticsTabNoToolbarToggle__";

class BimProjectModelAnalyticsUI {
  constructor({ context, operators }) {
    this.context = context;

    this.operators = operators;

    this.position = "left";

    this.tabId = "bim-project-model-analytics";

    this.tabLabel = "Model analytics";

    this.analyticsRoot = null;

    this._tabPanel = new TabPanel({
      context,
      operators,
      position: "left",
      tabId: this.tabId,
      tabLabel: this.tabLabel,
      title: "Model analytics",
      icon: "analytics",
      showHeader: false,
      moduleId: undefined,
      toggleElementId: ANALYTICS_TAB_NO_TOOLBAR_TOGGLE_ELEMENT_ID,
      floatable: true,
      panelStyles: { "min-width": "0" },
    });

    this._tabPanel.panel.addClass("Panel");
    this._tabPanel.panel.setId("BimProjectModelAnalyticsPanel");
    this._tabPanel.content.setStyle("overflow-x", ["hidden"]);

    this.panel = this._tabPanel.panel;
    this.content = this._tabPanel.content;

    this.buildAnalyticsSurface(context);

    this.listen(context);

    this.applyAnalyticsForFileName(this.resolveActiveModelFileName(context));
  }

  resolveActiveModelFileName(context) {
    if (!context || !context.ifc) return null;

    const name = context.ifc.activeModel;

    if (name == null || name === "") return null;

    return name;
  }

  buildAnalyticsSurface(context) {
    this.content.addClass("Column");

    this.analyticsRoot = UIComponents.column().gap("var(--phi-0-5)");

    this.content.add(this.analyticsRoot);
  }

  listen(context) {
    const signals = context.signals;

    if (!signals) return;

    const analyticsSignal = signals.bimIfcModelAnalyticsContextChanged;

    if (analyticsSignal && typeof analyticsSignal.add === "function") {
      analyticsSignal.add((payload) => {
        const fileName =
          payload && payload.fileName != null && payload.fileName !== ""
            ? payload.fileName
            : null;

        this.applyAnalyticsForFileName(fileName);
      });
    }

    const bimEnabledSignal = signals.bimEnabled;

    if (bimEnabledSignal && typeof bimEnabledSignal.add === "function") {
      bimEnabledSignal.add(() => {
        this.applyAnalyticsForFileName(this.resolveActiveModelFileName(context));
      });
    }
  }

  applyAnalyticsForFileName(modelFileName) {
    if (!this.analyticsRoot) return;

    this.analyticsRoot.clear();

    if (!modelFileName) {
      this.renderEmptyState("Select a model in IFC models to view analytics");

      return;
    }

    if (!AECO_tools.code || !AECO_tools.code.pyWorker || !AECO_tools.code.pyWorker.initialized) {
      this.renderEmptyState("Enable Python and BIM to load model analytics");

      return;
    }

    if (!AECO_tools.code.pyWorker.initialized.bim) {
      this.renderEmptyState("Enable Python and BIM to load model analytics");

      return;
    }

    this.renderLoadingState();

    this.loadOverviewAsync(modelFileName);
  }

  renderEmptyState(messageText) {
    const emptyState = UIComponents.text(messageText);

    emptyState.setStyle("font-size", ["12px"]);

    emptyState.setStyle("color", ["var(--theme-text-light)"]);

    emptyState.setStyle("padding", ["var(--phi-0-5)"]);

    this.analyticsRoot.add(emptyState);
  }

  renderLoadingState() {
    const loadingText = UIComponents.text("Loading...");

    loadingText.setStyle("font-size", ["12px"]);

    loadingText.setStyle("color", ["var(--theme-text-light)"]);

    this.analyticsRoot.add(loadingText);
  }

  async loadOverviewAsync(modelFileName) {
    const requestModel = modelFileName;

    try {
      const overview = await AECO_tools.bim.project.getModelOverview(requestModel);

      const activeNow = this.resolveActiveModelFileName(this.context);

      if (activeNow !== requestModel) return;

      this.analyticsRoot.clear();

      this.renderOverviewContent(overview);
    } catch (err) {
      const activeNow = this.resolveActiveModelFileName(this.context);

      if (activeNow !== requestModel) return;

      this.analyticsRoot.clear();

      const errorText = UIComponents.text("Failed to load overview");

      errorText.setStyle("color", ["var(--theme-error)"]);

      this.analyticsRoot.add(errorText);
    }
  }

  renderOverviewContent(overview) {
    const camelToTitle = (str) =>
      str.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).trim();

    const statsGrid = UIComponents.row();

    statsGrid.setStyle("display", ["grid"]);

    statsGrid.setStyle("grid-template-columns", ["repeat(3, 1fr)"]);

    statsGrid.setStyle("gap", ["var(--phi-0-5)"]);

    for (const [key, value] of Object.entries(overview)) {
      const count = Array.isArray(value) ? value.length : 0;

      const label = camelToTitle(key);

      const item = UIComponents.div().addClass("SquareOperator");

      item.add(UIComponents.text(label));

      item.add(UIComponents.span(String(count)).addClass("GameNumber"));

      statsGrid.add(item);
    }

    this.analyticsRoot.add(statsGrid);

    if (overview.costSchedules && overview.costSchedules.length > 0) {
      const costSection = UIComponents.collapsibleSection({
        title: `Cost Schedules (${overview.costSchedules.length})`,
        collapsed: true,
      });

      const costList = UIComponents.list();

      for (const cost of overview.costSchedules) {
        const item = UIComponents.listItem().addClass("justify-between");

        item.add(UIComponents.text(cost.Name || "Unnamed"));

        const costType = cost.type;

        const badgeLabel = costType ? costType.replace("Ifc", "") : "";

        item.add(UIComponents.badge(badgeLabel));

        costList.add(item);
      }

      costSection.setContent(costList);

      this.analyticsRoot.add(costSection);
    }

    if (overview.workSchedules && overview.workSchedules.length > 0) {
      const scheduleSection = UIComponents.collapsibleSection({
        title: `Work Schedules (${overview.workSchedules.length})`,
        collapsed: true,
      });

      const scheduleList = UIComponents.list();

      for (const schedule of overview.workSchedules) {
        const item = UIComponents.listItem().addClass("justify-between");

        item.add(UIComponents.text(schedule.Name || "Unnamed"));

        const scheduleType = schedule.type;

        const scheduleBadgeLabel = scheduleType ? scheduleType.replace("Ifc", "") : "";

        item.add(UIComponents.badge(scheduleBadgeLabel));

        scheduleList.add(item);
      }

      scheduleSection.setContent(scheduleList);

      this.analyticsRoot.add(scheduleSection);
    }
  }
}

export default [BimProjectModelAnalyticsUI];
