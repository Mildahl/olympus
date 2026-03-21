import {
  UIText,
  UIImage,
  UISVG,
  UILink,
  UIPanel,
  UIButton,
  UIInput,
  UICheckbox,
  UIRow,
  UIDatePicker,
  UISelect,
  UIListbox,
  ListboxItem,
  UIBreak,
  UIDiv,
  UISmallText,
  UIIcon,
  UISpan,
  UITextArea,
  UINumber,
  UIInteger,
  UIColor,
  UIProgress,
  UIHorizontalRule,
  UITabbedPanel,
  UIH1,
  UIH2,
  UIH3,
  UIH4,
  UIH5,
  UIH6,
  UIParagraph,
  UISpinner,
  UITooltip,
} from "./../../../drawUI/ui.js";

import { FloatingPanel } from "./../../../drawUI/FloatingPanel.js";

import { buildWorkspaceDockHandlers } from "./../../../drawUI/utils/workspacePanelDock.js";

import { CollapsiblePanel } from "./../../../drawUI/CollapsiblePanel.js";

import { CollapsibleSection } from "./../../../drawUI/CollapsibleSection.js";

import { enhanceContainer } from "./../../../drawUI/utils/markdownEnhancements.js";

import { BasePanel } from "./../../../drawUI/BasePanel.js";

import { SpreadsheetUIComponent } from "./SpreadsheetUIComponent.js";

import { ReorderableList } from "./ReorderableList.js";

import { Nodes } from "./Nodes.js";

import { GanttComponent } from "./GanttComponent.js";

let showdownConverter = null;

/**
 * Get or create the Showdown converter instance.
 * Requires the user to load Showdown (e.g. script tag) so that
 * global `showdown` is available.
 * @returns {showdown.Converter|null} The converter, or null if Showdown is not loaded.
 */
function getShowdownConverter() {
  if (!showdownConverter && typeof showdown !== 'undefined') {
    showdownConverter = new showdown.Converter({
      tables: true,
      tasklists: true,
      strikethrough: true,
      ghCodeBlocks: true,
      simplifiedAutoLink: true,
      openLinksInNewWindow: true,
      emoji: true,
      underline: true,
      ghCompatibleHeaderId: true,
      parseImgDimensions: true,
      headerLevelStart: 1
    });
  }

  return showdownConverter;
}

/**
 * Convert markdown to HTML using Showdown (must be loaded by the user).
 * @param {string} markdown - The markdown text to convert.
 * @returns {Object} Object with html property (converted HTML or raw in pre) and codes array.
 */
export function simpleMarkdownToHtml(markdown) {
  const converter = getShowdownConverter();

  if (!converter) {
    console.warn('Showdown not loaded. Load it (e.g. <script src="showdown.js"></script>) for markdown support. Returning raw text.');

    return { html: `<pre>${markdown}</pre>`, codes: [] };
  }

  const html = converter.makeHtml(markdown);

  return { html, codes: [] };
}

/**
 * A navigable list component with back/forth navigation support.
 * Manages history stack and renders items with optional children navigation.
 */
class NavigableList {
  constructor(options = {}) {
    this.history = [];

    this.currentData = null;

    this.rootData = null;

    this.onItemClick = options.onItemClick || null;

    this.onNavigate = options.onNavigate || null;

    this.renderItem = options.renderItem || this.defaultRenderItem.bind(this);

    this.getChildren = options.getChildren || ((item) => item.children || []);

    this.getLabel =
      options.getLabel || ((item) => item.name || item.label || "Item");

    this.getTitle = options.getTitle || ((item) => item.name || "Items");

    this.emptyMessage = options.emptyMessage || "No items";

    this.panel = new UIDiv();

    this.panel.addClass("NavigableList");

    this.header = new UIDiv().addClass("PanelHeader");

    this.header.addClass("Header");

    this.header.dom.style.cssText =
      "display:flex;align-items:center;gap:10px;padding:1rem;";

    this.headerContent = new UIDiv();

    this.header.add(this.headerContent);

    this.panel.add(this.header);

    this.content = new UIDiv();

    this.content.addClass("NavigableList-content");

    this.panel.add(this.content);
  }

  /**
   * Set the data and render the list.
   * @param {Object} data - Root data object with children.
   */
  setData(data) {
    this.rootData = data;

    this.currentData = data;

    this.history = [];

    this.refresh();
  }

  /**
   * Navigate to a child item.
   * @param {Object} item - The item to navigate to.
   */
  navigateTo(item) {
    this.history.push(this.currentData);

    this.currentData = item;

    this.refresh();

    if (this.onNavigate) this.onNavigate(item, "forward");
  }

  /**
   * Navigate back to the previous item.
   */
  navigateBack() {
    if (this.history.length > 0) {
      this.currentData = this.history.pop();

      this.refresh();

      if (this.onNavigate) this.onNavigate(this.currentData, "back");
    }
  }

  /**
   * Refresh the list display.
   */
  refresh() {
    if (!this.currentData) return;

    this.headerContent.clear();

    const headerRow = new UIRow();

    headerRow.dom.style.cssText = "display:flex;align-items:center;gap:10px;";

    if (this.history.length > 0) {
      const backBtn = new UIIcon("arrow_back");

      backBtn.addClass("NavigableList-back");

      backBtn.dom.style.cursor = "pointer";

      backBtn.onClick(() => this.navigateBack());

      headerRow.add(backBtn);
    }

    const title = new UIText(`Active: ${this.getTitle(this.currentData)}`);

    title.addClass("NavigableList-title");

    headerRow.add(title);

    this.headerContent.add(headerRow);

    this.content.clear();

    const children = this.getChildren(this.currentData);

    if (children.length === 0) {
      const emptyMsg = new UIText(this.emptyMessage);

      emptyMsg.addClass("NavigableList-empty");

      this.content.add(emptyMsg);
    } else {
      children.forEach((child) => {
        const item = this.renderItem(child, this);

        this.content.add(item);
      });
    }
  }

  /**
   * Default item renderer.
   * @param {Object} item - The item data.
   * @param {NavigableList} list - Reference to this list.
   * @returns {UIDiv} The rendered item element.
   */
  defaultRenderItem(item, list) {
    const row = new UIDiv();

    row.addClass("NavigableList-item");

    row.dom.style.cssText =
      "display:flex;align-items:center;justify-content:space-between;padding:0.5rem 1rem;cursor:pointer;";

    const label = new UIText(this.getLabel(item));

    label.addClass("NavigableList-item-label");

    row.add(label);

    const children = this.getChildren(item);

    if (children.length > 0) {
      const arrow = new UIIcon("chevron_right");

      arrow.addClass("Button");

      row.add(arrow);
    }

    row.onClick(() => {
      if (this.onItemClick) {
        this.onItemClick(item, list);
      } else if (children.length > 0) {
        this.navigateTo(item);
      }
    });

    return row;
  }

  /**
   * Get the DOM element.
   * @returns {UIDiv} The panel element.
   */
  getElement() {
    return this.panel;
  }
}

/**
 * @typedef {import('../base/ui.js').UIElement} UIElement
 * @typedef {import('../base/ui.js').UIDiv} UIDiv
 * @typedef {import('../base/ui.js').UIText} UIText
 * @typedef {import('../base/ui.js').UIButton} UIButton
 * @typedef {import('../base/ui.js').UIInput} UIInput
 * @typedef {import('../base/ui.js').UIRow} UIRow
 * @typedef {import('../base/ui.js').UIIcon} UIIcon
 * @typedef {import('../base/ui.js').UICheckbox} UICheckbox
 * @typedef {import('../base/ui.js').UISelect} UISelect
 * @typedef {import('../base/ui.js').UINumber} UINumber
 * @typedef {import('../base/ui.js').UIPanel} UIPanel
 * @typedef {import('../base/ui.js').UIProgress} UIProgress
 * @typedef {import('../base/ui.js').UITextArea} UITextArea
 * @typedef {import('../base/ui.js').UITabbedPanel} UITabbedPanel
 * @typedef {import('../base/ui.js').UIImage} UIImage
 * @typedef {import('../base/ui.js').UISVG} UISVG
 * @typedef {import('./FloatingPanel.js').FloatingPanel} FloatingPanel
 * @typedef {import('./CollapsiblePanel.js').CollapsiblePanel} CollapsiblePanel
 * @typedef {import('./CollapsibleSection.js').CollapsibleSection} CollapsibleSection
 */

/**
 * @typedef {Object} FloatingPanelOptions
 * @property {string} [title] - Panel title
 * @property {string} [icon] - Material icon name
 * @property {boolean} [startMinimized] - Start in minimized state
 * @property {boolean} [closable] - Allow closing
 * @property {boolean} [resizable] - Allow resizing
 * @property {object} [context] - App context (layoutManager resolved from context.layoutManager)
 * @property {object} [layoutManager] - LayoutManager instance (overrides context.layoutManager)
 * @property {string} [workspaceTabId] - When set with layoutManager, dock pins add this tab to a workspace
 * @property {string} [workspaceTabLabel] - Tab label when docking (defaults to title or id)
 * @property {{ left?: function, bottom?: function, right?: function }} [dock] - Custom dock handlers (overrides workspace wiring)
 */

/**
 * @typedef {Object} CollapsiblePanelOptions
 * @property {string} [icon] - Material icon name
 * @property {string} [title] - Panel title
 * @property {Object} [position] - Position with top/bottom/left/right
 * @property {number|null} [badgeCount] - Badge count for notifications
 */

/**
 * @typedef {Object} NavigableListOptions
 * @property {Function} [onItemClick] - Callback when item clicked (item, list) => void
 * @property {Function} [onNavigate] - Callback on navigation (item, direction) => void
 * @property {Function} [renderItem] - Custom item renderer (item, list) => UIElement
 * @property {Function} [getChildren] - Get children from item (item) => array
 * @property {Function} [getLabel] - Get label from item (item) => string
 * @property {Function} [getTitle] - Get title from item (item) => string
 * @property {string} [emptyMessage] - Message when no items
 * @property {string} [icon] - Header icon name
 */

/**
 * @typedef {Object} SpreadsheetOptions
 * @property {Array<Array<any>>} [data] - Initial data
 * @property {Array<{header: string, type?: string}>} [columnConfig] - Column configuration
 * @property {Function} [columnNameMapper] - Map column names
 * @property {string} [height] - Container height
 * @property {string} [width] - Container width
 * @property {string} [minHeight] - Minimum container height (e.g. in flex layouts)
 */

/**
 * Collection of factory methods for creating UI components.
 * Use `UIComponents.methodName()` to create components.
 * 
 * @example
 * import { UIComponents } from 'aeco';
 * 
 * const panel = UIComponents.floatingPanel({ title: 'My Panel' });
 * const row = UIComponents.row().gap('1rem');
 * row.add(UIComponents.button('Click me'));
 */
export class Components {
  /**
   * Create a div element
   * @returns {UIDiv}
   */
  static div() {
    return new UIDiv();
  }

  /**
   * Center a component by adding centered class
   * @param {UIElement} component - Component to center
   * @returns {UIElement}
   */
  static center(component) {
    component.addClass("centered");

    return component;
  }

  /**
   * Create an h1 heading
   * @param {string} [text=''] - Heading text
   * @returns {UIText}
   */
  static h1(text = "") {
    return new UIH1(text);
  }

  /**
   * Create an h2 heading
   * @param {string} [text=''] - Heading text
   * @returns {UIText}
   */
  static h2(text = "") {
    return new UIH2(text);
  }

  /**
   * Create an h3 heading
   * @param {string} [text=''] - Heading text
   * @returns {UIText}
   */
  static h3(text = "") {
    return new UIH3(text);
  }

  /**
   * Create an h4 heading
   * @param {string} [text=''] - Heading text
   * @returns {UIText}
   */
  static h4(text = "") {
    return new UIH4(text);
  }

  /**
   * Create an h5 heading
   * @param {string} [text=''] - Heading text
   * @returns {UIText}
   */
  static h5(text = "") {
    return new UIH5(text);
  }

  /**
   * Create an h6 heading
   * @param {string} [text=''] - Heading text
   * @returns {UIText}
   */
  static h6(text = "") {
    return new UIH6(text);
  }

  /**
   * Create a paragraph element
   * @param {string} [text=''] - Paragraph text
   * @returns {UIText}
   */
  static paragraph(text = "") {
    return new UIParagraph(text);
  }

  /**
   * Creates a markdown component that renders markdown text with enhancements.
   * @param {string} [text=''] - The markdown text to render
   * @param {Object} [options={}] - Options for rendering
   * @param {Function} [options.highlightCallback] - Callback for code highlighting
   * @returns {UIDiv} The rendered markdown component
   */
  static markdown(text = "", options = {}) {
    const { html } = simpleMarkdownToHtml(text);

    const div = new UIDiv();

    div.setInnerHTML(html);

    div.addClass('Markdown');

    enhanceContainer(div.dom, options.highlightCallback || null);

    const codeBlocks = div.dom.querySelectorAll('pre code');

    codeBlocks.forEach((block) => {
      hljs.highlightElement(block);
    });

    return div;
  }

  /**
   * Creates a spinner component.
   * @param {Object} options - Options for the spinner.
   * @param {string} options.text - Text to display with the spinner.
   * @returns {UISpinner} The spinner component.
   */
  static spinner(options = {}) {
    return new UISpinner(options);
  }

  static tooltip(text = '', options = {}) {
    return new UITooltip(text, options);
  }

  /**
   * Creates a node editor component.
   * @param {Object} nodes - The nodes configuration.
   * @returns {Nodes} The nodes component.
   */
  static nodes(nodes) {
    return new Nodes(nodes);
  }

  /**
   * Renders a Gantt chart.
   * @param {Object} context - The application context.
   * @param {Object} tasksData - The tasks data.
   * @param {Object} [options] - Optional `{ operators, onTaskRowClick, shouldRunSelectTaskOnRowClick }` for row-click behavior.
   */
  static gantt(context, tasksData, options) {
    const container = new UIDiv()
      .setStyle("position", ["relative"])
      .addClass("gantt");

    container.setId("GanttChartDIV");

    const jsganttView = new GanttComponent(context, options);

    jsganttView.render(tasksData, container);

    return container;
  }

  /**
   * Creates a text component.
   * @param {string} text - The text content.
   * @returns {UIText} The text component.
   */
  static text(text = "") {
    return new UIText(text);
  }

  /**
   * Creates a small text component.
   * @param {string} text - The text content.
   * @returns {UISmallText} The small text component.
   */
  static smallText(text = "") {
    return new UISmallText(text);
  }

  /**
   * Creates a title component.
   * @param {string} text - The title text.
   * @returns {UIText} The title component.
   */
  static title(text = "") {
    const element = new UIText(text);

    element.setClass("ws-section-title");

    return element;
  }

  /**
   * Create a disclaimer text element
   * @param {string} [text=''] - Disclaimer text
   * @returns {UIText}
   */
  static disclaimer(text = "") {
    const element = new UIText(text);

    element.setClass("disclaimer");

    return element;
  }

  /**
   * Create a listbox container
   * @returns {UIListbox}
   */
  static list() {
    return new UIListbox();
  }

  /**
   * Create a drag handle element
   * @param {string} [type='drag'] - Handle type
   * @returns {HTMLSpanElement}
   */
  static handle(type = "drag") {
    const handle = document.createElement("span");

    handle.className = `${type}-handle`;

    return handle;
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
   * Create a list item
   * @param {string} [text=''] - Item text
   * @returns {ListboxItem}
   */
  static listItem(text = "") {
    return new ListboxItem(text).addClass("Row");
  }

  /**
   * Create a badge element
   * @param {string} [text=''] - Badge text
   * @returns {UIText}
   */
  static badge(text = "") {
    const element = new UIText(text);

    element.setClass("Badge");

    return element;
  }

  /**
   * Create a select dropdown
   * @returns {UISelect}
   */
  static select() {
    return new UISelect();
  }

  /**
   * Create a flex row container
   * @returns {UIRow}
   */
  static row() {
    const row = new UIRow();

    row.setDisplay("flex");

    return row;
  }

  /**
   * Create a column layout container
   * @returns {UIDiv}
   */
  static column() {
    const column = new UIDiv();

    column.setClass("Column");

    return column;
  }

  /**
   * Create a material icon
   * @param {string} [name=''] - Material icon name
   * @returns {UIIcon}
   */
  static icon(name = "") {
    return new UIIcon(name);
  }

  /**
   * Create an operator button (icon with Operator class)
   * @param {string} [name=''] - Material icon name
   * @returns {UIIcon}
   */
  static operator(name = "") {
    const op = new UIDiv();

    op.addClass("Operator");

    const icon = Components.icon(name);

    op.add(icon);

    op.setIcon = (name) => {
      icon.setName(name);
    };

    return op;
  }

  /**
   * Create a link element
   * @param {string} [text=''] - Link text
   * @param {string} [path=''] - Link URL
   * @param {string} [icon] - Optional icon name
   * @param {boolean} [external=true] - Open in new tab
   * @returns {UILink}
   */
  static link(text = "", path = "", icon, external = true) {
    return new UILink(text, path, icon, external);
  }

  /**
   * Create an image element
   * @param {string} [path=''] - Image source path
   * @param {{width: string, height: string}} [size] - Optional size
   * @returns {UIImage}
   */
  static image(path = "", size) {
    const img = new UIImage(path);

    if (size) img.setsize(size.width, size.height);

    return img;
  }

  /**
   * Create an SVG element that loads from path
   * @param {string} [path=''] - SVG file path
   * @param {{width: string, height: string}} [size] - Optional size
   * @returns {UISVG}
   */
  static svg(path = "", size) {
    const svg = new UISVG(path);

    if (size) svg.setsize(size.width, size.height);

    return svg;
  }

  /**
   * Create a span element
   * @param {string} [text=''] - Span text content
   * @returns {UISpan}
   */
  static span(text = "") {
    const span = new UISpan();

    if (text) span.setTextContent(text);

    return span;
  }

  /**
   * Create a keyboard key element
   * @param {string} [key=''] - Key text
   * @returns {UISpan}
   */
  static kbd(key = "") {
    const kbd = new UISpan();

    kbd.setClass("kbd");

    kbd.setTextContent(key);

    return kbd;
  }

  /**
   * Create a horizontal divider
   * @returns {UIHorizontalRule}
   */
  static divider() {
    return new UIHorizontalRule();
  }

  /**
   * Create a vertical spacer
   * @param {string} [size='8px'] - Spacer height
   * @returns {UIDiv}
   */
  static spacer(size = "8px") {
    const spacer = new UIDiv();

    spacer.setHeight(size);

    return spacer;
  }

  /**
   * Create a horizontal spacer
   * @param {string} [size='8px'] - Spacer width
   * @returns {UISpan}
   */
  static hspacer(size = "8px") {
    const spacer = new UISpan();

    spacer.setWidth(size);

    spacer.dom.style.display = "inline-block";

    return spacer;
  }

  /**
   * Create a number input
   * @param {number} [value=0] - Initial value
   * @returns {UINumber}
   */
  static number(value = 0) {
    return new UINumber(value);
  }

  /**
   * Create an integer input
   * @param {number} [value=0] - Initial value
   * @returns {UIInteger}
   */
  static integer(value = 0) {
    return new UIInteger(value);
  }

  /**
   * Create a color picker
   * @returns {UIColor}
   */
  static color() {
    return new UIColor();
  }

  /**
   * Create a progress bar
   * @param {number} [value=0] - Initial progress value (0-100)
   * @returns {UIProgress}
   */
  static progress(value = 0) {
    return new UIProgress(value);
  }

  /**
   * Create a textarea
   * @returns {UITextArea}
   */
  static textarea() {
    return new UITextArea();
  }

  /**
   * Create a tabbed panel container
   * @returns {UITabbedPanel}
   */
  static tabbedPanel() {
    return new UITabbedPanel();
  }

  /**
   * Create a line break
   * @returns {UIBreak}
   */
  static lineBreak() {
    return new UIBreak();
  }

  static instructionLine(keyText, description) {
    const line = new UIRow();

    line.setClass("instruction-line");

    line.gap("8px");

    const kbd = Components.kbd(keyText);

    const desc = new UISpan();

    desc.setTextContent(description);

    desc.setClass("instruction-desc");

    line.add(kbd);

    line.add(desc);

    return line;
  }

  static instructionPanel(title, iconName, instructions = []) {
    const panel = new UIDiv();

    panel.setClass("instruction-panel");

    const header = new UIRow();

    header.setClass("instruction-header");

    header.gap("8px");

    const icon = new UIIcon(iconName);

    icon.setClass("instruction-icon");

    const titleText = new UIText(title);

    titleText.setClass("instruction-title");

    header.add(icon);

    header.add(titleText);

    panel.add(header);

    const content = new UIDiv();

    content.setClass("instruction-content");

    instructions.forEach(({ key, desc }) => {
      const line = Components.instructionLine(key, desc);

      content.add(line);
    });

    panel.add(content);

    return panel;
  }

  static labeledBoxItem(data, iconMap) {
    const item = new ListboxItem();

    item.setClass("workspace-menu-item");

    const checkbox = new UICheckbox(data.checked);

    const iconDiv = new UIDiv();

    iconDiv.setClass("workspace-menu-item-icon");

    const iconName = iconMap[data.id] || iconMap["default"];

    iconDiv.dom.innerHTML = `<span class="material-symbols-outlined">${iconName}</span>`;

    const label = new UIText(data.label);

    label.setClass("workspace-menu-item-label");

    const actions = new UIDiv();

    actions.setClass("workspace-menu-item-actions");

    item.add(checkbox);

    item.add(iconDiv);

    item.add(label);

    item.add(actions);

    return item;
  }

  /**
   * Create a date picker
   * @param {Date} [date] - Initial date
   * @returns {UIDatePicker}
   */
  static date(date) {
    return new UIDatePicker(date);
  }

  /**
   * Create a button
   * @param {string} [text=''] - Button text
   * @returns {UIButton}
   */
  static button(text = "") {
    return new UIButton(text);
  }

  /**
   * Create a text input
   * @returns {UIInput}
   */
  static input() {
    return new UIInput();
  }

  /**
   * Create a checkbox
   * @param {boolean} [checked=false] - Initial checked state
   * @returns {UICheckbox}
   */
  static checkbox(checked = false) {
    return new UICheckbox(checked).setClass("Kanban-card-checkbox");
  }

  /**
   * Create a panel container
   * @returns {UIPanel}
   */
  static panel() {
    return new UIPanel();
  }

  /**
   * Create a card element (panel with Kanban-card class)
   * @returns {UIPanel}
   */
  static card() {
    return new UIPanel().setClass("Kanban-card");
  }

  /**
   * Creates a floating panel component with minimize/maximize functionality.
   * @param {FloatingPanelOptions} [options={}] - Panel configuration
   * @returns {FloatingPanel} The floating panel component
   * @example
   * const panel = UIComponents.floatingPanel({
   *   title: 'My Panel',
   *   icon: 'info',
   *   startMinimized: false
   * });
   * panel.setContent(UIComponents.text('Hello'));
   * context.dom.appendChild(panel.dom);
   */
  static floatingPanel(options = {}) {
    const {
      context,
      layoutManager,
      workspaceTabId,
      workspaceTabLabel,
      dock,
      ...fpOptions
    } = options;

    const lm = layoutManager ?? context?.layoutManager;
    const mergedDock =
      dock ||
      (lm && workspaceTabId
        ? buildWorkspaceDockHandlers({
            layoutManager: lm,
            tabId: workspaceTabId,
            tabLabel: workspaceTabLabel ?? fpOptions.title,
          })
        : undefined);

    if (mergedDock) fpOptions.dock = mergedDock;

    return new FloatingPanel(fpOptions);
  }

  /**
   * Creates a basic panel container.
   * @param {Object} [options={}] - Panel configuration
   * @returns {BasePanel} The basic panel component
   */

  static basePanel(options = {}) {
    return new BasePanel(options);
  }

  /**
   * Creates a collapsible panel that shows a badge/button when collapsed
   * and expands to show full content when clicked.
   * @param {CollapsiblePanelOptions} [options={}] - Panel configuration
   * @returns {CollapsiblePanel} The collapsible panel component
   */
  static collapsiblePanel(options = {}) {
    return new CollapsiblePanel(options);
  }

  /**
   * Create a collapsible section
   * @param {Object} [options={}] - Section options
   * @param {string} [options.title] - Section title
   * @param {boolean} [options.collapsed] - Start collapsed
   * @param {string} [options.icon] - Section icon
   * @param {string} [options.className] - Section class name
   * @returns {CollapsibleSection}
   */
  static collapsibleSection(options = {}) {
    return new CollapsibleSection(options);
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
    height = "100%",
    width = "100%",
    minHeight,
  }) {
    return new SpreadsheetUIComponent({
      data,
      columnConfig,
      columnNameMapper,
      height,
      width,
      minHeight,
    });
  }

  /**
   * Create a toolbar button
   * @param {string} resourcePath - Base resource path
   * @param {string} name - Button name/title
   * @param {string} icon - Icon filename (without extension)
   * @param {Function} onClick - Click handler
   * @returns {UIButton}
   */
  static toolbarButton(resourcePath, name, icon, onClick) {
    return new ToolbarButton(resourcePath, name, icon, onClick);
  }

  /**
   * Create a toolbar group
   * @param {string} name - Group name/id
   * @returns {UIPanel}
   */
  static toolBarGroup(name) {
    return new ToolBarGroup(name);
  }

  /**
   * Creates a navigable list component with back/forth navigation.
   * Useful for hierarchical data browsing.
   * @param {NavigableListOptions} [options={}] - List configuration
   * @returns {NavigableList} The navigable list component
   * @example
   * const list = UIComponents.navigableList({
   *   onItemClick: (item) => console.log('Selected:', item),
   *   getLabel: (item) => item.name,
   *   getChildren: (item) => item.children || []
   * });
   * list.setData(treeData);
   */
  static navigableList(options = {}) {
    return new NavigableList(options);
  }

  /**
   * Create a split container for resizable layouts
   * @param {'horizontal'|'vertical'} direction - Split direction
   * @param {UIElement[]} [children=[]] - Child elements
   * @returns {UIDiv}
   */
  static splitContainer(direction, children = []) {
    const container = new UIDiv();

    container.setClass("split-container");

    container.dom.style.display = "flex";

    container.dom.style.flexDirection =
      direction === "horizontal" ? "row" : "column";

    container.dom.style.flex = "1";

    container.dom.style.gap = "0";

    children.forEach((child) => {
      if (child.dom) {
        container.add(child);
      } else {
        container.dom.appendChild(child);
      }
    });

    return container;
  }

  static flexResizer(splitNode, childIndex) {
    const resizer = new UIDiv();

    resizer.setClass(
      `resizer resizer-${splitNode.direction === "horizontal" ? "v" : "h"}`
    );

    resizer.dom.dataset.splitId = splitNode.id || "root";

    resizer.dom.dataset.childIndex = childIndex;

    resizer.dom.dataset.direction = splitNode.direction;

    return resizer;
  }
}

function ToolbarButton(resourcePath, name, icon, onClick) {
  const buttonIcon = document.createElement("img");

  buttonIcon.title = name;

  buttonIcon.src = `${resourcePath}images/${icon}.svg`;

  const button = new UIButton();

  button.dom.className = "Button Selected";

  button.dom.appendChild(buttonIcon);

  button.onClick(onClick);

  return button;
}

function ToolBarGroup(name) {
  const group = new UIPanel();

  group.setId(name);

  group.setClass("ToolbarGroup");

  return group;
}

export const ICONS = {
  home: "home",
  camera: "photo_camera",
  thumb_up: "thumb_up",
  search: "search",
  settings: "settings",
  close: "close",
  menu: "menu",
  arrow_back: "arrow_back",
  arrow_forward: "arrow_forward",
  chevron_right: "chevron_right",
  chevron_left: "chevron_left",
  check: "check",
  clear: "clear",
  play_arrow: "play_arrow",
  pause: "pause",
  stop: "stop",
  refresh: "refresh",
  download: "download",
  upload: "upload",
  add: "add",
  remove: "remove",
  edit: "edit",
  info: "info",
  warning: "warning",
  error: "error",
  help: "help",
  expand_more: "expand_more",
  expand_less: "expand_less",
  star: "star",
  star_border: "star_border",
  toggle_on: "toggle_on",
  toggle_off: "toggle_off",
  drag_handle: "drag_handle",
  double_arrow: "double_arrow",
  download_for_offline: "download_for_offline",
  download_done: "download_done",
  download_outlined: "download_outlined",
  download_sharp: "download_sharp",
  cloud_sync: "cloud_sync",
  cloud_upload: "cloud_upload",
  cloud_download: "cloud_download",
  select: "arrow_selector_tool",
}

export { BasePanel, SimpleFloatingWindow } from "../../../drawUI/BasePanel.js";
