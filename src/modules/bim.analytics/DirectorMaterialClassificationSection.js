import { Components as UIComponents } from "../../ui/Components/Components.js";

import {
  analyticsBottomFooterStyles,
  analyticsBottomKpiCellStyles,
  analyticsSectionTitleStyles,
  analyticsSubtitleStyles,
} from "./bimAnalyticsPanelStyles.js";

class DirectorMaterialClassificationSection {
  constructor() {
    this.root = UIComponents.column().gap("var(--phi-0-5)");

    this.title = UIComponents.text("Materials and classifications");

    this.title.setStyles(analyticsSectionTitleStyles);

    this.grid = UIComponents.div()
      .addClass("OlympusGrid")
      .setStyles({
        gridTemplateColumns: "repeat(auto-fill, minmax(6.5rem, 1fr))",
        gap: "var(--phi-0-5)",
        width: "100%",
      });

    this.footer = UIComponents.div().setStyles(analyticsBottomFooterStyles);
  }

  getDom() {
    return this.root;
  }

  render(overview) {
    this.root.clear();

    this.root.add(this.title);

    this.grid.clear();

    this.footer.clear();

    const materialsBlock = overview.materials || {};

    const totalDefinitions = materialsBlock.totalDefinitions != null ? materialsBlock.totalDefinitions : 0;

    const classifications = overview.classifications || {};

    const classEntities =
      classifications.classificationEntities != null ? classifications.classificationEntities : 0;

    const classRefs =
      classifications.classificationReferences != null ? classifications.classificationReferences : 0;

    const insights = overview.insights || {};

    const missingMat = insights.elementsMissingMaterial != null ? insights.elementsMissingMaterial : 0;

    const missingPset = insights.elementsMissingAnyPset != null ? insights.elementsMissingAnyPset : 0;

    this.grid.add(this._kpiCell("Material defs", String(totalDefinitions)));

    this.grid.add(this._kpiCell("Class. entities", String(classEntities)));

    this.grid.add(this._kpiCell("Class. refs", String(classRefs)));

    this.grid.add(this._kpiCell("No material", String(missingMat)));

    this.grid.add(this._kpiCell("No pset", String(missingPset)));

    const matPct = insights.materialCoveragePercent != null ? insights.materialCoveragePercent : "—";

    const psetPct = insights.psetCoveragePercent != null ? insights.psetCoveragePercent : "—";

    const foot = UIComponents.text(
      "Assignment coverage on elements: material " + String(matPct) + "% · property data " + String(psetPct) + "%",
    );

    foot.setStyles(analyticsSubtitleStyles);

    this.footer.add(foot);

    this.root.add(this.grid);

    this.root.add(this.footer);
  }

  _kpiCell(label, value) {
    const cell = UIComponents.div().addClass("SquareOperator").setStyles(analyticsBottomKpiCellStyles);

    cell.add(UIComponents.text(label));

    cell.add(UIComponents.span(value).addClass("GameNumber"));

    return cell;
  }

  destroy() {}
}

export { DirectorMaterialClassificationSection };
