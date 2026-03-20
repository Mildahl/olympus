import { Attribute } from "./Attribute.js";

export function _generateGuid() {
return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;

    const v = c === 'x' ? r : (r & 0x3 | 0x8);

    return v.toString(16);
});
}

export class Collection {
  constructor( {
    name = "",
    type = "World_Template_Collection",
    GlobalId = null,
    entityId = null,
    classificationCode = 'AECO',
  } = {}) {
    this.isActive = false;

    this.name = name;

    this.type = type;

    this.GlobalId = GlobalId || _generateGuid();

    this.guid = this.GlobalId; 
    
    this.entityId = entityId;

    this.classificationCode = classificationCode;

    this.children = []; 

    this.attributes = []; 

    this.attributeTemplate = () => {return new Attribute()};

    this.nativeReference = null; 

    this.externalReference = null; 
    
    this.USDReference = null; 

    this.WorldReference = null; 
  }

  setType(type) {

    this.type = type

    return this
  }
  addItem(item) {
    this.attributes.push(item);

    return item;
  }

  addItems(items) {
    items.forEach(item => this.addItem(item));
  }

  removeItem(name) {
    const index = this.attributes.findIndex(item => item.name === name);

    if (index !== -1) {
      this.attributes.splice(index, 1);

      return true;
    }

    return false;
  }

  getItem(name) {
    return this.attributes.find(item => item.name === name) || null;
  }

  hasItem(name) {
    return this.attributes.some(item => item.name === name);
  }

  getItemNames() {
    return this.attributes.map(item => item.name);
  }

  getItemsByType(dataType) {
    return this.attributes.filter(item => item.dataType === dataType);
  }

  getItemsByCategory(category) {
    return this.attributes.filter(item => item.category === category);
  }

  getEditableItems() {
    return this.attributes.filter(item => item.isEditable());
  }

  getRequiredItems() {
    return this.attributes.filter(item => !item.isOptional);
  }

  getItemsWithErrors() {
    return this.attributes.filter(item => item.hasError);
  }

  validateAll() {
    let allValid = true;

    this.attributes.forEach(item => {
      if (!item.validate()) {
        allValid = false;
      }
    });

    return allValid;
  }

  clearAllErrors() {
    this.attributes.forEach(item => item.clearError());
  }

  getValues() {
    const values = {};

    this.attributes.forEach(item => {
      values[item.name] = item.getValue();
    });

    return values;
  }

  setValues(values) {
    Object.entries(values).forEach(([name, value]) => {
      const item = this.getItem(name);

      if (item) {
        item.setValue(value);
      }
    });
  }

  getDisplayValues() {
    const values = {};

    this.attributes.forEach(item => {
      values[item.name] = item.getComputedValue();
    });

    return values;
  }

  sortByName(ascending = true) {
    this.attributes.sort((a, b) => {
      const comparison = a.name.localeCompare(b.name);

      return ascending ? comparison : -comparison;
    });
  }

  sortByDisplayName(ascending = true) {
    this.attributes.sort((a, b) => {
      const comparison = a.displayName.localeCompare(b.displayName);

      return ascending ? comparison : -comparison;
    });
  }

  groupByCategory() {
    const groups = {};

    this.attributes.forEach(item => {
      const key = item.psetName || item.category || 'other';

      if (!groups[key]) groups[key] = [];

      groups[key].push(item);
    });

    return groups;
  }

  clone() {
    const collection = new Collection();

    const clonedItems = this.attributes.map(item => item.clone());

    collection.addItems(clonedItems);

    collection.entityId = this.entityId;

    collection.classificationCode = this.classificationCode;

    collection.applicable_templates = this.applicable_templates;

    return collection;
  }

  clear() {
    this.attributes = [];

    this.entityId = null;

    this.classificationCode = null;
  }

  get size() {
    return this.attributes.length;
  }

  get isEmpty() {
    return this.attributes.length === 0;
  }

  *[Symbol.iterator]() {
    for (const item of this.attributes) {
      yield item;
    }
  }

  static new(entityInfo, dataType = 'attributes', id = null) {
    const collection = new Collection();

    collection.entityId = id;

    collection.ifcClass = entityInfo.type || entityInfo.ifcClass;

    collection.type = dataType || 'default';
    
    if (entityInfo.applicable_templates) {
      collection.applicable_templates = typeof entityInfo.applicable_templates === 'string'
        ? JSON.parse(entityInfo.applicable_templates)
        : entityInfo.applicable_templates;
    }

    return collection;
  }

  refresh(newEntityInfo) {
    if (!newEntityInfo) return;

    this.clear();

    const newCollection = Collection.new(newEntityInfo, this.type, this.id);

    this.attributes = newCollection.items;

    this.entityId = newCollection.entityId;

    this.ifcClass = newCollection.ifcClass;

    this.applicable_templates = newCollection.applicable_templates;
  }
}