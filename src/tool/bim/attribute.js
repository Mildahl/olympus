import dataStore from "../../data/index.js";

import { BIMAttributes } from "../../data/BIMCollections/BIMAttribute.js";

import tools from "../index.js";

class AttributeTool {

    static async getAttributes( modelName, GlobalId ) {
        
        if (!modelName || !GlobalId) {
            throw new Error("Both modelName and GlobalId are required to load attributes.");
        }

        return await tools.code.pyWorker.run_api('getAttributes', {
            modelName: modelName,
            GlobalId: GlobalId
        });

    }

    static async loadAttributes( modelName, GlobalId ) {
        
        const response = await AttributeTool.getAttributes( modelName, GlobalId );

        const attributes = response.attributes || response;

        const entityClass = response.entityClass || null;

        if (!attributes || !Array.isArray(attributes)) {
            console.error("[AttributeTool] Invalid attributes data received");

            return;
        }
        
        return { attributes, ifcClass: entityClass}

    }


    static storeAttributes( GlobalId, attributes, entityClass = null ) {

        const BIMAttrCollection = new BIMAttributes(GlobalId, attributes, entityClass);

        dataStore.registerCollection(GlobalId, BIMAttrCollection);

    }

    static getStoredAttributes(GlobalId) {

        return dataStore.getCollection("BIMAttributes", GlobalId);

    }
}

export default AttributeTool;
