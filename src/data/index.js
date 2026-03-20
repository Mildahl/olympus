import { ObjectRegistry } from "./Store/ObjectRegistry.js";

import { CollectionRegistry } from "./Store/CollectionRegistry.js";

import { Attribute } from "./DataCollections/Attribute.js";

import { Collection, _generateGuid } from "./DataCollections/Collection.js";

import { CodeCollection } from "./DataCollections/CodeCollection.js";

import { TerminalCollection } from "./DataCollections/TerminalCollection.js";

import { NodeCollection, NodesCollection } from "./DataCollections/NodesCollection.js";

import { BIMAttribute, BIMAttributes } from "./BIMCollections/BIMAttribute.js";

import { BIMJsonProperties } from "./BIMCollections/BIMJsonProperties.js";

import { BIMProperty, BIMProperties, BIMQuantities } from "./BIMCollections/BIMProperty.js";

import {MeasurementCollection} from "./DataCollections/Measurements.js";

import { NotificationAttribute, NotificationCollection } from "./DataCollections/Notification.js";

function DataStore() {
    this.collections = new CollectionRegistry();

    this.state = {
        pendingChanges: new Map(),
        lastSaved: null
        };

    this.objects = new ObjectRegistry();

}

DataStore.prototype = {

    registerCollection(guid, collection) {
        return this.collections.register(guid, collection);
    },

    unregisterCollection(guid) {
        return this.collections.unregister(guid);
    },

    getObjectCollections(globalId) {
        return this.collections.getAll(globalId);
    },

    getCollections(type) {
        return this.collections.getAllByType(type);
    },

    getCollectionByGuid(guid) {
        return this.collections.getByGuid(guid);
    },

    getCollection(type, guid) {
        return this.collections.get(type, guid);
    },

    hasCollection(type, guid) {
        return this.collections.get(type, guid) !== null;
    },
}

const dataStore = new DataStore();

class IfcRoot {
    constructor(GlobalId, key, opts) {
        const { string, Name, type, id } = opts || {};
        this.GlobalId = GlobalId;

        this.key = key || "ifc_root";
        
        this.string = string;

        this.ifcProxy = string;

        this.Name = Name;

        this.type = type;

        this.id = id;
    }
}

class IfcModel {
    constructor(name, key) {
        this.name = name;

        this.key = key || "model";
    }
}

export default dataStore;

export {
    
    Attribute,
    Collection,
    _generateGuid,
    IfcRoot,
    IfcModel,
    NotificationAttribute,
    NotificationCollection,
    MeasurementCollection,
    CodeCollection,
    TerminalCollection,
    NodeCollection,
    NodesCollection,
    BIMAttribute,
    BIMAttributes,
    BIMJsonProperties,
    BIMProperty,
    BIMProperties,
    BIMQuantities,
    
};
