import dataStore from "../../data/index.js";

import { BIMProperties, BIMQuantities, BIMPropertiesData } from "../../data/BIMCollections/BIMProperty.js";

import tools from "../index.js";

class PsetTool {
  /**
   * Load property sets and quantity sets for an entity.
   * @param {string} modelName - Loaded model name
   * @param {string} GlobalId - Entity GlobalId
   * @returns {{ psets: BIMProperties[], qtos: BIMQuantities[], entityClass: string } | null }
   */
  static async loadProperties(modelName, GlobalId) {
    if (!modelName || !GlobalId) {
      
      console.error("[PsetTool] modelName and GlobalId are required");

      return null;
    }
    const response = await tools.code.pyWorker.run_api("getProperties", {
      modelName,
      GlobalId,
    });

    if (!response || (!response.psets && !response.qtos)) {
      return null;
    }

    const entityClass = response.type || "";

    const psets = [];

    const qtos = [];

    if (response.psets && typeof response.psets === "object") {
      for (const psetName of Object.keys(response.psets)) {
        const psetData = response.psets[psetName];

        const pset = new BIMProperties({
          entityGlobalId: response.GlobalId,
          psetGlobalId: psetData?.GlobalId ?? "",
          class: entityClass,
          id: psetData?.id ?? "",
          name: psetName,
          items: psetData,
        });

        psets.push(pset);
      }
    }

    if (response.qtos && typeof response.qtos === "object") {
      for (const qtoName of Object.keys(response.qtos)) {
        const qtoData = response.qtos[qtoName];

        const qto = new BIMQuantities({
          entityGlobalId: response.GlobalId,
          psetGlobalId: qtoData?.GlobalId ?? "",
          qtoGlobalId: qtoData?.GlobalId ?? "",
          class: entityClass,
          id: qtoData?.id ?? "",
          name: qtoName,
          items: qtoData,
        });

        qtos.push(qto);
      }
    }

    return { psets, qtos, entityClass };
  }

  /**
   * Store properties/quantities data in dataStore.
   * @param {string} GlobalId - Entity GlobalId
   * @param {{ psets: BIMProperties[], qtos: BIMQuantities[], entityClass: string }} data
   */
  static storeProperties(GlobalId, data) {
    const container = new BIMPropertiesData(
      GlobalId,
      data.entityClass ?? "",
      data.psets ?? [],
      data.qtos ?? []
    );

    dataStore.registerCollection(GlobalId, container);
  }

  /**
   * Get stored properties data for an entity.
   * @param {string} GlobalId - Entity GlobalId
   * @returns {BIMPropertiesData | null}
   */
  static getStoredProperties(GlobalId) {
    return dataStore.getCollection("BIMPropertiesData", GlobalId);
  }
}

export default PsetTool;
