import { Components as UIComponents } from "../../ui/Components/Components.js";

import AECO_tools from "../../tool/index.js";

import { TabPanel } from '../../../drawUI/TabPanel.js';

class BimProjectModelAnalyticsUI extends TabPanel {
  constructor({ context, operators }) {
    super({
      context,
      operators,
      position: 'left',
      tabId: 'bim-project-model-analytics',
      tabLabel: 'Model analytics',
      icon: 'analytics',
      title: 'Model analytics',
      showHeader: false,
      floatable: true,
      panelStyles: { "min-width": "0" },
      toggleElementId: null,
      autoShow: true,
    });

    this.analyticsRoot = null;

    this.draw(context);

    this.listen(context);

    this.applyAnalyticsForFileName(null);
  }

  draw(context) {
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
        this.applyAnalyticsForFileName(context.ifc.activeModel);
      });
    }
  }

  applyAnalyticsForFileName(modelFileName) {
    if (!this.analyticsRoot) return;

    this.analyticsRoot.clear();

    if (!modelFileName) {
      this.renderEmptyState("Load a model in IFC models Tab");

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

      const activeNow = this.context.ifc.activeModel;

      if (activeNow !== requestModel) return;

      this.analyticsRoot.clear();

      this.renderOverviewContent(overview);
    } catch (err) {
      const activeNow = this.context.ifc.activeModel;

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
