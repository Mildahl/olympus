import dataStore from "../../data/index.js";

import { BIMAttributes } from "../../data/BIMCollections/BIMAttribute.js";

import tools from "../index.js";

class AttributeTool {

    static projectName = "default";
    static async loadAttributes( modelName, GlobalId ) {
        const response = await AttributeTool.getAttributes( modelName, GlobalId );
        const attributes = response.attributes || response;

        const entityClass = response.entityClass || null;

        if (!attributes || !Array.isArray(attributes)) {
            console.error("[AttributeTool] Invalid attributes data received");

            return;
        }

        console.log("[BIM Attributes] loadAttributes response:", {
            modelName,
            GlobalId,
            entityClass,
            attributeCount: attributes.length,
            rawFirst: attributes[0],
            rawRepContext: attributes.find(a => a.name === "RepresentationContexts"),
            allNames: attributes.map(a => a.name),
        });

        return { attributes, ifcClass: entityClass}

    }

    static async getAttributes( modelName, GlobalId ) {
        
        if (!modelName || !GlobalId) {
            throw new Error("Both modelName and GlobalId are required to load attributes.");
        }

        return await tools.code.pyWorker.run_api('getAttributes', {
            modelName: modelName,
            GlobalId: GlobalId
        });

    }

    static storeAttributes( GlobalId, attributes, entityClass = null ) {

        const BIMAttrCollection = new BIMAttributes(GlobalId, attributes, entityClass);

        dataStore.registerCollection(GlobalId, BIMAttrCollection);

    }
}

export default AttributeTool;
