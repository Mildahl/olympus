import {
  UIPanel,
  UITabbedPanel,
  UIIcon,
  UIDiv,
  UISpan,
  UIButton,
  UIInput,
  UIRow,
  UITooltip,
} from "./ui.js";

import { makeResizable, makeDraggable } from "./utils/panelResizer.js";

// Pin position configurations
const PIN_CONFIGS = {
  left: {
    left: '0', top: '0',
    width: '45vw', height: '100vh'
  },
  bottom: {
    left: '0', bottom: '0',
    width: '100vw', height: '30vh'
  },
  right: {
    right: '0', top: '0',
    width: '45vw', height: '100vh'
  },
  maximized: {
    left: '0', top: '0',
    width: '100vw', height: '100vh'
  }
};

// Default floating position (centered)
const DEFAULT_POSITION = {
  left: '0', top: '0',
  width: '45vw', height: '100vh'
};

/**
 * @extends {UIPanel}
 * @property {{ position: string, tabId: string, hostDom: HTMLElement }|null} _dockedWorkspace
 */
class FloatingPanel extends UIPanel {
  static get isMobile() {
    return window.innerWidth <= 768;
  }

  constructor(options) {
    super();

    this.panelIcon = null;
    this.minimizedImageSrc = null;

    this.title = { icon: null, text: null };

    this.isMaximized = false;

    this.isMinimized = false;

    this.isClosed = false;

    this._pinned = null;

    this._minimizedIcon = null;

    this._onCloseCallback = null;

    this._restoreContainer = options && options.restoreContainer ? options.restoreContainer : null;

    if (options && options.minimizedImageSrc) {
      this.minimizedImageSrc = options.minimizedImageSrc;
    }

    /** @type {boolean} When false, the close button is hidden and the panel cannot be closed. */
    this.closable = options?.closable !== false;

    /**
     * Optional dock-to-workspace handlers: { left?, bottom?, right? } each (panel) => void.
     * When set for a side, that pin button calls the handler instead of CSS pin.
     */
    this._dockHandlers = options?.dock ?? null;

    /**
     * Set by workspacePanelDock when panel body lives in a layout tab; cleared on undock.
     * @type {{ position: string, tabId: string, hostDom: HTMLElement }|null}
     */
    this._dockedWorkspace = null;

    /**
     * When set, dock-from-float restores body into this TabPanel instead of a WorkspaceDockHost wrapper.
     * @type {object|null}
     */
    this._sourceTabPanel = null;
    if (options && options.sourceTabPanel) {
      this._sourceTabPanel = options.sourceTabPanel;
    }

    this.setClass("FloatingPanel");

    this.header = this._buildHeader();

    this._buildContentWrapper();

    if (!FloatingPanel.isMobile) {
      makeResizable(this.dom);
      makeDraggable(this.dom, this.header.dom);
    }

    if (options) this._buildContent(options);

    this._setupMobileSheet();

    if (!options || !options.startMinimized) {
      this._ensurePillRegistered(true);
    }
  }

  // ==================== Public API ====================

  get content() {
    return this.contentWrapper.dom;
  }

  setTitle(title) {
    this.title.text.dom.textContent = title;

    return this;
  }

  setIcon(iconName) {
    this.panelIcon = iconName;

    this.title.icon.setIcon(iconName);

    return this;
  }

  setMinimizedImageSrc(imageSource) {
    this.minimizedImageSrc = imageSource;

    return this;
  }

  setContent(content) {
    const docked = this._dockedWorkspace;
    if (docked?.hostDom) {
      const host = docked.hostDom;
      while (host.firstChild) {
        host.removeChild(host.firstChild);
      }
      if (content && (content instanceof Object || content.nodeType)) {
        if (content.nodeType) {
          host.appendChild(content);
        } else if (content.dom) {
          host.appendChild(content.dom);
        }
      }
      return this;
    }

    this.contentWrapper.clear();

    if (content && (content instanceof Object || content.nodeType)) {
      this.contentWrapper.add(content);
    }

    return this;
  }

  addContent(content) {
    const docked = this._dockedWorkspace;
    if (docked?.hostDom && content && (content instanceof Object || content.nodeType)) {
      if (content.nodeType) {
        docked.hostDom.appendChild(content);
      } else if (content.dom) {
        docked.hostDom.appendChild(content.dom);
      }
      return this;
    }

    this.contentWrapper.add(content);

    return this;
  }

  minimize() {
    if (!this.isMinimized) this._toggleMinimize();

    return this;
  }

  restore() {
    if (this.isMinimized) this._restoreFromMinimized();

    return this;
  }

  maximize() {

    if (this.isMinimized) {
      this.dom.style.display = '';
      this.dom.style.opacity = '';
      this.dom.style.transform = '';
      this.dom.style.visibility = '';
      this.dom.style.transition = '';
      this.dom.classList.remove("minimized");
      this.isMinimized = false;
      this._updatePillActiveState(true);
    }

    if (!this.isMaximized) {
      this._toggleMaximize();
    }

    return this;
  }

  unmaximize() {
    if (this.isMaximized) this._toggleMaximize();

    return this;
  }

  pinLeft() {
    this._prepareForPin();

    this._togglePin('left');

    return this;
  }

  pinBottom() {
    this._prepareForPin();

    this._togglePin('bottom');

    return this;
  }

  pinRight() {
    this._prepareForPin();

    this._togglePin('right');

    return this;
  }

  unpin() {
    if (this._pinned || this.isMaximized) {
      this.dom.classList.remove('maximized');

      this._setDefaultPosition();

      this._pinned = null;

      this.isMaximized = false;
    }

    return this;
  }

  /**
   * Pin panel to a custom position
   * @param {Object} options - Position options
   * @param {string} [options.left] - CSS left value (e.g., '100px', '10%')
   * @param {string} [options.top] - CSS top value
   * @param {string} [options.width] - CSS width value
   * @param {string} [options.height] - CSS height value
   */
  pinToPosition({ left, top, width, height } = {}) {
    this._prepareForPin();

    this._pinned = 'custom';

    this._applyPosition({
      left: left ?? 'calc(50vw - 200px)',
      top: top ?? 'calc(50vh - 150px)',
      width: width ?? '400px',
      height: height ?? '300px'
    });

    return this;
  }

  close() {
    this._cleanupMinimizedIcon();

    this.dom.remove();

    this.isClosed = true;

    if (this._onCloseCallback) {
      this._onCloseCallback();
    }

    return this;
  }

  /**
   * Set callback to be called when panel is closed
   * @param {Function} callback - Function to call on close
   */
  onClose(callback) {
    this._onCloseCallback = callback;

    return this;
  }

  /**
   * Reopen a closed panel by re-adding to DOM
   * @param {HTMLElement} [container] - Optional container to append to (defaults to document.body)
   */
  reopen(container) {
    if (!this.isClosed) return this;

    const parent = container || document.body;

    parent.appendChild(this.dom);

    this.isClosed = false;

    return this;
  }

  show(container) {
    // If panel was closed (removed from DOM), reopen it
    if (this.isClosed || !this.dom.parentElement) {
      const parent = container || document.body;

      parent.appendChild(this.dom);

      this.isClosed = false;
    }

    this.dom.style.display = '';

    return this;
  }

  /**
   * Attach to the layout floating layer (typically #World), clear dock/minimized shell state, sync geometry.
   * @param {HTMLElement} containerElement
   * @returns {this}
   */
  mountFloating(containerElement) {
    if (!containerElement || !(containerElement instanceof HTMLElement)) {
      return this;
    }

    containerElement.appendChild(this.dom);

    this.isClosed = false;

    this.dom.style.display = '';

    if (this.isMinimized) {
      this.dom.classList.remove("minimized");
      this.isMinimized = false;
      this.dom.style.transform = '';
      this.dom.style.opacity = '';
      this.dom.style.transition = '';
      this.dom.style.visibility = '';
    }

    this._ensurePillRegistered(true);

    this.prepareAfterRemount();

    return this;
  }

  /**
   * After the panel was re-attached (e.g. undock from workspace), sync left/top to the
   * new offset parent so absolute positioning + drag match the visible box.
   * @returns {this}
   */
  prepareAfterRemount() {
    if (FloatingPanel.isMobile) return this;

    this.dom.classList.remove("maximized");
    this.isMaximized = false;
    this._pinned = null;

    void this.dom.offsetWidth;

    const rect = this.dom.getBoundingClientRect();
    const op = this.dom.offsetParent;

    this.dom.style.right = "";
    this.dom.style.bottom = "";

    if (op instanceof HTMLElement) {
      const pr = op.getBoundingClientRect();
      this.dom.style.left = `${Math.round(rect.left - pr.left + op.scrollLeft)}px`;
      this.dom.style.top = `${Math.round(rect.top - pr.top + op.scrollTop)}px`;
    } else {
      this.dom.style.left = `${Math.round(rect.left)}px`;
      this.dom.style.top = `${Math.round(rect.top)}px`;
    }

    if (rect.width > 0) this.dom.style.width = `${Math.round(rect.width)}px`;
    if (rect.height > 0) this.dom.style.height = `${Math.round(rect.height)}px`;

    return this;
  }

  hide() {
    this.dom.style.display = 'none';

    return this;
  }

  // ==================== Private Build Methods ====================

  _buildHeader() {
    const header = new UIDiv().padding("4px")
      .addClass("Row")
      .addClass("centered-vertical")
      .addClass("justify-between")
      .addClass("fill-width")
      .addClass("FloatingPanel-header")
      .setStyle("border-bottom", ["1px solid var(--theme-background-1012)"]);

    this.add(header);

    // Title row
    const titleRow = new UIRow().addClass("fill-width").setStyles({
      "justify-content": "center",
      "text-align": "center",
      "align-items": "center",
      "gap": "var(--phi-1)"
    });
    
    this.title.icon = new UIIcon();

    this.title.text = new UISpan();

    titleRow.add(this.title.icon, this.title.text);

    header.add(titleRow);

    // Tools row
    const tools = new UIRow().gap("8px");

    header.add(tools);

    // Pin buttons
    tools.add(this._createPinButton('dock_to_left', 'Pin left', 'left'));

    tools.add(this._createPinButton('dock_to_bottom', 'Pin bottom', 'bottom'));

    tools.add(this._createPinButton('dock_to_right', 'Pin right', 'right'));

    tools.add(this._createCircleButton('green', 'open_in_full', () => this._toggleMaximize()));

    if (this.closable) {
      tools.add(this._createCircleButton('red', 'close', () => this.minimize()));
    }

    return header;
  }

  _buildContentWrapper() {
    this.contentWrapper = new UIDiv().addClass("fill-height").addClass("FloatingPanel-content");

    this.add(this.contentWrapper);
  }

  _prepareForPin() {
    if (this.isMinimized) {
      this.dom.style.display = '';
      this.isMinimized = false;
      this._updatePillActiveState(true);
    }

    if (this.isMaximized) {
      this.dom.classList.remove('maximized');

      this.isMaximized = false;
    }
  }

  _createPinButton(iconName, title, position) {
    const btn = new UIDiv().setClass('circle').addClass('pos-btn');

    const span = new UIIcon(iconName);

    span.dom.title = title;

    btn.add(span);

    btn.dom.style.cursor = 'pointer';

    btn.dom.onclick = () => this._togglePin(position);

    return btn;
  }

  _createCircleButton(color, iconName, onClick) {
    const circle = new UIDiv().setClass("circle").addClass(color);

    circle.add(new UIIcon(iconName));

    circle.dom.onclick = onClick;

    return circle;
  }

  // ==================== Private Position Methods ====================

  /**
   * Clear all positioning styles to prevent conflicts
   */
  _clearPositioning() {
    this.dom.style.left = '';

    this.dom.style.right = '';

    this.dom.style.top = '';

    this.dom.style.bottom = '';

    this.dom.style.width = '';

    this.dom.style.height = '';
  }

  /**
   * Apply position config (clears existing first to prevent conflicts)
   */
  _applyPosition(config) {
    if (FloatingPanel.isMobile) return;
    this._clearPositioning();

    Object.entries(config).forEach(([k, v]) => {
      this.dom.style[k] = v;
    });
  }

  _setupMobileSheet() {
    if (!FloatingPanel.isMobile) return;
    this.dom.style.cssText = '';
    this.header.dom.style.cursor = 'pointer';
    this.header.dom.addEventListener('click', () => {
      this.dom.classList.toggle('sheet-expanded');
    });
  }

  /**
   * Set to default floating position (centered)
   */
  _setDefaultPosition() {
    this._applyPosition(DEFAULT_POSITION);
  }

  _cleanupMinimizedIcon() {
    if (!this._minimizedIcon) return;

    try {
      const iconDom = this._minimizedIcon.dom;

      const tooltip = /** @type {any} */ (this._minimizedIcon)._tooltip;
      if (tooltip) {
        if (typeof tooltip.destroy === 'function') tooltip.destroy();
        if (tooltip.dom && tooltip.dom.parentElement) {
          tooltip.dom.parentElement.removeChild(tooltip.dom);
        }
      }

      if (iconDom && iconDom.parentElement) {
        iconDom.parentElement.removeChild(iconDom);
      }
    } catch (e) {
    }

    this._minimizedIcon = null;
  }

  _updatePillActiveState(isActive) {
    if (this._minimizedIcon && this._minimizedIcon.dom) {
      this._minimizedIcon.dom.classList.toggle('Active', isActive);
    }
  }

  _ensurePillRegistered(isActive) {
    if (!this._minimizedIcon) {
      const icon = this._createMinimizedIcon();
      icon.dom.style.opacity = '1';
      icon.dom.style.transform = '';
    }
    this._updatePillActiveState(isActive);
  }

  // ==================== Private Toggle Methods ====================

  _togglePin(position) {
    const dockFn = this._dockHandlers?.[position];
    if (dockFn) {
      dockFn(this);
      return;
    }

    // If clicking same pin, unpin to default position
    if (this._pinned === position) {
      this.dom.classList.remove('maximized');

      this._setDefaultPosition();

      this._pinned = null;

      this.isMaximized = false;

      return;
    }

    // Clear maximized state
    if (this.isMaximized) {
      this.dom.classList.remove('maximized');

      this.isMaximized = false;
    }

    this._pinned = position;

    this._applyPosition(PIN_CONFIGS[position]);
  }

  _toggleMaximize() {
    if (this.isMaximized) {
      this.dom.classList.remove("maximized");

      this._setDefaultPosition();

      this._pinned = null;

      this.isMaximized = false;
    } else {

      this.dom.classList.add("maximized");

      this._applyPosition(PIN_CONFIGS.maximized);

      this._pinned = null;

      this.isMaximized = true;
    }

  }

  _toggleMinimize() {
    if (this.isMinimized) {
      this._restoreFromMinimized();
    } else {
      this._minimizePanel();
    }
  }

  _minimizePanel() {
    if (this.isMaximized) {
      this.dom.classList.remove('maximized');
      this.isMaximized = false;
    }

    if (!this._minimizedIcon) {
      this._ensurePillRegistered(true);
    }

    const panelRect = this.dom.getBoundingClientRect();
    const pillRect = this._minimizedIcon.dom.getBoundingClientRect();

    const translateX = (pillRect.left + pillRect.width / 2) - (panelRect.left + panelRect.width / 2);
    const translateY = (pillRect.top + pillRect.height / 2) - (panelRect.top + panelRect.height / 2);

    this.dom.style.transformOrigin = 'center center';

    void this.dom.offsetWidth;

    this.dom.style.transition = 'transform 500ms cubic-bezier(.2,.8,.2,1), opacity 320ms linear';
    this.dom.style.transform = `translate(${translateX}px, ${translateY}px) scale(0.08)`;
    this.dom.style.opacity = '0';

    const onEnd = (e) => {
      if (e.propertyName !== 'transform') return;

      this.dom.removeEventListener('transitionend', onEnd);

      this.dom.style.display = 'none';
      this.dom.style.transform = '';
      this.dom.style.opacity = '';
      this.dom.style.transition = '';

      this.dom.classList.add("minimized");
      this.isMinimized = true;
      this._updatePillActiveState(false);
    };

    this.dom.addEventListener('transitionend', onEnd);
  }

  _restoreFromMinimized() {
    if (!this.dom.parentElement) {
      const panelContainer = this._getPanelContainer();
      panelContainer.appendChild(this.dom);
    }

    if (!this._minimizedIcon || !this._minimizedIcon.dom.parentElement) {
      this.dom.style.display = '';
      this.dom.classList.remove("minimized");
      this.isMinimized = false;
      this._updatePillActiveState(true);
      return;
    }

    const iconRect = this._minimizedIcon.dom.getBoundingClientRect();
    const iconCenterX = iconRect.left + iconRect.width / 2;
    const iconCenterY = iconRect.top + iconRect.height / 2;

    this.dom.style.display = '';
    this.dom.style.visibility = 'hidden';
    this.dom.style.transform = '';
    this.dom.style.opacity = '0';

    const panelRect = this.dom.getBoundingClientRect();

    const startX = iconCenterX - (panelRect.left + panelRect.width / 2);
    const startY = iconCenterY - (panelRect.top + panelRect.height / 2);

    this.dom.classList.remove('minimized');
    this.dom.style.visibility = 'visible';
    this.dom.style.transition = 'none';
    this.dom.style.transformOrigin = 'center center';
    this.dom.style.transform = `translate(${startX}px, ${startY}px) scale(0.08)`;
    this.dom.style.opacity = '0';

    void this.dom.offsetWidth;

    this.dom.style.transition = 'transform 500ms cubic-bezier(.2,.8,.2,1), opacity 320ms linear';
    this.dom.style.transform = '';
    this.dom.style.opacity = '1';

    const onEnd = (ev) => {
      if (ev.propertyName !== 'transform') return;

      this.dom.removeEventListener('transitionend', onEnd);

      this.dom.style.transition = '';
      this.dom.style.opacity = '';
      this.isMinimized = false;
      this._updatePillActiveState(true);
    };

    this.dom.addEventListener('transitionend', onEnd);
  }

  _createMinimizedIcon() {
    const icon = new UIDiv();
    /** @type {any} */ const dockItem = icon;

    icon.dom.classList.add('MinimizedIcon');

    icon.dom.style.zIndex = '1';

    const titleText = this.title && this.title.text && this.title.text.dom
      ? this.title.text.dom.textContent || ''
      : '';

    let panelIconElement = null;

    if (this.minimizedImageSrc) {
      const panelImageElement = document.createElement('img');
      panelImageElement.className = 'MinimizedIcon-image';
      panelImageElement.src = this.minimizedImageSrc;
      panelImageElement.alt = titleText || 'Floating panel';
      icon.dom.appendChild(panelImageElement);
      panelIconElement = panelImageElement;
    } else {
      const panelIconSpan = new UIIcon(this.panelIcon || 'open_in_full');
      icon.dom.appendChild(panelIconSpan.dom);
      panelIconElement = panelIconSpan.dom;
    }

    const tooltip = new UITooltip(titleText, {
      theme: 'above'
    });

    tooltip.attachTo(icon.dom, { followMouse: true });

    const container = document.getElementById('Windows') || document.body;

    container.appendChild(icon.dom);

    dockItem._tooltip = tooltip;

    icon.dom.addEventListener('mouseenter', () => {
      panelIconElement.style.opacity = '1';
    });

    icon.dom.addEventListener('mouseleave', () => {
      panelIconElement.style.opacity = '0.85';
    });

    icon.dom.onclick = () => {
      this._toggleMinimize();
    };

    this._minimizedIcon = icon;

    return icon;
  }

  _getPanelContainer() {
    if (this._restoreContainer) return this._restoreContainer;
    const worldContainer = document.getElementById('World');
    if (worldContainer) return worldContainer;
    const windowsContainer = document.getElementById('Windows');
    if (windowsContainer) return windowsContainer;
    return document.body;
  }

  // ==================== Content Building ====================

  _buildContent(options) {
    if (options.title) this.setTitle(options.title);

    if (options.icon) this.setIcon(options.icon);

    if (options.startMinimized) {
      this._initializeMinimized();
    }

    if (options.input) {
      const input = new UIInput(options.input.defaultValue || "");
      /** @type {HTMLInputElement} */ (input.dom).placeholder = options.input.placeholder;

      this.input = input;

      this.contentWrapper.add(input);
    }

    if (options.fileInput) {
      const fileInput = new UIInput();

      /** @type {HTMLInputElement} */ (fileInput.dom).type = "file";

      /** @type {HTMLInputElement} */ (fileInput.dom).accept = options.fileInput.accept || "";

      this.fileInput = fileInput;

      this.contentWrapper.add(fileInput);
    }

    if (options.panel) {
      const tabbedPanel = new UITabbedPanel();

      for (const tab of options.panel.tabs) {
        const tabContent = new UIPanel();

        for (const element of tab.content) {
          tabContent.add(element);
        }

        tabbedPanel.addTab(tab.title, tabContent);
      }

      this.contentWrapper.add(tabbedPanel);
    }

    if (options.content) {
      this.contentWrapper.add(options.content);
    }

    if (options.confirm || options.cancel) {
      const buttonContainer = new UIPanel();

      buttonContainer.dom.style.display = "flex";

      buttonContainer.dom.style.gap = "var(--spacing-md)";

      buttonContainer.dom.style.justifyContent = "flex-end";

      if (options.confirm) {
        const confirmButton = new UIButton(options.confirm.text);

        confirmButton.onClick(() => {
          let value = null;
          if (this.input) {
            value = this.input.getValue();
          } else if (this.fileInput && this.fileInput.dom) {
            const fileInputElement = /** @type {HTMLInputElement} */ (this.fileInput.dom);
            value = fileInputElement.files && fileInputElement.files[0] ? fileInputElement.files[0] : null;
          }

          options.confirm.onClick(value);

          this.close();
        });

        buttonContainer.add(confirmButton);
      }

      if (options.cancel) {
        const cancelButton = new UIButton(options.cancel.text);

        cancelButton.onClick(() => this.close());

        buttonContainer.add(cancelButton);
      }

      this.add(buttonContainer);
    }
  }

  _initializeMinimized() {
    if (this.isMinimized) return;

    this._ensurePillRegistered(false);

    this.dom.style.display = 'none';
    this.dom.classList.add('minimized');
    this.isMinimized = true;
    this._pinned = null;
  }

}

export { FloatingPanel };
