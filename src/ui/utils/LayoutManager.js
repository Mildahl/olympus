import { UIDiv, UIButton, UIIcon, UIRow } from '../../../drawUI/ui.js';

import { resolveModuleToggleId } from './resolveModuleToggleId.js';

/** @param {any} tab - UITab or tab-like entry from UITabbedPanel */
function workspaceTabId(tab) {
  if (!tab) return null;
  if (tab.dom && tab.dom.id) return tab.dom.id;
  if (tab.id) return tab.id;
  return null;
}

/**
 * @typedef {'left' | 'right' | 'bottom'} LayoutPosition
 * Position of a layout panel in the UI.
 */

/**
 * @typedef {Object} AddTabOptions
 * @property {boolean} [open=true] - Whether to open the panel after adding the tab.
 * @property {boolean} [replace=true] - Whether to replace an existing tab with the same ID.
 * @property {boolean} [floatable=false] - Show undock control on the workspace tab label (TabPanel float).
 * @property {Object<string, string>} [panelStyles] - Inline styles for the tab page root (`.Panels` direct child; for TabPanel this is `this.panel`).
 */

/**
 * @typedef {Object} RemoveTabOptions
 * @property {boolean} [closeIfEmpty=false] - Whether to close the panel if no tabs remain.
 */

/**
 * @typedef {Object} SelectTabOptions
 * @property {boolean} [open=true] - Whether to open the panel when selecting the tab.
 */

/**
 * @typedef {Object} BindToggleOptions
 * @property {boolean} [syncActive=true] - Whether to sync the Active class on the element.
 */

/**
 * @typedef {{ moduleId: string, tabIds: string[] }} WorkspaceTabGroupByModule
 */

/**
 * @typedef {Object} LayoutManagerConfig
 * @property {number} [leftWorkspaceWidth=300] - Default width for the left workspace in pixels.
 * @property {number} [rightWorkspaceWidth=300] - Default width for the right workspace in pixels.
 * @property {number} [bottomWorkspaceHeight=200] - Default height for the bottom workspace in pixels.
 * @property {number} [topWorkspaceHeight=36] - Height of the top bar row in pixels (grid row 1).
 * @property {number} [minPanelSize=100] - Minimum workspace size in pixels.
 * @property {number} [resizerSize=4] - Size of the resizer handle in pixels.
 * @property {WorkspaceTabGroupByModule[]} [leftWorkspaceTabGroupsByModule=[]] - Tab order groups for `reorderLeftWorkspaceTabsByModuleOrder` (from `config.ui.layout`).
 * @property {WorkspaceTabGroupByModule[]} [bottomWorkspaceTabGroupsByModule=[]] - Tab order groups for `reorderBottomWorkspaceTabsByModuleOrder` (from `config.ui.layout`).
 */

/** @type {LayoutManagerConfig} */
const DEFAULT_CONFIG = {
  leftWorkspaceWidth: 300,
  rightWorkspaceWidth: 300,
  bottomWorkspaceHeight: 200,
  topWorkspaceHeight: 36,
  minPanelSize: 100,
  resizerSize: 4,
  leftWorkspaceTabGroupsByModule: [],
  bottomWorkspaceTabGroupsByModule: [],
};

/**
 * @param {unknown} raw
 * @returns {WorkspaceTabGroupByModule[]}
 */
function normalizeWorkspaceTabGroupsByModule(raw) {
  if (!raw || !Array.isArray(raw)) {
    return [];
  }

  const result = [];
  for (let i = 0; i < raw.length; i++) {
    const entry = raw[i];
    if (!entry || typeof entry.moduleId !== 'string') {
      continue;
    }

    const tabIds = Array.isArray(entry.tabIds)
      ? entry.tabIds.filter(function (id) {
          return typeof id === 'string';
        })
      : [];

    if (tabIds.length === 0) {
      continue;
    }

    result.push({ moduleId: entry.moduleId, tabIds: tabIds });
  }

  return result;
}

class LayoutManager {
  constructor(options = {}) {
    this.config = { ...DEFAULT_CONFIG, ...options };

    this.container = null;

    this.tabbedWorkspaces = null;

    this.context = null;
    this._patchedTabbedWorkspaces = new WeakSet();

    this.workspaces = {
      top: null,
      left: null,
      right: null,
      bottom: null,
      viewport: null
    };

    this.resizers = {
      left: null,
      right: null,
      bottom: null
    };

    this.state = {
      leftOpen: false,
      rightOpen: false,
      bottomOpen: false,
      leftWidth: this.config.leftWorkspaceWidth,
      rightWidth: this.config.rightWorkspaceWidth,
      bottomHeight: this.config.bottomWorkspaceHeight,
      workspaceSelected: { left: null, right: null, bottom: null },
    };

    this.dragState = null;

    /** @type {Map<string, function(): void>} */
    this._tabFloatHandlers = new Map();

    this._boundMouseMove = this._onMouseMove.bind(this);

    this._boundMouseUp = this._onMouseUp.bind(this);
  }

  init(containerId = 'World') {
    this.container = document.getElementById(containerId);

    if (!this.container) return this;

    this.container.classList.add('workspace-layout');

    this.workspaces.top = document.getElementById('HeaderBar');

    this.workspaces.left = document.getElementById('SideWorkspaceLeft');

    this.workspaces.right = document.getElementById('SideWorkspaceRight');

    this.workspaces.bottom = document.getElementById('BottomWorkspace');

    this.workspaces.viewport = document.getElementById('Viewport');

    this._setupLayout();

    this._createResizers();

    this._createToggleBar();

    this._applyState();

    this._flushLayoutResize();

    this._setupKeyboardShortcuts();

    return this;
  }

  /**
   * Canonical DOM parent for full floating panels (drag/resize chrome). Matches the layout root
   * from init (typically #World), not #Windows (minimized pills / window bar).
   * @returns {HTMLElement|null}
   */
  getFloatingPanelMountElement() {
    const container = this.container;
    return container instanceof HTMLElement ? container : null;
  }

  /**
   * @param {{ left: object, right: object, bottom: object }} tabbedPanels
   * @returns {this}
   */
  attachWorkspaceTabPanels(tabbedPanels) {
    if (!tabbedPanels) return this;
    const leftPanel = tabbedPanels.left;
    const rightPanel = tabbedPanels.right;
    const bottomPanel = tabbedPanels.bottom;
    if (!leftPanel || !rightPanel || !bottomPanel) return this;
    this.tabbedWorkspaces = {
      left: leftPanel,
      right: rightPanel,
      bottom: bottomPanel,
    };
    for (const position of ['left', 'right', 'bottom']) {
      const workspace = this.tabbedWorkspaces[position];
      if (workspace) {
        workspace._layoutManager = this;
        workspace._layoutWorkspacePosition = position;
      }
    }
    return this;
  }

  /**
   * @param {LayoutPosition} position
   * @returns {object|null}
   */
  _workspaceTabPanel(position) {
    const map = this.tabbedWorkspaces;
    if (!map) return null;
    const workspace = map[position];
    return workspace || null;
  }

  setContext(context) {
    this.context = context || null;
    if (this.context && typeof this.context.addListeners === 'function') {
      this.context.addListeners([
        'layoutTabChanged',
        'layoutTabAdded',
        'layoutTabRemoved',
        'layoutWorkspaceChanged',
      ]);
    }
    return this;
  }



  reorderBottomWorkspaceTabsByModuleOrder(appContext) {
    const groups = normalizeWorkspaceTabGroupsByModule(this.config.bottomWorkspaceTabGroupsByModule);
    return this._reorderWorkspaceTabsByModuleOrder('bottom', appContext, groups);
  }

  reorderLeftWorkspaceTabsByModuleOrder(appContext) {
    const groups = normalizeWorkspaceTabGroupsByModule(this.config.leftWorkspaceTabGroupsByModule);
    return this._reorderWorkspaceTabsByModuleOrder('left', appContext, groups);
  }

  /**
   * @param {'left' | 'bottom'} position
   * @param {Object|null|undefined} appContext
   * @param {WorkspaceTabGroupByModule[]} tabGroups
   * @returns {LayoutManager}
   */
  _reorderWorkspaceTabsByModuleOrder(position, appContext, tabGroups) {
    const workspace = this._workspaceTabPanel(position);
    if (!workspace) {
      return this;
    }

    const orderIds = appContext && appContext.appModuleOrderIds;
    if (!orderIds || orderIds.length === 0) {
      return this;
    }

    const moduleRank = new Map();
    for (let index = 0; index < orderIds.length; index++) {
      const moduleId = orderIds[index];
      if (moduleId && !moduleRank.has(moduleId)) {
        moduleRank.set(moduleId, index);
      }
    }

    const sortedGroups = tabGroups.slice().sort(function (a, b) {
      const rankA = moduleRank.has(a.moduleId) ? moduleRank.get(a.moduleId) : 1000000;
      const rankB = moduleRank.has(b.moduleId) ? moduleRank.get(b.moduleId) : 1000000;
      return rankA - rankB;
    });

    const existingIds = [];
    const tabs = workspace.tabs;
    if (Array.isArray(tabs)) {
      for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i];
        const id = workspaceTabId(tab);
        if (id) {
          existingIds.push(id);
        }
      }
    }

    const assigned = new Set();
    const desired = [];
    for (let g = 0; g < sortedGroups.length; g++) {
      const group = sortedGroups[g];
      const tabIds = group.tabIds;
      for (let t = 0; t < tabIds.length; t++) {
        const tabId = tabIds[t];
        if (existingIds.indexOf(tabId) !== -1) {
          desired.push(tabId);
          assigned.add(tabId);
        }
      }
    }
    for (let i = 0; i < existingIds.length; i++) {
      const id = existingIds[i];
      if (!assigned.has(id)) {
        desired.push(id);
      }
    }

    workspace.reorderTabs(desired);
    return this;
  }

  prependToggleBarChild(domNode) {
    if (!domNode || !this.toggleBar) {
      return function noopToggleBarCleanup() {};
    }

    const toggleBarElement = this.toggleBar;

    if (toggleBarElement.firstChild) {
      toggleBarElement.insertBefore(domNode, toggleBarElement.firstChild);
    } else {
      toggleBarElement.appendChild(domNode);
    }

    return function removeToggleBarChild() {
      if (domNode.parentNode === toggleBarElement) {
        toggleBarElement.removeChild(domNode);
      }
    };
  }

  _emit(signalName, payload) {
    const ctx = this.context;
    if (!ctx) return;
    const signals = ctx.signals;
    if (!signals) return;
    const sig = signals[signalName];
    if (sig && typeof sig.dispatch === 'function') {
      sig.dispatch(payload);
    }
  }

  _flushLayoutResize() {
    const fire = () => {
      window.dispatchEvent(new Event('resize'));
    };
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(fire);
    } else {
      fire();
    }
  }

  /**
   * Register handler when user clicks float on a workspace tab (see UITabbedPanel).
   * @param {LayoutPosition} position
   * @param {string} tabId
   * @param {function(): void} fn
   * @returns {function(): void} Cleanup
   */
  registerTabFloatHandler(position, tabId, fn) {
    const key = `${position}:${tabId}`;
    this._tabFloatHandlers.set(key, fn);
    return () => {
      if (this._tabFloatHandlers.get(key) === fn) this._tabFloatHandlers.delete(key);
    };
  }

  /**
   * @param {LayoutPosition} position
   * @param {string} tabId
   */
  invokeTabFloat(position, tabId) {
    const fn = this._tabFloatHandlers.get(`${position}:${tabId}`);
    if (typeof fn === 'function') fn();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TAB MANAGEMENT API
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Add a tab to a layout panel (left, right, or bottom).
   * 
   * This is the primary method for adding content to layout panels. The content
   * can be any DOM element or UIElement with a `.dom` property.
   * 
   * @param {LayoutPosition} position - Panel position: 'left', 'right', or 'bottom'.
   * @param {string} id - Unique identifier for the tab. Used for selection and removal.
   * @param {string} label - Display label shown in the tab header.
   * @param {HTMLElement|{dom: HTMLElement}} content - Content to display in the tab.
   *   Can be a DOM element or any object with a `.dom` property (e.g., UIDiv, UIPanel).
   * @param {AddTabOptions} [options={}] - Additional options.
   * @param {boolean} [options.open=true] - Whether to open the panel after adding.
   * @param {boolean} [options.replace=true] - Whether to replace existing tab with same ID.
   * @returns {boolean} True if tab was successfully added, false otherwise.
   * 
   * @example
   * // Add a simple text tab to the right panel
   * const content = DrawUI.div();
   * content.add(DrawUI.text('Hello World'));
   * layoutManager.addTab('right', 'my-tab', 'My Tab', content);
   * 
   * @example
   * // Add a tab without opening the panel
   * layoutManager.addTab('bottom', 'logs', 'Logs', logsPanel, { open: false });
   * 
   * @example
   * // Add a tab that won't replace existing (will fail if tab exists)
   * layoutManager.addTab('left', 'tree', 'Tree View', treePanel, { replace: false });
   * 
   * @fires layoutTabAdded - Dispatched after tab is added with { position, id }.
   */
  addTab(position, id, label, content, options = {}) {
    const { open = true, replace = true, floatable = false, panelStyles } = options;
    const workspace = this._workspaceTabPanel(position);
    if (!workspace) return false;

    if (replace) {
      try {
        workspace.removeTab(id);
      } catch (_) {}
    }

    const tabSlotStyles =
      panelStyles && typeof panelStyles === 'object' ? panelStyles : undefined;
    workspace.addTab(id, label, content, tabSlotStyles, { floatable });
    this._emit('layoutTabAdded', { position, id });

    if (open) this.openWorkspace(position);
    return true;
  }

  /**
   * Ensure a tab exists without opening the workspace (idempotent).
   * If the tab is already present, does nothing. Otherwise adds it with
   * `replace: false` and `open: false` by default.
   *
   * @param {LayoutPosition} position
   * @param {string} id
   * @param {string} label
   * @param {HTMLElement|{dom: HTMLElement}} content
   * @param {AddTabOptions} [options={}]
   * @returns {boolean} True if the tab exists after the call (added or already there).
   */
  ensureTab(position, id, label, content, options = {}) {
    const { open = false, replace = false, floatable = false, panelStyles } = options;
    if (this.hasTab(position, id)) return true;
    return this.addTab(position, id, label, content, {
      open,
      replace,
      floatable,
      panelStyles,
    });
  }

  /**
   * Bind a toolbar control to a tab using `moduleId` from UI config, or an explicit element id.
   *
   * @param {string} moduleId - Module id to resolve via WorldComponent tree (ignored if toggleElementId set)
   * @param {LayoutPosition} position
   * @param {string} tabId
   * @param {{ toggleElementId?: string }} [options={}]
   * @returns {Function|null} Cleanup from bindToggle, or null
   */
  bindToggleForModule(moduleId, position, tabId, options = {}) {
    const { toggleElementId } = options || {};
    const elId =
      toggleElementId ||
      (moduleId ? resolveModuleToggleId(this.context, moduleId) : null);
    if (!elId) return null;
    return this.bindToggle(elId, position, tabId);
  }

  /**
   * Remove a tab from a layout panel.
   * 
   * @param {LayoutPosition} position - Panel position: 'left', 'right', or 'bottom'.
   * @param {string} id - Unique identifier of the tab to remove.
   * @param {RemoveTabOptions} [options={}] - Additional options.
   * @param {boolean} [options.closeIfEmpty=false] - Close panel if no tabs remain.
   * @returns {boolean} True if tab was successfully removed, false otherwise.
   * 
   * @example
   * // Remove a tab
   * layoutManager.removeTab('right', 'my-tab');
   * 
   * @example
   * // Remove tab and close panel if empty
   * layoutManager.removeTab('bottom', 'logs', { closeIfEmpty: true });
   * 
   * @fires layoutTabRemoved - Dispatched after tab is removed with { position, id }.
   */
  removeTab(position, id, options = {}) {
    const { closeIfEmpty = false } = options;
    const workspace = this._workspaceTabPanel(position);
    if (!workspace) return false;

    workspace.removeTab(id);
    this._emit('layoutTabRemoved', { position, id });

    if (closeIfEmpty && workspace.tabs && workspace.tabs.length === 0) {
      this.closeWorkspace(position);
    }

    return true;
  }

  /**
   * Select (activate) a tab in a layout panel.
   * 
   * @param {LayoutPosition} position - Panel position: 'left', 'right', or 'bottom'.
   * @param {string} id - Unique identifier of the tab to select.
   * @param {SelectTabOptions} [options={}] - Additional options.
   * @param {boolean} [options.open=true] - Whether to open the panel if closed.
   * @returns {boolean} True if tab was successfully selected, false otherwise.
   * 
   * @example
   * // Select a tab and open its panel
   * layoutManager.selectTab('right', 'settings');
   * 
   * @example
   * // Select without opening (useful for preselecting before panel opens)
   * layoutManager.selectTab('left', 'tree', { open: false });
   * 
   * @fires layoutTabChanged - Dispatched after selection with { position, id }.
   */
  selectTab(position, id, options = {}) {
    const { open = true } = options;
    const workspace = this._workspaceTabPanel(position);
    if (!workspace) return false;

    workspace.select(id);
    if (open) this.openWorkspace(position);
    return true;
  }

  /**
   * Check if a specific tab is currently selected.
   * 
   * @param {LayoutPosition} position - Panel position: 'left', 'right', or 'bottom'.
   * @param {string} id - Unique identifier of the tab to check.
   * @returns {boolean} True if the tab is selected, false otherwise.
   * 
   * @example
   * if (layoutManager.isTabSelected('right', 'settings')) {
   *   console.log('Settings tab is active');
   * }
   */
  isTabSelected(position, id) {
    const workspace = this._workspaceTabPanel(position);
    if (!workspace) return false;
    return workspace.selected === id;
  }

  /**
   * Toggle a tab's visibility. If the panel is open and the tab is selected,
   * closes the panel. Otherwise, selects the tab and opens the panel.
   * 
   * This is the recommended method for toolbar/sidebar buttons that should
   * toggle their associated panel.
   * 
   * @param {LayoutPosition} position - Panel position: 'left', 'right', or 'bottom'.
   * @param {string} id - Unique identifier of the tab to toggle.
   * @returns {boolean} Always returns true.
   * 
   * @example
   * // Toggle the settings panel
   * settingsButton.onClick(() => layoutManager.toggleTab('right', 'settings'));
   */
  toggleTab(position, id) {
    const isOpen = this.isWorkspaceOpen(position);
    const isSelected = this.isTabSelected(position, id);
    if (isOpen && isSelected) {
      this.closeWorkspace(position);
      return true;
    }
    this.selectTab(position, id, { open: true });
    return true;
  }

  /**
   * Check if a tab exists in a layout panel.
   * 
   * @param {LayoutPosition} position - Panel position: 'left', 'right', or 'bottom'.
   * @param {string} id - Unique identifier of the tab to check.
   * @returns {boolean} True if the tab exists, false otherwise.
   * 
   * @example
   * if (!layoutManager.hasTab('right', 'settings')) {
   *   layoutManager.addTab('right', 'settings', 'Settings', settingsContent);
   * }
   */
  hasTab(position, id) {
    const workspace = this._workspaceTabPanel(position);
    if (!workspace || !workspace.tabs) return false;
    return workspace.tabs.some((tab) => workspaceTabId(tab) === id);
  }

  /**
   * Get all tab IDs in a layout panel.
   * 
   * @param {LayoutPosition} position - Panel position: 'left', 'right', or 'bottom'.
   * @returns {string[]} Array of tab IDs, or empty array if panel doesn't exist.
   * 
   * @example
   * const tabIds = layoutManager.getTabIds('right');
   * console.log('Right panel tabs:', tabIds); // ['settings', 'properties']
   */
  getTabIds(position) {
    const workspace = this._workspaceTabPanel(position);
    if (!workspace || !workspace.tabs) return [];
    return workspace.tabs.map((tab) => workspaceTabId(tab)).filter(Boolean);
  }

  /**
   * Get the currently selected tab ID in a panel.
   * 
   * @param {LayoutPosition} position - Panel position: 'left', 'right', or 'bottom'.
   * @returns {string|null} The selected tab ID, or null if no tab is selected.
   * 
   * @example
   * const activeTab = layoutManager.getSelectedTabId('right');
   * if (activeTab === 'settings') {
   *   // Handle settings-specific logic
   * }
   */
  getSelectedTabId(position) {
    const workspace = this._workspaceTabPanel(position);
    if (!workspace) return null;
    return workspace.selected || null;
  }

  /**
   * Remove all tabs from a layout panel.
   * 
   * @param {LayoutPosition} position - Panel position: 'left', 'right', or 'bottom'.
   * @param {boolean} [closeWorkspace=true] - Whether to close the workspace after clearing.
   * @returns {boolean} True if tabs were cleared, false if workspace doesn't exist.
   * 
   * @example
   * // Clear all tabs and close the panel
   * layoutManager.clearTabs('bottom');
   * 
   * @example
   * // Clear tabs but keep panel open
   * layoutManager.clearTabs('right', false);
   */
  clearTabs(position, closeWorkspace = true) {
    const workspace = this._workspaceTabPanel(position);
    if (!workspace || !workspace.tabs) return false;
    
    const ids = this.getTabIds(position);
    for (const id of ids) {
      try { workspace.removeTab(id); } catch (_) {}
    }
    
    if (closeWorkspace) this.closeWorkspace(position);
    return true;
  }

  /**
   * Update the label text of an existing tab.
   * 
   * @param {LayoutPosition} position - Panel position: 'left', 'right', or 'bottom'.
   * @param {string} id - Unique identifier of the tab to update.
   * @param {string} label - New label text.
   * @returns {boolean} True if label was updated, false if tab doesn't exist.
   * 
   * @example
   * // Update tab label to show item count
   * layoutManager.setTabLabel('left', 'items', `Items (${itemCount})`);
   */
  setTabLabel(position, id, label) {
    const workspace = this._workspaceTabPanel(position);
    if (!workspace || !workspace.tabs) return false;
    
    const tab = workspace.tabs.find((t) => workspaceTabId(t) === id);
    if (!tab) return false;

    const tabDom = tab.dom;
    let labelEl = null;
    if (tabDom && typeof tabDom.querySelector === 'function') {
      labelEl = tabDom.querySelector('.Tab-label');
    }
    if (labelEl) {
      labelEl.textContent = label;
      return true;
    }
    if (tabDom) tabDom.textContent = label;
    return true;
  }

  /**
   * Get the content element of a tab.
   * 
   * @param {LayoutPosition} position - Panel position: 'left', 'right', or 'bottom'.
   * @param {string} id - Unique identifier of the tab.
   * @returns {HTMLElement|null} The tab's content element, or null if not found.
   * 
   * @example
   * const content = layoutManager.getTabContent('right', 'settings');
   * if (content) {
   *   content.classList.add('custom-styles');
   * }
   */
  getTabContent(position, id) {
    const workspace = this._workspaceTabPanel(position);
    if (!workspace || !workspace.tabs || !workspace.panels) return null;
    
    const tabIndex = workspace.tabs.findIndex((t) => workspaceTabId(t) === id);
    if (tabIndex === -1) return null;

    const panelEl = workspace.panels[tabIndex];
    if (!panelEl) return null;
    if (panelEl.dom) return panelEl.dom;
    return panelEl;
  }

  /**
   * Bind a DOM element to toggle a specific tab.
   * 
   * This creates a bidirectional binding between an element (like a toolbar button)
   * and a layout tab. Clicking the element toggles the tab, and the element's
   * 'Active' class is synced with the tab's state.
   * 
   * @param {string|HTMLElement} elementOrId - Element or its ID to bind.
   * @param {LayoutPosition} position - Panel position: 'left', 'right', or 'bottom'.
   * @param {string} tabId - Unique identifier of the tab to bind.
   * @returns {Function|null} Cleanup function to unbind, or null if element not found.
   * 
   * @example
   * // Bind a sidebar button to toggle the settings panel
   * const cleanup = layoutManager.bindToggle('SettingsButton', 'right', 'settings');
   * 
   * // Later, to unbind:
   * cleanup();
   * 
   * @example
   * // Bind with a DOM element directly
   * const btn = document.getElementById('my-button');
   * layoutManager.bindToggle(btn, 'left', 'tree-view');
   */
  bindToggle(elementOrId, position, tabId) {
    const el = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
    if (!el) return null;
    const syncActive = () => {
      el.classList.toggle('Active', this.isWorkspaceOpen(position) && this.isTabSelected(position, tabId));
    };
    const handler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleTab(position, tabId);
      syncActive();
    };
    el.style.cursor = 'pointer';
    el.addEventListener('click', handler);
    const ctx = this.context;
    const signals = ctx && ctx.signals;
    const unsubs = [];
    const sub = (name) => {
      if (!signals) return;
      const sig = signals[name];
      if (!sig || typeof sig.add !== 'function' || typeof sig.remove !== 'function') return;
      sig.add(syncActive);
      unsubs.push(() => sig.remove(syncActive));
    };
    sub('layoutTabChanged');
    sub('layoutWorkspaceChanged');
    sub('layoutTabRemoved');
    sub('layoutTabAdded');
    syncActive();
    return () => {
      el.removeEventListener('click', handler);
      for (const u of unsubs) u();
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // LAYOUT SETUP (INTERNAL)
  // ════════════════════════════════════════════════════════════════════════════

  _setupLayout() {
    this.container.style.display = 'grid';
    this.container.style.overflow = 'hidden';

    if (this.workspaces.top) {
      this.workspaces.top.style.overflow = 'hidden';
      this.workspaces.top.classList.add('layout-panel', 'layout-panel-top');
    }

    if (this.workspaces.left) {
      this.workspaces.left.style.overflow = 'hidden';
      this.workspaces.left.style.minWidth = '0';
      this.workspaces.left.classList.add('layout-panel', 'layout-panel-left');
    }

    if (this.workspaces.right) {
      this.workspaces.right.style.overflow = 'hidden';
      this.workspaces.right.style.minWidth = '0';
      this.workspaces.right.classList.add('layout-panel', 'layout-panel-right');
    }

    if (this.workspaces.bottom) {
      this.workspaces.bottom.style.overflow = 'hidden';
      this.workspaces.bottom.style.minHeight = '0';
      this.workspaces.bottom.classList.add('layout-panel', 'layout-panel-bottom');
    }

    if (this.workspaces.viewport) {
      this.workspaces.viewport.style.overflow = 'hidden';
      this.workspaces.viewport.style.position = 'relative';
      this.workspaces.viewport.classList.add('layout-viewport');
    }
  }

  _createResizers() {
    this.resizers.left = this._createResizer('left', 'col-resize');

    this.resizers.right = this._createResizer('right', 'col-resize');

    this.resizers.bottom = this._createResizer('bottom', 'row-resize');

    this.container.appendChild(this.resizers.left);

    this.container.appendChild(this.resizers.right);

    this.container.appendChild(this.resizers.bottom);
  }

  _createToggleBar() {
    const toggleBar = new UIRow()
      .setId('LayoutToggleBar');
    
    this.toggleBar = toggleBar.dom;

    this.toggleButtons = {
      left: this._createToggleButton('left', 'left_panel_open', 'Toggle Left Workspace (Ctrl+B)'),
      bottom: this._createToggleButton('bottom', 'bottom_panel_open', 'Toggle Bottom Workspace (Ctrl+J)'),
      right: this._createToggleButton('right', 'right_panel_open', 'Toggle Right Workspace (Ctrl+Alt+B)')
    };

    this.toggleBar.appendChild(this.toggleButtons.left);
    this.toggleBar.appendChild(this.toggleButtons.bottom);
    this.toggleBar.appendChild(this.toggleButtons.right);

    document.getElementById('HeaderBar').appendChild(this.toggleBar);
  }

  _createToggleButton(position, iconName, tooltip) {
    const icon = new UIIcon(iconName);
    
    const button = new UIButton()
      .setClass(`layout-toggle-btn layout-toggle-btn-${position}`)
      .setTooltip(tooltip);
    
    button.dom.dataset.position = position;
    button.add(icon);

    button.onClick(() => {
      this.toggleWorkspace(position);
      this._updateToggleButtons();
    });

    return button.dom;
  }

  _updateToggleButtons() {
    if (!this.toggleButtons) return;

    Object.entries(this.toggleButtons).forEach(([position, button]) => {
      const isOpen = this.state[`${position}Open`];

      button.classList.toggle('active', isOpen);
    });
  }

  _createResizer(position, cursor) {
    const isVertical = position === 'bottom';
    
    const resizer = new UIDiv()
      .setClass(`layout-resizer layout-resizer-${position}`)
      .setStyles({
        width: isVertical ? '100%' : `${this.config.resizerSize}px`,
        height: isVertical ? `${this.config.resizerSize}px` : '100%',
        cursor: cursor,
        background: 'transparent',
        zIndex: '100'
      });

    resizer.dom.style.transition = 'background 0.15s ease';
    resizer.dom.dataset.position = position;

    resizer.dom.addEventListener('mouseenter', () => {
      resizer.dom.style.background = 'var(--primary, #007acc)';
    });

    resizer.dom.addEventListener('mouseleave', () => {
      if (!this.dragState) {
        resizer.dom.style.background = 'transparent';
      }
    });

    resizer.dom.addEventListener('mousedown', (e) => this._onMouseDown(e, position));

    resizer.dom.addEventListener('dblclick', () => this._onDoubleClick(position));

    return resizer.dom;
  }

  _onMouseDown(e, position) {
    e.preventDefault();
    
    const workspace = position === 'left' ? this.workspaces.left :
                      position === 'right' ? this.workspaces.right : this.workspaces.bottom;
    
    if (!workspace) return;

    const rect = workspace.getBoundingClientRect();
    
    this.dragState = {
      position,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: rect.width,
      startHeight: rect.height
    };

    document.body.style.cursor = position === 'bottom' ? 'row-resize' : 'col-resize';

    document.body.style.userSelect = 'none';

    document.addEventListener('mousemove', this._boundMouseMove);

    document.addEventListener('mouseup', this._boundMouseUp);

    this._createOverlay();
  }

  _onMouseMove(e) {
    if (!this.dragState) return;

    const { position, startX, startY, startWidth, startHeight } = this.dragState;

    const minSize = this.config.minPanelSize;

    if (position === 'left') {
      const delta = e.clientX - startX;

      const newWidth = Math.max(minSize, startWidth + delta);

      this.state.leftWidth = newWidth;

      this._updateGridColumns();
    } else if (position === 'right') {
      const delta = startX - e.clientX;

      const newWidth = Math.max(minSize, startWidth + delta);

      this.state.rightWidth = newWidth;

      this._updateGridColumns();
    } else if (position === 'bottom') {
      const delta = startY - e.clientY;

      const newHeight = Math.max(minSize, startHeight + delta);

      this.state.bottomHeight = newHeight;

      this._updateGridRows();
    }

    window.dispatchEvent(new Event('resize'));
  }

  _onMouseUp() {
    if (this.dragState) {
      const resizer = this.resizers[this.dragState.position];

      if (resizer) {
        resizer.style.background = 'transparent';
      }
    }

    this.dragState = null;

    document.body.style.cursor = '';

    document.body.style.userSelect = '';

    document.removeEventListener('mousemove', this._boundMouseMove);

    document.removeEventListener('mouseup', this._boundMouseUp);

    this._removeOverlay();
  }

  _onDoubleClick(position) {
    if (position === 'left') {
      this.toggleWorkspace('left');
    } else if (position === 'right') {
      this.toggleWorkspace('right');
    } else if (position === 'bottom') {
      this.toggleWorkspace('bottom');
    }
  }

  _createOverlay() {
    if (this._overlay) return;
    
    const overlay = new UIDiv()
      .setClass('layout-drag-overlay')
      .setStyles({
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        zIndex: '9999',
        background: 'transparent'
      });

    this._overlay = overlay.dom;
    document.body.appendChild(this._overlay);
  }

  _removeOverlay() {
    if (this._overlay) {
      this._overlay.remove();

      this._overlay = null;
    }
  }

  _updateGridColumns() {
    const leftWidth = this.state.leftOpen ? `${this.state.leftWidth}px` : '0px';

    const leftResizer = this.state.leftOpen ? `${this.config.resizerSize}px` : '0px';

    const rightWidth = this.state.rightOpen ? `${this.state.rightWidth}px` : '0px';

    const rightResizer = this.state.rightOpen ? `${this.config.resizerSize}px` : '0px';

    this.container.style.gridTemplateColumns =
      `${leftWidth} ${leftResizer} minmax(0, 1fr) ${rightResizer} ${rightWidth}`;

    this.resizers.left.style.display = this.state.leftOpen ? 'block' : 'none';

    this.resizers.right.style.display = this.state.rightOpen ? 'block' : 'none';
  }

  _updateGridRows() {
    const bottomHeight = this.state.bottomOpen ? `${this.state.bottomHeight}px` : '0px';

    const bottomResizer = this.state.bottomOpen ? `${this.config.resizerSize}px` : '0px';

    const topRow = `${this.config.topWorkspaceHeight}px`;

    this.container.style.gridTemplateRows =
      `${topRow} minmax(0, 1fr) ${bottomResizer} ${bottomHeight}`;

    this.resizers.bottom.style.display = this.state.bottomOpen ? 'block' : 'none';
  }

  _applyState() {
    this._updateGridColumns();

    this._updateGridRows();

    this._updateToggleButtons();
  }

  _setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();

        this.toggleWorkspace('left');
      }

      if (e.ctrlKey && e.altKey && e.key === 'b') {
        e.preventDefault();

        this.toggleWorkspace('right');
      }

      if (e.ctrlKey && e.key === 'j') {
        e.preventDefault();

        this.toggleWorkspace('bottom');
      }
    });
  }

  toggleWorkspace(position) {
    if (position === 'left') {
      this.state.leftOpen = !this.state.leftOpen;

      this._updateGridColumns();
    } else if (position === 'right') {
      this.state.rightOpen = !this.state.rightOpen;

      this._updateGridColumns();
    } else if (position === 'bottom') {
      this.state.bottomOpen = !this.state.bottomOpen;

      this._updateGridRows();
    }

    this._updateToggleButtons();

    this._flushLayoutResize();
    
    return this;
  }

  openWorkspace(position) {
    const wasOpen = this.isWorkspaceOpen(position);
    if (position === 'left' && !this.state.leftOpen) {
      this.state.leftOpen = true;

      this._updateGridColumns();
    } else if (position === 'right' && !this.state.rightOpen) {
      this.state.rightOpen = true;

      this._updateGridColumns();
    } else if (position === 'bottom' && !this.state.bottomOpen) {
      this.state.bottomOpen = true;

      this._updateGridRows();
    }

    this._updateToggleButtons();

    this._flushLayoutResize();
    if (!wasOpen) this._emit('layoutWorkspaceChanged', { position, open: true });
    
    return this;
  }

  closeWorkspace(position) {
    const wasOpen = this.isWorkspaceOpen(position);
    if (position === 'left' && this.state.leftOpen) {
      this.state.leftOpen = false;

      this._updateGridColumns();
    } else if (position === 'right' && this.state.rightOpen) {
      this.state.rightOpen = false;

      this._updateGridColumns();
    } else if (position === 'bottom' && this.state.bottomOpen) {
      this.state.bottomOpen = false;

      this._updateGridRows();
    }

    this._updateToggleButtons();

    this._flushLayoutResize();
    if (wasOpen) this._emit('layoutWorkspaceChanged', { position, open: false });
    
    return this;
  }

  setWorkspaceSize(position, size) {
    size = Math.max(this.config.minPanelSize, size);

    if (position === 'left') {
      this.state.leftWidth = size;

      this._updateGridColumns();
    } else if (position === 'right') {
      this.state.rightWidth = size;

      this._updateGridColumns();
    } else if (position === 'bottom') {
      this.state.bottomHeight = size;

      this._updateGridRows();
    }

    this._updateToggleButtons();

    this._flushLayoutResize();
    
    return this;
  }

  getWorkspaceSize(position) {
    if (position === 'left') return this.state.leftWidth;

    if (position === 'right') return this.state.rightWidth;

    if (position === 'bottom') return this.state.bottomHeight;

    return 0;
  }

  isWorkspaceOpen(position) {
    if (position === 'left') return this.state.leftOpen;

    if (position === 'right') return this.state.rightOpen;

    if (position === 'bottom') return this.state.bottomOpen;

    return false;
  }

  getWorkspace(position) {
    return this.workspaces[position] || null;
  }

  resetLayout() {
    this.state = {
      leftOpen: false,
      rightOpen: false,
      bottomOpen: false,
      leftWidth: this.config.leftWorkspaceWidth,
      rightWidth: this.config.rightWorkspaceWidth,
      bottomHeight: this.config.bottomWorkspaceHeight,
      workspaceSelected: { left: null, right: null, bottom: null },
    };

    this._applyState();

    this._flushLayoutResize();
    
    return this;
  }

  setContent(position, content) {
    const workspace = this.workspaces[position];

    if (!workspace) return this;

    if (typeof content === 'string') {
      workspace.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      workspace.innerHTML = '';

      workspace.appendChild(content);
    }

    return this;
  }

  destroy() {
    Object.values(this.resizers).forEach(resizer => {
      if (resizer && resizer.parentNode) {
        resizer.remove();
      }
    });

    document.removeEventListener('mousemove', this._boundMouseMove);

    document.removeEventListener('mouseup', this._boundMouseUp);

    this._removeOverlay();
  }
}

export { LayoutManager };

export default LayoutManager;
