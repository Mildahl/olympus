import { Components as UIComponents, BasePanel, UIDiv } from "../../ui/Components/Components.js";

import { SectionBoxState } from "./operators.js";

import SectionBoxTool from "../../tool/viewer/SectionBoxTool.js";

/**
 * SectionBoxUI - Professional section box control panel
 *
 * Uses operators for all actions. State is managed in operators.js (SectionBoxState)
 * and the UI reacts to signals.
 *
 * Provides:
 * - Toggle on/off
 * - Show/hide box (keeps clipping active)
 * - Toggle clipping
 * - Fit to selection/all
 * - Manual size controls
 * - Reset functionality
 * - Export/Import
 */
class SectionBoxUI extends BasePanel {
  constructor({ context, operators }) {
    super({
      context,
      operators,
      parentId: "ViewportSectionTools",
      panelStyles: {
        height: "fit-content",
        maxHeight: "60vh",
        minWidth: "260px",
        overflow: "auto",
      },
      position: "left",
      draggable: true,
      resizable: true,
      resizeHandles: ["e", "s", "se"],
    });

    this.boxDataDisplay = null;

    this.visibilityBtn = null;

    this.clippingBtn = null;

    this.sizeInputs = {};

    this.draw();

    this.listen(context, operators);
  }

  listen(context, operators) {
    
    if (context.signals.sectionBoxToggled) {
      context.signals.sectionBoxToggled.add(({ isActive, boxData }) => {
        this.updateActiveState(isActive);

        if (boxData) {
          this.updateBoxDataDisplay(boxData);
        }
      });
    }

    if (context.signals.sectionBoxChanged) {
      context.signals.sectionBoxChanged.add((boxData) => {
        this.updateBoxDataDisplay(boxData);
      });
    }
    document.addEventListener("keydown", (e) => {
      if (e.key === "b" && e.shiftKey && !e.ctrlKey && !e.altKey) {
        operators.execute("world.sectionbox.toggle", context);
      }
    });
  }

  draw() {
    this.clearPanel();
    this.toggleBtn = UIComponents.icon("power_settings_new");
    this.toggleBtn.addClass("Button");
    this.toggleBtn.setStyle("cursor", ["pointer"]);
    this.toggleBtn.onClick(() => {
      this.operators.execute("world.sectionbox.toggle", this.context);
    });

    const headerRow = this.createHeader("Section Box", "select_all", [this.toggleBtn]);
    this.header.add(headerRow);
    const visibilitySection = UIComponents.div();
    visibilitySection
      .setStyle("padding", ["0.75rem"])
      .setStyle("border-bottom", ["1px solid var(--border)"]);

    const visLabel = UIComponents.text("Display Options");
    visLabel
      .setStyle("font-size", ["0.75rem"])
      .setStyle("color", ["var(--theme-text-light)"])
      .setStyle("margin-bottom", ["0.5rem"]);
    visibilitySection.add(visLabel);

    const visRow = UIComponents.row();
    visRow.setStyle("display", ["flex"]);
    visRow.setStyle("gap", ["0.5rem"]);
    this.visibilityBtn = this.createToggleButton({
      icon: "visibility",
      iconOff: "visibility_off",
      label: "Show Box",
      key: "V",
      active: SectionBoxState.isBoxVisible,
      onClick: () => {
        this.operators.execute("world.sectionbox.toggle_visibility", this.context);
      }
    });
    visRow.add(this.visibilityBtn);
    this.clippingBtn = this.createToggleButton({
      icon: "content_cut",
      iconOff: "content_cut",
      label: "Clip",
      key: "C",
      active: SectionBoxState.isClippingEnabled,
      onClick: () => {
        this.operators.execute("world.sectionbox.toggle_clipping", this.context);
      }
    });
    visRow.add(this.clippingBtn);

    visibilitySection.add(visRow);
    this.content.add(visibilitySection);
    const actionsSection = UIComponents.div();
    actionsSection
      .setStyle("padding", ["0.75rem"])
      .setStyle("border-bottom", ["1px solid var(--border)"]);

    const actionsLabel = UIComponents.text("Quick Actions");
    actionsLabel
      .setStyle("font-size", ["0.75rem"])
      .setStyle("color", ["var(--theme-text-light)"])
      .setStyle("margin-bottom", ["0.5rem"]);
    actionsSection.add(actionsLabel);

    const actionsGrid = UIComponents.row();

    actionsGrid.setStyle("display", ["grid"]);

    actionsGrid.setStyle("grid-template-columns", ["repeat(2, 1fr)"]);

    actionsGrid.setStyle("gap", ["0.5rem"]);

    const actions = [
      { id: "fit_selection", icon: "center_focus_strong", label: "Fit Selection", key: "F" },
      { id: "fit_all", icon: "zoom_out_map", label: "Fit All", key: "A" },
      { id: "reset", icon: "restart_alt", label: "Reset", key: "R" },
      { id: "export", icon: "download", label: "Export", key: null },
    ];

    actions.forEach((action) => {
      const btn = this.createActionButton(action);

      actionsGrid.add(btn);
    });

    actionsSection.add(actionsGrid);

    this.content.add(actionsSection);
    const gizmoSection = UIComponents.div();
    gizmoSection
      .setStyle("padding", ["0.75rem"])
      .setStyle("border-bottom", ["1px solid var(--border)"]);

    const gizmoLabel = UIComponents.text("Transform Mode");
    gizmoLabel
      .setStyle("font-size", ["0.75rem"])
      .setStyle("color", ["var(--theme-text-light)"])
      .setStyle("margin-bottom", ["0.5rem"]);
    gizmoSection.add(gizmoLabel);

    const gizmoRow = UIComponents.row();
    gizmoRow.setStyle("display", ["flex"]);
    gizmoRow.setStyle("gap", ["0.5rem"]);

    this.gizmoModeButtons = {};

    const gizmoModes = [
      { id: "translate", icon: "open_with", label: "Move", key: "G" },
      { id: "scale", icon: "aspect_ratio", label: "Scale", key: "S" },
    ];

    gizmoModes.forEach((mode) => {
      const btn = this.createGizmoModeButton(mode);
      this.gizmoModeButtons[mode.id] = btn;
      gizmoRow.add(btn);
    });

    gizmoSection.add(gizmoRow);
    this.content.add(gizmoSection);
    const dimensionsSection = UIComponents.div();
    dimensionsSection
      .setStyle("padding", ["0.75rem"])
      .setStyle("border-bottom", ["1px solid var(--border)"]);

    const dimensionsLabel = UIComponents.text("Box Dimensions");
    dimensionsLabel
      .setStyle("font-size", ["0.75rem"])
      .setStyle("color", ["var(--theme-text-light)"])
      .setStyle("margin-bottom", ["0.5rem"]);
    dimensionsSection.add(dimensionsLabel);

    this.boxDataDisplay = UIComponents.div();
    this.boxDataDisplay
      .setStyle("background", ["var(--theme-background-1618)"])
      .setStyle("padding", ["0.75rem"])
      .setStyle("border-radius", ["4px"])
      .setStyle("font-family", ["monospace"])
      .setStyle("font-size", ["0.75rem"]);
    dimensionsSection.add(this.boxDataDisplay);

    this.content.add(dimensionsSection);
    const controlsSection = UIComponents.div();
    controlsSection.setStyle("padding", ["0.75rem"]);

    const controlsLabel = UIComponents.text("Manual Size");
    controlsLabel
      .setStyle("font-size", ["0.75rem"])
      .setStyle("color", ["var(--theme-text-light)"])
      .setStyle("margin-bottom", ["0.5rem"]);
    controlsSection.add(controlsLabel);
    const axes = [
      { axis: "X", color: "#ff6666" },
      { axis: "Y", color: "#66ff66" },
      { axis: "Z", color: "#6666ff" },
    ];

    axes.forEach((axisInfo) => {
      const row = this.createAxisControl(axisInfo);
      controlsSection.add(row);
    });

    this.content.add(controlsSection);
    const footerContent = UIComponents.div();
    footerContent
      .setStyle("padding", ["0.75rem"])
      .setStyle("background", ["var(--theme-background-1618)"])
      .setStyle("font-size", ["0.7rem"])
      .setStyle("color", ["var(--theme-text-light)"])
      .setStyle("line-height", ["1.5"]);

    const instructions = [
      "• Drag colored handles to resize faces",
      "• Use center gizmo to move box",
      "• V to toggle box visibility",
      "• G for move mode, S for scale mode",
      "• F fit selection, A fit all",
      "• R reset, ESC deactivate",
    ];

    footerContent.dom.innerHTML = instructions.join("<br>");
    this.footer.add(footerContent);
    this.updateInitialState();
  }

  updateInitialState() {
    
    const boxData = SectionBoxTool.getBoxData(
      SectionBoxState.box,
      SectionBoxState.isActive,
      SectionBoxState.isBoxVisible,
      SectionBoxState.isClippingEnabled
    );

    this.updateBoxDataDisplay(boxData);

    this.updateActiveState(SectionBoxState.isActive);

    this.updateGizmoModeButtons(SectionBoxState.gizmoMode);
  }

  createToggleButton({ icon, iconOff, label, key, active, onClick }) {
    const btn = UIComponents.div();

    btn
      .setStyle("display", ["flex"])
      .setStyle("flex-direction", ["column"])
      .setStyle("align-items", ["center"])
      .setStyle("padding", ["0.5rem 0.75rem"])
      .setStyle("border-radius", ["4px"])
      .setStyle("cursor", ["pointer"])
      .setStyle("transition", ["background 0.2s, border 0.2s"])
      .setStyle("border", ["1px solid var(--border)"])
      .setStyle("flex", ["1"]);

    if (active) {
      btn.setStyle("background", ["var(--brand-color-alpha)"]);

      btn.setStyle("border-color", ["var(--brand-color)"]);
    }

    btn.addClass("ToggleButton");

    const iconEl = UIComponents.icon(active ? icon : iconOff);

    iconEl.setStyle("font-size", ["1.1rem"]);

    iconEl.addClass("toggle-icon");

    btn.add(iconEl);

    const labelEl = UIComponents.text(label);

    labelEl.setStyle("font-size", ["0.65rem"]).setStyle("margin-top", ["0.25rem"]);

    btn.add(labelEl);

    if (key) {
      const keyEl = UIComponents.text(`[${key}]`);

      keyEl
        .setStyle("font-size", ["0.55rem"])
        .setStyle("color", ["var(--theme-text-light)"]);

      btn.add(keyEl);
    }

    btn._isActive = active;

    btn._icon = icon;

    btn._iconOff = iconOff;

    btn._iconEl = iconEl;

    btn.onClick(onClick);

    return btn;
  }

  updateVisibilityButton(visible) {
    if (!this.visibilityBtn) return;

    this.visibilityBtn._isActive = visible;

    if (visible) {
      this.visibilityBtn.setStyle("background", ["var(--brand-color-alpha)"]);

      this.visibilityBtn.setStyle("border-color", ["var(--brand-color)"]);

      this.visibilityBtn._iconEl.dom.textContent = "visibility";
    } else {
      this.visibilityBtn.setStyle("background", ["transparent"]);

      this.visibilityBtn.setStyle("border-color", ["var(--border)"]);

      this.visibilityBtn._iconEl.dom.textContent = "visibility_off";
    }
  }

  updateClippingButton(clipping) {
    if (!this.clippingBtn) return;

    this.clippingBtn._isActive = clipping;

    if (clipping) {
      this.clippingBtn.setStyle("background", ["var(--brand-color-alpha)"]);

      this.clippingBtn.setStyle("border-color", ["var(--brand-color)"]);
    } else {
      this.clippingBtn.setStyle("background", ["transparent"]);

      this.clippingBtn.setStyle("border-color", ["var(--border)"]);
    }
  }

  createActionButton(action) {
    const btn = UIComponents.div();

    btn
      .setStyle("display", ["flex"])
      .setStyle("flex-direction", ["column"])
      .setStyle("align-items", ["center"])
      .setStyle("padding", ["0.5rem"])
      .setStyle("border-radius", ["4px"])
      .setStyle("cursor", ["pointer"])
      .setStyle("transition", ["background 0.2s"]);

    btn.addClass("ActionButton");

    const icon = UIComponents.icon(action.icon);

    icon.setStyle("font-size", ["1.2rem"]);

    btn.add(icon);

    const label = UIComponents.text(action.label);

    label.setStyle("font-size", ["0.65rem"]).setStyle("margin-top", ["0.25rem"]);

    btn.add(label);

    if (action.key) {
      const key = UIComponents.text(`[${action.key}]`);

      key
        .setStyle("font-size", ["0.55rem"])
        .setStyle("color", ["var(--theme-text-light)"]);

      btn.add(key);
    }

    btn.onClick(() => {
      this.operators.execute(`world.sectionbox.${action.id}`, this.context);
    });

    return btn;
  }

  createGizmoModeButton(mode) {
    const btn = UIComponents.div();

    btn
      .setStyle("display", ["flex"])
      .setStyle("flex-direction", ["column"])
      .setStyle("align-items", ["center"])
      .setStyle("padding", ["0.5rem 0.75rem"])
      .setStyle("border-radius", ["4px"])
      .setStyle("cursor", ["pointer"])
      .setStyle("transition", ["background 0.2s, border 0.2s"])
      .setStyle("border", ["1px solid var(--border)"])
      .setStyle("flex", ["1"]);

    btn.addClass("GizmoModeButton");

    const iconEl = UIComponents.icon(mode.icon);

    iconEl.setStyle("font-size", ["1.1rem"]);

    btn.add(iconEl);

    const labelEl = UIComponents.text(mode.label);

    labelEl.setStyle("font-size", ["0.65rem"]).setStyle("margin-top", ["0.25rem"]);

    btn.add(labelEl);

    if (mode.key) {
      const keyEl = UIComponents.text(`[${mode.key}]`);

      keyEl
        .setStyle("font-size", ["0.55rem"])
        .setStyle("color", ["var(--theme-text-light)"]);

      btn.add(keyEl);
    }

    btn.onClick(() => {
      this.operators.execute("world.sectionbox.set_gizmo_mode", this.context, mode.id);

      this.updateGizmoModeButtons(mode.id);
    });

    return btn;
  }

  updateGizmoModeButtons(activeMode) {
    Object.entries(this.gizmoModeButtons || {}).forEach(([mode, btn]) => {
      if (mode === activeMode) {
        btn.setStyle("background", ["var(--brand-color-alpha)"]);

        btn.setStyle("border-color", ["var(--brand-color)"]);
      } else {
        btn.setStyle("background", ["transparent"]);

        btn.setStyle("border-color", ["var(--border)"]);
      }
    });
  }

  createAxisControl(axisInfo) {
    const row = UIComponents.row();

    row
      .setStyle("align-items", ["center"])
      .setStyle("gap", ["0.5rem"])
      .setStyle("margin-bottom", ["0.5rem"]);
    const label = UIComponents.text(axisInfo.axis);

    label
      .setStyle("width", ["20px"])
      .setStyle("font-weight", ["bold"])
      .setStyle("color", [axisInfo.color]);

    row.add(label);
    const minInput = document.createElement("input");

    minInput.type = "number";

    minInput.step = "0.5";

    minInput.style.cssText = "width: 60px; padding: 4px; border: 1px solid var(--border); border-radius: 4px; background: var(--theme-background-1618); color: inherit; font-size: 0.75rem;";

    minInput.placeholder = "Min";

    const minWrapper = new UIDiv();

    minWrapper.dom.appendChild(minInput);

    row.add(minWrapper);
    const toLabel = UIComponents.text("→");

    toLabel.setStyle("color", ["var(--theme-text-light)"]);

    row.add(toLabel);
    const maxInput = document.createElement("input");

    maxInput.type = "number";

    maxInput.step = "0.5";

    maxInput.style.cssText = "width: 60px; padding: 4px; border: 1px solid var(--border); border-radius: 4px; background: var(--theme-background-1618); color: inherit; font-size: 0.75rem;";

    maxInput.placeholder = "Max";

    const maxWrapper = new UIDiv();

    maxWrapper.dom.appendChild(maxInput);

    row.add(maxWrapper);
    this.sizeInputs[axisInfo.axis.toLowerCase()] = { min: minInput, max: maxInput };
    const updateBox = () => {
      const axis = axisInfo.axis.toLowerCase();

      const minVal = parseFloat(minInput.value);

      const maxVal = parseFloat(maxInput.value);

      if (!isNaN(minVal) && !isNaN(maxVal) && minVal < maxVal) {
        const newMin = SectionBoxState.box.min.clone();

        const newMax = SectionBoxState.box.max.clone();

        newMin[axis] = minVal;

        newMax[axis] = maxVal;

        this.operators.execute("world.sectionbox.set_box", this.context, newMin, newMax);
      }
    };

    minInput.addEventListener("change", updateBox);

    maxInput.addEventListener("change", updateBox);

    return row;
  }

  updateActiveState(isActive) {
    if (isActive) {
      this.toggleBtn.addClass("Active");
    } else {
      this.toggleBtn.dom.classList.remove("Active");
    }
  }

  updateBoxDataDisplay(boxData) {
    if (!this.boxDataDisplay) return;

    const { min, max, center, size, isBoxVisible, isClippingEnabled } = boxData;

    const html = `
      <div style="margin-bottom: 4px;"><strong>Center:</strong> (${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)})</div>
      <div style="margin-bottom: 4px;"><strong>Size:</strong> ${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)}</div>
      <div style="margin-bottom: 4px;"><strong>Min:</strong> (${min.x.toFixed(2)}, ${min.y.toFixed(2)}, ${min.z.toFixed(2)})</div>
      <div style="margin-bottom: 4px;"><strong>Max:</strong> (${max.x.toFixed(2)}, ${max.y.toFixed(2)}, ${max.z.toFixed(2)})</div>
      <div style="display: flex; gap: 1rem; margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--border);">
        <span style="color: ${isBoxVisible ? 'var(--green)' : 'var(--red)'};">● Box ${isBoxVisible ? 'Visible' : 'Hidden'}</span>
        <span style="color: ${isClippingEnabled ? 'var(--green)' : 'var(--red)'};">● Clip ${isClippingEnabled ? 'On' : 'Off'}</span>
      </div>
    `;

    this.boxDataDisplay.dom.innerHTML = html;
    if (this.sizeInputs) {
      ['x', 'y', 'z'].forEach(axis => {
        if (this.sizeInputs[axis]) {
          this.sizeInputs[axis].min.value = min[axis].toFixed(2);

          this.sizeInputs[axis].max.value = max[axis].toFixed(2);
        }
      });
    }
    if (typeof isBoxVisible === 'boolean') {
      this.updateVisibilityButton(isBoxVisible);
    }

    if (typeof isClippingEnabled === 'boolean') {
      this.updateClippingButton(isClippingEnabled);
    }
  }
}

export { SectionBoxUI };
