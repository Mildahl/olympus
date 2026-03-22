class DirectorAnalyticsFilterState {
  constructor() {
    this.modelName = null;

    this.ifcClass = null;

    this.propertySetName = null;

    this.materialName = null;

    this.spatialContainerGlobalId = null;

    this.selectedGlobalIds = [];

    this.lastSlice = null;

    this.listeners = [];
  }

  addChangeListener(callback) {
    if (typeof callback !== "function") {
      return;
    }

    this.listeners.push(callback);
  }

  removeChangeListener(callback) {
    this.listeners = this.listeners.filter((item) => item !== callback);
  }

  _notify() {
    for (let index = 0; index < this.listeners.length; index++) {
      this.listeners[index](this.snapshot());
    }
  }

  snapshot() {
    return {
      modelName: this.modelName,
      ifcClass: this.ifcClass,
      propertySetName: this.propertySetName,
      materialName: this.materialName,
      spatialContainerGlobalId: this.spatialContainerGlobalId,
      selectedGlobalIds: this.selectedGlobalIds.slice(),
      lastSlice: this.lastSlice,
    };
  }

  setModelName(modelName) {
    this.modelName = modelName;

    this.clearFilters(false);

    this._notify();
  }

  clearFilters(shouldNotify = true) {
    this.ifcClass = null;

    this.propertySetName = null;

    this.materialName = null;

    this.spatialContainerGlobalId = null;

    this.selectedGlobalIds = [];

    this.lastSlice = null;

    if (shouldNotify) {
      this._notify();
    }
  }

  setIfcClass(className) {
    this.ifcClass = className || null;

    this._notify();
  }

  setIfcClassFromChart(className) {
    this.propertySetName = null;

    this.materialName = null;

    this.spatialContainerGlobalId = null;

    this.ifcClass = className || null;

    this._notify();
  }

  setPropertySetName(name) {
    this.propertySetName = name || null;

    this._notify();
  }

  setMaterialName(name) {
    this.materialName = name || null;

    this._notify();
  }

  setSpatialContainerGlobalId(globalId) {
    this.spatialContainerGlobalId = globalId || null;

    this._notify();
  }

  applyToolbarSelection(selection) {
    if (!selection || typeof selection !== "object") {
      return;
    }

    this.ifcClass = selection.ifcClass || null;

    this.spatialContainerGlobalId = selection.spatialContainerGlobalId || null;

    this.propertySetName = selection.propertySetName || null;

    this.materialName = selection.materialName || null;

    this._notify();
  }

  setSliceResult(slicePayload) {
    this.lastSlice = slicePayload;

    if (slicePayload && Array.isArray(slicePayload.globalIds)) {
      this.selectedGlobalIds = slicePayload.globalIds.slice();
    } else {
      this.selectedGlobalIds = [];
    }

    this._notify();
  }

  buildFilterSpec() {
    const spec = {};

    if (this.ifcClass) {
      spec.ifcClass = this.ifcClass;
    }

    if (this.propertySetName) {
      spec.propertySetName = this.propertySetName;
    }

    if (this.materialName) {
      spec.materialName = this.materialName;
    }

    if (this.spatialContainerGlobalId) {
      spec.spatialContainerGlobalId = this.spatialContainerGlobalId;
    }

    spec.maxGlobalIds = 500;

    return spec;
  }
}

export { DirectorAnalyticsFilterState };
