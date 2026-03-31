import { Components as UIComponents } from "../../ui/Components/Components.js";

import { BasePanel } from "../../../drawUI/BasePanel.js";

import AECO_tools from "../../tool/index.js";

/**
 * @typedef {'x' | 'y' | 'z'} ProjectionAxis
 */

class ProjectionUI extends BasePanel {
  constructor({ context, operators }) {
    super({
      context,
      operators,
      parentId: "ProjectionModule",
      panelStyles: {
        height: "fit-content",
        maxHeight: "75vh",
        minWidth: "300px",
      },
      resizeHandles: ['w', 's', 'sw'],
      draggable: true,
      position: 'below-left',
      testing: false,
    });

    this.axisSelect = null;

    this.positionLabel = null;

    this.positionInput = null;

    this.statusText = null;

    this.viewerHost = null;

    this._onProjectionSectionRegenerated = this._onProjectionSectionRegenerated.bind(this);

    this._onProjectionCutPlaneChanged = this._onProjectionCutPlaneChanged.bind(this);

    this.draw();

    this._initMiniViewer();

    this._registerProjectionSignals(context);
  }

  _registerProjectionSignals(context) {
    const signals = context.signals;

    if (signals && signals.projectionCutPlaneChanged) {
      signals.projectionCutPlaneChanged.add(this._onProjectionCutPlaneChanged);
    }

    if (signals && signals.projectionSectionRegenerated) {
      signals.projectionSectionRegenerated.add(this._onProjectionSectionRegenerated);
    }
  }

  _unregisterProjectionSignals() {
    const signals = this.context && this.context.signals;

    if (signals && signals.projectionCutPlaneChanged) {
      signals.projectionCutPlaneChanged.remove(this._onProjectionCutPlaneChanged);
    }

    if (signals && signals.projectionSectionRegenerated) {
      signals.projectionSectionRegenerated.remove(this._onProjectionSectionRegenerated);
    }
  }

  /**
   * @param {{ axis: ProjectionAxis, position: number }} payload
   */
  _onProjectionCutPlaneChanged(payload) {
    if (!payload) return;

    const axis = payload.axis;

    if (this.axisSelect && (axis === 'x' || axis === 'y' || axis === 'z')) {
      this.axisSelect.setValue(axis);
    }

    if (this.positionInput && Number.isFinite(payload.position)) {
      this.positionInput.setValue(payload.position);
    }

  }

  /**
   * @param {{
   *   axis: ProjectionAxis,
   *   position: number,
   *   lineGeometry: unknown,
   *   bounds: unknown,
   *   vertexCount: number
   * }} payload
   */
  _onProjectionSectionRegenerated(payload) {
    if (!payload || !this.statusText) {
      return;
    }

    const lineGeometry = payload.lineGeometry;

    const vertexCount = payload.vertexCount;

    if (lineGeometry) {
      this.statusText.dom.textContent = vertexCount > 0
        ? `vertices: ${vertexCount}`
        : 'no intersection on this plane';
    } else {
      this.statusText.dom.textContent = 'no mesh geometry in scene';
    }
  }

  onShow() {

    this.operators.execute(
      'world.projection.set_cut_plane',
      this.context,
      this._getAxisFromSelect(),
      this._getPosition()
    );
  }

  onHide() {

    this.operators.execute('world.projection.clear_viewport_indicator', this.context);
  }

  _getAxisFromSelect() {
    const axisSelect = this.axisSelect;

    const value = axisSelect ? String(axisSelect.getValue()).trim().toLowerCase() : '';

    if (value === 'x' || value === 'y' || value === 'z') return value;

    return 'z';
  }


  _getPosition() {
    const positionInput = this.positionInput;

    if (!positionInput) return 0;

    const inputElement = /** @type {HTMLInputElement} */ (positionInput.dom);

    const raw = Number.parseFloat(
      String(inputElement.value).replace(',', '.')
    );

    return Number.isFinite(raw) ? raw : 0;
  }

  draw() {
    this.clearPanel();

    const regenBtn = UIComponents.icon('refresh');

    regenBtn.addClass('Button');

    regenBtn.setStyle('cursor', ['pointer']);

    regenBtn.onClick(() => this.regenerate());

    const headerRow = this.createHeader('Section Cut', 'content_cut', [regenBtn]);

    this.header.add(headerRow);

    const form = UIComponents.div();

    form.setStyle('padding', ['0.75rem'])
      .setStyle('border-bottom', ['1px solid var(--border)'])
      .setStyle('display', ['flex'])
      .setStyle('flex-direction', ['column'])
      .setStyle('gap', ['0.5rem']);

    const axisRow = UIComponents.row();

    axisRow.setStyle('align-items', ['center'])
      .setStyle('gap', ['0.5rem']);

    const axisLabel = UIComponents.text('Cut plane');

    axisLabel.setStyle('font-size', ['0.8rem'])
      .setStyle('white-space', ['nowrap']);

    const axisWrap = UIComponents.div();

    axisWrap.setStyle('flex', ['1']);

    const axisSelectOptions = AECO_tools.world.projection.getCutPlaneAxisSelectOptions();

    const axisOptionsRecord = {};

    for (let index = 0; index < axisSelectOptions.length; index++) {
      const optionEntry = axisSelectOptions[index];

      axisOptionsRecord[optionEntry.value] = optionEntry.label;
    }

    this.axisSelect = UIComponents.select();

    this.axisSelect.setOptions(axisOptionsRecord);

    this.axisSelect.setValue('z');

    this.axisSelect.setStyle('width', ['100%']);

    this.axisSelect.setStyle('box-sizing', ['border-box']);

    this.axisSelect.dom.addEventListener('change', () => {

      this.operators.execute(
        'world.projection.set_cut_plane',
        this.context,
        this._getAxisFromSelect(),
        this._getPosition()
      );
    });

    axisWrap.add(this.axisSelect);

    axisRow.add(axisLabel);

    axisRow.add(axisWrap);

    const heightRow = UIComponents.row();

    heightRow.setStyle('align-items', ['center'])
      .setStyle('gap', ['0.5rem']);

    this.positionLabel = UIComponents.text('Plane position');

    this.positionLabel.setStyle('font-size', ['0.8rem'])
      .setStyle('white-space', ['nowrap']);

    const inputWrap = UIComponents.div();

    inputWrap.setStyle('flex', ['1']);

    this.positionInput = UIComponents.number(0);

    this.positionInput.setPrecision(4);

    this.positionInput.setStyle('width', ['100%']);

    this.positionInput.setStyle('box-sizing', ['border-box']);

    const applyCutPlaneFromControls = () => {
      this.operators.execute(
        'world.projection.set_cut_plane',
        this.context,
        this._getAxisFromSelect(),
        this._getPosition()
      );
    };

    this.positionInput.dom.addEventListener('change', applyCutPlaneFromControls);

    this.positionInput.dom.addEventListener('input', applyCutPlaneFromControls);

    inputWrap.add(this.positionInput);

    heightRow.add(this.positionLabel);

    heightRow.add(inputWrap);

    const regenRow = UIComponents.row();

    const regenFull = UIComponents.button('Regenerate');

    regenFull.addClass('Button');

    regenFull.onClick(() => this.regenerate());

    regenRow.add(regenFull);

    this.statusText = UIComponents.text('');

    this.statusText.setStyle('font-size', ['0.75rem'])
      .setStyle('color', ['var(--theme-text-light)'])
      .setStyle('font-family', ['monospace'])
      .setStyle('white-space', ['pre-wrap']);

    form.add(axisRow);

    form.add(heightRow);

    form.add(regenRow);

    form.add(this.statusText);

    this.content.add(form);

    this.viewerHost = UIComponents.div();

    this.viewerHost.setStyle('min-height', ['260px'])
      .setStyle('width', ['100%'])
      .setStyle('position', ['relative'])
      .setStyle('background', ['#111']);

    this.content.add(this.viewerHost);
  }

  _initMiniViewer() {
    if (!this.viewerHost || !this.viewerHost.dom) {
      return;
    }

    this.operators.execute(
      'world.projection.mount_planar_preview',
      this.context,
      this.viewerHost.dom
    );
  }


  regenerate() {
    this.statusText.dom.textContent = 'processing…';

    let result;

    try {
      result = this.operators.execute(
        'world.projection.generate_section_cut',
        this.context,
        this._getAxisFromSelect(),
        this._getPosition()
      );
    } catch (error) {
      const message = error && error.message ? error.message : String(error);

      this.statusText.dom.textContent = `error: ${message}`;

      return;
    }

    if (!result || result.status !== 'FINISHED') {
      this.statusText.dom.textContent = 'cancelled';
    }
  }

  destroy() {

    this._unregisterProjectionSignals();

    this.operators.execute('world.projection.unmount_planar_preview', this.context);

    super.destroy();
  }
}

export { ProjectionUI };
