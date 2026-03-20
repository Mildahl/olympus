import { Collection } from "../DataCollections/Collection.js";

import { Attribute } from "../DataCollections/Attribute.js";

import { BIMJsonProperties } from "./BIMJsonProperties.js";

/**
 * Normalize IFC measure type to UI data type (string, integer, float, boolean, enum).
 */
function normalizeDataType(primaryMeasureType) {
  if (!primaryMeasureType || typeof primaryMeasureType !== "string") return "string";
  const t = primaryMeasureType.toLowerCase();
  if (t === "integer" || t === "int") return "integer";
  if (t === "float" || t === "double" || t === "real") return "float";
  if (t === "boolean" || t === "logical" || t === "bool") return "boolean";
  if (t === "enum") return "enum";
  return "string";
}

class BIMProperties extends Collection {
  constructor(pyData) {
    super();

    this.type = "BIMProperties";

    this.entityGlobalId = pyData.entityGlobalId;

    this.ifcClass = pyData.class || "";

    this.psetGlobalId = pyData.psetGlobalId ?? "";

    this.psetId = pyData.id ?? "";

    this.name = pyData.name || "";

    this.create(pyData.items ?? pyData);
  }

  create(pset) {
    if (!pset || typeof pset !== "object") return;

    if (this.name.startsWith("BBIM_")) {
      const dataProp = pset["Data"];
      if (dataProp && dataProp.value) {
        const jsonProps = new BIMJsonProperties(dataProp.value);
        for (const attr of jsonProps.properties) {
          const item = new BIMProperty({
            name: attr.name,
            displayName: attr.displayName,
            dataType: attr.dataType,
            value: attr.getValue(),
            psetName: this.name,
            is_custom: true,
            isOptional: true,
            psetId: this.psetId,
          });
          this.addItem(item);
        }
      }
      return;
    }

    for (const propName in pset) {
      if (propName === "id") continue;

      const propData = pset[propName];
      if (!propData || typeof propData !== "object") continue;

      const rawType = propData.primary_measure_type || "string";
      const dataType = normalizeDataType(rawType);

      let enumItems = null;
      if (propData.enum_items) {
        try {
          enumItems =
            typeof propData.enum_items === "string"
              ? JSON.parse(propData.enum_items)
              : propData.enum_items;
        } catch (e) {
          console.warn("Failed to parse enum_items for", propName, propData.enum_items);
        }
      }

      const item = new BIMProperty({
        name: propName,
        displayName: propName,
        id: propData.id,
        class: propData.class,
        dataType: dataType,
        primary_measure_type: rawType,
        enum_items: propData.enum_items,
        template_type: propData.template_type,
        unit: propData.unit,
        isOptional: true,
        psetName: this.name,
        description: propData.description || "",
        value: propData.value,
        is_set: propData.is_set,
        is_custom: propData.is_custom || false,
        psetId: this.psetId,
      });

      this.addItem(item);
    }
  }

  getPropertyByName(name) {
    return this.attributes.find((prop) => prop.name === name) || null;
  }

  getModifiedAttributes() {
    return this.attributes.filter((attr) => attr.isModified);
  }

  getModifiedAttributesDict() {
    const modified = this.getModifiedAttributes();
    const dict = {};
    for (const attr of modified) {
      dict[attr.name] = attr.getValue();
    }
    return dict;
  }

  commitModifiedAttributes() {
    const modified = this.getModifiedAttributes();
    for (const attr of modified) {
      attr.commitValue();
    }
  }
}

class BIMQuantities extends BIMProperties {
  constructor(pyData) {
    super(pyData);
    this.type = "BIMQuantities";
  }
}

class BIMProperty extends Attribute {
  constructor(data = {}) {
    super(data);

    this.type = "BIMProperty";
    this.ifcClass = data.class || "";
    this.template_type = data.template_type || "";
    this.category = data.category || "properties";
    this.isCustom = data.is_custom || false;
    this.psetName = data.psetName || "";
    this.psetId = data.psetId || "";
    this.primary_measure_type = data.primary_measure_type || data.dataType || "string";

    this.isModified = false;
    this.hasError = false;
    this.errorMessage = "";
    this.originalValue = null;
    this._value = null;

    this.enumItems = [];
    if (data.enum_items !== undefined) {
      if (typeof data.enum_items === "string") {
        try {
          this.enumItems = JSON.parse(data.enum_items);
        } catch (e) {
          this.enumItems = [];
        }
      } else if (Array.isArray(data.enum_items)) {
        this.enumItems = data.enum_items;
      }
    }

    this.dataType = normalizeDataType(data.primary_measure_type || data.dataType);
    if (this.enumItems && this.enumItems.length > 0) {
      this.dataType = "enum";
    }

    this._initializeValue(data);
    this.originalValue = this._value;
    this.isNull = data.is_set === false || (this._value === null && data.value === undefined);
  }

  _initializeValue(data) {
    const v = data.value;
    if (v === undefined || v === null) {
      this._value = null;
      return;
    }
    switch (this.dataType) {
      case "boolean":
        this._value = Boolean(v);
        break;
      case "integer":
        this._value = Number.isInteger(v) ? v : parseInt(v, 10);
        break;
      case "float":
        this._value = typeof v === "number" ? v : parseFloat(v);
        break;
      case "enum":
      case "string":
      default:
        this._value = typeof v === "string" ? v : String(v);
    }
  }

  getValue() {
    return this._value;
  }

  setValue(newValue) {
    if (this.dataType === "integer" && newValue !== null && newValue !== undefined) {
      newValue = parseInt(newValue, 10);
    } else if (this.dataType === "float" && newValue !== null && newValue !== undefined) {
      newValue = parseFloat(newValue);
    } else if (this.dataType === "boolean") {
      newValue = Boolean(newValue);
    }
    this._value = newValue;
    this.isModified = this._value !== this.originalValue;
    this.hasError = false;
    this.errorMessage = "";
  }

  resetValue() {
    this._value = this.originalValue;
    this.isModified = false;
    this.hasError = false;
    this.errorMessage = "";
  }

  commitValue() {
    this.originalValue = this._value;
    this.isModified = false;
    this.hasError = false;
    this.errorMessage = "";
  }

  isEditable() {
    return true;
  }

  hasEnumOptions() {
    return this.dataType === "enum" && Array.isArray(this.enumItems) && this.enumItems.length > 0;
  }

  getEnumOptions() {
    return this.hasEnumOptions()
      ? { items: this.enumItems, current: this.getValue() }
      : { items: [], current: null };
  }

  getDisplayValue() {
    if (this._value === null || this._value === undefined) return this.isOptional ? "(optional)" : "(null)";
    if (this.dataType === "float" && typeof this._value === "number") return this._value.toFixed(3);
    return String(this._value);
  }
}

/**
 * Container for all property sets and quantity sets of an entity.
 * Stored in dataStore as type "BIMPropertiesData" keyed by entity GlobalId.
 */
class BIMPropertiesData {
  constructor(entityGlobalId, entityClass, psets = [], qtos = []) {
    this.type = "BIMPropertiesData";
    this.entityGlobalId = entityGlobalId;
    this.entityClass = entityClass;
    this.psets = psets; 
    this.qtos = qtos;   
  }
}

export { BIMProperty, BIMProperties, BIMQuantities, BIMPropertiesData };
