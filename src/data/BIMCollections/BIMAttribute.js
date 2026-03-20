import { Collection } from "../DataCollections/Collection.js";

import { Attribute } from '../DataCollections/Attribute.js';

export class BIMAttributes extends Collection {
  constructor(GlobalId, attributes, entityClass = null) {
    super();

    this.type = 'BIMAttributes';

    this.entityGlobalId = GlobalId;

    this.entityClass = entityClass;

    this.create(attributes);
  }

  create(data) {
    
    if (!Array.isArray(data)) {

      return;
    }
    for (let i = 0; i < data.length; i++) {
      const attrData = data[i];
      const attribute = new BIMAttribute(attrData);

      this.addItem(attribute);
    }

  }

  getAttributeByName(name) {
    return this.attributes.find(attr => attr.name === name) || null;
  }

  getEditableAttributes() {
    
    return this.attributes.filter(attr => {
      if (attr.dataType === 'entity' || attr.dataType === 'list[entity]') {
        return false; 
      }

      return true;
    });
  }

  getModifiedAttributes() {
    return this.attributes.filter(attr => attr.isModified);
  }

  /**
   * Get modified attributes as a dictionary { name: value }
   * This is the format expected by the Python backend
   */
  getModifiedAttributesDict() {
    const modified = this.getModifiedAttributes();
    const dict = {};
    for (const attr of modified) {
      dict[attr.name] = attr.getValue();
    }
    return dict;
  }

  /**
   * Get a single attribute as a dictionary { name: value }
   * Used for saving individual attributes
   */
  getAttributeAsDict(attributeName) {
    const attr = this.getAttributeByName(attributeName);
    if (!attr) return null;
    return { [attr.name]: attr.getValue() };
  }

  /**
   * Commit all modified attributes after successful save
   * This resets the isModified flag and updates originalValue
   */
  commitModifiedAttributes() {
    const modified = this.getModifiedAttributes();
    for (const attr of modified) {
      attr.commitValue();
    }
  }
}

export class BIMAttribute extends Attribute {
  constructor(data = {}) {
    super(data);

    this.type = 'BIMAttribute';

    this.category = 'attributes';
    this.name = data.name || "";

    this.displayName = data.name || ""; 

    this.dataType = data.dataType || "string";

    this.ifcClass = data.ifcClass || "";

    this.ifcType = data.ifcType || "";

    this.isNull = data.isNull || false;

    this.isOptional = data.isOptional || false;

    this.description = data.description || "";

    this.pointers = data.pointers || [];

    this.specialType = data.special_type || null;
    this.isModified = false;

    this.isEditing = false;

    this.hasError = false;

    this.errorMessage = "";

    this.originalValue = null;
    this.minValue = data.value_min !== undefined ? data.value_min : null;

    this.maxValue = data.value_max !== undefined ? data.value_max : null;

    this.hasMinConstraint = data.value_min_constraint || false;

    this.hasMaxConstraint = data.value_max_constraint || false;
    this.enumItems = [];

    if (data.enum_items !== undefined) {
      if (typeof data.enum_items === 'string') {
        try {
          this.enumItems = JSON.parse(data.enum_items);
        } catch (e) {
          console.warn('Failed to parse enum_items:', data.enum_items);
        }
      } else if (Array.isArray(data.enum_items)) {
        this.enumItems = data.enum_items;
      }
    }
    this._initializeValue(data);
    this.originalValue = this._value;
  }

  _initializeValue(data) {
    
    const debugKeys = (obj) => obj && typeof obj === 'object' ? Object.keys(obj).filter(k => !k.startsWith('_')) : [];
    if (data.string_value !== undefined && this.dataType === 'string') {
      this._value = data.string_value;
    } else if (data.bool_value !== undefined && this.dataType === 'boolean') {
      this._value = data.bool_value;
    } else if (data.int_value !== undefined && this.dataType === 'integer') {
      this._value = data.int_value;
    } else if (data.float_value !== undefined && this.dataType === 'float') {
      this._value = data.float_value;
    } else if (data.enum_value !== undefined && this.dataType === 'enum') {
      this._value = data.enum_value;
    } else if (data.entity_value !== undefined && this.dataType === 'entity') {
      this._value = data.entity_value;

      this.entityInfo = data.entity_value;
    } else if (data.entity_list_value !== undefined && this.dataType === 'list[entity]') {
      this._value = data.entity_list_value;

      if (data.pointers && data.pointers.length > 0) {
        this.pointers = data.pointers;
      } else if (Array.isArray(data.entity_list_value) && data.entity_list_value.length > 0) {
        this.pointers = data.entity_list_value.map((item) => ({
          stepId: item.id,
          globalId: item.info?.GlobalId ?? null,
          type: item.type || 'IfcEntity',
          repr: item.type && item.id != null ? `${item.type} #${item.id}` : '',
          isNavigable: !!(item.info && item.info.GlobalId)
        }));
      }
    } else if (data.float_list_value !== undefined && this.dataType === 'list[float]') {
      this._value = data.float_list_value;
    } else if (data.int_list_value !== undefined && this.dataType === 'list[integer]') {
      this._value = data.int_list_value;
    } else if (data.subitems_values !== undefined && this.dataType === 'list[string]') {
      this._value = data.subitems_values.map(item => item.name);
    } else if (data.value !== undefined) {
      this._value = data.value;
      
      if ((!this.dataType || this.dataType === '') && Array.isArray(data.value) && data.value.length > 0) {
        const first = data.value[0];
        if (first && typeof first === 'object' && (first._type === 'entity' || (first.id != null && first.repr != null))) {
          this.dataType = 'list[entity]';
          if (!this.pointers.length) {
            this.pointers = data.value.map((item) => ({
              stepId: item.id,
              globalId: item.info?.GlobalId ?? null,
              type: item.type || item.repr?.split('=')?.[1]?.split('(')?.[0] || 'IfcEntity',
              repr: item.repr || '',
              isNavigable: !!(item.info && item.info.GlobalId)
            }));
          }
        }
      }
    } else {
      this._value = null;
    }
  }

  getValue() {
    return this._value;
  }

  setValue(newValue) {
    const oldValue = this._value;

    this._value = newValue;

    this.isModified = this._value !== this.originalValue;
    if (this.hasMinConstraint && newValue < this.minValue) {
      this.hasError = true;

      this.errorMessage = `Value must be >= ${this.minValue}`;
    } else if (this.hasMaxConstraint && newValue > this.maxValue) {
      this.hasError = true;

      this.errorMessage = `Value must be <= ${this.maxValue}`;
    } else {
      this.hasError = false;

      this.errorMessage = "";
    }
  }

  resetValue() {
    this._value = this.originalValue;

    this.isModified = false;

    this.hasError = false;

    this.errorMessage = "";
  }

  /**
   * Commit the current value as the new original value (after successful save)
   * This marks the attribute as no longer modified
   */
  commitValue() {
    this.originalValue = this._value;

    this.isModified = false;

    this.hasError = false;

    this.errorMessage = "";
  }

  isEditable() {
    
    if (this.dataType === 'entity' || this.dataType === 'list[entity]') {
      return false;
    }

    return true;
  }

  getDisplayValue() {
    if (this.isNull) {
      return this.isOptional ? '(optional)' : '(null)';
    }

    const value = this.getValue();

    switch (this.dataType) {
      case 'entity':
        if (this.pointers.length > 0) {
          const p = this.pointers[0];

          return `${p.type} #${p.stepId}`;
        }
        if (value && typeof value === 'object' && value.type !== undefined) {
          return `${value.type} #${value.id}`;
        }
        return String(value) || '(entity)';

      case 'list[entity]':
        if (this.pointers.length > 0) {
          return this.pointers.map(p => `${p.type} #${p.stepId}`).join(', ');
        }
        if (Array.isArray(value) && value.length > 0) {
          return value.map(item => {
            if (item && typeof item === 'object') {
              const type = item.type ?? item._type;
              const id = item.id;
              if (type != null && id != null) return `${type} #${id}`;
              if (item.repr != null) return String(item.repr);
            }
            return String(item);
          }).join(', ');
        }
        return `[${Array.isArray(value) ? value.length : 0} entities]`;

      case 'boolean':
        return value ? 'True' : 'False';

      case 'enum':
        return value || '(not set)';

      case 'float':
        return typeof value === 'number' ? value.toFixed(3) : String(value);

      case 'list[string]':

      case 'list[float]':

      case 'list[integer]':
        return Array.isArray(value) ? `[${value.length} items]` : String(value);

      default:
        if (value === null || value === undefined) return '';
        if (Array.isArray(value)) {
          return value.map(item => {
            if (item != null && typeof item === 'object') {
              const type = item.type ?? item._type;
              const id = item.id;
              if (type != null && id != null) return `${type} #${id}`;
              if (item.repr != null) return String(item.repr);
              return JSON.stringify(item);
            }
            return typeof item === 'object' ? JSON.stringify(item) : String(item);
          }).join(', ') || '[ ]';
        }
        if (typeof value === 'object') {
          if (value.type != null && value.id != null) return `${value.type} #${value.id}`;
          return JSON.stringify(value);
        }
        return String(value);
    }
  }

  /**
   * Check if this attribute has navigable pointers (entities with GlobalId)
   */
  hasNavigablePointers() {
    return this.pointers.some(p => p.isNavigable && p.globalId);
  }

  /**
   * Get the first navigable pointer's GlobalId
   */
  getFirstNavigableGlobalId() {
    const navigable = this.pointers.find(p => p.isNavigable && p.globalId);

    return navigable ? navigable.globalId : null;
  }

  isEntityPointer() {
    const value = this.getValue();

    if (typeof value !== 'string') return false;
    return /^#\d+=Ifc[A-Za-z]+\(/.test(value);
  }

  getEntityIdFromPointer() {
    if (!this.isEntityPointer()) return null;

    const value = this.getValue();

    const match = value.match(/^#(\d+)/);

    return match ? match[1] : null;
  }

  hasEnumOptions() {
    return this.dataType === 'enum' && this.enumItems && Array.isArray(this.enumItems) && this.enumItems.length > 0;
  }

  getEnumOptions() {
    return this.hasEnumOptions() ? {
      items: this.enumItems,
      current: this.getValue()
    } : { items: [], current: null };
  }

  toJSON() {
    return {
      name: this.name,
      dataType: this.dataType,
      value: this.getValue(),
      isModified: this.isModified
    };
  }
}