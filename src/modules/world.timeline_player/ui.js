import { Components as UIComponents } from "../../ui/Components/Components.js";

import { ANIMATION_COLOR_SCHEMES } from "./core.js";

// HUD + coordinator live in UI modules (not core).
import { ScheduleAnimationController, ScheduleAnimationHUD } from "../bim.sequence/ui.js";

/**
 * TimelinePlayerUI
 *
 * Owns the bottom "Animation Player" + "Animation Settings" tabs and mounts the HUD.
 * Also listens to `signals.scheduleAnimationWired` to populate the controller and show the player.
 */
class TimelinePlayerUI {
  constructor({ context, operators }) {
    this.context = context;
    this.operators = operators;

    // Tab identity for the bottom workspace (must remain stable).
    this.animationPlayerTabId = "sequence_animation_player";
    this.animationSettingsTabId = "sequence_animation_settings";

    this.animationPlayerTabHost = null;
    this.animationSettingsTabHost = null;

    this.animationController = new ScheduleAnimationController(context, operators);
    this.animationHUD = new ScheduleAnimationHUD(this.animationController);

    // Expose controller to timeline_player operators.
    this.context.timelinePlayerController = this.animationController;

    this.hudToggleBtn = null;
    this.colorSchemeSelect = null;
    this.colorModeSelect = null;
    this.colorPreview = null;

    // Create tabs immediately so the UI exists even before wiring.
    this._ensureAnimationBottomTabs();

    // Ensure the player tab is never blank (HUD defaults to hidden).
    this.animationHUD.show();
    this._syncAnimationToggleLabel();

    this._bindSignals();
  }

  _bindSignals() {
    const signals = this.context.signals;

    signals.scheduleAnimationWired?.add(({ workScheduleId, tasks, dateRange, animationData }) => {
      // Populate controller state from wired data.
      const totalOutputs = animationData?.totalOutputs || 0;
      const totalInputs = animationData?.totalInputs || 0;

      this.animationController.tasksCache = animationData?.tasks || tasks || [];

      if (totalOutputs === 0 && totalInputs === 0) {
        this.animationHUD.setNoElementsWarning(true);
      } else {
        this.animationHUD.setNoElementsWarning(false);
      }

      if (dateRange?.startDate && dateRange?.endDate) {
        this.animationController.setDateRange(
          new Date(dateRange.startDate),
          new Date(dateRange.endDate)
        );
      }

      this._openAnimationPlayerPanel();
      this.animationHUD.show();
      this._syncAnimationToggleLabel();
    });
  }

  _syncAnimationToggleLabel() {
    if (!this.hudToggleBtn) return;
    this.hudToggleBtn.dom.textContent =
      this.animationHUD && this.animationHUD.isVisible ? "Hide Player" : "Show Player";
  }

  _createColorSchemeSelector() {
    const container = UIComponents.column().gap("0.75rem");

    const schemeRow = UIComponents.row()
      .gap("0.75rem")
      .addClass("fill-width")
      .addClass("centered-vertical");

    const schemeLabel = UIComponents.text("Color Scheme:");
    schemeLabel.setStyle("fontSize", ["var(--font-size-sm)"]);

    this.colorSchemeSelect = UIComponents.select();
    this.colorSchemeSelect.setOptions({
      standard: "Standard",
      monochrome: "Monochrome",
      highContrast: "High Contrast",
    });
    this.colorSchemeSelect.setValue("standard");

    this.colorSchemeSelect.dom.addEventListener("change", (e) => {
      const scheme = e?.target?.value ?? this.colorSchemeSelect.getValue();
      const mode = this.colorModeSelect?.getValue?.() ?? "predefinedType";
      this._updateColorPreview(scheme, mode);

      if (this.operators?.execute) {
        this.operators.execute(
          "timeline_player.set_animation_color_scheme",
          this.context,
          scheme,
          mode
        );
      } else {
        this.animationController.setColorScheme(scheme);
      }
    });

    const modeRow = UIComponents.row()
      .gap("0.75rem")
      .addClass("fill-width")
      .addClass("centered-vertical");

    const modeLabel = UIComponents.text("Color By:");
    modeLabel.setStyle("fontSize", ["var(--font-size-sm)"]);

    this.colorModeSelect = UIComponents.select();
    this.colorModeSelect.setOptions({
      predefinedType: "Predefined Type",
      status: "Status",
      inputOutput: "Input/Output",
    });
    this.colorModeSelect.setValue("predefinedType");

    this.colorModeSelect.dom.addEventListener("change", (e) => {
      const mode = e?.target?.value ?? this.colorModeSelect.getValue();
      const scheme = this.colorSchemeSelect.getValue();
      this._updateColorPreview(scheme, mode);

      if (this.operators?.execute) {
        this.operators.execute(
          "timeline_player.set_animation_color_scheme",
          this.context,
          scheme,
          mode
        );
      } else {
        this.animationController.setColorMode(mode);
      }
    });

    const previewRow = UIComponents.row()
      .gap("0.5rem")
      .addClass("fill-width");

    this.colorPreview = UIComponents.div();
    this.colorPreview.setStyles({
      display: "flex",
      gap: "4px",
      flexWrap: "wrap",
    });

    // Initial preview.
    this._updateColorPreview("standard", "predefinedType");

    previewRow.add(this.colorPreview);
    schemeRow.add(schemeLabel, this.colorSchemeSelect);
    modeRow.add(modeLabel, this.colorModeSelect);
    container.add(schemeRow, modeRow, previewRow);

    return container;
  }

  _updateColorPreview(schemeName, mode) {
    this.colorPreview.clear();

    const scheme = ANIMATION_COLOR_SCHEMES[schemeName];
    if (!scheme) return;

    let colors;
    if (mode === "predefinedType") {
      colors = scheme.predefinedTypes;
    } else if (mode === "status") {
      colors = scheme.status;
    } else {
      colors = { Input: scheme.input, Output: scheme.output };
    }

    Object.entries(colors).forEach(([label, colorValue]) => {
      const box = UIComponents.div();
      box.setStyles({
        width: "18px",
        height: "18px",
        background: `#${colorValue.toString(16).padStart(6, "0")}`,
        borderRadius: "4px",
        border: "1px solid rgba(255,255,255,0.15)",
      });

      const tip = UIComponents.text(label);
      tip.setStyles({ fontSize: "10px", opacity: "0.75" });

      const wrap = UIComponents.column().gap("2px");
      wrap.add(box, tip);

      this.colorPreview.add(wrap);
    });
  }

  _createAnimationSettingsTabContent() {
    const content = UIComponents.column().gap("0.75rem");

    const toggleRow = UIComponents.row()
      .gap("0.75rem")
      .addClass("fill-width")
      .addClass("centered-vertical");

    const toggleLabel = UIComponents.text("4D Animation:");
    toggleLabel.setStyle("fontSize", ["var(--font-size-sm)"]);

    this.hudToggleBtn = UIComponents.button("Show Player");
    this.hudToggleBtn.addClass("Button-secondary");

    this.hudToggleBtn.onClick(() => {
      if (!this.animationHUD) return;
      if (this.animationHUD.isVisible) {
        this._closeAnimationPlayerPanel();
      } else {
        this._openAnimationPlayerPanel();
      }
    });

    toggleRow.add(toggleLabel, this.hudToggleBtn);
    content.add(toggleRow);
    content.add(this._createColorSchemeSelector());

    return content;
  }

  _ensureAnimationBottomTabs() {
    const lm = this.context?.layoutManager;
    const bottomWorkspace = this.context.ui?.workspaces?.bottom;
    if (!bottomWorkspace) return;

    const panels = bottomWorkspace.panels || [];

    if (!this.animationPlayerTabHost) {
      this.animationPlayerTabHost = UIComponents.column().gap("var(--phi-0-5)");
      this.animationPlayerTabHost.setStyles({
        width: "100%",
        height: "100%",
        overflow: "hidden",
      });
    }

    if (lm) {
      lm.ensureTab("bottom", this.animationPlayerTabId, "Animation Player", this.animationPlayerTabHost, {
        open: false,
        replace: false,
      });
    } else if (
      !Array.isArray(bottomWorkspace.tabs) ||
      !bottomWorkspace.tabs.some((tab) => tab.dom?.id === this.animationPlayerTabId)
    ) {
      bottomWorkspace.addTab(
        this.animationPlayerTabId,
        "Animation Player",
        this.animationPlayerTabHost
      );
    }

    const playerTargetDom =
      this.animationPlayerTabHost?.dom ||
      panels.find((p) => p.dom?.id === this.animationPlayerTabId)?.dom;

    if (playerTargetDom) {
      this.animationHUD.mountTo(playerTargetDom);
    }

    if (!this.animationSettingsTabHost) {
      this.animationSettingsTabHost = this._createAnimationSettingsTabContent();
    }

    if (lm) {
      lm.ensureTab(
        "bottom",
        this.animationSettingsTabId,
        "Animation Settings",
        this.animationSettingsTabHost,
        { open: false, replace: false }
      );
    } else if (
      !Array.isArray(bottomWorkspace.tabs) ||
      !bottomWorkspace.tabs.some((tab) => tab.dom?.id === this.animationSettingsTabId)
    ) {
      bottomWorkspace.addTab(
        this.animationSettingsTabId,
        "Animation Settings",
        this.animationSettingsTabHost
      );
    }

    this._reorderBottomTabsWithScheduleTasks();
    this._syncAnimationToggleLabel();
  }

  /** Best-effort tab order: schedule tasks (bim.sequence) then animation tabs. */
  _reorderBottomTabsWithScheduleTasks() {
    const workspace = this.context.ui?.workspaces?.bottom;
    if (!workspace || typeof workspace.reorderTabs !== "function") return;

    const taskPanelTabId = "sequence-schedule-tasks";
    const desired = [
      taskPanelTabId,
      this.animationPlayerTabId,
      this.animationSettingsTabId,
    ];

    const existing = Array.isArray(workspace.tabs)
      ? workspace.tabs.map((t) => t.dom?.id).filter(Boolean)
      : [];

    const ordered = [
      ...desired.filter((id) => existing.includes(id)),
      ...existing.filter((id) => !desired.includes(id)),
    ];

    try {
      workspace.reorderTabs(ordered);
    } catch (e) {
      console.warn("Failed to reorder bottom tabs:", e);
    }
  }

  _openAnimationPlayerPanel() {
    this._ensureAnimationBottomTabs();

    if (this.context.layoutManager) {
      this.context.layoutManager.openWorkspace("bottom");
    }

    if (this.context.ui?.workspaces?.bottom) {
      this.context.ui.workspaces.bottom.select(this.animationPlayerTabId);
    }

    this.animationHUD.show();
    this._syncAnimationToggleLabel();
  }

  _closeAnimationPlayerPanel() {
    this.animationHUD.hide();

    if (this.context.layoutManager) {
      this.context.layoutManager.closeWorkspace("bottom");
    }

    this._syncAnimationToggleLabel();
  }
}

export default [TimelinePlayerUI];

