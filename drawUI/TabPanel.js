import { DrawUI } from "./index.js";

import { FloatingPanel } from "./FloatingPanel.js";

import { buildWorkspaceDockHandlers, resolveFloatingMountElement } from "./utils/workspacePanelDock.js";

import { createPanelHeaderChrome, createPanelFooterRow } from "./panelChrome.js";

import { getLayoutManagerFromContext } from "../src/ui/utils/layoutManagerAccess.js";

/**
 * @typedef {'left' | 'right' | 'bottom'} LayoutPosition
 * Position of the tab panel in the layout.
 */

/**
 * @typedef {Object} TabPanelOptions
 * @property {Object} context - Application context (`context.ui.model.layoutManager`).
 * @property {Object} [operators] - Integration with operators.
 * @property {LayoutPosition} [position='right'] - Layout position: 'left', 'right', or 'bottom'.
 * @property {string} tabId - Unique identifier for the tab.
 * @property {string} tabLabel - Display label shown in the tab header.
 * @property {string} [icon] - Material icon name for the header.
 * @property {string} [title] - Panel title displayed in the header.
 * @property {Object} [panelStyles={}] - Inline styles applied to the tab page root when the tab is added (`this.panel`, same element as tab id).
 * @property {boolean} [showHeader=true] - Whether to display the panel header.
 * @property {boolean} [autoShow=false] - Whether to show the tab automatically on creation.
 * @property {string} [moduleId] - If set with layoutManager, registers the tab and binds `bindToggle` using UI config.
 * @property {string} [toggleElementId] - Explicit toolbar/control DOM id (overrides moduleId resolution).
 * @property {boolean} [floatable=false] - Show undock on the workspace tab label (needs layoutManager).
 * @property {string} [minimizedImageSrc] - Optional image source for minimized floating window pill.
 */

/**
 * TabPanel - A panel component that integrates with the LayoutManager's tabbed panels.
 * 
 * Unlike BasePanel which attaches to a parentId element, TabPanel registers itself
 * as a tab in the left, right, or bottom layout panels managed by LayoutManager.
 * 
 * @example
 * // Create a settings panel in the right tab area
 * const settingsPanel = new TabPanel({
 *   context,
 *   operators,
 *   position: 'right',
 *   tabId: 'settings',
 *   tabLabel: 'Settings',
 *   icon: 'settings',
 *   title: 'Application Settings'
 * });
 * 
 * // Add content to the panel
 * settingsPanel.content.add(DrawUI.text('Settings content here'));
 * 
 * // Show the panel (adds tab and opens panel)
 * settingsPanel.show();
 * 
 * // Toggle visibility
 * settingsPanel.toggle();
 * 
 * // Hide the panel (removes tab)
 * settingsPanel.hide();
 * 
 * @example
 * // Bind a button to toggle the panel
 * settingsPanel.bindTo('SettingsButton');
 */
export class TabPanel {
  /**
   * Create a new TabPanel.
   * 
   * @param {TabPanelOptions} options - Configuration options.
   */
  constructor(options = {}) {
    const {
      context,
      operators,
      position = 'right',
      tabId,
      tabLabel,
      icon,
      title,
      panelStyles = {},
      showHeader = true,
      autoShow = false,
      moduleId,
      toggleElementId,
      floatable = false,
      minimizedImageSrc,
    } = options;

    if (!tabId) {
      throw new Error('TabPanel requires a tabId');
    }

    if (!tabLabel) {
      throw new Error('TabPanel requires a tabLabel');
    }

    /** @type {Object} Application context */
    this.context = context;

    /** @type {Object} Operators reference */
    this.operators = operators;

    /** @type {LayoutPosition} Panel position in layout */
    this.position = position;

    /** @type {string} Unique tab identifier */
    this.tabId = tabId;

    /** @type {string} Tab display label */
    this.tabLabel = tabLabel;

    /** @type {string|undefined} Header icon */
    this.icon = icon;

    /** @type {string|undefined} Header title */
    this.title = title || tabLabel;

    /** @type {string|null} Minimized floating pill image source */
    this.minimizedImageSrc = minimizedImageSrc || null;

    /** @type {boolean} Whether panel is currently shown as a tab */
    this._isShown = false;

    /** @type {Function|null} Cleanup function for bound toggles */
    this._unbindToggle = null;

    /** @type {Function|null} Signal subscription cleanup */
    this._signalCleanup = null;

    /** @type {Function|null} */
    this._floatHandlerCleanup = null;

    /** @type {object|null} */
    this._detachedFloatingPanel = null;

    /** @type {{ left: string, top: string, width: string, height: string }|null} */
    this._savedFloatGeometry = null;

    /** @type {boolean} */
    this._floatable = floatable;

    /** @type {Object} */
    this.panelStyles = panelStyles;

    this.panel = DrawUI.div();
    this.panel.addClass('TabPanel');

    this.header = DrawUI.div();
    this.header.addClass('TabPanelHeader');

    if (showHeader) {
      this._buildHeader();
      this.panel.add(this.header);
    }

    this.content = DrawUI.div();
    this.content.addClass('PanelContent');
    this.panel.add(this.content);

    this.footer = DrawUI.row();
    this.footer.addClass('TabPanelFooter');
    this.panel.add(this.footer);

    this._subscribeToSignals();

    const layoutManagerForFloat = this.layoutManager;
    if (floatable && layoutManagerForFloat) {
      this._floatHandlerCleanup = layoutManagerForFloat.registerTabFloatHandler(
        this.position,
        this.tabId,
        () => this.detachToFloatingWindow(),
      );
    }

    if (autoShow) {
      this.show();
    }
  }

  /**
   * Get the LayoutManager instance from context.
   * @returns {Object|null} The LayoutManager or null if not available.
   * @private
   */
  get layoutManager() {
    return getLayoutManagerFromContext(this.context);
  }

  /**
   * Build the header content with icon and title.
   * @private
   */
  _buildHeader() {
    const { headerRow, actionsRow } = createPanelHeaderChrome({
      title: this.title,
      iconName: this.icon,
      alwaysActionsColumn: true,
    });
    this.headerActions = actionsRow;
    this.header.add(headerRow);
  }

  /**
   * Subscribe to LayoutManager signals for lifecycle hooks.
   * @private
   */
  _subscribeToSignals() {
    const ctx = this.context;
    const signals = ctx && ctx.signals;
    if (!signals) return;

    const unsubs = [];

    const onTabChanged = (payload) => {
      if (payload.position === this.position && payload.id === this.tabId) {
        this.onTabSelected();
      } else if (payload.position === this.position && this._isShown) {
        this.onTabDeselected();
      }
    };

    const onTabRemoved = (payload) => {
      if (payload.position === this.position && payload.id === this.tabId) {
        this._isShown = false;
        this.onHide();
      }
    };

    const sub = (name, handler) => {
      const sig = signals[name];
      if (sig && typeof sig.add === 'function') {
        sig.add(handler);
        unsubs.push(() => {
          if (sig && typeof sig.remove === 'function') {
            sig.remove(handler);
          }
        });
      }
    };

    sub('layoutTabChanged', onTabChanged);
    sub('layoutTabRemoved', onTabRemoved);

    this._signalCleanup = () => {
      for (const u of unsubs) u();
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Show the panel by adding it as a tab to the layout.
   * Opens the panel and selects the tab.
   * 
   * @param {Object} [options={}] - Show options.
   * @param {boolean} [options.select=true] - Whether to select the tab after adding.
   * @returns {TabPanel} This instance for chaining.
   * 
   * @example
   * panel.show(); // Add tab and open panel
   * panel.show({ select: false }); // Add tab but don't select it
   */
  show(options = {}) {
    const { select = true } = options;
    const lm = this.layoutManager;
    if (!lm) {
      console.warn('TabPanel: LayoutManager not available');
      return this;
    }

    if (this._detachedFloatingPanel) {
      return this;
    }

    if (lm.hasTab(this.position, this.tabId)) {
      this._isShown = true;
      if (select) {
        lm.selectTab(this.position, this.tabId);
      }
      this.onShow();
      return this;
    }

    const open = select;
    lm.addTab(this.position, this.tabId, this.tabLabel, this.panel, {
      open,
      replace: true,
      floatable: this._floatable,
      panelStyles: this.panelStyles,
    });
    
    if (select) {
      lm.selectTab(this.position, this.tabId);
    }

    this._isShown = true;
    this.onShow();
    return this;
  }

  /**
   * Hide the panel by removing its tab from the layout.
   * 
   * @param {Object} [options={}] - Hide options.
   * @param {boolean} [options.closeIfEmpty=false] - Close the panel if no tabs remain.
   * @returns {TabPanel} This instance for chaining.
   * 
   * @example
   * panel.hide(); // Remove tab
   * panel.hide({ closeIfEmpty: true }); // Remove tab and close panel if empty
   */
  hide(options = {}) {
    const { closeIfEmpty = false } = options;
    const lm = this.layoutManager;
    if (!lm) return this;

    lm.removeTab(this.position, this.tabId, { closeIfEmpty });
    this._isShown = false;
    this.onHide();
    return this;
  }

  /**
   * Toggle the panel visibility.
   * If shown and selected, closes the panel. Otherwise, shows and selects it.
   * 
   * @returns {TabPanel} This instance for chaining.
   * 
   * @example
   * toggleButton.onClick(() => panel.toggle());
   */
  /**
   * Remove this tab from the workspace and show the same content in a FloatingPanel (round-trip with dock buttons).
   * @returns {FloatingPanel|null}
   */
  detachToFloatingWindow() {
    const lm = this.layoutManager;
    if (!lm) return null;

    if (this._floatHandlerCleanup) {
      this._floatHandlerCleanup();
      this._floatHandlerCleanup = null;
    }

    const fp = new FloatingPanel({
      title: this.title,
      icon: this.icon,
      minimizedImageSrc: this.minimizedImageSrc,
      closable: true,
      sourceTabPanel: this,
      dock: buildWorkspaceDockHandlers({
        layoutManager: lm,
        tabId: this.tabId,
        tabLabel: this.tabLabel,
      }),
    });

    lm.removeTab(this.position, this.tabId, { closeIfEmpty: true });
    this._isShown = false;
    this.onHide();

    fp.content.appendChild(this.panel.dom);

    const mountEl = resolveFloatingMountElement(lm);
    if (mountEl) {
      fp.mountFloating(mountEl);
      if (this._savedFloatGeometry) {
        const { left, top, width, height } = this._savedFloatGeometry;
        if (left) fp.dom.style.left = left;
        if (top) fp.dom.style.top = top;
        if (width) fp.dom.style.width = width;
        if (height) fp.dom.style.height = height;
      }
    }
    this._detachedFloatingPanel = fp;
    return fp;
  }

  restoreContentFromFloatingPanel(floatingPanel, layoutManager, position, tabId, tabLabel) {
    const lm = layoutManager;
    if (!lm || !floatingPanel) {
      return;
    }
    const floatContent = floatingPanel.content;
    if (!floatContent) {
      return;
    }
    this._detachedFloatingPanel = null;
    this.position = position;
    if (this._floatHandlerCleanup) {
      this._floatHandlerCleanup();
      this._floatHandlerCleanup = null;
    }
    if (this.panel.dom && floatContent.contains(this.panel.dom)) {
      floatContent.removeChild(this.panel.dom);
    } else {
      while (floatContent.firstChild) {
        this.content.dom.appendChild(floatContent.firstChild);
      }
    }
    const label = tabLabel != null && tabLabel !== '' ? tabLabel : this.tabLabel;
    lm.addTab(position, tabId, label, this.panel, {
      open: true,
      replace: true,
      floatable: this._floatable,
      panelStyles: this.panelStyles,
    });
    lm.selectTab(position, tabId, { open: true });
    this._isShown = true;
    this.onShow();
    this._floatHandlerCleanup = lm.registerTabFloatHandler(
      position,
      tabId,
      () => this.detachToFloatingWindow(),
    );
    floatingPanel._sourceTabPanel = null;
    floatingPanel._cleanupMinimizedIcon();
    const fpDom = floatingPanel.dom;
    if (fpDom) {
      const { left, top, width, height } = fpDom.style;
      if (left || top) this._savedFloatGeometry = { left, top, width, height };
      if (fpDom.parentNode) fpDom.parentNode.removeChild(fpDom);
    }
  }

  toggle() {
    const lm = this.layoutManager;
    if (!lm) return this;

    if (this._isShown) {
      // Check if we should close or just add (if not shown yet in this session)
      const isOpen = lm.isWorkspaceOpen(this.position);
      const isSelected = lm.isTabSelected(this.position, this.tabId);
      
      if (isOpen && isSelected) {
        lm.closeWorkspace(this.position);
      } else {
        lm.selectTab(this.position, this.tabId, { open: true });
      }
    } else {
      this.show();
    }
    return this;
  }

  /**
   * Select this tab without hiding other tabs.
   * Opens the panel if closed.
   * 
   * @returns {TabPanel} This instance for chaining.
   */
  select() {
    const lm = this.layoutManager;
    if (!lm) return this;

    if (!this._isShown) {
      this.show();
    } else {
      lm.selectTab(this.position, this.tabId, { open: true });
    }
    return this;
  }

  /**
   * Check if this tab is currently visible (shown in the layout).
   * 
   * @returns {boolean} True if the tab exists in the layout.
   */
  isVisible() {
    return this._isShown;
  }

  /**
   * Check if this tab is currently selected (active).
   * 
   * @returns {boolean} True if the tab is selected.
   */
  isSelected() {
    const lm = this.layoutManager;
    if (!lm) return false;
    return lm.isTabSelected(this.position, this.tabId);
  }

  /**
   * Bind a DOM element to toggle this panel.
   * Creates bidirectional binding: click toggles panel, Active class syncs with state.
   * 
   * @param {string|HTMLElement} elementOrId - Element or its ID to bind.
   * @returns {TabPanel} This instance for chaining.
   * 
   * @example
   * panel.bindTo('SettingsButton');
   * 
   * @example
   * const btn = document.getElementById('my-btn');
   * panel.bindTo(btn);
   */
  bindTo(elementOrId) {
    if (this._unbindToggle) {
      this._unbindToggle();
      this._unbindToggle = null;
    }

    const lm = this.layoutManager;
    if (!lm) return this;

    lm.ensureTab(this.position, this.tabId, this.tabLabel, this.panel, {
      open: false,
      replace: false,
      floatable: this._floatable,
      panelStyles: this.panelStyles,
    });
    this._isShown = lm.hasTab(this.position, this.tabId);

    this._unbindToggle = lm.bindToggle(elementOrId, this.position, this.tabId);
    return this;
  }

  /**
   * Unbind any previously bound toggle element.
   * 
   * @returns {TabPanel} This instance for chaining.
   */
  unbind() {
    if (this._unbindToggle) {
      this._unbindToggle();
      this._unbindToggle = null;
    }
    return this;
  }

  /**
   * Update the tab label.
   * 
   * @param {string} label - New label text.
   * @returns {TabPanel} This instance for chaining.
   * 
   * @example
   * panel.setLabel(`Items (${count})`);
   */
  setLabel(label) {
    this.tabLabel = label;
    const lm = this.layoutManager;
    if (lm && this._isShown) {
      lm.setTabLabel(this.position, this.tabId, label);
    }
    return this;
  }

  /**
   * Clear the content area.
   * 
   * @returns {TabPanel} This instance for chaining.
   */
  clearContent() {
    this.content.clear();
    return this;
  }

  /**
   * Set new content, replacing existing content.
   * 
   * @param {HTMLElement|{dom: HTMLElement}} content - New content element.
   * @returns {TabPanel} This instance for chaining.
   */
  setContent(content) {
    this.content.clear();
    this.content.add(content);
    return this;
  }

  /**
   * Add content to the panel without clearing existing content.
   * 
   * @param {HTMLElement|{dom: HTMLElement}} content - Content to add.
   * @returns {TabPanel} This instance for chaining.
   */
  addContent(content) {
    this.content.add(content);
    return this;
  }

  /**
   * Add an action element to the header.
   * 
   * @param {HTMLElement|{dom: HTMLElement}} action - Action element (button, icon, etc.)
   * @returns {TabPanel} This instance for chaining.
   */
  addHeaderAction(action) {
    if (this.headerActions) {
      this.headerActions.add(action);
    }
    return this;
  }

  /**
   * Set footer content.
   * 
   * @param {Array<HTMLElement|{dom: HTMLElement}>} elements - Footer elements.
   * @param {string} [justify='flex-end'] - CSS justify-content value.
   * @returns {TabPanel} This instance for chaining.
   */
  setFooter(elements = [], justify = 'flex-end') {
    this.footer.clear();
    this.footer.add(createPanelFooterRow(elements, justify));
    return this;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // LIFECYCLE HOOKS (Override in subclasses)
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Called when the panel is shown (tab added to layout).
   * Override in subclasses to handle show events.
   */
  onShow() {
    // Override in subclass
  }

  /**
   * Called when the panel is hidden (tab removed from layout).
   * Override in subclasses to handle hide events.
   */
  onHide() {
    // Override in subclass
  }

  /**
   * Called when this tab becomes selected (active).
   * Override in subclasses to handle selection events.
   */
  onTabSelected() {
    // Override in subclass
  }

  /**
   * Called when another tab is selected (this tab becomes inactive).
   * Override in subclasses to handle deselection events.
   */
  onTabDeselected() {
    // Override in subclass
  }

  /**
   * Clean up resources and remove the panel.
   */
  destroy() {
    this.unbind();
    if (this._floatHandlerCleanup) {
      this._floatHandlerCleanup();
      this._floatHandlerCleanup = null;
    }
    if (this._signalCleanup) {
      this._signalCleanup();
      this._signalCleanup = null;
    }
    this.hide();
  }
}

export default TabPanel;
