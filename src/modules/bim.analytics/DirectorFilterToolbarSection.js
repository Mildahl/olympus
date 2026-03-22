import { Components as UIComponents } from "../../ui/Components/Components.js";

class DirectorFilterToolbarSection {
  constructor({ filterState, onFiltersCommit }) {
    this.filterState = filterState;

    this.onFiltersCommit = onFiltersCommit;

    this._suppressDomEvents = false;

    this._debounceTimer = null;

    this.root = UIComponents.column().gap("var(--phi-0-75)").addClass("director-analytics-filter-toolbar");

    this.title = UIComponents.text("Model filter");

    this.title.addClass("director-analytics-section-title");

    this.grid = UIComponents.div().addClass("director-analytics-filter-grid");

    this.classSelect = UIComponents.select();

    this.spatialSelect = UIComponents.select();

    this.psetSelect = UIComponents.select();

    this.materialSelect = UIComponents.select();

    this._wireSelect(this.classSelect);

    this._wireSelect(this.spatialSelect);

    this._wireSelect(this.psetSelect);

    this._wireSelect(this.materialSelect);

    this.actionsRow = UIComponents.row().gap("var(--phi-0-5)").addClass("director-analytics-filter-actions");

    this.applyButton = UIComponents.button("Apply filter");

    this.applyButton.onClick(() => {
      this._commitFromControls();
    });

    this.actionsRow.add(this.applyButton);
  }

  getDom() {
    return this.root;
  }

  _wireSelect(selectElement) {
    const self = this;

    selectElement.dom.addEventListener("change", () => {
      if (self._suppressDomEvents) {
        return;
      }

      self._scheduleDebouncedCommit();
    });
  }

  _scheduleDebouncedCommit() {
    const self = this;

    if (this._debounceTimer !== null) {
      window.clearTimeout(this._debounceTimer);
    }

    this._debounceTimer = window.setTimeout(() => {
      self._debounceTimer = null;

      self._commitFromControls();
    }, 320);
  }

  _commitFromControls() {
    const selection = this.readSelectionFromControls();

    this.filterState.applyToolbarSelection(selection);

    if (this.onFiltersCommit) {
      this.onFiltersCommit();
    }
  }

  readSelectionFromControls() {
    const classValue = this.classSelect.getValue();

    const spatialValue = this.spatialSelect.getValue();

    const psetValue = this.psetSelect.getValue();

    const materialValue = this.materialSelect.getValue();

    return {
      ifcClass: classValue && classValue.length > 0 ? classValue : null,
      spatialContainerGlobalId: spatialValue && spatialValue.length > 0 ? spatialValue : null,
      propertySetName: psetValue && psetValue.length > 0 ? psetValue : null,
      materialName: materialValue && materialValue.length > 0 ? materialValue : null,
    };
  }

  syncFromFilterState() {
    const snapshot = this.filterState.snapshot();

    this._suppressDomEvents = true;

    this.classSelect.setValue(snapshot.ifcClass ? String(snapshot.ifcClass) : "");

    this.spatialSelect.setValue(
      snapshot.spatialContainerGlobalId ? String(snapshot.spatialContainerGlobalId) : "",
    );

    this.psetSelect.setValue(snapshot.propertySetName ? String(snapshot.propertySetName) : "");

    this.materialSelect.setValue(snapshot.materialName ? String(snapshot.materialName) : "");

    this._suppressDomEvents = false;
  }

  render(overview) {
    this.root.clear();

    this.root.add(this.title);

    this.grid.clear();

    const classOptions = this._buildClassOptions(overview);

    const spatialOptions = this._buildSpatialOptions(overview);

    const psetOptions = this._buildPsetOptions(overview);

    const materialOptions = this._buildMaterialOptions(overview);

    this.classSelect.setOptions(classOptions);

    this.spatialSelect.setOptions(spatialOptions);

    this.psetSelect.setOptions(psetOptions);

    this.materialSelect.setOptions(materialOptions);

    this._addFilterRow("IFC class", this.classSelect);

    this._addFilterRow("Spatial container", this.spatialSelect);

    this._addFilterRow("Property set", this.psetSelect);

    this._addFilterRow("Material", this.materialSelect);

    this.root.add(this.grid);

    this.actionsRow.clear();

    this.actionsRow.add(this.applyButton);

    this.root.add(this.actionsRow);

    this.syncFromFilterState();
  }

  _addFilterRow(labelText, selectControl) {
    const row = UIComponents.column().gap("2px").addClass("director-analytics-filter-field");

    const label = UIComponents.text(labelText);

    label.addClass("director-analytics-filter-label");

    row.add(label);

    row.add(selectControl);

    this.grid.add(row);
  }

  _buildClassOptions(overview) {
    const options = { "": "Any class" };

    const histogram = overview.classHistogram || [];

    for (let index = 0; index < histogram.length; index++) {
      const row = histogram[index];

      const name = row.name;

      options[name] = String(name) + " (" + String(row.count) + ")";
    }

    return options;
  }

  _buildSpatialOptions(overview) {
    const options = { "": "Any spatial container" };

    const list = overview.spatialContainers || [];

    for (let index = 0; index < list.length; index++) {
      const row = list[index];

      const gid = row.globalId;

      const label =
        String(row.name) +
        " · " +
        String(row.type).replace("Ifc", "") +
        " · " +
        String(row.elementCount);

      options[gid] = label;
    }

    return options;
  }

  _buildPsetOptions(overview) {
    const options = { "": "Any property set" };

    const topNames = (overview.propertySets && overview.propertySets.topNames) || [];

    for (let index = 0; index < topNames.length; index++) {
      const row = topNames[index];

      const name = row.name;

      options[name] = String(name) + " (" + String(row.count) + ")";
    }

    return options;
  }

  _buildMaterialOptions(overview) {
    const options = { "": "Any material" };

    const top = (overview.materials && overview.materials.topMaterialNames) || [];

    for (let index = 0; index < top.length; index++) {
      const row = top[index];

      const name = row.name;

      options[name] = String(name) + " (" + String(row.count) + ")";
    }

    return options;
  }

  destroy() {
    if (this._debounceTimer !== null) {
      window.clearTimeout(this._debounceTimer);

      this._debounceTimer = null;
    }
  }
}

export { DirectorFilterToolbarSection };
