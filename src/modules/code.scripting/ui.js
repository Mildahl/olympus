import { Components as UIComponents } from '../../ui/Components/Components.js';

import dataStore from '../../data/index.js';

import FocusManager from '../../utils/FocusManager.js';

import Paths from '../../utils/paths.js';

import CodeEditorTool from '../../tool/code/CodeEditorTool.js';


class ScriptsUI {
  constructor({ context, operators }) {
    this.context = context;
    this.operators = operators;

    this.searchQuery = '';
    this.listContainer = null;
    this.scriptsPane = null;
    this.scriptsSidebarVisible = true;
    this.panel = null;
    this.panelRoot = null;

    this.editorPane = UIComponents.div().addClass('ScriptingPanel-editorHost');

    this._onShowCodeEditorBound = (payload) => {
      if (!payload) {
        return;
      }

      if (payload.visible) {
        if (this.panel && this.panel.isMinimized) {
          this.panel.restore();
        }

        if (this.panel && this.context.viewport?.dom) {
          this.context.viewport.dom.appendChild(this.panel.dom);
        }

        this.panel.show();
        this._syncEditorWindowState();

        if (this.scriptEditorWindow) {
          this.scriptEditorWindow.scheduleMonacoLayout();
        }
      } else {
        this.panel.hide();
      }
    };

    this._boundRefreshList = () => {
      this.updateScriptsList();
    };

    this._buildPanel();

    this.scriptEditorWindow = new ScriptEditorWindow({
      context,
      operators,
      embedHost: this.editorPane,
      onShow: () => {
        this._syncEditorWindowState();
      },
      onHide: () => {},
      onScriptsSidebarToggle: () => {
        this._toggleScriptsSidebarFromToolbar();
      },
      onNewScript: () => {
        this.showNewScriptDialog();
      },
    });

    this._bindSignals();
    this.updateScriptsList();
    this._syncEditorWindowState();
    this._mountPanel();
    this._setEditorVisible(false);
  }

  _bindSignals() {
    const signals = this.context.signals;

    signals.showCodeEditor.add(this._onShowCodeEditorBound);
    signals.newScript.add(this._boundRefreshList);
    signals.scriptNameChanged.add(this._boundRefreshList);
  }

  _buildPanel() {
    this.panel = UIComponents.floatingPanel({
      context: this.context,
      title: 'Scripts',
      moduleId: 'code.scripting',
      icon: 'code',
      minimizedImageSrc: Paths.data('resources/images/python.svg'),
      workspaceTabId: 'code-scripting',
      workspaceTabLabel: 'Scripts',
      startMinimized: true,
    });

    this.panel
      .setStyle('width', ['min(78vw, 1180px)'])
      .setStyle('height', ['min(82vh, 820px)'])
      .setStyle('min-width', ['min(520px, 92vw)'])
      .setStyle('min-height', ['360px'])
      .setStyle('max-width', ['92vw'])
      .setStyle('max-height', ['90vh']);

    this.panel.onClose(() => {
      this._setEditorVisible(false);
      if (this.scriptEditorWindow) {
        this.scriptEditorWindow.hide();
      }
    });

    this.panelRoot = UIComponents.row();
    this.panelRoot.addClass('ScriptingPanel-root');

    this.scriptsPane = UIComponents.column();
    this.scriptsPane.addClass('ScriptingPanel-sidebar');

    const searchContainer = UIComponents.row();
    searchContainer.addClass('ScriptingPanel-searchRow');

    const searchInput = UIComponents.input();
    searchInput.addClass('ScriptingPanel-searchInput');
    searchInput.dom.setAttribute('placeholder', 'Search scripts...');
    searchInput.dom.addEventListener('input', () => {
      this.filterCollections(searchInput.getValue());
    });

    searchContainer.add(searchInput);
    this.scriptsPane.add(searchContainer);

    this.listContainer = UIComponents.column();
    this.scriptsPane.add(this.listContainer);

    this.panelRoot.add(this.scriptsPane);
    this.panelRoot.add(this.editorPane);

    this.panel.setContent(this.panelRoot);
    this._applyScriptsSidebarVisibility();
  }

  _mountPanel() {
    if (!this.panel.dom.parentNode) {
      this.context.viewport.dom.appendChild(this.panel.dom);
    }
  }

  _setEditorVisible(visible) {
    this.context._codeEditorVisible = Boolean(visible);
  }

  _applyScriptsSidebarVisibility() {
    if (!this.scriptsPane) {
      return;
    }

    if (this.scriptsSidebarVisible) {
      this.scriptsPane.addClass('ScriptingPanel-sidebar-open');
    } else {
      this.scriptsPane.removeClass('ScriptingPanel-sidebar-open');
    }
  }

  _toggleScriptsSidebarFromToolbar() {
    this.scriptsSidebarVisible = !this.scriptsSidebarVisible;
    this._syncEditorWindowState();
  }

  _syncEditorWindowState() {
    this._applyScriptsSidebarVisibility();

    if (!this.scriptEditorWindow) {
      return;
    }

    this.context._scriptEditorContainer = this.scriptEditorWindow.getEditorContainer();
    this.scriptEditorWindow.setScriptsSidebarToggleActive(this.scriptsSidebarVisible);
    this.scriptEditorWindow.scheduleMonacoLayout();
  }



  destroy() {
    const signals = this.context.signals;
    const remove = (signal, handler) => {
      if (signal && handler && typeof signal.remove === 'function') {
        signal.remove(handler);
      }
    };

    remove(signals.showCodeEditor, this._onShowCodeEditorBound);
    remove(signals.newScript, this._boundRefreshList);
    remove(signals.scriptNameChanged, this._boundRefreshList);

    if (this.scriptEditorWindow) {
      this.scriptEditorWindow.dispose();
      this.scriptEditorWindow = null;
    }

    if (this.panel && !this.panel.isClosed) {
      this.panel.close();
    }

    this.context._scriptEditorContainer = null;
    this._setEditorVisible(false);
  }

  updateScriptsList() {

    this.listContainer.clear();

    const allCollections = dataStore.getCollections('CodeCollection');
    const collections = this.searchQuery
      ? allCollections.filter((col) => (
          col.name && col.name.toLowerCase().includes(this.searchQuery.toLowerCase())
        ))
      : allCollections;

    if (collections.length === 0) {
      const emptyMessage = UIComponents.text(
        this.searchQuery ? 'No scripts match your search' : 'No scripts yet'
      );

      emptyMessage
        .setStyle('padding', ['1rem'])
        .setStyle('text-align', ['center'])
        .setStyle('color', ['var(--theme-text-light)'])
        .setStyle('font-size', ['0.8rem']);

      this.listContainer.add(emptyMessage);

      return;
    }

    for (const collection of collections) {
      this.listContainer.add(this.drawScriptRow(collection));
    }
  }

  showNewScriptDialog() {
    const overlay = UIComponents.div();
    overlay.setStyles({
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      'z-index': '10000',
    });

    const dialog = UIComponents.column();
    dialog.setStyles({
      background: 'var(--theme-background)',
      border: '1px solid var(--border)',
      'border-radius': '8px',
      padding: '1rem',
      'min-width': '300px',
      gap: '0.75rem',
    });

    const title = UIComponents.text('New Script');
    title.setStyles({
      'font-weight': '600',
      'font-size': '1rem',
      'margin-bottom': '0.5rem',
    });
    dialog.add(title);

    const nameLabel = UIComponents.text('Name:');
    nameLabel.setStyles({
      'font-size': '0.8rem',
      color: 'var(--theme-text-light)',
    });
    dialog.add(nameLabel);

    const nameInput = UIComponents.input();
    nameInput.dom.setAttribute('placeholder', 'Script name');
    nameInput.setStyles({
      padding: '0.5rem',
      border: '1px solid var(--border)',
      'border-radius': '4px',
      background: 'var(--theme-background-2)',
    });
    dialog.add(nameInput);

    const langLabel = UIComponents.text('Language:');
    langLabel.setStyles({
      'font-size': '0.8rem',
      color: 'var(--theme-text-light)',
    });
    dialog.add(langLabel);

    const langSelect = UIComponents.select();
    langSelect.setOptions({ python: 'Python', javascript: 'JavaScript' });
    langSelect.setValue('python');
    langSelect.setStyles({
      padding: '0.5rem',
      border: '1px solid var(--border)',
      'border-radius': '4px',
      background: 'var(--theme-background-2)',
    });
    dialog.add(langSelect);

    const buttonsRow = UIComponents.row();
    buttonsRow.setStyles({
      'justify-content': 'flex-end',
      gap: '0.5rem',
      'margin-top': '0.5rem',
    });

    let dismissed = false;
    const dismiss = () => {
      if (dismissed) {
        return;
      }

      dismissed = true;

      if (overlay.dom.parentNode) {
        overlay.dom.parentNode.removeChild(overlay.dom);
      }
    };

    const cancelBtn = UIComponents.text('Cancel');
    cancelBtn.addClass('Button');
    cancelBtn.setStyles({
      padding: '0.5rem 1rem',
      cursor: 'pointer',
      'border-radius': '4px',
    });
    cancelBtn.onClick(dismiss);
    buttonsRow.add(cancelBtn);

    const createBtn = UIComponents.text('Create');
    createBtn.addClass('Button');
    createBtn.setStyles({
      padding: '0.5rem 1rem',
      cursor: 'pointer',
      background: 'var(--primary)',
      color: 'white',
      'border-radius': '4px',
    });
    createBtn.onClick(async () => {
      const name = nameInput.getValue().trim() || 'Untitled Script';
      const language = langSelect.getValue();
      const result = await this.operators.execute('code.new_script', this.context, name, language);

      dismiss();

      const guid = result && result.codeCollection && result.codeCollection.guid;

      if (guid) {
        await this.operators.execute('code.open_script', this.context, guid);
      }
    });
    buttonsRow.add(createBtn);

    dialog.add(buttonsRow);
    overlay.add(dialog);
    overlay.dom.addEventListener('click', (event) => {
      if (event.target === overlay.dom) {
        dismiss();
      }
    });

    document.body.appendChild(overlay.dom);
  }

  drawScriptRow(collection) {
    const item = UIComponents.listItem().addClass('Clickable');
    item.setStyles({
      'justify-content': 'space-between',
      'align-items': 'center',
    });

    const nameContainer = UIComponents.div();
    nameContainer.setStyle('flex', ['1']);

    const name = UIComponents.text(collection.name || 'Unnamed Script');
    name.addClass('ListboxItem-name');
    nameContainer.add(name);

    const runCount = UIComponents.text().addClass('GameNumber');
    runCount.setValue(`${collection.runCount || 0}`);
    item.add(runCount);

    const languageIconPath = collection.language === 'python'
      ? Paths.data('resources/images/python.svg')
      : Paths.data('resources/images/javascript.svg');
    item.add(UIComponents.image(languageIconPath, { width: '1rem', height: '1rem' }));

    nameContainer.dom.addEventListener('dblclick', (event) => {
      event.stopPropagation();
      this.showRenameInput(nameContainer, name, collection);
    });
    item.add(nameContainer);

    const info = UIComponents.row();
    info.setStyles({
      gap: '0.5rem',
      'align-items': 'center',
    });

    const quickRunButton = UIComponents.operator('play_arrow');
    quickRunButton.setStyle('color', ['var(--green)']);
    quickRunButton.onClick((event) => {
      event.stopPropagation();
      this.operators.execute('code.run_script', this.context, collection.guid);
    });
    info.add(quickRunButton);

    info.addClass('ListboxItem-info');
    item.add(info);

    item.dom.addEventListener('click', () => {
      this.operators.execute('code.open_script', this.context, collection.guid);
    });

    return item;
  }

  filterCollections(searchQuery) {
    this.searchQuery = searchQuery;
    this.updateScriptsList();
  }

  showRenameInput(container, nameElement, collection) {
    nameElement.setStyle('display', ['none']);

    const currentDisplayName = nameElement.dom.textContent || collection.name || '';
    const input = UIComponents.input();
    input.setValue(currentDisplayName);
    input.setStyles({
      padding: '0.25rem',
      'font-size': 'inherit',
      border: '1px solid var(--primary)',
      'border-radius': '2px',
      background: 'var(--theme-background-2)',
      width: '100%',
    });
    container.add(input);

    input.dom.focus();
    

    let finished = false;
    const restoreName = () => {
      nameElement.setStyle('display', ['']);
    };

    const removeInput = () => {
      if (container.dom.contains(input.dom)) {
        container.dom.removeChild(input.dom);
      }
    };

    const finishEdit = () => {
      if (finished) {
        return;
      }

      finished = true;

      const newName = input.getValue().trim();
      if (newName && newName !== collection.name) {
        this.operators.execute('code.rename_script', this.context, collection.guid, newName);
        nameElement.setValue(newName);
      }

      removeInput();
      restoreName();
    };

    input.dom.addEventListener('blur', finishEdit);
    input.dom.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        finishEdit();
      } else if (event.key === 'Escape') {
        finished = true;
        removeInput();
        restoreName();
      }
    });
  }
}

class ScriptEditorWindow {
  constructor({
    context,
    operators,
    embedHost,
    onShow,
    onHide,
    onScriptsSidebarToggle,
    onNewScript,
  }) {
    if (!embedHost) {
      throw new Error('ScriptEditorWindow requires embedHost');
    }

    this.context = context;
    this.operators = operators;
    this.embedHost = embedHost;
    this.onShow = onShow || null;
    this.onHide = onHide || null;
    this.onScriptsSidebarToggle = onScriptsSidebarToggle || null;
    this.onNewScript = onNewScript || null;

    this.scriptsSidebarToggleButton = null;
    this.isVisible = false;
    this.mainContainer = null;
    this.activeScriptGuid = null;
    this.activeCollection = null;
    this.openTabs = new Map();
    this.tabBar = null;
    this.editorContainer = null;
    this.editorEmptyState = null;
    this.consoleSection = null;
    this.consoleOutputElement = null;

    this._signalUnsubscribers = [];
    this._domUnsubscribers = [];

    this._buildWindow();
    this._setupSignals();
  }

  _buildWindow() {
    const mainContainer = UIComponents.div();
    mainContainer.addClass('CodeEditor');

    FocusManager.registerContext('codeEditor', mainContainer.dom, { priority: 2 });

    this.toolbar = this._createToolbar();
    mainContainer.add(this.toolbar);

    this.tabBar = this._createTabBar();
    mainContainer.add(this.tabBar);

    this.editorContainer = UIComponents.div();
    this.editorContainer.addClass('CodeEditor-area');

    this.editorEmptyState = UIComponents.div();
    this.editorEmptyState.addClass('CodeEditor-empty-state');
    this.editorEmptyState.dom.textContent = 'Click on a script to start hacking';
    this.editorContainer.add(this.editorEmptyState);

    mainContainer.add(this.editorContainer);

    const verticalResizer = this._createResizer();
    mainContainer.add(verticalResizer);

    this.consoleSection = this._createConsoleSection();
    mainContainer.add(this.consoleSection);

    this.mainContainer = mainContainer;
    this.embedHost.add(mainContainer);
  }

  _listenDomEvent(target, eventName, handler) {
    if (!target || typeof target.addEventListener !== 'function') {
      return;
    }

    target.addEventListener(eventName, handler);
    this._domUnsubscribers.push(() => {
      target.removeEventListener(eventName, handler);
    });
  }

  _createToolbar() {
    const toolbar = UIComponents.div();
    toolbar.addClass('CodeEditor-toolbar');

    const leftTools = UIComponents.div();
    leftTools.addClass('CodeEditor-toolbar-left');

    if (this.onScriptsSidebarToggle) {
      const sidebarToggleButton = this._createToolbarButton(
        'dock_to_left',
        'Show script list',
        () => {
          this.onScriptsSidebarToggle();
        },
      );

      this.scriptsSidebarToggleButton = sidebarToggleButton;
      leftTools.add(sidebarToggleButton);
    }

    toolbar.add(leftTools);

    this.activeScriptInfo = UIComponents.div();
    this.activeScriptInfo.addClass('CodeEditor-toolbar-center');
    toolbar.add(this.activeScriptInfo);

    const rightTools = UIComponents.div();
    rightTools.addClass('CodeEditor-toolbar-right');

    if (this.onNewScript) {
      const newScriptBtn = this._createToolbarButton('add', 'New script', () => {
        this.onNewScript();
      });
      rightTools.add(newScriptBtn);
    }

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
    const iconElement = UIComponents.operator(icon);
    iconElement.addClass('CodeEditor-toolbar-btn');
    iconElement.dom.title = title;
    iconElement.onClick(onClick);

    return iconElement;
  }

  setScriptsSidebarToggleActive(visible) {
    const toggleButton = this.scriptsSidebarToggleButton;

    if (!toggleButton || !toggleButton.dom) {
      return;
    }

    toggleButton.dom.title = visible ? 'Hide script list' : 'Show script list';

    if (visible) {
      toggleButton.addClass('Active');
    } else {
      toggleButton.removeClass('Active');
    }
  }

  _createTabBar() {
    const tabBar = UIComponents.div();
    tabBar.addClass('Tabs');

    return tabBar;
  }

  _renderTabs() {
    if (!this.tabBar) {
      return;
    }

    this.tabBar.clear();

    for (const [guid, collection] of this.openTabs) {
      this.tabBar.add(this._createTab(guid, collection));
    }
  }

  _createTab(guid, collection) {
    const tab = UIComponents.div();
    tab.addClass('Tab');

    if (guid === this.activeScriptGuid) {
      tab.addClass('Active');
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
    closeBtn.dom.addEventListener('click', (event) => {
      event.stopPropagation();
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
    if (!codeCollection || !codeCollection.guid) {
      return;
    }

    if (!this.openTabs.has(codeCollection.guid)) {
      this.openTabs.set(codeCollection.guid, codeCollection);
    }

    this._renderTabs();
  }

  _removeTab(guid) {
    if (!this.openTabs.has(guid)) {
      return;
    }

    this.openTabs.delete(guid);

    if (guid === this.activeScriptGuid) {
      const remainingGuids = Array.from(this.openTabs.keys());

      if (remainingGuids.length > 0) {
        const newActiveGuid = remainingGuids[remainingGuids.length - 1];
        this.operators.execute('code.switch_script', this.context, newActiveGuid);
      } else {
        this.activeScriptGuid = null;
        this.activeCollection = null;

        if (typeof CodeEditorTool.monacoEditor.clearActiveEditor === 'function') {
          CodeEditorTool.monacoEditor.clearActiveEditor();
        }

        CodeEditorTool.activeScriptGuid = null;
        this._clearConsole();
        this._updateActiveScriptInfo();
        this._scheduleMonacoLayout();
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

    this._listenDomEvent(verticalResizer.dom, 'mousedown', (event) => {
      isResizing = true;
      startY = event.clientY;
      startHeight = this.consoleSection.dom.offsetHeight;

      verticalResizer.addClass('resizing');
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';

      event.preventDefault();
    });

    this._listenDomEvent(document, 'mousemove', (event) => {
      if (!isResizing) {
        return;
      }

      const deltaY = startY - event.clientY;
      const newHeight = Math.max(100, Math.min(startHeight + deltaY, window.innerHeight * 0.6));

      this.consoleSection.dom.style.height = `${newHeight}px`;
    });

    this._listenDomEvent(document, 'mouseup', () => {
      if (!isResizing) {
        return;
      }

      isResizing = false;
      verticalResizer.removeClass('resizing');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
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

  scheduleMonacoLayout() {
    this._scheduleMonacoLayout();
  }

  _scheduleMonacoLayout() {
    const runLayout = () => {
      CodeEditorTool.layoutEditor();
    };

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        requestAnimationFrame(runLayout);
      });
    } else {
      runLayout();
    }
  }

  _subscribeSignal(signal, handler) {
    if (!signal || typeof signal.add !== 'function') {
      return;
    }

    signal.add(handler);
    this._signalUnsubscribers.push(() => {
      if (typeof signal.remove === 'function') {
        signal.remove(handler);
      }
    });
  }

  _setupSignals() {
    const signals = this.context.signals;

    this._subscribeSignal(signals.openScript, async ({ codeCollection }) => {
      if (!codeCollection || !codeCollection.guid) {
        return;
      }

      await this._displayScript(codeCollection);
      this._scheduleMonacoLayout();
    });

    this._subscribeSignal(signals.openOutput, ({ language, outputText, scriptName }) => {
      const ext = language === 'python' ? '.py' : '.js';

      this._appendToConsole(`>>> ${scriptName}${ext}`);
      this._appendToConsole(outputText);
    });

    this._subscribeSignal(signals.scriptNameChanged, ({ guid, name }) => {
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

    this._subscribeSignal(signals.newScript, () => {
      if (this.activeCollection) {
        this._updateActiveScriptInfo();
      }
    });

    this._subscribeSignal(signals.scriptTabClosed, ({ guid }) => {
      this._removeTab(guid);
    });
  }



  async _displayScript(codeCollection) {

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
    if (!this.consoleOutputElement) {
      return;
    }

    const hasContent = this.consoleOutputElement.textContent.length > 0;
    const separator = hasContent ? '\n' : '';

    this.consoleOutputElement.textContent += separator + text;
    this.consoleOutputElement.scrollTop = this.consoleOutputElement.scrollHeight;
  }

  _clearConsole() {
    if (!this.consoleOutputElement) {
      return;
    }

    this.consoleOutputElement.textContent = '';
  }

  async _copyConsoleToClipboard() {
    if (!this.consoleOutputElement) {
      return;
    }

    try {
      await navigator.clipboard.writeText(this.consoleOutputElement.textContent);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }

  _updateActiveScriptInfo() {
    const collection = this.activeCollection;

    if (!collection) {
      this.activeScriptInfo.clear();
      this.editorEmptyState.setStyle('display', ['flex']);

      return;
    }

    this.editorEmptyState.setStyle('display', ['none']);
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
    if (!this.activeScriptGuid) {
      return;
    }

    this.operators.execute('code.save_script', this.context, this.activeScriptGuid);
  }

  _runActiveScript() {
    if (!this.activeScriptGuid) {
      return;
    }

    this.operators.execute('code.run_script', this.context, this.activeScriptGuid);
  }

  dispose() {
    for (const unsub of this._signalUnsubscribers) {
      unsub();
    }
    this._signalUnsubscribers = [];

    for (const unsub of this._domUnsubscribers) {
      unsub();
    }
    this._domUnsubscribers = [];

    FocusManager.unregisterContext('codeEditor');

    if (this.mainContainer && this.mainContainer.dom.parentNode) {
      this.mainContainer.dom.parentNode.removeChild(this.mainContainer.dom);
    }

    if (this.context && this.context._scriptEditorContainer === this.editorContainer.dom) {
      this.context._scriptEditorContainer = null;
    }

    this.openTabs.clear();
    this.activeScriptGuid = null;
    this.activeCollection = null;
    this.consoleOutputElement = null;
  }
}

export { ScriptsUI };