import { Components as UIComponents, BasePanel } from "../../ui/Components/Components.js";

import { SnapState } from "./operators.js";

import FocusManager from "../../utils/FocusManager.js";

class SnapUI extends BasePanel {
  constructor({ context, operators }) {
    super({
      context,
      operators,
      parentId: "ViewportSnapTools",
      panelStyles: {
        height: "fit-content",
        maxHeight: "calc(100vh - 2 * var(--phi-0-5))",
        minWidth: "250px",
      },
      position: "above-center",
      draggable: true,
      resizable: true,
      testing: false,
      resizeHandles: ["n", "e", "ne"],
    });

    this.snapCheckboxes = {};

    this.bodyCollapsed = false;

    const tooltip = UIComponents.tooltip('Snap Settings', { 
      position: 'right', 
    });

    const module = document.getElementById("ViewportSnapTools")
    tooltip.attachTo(module, { followMouse: true });
    
    this.draw();

    this.listen(context, operators);
  }

  listen(context, operators) {
    context.signals.toggleSnapMenu.add((show) => {
        show ? this.showPanel(context) : this.hidePanel();
    });

    context.signals.snapOptionChanged.add((change) => {
        if (change.key in this.snapCheckboxes) {
            this.snapCheckboxes[change.key].setValue(change.value);
        }
    });

    this.keydownHandler = (e) => {
      if (!FocusManager.isInputFocused() && 
          e.shiftKey && 
          e.key.toLowerCase() === "s" && 
          !e.ctrlKey && 
          !e.altKey) {
        e.preventDefault();
        operators.execute("world.snap.toggle_enabled", context);
      }
    };
  }

  onShow() {
    super.onShow && super.onShow();
    document.addEventListener("keydown", this.keydownHandler);
  }

  onHide() {
    super.onHide && super.onHide();
    document.removeEventListener("keydown", this.keydownHandler);
  }

  toggleBodyCollapse() {
    this.bodyCollapsed = !this.bodyCollapsed;

    this.content.dom.style.display = this.bodyCollapsed ? 'none' : '';

    this.footer.dom.style.display = this.bodyCollapsed ? 'none' : '';

    this.collapseIcon.dom.textContent = this.bodyCollapsed ? 'chevron_right' : 'expand_less';
  }

  draw() {
    this.clearPanel();

    this.collapseIcon = UIComponents.icon("expand_less");

    this.collapseIcon.addClass("CollapsibleSection-toggle");

    this.collapseIcon.setStyle("cursor", ["pointer"]);

    this.collapseIcon.onClick(() => this.toggleBodyCollapse());

    const headerRow = this.createHeader("Snap Settings", "target", [this.collapseIcon]);

    this.header.add(headerRow);
    const content = UIComponents.column().addClass("snap-settings-content");
    const snapEnabledRow = UIComponents.row().addClass('ListBoxItem').addClass('space-between');

    snapEnabledRow.add(UIComponents.icon("target"));

    snapEnabledRow.add(UIComponents.text("Snap Enabled"));

    const snapEnabledCheckbox = UIComponents.checkbox();

    snapEnabledCheckbox.setValue(SnapState.snapOptions.snapEnabled);

    snapEnabledCheckbox.dom.addEventListener("change", () => {
      const newValue = snapEnabledCheckbox.dom.checked;

      SnapState.snapOptions.snapEnabled = newValue;

      this.operators.execute("world.snap.set_option", this.context, 'snapEnabled', newValue);
    });

    snapEnabledRow.add(snapEnabledCheckbox);

    content.add(snapEnabledRow);

    this.snapCheckboxes.snapEnabled = snapEnabledCheckbox;
    const snapTypes = [
      { id: "snapToVertex", label: "Vertex", icon: "radio_button_unchecked" },
      { id: "snapToEdge", label: "Edge", icon: "horizontal_rule" },
      { id: "snapToFace", label: "Face", icon: "crop_square" },
      { id: "snapToGrid", label: "Grid", icon: "grid_on" },
    ];

    snapTypes.forEach((snap) => {
      const checkbox = UIComponents.checkbox();

      checkbox.setValue(SnapState.snapOptions[snap.id] ?? (snap.id === 'snapToGrid' ? false : true));

      checkbox.dom.addEventListener("change", () => {
        const newValue = checkbox.dom.checked;

        SnapState.snapOptions[snap.id] = newValue;

        this.operators.execute("world.snap.set_option", this.context, snap.id, newValue);
      });

      this.snapCheckboxes[snap.id] = checkbox;

      const row = UIComponents.row().addClass('ListBoxItem').addClass('space-between');

      row.add(UIComponents.icon(snap.icon));

      row.add(UIComponents.text(snap.label));

      row.add(checkbox);

      content.add(row);
    });

    this.content.add(content);
    const footerContent = UIComponents.column().gap("var(--phi-0-5)").padding("var(--phi-0-5)");

    const instructions = [
      { key: "ctrl+s", desc: "Toggle snap" },
    ];

    instructions.forEach((inst) => {
      const line = UIComponents.row();

      line.setStyle("alignItems", ["center"]);

      line.setStyle("display", ["flex"]);

      line.setStyle("gap", ["var(--phi-0-5)"]);

      line.add(UIComponents.span(inst.key).addClass("kbd"));

      line.add(UIComponents.text(inst.desc));

      footerContent.add(line);
    });

    this.footer.add(footerContent);
  }
}

export default [SnapUI];