import { Components as UIComponents } from "../../ui/Components/Components.js";

import {
  analyticsChipStyles,
  analyticsFilterChipsRowStyles,
  analyticsFilterHintStyles,
  analyticsInsightNarrativeStyles,
  analyticsKpiCellStyles,
  analyticsKpiMetaRowStyles,
  analyticsProjectTitleStyles,
} from "./bimAnalyticsPanelStyles.js";

class DirectorKpiStripSection {
  constructor({ filterState, onClearFilters }) {
    this.filterState = filterState;

    this.onClearFilters = onClearFilters;

    this.root = UIComponents.column().gap("var(--phi-0-5)");

    this.metaRow = UIComponents.row().gap("var(--phi-1)").setStyles(analyticsKpiMetaRowStyles);

    this.chipsRow = UIComponents.row().gap("var(--phi-0-5)").setStyles(analyticsFilterChipsRowStyles);

    this.insightLine = UIComponents.text("");

    this.insightLine.setStyles(analyticsInsightNarrativeStyles);

    this.grid = UIComponents.div()
      .addClass("OlympusGrid")
      .setStyles({
        gridTemplateColumns: "repeat(auto-fill, minmax(7rem, 1fr))",
        gap: "var(--phi-0-5)",
        width: "100%",
      });
  }

  getDom() {
    return this.root;
  }

  render(overview) {
    this.metaRow.clear();

    this.grid.clear();

    const titleText = overview.projectName
      ? overview.projectName
      : "IFC project";

    const title = UIComponents.text(titleText);

    title.setStyles(analyticsProjectTitleStyles);

    const schemaBadge = UIComponents.badge(overview.schema || "IFC");

    this.metaRow.add(title, schemaBadge);

    const totals = overview.totals || {};

    this._addKpiCell("Products", String(totals.products != null ? totals.products : "—"));

    this._addKpiCell("Elements", String(totals.elements != null ? totals.elements : "—"));

    this._addKpiCell("Types", String(totals.elementTypes != null ? totals.elementTypes : "—"));

    const schedules = overview.workSchedules || [];

    const costs = overview.costSchedules || [];

    this._addKpiCell("Work schedules", String(schedules.length));

    const workPlans = overview.workPlan || [];

    this._addKpiCell("Work plans", String(workPlans.length));

    this._addKpiCell("Cost schedules", String(costs.length));

    const insights = overview.insights || {};

    const matPct = insights.materialCoveragePercent != null ? insights.materialCoveragePercent : "—";

    const psetPct = insights.psetCoveragePercent != null ? insights.psetCoveragePercent : "—";

    const qtoPct = insights.quantityCoveragePercent != null ? insights.quantityCoveragePercent : "—";

    const typePct = insights.typeCoveragePercent != null ? insights.typeCoveragePercent : "—";

    const spatPct = insights.spatialPlacementPercent != null ? insights.spatialPlacementPercent : "—";

    this.insightLine.dom.textContent =
      "Data health — material " +
      String(matPct) +
      "% · property sets " +
      String(psetPct) +
      "% · quantities " +
      String(qtoPct) +
      "% · typed products " +
      String(typePct) +
      "% · spatially placed " +
      String(spatPct) +
      "%";

    this.root.clear();

    this.root.add(this.metaRow);

    this.root.add(this.insightLine);

    this._renderChips();

    this.root.add(this.chipsRow);

    this.root.add(this.grid);
  }

  _addKpiCell(label, value) {
    const cell = UIComponents.div().addClass("SquareOperator").setStyles(analyticsKpiCellStyles);

    cell.add(UIComponents.text(label));

    cell.add(UIComponents.span(value).addClass("GameNumber"));

    this.grid.add(cell);
  }

  _renderChips() {
    this.chipsRow.clear();

    const snap = this.filterState.snapshot();

    if (
      !snap.ifcClass &&
      !snap.propertySetName &&
      !snap.materialName &&
      !snap.spatialContainerGlobalId
    ) {
      const placeholder = UIComponents.text("Use the filter bar or click a chart segment to isolate elements.");

      placeholder.setStyles(analyticsFilterHintStyles);

      this.chipsRow.add(placeholder);

      return;
    }

    if (snap.ifcClass) {
      this.chipsRow.add(this._chip(`Class: ${snap.ifcClass}`));
    }

    if (snap.propertySetName) {
      this.chipsRow.add(this._chip(`Pset: ${snap.propertySetName}`));
    }

    if (snap.materialName) {
      this.chipsRow.add(this._chip(`Material: ${snap.materialName}`));
    }

    if (snap.spatialContainerGlobalId) {
      const shortId = String(snap.spatialContainerGlobalId).slice(0, 10);

      this.chipsRow.add(this._chip("Spatial: " + shortId + "…"));
    }

    const clearButton = UIComponents.button("Clear filters");

    clearButton.onClick(() => {
      if (this.onClearFilters) {
        this.onClearFilters();
      }
    });

    this.chipsRow.add(clearButton);
  }

  _chip(textContent) {
    const wrap = UIComponents.span(textContent);

    wrap.setStyles(analyticsChipStyles);

    return wrap;
  }

  refreshFilters() {
    this.chipsRow.clear();

    this._renderChips();
  }

  destroy() {}
}

export { DirectorKpiStripSection };
