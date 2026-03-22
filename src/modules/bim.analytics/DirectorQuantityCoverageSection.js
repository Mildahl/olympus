import { Components as UIComponents } from "../../ui/Components/Components.js";

import { directorChartBackgrounds, directorChartBorders } from "./DirectorAnalyticsChartTheme.js";

const QTO_BAR_MAX = 8;

function directorTruncateLabel(text, maxLength) {
  const stringText = String(text);

  if (stringText.length <= maxLength) {
    return stringText;
  }

  return stringText.slice(0, maxLength - 1) + "…";
}

class DirectorQuantityCoverageSection {
  constructor() {
    this.root = UIComponents.column().gap("var(--phi-0-5)");

    this.title = UIComponents.text("Quantity coverage");

    this.title.addClass("director-analytics-section-title");

    this.bodyRow = UIComponents.row().gap("var(--phi-0-75)").addClass("director-analytics-quantity-row");

    this.statsColumn = UIComponents.column().gap("var(--phi-0-5)").addClass("director-analytics-quantity-stats");

    this.chartHost = UIComponents.div().addClass("director-analytics-chart-host").addClass("director-analytics-quantity-doughnut");

    this.qtoBarHost = UIComponents.div().addClass("director-analytics-chart-host").addClass("director-analytics-qto-bar");

    this.chartPanel = null;

    this.qtoBarPanel = null;
  }

  getDom() {
    return this.root;
  }

  render(overview) {
    this.root.clear();

    this.root.add(this.title);

    this.bodyRow.clear();

    this.statsColumn.clear();

    this.chartHost.clear();

    this.qtoBarHost.clear();

    if (this.chartPanel && typeof this.chartPanel.destroy === "function") {
      this.chartPanel.destroy();
    }

    if (this.qtoBarPanel && typeof this.qtoBarPanel.destroy === "function") {
      this.qtoBarPanel.destroy();
    }

    this.chartPanel = null;

    this.qtoBarPanel = null;

    const quantitySets = overview.quantitySets || {};

    const withQty = quantitySets.elementsWithQuantitySets != null ? quantitySets.elementsWithQuantitySets : 0;

    const withoutQty =
      quantitySets.elementsWithoutQuantitySets != null ? quantitySets.elementsWithoutQuantitySets : 0;

    this.statsColumn.add(this._statBlock("With Qto sets", String(withQty)));

    this.statsColumn.add(this._statBlock("Without Qto sets", String(withoutQty)));

    const doughnutConfiguration = {
      type: "doughnut",
      data: {
        labels: ["With Qto", "Without Qto"],
        datasets: [
          {
            data: [withQty, withoutQty],
            backgroundColor: directorChartBackgrounds(2),
            borderColor: directorChartBorders(2),
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
            labels: { boxWidth: 10, font: { size: 9 } },
          },
        },
      },
    };

    this.chartPanel = UIComponents.chart({
      chartConfiguration: doughnutConfiguration,
      height: "170px",
      minHeight: "150px",
    });

    this.chartPanel.init();

    this.chartHost.add(this.chartPanel);

    const topNames = quantitySets.topNames || [];

    const qtoLabels = [];

    const qtoValues = [];

    const barLimit = topNames.length < QTO_BAR_MAX ? topNames.length : QTO_BAR_MAX;

    for (let index = 0; index < barLimit; index++) {
      const row = topNames[index];

      qtoLabels.push(directorTruncateLabel(row.name, 24));

      qtoValues.push(row.count);
    }

    if (qtoLabels.length > 0) {
      const qtoConfiguration = {
        type: "bar",
        data: {
          labels: qtoLabels,
          datasets: [
            {
              label: "Links",
              data: qtoValues,
              backgroundColor: directorChartBackgrounds(qtoLabels.length),
              borderColor: directorChartBorders(qtoLabels.length),
              borderWidth: 1,
              barThickness: 14,
              maxBarThickness: 18,
            },
          ],
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
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
            x: { beginAtZero: true, ticks: { font: { size: 9 } } },
            y: { ticks: { font: { size: 8 } }, grid: { display: false } },
          },
        },
      };

      this.qtoBarPanel = UIComponents.chart({
        chartConfiguration: qtoConfiguration,
        height: "200px",
        minHeight: "160px",
      });

      this.qtoBarPanel.init();

      const caption = UIComponents.text("Top quantity sets");

      caption.addClass("director-analytics-chart-caption");

      this.qtoBarHost.add(caption);

      this.qtoBarHost.add(this.qtoBarPanel);
    } else {
      this.qtoBarHost.add(UIComponents.text("No quantity sets."));
    }

    this.bodyRow.add(this.statsColumn);

    this.bodyRow.add(this.chartHost);

    this.bodyRow.add(this.qtoBarHost);

    this.root.add(this.bodyRow);

    if (topNames.length > 0) {
      const collapsedSection = UIComponents.collapsibleSection({
        title: "All quantity set names (" + String(topNames.length) + ")",
        collapsed: true,
      });

      const scrollWrap = UIComponents.div().addClass("director-analytics-scroll-list");

      const denseList = UIComponents.list().addClass("director-analytics-dense-list");

      for (let index = 0; index < topNames.length; index++) {
        const row = topNames[index];

        const item = UIComponents.listItem().addClass("director-analytics-dense-row");

        item.add(UIComponents.text(String(row.name)));

        item.add(UIComponents.badge(String(row.count)));

        denseList.add(item);
      }

      scrollWrap.add(denseList);

      collapsedSection.setContent(scrollWrap);

      this.root.add(collapsedSection);
    }
  }

  _statBlock(label, value) {
    const block = UIComponents.div().addClass("director-analytics-stat-block");

    block.add(UIComponents.text(label));

    block.add(UIComponents.span(value).addClass("GameNumber"));

    return block;
  }

  destroy() {
    if (this.chartPanel && typeof this.chartPanel.destroy === "function") {
      this.chartPanel.destroy();
    }

    if (this.qtoBarPanel && typeof this.qtoBarPanel.destroy === "function") {
      this.qtoBarPanel.destroy();
    }

    this.chartPanel = null;

    this.qtoBarPanel = null;
  }
}

export { DirectorQuantityCoverageSection };
