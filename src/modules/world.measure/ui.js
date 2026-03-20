import { Components as UIComponents } from "../../ui/Components/Components.js";

import { BasePanel } from "../../../drawUI/BasePanel.js";

import { MeasureState } from "./operators.js";

import MeasureTool from "../../tool/viewer/MeasureTool.js";

class MeasureUI extends BasePanel {
  constructor({ context, operators }) {
    super({
      context,
      operators,
      parentId: "ViewportMeasureTools",
      panelStyles: {
        height: "fit-content",
        maxHeight: "calc(100vh - 2 * var(--phi-0-5))",
        maxWidth: "80vw",
        width: "fit-content",
      },
      resizeHandles: ['e', 's', 'se'],
      position: 'right',
      testing:false,
      draggable:true,
    });

    this.measurementsList = null;

    this.modeButtons = {};

    this.toggleSnapMenu = context.signals.toggleSnapMenu;

    const tooltip = UIComponents.tooltip('Measure Tool', { position: 'right' });

    tooltip.attachTo(this.parent, { followMouse: true });

    this.draw();

    this.listen(context, operators);
  }

  showPanel(context, options) {
    super.showPanel(context, options);
    this.toggleSnapMenu.dispatch(true);
  }

  hidePanel() {
    super.hidePanel();

    this.toggleSnapMenu.dispatch(false);
  }
  createRow(icon, labelText, controlEl) {
    const row = UIComponents.row().addClass('ListBoxItem').addClass('space-between');

    if (icon) row.add(UIComponents.icon(icon));

    row.add(UIComponents.text(labelText));

    row.add(controlEl);

    return row;
  }

  listen(context, operators) {
    if (context.signals.measureToolToggled) {
      context.signals.measureToolToggled.add(({ isActive, mode }) => {
        this.updateActiveState(isActive, mode);
      });
    }

    if (context.signals.measureModeChanged) {
      context.signals.measureModeChanged.add((mode) => {
        this.updateModeButtons(mode);
      });
    }

    if (context.signals.measurementCreated) {
      context.signals.measurementCreated.add(() => {
        this.updateMeasurementsList();
      });
    }

    if (context.signals.measurementsCleared) {
      context.signals.measurementsCleared.add(() => {
        this.updateMeasurementsList();
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "m" && e.shiftKey && !e.ctrlKey && !e.altKey) {
        operators.execute("world.measure.toggle", context);
      }
    });
  }

  draw() {
    this.clearPanel();

    this.toggleBtn = UIComponents.icon("power_settings_new");

    this.toggleBtn.addClass("Button");

    this.toggleBtn.setStyle("cursor", ["pointer"]);

    this.toggleBtn.onClick(() => {
      this.operators.execute("world.measure.toggle", this.context);
    });

    const headerRow = this.createHeader("Measure Tools", "straighten", [this.toggleBtn]);

    this.header.add(headerRow);

    const modesGrid = UIComponents.row()

    modesGrid.setStyle("display", ["grid"]);

    modesGrid.setStyle("grid-template-columns", ["repeat(4, 1fr)"]);

    modesGrid.setStyle("gap", ["var(--phi-0-5)"]);

    const modes = [
      { id: "DISTANCE", icon: "straighten", label: "Distance", key: "1" },
      { id: "ANGLE", icon: "square_foot", label: "Angle", key: "2" },
      { id: "AREA", icon: "square", label: "Area", key: "3" },
      { id: "PERPENDICULAR", icon: "height", label: "Perp.", key: "4" },
    ];

    modes.forEach((mode) => {
      const btn = this.createModeButton(mode);

      this.modeButtons[mode.id] = btn;

      modesGrid.add(btn);
    });
    const listSection = UIComponents.collapsibleSection({
      title: "Measurements",
      collapsed: false,
      maxHeight: "30vh"
    });

    const listActions = UIComponents.row().addClass("space-between");

    const clearBtn = UIComponents.icon("delete_sweep").addClass("Button");

    clearBtn.dom.title = "Clear All";

    clearBtn.onClick(() => {
      this.operators.execute("world.measure.clear_all", this.context);
    });

    const exportBtn = UIComponents.icon("download").addClass("Button");

    exportBtn.dom.title = "Export";

    exportBtn.onClick(() => {
      this.operators.execute("world.measure.export", this.context);
    });

    listActions.add(clearBtn);

    listActions.add(exportBtn);

    listSection.addContent(listActions);

    this.measurementsList = UIComponents.column();

    listSection.addContent(this.measurementsList);
    const controlsSection = UIComponents.collapsibleSection({
      title: "Mouse Controls",
      collapsed: true,
      icon: "keyboard",
    });

    const instructions = [
      { key: "Click", desc: "Place points" },
      { key: "ESC", desc: "Cancel current" },
      { key: "Right-click", desc: "Complete area" },
      { key: "S", desc: "Toggle snap" },
      { key: "C", desc: "Clear all" },
    ];

    const instructionContent = UIComponents.div().addClass("instruction-content");

    instructions.forEach((inst) => {
      const line = UIComponents.row().addClass("instruction-line");

      line.add(UIComponents.span(inst.key).addClass("kbd"));

      line.add(UIComponents.text(inst.desc).addClass("instruction-desc"));

      instructionContent.add(line);
    });

    controlsSection.addContent(instructionContent);

    this.content.add(modesGrid);

    this.content.add(listSection);

    this.content.add(controlsSection);

    this.updateMeasurementsList();
  }

  createModeButton(mode) {
    const btn = UIComponents.div().addClass("SquareOperator");

    btn.add(UIComponents.icon(mode.icon));

    btn.add(UIComponents.text(mode.label));

    btn.add(UIComponents.span(`[${mode.key}]`).addClass("nav-key-label"));

    btn.onClick(() => {
      this.operators.execute("world.measure.set_mode", this.context, mode.id);

      this.updateModeButtons(mode.id);
    });

    return btn;
  }

  updateModeButtons(activeMode) {
    Object.entries(this.modeButtons).forEach(([mode, btn]) => {
      btn.dom.classList.toggle("Active", mode === activeMode);
    });
  }

  updateActiveState(isActive, mode) {
    this.toggleBtn.dom.classList.toggle("Active", isActive);

    if (isActive && mode) {
      this.updateModeButtons(mode);
    } else if (!isActive) {
      
      this.clearModeButtonsActiveState();
    }
  }

  clearModeButtonsActiveState() {
    Object.values(this.modeButtons).forEach((btn) => {
      btn.dom.classList.remove("Active");
    });
  }

  updateMeasurementsList() {
    if (!this.measurementsList) return;

    this.measurementsList.clear();

    const measurements = MeasureTool.getMeasurementsSummary(MeasureState.measurements);

    if (measurements.length === 0) {
      const emptyMsg = UIComponents.text("No measurements").addClass("nav-key-label");

      emptyMsg.setStyle("text-align", ["center"]);

      emptyMsg.setStyle("padding", ["var(--phi-1)"]);

      this.measurementsList.add(emptyMsg);

      return;
    }

    measurements.forEach((m, index) => {
      this.measurementsList.add(this.createMeasurementItem(m, index));
    });
  }

  createMeasurementItem(measurement, index) {
    const icons = {
      DISTANCE: "straighten",
      ANGLE: "square_foot",
      AREA: "square",
      PERPENDICULAR: "height",
    };

    const value = UIComponents.span(`${measurement.value.toFixed(3)} ${measurement.unit}`);

    value.addClass("measurement-value");

    const deleteBtn = UIComponents.icon("close").addClass("Button");

    deleteBtn.onClick(() => {
      this.operators.execute("world.measure.delete", this.context, measurement.id);

      this.updateMeasurementsList();
    });

    const right = UIComponents.row();

    right.add(value);

    right.add(deleteBtn);

    const item = UIComponents.row().addClass("ListBoxItem").addClass("MeasurementItem");

    item.add(UIComponents.icon(icons[measurement.type] || "straighten"));

    item.add(UIComponents.span(`#${index + 1}`).addClass("nav-key-label"));

    item.add(right);

    return item;
  }
}

export { MeasureUI };
