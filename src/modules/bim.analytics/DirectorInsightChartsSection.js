import { Components as UIComponents } from "../../ui/Components/Components.js";

import { directorChartBackgrounds, directorChartBorders } from "./DirectorAnalyticsChartTheme.js";

import {
  analyticsChartCaptionStyles,
  analyticsInsightHalfHostStyles,
  analyticsInsightPairRowStyles,
  analyticsInsightRadarBandStyles,
  analyticsInsightTypesBandStyles,
  analyticsRadarCellHostStyles,
  analyticsSectionTitleStyles,
  analyticsTypesChartHostStyles,
} from "./bimAnalyticsPanelStyles.js";

const DIRECTOR_HBAR_MAX = 8;

const DIRECTOR_TYPE_HBAR_MAX = 10;

function directorTruncateLabel(text, maxLength) {
  const stringText = String(text);

  if (stringText.length <= maxLength) {
    return stringText;
  }

  return stringText.slice(0, maxLength - 1) + "…";
}

function directorSliceNamedCounts(rows, maxRows, nameKey, countKey) {
  const labels = [];

  const values = [];

  const limit = rows.length < maxRows ? rows.length : maxRows;

  for (let index = 0; index < limit; index++) {
    const row = rows[index];

    labels.push(directorTruncateLabel(row[nameKey], 26));

    values.push(row[countKey]);
  }

  return { labels, values };
}

function directorHorizontalBarOptions() {
  return {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          title: function (items) {
            if (!items || items.length === 0) {
              return "";
            }

            return String(items[0].label || "");
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { font: { size: 10 } },
        grid: { color: "rgba(255,255,255,0.06)" },
      },
      y: {
        ticks: { font: { size: 9 } },
        grid: { display: false },
      },
    },
  };
}

class DirectorInsightChartsSection {
  constructor() {
    this.root = UIComponents.column().gap("var(--phi-0-75)");

    this.title = UIComponents.text("Intelligence and coverage");

    this.title.setStyles(analyticsSectionTitleStyles);

    this.radarBand = UIComponents.row().gap("var(--phi-1)").setStyles(analyticsInsightRadarBandStyles);

    this.radarHost = UIComponents.div().setStyles(analyticsRadarCellHostStyles);

    this.pairRow = UIComponents.row().gap("var(--phi-1)").setStyles(analyticsInsightPairRowStyles);

    this.psetHost = UIComponents.div().setStyles(analyticsInsightHalfHostStyles);

    this.materialHost = UIComponents.div().setStyles(analyticsInsightHalfHostStyles);

    this.typesBand = UIComponents.div().setStyles(analyticsInsightTypesBandStyles);

    this.typeHost = UIComponents.div().setStyles(analyticsTypesChartHostStyles);

    this.radarPanel = null;

    this.psetPanel = null;

    this.materialPanel = null;

    this.typePanel = null;
  }

  getDom() {
    return this.root;
  }

  render(overview) {
    this.root.clear();

    this.root.add(this.title);

    this.radarBand.clear();

    this.pairRow.clear();

    this.typesBand.clear();

    this._destroyPanels();

    this.radarHost.clear();

    this.psetHost.clear();

    this.materialHost.clear();

    this.typeHost.clear();

    const insights = overview.insights || {};

    const radarConfiguration = {
      type: "radar",
      data: {
        labels: ["Material", "Property sets", "Quantities", "Element types", "Spatial"],
        datasets: [
          {
            label: "Completeness %",
            data: [
              Number(insights.materialCoveragePercent) || 0,
              Number(insights.psetCoveragePercent) || 0,
              Number(insights.quantityCoveragePercent) || 0,
              Number(insights.typeCoveragePercent) || 0,
              Number(insights.spatialPlacementPercent) || 0,
            ],
            backgroundColor: "rgba(0, 230, 118, 0.18)",
            borderColor: "rgba(0, 230, 118, 0.92)",
            borderWidth: 2,
            pointBackgroundColor: "rgba(0, 230, 118, 0.85)",
            pointRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: {
              stepSize: 25,
              font: { size: 9 },
            },
            pointLabels: {
              font: { size: 9 },
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
        },
      },
    };

    this.radarPanel = UIComponents.chart({
      chartConfiguration: radarConfiguration,
      height: "200px",
      minHeight: "180px",
    });

    this.radarPanel.init();

    this.radarHost.add(this.radarPanel);

    this.radarBand.add(this.radarHost);

    this.root.add(this.radarBand);

    const psetTop = (overview.propertySets && overview.propertySets.topNames) || [];

    const psetSliced = directorSliceNamedCounts(psetTop, DIRECTOR_HBAR_MAX, "name", "count");

    if (psetSliced.labels.length > 0) {
      const psetConfiguration = {
        type: "bar",
        data: {
          labels: psetSliced.labels,
          datasets: [
            {
              label: "Elements",
              data: psetSliced.values,
              backgroundColor: directorChartBackgrounds(psetSliced.labels.length),
              borderColor: directorChartBorders(psetSliced.labels.length),
              borderWidth: 1,
              barThickness: 16,
              maxBarThickness: 20,
            },
          ],
        },
        options: directorHorizontalBarOptions(),
      };

      this.psetPanel = UIComponents.chart({
        chartConfiguration: psetConfiguration,
        height: "200px",
        minHeight: "160px",
      });

      this.psetPanel.init();

      this.psetHost.add(UIComponents.text("Top property sets").setStyles(analyticsChartCaptionStyles));

      this.psetHost.add(this.psetPanel);
    } else {
      this.psetHost.add(UIComponents.text("No property set usage."));
    }

    const matTop = (overview.materials && overview.materials.topMaterialNames) || [];

    const matSliced = directorSliceNamedCounts(matTop, DIRECTOR_HBAR_MAX, "name", "count");

    if (matSliced.labels.length > 0) {
      const matConfiguration = {
        type: "bar",
        data: {
          labels: matSliced.labels,
          datasets: [
            {
              label: "Definitions",
              data: matSliced.values,
              backgroundColor: directorChartBackgrounds(matSliced.labels.length),
              borderColor: directorChartBorders(matSliced.labels.length),
              borderWidth: 1,
              barThickness: 16,
              maxBarThickness: 20,
            },
          ],
        },
        options: directorHorizontalBarOptions(),
      };

      this.materialPanel = UIComponents.chart({
        chartConfiguration: matConfiguration,
        height: "200px",
        minHeight: "160px",
      });

      this.materialPanel.init();

      this.materialHost.add(UIComponents.text("Material definitions").setStyles(analyticsChartCaptionStyles));

      this.materialHost.add(this.materialPanel);
    } else {
      this.materialHost.add(UIComponents.text("No material definitions."));
    }

    this.pairRow.add(this.psetHost);

    this.pairRow.add(this.materialHost);

    this.root.add(this.pairRow);

    const typeRows = overview.elementTypeLabels || [];

    const typeSliced = directorSliceNamedCounts(typeRows, DIRECTOR_TYPE_HBAR_MAX, "name", "count");

    if (typeSliced.labels.length > 0) {
      const typeConfiguration = {
        type: "bar",
        data: {
          labels: typeSliced.labels,
          datasets: [
            {
              label: "Occurrences",
              data: typeSliced.values,
              backgroundColor: "rgba(0, 188, 212, 0.45)",
              borderColor: "rgba(0, 188, 212, 0.95)",
              borderWidth: 1,
              barThickness: 14,
              maxBarThickness: 18,
            },
          ],
        },
        options: directorHorizontalBarOptions(),
      };

      this.typePanel = UIComponents.chart({
        chartConfiguration: typeConfiguration,
        height: "220px",
        minHeight: "180px",
      });

      this.typePanel.init();

      this.typeHost.add(UIComponents.text("Element type names (occurrences)").setStyles(analyticsChartCaptionStyles));

      this.typeHost.add(this.typePanel);
    } else {
      this.typeHost.add(UIComponents.text("No element type labels."));
    }

    this.typesBand.add(this.typeHost);

    this.root.add(this.typesBand);
  }

  _destroyPanels() {
    if (this.radarPanel && typeof this.radarPanel.destroy === "function") {
      this.radarPanel.destroy();
    }

    if (this.psetPanel && typeof this.psetPanel.destroy === "function") {
      this.psetPanel.destroy();
    }

    if (this.materialPanel && typeof this.materialPanel.destroy === "function") {
      this.materialPanel.destroy();
    }

    if (this.typePanel && typeof this.typePanel.destroy === "function") {
      this.typePanel.destroy();
    }

    this.radarPanel = null;

    this.psetPanel = null;

    this.materialPanel = null;

    this.typePanel = null;
  }

  destroy() {
    this._destroyPanels();
  }
}

export { DirectorInsightChartsSection };
