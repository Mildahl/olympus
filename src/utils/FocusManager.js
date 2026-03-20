/**
 * FocusManager - Centralized context-aware focus management
 * 
 * Tracks which UI context (3D viewport, code editor, etc.) currently has focus
 * based on mouse position. This prevents keyboard shortcut conflicts between
 * different parts of the application.
 * 
 * Usage:
 *   FocusManager.registerContext('viewport', canvasElement);
 *   FocusManager.registerContext('codeEditor', editorElement);
 *   
 *   if (FocusManager.isContextActive('viewport')) {
 *     // Handle 3D viewport shortcuts
 *   }
 */

class FocusManagerClass {
  constructor() {
    
    this.contexts = new Map();
    this.activeContext = null;
    this.focusedElement = null;
    this.listeners = new Set();
    this._setupGlobalListeners();
  }

  _setupGlobalListeners() {
    
    document.addEventListener('focusin', (e) => {
      this.focusedElement = e.target;

      this._checkInputFocus(e.target);
    });

    document.addEventListener('focusout', () => {
      this.focusedElement = null;
    });
  }

  /**
   * Register a context with its DOM element
   * @param {string} contextName - Unique name for the context (e.g., 'viewport', 'codeEditor')
   * @param {HTMLElement} element - The DOM element for this context
   * @param {Object} options - Optional configuration
   */
  registerContext(contextName, element, options = {}) {
    if (!element) return;
    const context = {
      name: contextName,
      element,
      isActive: false,
      priority: options.priority || 0,
      ...options
    };

    this.contexts.set(contextName, context);
    element.addEventListener('mouseenter', () => {
      this._setActiveContext(contextName);
    });

    element.addEventListener('mouseleave', (e) => {
      
      if (!element.contains(e.relatedTarget)) {
        this._clearActiveContext(contextName);
      }
    });
    element.addEventListener('mousedown', () => {
      this._setActiveContext(contextName);
    });

  }

  /**
   * Unregister a context
   * @param {string} contextName - Name of the context to remove
   */
  unregisterContext(contextName) {
    this.contexts.delete(contextName);
    
    if (this.activeContext === contextName) {
      this.activeContext = null;
    }
  }

  /**
   * Check if a specific context is currently active
   * @param {string} contextName - Name of the context to check
   * @returns {boolean}
   */
  isContextActive(contextName) {
    return this.activeContext === contextName;
  }

  /**
   * Check if the current focus is on an input element (text input, textarea, etc.)
   * @returns {boolean}
   */
  isInputFocused() {
    const focused = this.focusedElement || document.activeElement;
    
    if (!focused) return false;

    const tagName = focused.tagName?.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
      return true;
    }
    if (focused.isContentEditable) {
      return true;
    }
    if (focused.closest('.monaco-editor') || 
        focused.closest('.monaco-inputarea') ||
        focused.classList?.contains('inputarea')) {
      return true;
    }

    return false;
  }

  /**
   * Check if viewport context is active AND no input is focused
   * This is the main check for 3D navigation/shortcuts
   * @returns {boolean}
   */
  canHandleViewportShortcuts() {
    
    if (this.isInputFocused()) {
      return false;
    }
    return this.isContextActive('viewport');
  }

  /**
   * Check if code editor context is active
   * @returns {boolean}
   */
  canHandleCodeEditorShortcuts() {
    return this.isContextActive('codeEditor') || this.isInputFocused();
  }

  /**
   * Get the currently active context name
   * @returns {string|null}
   */
  getActiveContext() {
    return this.activeContext;
  }

  /**
   * Add a listener for context changes
   * @param {Function} callback - Called with (newContext, oldContext)
   */
  addListener(callback) {
    this.listeners.add(callback);
  }

  /**
   * Remove a context change listener
   * @param {Function} callback
   */
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  /**
   * Force set a context as active (useful for programmatic focus)
   * @param {string} contextName
   */
  setActiveContext(contextName) {
    this._setActiveContext(contextName);
  }
  _setActiveContext(contextName) {
    if (this.activeContext === contextName) return;

    const oldContext = this.activeContext;

    this.activeContext = contextName;

    this.contexts.forEach((ctx, name) => {
      ctx.isActive = (name === contextName);
    });

    this.listeners.forEach(callback => {
      try {
        callback(contextName, oldContext);
      } catch (e) {
        console.error('[FocusManager] Listener error:', e);
      }
    });
  }

  _clearActiveContext(contextName) {
    if (this.activeContext === contextName) {
      this.activeContext = null;
      
      const context = this.contexts.get(contextName);

      if (context) {
        context.isActive = false;
      }
    }
  }

  _checkInputFocus(element) {
    
    this.contexts.forEach((context, name) => {
      if (context.element.contains(element)) {
        this._setActiveContext(name);
      }
    });
  }
}
const FocusManager = new FocusManagerClass();

export default FocusManager;

export { FocusManager };
