import {
  UIIcon,
  UIDiv,
  UIRow,
  UIText,
} from "./ui.js";

/**
 * A navigable list component with back/forth navigation support.
 * Manages history stack and renders items with optional children navigation.
 */
class DrillDownUpList {
  constructor(options = {}) {
    this.history = [];

    this.currentData = null;

    this.rootData = null;

    // Callbacks
    this.onItemClick = options.onItemClick || null;

    this.onNavigate = options.onNavigate || null;

    this.renderItem = options.renderItem || this.defaultRenderItem.bind(this);

    this.getChildren = options.getChildren || ((item) => item.children || []);

    this.getLabel =
      options.getLabel || ((item) => item.name || item.label || "Item");

    this.getTitle = options.getTitle || ((item) => item.name || "Items");

    this.emptyMessage = options.emptyMessage || "No items";

    // Build UI
    this.panel = new UIDiv();

    this.panel.addClass("NavigableList");

    // Header
    this.header = new UIDiv().addClass("PanelHeader");

    this.header.addClass("Header");

    this.header.dom.style.cssText =
      "display:flex;align-items:center;gap:10px;padding:1rem;";

    this.headerContent = new UIDiv();

    this.header.add(this.headerContent);

    this.panel.add(this.header);

    // Content
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

    // Update header
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

    // Update content
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
   * @param {DrillDownUpList} list - Reference to this list.
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

export { DrillDownUpList };