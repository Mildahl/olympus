import { Components as UIComponents } from "../../ui/Components/Components.js";

import AECO_tools from "../../tool/index.js";

import { TabPanel } from "../../../drawUI/TabPanel.js";

import { DirectorAnalyticsFilterState } from "./DirectorAnalyticsFilterState.js";

import { DirectorKpiStripSection } from "./DirectorKpiStripSection.js";

import { DirectorFilterToolbarSection } from "./DirectorFilterToolbarSection.js";

import { DirectorElementCompositionSection } from "./DirectorElementCompositionSection.js";

import { DirectorInsightChartsSection } from "./DirectorInsightChartsSection.js";

import { DirectorSpatialSummarySection } from "./DirectorSpatialSummarySection.js";

import { DirectorQuantityCoverageSection } from "./DirectorQuantityCoverageSection.js";

import { DirectorScheduleKpiSection } from "./DirectorScheduleKpiSection.js";

import { DirectorCostPresenceSection } from "./DirectorCostPresenceSection.js";

import { DirectorMaterialClassificationSection } from "./DirectorMaterialClassificationSection.js";

class BIMAnalyticsUI extends TabPanel {
  constructor({ context, operators }) {
    super({
      context,
      operators,
      position: "left",
      moduleId: "bim.analytics",
      tabId: "bim-project-model-analytics",
      tabLabel: "Model data",
      icon: "analytics",
      title: "Model data",
      showHeader: false,
      floatable: true,
      panelStyles: { "min-width": "35vw" },
      autoShow: false,
    });

    this.analyticsRoot = null;

    this.filterState = new DirectorAnalyticsFilterState();

    this.lastOverview = null;

    this.kpiStrip = new DirectorKpiStripSection({
      filterState: this.filterState,
      onClearFilters: () => {
        this._handleClearFilters();
      },
    });

    this.filterToolbar = new DirectorFilterToolbarSection({
      filterState: this.filterState,
      onFiltersCommit: () => {
        this._refreshSliceAndSelection();
      },
    });

    this.compositionSection = new DirectorElementCompositionSection({
      onClassSelected: (className) => {
        this.filterState.setIfcClassFromChart(className);

        this.filterToolbar.syncFromFilterState();

        this._refreshSliceAndSelection();
      },
    });

    this.insightChartsSection = new DirectorInsightChartsSection();

    this.spatialSection = new DirectorSpatialSummarySection();

    this.quantitySection = new DirectorQuantityCoverageSection();

    this.scheduleSection = new DirectorScheduleKpiSection();

    this.costSection = new DirectorCostPresenceSection();

    this.materialSection = new DirectorMaterialClassificationSection();

    this._onFilterStateChanged = () => {
      this.kpiStrip.refreshFilters();
    };

    this.filterState.addChangeListener(this._onFilterStateChanged);

    this.draw(context);

    this.listen(context);

    this.applyAnalyticsForFileName(null);
  }

  draw(context) {
    this.content.addClass("Column");

    this.content.addClass("director-analytics-root");

    this.analyticsRoot = UIComponents.column().gap("var(--phi-1)");

    this.content.add(this.analyticsRoot);
  }

  listen(context) {
    const reload = (payload) => {
      let fileName = null;

      if (payload && payload.FileName) {
        fileName = payload.FileName;
      } else if (context.ifc && context.ifc.activeModel) {
        fileName = context.ifc.activeModel;
      }

      this.applyAnalyticsForFileName(fileName);
    };

    context.signals.refreshBIMLayers.add(reload);

    context.signals.activeModelChanged.add(reload);

    context.signals.newIFCModel.add(reload);

    context.signals.workschedulechanged.add(() => {
      const activeModel = context.ifc && context.ifc.activeModel ? context.ifc.activeModel : null;

      if (activeModel) {
        this.applyAnalyticsForFileName(activeModel);
      }
    });
  }

  applyAnalyticsForFileName(modelFileName) {
    if (!this.analyticsRoot) {
      return;
    }

    this.filterState.setModelName(modelFileName);

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

      if (activeNow !== requestModel) {
        return;
      }

      this.analyticsRoot.clear();

      this.lastOverview = overview;

      this._renderDashboard(overview);
    } catch (err) {
      const activeNow = this.context.ifc.activeModel;

      if (activeNow !== requestModel) {
        return;
      }

      this.analyticsRoot.clear();

      const errorText = UIComponents.text("Failed to load overview");

      errorText.setStyle("color", ["var(--theme-error)"]);

      this.analyticsRoot.add(errorText);

      const detail = err && err.message ? String(err.message) : String(err);

      const detailNode = UIComponents.text(detail);

      detailNode.setStyle("font-size", ["11px"]);

      detailNode.setStyle("color", ["var(--theme-text-light)"]);

      detailNode.setStyle("padding-top", ["4px"]);

      this.analyticsRoot.add(detailNode);
    }
  }

  _renderDashboard(overview) {
    this.kpiStrip.render(overview);

    this.analyticsRoot.add(this.kpiStrip.getDom());

    this.filterToolbar.render(overview);

    this.analyticsRoot.add(this.filterToolbar.getDom());

    this.compositionSection.render(overview);

    this.analyticsRoot.add(this.compositionSection.getDom());

    this.insightChartsSection.render(overview);

    this.analyticsRoot.add(this.insightChartsSection.getDom());

    this.spatialSection.render(overview);

    this.analyticsRoot.add(this.spatialSection.getDom());

    this.quantitySection.render(overview);

    this.analyticsRoot.add(this.quantitySection.getDom());

    this.scheduleSection.render(overview);

    this.analyticsRoot.add(this.scheduleSection.getDom());

    this.costSection.render(overview);

    this.analyticsRoot.add(this.costSection.getDom());

    this.materialSection.render(overview);

    this.analyticsRoot.add(this.materialSection.getDom());
  }

  _handleClearFilters() {
    this.filterState.clearFilters(true);

    this.filterToolbar.syncFromFilterState();

    if (this.context.editor && typeof this.context.editor.deselect === "function") {
      this.context.editor.deselect();
    }

    this.context.signals.directorAnalyticsContextChanged.dispatch({
      modelName: this.filterState.modelName,
      activeFilters: this.filterState.snapshot(),
      source: "clear",
    });
  }

  async _refreshSliceAndSelection() {
    const modelName = this.filterState.modelName;

    if (!modelName) {
      return;
    }

    try {
      const slice = await AECO_tools.bim.project.getDirectorFilteredSlice(
        modelName,
        this.filterState.buildFilterSpec(),
      );

      this.filterState.setSliceResult(slice);

      this.filterToolbar.syncFromFilterState();

      this.context.signals.directorAnalyticsContextChanged.dispatch({
        modelName,
        activeFilters: this.filterState.snapshot(),
        source: "analytics",
      });

      const editor = this.context.editor;

      if (editor && slice && Array.isArray(slice.globalIds) && slice.globalIds.length > 0) {
        AECO_tools.world.scene.selectObjectsByGuid(this.context, slice.globalIds);
      }
    } catch (err) {
      this.filterState.setSliceResult(null);

      this.context.signals.directorAnalyticsContextChanged.dispatch({
        modelName,
        activeFilters: this.filterState.snapshot(),
        source: "analytics_error",
      });
    }
  }
}

export default [BIMAnalyticsUI];
