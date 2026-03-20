export class CollectionRegistry {
  constructor() {
    this.registry = new Map();
  }

  get(type, globalId) {
    for (const [key, data] of this.registry.entries()) {
      const attributeKey = `${type}/${globalId}`;

      if (key == attributeKey) {

        return data.collection;
      }
    }
  }

  getByGuid(guid) {
    for (const [key, data] of this.registry.entries()) {
      if (data.collection.guid === guid) {
        return data.collection;
      }
    }

    return null;
  }

  getAll(globalId) {
    const collections = [];

    for (const [key, data] of this.registry.entries()) {
      if (key.endsWith(`${globalId}`)) {
        collections.push(data.collection);
      }
    }

    return collections;
  }

  getAllByType(type) {
    const collections = [];

    for (const [key, data] of this.registry.entries()) {
      if (data.type === type) {
        collections.push(data.collection);
      }
    }

    return collections;
  }

  register(globalId, collection) {

    const type = collection.type || 'Unknown';

    const timestamp = Date.now();

    const key = `${type}/${globalId}`;

    collection.guid =  this._generateGuid();

    this.registry.set(key, { collection, type, timestamp });

    return true;
  }

  unregister(globalId, type=null) {
    for (const key of this.registry.keys()) {
      if (key.endsWith(`${globalId}`) && (type === null || this.registry.get(key).type === type)) {
        this.registry.delete(key);
      }
    }
  }

  _generateGuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;

      const v = c === 'x' ? r : (r & 0x3 | 0x8);

      return v.toString(16);
    });

  }
}
