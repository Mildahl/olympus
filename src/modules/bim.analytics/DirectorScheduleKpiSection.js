import { Components as UIComponents } from "../../ui/Components/Components.js";

import { directorChartBackgrounds, directorChartBorders } from "./DirectorAnalyticsChartTheme.js";

import {
  analyticsChartCaptionStyles,
  analyticsDenseListRowItemStyles,
  analyticsScheduleChartHostStyles,
  analyticsSectionTitleStyles,
  analyticsSubtitleScheduleSummaryStyles,
} from "./bimAnalyticsPanelStyles.js";

function directorTruncateLabel(text, maxLength) {
  const stringText = String(text);

  if (stringText.length <= maxLength) {
    return stringText;
  }

  return stringText.slice(0, maxLength - 1) + "…";
}

class DirectorScheduleKpiSection {
  constructor() {
    this.root = UIComponents.column().gap("var(--phi-0-5)");

    this.title = UIComponents.text("Schedule health");

    this.title.setStyles(analyticsSectionTitleStyles);

    this.summaryRow = UIComponents.div();

    this.chartHost = UIComponents.div().setStyles(analyticsScheduleChartHostStyles);

    this.detailsHost = UIComponents.div();

    this.chartPanel = null;
  }

  getDom() {
    return this.root;
  }

  render(overview) {
    this.root.clear();

    this.root.add(this.title);

    this.summaryRow.clear();

    this.chartHost.clear();

    this.detailsHost.clear();

    if (this.chartPanel && typeof this.chartPanel.destroy === "function") {
      this.chartPanel.destroy();
    }

    this.chartPanel = null;

    const scheduleKpis = overview.scheduleKpis || [];

    const workSchedules = overview.workSchedules || [];

    const scheduleAnalytics = overview.scheduleAnalytics || {};

    if (scheduleKpis.length === 0 && workSchedules.length === 0) {
      this.summaryRow.add(UIComponents.text("No work schedules in this model."));

      this.root.add(this.summaryRow);

      return;
    }

    const totalTasks = scheduleAnalytics.totalIfcTasks != null ? scheduleAnalytics.totalIfcTasks : "—";

    const missingDates =
      scheduleAnalytics.tasksMissingScheduleDates != null ? scheduleAnalytics.tasksMissingScheduleDates : "—";

    const withDates =
      scheduleAnalytics.tasksWithScheduleDates != null ? scheduleAnalytics.tasksWithScheduleDates : "—";

    const summaryText =
      "IfcTask entities: " +
      String(totalTasks) +
      " · With schedule dates: " +
      String(withDates) +
      " · Missing dates: " +
      String(missingDates);

    const summaryNode = UIComponents.text(summaryText);

    summaryNode.setStyles(analyticsSubtitleScheduleSummaryStyles);

    this.summaryRow.add(summaryNode);

    this.root.add(this.summaryRow);

    const names = [];

    const taskCounts = [];

    const source = scheduleKpis.length > 0 ? scheduleKpis : workSchedules;

    for (let index = 0; index < source.length; index++) {
      const row = source[index];

      const name = row.Name || "Unnamed";

      names.push(directorTruncateLabel(name, 18));

      const count = row.taskCount != null ? row.taskCount : 0;

      taskCounts.push(count);
    }

    if (names.length > 0) {
      const barConfiguration = {
        type: "bar",
        data: {
          labels: names,
          datasets: [
            {
              label: "Tasks",
              data: taskCounts,
              backgroundColor: directorChartBackgrounds(names.length),
              borderColor: directorChartBorders(names.length),
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { font: { size: 10 } },
              grid: { color: "rgba(255,255,255,0.06)" },
            },
            x: {
              ticks: { font: { size: 9 }, maxRotation: 40, minRotation: 25 },
              grid: { display: false },
            },
          },
        },
      };

      this.chartPanel = UIComponents.chart({
        chartConfiguration: barConfiguration,
        height: "200px",
        minHeight: "160px",
      });

      this.chartPanel.init();

      const cap = UIComponents.text("Tasks per work schedule");

      cap.setStyles(analyticsChartCaptionStyles);

      this.chartHost.add(cap);

      this.chartHost.add(this.chartPanel);

      this.root.add(this.chartHost);
    }

    const collapsedSection = UIComponents.collapsibleSection({
      title: "Schedule details",
      collapsed: true,
    });

    const list = UIComponents.list();

    for (let index = 0; index < source.length; index++) {
      const row = source[index];

      const item = UIComponents.listItem().setStyles(analyticsDenseListRowItemStyles);

      const name = row.Name || "Unnamed";

      item.add(UIComponents.text(name));

      if (row.taskCount != null) {
        const metaParts = [];

        metaParts.push(String(row.taskCount) + " tasks");

        if (row.startDate) {
          metaParts.push(String(row.startDate));
        }

        if (row.endDate) {
          metaParts.push(String(row.endDate));
        }

        item.add(UIComponents.badge(metaParts.join(" · ")));
      } else {
        item.add(UIComponents.badge(row.type ? String(row.type).replace("Ifc", "") : "Schedule"));
      }

      list.add(item);
    }

    collapsedSection.setContent(list);

    this.detailsHost.add(collapsedSection);

    this.root.add(this.detailsHost);
  }

  destroy() {
    if (this.chartPanel && typeof this.chartPanel.destroy === "function") {
      this.chartPanel.destroy();
    }

    this.chartPanel = null;
  }
}

export { DirectorScheduleKpiSection };
