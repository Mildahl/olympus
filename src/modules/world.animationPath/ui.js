import { Components as UIComponents, BasePanel, makeDraggable, makeResizable } from "../../ui/Components/Components.js";

import dataStore from "../../data/index.js";

import AECO_TOOLS from "../../tool/index.js";

class AnimationPathUI extends BasePanel {
  constructor({ context, operators }) {
    super({
      context,
      operators,
      parentId: "AnimatorModule",
      panelStyles: {
        height: "fit-content",
        maxHeight: "60vh",
        minWidth: "280px",
      },
      resizeHandles: ['w', 's', 'sw'],
      draggable: true,
      position: 'below-left',
      testing: false,
    });

    this.listContainer = null;

    this.expandedIds = new Set();

    this.firstDisplay = true;

    this.settingsWindow = null;

    this.settingsWindowPathGlobalId = null;

    this.dragState = { dragging: false, draggedId: null, dropTargetId: null, pathGlobalId: null };

    this.draw();

    this.listen(context);
  }

  onShow() {
    if (this.firstDisplay) {
      if (AECO_TOOLS.world.animationPath.getCount() === 0) {
        this.operators.execute('animationPath.create_template', this.context);
      }

      this.firstDisplay = false;
    }

    this.updatePanel();
  }

  onHide() {}

  refreshPanel() {
    this.updatePanel();
  }

  listen(context) {
    context.signals.animationPathCreated.add(() => this.updatePanel());

    context.signals.animationPathUpdated.add(() => this.updatePanel());

    context.signals.animationPathRemoved.add((id) => {
      this.expandedIds.delete(id);

      this.updatePanel();
    });
  }

  draw() {
    this.panel.clear();

    makeResizable(this.panel.dom);

    const controlsRow = this.drawControls();

    makeDraggable(this.panel.dom, controlsRow.dom);

    this.panel.add(controlsRow);

    this.listContainer = UIComponents.column();

    this.listContainer.setStyle('overflow-y', ['auto']);

    this.panel.add(this.listContainer);

    this.updatePanel();
  }

  drawControls() {
    const controlsRow = UIComponents.row();

    controlsRow.setStyle('justify-content', ['space-between'])
      .setStyle('align-items', ['center'])
      .setStyle('padding', ['0.5rem'])
      .setStyle('border-bottom', ['1px solid var(--border)']);

    const title = UIComponents.text('Animation Paths');

    title.setStyle('font-weight', ['500']).setStyle('font-size', ['0.85rem']);

    const addButton = UIComponents.icon('add');

    addButton.addClass('Button');

    addButton.onClick(() => {
      const name = `Path ${AECO_TOOLS.world.animationPath.getCount() + 1}`;

      this.operators.execute('animationPath.create', this.context, name);
    });

    controlsRow.add(title);

    controlsRow.add(addButton);

    return controlsRow;
  }

  updatePanel() {
    if (!this.listContainer) return;

    this.listContainer.clear();

    const paths = AECO_TOOLS.world.animationPath.getAllPaths();

    if (paths.length === 0) {
      const emptyMessage = UIComponents.text('No animation paths');

      emptyMessage.setStyle('padding', ['1rem'])
        .setStyle('text-align', ['center'])
        .setStyle('color', ['var(--theme-text-light)']);

      this.listContainer.add(emptyMessage);

      return;
    }

    paths.forEach(path => this.listContainer.add(this.drawPathItem(path)));
  }

  drawPathItem(path) {
    const isExpanded = this.expandedIds.has(path.GlobalId);

    const item = UIComponents.div();

    if (isExpanded) item.addClass('expanded');

    const mainRow = UIComponents.row();

    mainRow.setStyle('justify-content', ['space-between']).setStyle('align-items', ['center']);

    const leftSection = UIComponents.row();

    leftSection.setStyle('flex', ['1']).setStyle('align-items', ['center']).setStyle('gap', ['0.5rem']);

    const expandIcon = UIComponents.icon(isExpanded ? 'expand_more' : 'chevron_right');

    expandIcon.addClass('Button');

    expandIcon.setStyle('font-size', ['1.1rem']).setStyle('opacity', ['0.6']);

    expandIcon.onClick((e) => {
      e.stopPropagation();

      if (isExpanded) {
        this.expandedIds.delete(path.GlobalId);
      } else {
        this.expandedIds.add(path.GlobalId);
      }

      this.updatePanel();
    });

    leftSection.add(expandIcon);

    const name = UIComponents.text(path.name);

    leftSection.add(name);
    const visibilityIcon = UIComponents.icon(path.visible ? 'visibility' : 'visibility_off');

    visibilityIcon.addClass('Button');

    visibilityIcon.setStyle('font-size', ['1rem'])
      .setStyle('opacity', [path.visible ? '1' : '0.4']);

    visibilityIcon.dom.title = path.visible ? 'Hide path visualization' : 'Show path visualization';

    visibilityIcon.onClick((e) => {
      e.stopPropagation();

      this.operators.execute('animationPath.toggle_visibility', this.context, path.GlobalId);
    });

    leftSection.add(visibilityIcon);

    mainRow.add(leftSection);

    const actionsRow = UIComponents.row();

    actionsRow.addClass('Item-actions');

    actionsRow.setStyle('gap', ['0.25rem']).setStyle('opacity', ['0.5']);

    const editButton = UIComponents.icon('settings');

    editButton.addClass('Button');

    editButton.dom.title = 'Edit animation settings';

    editButton.onClick((e) => {
      e.stopPropagation();

      this._openSettingsWindow(path);
    });

    actionsRow.add(editButton);

    const playButton = UIComponents.icon('play_arrow');

    playButton.addClass('Button');

    playButton.setStyle('opacity', [path.viewpointIds.length > 0 ? '1' : '0.3']);

    playButton.dom.title = path.viewpointIds.length > 0 ? 'Play animation' : 'Add viewpoints first';

    playButton.onClick((e) => {
      e.stopPropagation();

      if (path.viewpointIds.length > 0) {
        this.operators.execute('animationPath.play', this.context, path.GlobalId);
      }
    });

    actionsRow.add(playButton);

    mainRow.add(actionsRow);

    item.add(mainRow);

    if (isExpanded) {
      item.add(this.drawAttributePanel(path));
    }

    return item;
  }

  drawAttributePanel(path) {
    const panel = UIComponents.div();

    panel.addClass('AnimationPathAttributePanel');

    panel.onClick((e) => e.stopPropagation());

    panel.add(this.drawNameSection(path));

    panel.add(this.drawViewpointsSection(path));

    panel.add(this.drawActionsSection(path));

    return panel;
  }

  drawNameSection(path) {
    const section = UIComponents.div();

    section.setStyle('margin-bottom', ['0.75rem']);

    const label = UIComponents.smallText('Name');

    label.setStyle('color', ['var(--theme-text-light)'])
      .setStyle('margin-bottom', ['0.25rem'])
      .setStyle('display', ['block']);

    section.add(label);

    const input = UIComponents.input();

    input.setValue(path.name);

    input.setStyle('width', ['100%']);

    input.onChange(() => {
      const newName = input.getValue();

      if (newName && newName !== path.name) {
        this.operators.execute('animationPath.rename', this.context, path.GlobalId, newName);
      }
    });

    section.add(input);

    return section;
  }

  drawViewpointsSection(path) {
    const section = UIComponents.div();

    section.setStyle('margin-bottom', ['0.75rem']);
    const header = UIComponents.row();

    header.setStyle('justify-content', ['space-between'])
      .setStyle('align-items', ['center'])
      .setStyle('margin-bottom', ['0.5rem']);

    const title = UIComponents.smallText('Viewpoints');

    title.setStyle('color', ['var(--theme-text-light)']);

    header.add(title);

    const count = UIComponents.smallText(`(${path.viewpointIds.length})`);

    count.setStyle('color', ['var(--theme-text-light)'])
      .setStyle('opacity', ['0.7']);

    header.add(count);

    section.add(header);
    const list = UIComponents.column();

    list.setStyle('gap', ['0.25rem'])
      .setStyle('max-height', ['12rem'])
      .setStyle('overflow-y', ['auto']);

    if (path.viewpointIds.length === 0) {
      const empty = UIComponents.text('No viewpoints added');

      empty.setStyle('color', ['var(--theme-text-light)'])
        .setStyle('font-style', ['italic'])
        .setStyle('text-align', ['center'])
        .setStyle('padding', ['0.5rem']);

      list.add(empty);
    } else {
      path.viewpointIds.forEach((vpId, index) => {
        const vp = AECO_TOOLS.world.viewpoint.get(vpId);

        if (vp) {
          list.add(this._createDraggableViewpointItem(path, vp, index));
        }
      });
    }

    section.add(list);
    const addRow = UIComponents.row();

    addRow.setStyle('gap', ['0.5rem'])
      .setStyle('margin-top', ['0.5rem'])
      .setStyle('align-items', ['center']);

    const select = this._createViewpointDropdown(path);

    select.setStyle('flex', ['1']);

    addRow.add(select);

    const addBtn = UIComponents.icon('add');

    addBtn.addClass('Button');

    addBtn.dom.title = 'Add selected viewpoint';

    addBtn.onClick(() => {
      const selectedId = select.getValue();

      if (selectedId && selectedId !== '') {
        this.operators.execute('animationPath.add_viewpoint', this.context, path.GlobalId, selectedId);
      }
    });

    addRow.add(addBtn);

    section.add(addRow);

    return section;
  }

  drawActionsSection(path) {
    const section = UIComponents.row();

    section.setStyle('gap', ['0.5rem'])
      .setStyle('padding-top', ['0.5rem'])
      .setStyle('border-top', ['1px solid var(--border)']);

    const playBtn = UIComponents.button('Play');

    playBtn.setStyle('flex', ['1']);

    const canPlay = path.viewpointIds.length > 0;

    playBtn.dom.disabled = !canPlay;

    if (!canPlay) {
      playBtn.setStyle('opacity', ['0.5']).setStyle('cursor', ['not-allowed']);
    }

    playBtn.onClick(() => {
      if (canPlay) {
        this.operators.execute('animationPath.play', this.context, path.GlobalId);
      }
    });

    section.add(playBtn);

    const deleteBtn = UIComponents.button('Delete');

    deleteBtn.setStyle('flex', ['1']).setStyle('background', ['var(--red)']);

    deleteBtn.onClick(() => {
      if (confirm('Delete this animation path?')) {
        this.operators.execute('animationPath.remove', this.context, path.GlobalId);
      }
    });

    section.add(deleteBtn);

    return section;
  }

  /**
   * Create a color picker component
   */
  _createColorPicker(label, initialColor, onChange) {
    const wrapper = UIComponents.column();

    wrapper.setStyle('align-items', ['center'])
      .setStyle('gap', ['0.25rem']);

    const labelEl = UIComponents.smallText(label);

    labelEl.setStyle('font-size', ['0.7rem'])
      .setStyle('color', ['var(--theme-text-light)']);

    wrapper.add(labelEl);

    const colorInput = UIComponents.div();

    colorInput.dom.innerHTML = `<input type="color" value="${initialColor}" style="width: 32px; height: 24px; border: none; cursor: pointer; border-radius: var(--border-radius);">`;

    const inputEl = colorInput.dom.querySelector('input');

    inputEl.addEventListener('change', (e) => {
      onChange(e.target.value);
    });

    wrapper.add(colorInput);

    return wrapper;
  }

  /**
   * Create a dropdown to select viewpoints to add
   */
  _createViewpointDropdown(path) {
    const select = UIComponents.select();
    
    const allVps = AECO_TOOLS.world.viewpoint.getAll();

    const availableVps = allVps.filter(vp => !path.viewpointIds.includes(vp.GlobalId));

    const options = { '': '-- Select Viewpoint --' };

    availableVps.forEach(vp => {
      options[vp.GlobalId] = vp.name;
    });

    select.setOptions(options);

    select.setValue('');

    select.setStyle('padding', ['0.4rem'])
      .setStyle('border', ['1px solid var(--border)'])
      .setStyle('border-radius', ['var(--border-radius)'])
      .setStyle('background', ['var(--theme-background-2)']);

    return select;
  }

  /**
   * Create a draggable viewpoint list item
   */
  _createDraggableViewpointItem(path, viewpoint, index) {
    const vpItem = UIComponents.row();

    vpItem.addClass('ViewpointItem');

    vpItem.dom.draggable = true;

    vpItem.dom.dataset.vpGlobalId = viewpoint.GlobalId;

    vpItem.dom.dataset.vpIndex = index;

    vpItem.setStyle('justify-content', ['space-between'])
      .setStyle('align-items', ['center'])
      .setStyle('padding', ['0.4rem 0.5rem'])
      .setStyle('background', ['rgba(255,255,255,0.05)'])
      .setStyle('border-radius', ['var(--border-radius)'])
      .setStyle('cursor', ['grab'])
      .setStyle('transition', ['background 0.2s, transform 0.1s'])
      .setStyle('border', ['2px solid transparent']);
    const leftSide = UIComponents.row();

    leftSide.setStyle('align-items', ['center'])
      .setStyle('gap', ['0.5rem'])
      .setStyle('flex', ['1']);

    const dragHandle = UIComponents.icon('drag_indicator');

    dragHandle.setStyle('font-size', ['1rem'])
      .setStyle('opacity', ['0.5'])
      .setStyle('cursor', ['grab']);

    leftSide.add(dragHandle);

    const orderNum = UIComponents.text(`${index + 1}.`);

    orderNum.setStyle('opacity', ['0.6'])
      .setStyle('min-width', ['1.5rem']);

    leftSide.add(orderNum);

    const vpName = UIComponents.text(viewpoint.name);

    vpName.setStyle('flex', ['1'])
      .setStyle('overflow', ['hidden'])
      .setStyle('text-overflow', ['ellipsis'])
      .setStyle('white-space', ['nowrap']);

    leftSide.add(vpName);

    vpItem.add(leftSide);
    const rightSide = UIComponents.row();

    rightSide.setStyle('gap', ['0.25rem'])
      .setStyle('align-items', ['center']);
    const goBtn = UIComponents.icon('visibility');

    goBtn.setStyle('cursor', ['pointer'])
      .setStyle('font-size', ['0.9rem'])
      .setStyle('opacity', ['0.6']);

    goBtn.dom.title = 'Go to viewpoint';

    goBtn.onClick((e) => {
      e.stopPropagation();

      this.operators.execute('viewpoint.activate', this.context, viewpoint.GlobalId, true);
    });

    rightSide.add(goBtn);
    const removeBtn = UIComponents.icon('close');

    removeBtn.setStyle('cursor', ['pointer'])
      .setStyle('font-size', ['0.9rem'])
      .setStyle('opacity', ['0.6']);

    removeBtn.dom.title = 'Remove from path';

    removeBtn.onClick((e) => {
      e.stopPropagation();

      this.operators.execute('animationPath.remove_viewpoint', this.context, path.GlobalId, viewpoint.GlobalId);
    });

    rightSide.add(removeBtn);

    vpItem.add(rightSide);
    vpItem.dom.addEventListener('dragstart', (e) => {
      this.dragState.dragging = true;

      this.dragState.draggedId = viewpoint.GlobalId;

      this.dragState.pathGlobalId = path.GlobalId;

      vpItem.setStyle('opacity', ['0.5']);

      e.dataTransfer.effectAllowed = 'move';

      e.dataTransfer.setData('text/plain', viewpoint.GlobalId);
    });

    vpItem.dom.addEventListener('dragend', () => {
      this.dragState.dragging = false;

      this.dragState.draggedId = null;

      this.dragState.dropTargetId = null;

      vpItem.setStyle('opacity', ['1']);
      this.updatePanel();
    });

    vpItem.dom.addEventListener('dragover', (e) => {
      e.preventDefault();

      if (this.dragState.dragging && this.dragState.draggedId !== viewpoint.GlobalId) {
        vpItem.setStyle('border-top', ['2px solid var(--primary-color)']);
      }
    });

    vpItem.dom.addEventListener('dragleave', () => {
      vpItem.setStyle('border-top', ['2px solid transparent']);
    });

    vpItem.dom.addEventListener('drop', (e) => {
      e.preventDefault();

      vpItem.setStyle('border-top', ['2px solid transparent']);
      
      if (this.dragState.draggedId && this.dragState.draggedId !== viewpoint.GlobalId) {
        
        this.operators.execute(
          'animationPath.move_viewpoint',
          this.context,
          path.GlobalId,
          this.dragState.draggedId,
          index
        );
      }
    });
    vpItem.dom.addEventListener('mouseenter', () => {
      if (!this.dragState.dragging) {
        vpItem.setStyle('background', ['rgba(255,255,255,0.1)']);
      }
    });

    vpItem.dom.addEventListener('mouseleave', () => {
      vpItem.setStyle('background', ['rgba(255,255,255,0.05)']);
    });

    return vpItem;
  }

  showViewpointSelector(path) {
    const allVps = AECO_TOOLS.world.viewpoint.getAll();

    const availableVps = allVps.filter(vp => !path.viewpointIds.includes(vp.GlobalId));

    if (availableVps.length === 0) {
      alert('No available viewpoints to add');

      return;
    }
    const vpToAdd = availableVps[0];

    this.operators.execute('animationPath.add_viewpoint', this.context, path.GlobalId, vpToAdd.GlobalId);
  }

  filterPaths(query) {
    if (!this.listContainer) return;

    this.listContainer.clear();

    const allPaths = AECO_TOOLS.world.animationPath.getAllPaths();

    const filteredPaths = query
      ? allPaths.filter(path => path.name.toLowerCase().includes(query.toLowerCase()))
      : allPaths;

    if (filteredPaths.length === 0) {
      const emptyMessage = UIComponents.text(query ? `No paths match "${query}"` : 'No animation paths');

      emptyMessage.setStyle('padding', ['1rem'])
        .setStyle('text-align', ['center'])
        .setStyle('color', ['var(--theme-text-light)']);

      this.listContainer.add(emptyMessage);

      return;
    }

    for (const path of filteredPaths) {
      const item = this.drawPathItem(path);

      this.listContainer.add(item);
    }
  }

  /**
   * Open the floating settings window for an animation path
   */
  _openSettingsWindow(path) {
    
    if (this.settingsWindow) {
      this._closeSettingsWindow();
    }

    this.settingsWindowPathGlobalId = path.GlobalId;
    const window = UIComponents.div();

    window.addClass('AnimationSettingsWindow');

    window.setStyle('position', ['fixed'])
      .setStyle('top', ['50%'])
      .setStyle('left', ['50%'])
      .setStyle('transform', ['translate(-50%, -50%)'])
      .setStyle('width', ['450px'])
      .setStyle('max-height', ['80vh'])
      .setStyle('background', ['var(--theme-background)'])
      .setStyle('border', ['1px solid var(--border)'])
      .setStyle('border-radius', ['var(--border-radius)'])
      .setStyle('box-shadow', ['0 8px 32px rgba(0,0,0,0.4)'])
      .setStyle('z-index', ['1000'])
      .setStyle('overflow', ['hidden'])
      .setStyle('display', ['flex'])
      .setStyle('flex-direction', ['column']);
    const header = UIComponents.row();

    header.setStyle('justify-content', ['space-between'])
      .setStyle('align-items', ['center'])
      .setStyle('padding', ['0.75rem 1rem'])
      .setStyle('background', ['var(--theme-background-2)'])
      .setStyle('border-bottom', ['1px solid var(--border)'])
      .setStyle('cursor', ['move']);

    const headerTitle = UIComponents.text('Animation Settings');

    headerTitle.setStyle('font-weight', ['600'])
      .setStyle('font-size', ['0.9rem']);

    header.add(headerTitle);

    const closeBtn = UIComponents.icon('close');

    closeBtn.setStyle('cursor', ['pointer'])
      .setStyle('opacity', ['0.6']);

    closeBtn.onClick(() => this._closeSettingsWindow());

    header.add(closeBtn);

    window.add(header);
    makeDraggable(window.dom, header.dom);
    const content = UIComponents.div();

    content.setStyle('padding', ['1rem'])
      .setStyle('overflow-y', ['auto'])
      .setStyle('flex', ['1']);
    const generalSection = this._createSettingsSection('General');
    const nameRow = this._createSettingRow('Name');

    const nameInput = UIComponents.input();

    nameInput.setValue(path.name);

    nameInput.setStyle('flex', ['1']);

    nameInput.onChange(() => {
      const newName = nameInput.getValue();

      if (newName && newName !== path.name) {
        this.operators.execute('animationPath.rename', this.context, path.GlobalId, newName);
      }
    });

    nameRow.add(nameInput);

    generalSection.add(nameRow);
    const durationRow = this._createSettingRow('Total Duration (s)');

    const durationInput = UIComponents.number(path.totalDuration);

    durationInput.setStyle('width', ['80px']);

    durationInput.setRange(1, 300);

    durationInput.setPrecision(1);

    durationInput.onChange(() => {
      this.operators.execute('animationPath.update_settings', this.context, path.GlobalId, {
        totalDuration: durationInput.getValue()
      });
    });

    durationRow.add(durationInput);

    generalSection.add(durationRow);
    const loopRow = this._createSettingRow('Loop Animation');

    const loopCheckbox = this._createCheckbox(path.loop, (checked) => {
      this.operators.execute('animationPath.update_settings', this.context, path.GlobalId, {
        loop: checked
      });
    });

    loopRow.add(loopCheckbox);

    generalSection.add(loopRow);

    content.add(generalSection);
    const cameraSection = this._createSettingsSection('Camera');
    const speedModeRow = this._createSettingRow('Speed Mode');

    const speedModeSelect = UIComponents.select();

    speedModeSelect.setOptions({
      'auto': 'Auto (from duration)',
      'manual': 'Manual'
    });

    speedModeSelect.setValue(path.cameraSpeedMode);

    speedModeSelect.setStyle('flex', ['1']);

    speedModeSelect.onChange(() => {
      const mode = speedModeSelect.getValue();

      this.operators.execute('animationPath.update_settings', this.context, path.GlobalId, {
        cameraSpeedMode: mode
      });
      manualSpeedRow.setStyle('display', [mode === 'manual' ? 'flex' : 'none']);
    });

    speedModeRow.add(speedModeSelect);

    cameraSection.add(speedModeRow);
    const manualSpeedRow = this._createSettingRow('Manual Speed (u/s)');

    manualSpeedRow.setStyle('display', [path.cameraSpeedMode === 'manual' ? 'flex' : 'none']);

    const manualSpeedInput = UIComponents.number(path.manualCameraSpeed);

    manualSpeedInput.setStyle('width', ['80px']);

    manualSpeedInput.setRange(0.1, 100);

    manualSpeedInput.setPrecision(1);

    manualSpeedInput.onChange(() => {
      this.operators.execute('animationPath.update_settings', this.context, path.GlobalId, {
        manualCameraSpeed: manualSpeedInput.getValue()
      });
    });

    manualSpeedRow.add(manualSpeedInput);

    cameraSection.add(manualSpeedRow);
    const easingRow = this._createSettingRow('Easing');

    const easingSelect = UIComponents.select();

    easingSelect.setOptions({
      'linear': 'Linear',
      'ease-in-quad': 'Ease In (Quad)',
      'ease-out-quad': 'Ease Out (Quad)',
      'ease-in-out-quad': 'Ease In/Out (Quad)',
      'ease-in-cubic': 'Ease In (Cubic)',
      'ease-out-cubic': 'Ease Out (Cubic)',
      'ease-in-out-cubic': 'Ease In/Out (Cubic)',
      'ease-in-expo': 'Ease In (Expo)',
      'ease-out-expo': 'Ease Out (Expo)'
    });

    easingSelect.setValue(path.easing);

    easingSelect.setStyle('flex', ['1']);

    easingSelect.onChange(() => {
      this.operators.execute('animationPath.update_settings', this.context, path.GlobalId, {
        easing: easingSelect.getValue()
      });
    });

    easingRow.add(easingSelect);

    cameraSection.add(easingRow);

    content.add(cameraSection);
    const stopSection = this._createSettingsSection('Default Stop Behavior');
    const stopBehaviorRow = this._createSettingRow('Behavior');

    const stopBehaviorSelect = UIComponents.select();

    stopBehaviorSelect.setOptions({
      'pause': 'Pause at viewpoints',
      'flythrough': 'Fly through (no stop)'
    });

    stopBehaviorSelect.setValue(path.defaultStopBehavior);

    stopBehaviorSelect.setStyle('flex', ['1']);

    stopBehaviorSelect.onChange(() => {
      const behavior = stopBehaviorSelect.getValue();

      this.operators.execute('animationPath.update_settings', this.context, path.GlobalId, {
        defaultStopBehavior: behavior
      });
      durationModeRow.setStyle('display', [behavior === 'pause' ? 'flex' : 'none']);

      stopDurationRow.setStyle('display', [behavior === 'pause' ? 'flex' : 'none']);
    });

    stopBehaviorRow.add(stopBehaviorSelect);

    stopSection.add(stopBehaviorRow);
    const durationModeRow = this._createSettingRow('Duration Mode');

    durationModeRow.setStyle('display', [path.defaultStopBehavior === 'pause' ? 'flex' : 'none']);

    const durationModeSelect = UIComponents.select();

    durationModeSelect.setOptions({
      'seconds': 'Seconds',
      'fraction': 'Fraction of total'
    });

    durationModeSelect.setValue(path.defaultStopDurationMode);

    durationModeSelect.setStyle('flex', ['1']);

    durationModeSelect.onChange(() => {
      this.operators.execute('animationPath.update_settings', this.context, path.GlobalId, {
        defaultStopDurationMode: durationModeSelect.getValue()
      });
      stopDurationLabel.dom.textContent = durationModeSelect.getValue() === 'seconds' ? 'Stop Duration (s)' : 'Stop Duration (0-1)';
    });

    durationModeRow.add(durationModeSelect);

    stopSection.add(durationModeRow);
    const stopDurationRow = this._createSettingRow(
      path.defaultStopDurationMode === 'seconds' ? 'Stop Duration (s)' : 'Stop Duration (0-1)'
    );

    stopDurationRow.setStyle('display', [path.defaultStopBehavior === 'pause' ? 'flex' : 'none']);

    const stopDurationLabel = stopDurationRow.dom.querySelector('.setting-label') || stopDurationRow;

    const stopDurationInput = UIComponents.number(path.defaultStopDuration);

    stopDurationInput.setStyle('width', ['80px']);

    stopDurationInput.setRange(0, path.defaultStopDurationMode === 'seconds' ? 60 : 1);

    stopDurationInput.setPrecision(path.defaultStopDurationMode === 'seconds' ? 1 : 2);

    stopDurationInput.onChange(() => {
      this.operators.execute('animationPath.update_settings', this.context, path.GlobalId, {
        defaultStopDuration: stopDurationInput.getValue()
      });
    });

    stopDurationRow.add(stopDurationInput);

    stopSection.add(stopDurationRow);

    content.add(stopSection);
    const displaySection = this._createSettingsSection('Display');
    const showPathRow = this._createSettingRow('Show path during playback');

    const showPathCheckbox = this._createCheckbox(path.showPathDuringPlay, (checked) => {
      this.operators.execute('animationPath.update_settings', this.context, path.GlobalId, {
        showPathDuringPlay: checked
      });
    });

    showPathRow.add(showPathCheckbox);

    displaySection.add(showPathRow);
    const colorsSubsection = UIComponents.div();

    colorsSubsection.setStyle('margin-top', ['0.5rem']);

    const colorsTitle = UIComponents.smallText('Path Colors');

    colorsTitle.setStyle('color', ['var(--theme-text-light)'])
      .setStyle('margin-bottom', ['0.5rem'])
      .setStyle('display', ['block']);

    colorsSubsection.add(colorsTitle);

    const colorsGrid = UIComponents.div();

    colorsGrid.setStyle('display', ['grid'])
      .setStyle('grid-template-columns', ['1fr 1fr 1fr'])
      .setStyle('gap', ['0.5rem']);
    const pathColorWrap = this._createColorPicker('Path', path.pathColor || '#ff0000', (color) => {
      this.operators.execute('animationPath.set_path_color', this.context, path.GlobalId, color);
    });

    colorsGrid.add(pathColorWrap);
    const markerColorWrap = this._createColorPicker('Marker', path.markerColor || '#00ff00', (color) => {
      this.operators.execute('animationPath.set_marker_color', this.context, path.GlobalId, color);
    });

    colorsGrid.add(markerColorWrap);
    const targetColorWrap = this._createColorPicker('Target', path.targetColor || '#0000ff', (color) => {
      this.operators.execute('animationPath.set_target_color', this.context, path.GlobalId, color);
    });

    colorsGrid.add(targetColorWrap);

    colorsSubsection.add(colorsGrid);

    displaySection.add(colorsSubsection);

    content.add(displaySection);
    if (path.viewpointIds.length > 0) {
      const vpSettingsSection = this._createSettingsSection('Viewpoint Settings');

      const vpSettingsInfo = UIComponents.smallText('Override default stop behavior for individual viewpoints');

      vpSettingsInfo.setStyle('color', ['var(--theme-text-light)'])
        .setStyle('font-style', ['italic'])
        .setStyle('margin-bottom', ['0.5rem'])
        .setStyle('display', ['block']);

      vpSettingsSection.add(vpSettingsInfo);

      const vpList = UIComponents.column();

      vpList.setStyle('gap', ['0.5rem'])
        .setStyle('max-height', ['200px'])
        .setStyle('overflow-y', ['auto']);

      path.viewpointIds.forEach((vpId, index) => {
        const vp = AECO_TOOLS.world.viewpoint.get(vpId);

        if (vp) {
          const vpSettingItem = this._createViewpointSettingItem(path, vp, index);

          vpList.add(vpSettingItem);
        }
      });

      vpSettingsSection.add(vpList);

      content.add(vpSettingsSection);
    }

    window.add(content);
    const footer = UIComponents.row();

    footer.setStyle('justify-content', ['flex-end'])
      .setStyle('padding', ['0.75rem 1rem'])
      .setStyle('border-top', ['1px solid var(--border)'])
      .setStyle('background', ['var(--theme-background-2)']);

    const doneBtn = UIComponents.button('Done');

    doneBtn.onClick(() => this._closeSettingsWindow());

    footer.add(doneBtn);

    window.add(footer);
    document.body.appendChild(window.dom);

    this.settingsWindow = window;
    const backdrop = UIComponents.div();

    backdrop.addClass('AnimationSettingsBackdrop');

    backdrop.setStyle('position', ['fixed'])
      .setStyle('top', ['0'])
      .setStyle('left', ['0'])
      .setStyle('right', ['0'])
      .setStyle('bottom', ['0'])
      .setStyle('background', ['rgba(0,0,0,0.3)'])
      .setStyle('z-index', ['999']);

    backdrop.onClick(() => this._closeSettingsWindow());

    document.body.appendChild(backdrop.dom);

    this.settingsBackdrop = backdrop;
  }

  /**
   * Close the settings window
   */
  _closeSettingsWindow() {
    if (this.settingsWindow) {
      this.settingsWindow.dom.remove();

      this.settingsWindow = null;
    }

    if (this.settingsBackdrop) {
      this.settingsBackdrop.dom.remove();

      this.settingsBackdrop = null;
    }

    this.settingsWindowPathGlobalId = null;
  }

  /**
   * Create a settings section with title
   */
  _createSettingsSection(title) {
    const section = UIComponents.div();

    section.setStyle('margin-bottom', ['1rem']);

    const sectionTitle = UIComponents.text(title);

    sectionTitle.setStyle('font-weight', ['600'])
      .setStyle('font-size', ['0.85rem'])
      .setStyle('margin-bottom', ['0.5rem'])
      .setStyle('padding-bottom', ['0.25rem'])
      .setStyle('border-bottom', ['1px solid var(--border)']);

    section.add(sectionTitle);

    return section;
  }

  /**
   * Create a setting row with label
   */
  _createSettingRow(label) {
    const row = UIComponents.row();

    row.setStyle('justify-content', ['space-between'])
      .setStyle('align-items', ['center'])
      .setStyle('padding', ['0.35rem 0'])
      .setStyle('gap', ['1rem']);

    const labelEl = UIComponents.text(label);

    labelEl.addClass('setting-label');

    labelEl.setStyle('font-size', ['0.85rem'])
      .setStyle('white-space', ['nowrap']);

    row.add(labelEl);

    return row;
  }

  /**
   * Create a checkbox element
   */
  _createCheckbox(checked, onChange) {
    const wrapper = UIComponents.div();

    wrapper.dom.innerHTML = `<input type="checkbox" ${checked ? 'checked' : ''} style="cursor: pointer;">`;

    const input = wrapper.dom.querySelector('input');

    input.addEventListener('change', (e) => {
      onChange(e.target.checked);
    });

    return wrapper;
  }

  /**
   * Create a viewpoint settings item
   */
  _createViewpointSettingItem(path, viewpoint, index) {
    const settings = path.getViewpointSettings(viewpoint.GlobalId);

    const item = UIComponents.div();

    item.setStyle('background', ['rgba(255,255,255,0.05)'])
      .setStyle('border-radius', ['var(--border-radius)'])
      .setStyle('padding', ['0.5rem']);
    const headerRow = UIComponents.row();

    headerRow.setStyle('justify-content', ['space-between'])
      .setStyle('align-items', ['center'])
      .setStyle('margin-bottom', ['0.35rem']);

    const vpLabel = UIComponents.text(`${index + 1}. ${viewpoint.name}`);

    vpLabel.setStyle('font-weight', ['500'])
      .setStyle('font-size', ['0.85rem']);

    headerRow.add(vpLabel);

    item.add(headerRow);
    const settingsRow = UIComponents.row();

    settingsRow.setStyle('gap', ['0.5rem'])
      .setStyle('align-items', ['center'])
      .setStyle('flex-wrap', ['wrap']);
    const behaviorSelect = UIComponents.select();

    behaviorSelect.setOptions({
      'pause': 'Pause',
      'flythrough': 'Fly through'
    });

    behaviorSelect.setValue(settings.stopBehavior);

    behaviorSelect.setStyle('font-size', ['0.8rem'])
      .setStyle('padding', ['0.25rem']);

    behaviorSelect.onChange(() => {
      this.operators.execute(
        'animationPath.update_viewpoint_settings',
        this.context,
        path.GlobalId,
        viewpoint.GlobalId,
        { stopBehavior: behaviorSelect.getValue() }
      );
      durationWrapper.setStyle('display', [behaviorSelect.getValue() === 'pause' ? 'flex' : 'none']);
    });

    settingsRow.add(behaviorSelect);
    const durationWrapper = UIComponents.row();

    durationWrapper.setStyle('align-items', ['center'])
      .setStyle('gap', ['0.25rem'])
      .setStyle('display', [settings.stopBehavior === 'pause' ? 'flex' : 'none']);

    const durationLabel = UIComponents.smallText('for');

    durationLabel.setStyle('font-size', ['0.75rem']);

    durationWrapper.add(durationLabel);

    const durationInput = UIComponents.number(settings.stopDuration);

    durationInput.setStyle('width', ['50px'])
      .setStyle('font-size', ['0.8rem']);

    durationInput.setRange(0, 60);

    durationInput.setPrecision(1);

    durationInput.onChange(() => {
      this.operators.execute(
        'animationPath.update_viewpoint_settings',
        this.context,
        path.GlobalId,
        viewpoint.GlobalId,
        { stopDuration: durationInput.getValue() }
      );
    });

    durationWrapper.add(durationInput);

    const unitLabel = UIComponents.smallText('s');

    unitLabel.setStyle('font-size', ['0.75rem']);

    durationWrapper.add(unitLabel);

    settingsRow.add(durationWrapper);

    item.add(settingsRow);

    return item;
  }
}

export { AnimationPathUI };
