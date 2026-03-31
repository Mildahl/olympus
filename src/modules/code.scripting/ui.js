import { Components as UIComponents } from '../../ui/Components/Components.js';
import { TabPanel } from '../../../drawUI/TabPanel.js';
import dataStore from '../../data/index.js';

import FocusManager from '../../utils/FocusManager.js';

import Paths from '../../utils/paths.js';

import CodeEditorTool from '../../tool/code/CodeEditorTool.js';

class ScriptsUI extends TabPanel {
  constructor({ context, operators }) {
    super({
      context,
      operators,
      position: 'right',
      tabId: "CodeScriptingPanel",
      tabLabel: 'Code Editor',
      moduleId: "code.scripting",
      icon: 'code',
      title: 'Code Editor',
      showHeader: false,
      floatable: true,
      panelStyles: { minWidth: '240px' },
      autoShow: false,
    });

    this.searchQuery = '';
    this.listContainer = null;
    this.scriptsPane = null;
    this.scriptsSidebarVisible = true;

    this.editorPane = UIComponents.div().addClass('ScriptingPanel-editorHost');

    this.scriptEditorWindow = new ScriptEditorWindow({
      context,
      operators,
      embedHost: this.editorPane,
      onShow: () => { this._refreshScriptEditorDockState(); },
      onHide: () => {},
      onScriptsSidebarToggle: () => { this._toggleScriptsSidebarFromToolbar(); },
      onNewScript: () => { this.showNewScriptDialog(); },
    });

    this._onShowCodeEditorBound = (payload) => {
      if (!payload) return;
      payload.visible ? this.scriptEditorWindow.show() : this.scriptEditorWindow.hide();
    };

    this._boundRefreshList = () => { this.updateScriptsList(); };

    context.signals.showCodeEditor.add(this._onShowCodeEditorBound);
    context.signals.newScript.add(this._boundRefreshList);
    context.signals.scriptNameChanged.add(this._boundRefreshList);

    this.draw();
    this.show();
  }

  _syncEditorPanelLayout() {
    if (!this.scriptsPane || !this.editorPane) return;
    this._applyScriptsSidebarVisibility();
  }

  _applyScriptsSidebarVisibility() {
    if (!this.scriptsPane) return;
    if (this.scriptsSidebarVisible) {
      this.scriptsPane.addClass('ScriptingPanel-sidebar-open');
    } else {
      this.scriptsPane.removeClass('ScriptingPanel-sidebar-open');
    }
  }

  _toggleScriptsSidebarFromToolbar() {
    this.scriptsSidebarVisible = !this.scriptsSidebarVisible;
    this._applyScriptsSidebarVisibility();
    if (this.scriptEditorWindow) {
      this.scriptEditorWindow.setScriptsSidebarToggleActive(this.scriptsSidebarVisible);
      this.scriptEditorWindow.scheduleMonacoLayout();
    }
  }

  _refreshScriptEditorDockState() {
    this._syncEditorPanelLayout();
    if (this.context) {
      this.context._scriptEditorContainer = this.scriptEditorWindow.getEditorContainer();
    }
    if (this.scriptEditorWindow) {
      this.scriptEditorWindow.scheduleMonacoLayout();
      this.scriptEditorWindow.setScriptsSidebarToggleActive(this.scriptsSidebarVisible);
    }
  }

  draw() {
    this.clearContent();

    this.content.addClass('ScriptingPanel-root');

    this.scriptsPane = UIComponents.column();
    this.scriptsPane.addClass('ScriptingPanel-sidebar');

    const searchContainer = UIComponents.row();
    searchContainer.addClass('ScriptingPanel-searchRow');
    const searchInput = UIComponents.input();
    searchInput.setValue('Search scripts...');
    searchInput.addClass('ScriptingPanel-searchInput');
    searchInput.dom.addEventListener('input', () => {
      this.filterCollections(searchInput.getValue());
    });
    searchContainer.add(searchInput);
    this.scriptsPane.add(searchContainer);

    this.listContainer = UIComponents.column();

    this.scriptsPane.add(this.listContainer);

    this.content.add(this.scriptsPane);
    this.content.add(this.editorPane);

    this.updateScriptsList();
    this._refreshScriptEditorDockState();
  }

  onTabSelected() {
    if (this.scriptEditorWindow) {
      this.scriptEditorWindow.scheduleMonacoLayout();
    }
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
    super.destroy();
  }

  updateScriptsList() {

    this.listContainer.clear();

    const allCollections = dataStore.getCollections('CodeCollection');

    const collections = this.searchQuery
      ? allCollections.filter((col) =>
          col.name &&
          col.name.toLowerCase().includes(this.searchQuery.toLowerCase())
        )
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
      const item = this.drawCollectionItem(collection);

      this.listContainer.add(item);
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
    title.setStyles({ 'font-weight': '600', 'font-size': '1rem', 'margin-bottom': '0.5rem' });
    dialog.add(title);

    const nameLabel = UIComponents.text('Name:');
    nameLabel.setStyles({ 'font-size': '0.8rem', color: 'var(--theme-text-light)' });
    dialog.add(nameLabel);

    const nameInput = UIComponents.input();
    nameInput.setValue('Script name');
    nameInput.setStyles({
      padding: '0.5rem',
      border: '1px solid var(--border)',
      'border-radius': '4px',
      background: 'var(--theme-background-2)',
    });
    dialog.add(nameInput);

    const langLabel = UIComponents.text('Language:');
    langLabel.setStyles({ 'font-size': '0.8rem', color: 'var(--theme-text-light)' });
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

    const dismiss = () => { document.body.removeChild(overlay.dom); };

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
      const name = nameInput.getValue() || 'Untitled Script';
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
      if (event.target === overlay.dom) dismiss();
    });
    document.body.appendChild(overlay.dom);
    setTimeout(() => nameInput.dom.focus(), 50);
  }

  drawCollectionItem(collection) {
    const item = UIComponents.listItem().addClass('Clickable');
    const mainRow = UIComponents.row().gap('var(--phi-0-5)');
    mainRow.setStyles({
      justifyContent: 'space-between',
      alignItems: 'center',
    });

    const nameContainer = UIComponents.div();
    nameContainer.setStyle('flex', ['1']);
    const name = UIComponents.text(collection.name || 'Unnamed Script');
    name.addClass('ListboxItem-name');
    nameContainer.add(name);

    const runCount = UIComponents.text().addClass('GameNumber');
    runCount.setValue(`${collection.runCount || 0}`);
    mainRow.add(runCount);

    const languageKey = collection.language;
    const languageIconPath = languageKey === 'python'
      ? Paths.data('resources/images/python.svg')
      : Paths.data('resources/images/javascript.svg');
    mainRow.add(UIComponents.image(languageIconPath, { width: '1rem', height: '1rem' }));

    nameContainer.dom.addEventListener('dblclick', (event) => {
      event.stopPropagation();
      this.showRenameInput(nameContainer, name, collection);
    });
    mainRow.add(nameContainer);

    const info = UIComponents.row();
    info.setStyles({ gap: '0.5rem', 'align-items': 'center' });

    const quickRunButton = UIComponents.operator('play_arrow');
    quickRunButton.setStyle('color', ['var(--green)']);
    quickRunButton.onClick((event) => {
      event.stopPropagation();
      this.operators.execute('code.run_script', this.context, collection.guid);
    });
    info.add(quickRunButton);

    const openButton = UIComponents.operator('open_in_new');
    openButton.onClick(async (event) => {
      event.stopPropagation();
      await this.operators.execute('code.open_script', this.context, collection.guid);
    });
    info.add(openButton);
    info.addClass('ListboxItem-info');
    mainRow.add(info);
    item.add(mainRow);
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
    const input = UIComponents.input(currentDisplayName);
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
    input.dom.select();

    let finished = false;
    const finishEdit = () => {
      if (finished) return;
      finished = true;
      const newName = input.getValue().trim();
      if (newName && newName !== collection.name) {
        this.operators.execute('code.rename_script', this.context, collection.guid, newName);
        nameElement.dom.textContent = newName;
      }
      if (container.dom.contains(input.dom)) {
        container.dom.removeChild(input.dom);
      }
      nameElement.setStyle('display', ['']);
    };

    input.dom.addEventListener('blur', finishEdit);
    input.dom.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        finishEdit();
      } else if (event.key === 'Escape') {
        finished = true;
        if (container.dom.contains(input.dom)) {
          container.dom.removeChild(input.dom);
        }
        nameElement.setStyle('display', ['']);
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

    this.consoleOutputElement = null;

    this._signalUnsubscribers = [];

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
    if (!toggleButton || !toggleButton.dom) return;

    toggleButton.dom.title = visible ? 'Hide script list' : 'Show script list';

    if (visible) {
      toggleButton.addClass('active');
    } else {
      toggleButton.removeClass('active');
    }
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
        CodeEditorTool.monacoEditor.clearActiveEditor();
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
    if (!signal || typeof signal.add !== 'function') return;

    signal.add(handler);

    this._signalUnsubscribers.push(() => {
      if (typeof signal.remove === 'function') {
        signal.remove(handler);
      }
    });
  }

  _setupSignals() {
    const signals = this.context.signals;

    const onOpenScript = async ({ codeCollection }) => {
      if (!codeCollection || !codeCollection.guid) return;

      await this._displayScript(codeCollection);

      this._scheduleMonacoLayout();
    };

    this._subscribeSignal(signals.openScript, onOpenScript);

    const onOpenOutput = ({ language, outputText, scriptName }) => {
      const ext = language === 'python' ? '.py' : '.js';

      this._appendToConsole(`>>> ${scriptName}${ext}`);

      this._appendToConsole(outputText);
    };

    this._subscribeSignal(signals.openOutput, onOpenOutput);

    const onScriptNameChanged = ({ guid, name }) => {
      if (this.openTabs.has(guid)) {
        const collection = this.openTabs.get(guid);

        collection.name = name;

        this._renderTabs();
      }

      if (guid === this.activeScriptGuid && this.activeCollection) {
        this.activeCollection.name = name;

        this._updateActiveScriptInfo();
      }
    };

    this._subscribeSignal(signals.scriptNameChanged, onScriptNameChanged);

    const onNewScript = () => {
      if (this.activeCollection) {
        this._updateActiveScriptInfo();
      }
    };

    this._subscribeSignal(signals.newScript, onNewScript);

    const onScriptTabClosed = ({ guid }) => {
      this._removeTab(guid);
    };

    this._subscribeSignal(signals.scriptTabClosed, onScriptTabClosed);

    const onScriptTabsRefresh = () => {
      this._renderTabs();
    };

    this._subscribeSignal(signals.scriptTabsRefresh, onScriptTabsRefresh);
  }

  show() {
    if (this.onShow) {
      this.onShow();
    }

    this.isVisible = true;

    this.context._scriptEditorContainer = this.editorContainer.dom;

    this._scheduleMonacoLayout();
  }

  hide() {
    if (!this.isVisible) return;

    this.isVisible = false;

    if (this.onHide) {
      this.onHide();
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
    if (!this.activeScriptGuid) return;

    this.operators.execute('code.save_script', this.context, this.activeScriptGuid);
  }

  _runActiveScript() {
    if (!this.activeScriptGuid) return;

    this.operators.execute('code.run_script', this.context, this.activeScriptGuid);
  }

  dispose() {
    for (let index = 0; index < this._signalUnsubscribers.length; index += 1) {
      const unsub = this._signalUnsubscribers[index];

      unsub();
    }

    this._signalUnsubscribers = [];

    FocusManager.unregisterContext('codeEditor');

    if (this.mainContainer && this.mainContainer.dom.parentNode) {
      this.mainContainer.dom.parentNode.removeChild(this.mainContainer.dom);
    }

    if (
      this.context &&
      this.context._scriptEditorContainer === this.editorContainer.dom
    ) {
      this.context._scriptEditorContainer = null;
    }

    this.activeScriptGuid = null;

    this.activeCollection = null;

    this.consoleOutputElement = null;
  }
}

export { ScriptsUI };
