import { Components as UIComponents } from "../../ui/Components/Components.js";

import { analyticsSectionTitleStyles, analyticsSpatialCellStyles } from "./bimAnalyticsPanelStyles.js";

class DirectorSpatialSummarySection {
  constructor() {
    this.root = UIComponents.column().gap("var(--phi-0-5)");

    this.title = UIComponents.text("Spatial structure");

    this.title.setStyles(analyticsSectionTitleStyles);

    this.body = UIComponents.div()
      .addClass("OlympusGrid")
      .setStyles({
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "var(--phi-0-5)",
      });
  }

  getDom() {
    return this.root;
  }

  render(overview) {
    this.root.clear();

    this.root.add(this.title);

    this.body.clear();

    const spatial = overview.spatial || {};

    this._cell("Sites", spatial.sites);

    this._cell("Buildings", spatial.buildings);

    this._cell("Storeys", spatial.storeys);

    this.root.add(this.body);
  }

  _cell(label, value) {
    const cell = UIComponents.div().setStyles(analyticsSpatialCellStyles);

    cell.add(UIComponents.text(label));

    cell.add(UIComponents.span(String(value != null ? value : "0")).addClass("GameNumber"));

    this.body.add(cell);
  }

  destroy() {}
}

export { DirectorSpatialSummarySection };
