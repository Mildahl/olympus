import { Components as UIComponents } from '../../ui/Components/Components.js';

import FocusManager from '../../utils/FocusManager.js';

import Paths from '../../utils/paths.js';

class ScriptEditorWindow {
  constructor({ context, operators }) {
    this.context = context;

    this.operators = operators;
    
    this.isVisible = false;

    this.floatingPanel = null;
    
    this.activeScriptGuid = null;

    this.activeCollection = null;
    
    this.openTabs = new Map();

    this.tabBar = null;

    this.editorContainer = null;

    this.consoleOutputElement = null;
    
    this._buildWindow();

    this._setupSignals();
  }

  _buildWindow() {
    this.floatingPanel = UIComponents.floatingPanel({ title: 'Script Editor' });

    this.floatingPanel.setId('WindowCodeEditor');

    this.floatingPanel.setIcon('code');

    this.floatingPanel.pinRight();

    this.floatingPanel.onClose(() => {
      this.isVisible = false;
    });

    const isMobile = window.innerWidth <= 768;

    this.floatingPanel.setStyles({
      "max-height": "calc(100vh)",
      "width": isMobile ? "50vw" : "30vw",
      "max-width": "calc(100vw - var(--sidebar-width))"
    });

    const mainContainer = UIComponents.div();

    mainContainer.addClass('CodeEditor');

    FocusManager.registerContext('codeEditor', mainContainer.dom, { priority: 2 });

    this.toolbar = this._createToolbar();

    mainContainer.add(this.toolbar);

    this.tabBar = this._createTabBar();

    mainContainer.add(this.tabBar);

    this.editorContainer = UIComponents.div();

    this.editorContainer.addClass('CodeEditor-area');

    mainContainer.add(this.editorContainer);

    const verticalResizer = this._createResizer();

    mainContainer.add(verticalResizer);

    this.consoleSection = this._createConsoleSection();

    mainContainer.add(this.consoleSection);

    const contentEl = this.floatingPanel.dom.querySelector('.FloatingPanel-content');

    contentEl.innerHTML = '';

    contentEl.appendChild(mainContainer.dom);
  }

  _createToolbar() {
    const toolbar = UIComponents.div();

    toolbar.addClass('CodeEditor-toolbar');

    const leftTools = UIComponents.div();

    leftTools.addClass('CodeEditor-toolbar-left');

    toolbar.add(leftTools);

    this.activeScriptInfo = UIComponents.div();

    this.activeScriptInfo.addClass('CodeEditor-toolbar-center');

    toolbar.add(this.activeScriptInfo);

    const rightTools = UIComponents.div();

    rightTools.addClass('CodeEditor-toolbar-right');

    const saveBtn = this._createToolbarButton('save', 'Save (Ctrl+S)', () => {
      this._saveActiveScript();
    });

    rightTools.add(saveBtn);

    const runBtn = this._createToolbarButton('play_arrow', 'Run (Ctrl+Enter)', () => {
      this._runActiveScript();
    });

    runBtn.addClass('run');

    rightTools.add(runBtn);

    toolbar.add(rightTools);

    return toolbar;
  }

  _createToolbarButton(icon, title, onClick) {
    const btn = UIComponents.div();

    btn.addClass('CodeEditor-toolbar-btn');

    btn.dom.title = title;
    
    const iconElement = UIComponents.operator(icon);

    btn.add(iconElement);

    btn.onClick(onClick);
    
    return btn;
  }

  _createTabBar() {
    const tabBar = UIComponents.div();

    tabBar.addClass('Tabs');

    return tabBar;
  }

  _renderTabs() {
    if (!this.tabBar) return;

    this.tabBar.clear();

    for (const [guid, collection] of this.openTabs) {
      const tab = this._createTab(guid, collection);

      this.tabBar.add(tab);
    }
  }

  _createTab(guid, collection) {
    const tab = UIComponents.div();

    tab.addClass('Tab');

    if (guid === this.activeScriptGuid) {
      tab.addClass('active');
    }

    const langImg = collection.language === 'python' 
      ? Paths.data('resources/images/python.svg') 
      : Paths.data('resources/images/javascript.svg');

    const langIcon = UIComponents.image(langImg);

    langIcon.addClass('Tab-icon');

    tab.add(langIcon);

    const ext = collection.language === 'python' ? '.py' : '.js';

    const nameText = UIComponents.text(`${collection.name || 'Untitled'}${ext}`);

    nameText.addClass('Tab-label');

    tab.add(nameText);

    const closeBtn = UIComponents.operator('close');

    closeBtn.dom.addEventListener('click', (e) => {
      e.stopPropagation();

      this.operators.execute('code.close_script_tab', this.context, guid);
    });

    tab.add(closeBtn);

    tab.onClick(() => {
      if (guid !== this.activeScriptGuid) {
        this.operators.execute('code.switch_script', this.context, guid);
      }
    });

    return tab;
  }

  _addTab(codeCollection) {
    if (!codeCollection || !codeCollection.guid) return;

    if (!this.openTabs.has(codeCollection.guid)) {
      this.openTabs.set(codeCollection.guid, codeCollection);
    }

    this._renderTabs();
  }

  _removeTab(guid) {
    if (!this.openTabs.has(guid)) return;

    this.openTabs.delete(guid);

    if (guid === this.activeScriptGuid) {
      const remainingGuids = Array.from(this.openTabs.keys());

      if (remainingGuids.length > 0) {
        const newActiveGuid = remainingGuids[remainingGuids.length - 1];

        this.operators.execute('code.switch_script', this.context, newActiveGuid);
      } else {
        this.activeScriptGuid = null;

        this.activeCollection = null;

        this._updateActiveScriptInfo();
      }
    }

    this._renderTabs();
  }

  _createResizer() {
    const verticalResizer = UIComponents.div();

    verticalResizer.addClass('CodeEditor-resizer');
    
    let isResizing = false;

    let startY = 0;

    let startHeight = 0;
    
    verticalResizer.dom.addEventListener('mousedown', (e) => {
      isResizing = true;

      startY = e.clientY;

      startHeight = this.consoleSection.dom.offsetHeight;

      verticalResizer.addClass('resizing');

      document.body.style.cursor = 'ns-resize';

      document.body.style.userSelect = 'none';

      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;

      const deltaY = startY - e.clientY;

      const newHeight = Math.max(100, Math.min(startHeight + deltaY, window.innerHeight * 0.6));

      this.consoleSection.dom.style.height = newHeight + 'px';
    });
    
    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;

        verticalResizer.removeClass('resizing');

        document.body.style.cursor = '';

        document.body.style.userSelect = '';
      }
    });

    return verticalResizer;
  }

  _createConsoleSection() {
    const section = UIComponents.div();

    section.addClass('EditorConsole');

    const header = UIComponents.div();

    header.addClass('ConsoleHeader');

    const title = UIComponents.text('Console Output');

    title.addClass('ConsoleHeader-title');

    header.add(title);

    const actions = UIComponents.div();

    actions.addClass('ConsoleHeader-actions');

    const clearBtn = this._createToolbarButton('delete_sweep', 'Clear Console', () => {
      this._clearConsole();
    });

    actions.add(clearBtn);

    const copyBtn = this._createToolbarButton('content_copy', 'Copy Output', async () => {
      await this._copyConsoleToClipboard();
    });

    actions.add(copyBtn);

    header.add(actions);

    section.add(header);

    this.consoleOutputElement = document.createElement('pre');

    this.consoleOutputElement.className = 'CodeEditorOutput';

    section.dom.appendChild(this.consoleOutputElement);

    return section;
  }

  _setupSignals() {
    const { signals } = this.context;

    signals.openScript.add(async ({ codeCollection }) => {
      if (!codeCollection || !codeCollection.guid) return;

      await this._displayScript(codeCollection);
    });

    signals.openOutput.add(({ language, outputText, scriptName }) => {
      const ext = language === 'python' ? '.py' : '.js';

      this._appendToConsole(`>>> ${scriptName}${ext}`);

      this._appendToConsole(outputText);
    });

    signals.scriptNameChanged.add(({ guid, name }) => {
      if (this.openTabs.has(guid)) {
        const collection = this.openTabs.get(guid);

        collection.name = name;

        this._renderTabs();
      }

      if (guid === this.activeScriptGuid && this.activeCollection) {
        this.activeCollection.name = name;

        this._updateActiveScriptInfo();
      }
    });

    signals.newScript.add(() => {
      if (this.activeCollection) {
        this._updateActiveScriptInfo();
      }
    });

    signals.scriptTabClosed.add(({ guid }) => {
      this._removeTab(guid);
    });

    signals.scriptTabsRefresh.add(() => {
      this._renderTabs();
    });
  }

  show() {
    if (this.isVisible) return;

    const parentContainer = this.context?.dom || document.body;

    this.floatingPanel.show(parentContainer);

    this.isVisible = true;

    this.context._scriptEditorContainer = this.editorContainer.dom;
  }

  hide() {
    if (!this.isVisible) return;

    this.floatingPanel.dom.remove();

    this.isVisible = false;
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  async _displayScript(codeCollection) {
    if (!this.isVisible) {
      this.show();
    }

    this._addTab(codeCollection);

    this.activeScriptGuid = codeCollection.guid;

    this.activeCollection = codeCollection;

    this._renderTabs();

    this._updateActiveScriptInfo();
  }

  getEditorContainer() {
    return this.editorContainer.dom;
  }

  _appendToConsole(text) {
    if (!this.consoleOutputElement) return;

    const hasContent = this.consoleOutputElement.textContent.length > 0;

    const separator = hasContent ? '\n' : '';

    this.consoleOutputElement.textContent += separator + text;

    this.consoleOutputElement.scrollTop = this.consoleOutputElement.scrollHeight;
  }

  _clearConsole() {
    if (!this.consoleOutputElement) return;

    this.consoleOutputElement.textContent = '';
  }

  async _copyConsoleToClipboard() {
    if (!this.consoleOutputElement) return;

    const text = this.consoleOutputElement.textContent;

    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  }

  _updateActiveScriptInfo() {
    const collection = this.activeCollection;

    if (!collection) {
      this.activeScriptInfo.clear();

      return;
    }

    this.activeScriptInfo.clear();

    const ext = collection.language === 'python' ? '.py' : '.js';

    const langImg = collection.language === 'python' 
      ? Paths.data('resources/images/python.svg') 
      : Paths.data('resources/images/javascript.svg');

    const langIcon = UIComponents.image(langImg);

    langIcon.addClass('Tab-icon');

    this.activeScriptInfo.add(langIcon);

    const scriptName = UIComponents.text(`${collection.name || 'Untitled'}${ext}`);

    this.activeScriptInfo.add(scriptName);

    const runInfo = UIComponents.text(`Runs: ${collection.runCount || 0}`);

    runInfo.addClass('Tab-meta');

    this.activeScriptInfo.add(runInfo);
  }

  _saveActiveScript() {
    if (!this.activeScriptGuid) return;

    this.operators.execute('code.save_script', this.context, this.activeScriptGuid);
  }

  _runActiveScript() {
    if (!this.activeScriptGuid) return;

    this.operators.execute('code.run_script', this.context, this.activeScriptGuid);
  }

  dispose() {
    if (this.floatingPanel && this.floatingPanel.dom.parentNode) {
      this.floatingPanel.dom.remove();
    }

    this.activeScriptGuid = null;

    this.activeCollection = null;

    this.consoleOutputElement = null;
  }
}

export { ScriptEditorWindow };
