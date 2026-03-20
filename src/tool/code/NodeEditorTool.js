import dataStore, { CodeCollection, NodesCollection, NodeCollection, TerminalCollection } from "../../data/index.js";
class NodeEditorTool {

  static editors = new Map(); 

  static getDomEditor(globalId) {
    return NodeEditorTool.editors.get(globalId);
  }

  static hasEditor(globalId) {
    return NodeEditorTool.editors.has(globalId);
  }

  static getNodeEditor(globalId) {
    return NodeEditorTool.editors.get(globalId);
  }

  static storeNodeEditor(globalId, editor) {
    NodeEditorTool.editors.set(globalId, editor);
  }

  static createNodeCollection(initialData = {}, name = null) {
    const collection = new NodesCollection(initialData);

    if (name) collection.name = name;

    const guid = this._generateGuid();

    dataStore.registerCollection(guid, collection);

    return collection;
  }

  static getNodeCollection(guid) {
    return dataStore.getCollectionByGuid(guid);
  }

  static updateNodeCollection(collection, newData) {
    collection.saveData(newData);

    collection.lastRun = new Date();

    collection.runCount += 1;
  }

  static deleteNodeCollection(collection) {
    const guid = this._findGuidByCollection(collection);

    if (guid) {
      dataStore.unregisterCollection(guid);

      return true;
    }

    return false;
  }

  static _findGuidByCollection(collection) {
    const allCollections = dataStore.collections.getAll();

    for (const [guid, coll] of allCollections) {
      if (coll === collection) {
        return guid;
      }
    }

    return null;
  }

  static _generateGuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;

      const v = c === 'x' ? r : (r & 0x3 | 0x8);

      return v.toString(16);
    });
  }
  static async createFlowTool(scene, renderer, composer) {
    console.warn('FlowTool is not available - flow module has been removed');
    return null;
  }
}

export default NodeEditorTool;