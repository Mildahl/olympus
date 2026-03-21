/**
 * Scripting UI Components
 * 
 * UI panels for managing and editing scripts.
 */
import { Components as UIComponents } from '../../ui/Components/Components.js';

import { TabPanel } from '../../../drawUI/TabPanel.js';

import dataStore from '../../data/index.js';

import { ScriptEditorWindow } from './ScriptEditorWindow.js';

import Paths from '../../utils/paths.js';

class ScriptsUI extends TabPanel {
  constructor({ context, operators }) {
    super({
      context,
      operators,
      position: 'right',
      tabId: 'code-scripts',
      tabLabel: 'Scripts',
      icon: 'code',
      title: 'Scripts',
      showHeader: false,
      floatable: true,
      panelStyles: {
        minWidth: '240px',
      },
      autoShow: true,
    });

    this.listContainer = null;

    this.searchQuery = '';

    this.draw();

    this.listen(context, operators);
  }

  listen(context, operators) {
    
    context.signals.newScript.add((GlobalId = null) => {
      this.updateScriptsList();
    });

    context.signals.scriptNameChanged.add(() => {
      this.updateScriptsList();
    });
  }

  draw() {
    this.clearContent();

    this.content
      .setStyle('display', ['flex'])
      .setStyle('flex-direction', ['column'])
      .setStyle('overflow-y', ['hidden']);

    const scriptActions = UIComponents.row();

    scriptActions
      .setStyle('justify-content', ['space-between'])
      .setStyle('align-items', ['center'])
      .setStyle('padding', ['0.5rem 0.75rem'])

    const addButton = UIComponents.operator('add');

    addButton.addClass('Button');

    addButton.setStyle('cursor', ['pointer']);

    addButton.onClick(() => {
      this.showNewScriptDialog();
    });

    scriptActions.add(addButton);

    this.content.add(scriptActions);

    const searchContainer = UIComponents.row();

    searchContainer
      .setStyle('padding', ['0.5rem'])

    const searchInput = UIComponents.input();

    searchInput.setValue('Search scripts...');

    searchInput.setStyle('flex', ['1']);

    searchInput.setStyle('padding', ['0.35rem 0.5rem']);

    searchInput.setStyle('border', ['1px solid var(--border)']);

    searchInput.setStyle('border-radius', ['4px']);

    searchInput.setStyle('background', ['var(--theme-background-2)']);

    searchInput.setStyle('font-size', ['0.8rem']);
    
    searchInput.dom.addEventListener('input', () => {
      this.filterCollections(searchInput.getValue());
    });

    searchContainer.add(searchInput);

    this.listContainer = UIComponents.column();

    this.listContainer
      .setStyle('flex', ['1'])
      .setStyle('min-height', ['0'])
      .setStyle('overflow-y', ['auto']);

    this.content.add(searchContainer);

    this.content.add(this.listContainer);

    this.updateScriptsList();
  }

  updateScriptsList() {
    if (!this.listContainer) return;

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

    overlay.setStyle('position', ['fixed']);

    overlay.setStyle('top', ['0']);

    overlay.setStyle('left', ['0']);

    overlay.setStyle('width', ['100vw']);

    overlay.setStyle('height', ['100vh']);

    overlay.setStyle('background', ['rgba(0,0,0,0.5)']);

    overlay.setStyle('display', ['flex']);

    overlay.setStyle('align-items', ['center']);

    overlay.setStyle('justify-content', ['center']);

    overlay.setStyle('z-index', ['10000']);

    const dialog = UIComponents.column();

    dialog.setStyle('background', ['var(--theme-background)']);

    dialog.setStyle('border', ['1px solid var(--border)']);

    dialog.setStyle('border-radius', ['8px']);

    dialog.setStyle('padding', ['1rem']);

    dialog.setStyle('min-width', ['300px']);

    dialog.setStyle('gap', ['0.75rem']);

    const title = UIComponents.text('New Script');

    title.setStyle('font-weight', ['600']);

    title.setStyle('font-size', ['1rem']);

    title.setStyle('margin-bottom', ['0.5rem']);

    dialog.add(title);

    const nameLabel = UIComponents.text('Name:');

    nameLabel.setStyle('font-size', ['0.8rem']);

    nameLabel.setStyle('color', ['var(--theme-text-light)']);

    dialog.add(nameLabel);

    const nameInput = UIComponents.input();

    nameInput.setValue('Script name');

    nameInput.setStyle('padding', ['0.5rem']);

    nameInput.setStyle('border', ['1px solid var(--border)']);

    nameInput.setStyle('border-radius', ['4px']);

    nameInput.setStyle('background', ['var(--theme-background-2)']);

    dialog.add(nameInput);

    const langLabel = UIComponents.text('Language:');

    langLabel.setStyle('font-size', ['0.8rem']);

    langLabel.setStyle('color', ['var(--theme-text-light)']);

    dialog.add(langLabel);

    const langSelect = UIComponents.select();

    langSelect.setOptions({
      'python': 'Python',
      'javascript': 'JavaScript'
    });

    langSelect.setValue('python');

    langSelect.setStyle('padding', ['0.5rem']);

    langSelect.setStyle('border', ['1px solid var(--border)']);

    langSelect.setStyle('border-radius', ['4px']);

    langSelect.setStyle('background', ['var(--theme-background-2)']);

    dialog.add(langSelect);

    const buttonsRow = UIComponents.row();

    buttonsRow.setStyle('justify-content', ['flex-end']);

    buttonsRow.setStyle('gap', ['0.5rem']);

    buttonsRow.setStyle('margin-top', ['0.5rem']);

    const cancelBtn = UIComponents.text('Cancel');

    cancelBtn.addClass('Button');

    cancelBtn.setStyle('padding', ['0.5rem 1rem']);

    cancelBtn.setStyle('cursor', ['pointer']);

    cancelBtn.setStyle('border-radius', ['4px']);

    cancelBtn.onClick(() => {
      document.body.removeChild(overlay.dom);
    });

    buttonsRow.add(cancelBtn);

    const createBtn = UIComponents.text('Create');

    createBtn.addClass('Button');

    createBtn.setStyle('padding', ['0.5rem 1rem']);

    createBtn.setStyle('cursor', ['pointer']);

    createBtn.setStyle('background', ['var(--primary)']);

    createBtn.setStyle('color', ['white']);

    createBtn.setStyle('border-radius', ['4px']);

    createBtn.onClick(async () => {
      const name = nameInput.getValue() || 'Untitled Script';

      const language = langSelect.getValue();

      const result = await this.operators.execute('code.new_script', this.context, name, language);

      document.body.removeChild(overlay.dom);

      const guid = result && result.codeCollection && result.codeCollection.guid;

      if (guid) {
        
        await this.operators.execute('code.open_script', this.context, guid);
      }
    });

    buttonsRow.add(createBtn);

    dialog.add(buttonsRow);

    overlay.add(dialog);

    overlay.dom.addEventListener('click', (e) => {
      if (e.target === overlay.dom) {
        document.body.removeChild(overlay.dom);
      }
    });

    document.body.appendChild(overlay.dom);

    setTimeout(() => nameInput.dom.focus(), 50);
  }

  drawCollectionItem(collection) {
    const item = UIComponents.listItem();

    const mainRow = UIComponents.row().gap('var(--phi-0-5)');

    mainRow
      .setStyle('justify-content', ['space-between'])
      .setStyle('align-items', ['center']);

    const nameContainer = UIComponents.div();

    nameContainer.setStyle('flex', ['1']);

    const name = UIComponents.text(collection.name || 'Unnamed Script');

    name.addClass('ListboxItem-name');

    nameContainer.add(name);

    const runCount = UIComponents.text().addClass('GameNumber');

    runCount.setValue(`${collection.runCount || 0}`);

    mainRow.add(runCount);

    const images = {
      python: Paths.data('resources/images/python.svg'),
      javascript: Paths.data('resources/images/javascript.svg'),
    };

    const logoLanguage = UIComponents.image(images[collection.language]);

    logoLanguage.setStyles({
      width: '1rem',
      height: '1rem',
    });

    mainRow.add(logoLanguage);

    nameContainer.dom.addEventListener('dblclick', (e) => {
      e.stopPropagation();

      this.showRenameInput(nameContainer, name, collection, 'script');
    });

    mainRow.add(nameContainer);

    const info = UIComponents.row();

    info.setStyle('gap', ['0.5rem']);

    info.setStyle('align-items', ['center']);

    const quickRunButton = UIComponents.operator('play_arrow');

    quickRunButton.setStyle('color', ['var(--green)']);

    quickRunButton.onClick((e) => {
      e.stopPropagation();

      this.operators.execute('code.run_script', this.context, collection.guid);
    });

    info.add(quickRunButton);

    const openButton = UIComponents.operator('open_in_new');

    openButton.onClick( async (e) => {
      e.stopPropagation();

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

  filterCollections(query) {
    this.searchQuery = query;

    this.updateScriptsList();
  }

  showRenameInput(container, nameElement, item, type) {
    nameElement.setStyle('display', ['none']);

    const currentDisplayName = nameElement.dom.textContent || item.name || '';

    const input = UIComponents.input(currentDisplayName);

    input.setStyle('padding', ['0.25rem']);

    input.setStyle('font-size', ['inherit']);

    input.setStyle('border', ['1px solid var(--primary)']);

    input.setStyle('border-radius', ['2px']);

    input.setStyle('background', ['var(--theme-background-2)']);

    input.setStyle('width', ['100%']);

    container.add(input);

    input.dom.focus();

    input.dom.select();

    let finished = false;

    const finishEdit = () => {
      if (finished) return;

      finished = true;

      const newName = input.getValue().trim();

      if (newName && newName !== item.name) {
        this.operators.execute('code.rename_script', this.context, item.guid, newName);

        nameElement.dom.textContent = newName;
      }

      if (container.dom.contains(input.dom)) {
        container.dom.removeChild(input.dom);
      }

      nameElement.setStyle('display', ['']);
    };

    input.dom.addEventListener('blur', finishEdit);

    input.dom.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();

        finishEdit();
      } else if (e.key === 'Escape') {
        finished = true;

        if (container.dom.contains(input.dom)) {
          container.dom.removeChild(input.dom);
        }

        nameElement.setStyle('display', ['']);
      }
    });
  }
}

/**
 * CodingUI - Manages the single script editor window
 * 
 * Signals:
 * - showCodeEditor: Show/hide the editor window (UI concern)
 * - openScript: A script has been loaded (update window state)
 */
class CodingUI {
  constructor({ context, operators }) {
    this.context = context;

    this.operators = operators;

    this.scriptEditorWindow = null;
    
    this._setupSignals();
  }

  _setupSignals() {
    
    this.context.signals.showCodeEditor.add(({ visible }) => {
      this._ensureWindowExists();

      if (visible) {
        this.scriptEditorWindow.show();
      } else {
        this.scriptEditorWindow.hide();
      }
    });
  }

  _ensureWindowExists() {
    if (!this.scriptEditorWindow) {
      this.scriptEditorWindow = new ScriptEditorWindow({
        context: this.context,
        operators: this.operators
      });
    }
  }

  dom() {
    return this.scriptEditorWindow?.floatingPanel;
  }

  getEditorWindow() {
    this._ensureWindowExists();

    return this.scriptEditorWindow;
  }

  show() {
    this.getEditorWindow().show();
  }

  hide() {
    if (this.scriptEditorWindow) {
      this.scriptEditorWindow.hide();
    }
  }

  toggle() {
    this.getEditorWindow().toggle();
  }

  dispose() {
    if (this.scriptEditorWindow) {
      this.scriptEditorWindow.dispose();

      this.scriptEditorWindow = null;
    }
  }
}

export { ScriptsUI, CodingUI };
