import { Collection } from "../DataCollections/Collection.js";

import { Attribute } from '../DataCollections/Attribute.js';

export class BIMJsonProperties {
  constructor(jsonData, objectType = 'object') {
    this.properties = [];

    this.objectType = objectType;

    this.parseJson(jsonData);
  }

  parseJson(jsonData) {
    if (typeof jsonData === 'string') {
      try {
        jsonData = JSON.parse(jsonData);
      } catch (e) {
        return;
      }
    }

    if (!jsonData || typeof jsonData !== 'object') return;

    this.flattenObject(jsonData, '');
  }

  flattenObject(obj, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        this.flattenObject(value, fullKey);
      } else {
        const displayName = fullKey.replace(/\./g, ' → ');

        const attr = new Attribute({
          name: fullKey,
          displayName: displayName,
          dataType: this.inferDataType(value),
          isOptional: true
        });

        attr.setValue(value);

        this.properties.push(attr);
      }
    }
  }

  inferDataType(value) {
    if (value === null || value === undefined) return 'string';

    if (typeof value === 'boolean') return 'boolean';

    if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'float';

    if (Array.isArray(value)) return 'list[string]';

    return 'string';
  }

  getProperties() {
    return this.properties;
  }

  getProperty(name) {
    return this.properties.find(prop => prop.name === name);
  }

  get size() {
    return this.properties.length;
  }

  *[Symbol.iterator]() {
    for (const prop of this.properties) {
      yield prop;
    }
  }
}