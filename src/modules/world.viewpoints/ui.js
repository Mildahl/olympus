import { Components as UIComponents } from "../../ui/Components/Components.js";

import { BasePanel } from "../../../drawUI/BasePanel.js";

import AECO_tools from "../../tool/index.js";

class ViewpointsUI extends BasePanel {
  constructor({ context, operators }) {
    super({
      context,
      operators,
      parentId: "ViewpointModule",
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

    this.navigationControls = null;

    this.expandedIds = new Set();

    this.searchQuery = '';

    this.panel.addClass('ViewpointsPanel');

    this.draw();

    this.listen(context);
  }

  listen(context) {
    context.signals.viewpointsChanged.add(() => this.updatePanel());

    context.signals.viewpointRemoved.add((id) => this.expandedIds.delete(id));
  }

  draw() {
    this.clearPanel();

    this.drawHeader();

    this.drawNavigationControls();

    this.drawList();

    this.updatePanel();
  }

  drawHeader() {
    const addButton = UIComponents.icon('add');

    addButton.addClass('Button');

    addButton.onClick(() => {
      const name = `Viewpoint ${AECO_tools.world.viewpoint.getCount() + 1}`;

      this.operators.execute('viewpoint.create', this.context, name);
    });

    const headerRow = this.createHeader('Viewpoints', 'camera_alt', [addButton]);

    this.header.add(headerRow);
  }

  drawNavigationControls() {
    this.navigationControls = UIComponents.div();

    this.navigationControls.addClass('ViewpointsNavigation');

    this.drawNavigationContent();

    this.header.add(this.navigationControls);
  }

  drawNavigationContent() {
    this.navigationControls.clear();

    this.navigationControls
      .setStyle('display', ['flex'])
      .setStyle('justify-content', ['center'])
      .setStyle('gap', ['0.5rem'])
      .setStyle('padding', ['0.5rem'])
      .setStyle('border-bottom', ['1px solid var(--border)']);

    const canGoBack = AECO_tools.world.viewpoint.canNavigateBack();

    const canGoForward = AECO_tools.world.viewpoint.canNavigateForward();

    const backButton = UIComponents.icon('arrow_back');

    backButton.addClass('NavigationButton');

    backButton.setStyle('cursor', [canGoBack ? 'pointer' : 'default'])
      .setStyle('opacity', [canGoBack ? '1' : '0.3']);

    backButton.onClick(() => {
      if (canGoBack) this.operators.execute('viewpoint.navigate_back', this.context);
    });

    const forwardButton = UIComponents.icon('arrow_forward');

    forwardButton.addClass('NavigationButton');

    forwardButton.setStyle('cursor', [canGoForward ? 'pointer' : 'default'])
      .setStyle('opacity', [canGoForward ? '1' : '0.3']);

    forwardButton.onClick(() => {
      if (canGoForward) this.operators.execute('viewpoint.navigate_forward', this.context);
    });

    const history = AECO_tools.world.viewpoint.getNavigationHistory();

    const currentIndex = history.findIndex(h => h.isCurrent);

    const historyText = UIComponents.smallText(`${Math.max(0, currentIndex + 1)}/${history.length || 0}`);

    historyText.setStyle('margin', ['0 0.5rem']);

    this.navigationControls.add(backButton);

    this.navigationControls.add(historyText);

    this.navigationControls.add(forwardButton);
  }

  updateNavigationControls() {
    if (this.navigationControls) this.drawNavigationContent();
  }

  drawList() {
    this.listContainer = UIComponents.column();

    this.content.add(this.listContainer);
  }

  updatePanel() {
    if (!this.listContainer) return;

    this.listContainer.clear();

    this.updateNavigationControls();

    const allViewpoints = AECO_tools.world.viewpoint.getAll();

    const viewpoints = this.searchQuery
      ? allViewpoints.filter(vp => vp.name.toLowerCase().includes(this.searchQuery.toLowerCase()))
      : allViewpoints;

    if (viewpoints.length === 0) {
      const emptyMessage = UIComponents.text(this.searchQuery ? 'No viewpoints match your search' : 'No viewpoints');

      emptyMessage.setStyle('padding', ['1rem'])
        .setStyle('text-align', ['center'])
        .setStyle('color', ['var(--theme-text-light)']);

      this.listContainer.add(emptyMessage);

      return;
    }

    viewpoints.forEach(vp => this.listContainer.add(this.drawViewpointItem(vp)));
  }

  drawViewpointItem(viewpoint) {
    const isExpanded = this.expandedIds.has(viewpoint.GlobalId);

    const item = UIComponents.div();

    item.addClass('ViewpointItem');

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
        this.expandedIds.delete(viewpoint.GlobalId);
      } else {
        this.expandedIds.add(viewpoint.GlobalId);
      }

      this.updatePanel();
    });

    leftSection.add(expandIcon);

    const name = UIComponents.text(viewpoint.name);

    leftSection.add(name);

    mainRow.add(leftSection);

    const actionsRow = UIComponents.row();

    actionsRow.addClass('ViewpointItem-actions');

    actionsRow.setStyle('gap', ['0.25rem']).setStyle('opacity', ['0']);

    const visibilityButton = UIComponents.icon(viewpoint.visible ? 'visibility' : 'visibility_off');

    visibilityButton.addClass('Button');

    visibilityButton.dom.title = viewpoint.visible ? 'Hide viewpoint' : 'Show viewpoint';
    visibilityButton.onClick((e) => {
      e.stopPropagation();

      this.operators.execute('viewpoint.toggle_visibility', this.context, viewpoint.GlobalId);

      this.updatePanel();
    });

    actionsRow.add(visibilityButton);

    const captureButton = UIComponents.icon('photo_camera');

    captureButton.addClass('Button');

    captureButton.dom.title = 'Capture from current camera';

    captureButton.onClick((e) => {
      e.stopPropagation();

      this.operators.execute('viewpoint.update_from_editor', this.context, viewpoint.GlobalId);
    });

    actionsRow.add(captureButton);

    const goToViewButton = UIComponents.icon('videocam');

    goToViewButton.addClass('Button');

    goToViewButton.dom.title = 'Go to camera view';

    goToViewButton.onClick((e) => {
      e.stopPropagation();

      this.operators.execute('viewpoint.activate', this.context, viewpoint.GlobalId, true);
    });

    actionsRow.add(goToViewButton);

    mainRow.add(actionsRow);

    item.add(mainRow);

    if (isExpanded) {
      item.add(this.drawAttributePanel(viewpoint));
    }

    return item;
  }

  drawAttributePanel(viewpoint) {
    const panel = UIComponents.div();

    panel.addClass('ViewpointAttributePanel');

    panel.onClick((e) => e.stopPropagation());

    panel.add(this.drawNameSection(viewpoint));

    panel.add(this.drawMetadataSection(viewpoint));

    panel.add(this.drawPositionSection(viewpoint));

    panel.add(this.drawTargetSection(viewpoint));

    panel.add(this.drawActionsSection(viewpoint));

    return panel;
  }

  drawNameSection(viewpoint) {
    const section = UIComponents.div();

    section.setStyle('margin-bottom', ['0.75rem']);

    const label = UIComponents.smallText('Name');

    label.setStyle('color', ['var(--theme-text-light)'])
      .setStyle('margin-bottom', ['0.25rem'])
      .setStyle('display', ['block']);

    section.add(label);

    const input = UIComponents.input();

    input.setValue(viewpoint.name);

    input.setStyle('width', ['100%']);

    input.onChange(() => {
      const newName = input.getValue();

      if (newName && newName !== viewpoint.name) {
        this.operators.execute('viewpoint.rename', this.context, viewpoint.GlobalId, newName);
      }
    });

    section.add(input);

    return section;
  }

  drawMetadataSection(viewpoint) {
    const section = UIComponents.div();

    section.setStyle('margin-bottom', ['0.75rem'])
      .setStyle('padding-bottom', ['0.75rem'])
      .setStyle('border-bottom', ['1px solid var(--border)']);

    section.add(this.createRow(null, 'ID', viewpoint.GlobalId.substring(0, 8) + '...'));

    section.add(this.createRow(null, 'Created', new Date(viewpoint.metadata.createdAt).toLocaleDateString()));

    section.add(this.createRow(null, 'Modified', new Date(viewpoint.metadata.modifiedAt).toLocaleDateString()));

    return section;
  }

  createRow(icon, labelText, value) {
    const row = UIComponents.row();

    row.setStyle('justify-content', ['space-between'])
      .setStyle('align-items', ['center'])
      .setStyle('padding', ['0.25rem 0'])
      .setStyle('font-size', ['0.8rem']);

    if (icon) row.add(UIComponents.icon(icon));

    const labelEl = UIComponents.text(labelText);

    labelEl.setStyle('color', ['var(--theme-text-light)']);

    row.add(labelEl);

    const valueEl = UIComponents.text(String(value));

    valueEl.setStyle('font-family', ['monospace']).setStyle('font-size', ['0.75rem']);

    row.add(valueEl);

    return row;
  }

  drawPositionSection(viewpoint) {
    const section = UIComponents.div();

    section.setStyle('margin-bottom', ['0.75rem']);

    const title = UIComponents.smallText('Camera Position');

    title.setStyle('color', ['var(--theme-text-light)'])
      .setStyle('margin-bottom', ['0.5rem'])
      .setStyle('display', ['block']);

    section.add(title);

    section.add(this.drawVector3Inputs(
      viewpoint.cameraPosition,
      (x, y, z) => this.operators.execute('viewpoint.update_position', this.context, viewpoint.GlobalId, { x, y, z })
    ));

    return section;
  }

  drawTargetSection(viewpoint) {
    const section = UIComponents.div();

    section.setStyle('margin-bottom', ['0.75rem']);

    const title = UIComponents.smallText('Camera Target');

    title.setStyle('color', ['var(--theme-text-light)'])
      .setStyle('margin-bottom', ['0.5rem'])
      .setStyle('display', ['block']);

    section.add(title);

    section.add(this.drawVector3Inputs(
      viewpoint.cameraTarget,
      (x, y, z) => this.operators.execute('viewpoint.update_target', this.context, viewpoint.GlobalId, { x, y, z })
    ));

    return section;
  }

  drawActionsSection(viewpoint) {
    const section = UIComponents.div();

    section.setStyle('display', ['flex'])
      .setStyle('flex-direction', ['column'])
      .setStyle('gap', ['0.5rem'])
      .setStyle('padding-top', ['0.5rem'])
      .setStyle('border-top', ['1px solid var(--border)']);

    const captureButton = UIComponents.button('Capture from Camera');

    captureButton.setStyle('width', ['100%']);

    captureButton.onClick(() => this.operators.execute('viewpoint.update_from_editor', this.context, viewpoint.GlobalId));

    section.add(captureButton);

    const buttonRow = UIComponents.row();

    buttonRow.setStyle('gap', ['0.5rem']);

    const goToButton = UIComponents.button('Go to View');

    goToButton.setStyle('flex', ['1']);

    goToButton.onClick(() => this.operators.execute('viewpoint.activate', this.context, viewpoint.GlobalId, true));

    buttonRow.add(goToButton);

    const deleteButton = UIComponents.button('Delete');

    deleteButton.setStyle('flex', ['1']).setStyle('background', ['var(--red)']);

    deleteButton.onClick(() => {
      if (confirm('Delete this viewpoint?')) {
        this.operators.execute('viewpoint.remove', this.context, viewpoint.GlobalId);
      }
    });

    buttonRow.add(deleteButton);

    section.add(buttonRow);

    return section;
  }

  drawVector3Inputs(position, onUpdate) {
    const container = UIComponents.row();

    container.setStyle('gap', ['0.5rem']);

    container.add(this.drawNumberInput('X', position.x, (v) => onUpdate(v, position.y, position.z)));

    container.add(this.drawNumberInput('Y', position.y, (v) => onUpdate(position.x, v, position.z)));

    container.add(this.drawNumberInput('Z', position.z, (v) => onUpdate(position.x, position.y, v)));

    return container;
  }

  drawNumberInput(label, value, onChange) {
    const container = UIComponents.div();

    container.setStyle('display', ['flex']).setStyle('flex-direction', ['column']).setStyle('flex', ['1']);

    const labelEl = UIComponents.smallText(label);

    labelEl.setStyle('font-size', ['0.7rem']).setStyle('color', ['var(--theme-text-light)']);

    const input = UIComponents.number(value);

    input.setStyle('width', ['100%']);

    input.setPrecision(2);

    input.onChange(() => onChange(input.getValue()));

    container.add(labelEl);

    container.add(input);

    return container;
  }

  filterViewpoints(query) {
    this.searchQuery = query;

    this.updatePanel();
  }
}

export { ViewpointsUI };