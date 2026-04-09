import { Components as UIComponents } from "../../ui/Components/Components.js";

import { directorChartBackgrounds, directorChartBorders } from "./DirectorAnalyticsChartTheme.js";

import {
  analyticsChartHalfHostStyles,
  analyticsCompositionRowStyles,
  analyticsSectionTitleStyles,
} from "./bimAnalyticsPanelStyles.js";

class DirectorElementCompositionSection {
  constructor({ onClassSelected }) {
    this.onClassSelected = onClassSelected;

    this.root = UIComponents.column().gap("var(--phi-0-5)");

    this.title = UIComponents.text("Element composition");

    this.title.setStyles(analyticsSectionTitleStyles);

    this.chartRow = UIComponents.row().gap("var(--phi-0-75)").setStyles(analyticsCompositionRowStyles);

    this.doughnutHost = UIComponents.div().setStyles(analyticsChartHalfHostStyles);

    this.barHost = UIComponents.div().setStyles(analyticsChartHalfHostStyles);

    this.doughnutPanel = null;

    this.barPanel = null;
  }

  getDom() {
    return this.root;
  }

  render(overview) {
    this.root.clear();

    this.root.add(this.title);

    this.chartRow.clear();

    this.doughnutHost.clear();

    this.barHost.clear();

    if (this.doughnutPanel && typeof this.doughnutPanel.destroy === "function") {
      this.doughnutPanel.destroy();
    }

    if (this.barPanel && typeof this.barPanel.destroy === "function") {
      this.barPanel.destroy();
    }

    this.doughnutPanel = null;

    this.barPanel = null;

    const histogram = overview.classHistogram || [];

    if (histogram.length === 0) {
      this.chartRow.add(UIComponents.text("No product data."));

      this.root.add(this.chartRow);

      return;
    }

    const labels = [];

    const values = [];

    for (let index = 0; index < histogram.length; index++) {
      const row = histogram[index];

      labels.push(row.name);

      values.push(row.count);
    }

    const doughnutLimit = 10;

    const doughnutLabels = [];

    const doughnutValues = [];

    for (let index = 0; index < histogram.length && index < doughnutLimit; index++) {
      const row = histogram[index];

      doughnutLabels.push(row.name);

      doughnutValues.push(row.count);
    }

    const paletteSize = doughnutLabels.length;

    const doughnutColors = directorChartBackgrounds(paletteSize);

    const doughnutBorders = directorChartBorders(paletteSize);

    const self = this;

    const barColors = directorChartBackgrounds(labels.length);

    const barBorders = directorChartBorders(labels.length);

    const doughnutConfiguration = {
      type: "doughnut",
      data: {
        labels: doughnutLabels,
        datasets: [
          {
            label: "Share of classes",
            data: doughnutValues,
            backgroundColor: doughnutColors,
            borderColor: doughnutBorders,
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              boxWidth: 10,
              font: { size: 10 },
            },
          },
        },
        onClick: function (event, activeElements, chart) {
          if (!activeElements || activeElements.length === 0) {
            return;
          }

          const label = chart.data.labels[activeElements[0].index];

          if (!label || label === "Other") {
            return;
          }

          if (self.onClassSelected) {
            self.onClassSelected(String(label));
          }
        },
      },
    };

    const barConfiguration = {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Count by IFC class",
            data: values,
            backgroundColor: barColors,
            borderColor: barBorders,
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          x: {
            ticks: {
              maxRotation: 55,
              minRotation: 35,
              font: { size: 9 },
            },
          },
        },
        onClick: function (event, activeElements, chart) {
          if (!activeElements || activeElements.length === 0) {
            return;
          }

          const labelIndex = activeElements[0].index;

          const label = chart.data.labels[labelIndex];

          if (!label || label === "Other") {
            return;
          }

          if (self.onClassSelected) {
            self.onClassSelected(String(label));
          }
        },
      },
    };

    this.doughnutPanel = UIComponents.chart({
      chartConfiguration: doughnutConfiguration,
      height: "240px",
      minHeight: "200px",
    });

    this.barPanel = UIComponents.chart({
      chartConfiguration: barConfiguration,
      height: "240px",
      minHeight: "200px",
    });

    this.doughnutPanel.init();

    this.barPanel.init();

    this.doughnutHost.add(this.doughnutPanel);

    this.barHost.add(this.barPanel);

    this.chartRow.add(this.doughnutHost);

    this.chartRow.add(this.barHost);

    this.root.add(this.chartRow);
  }

  destroy() {
    if (this.doughnutPanel && typeof this.doughnutPanel.destroy === "function") {
      this.doughnutPanel.destroy();
    }

    if (this.barPanel && typeof this.barPanel.destroy === "function") {
      this.barPanel.destroy();
    }

    this.doughnutPanel = null;

    this.barPanel = null;
  }
}

export { DirectorElementCompositionSection };
