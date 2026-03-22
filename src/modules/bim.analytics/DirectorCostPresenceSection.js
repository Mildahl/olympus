import { Components as UIComponents } from "../../ui/Components/Components.js";

import { directorChartBackgrounds, directorChartBorders } from "./DirectorAnalyticsChartTheme.js";

function directorTruncateLabel(text, maxLength) {
  const stringText = String(text);

  if (stringText.length <= maxLength) {
    return stringText;
  }

  return stringText.slice(0, maxLength - 1) + "…";
}

class DirectorCostPresenceSection {
  constructor() {
    this.root = UIComponents.column().gap("var(--phi-0-5)");

    this.title = UIComponents.text("Cost analytics");

    this.title.addClass("director-analytics-section-title");

    this.summaryHost = UIComponents.div();

    this.chartHost = UIComponents.div().addClass("director-analytics-chart-host").addClass("director-analytics-cost-chart");

    this.listHost = UIComponents.div();

    this.chartPanel = null;
  }

  getDom() {
    return this.root;
  }

  render(overview) {
    this.root.clear();

    this.summaryHost.clear();

    this.chartHost.clear();

    this.listHost.clear();

    if (this.chartPanel && typeof this.chartPanel.destroy === "function") {
      this.chartPanel.destroy();
    }

    this.chartPanel = null;

    const costAnalytics = overview.costAnalytics;

    const schedulesFromAnalytics = costAnalytics && costAnalytics.schedules ? costAnalytics.schedules : [];

    const costSchedules = overview.costSchedules || [];

    if (schedulesFromAnalytics.length === 0 && costSchedules.length === 0) {
      return;
    }

    this.root.add(this.title);

    const totalItems =
      costAnalytics && costAnalytics.totalCostItems != null ? costAnalytics.totalCostItems : 0;

    const summaryLine = UIComponents.text(
      "Cost schedules: " +
        String(schedulesFromAnalytics.length || costSchedules.length) +
        " · IfcCostItem entities: " +
        String(totalItems),
    );

    summaryLine.addClass("director-analytics-subtitle");

    this.summaryHost.add(summaryLine);

    this.root.add(this.summaryHost);

    const chartRows = schedulesFromAnalytics.length > 0 ? schedulesFromAnalytics : costSchedules;

    const names = [];

    const counts = [];

    for (let index = 0; index < chartRows.length; index++) {
      const row = chartRows[index];

      names.push(directorTruncateLabel(row.Name || "Unnamed", 20));

      const itemCount = row.costItemCount != null ? row.costItemCount : 0;

      counts.push(itemCount);
    }

    if (names.length > 0) {
      const barConfiguration = {
        type: "bar",
        data: {
          labels: names,
          datasets: [
            {
              label: "Cost items",
              data: counts,
              backgroundColor: directorChartBackgrounds(names.length),
              borderColor: directorChartBorders(names.length),
              borderWidth: 1,
              barThickness: 16,
              maxBarThickness: 20,
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

      this.chartPanel = UIComponents.chart({
        chartConfiguration: barConfiguration,
        height: "200px",
        minHeight: Math.min(40 + names.length * 28, 260) + "px",
      });

      this.chartPanel.init();

      const cap = UIComponents.text("Cost items linked per schedule");

      cap.addClass("director-analytics-chart-caption");

      this.chartHost.add(cap);

      this.chartHost.add(this.chartPanel);

      this.root.add(this.chartHost);
    }

    const collapsedSection = UIComponents.collapsibleSection({
      title: "Cost schedule registry (" + String(chartRows.length) + ")",
      collapsed: true,
    });

    const costList = UIComponents.list().addClass("director-analytics-dense-list");

    for (let index = 0; index < chartRows.length; index++) {
      const cost = chartRows[index];

      const item = UIComponents.listItem().addClass("director-analytics-dense-row");

      item.add(UIComponents.text(cost.Name || "Unnamed"));

      const rightParts = [];

      const costType = cost.type;

      if (costType) {
        rightParts.push(String(costType).replace("Ifc", ""));
      }

      if (cost.costItemCount != null) {
        rightParts.push(String(cost.costItemCount) + " items");
      }

      item.add(UIComponents.badge(rightParts.join(" · ") || "CostSchedule"));

      costList.add(item);
    }

    collapsedSection.setContent(costList);

    this.listHost.add(collapsedSection);

    this.root.add(this.listHost);
  }

  destroy() {
    if (this.chartPanel && typeof this.chartPanel.destroy === "function") {
      this.chartPanel.destroy();
    }

    this.chartPanel = null;
  }
}

export { DirectorCostPresenceSection };
