import { DrawUI, ListboxItem, UIDiv, SimpleFloatingWindow } from "./../../../drawUI/index.js";

import { SpreadsheetUIComponent } from "./SpreadsheetUIComponent.js";

import { ChartUIComponent } from "./ChartUIComponent.js";

import { ReorderableList } from "./ReorderableList.js";

import { Nodes } from "./Nodes.js";

import { GanttComponent } from "./GanttComponent.js";

import { MarkdownComponent, markdownToHtml } from "./MarkdownComponent.js";

/**
 * Convert markdown to HTML using Showdown, auto-loading it from vendor if needed.
 * @param {string} markdown - The markdown text to convert.
 * @returns {Object} Object with html property (converted HTML or raw in pre) and codes array.
 */
export function simpleMarkdownToHtml(markdown) {
  return markdownToHtml(markdown);
}

// Re-export drawUI panel classes, utilities, primitives, and ICONS
export {
  BasePanel,
  SimpleFloatingWindow,
  AccountPanel,
  TabPanel,
  FloatingPanel,
  PieMenu,
  CollapsiblePanel,
  CollapsibleSection,
  ICONS,
  focusDockedWorkspaceTab,
  buildWorkspaceDockHandlers,
  makeDraggable,
  makeResizable,
  UIElement,
  UILink,
  UIImage,
  UISVG,
  UIParagraph,
  UIH1,
  UIH2,
  UIH3,
  UIH4,
  UIH5,
  UIH6,
  UISpan,
  UIDiv,
  UIRow,
  UIColumn,
  UIPanel,
  UILabel,
  UIForm,
  UIText,
  UISmallText,
  UIInput,
  UIIcon,
  UITextArea,
  UISelect,
  UICheckbox,
  UIColor,
  UINumber,
  UIInteger,
  UIBreak,
  UIHorizontalRule,
  UIButton,
  UIProgress,
  UITabbedPanel,
  UIListbox,
  ListboxItem,
  UIDatePicker,
  UISpinner,
  UITooltip,
} from "./../../../drawUI/index.js";

// Re-export custom components
export {
  SpreadsheetUIComponent,
  ChartUIComponent,
  Nodes,
  GanttComponent,
};

/**
 * @typedef {Object} SpreadsheetOptions
 * @property {Array<Array<any>>} [data] - Initial data
 * @property {Array<{header: string, type?: string}>} [columnConfig] - Column configuration
 * @property {Function} [columnNameMapper] - Map column names
 * @property {Array<string>} [columnOrder] - Column display order
 * @property {string} [height] - Container height
 * @property {string} [width] - Container width
 * @property {string} [minHeight] - Minimum container height (e.g. in flex layouts)
 * @property {Object} [gridOptions] - Additional AG Grid options
 */

/**
 * Collection of factory methods for creating UI components.
 * Extends DrawUI with Showdown-based markdown, spreadsheet, chart, gantt, and node components.
 * All base UI factory methods (div, row, button, icon, panel, etc.) are inherited from DrawUI.
 *
 * @example
 * import { Components as UIComponents } from './Components.js';
 *
 * const panel = UIComponents.floatingPanel({ title: 'My Panel' });
 * const row = UIComponents.row().gap('1rem');
 * row.add(UIComponents.button('Click me'));
 */
export class Components extends DrawUI {

  /**
   * Creates a markdown component that renders markdown text with Showdown enhancements.
   * @param {string} [text=''] - The markdown text to render
   * @param {Object} [options={}] - Options for rendering
   * @param {Function} [options.highlightCallback] - Callback for code highlighting
   * @returns {UIDiv} The rendered markdown component
   */
  static markdown(text = "", options = {}) {
    return new MarkdownComponent(text, options);
  }

  /**
   * Creates a node graph component (extends UIDiv). Use `embedded: true` inside tabbed or flex layouts.
   * @param {Object} nodes - The nodes configuration.
   * @returns {Nodes} Root element for the graph; always an instance of Nodes.
   */
  static nodes(nodes) {
    return new Nodes(nodes);
  }

  /**
   * Renders a Gantt chart.
   * @param {Object} context - The application context.
   * @param {Object} tasksData - The tasks data.
   * @param {Object} [options] - Optional `{ operators, onTaskRowClick, shouldRunSelectTaskOnRowClick, onGanttComponentReady }` for row-click behavior and host access to `GanttComponent`.
   */
  static gantt(context, tasksData, options) {
    const container = new UIDiv()
      .setStyle("position", ["relative"])
      .addClass("gantt");

    container.setId("GanttChartDIV");

    const jsganttView = new GanttComponent(context, options);

    container.ganttComponent = jsganttView;

    jsganttView.render(tasksData, container);

    if (options && typeof options.onGanttComponentReady === "function") {
      options.onGanttComponentReady(jsganttView);
    }

    return container;
  }

  /**
   * Create a reorderable list
   * @param {Array} [items=[]] - Initial items
   * @param {Function|null} [onReorder=null] - Callback when items reordered
   * @returns {UIElement}
   */
  static reorderableList(items = [], onReorder = null) {
    const reorderableList = new ReorderableList(items, onReorder);

    return reorderableList.container;
  }

  /**
   * Create a list item with Row class
   * @param {string} [text=''] - Item text
   * @returns {ListboxItem}
   */
  static listItem(text = "") {
    return new ListboxItem(text).addClass("Row");
  }

  /**
   * Create a spreadsheet component
   * @param {SpreadsheetOptions} options - Spreadsheet configuration
   * @returns {SpreadsheetUIComponent}
   */
  static spreadsheet({
    data,
    columnConfig,
    columnNameMapper,
    columnOrder,
    height = "100%",
    width = "100%",
    minHeight,
    gridOptions,
  }) {
    return new SpreadsheetUIComponent({
      data,
      columnConfig,
      columnNameMapper,
      columnOrder,
      height,
      width,
      minHeight,
      gridOptions,
    });
  }

  /**
   * Create a Chart.js panel (vendor script loaded on first init, like the spreadsheet).
   * @param {Object} [options={}]
   * @param {Object} options.chartConfiguration - Chart.js configuration (type, data, options, …)
   * @param {string} [options.height]
   * @param {string} [options.width]
   * @param {string} [options.minHeight]
   * @returns {ChartUIComponent}
   */
  static chart({
    chartConfiguration,
    height = "240px",
    width = "100%",
    minHeight,
  }) {
    return new ChartUIComponent({
      chartConfiguration,
      height,
      width,
      minHeight,
    });
  }

  static floatingWindow(options = {}) {
    return new SimpleFloatingWindow(options);
  }

  static createPropertyRow(label, value, tooltip = "") {
    const item = Components.listItem();

    tooltip? item.dom.title = tooltip : null;

    const noOverFlowStyle = {
      flex: "1",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      minWidth: "0",
    }

    const labelEl = Components.text(label).setStyles(noOverFlowStyle);

    labelEl.setTooltip(label);

    const valueEl = Components.text(String(value)).setStyles(noOverFlowStyle);

    valueEl.setTooltip(String(value));

    item.add(labelEl, valueEl);

    return item;
  }

}
