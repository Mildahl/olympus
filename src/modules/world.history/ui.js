import { Components as UIComponents, BasePanel } from "../../ui/Components/Components.js";

class HistoryHeaderUI {
  constructor({ context, operators }) {
    this.context = context;

    this.operators = operators;

    this.container = null;

    this.undoBtn = null;

    this.redoBtn = null;

    this.panelBtn = null;

    this.draw();

    this.listen();
  }

  listen() {
    const signals = this.context.editor?.signals;

    if (!signals) return;

    signals.historyChanged.add(() => this.updateButtonStates());
  }

  draw() {
    const parent = document.getElementById('Controls');

    if (!parent) return;

    this.container = UIComponents.row();

    this.container.addClass('HistoryHeaderControls');

    this.container
      .setStyle('display', ['flex'])
      .setStyle('align-items', ['center'])
      .setStyle('gap', ['0.25rem'])
      .setStyle('height', ['100%'])
      .setStyle('padding-inline', ['0.5rem']);

    this.undoBtn = UIComponents.icon('arrow_back');


    this.undoBtn.addClass('HistoryHeaderButton');

    this.undoBtn.dom.title = 'Undo (Ctrl+Z)';

    this.undoBtn.onClick(() => {
      this.operators.execute('history.undo', this.context);
    });

    this.redoBtn = UIComponents.icon('arrow_forward');

    this.redoBtn.addClass('HistoryHeaderButton');

    this.redoBtn.dom.title = 'Redo (Ctrl+Shift+Z)';

    this.redoBtn.onClick(() => {
      this.operators.execute('history.redo', this.context);
    });

    this.panelBtn = UIComponents.icon('history');

    this.panelBtn.dom.id = 'HistoryPanelToggle';

    this.panelBtn.addClass('HistoryHeaderButton');

    this.panelBtn.dom.title = 'Toggle History Panel';

    this.container.add(this.undoBtn);

    this.container.add(this.redoBtn);

    this.container.add(this.panelBtn);

    parent.appendChild(this.container.dom);

    this.updateButtonStates();
  }

  updateButtonStates() {
    const history = this.context.editor?.history;

    if (!history) return;

    const canUndo = history.undos && history.undos.length > 0;

    const canRedo = history.redos && history.redos.length > 0;

    if (this.undoBtn) {
      this.undoBtn.setStyle('opacity', [canUndo ? '1' : '0.3']);

      this.undoBtn.dom.style.pointerEvents = canUndo ? 'auto' : 'none';
    }

    if (this.redoBtn) {
      this.redoBtn.setStyle('opacity', [canRedo ? '1' : '0.3']);

      this.redoBtn.dom.style.pointerEvents = canRedo ? 'auto' : 'none';
    }
  }

  destroy() {
    if (this.container && this.container.dom.parentNode) {
      this.container.dom.parentNode.removeChild(this.container.dom);
    }
  }
}

class HistoryUI extends BasePanel {
  constructor({ context, operators }) {
    super({
      context,
      operators,
      parentId: 'HistoryPanelToggle',
      resizable: true,
      resizeHandles: ['s', 'e', 'se'],
      position: 'below',
      panelStyles: {
        minWidth: 'fit-content',
        maxWidth: '40vw',
        maxHeight: '90vh',
      }
    });

    this.panel.dom.id = 'HistoryPanel';

    this.panel.addClass('FloatingPanel');

    this.listContainer = null;

    this.ignoreObjectSelectedSignal = false;

    this.draw();

    this.listen();
  }

  listen() {
    const signals = this.context.editor?.signals;

    if (!signals) return;

    signals.historyChanged.add(() => this.refreshList());

    signals.editorCleared.add(() => this.refreshList());

    signals.historyChanged.add((cmd) => {
      if (this.ignoreObjectSelectedSignal) return;

      this.highlightCurrentState(cmd?.id);
    });
  }

  draw() {
    this.header.add(this.createHeader('History', 'history'));

    this.listContainer = UIComponents.column();

    this.listContainer
      .setStyle('overflow-y', ['auto'])
      .setStyle('max-height', ['40vh'])
      .setStyle('padding', ['0.5rem']);

    this.content.add(this.listContainer);

    this.refreshList();
  }

  refreshList() {
    if (!this.listContainer) return;

    this.listContainer.clear();

    const history = this.context.editor?.history;

    if (!history) {
      this.drawEmptyState();

      return;
    }

    const undos = history.undos || [];

    const redos = history.redos || [];

    if (undos.length === 0 && redos.length === 0) {
      this.drawEmptyState();

      return;
    }

    const reversedUndos = [...undos].reverse();

    for (const cmd of reversedUndos) {
      const item = this.drawHistoryItem(cmd, false);

      this.listContainer.add(item);
    }

    for (const cmd of redos) {
      const item = this.drawHistoryItem(cmd, true);

      this.listContainer.add(item);
    }
  }

  drawHistoryItem(cmd, isRedo) {
    const item = UIComponents.row();

    const undoable = cmd.undoable !== false;

    item.addClass('HistoryItem');

    item
      .setStyle('padding', ['0.5rem 0.75rem'])
      .setStyle('border-radius', ['4px'])
      .setStyle('margin-bottom', ['2px'])
      .setStyle('align-items', ['center'])
      .setStyle('gap', ['0.5rem'])
      .setStyle('transition', ['background 0.15s ease'])
      .setStyle('opacity', [isRedo ? '0.3' : (undoable ? '1' : '0.5')]);

    if (undoable) {
      item.setStyle('cursor', ['pointer']);
    } else {
      item.setStyle('cursor', ['default']);
    }

    item.dom.dataset.historyId = cmd.id;

    item.dom.dataset.undoable = undoable ? '1' : '0';

    item.dom.addEventListener('mouseenter', () => {
      if (undoable) {
        item.setStyle('background', ['var(--glass-surface, rgba(255,255,255,0.05))']);
      }
    });

    item.dom.addEventListener('mouseleave', () => {
      item.setStyle('background', ['transparent']);
    });

    item.onClick(() => {
      this.ignoreObjectSelectedSignal = true;

      const history = this.context.editor?.history;

      const targetId = history?.getNearestUndoableStateId(cmd.id) ?? cmd.id;

      this.operators.execute('history.go_to_state', this.context, targetId);

      this.ignoreObjectSelectedSignal = false;
    });

    const icon = UIComponents.icon(this.getCommandIcon(cmd.type));

    icon
      .setStyle('font-size', ['1rem'])
      .setStyle('color', ['var(--theme-text-light, #95a5a6)'])
      .setStyle('flex-shrink', ['0']);

    item.add(icon);

    const label = UIComponents.text(cmd.name || 'Unknown Command');

    label
      .setStyle('font-size', ['0.85rem'])
      .setStyle('color', [undoable ? 'var(--theme-text, #ecf0f1)' : 'var(--theme-text-light, #95a5a6)'])
      .setStyle('overflow', ['hidden'])
      .setStyle('text-overflow', ['ellipsis'])
      .setStyle('white-space', ['nowrap'])
      .setStyle('flex-grow', ['1']);

    item.add(label);

    return item;
  }

  drawEmptyState() {
    const container = UIComponents.column();

    container
      .setStyle('align-items', ['center'])
      .setStyle('justify-content', ['center'])
      .setStyle('padding', ['2rem'])
      .setStyle('text-align', ['center']);

    const icon = UIComponents.icon('history');

    icon
      .setStyle('font-size', ['2.5rem'])
      .setStyle('opacity', ['0.3'])
      .setStyle('margin-bottom', ['0.75rem']);

    container.add(icon);

    const message = UIComponents.text('No history');

    message
      .setStyle('color', ['var(--theme-text-light)'])
      .setStyle('font-size', ['0.9rem']);

    container.add(message);

    this.listContainer.add(container);
  }

  getCommandIcon(type) {
    const iconMap = {
      'AddObjectCommand': 'add_box',
      'RemoveObjectCommand': 'delete',
      'MoveObjectCommand': 'open_with',
      'SetPositionCommand': 'open_with',
      'SetRotationCommand': 'rotate_right',
      'SetScaleCommand': 'aspect_ratio',
      'SetValueCommand': 'edit',
      'SetColorCommand': 'palette',
      'SetMaterialCommand': 'texture',
      'SetMaterialColorCommand': 'format_color_fill',
      'SetMaterialValueCommand': 'tune',
      'SetGeometryCommand': 'category',
      'SetGeometryValueCommand': 'straighten',
      'MultiCmdsCommand': 'layers',
      'SetScriptCommand': 'code',
      'SetSceneCommand': 'public',
      'AddScriptCommand': 'add',
      'RemoveScriptCommand': 'remove'
    };

    return iconMap[type] || 'history';
  }

  highlightCurrentState(id) {
    if (!this.listContainer) return;

    const items = this.listContainer.dom.querySelectorAll('.HistoryItem');

    items.forEach(el => {
      const item = /** @type {HTMLElement} */ (el);

      const isSelected = parseInt(item.dataset.historyId) === id;

      item.style.background = isSelected ? 'var(--theme-select, rgba(52, 152, 219, 0.3))' : 'transparent';
    });
  }

  destroy() {
    const signals = this.context.editor?.signals;

    if (signals) {
      signals.historyChanged.removeAll();

      signals.editorCleared.removeAll();
    }

    super.destroy();
  }
}

export { HistoryHeaderUI, HistoryUI };
