export class Attribute {
  constructor(data = {}) {
    this.id = data.id || null;

    this.type = data.type || 'AECO_Attribute';

    this.displayName = data.displayName || this.name;

    this.name = data.name || '';

    this.value = data.value || null;

    this.dataType = data.dataType || 'string';

    this.unit = data.unit || null;

    this.isOptional = data.isOptional || false;

    this.pointers = data.pointers || null;

    this.isNull = data.isNull || false;

    this.description = data.description || '';

    this.minValue = data.minValue || null;

    this.maxValue = data.maxValue || null;

    this.isEditing = data.isEditing || false;

    this.hasError = data.hasError || false;

    this.isModified = data.isModified || false;
  }

  setType(type) {
    this.type = type;

    return this;
  }

  getValue() {
    return this.value;
  }

  setValue(newValue) {
    this.value = newValue;
    return this;
  }

  setName(name) {
    this.name = name;

    return this;
  }

}