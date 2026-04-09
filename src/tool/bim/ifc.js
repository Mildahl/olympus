import dataStore from "../../data/index.js";

import { BIMAttributes } from "../../data/BIMCollections/BIMAttribute.js";

import PythonSandbox from "../pyodide/Python.js";

import { Collection } from "../../data/index.js";

import context from '../../context/index.js';

class IfcTool {

  static schema = "IFC4";
  
  /**
   * Get the selected entity info from the Three.js object
   * Returns a simple object with GlobalId - actual entity resolution happens in the worker
   */
  static getSelectedEntity(context) {

    const activeModel = context.ifc?.activeModel;

    const threeObj = context.editor.selected;
    
    if (!threeObj) {
      return null;
    }
    
    const guid = threeObj.uuid;

    let cleanGuid = guid;
    
    if (cleanGuid.includes("/")) {
      cleanGuid = cleanGuid.split("/").pop();
    }

    return {
      GlobalId: cleanGuid,
      Name: threeObj.name || null,
      type: threeObj.ifcClassification || 'IfcElement',
      id: threeObj.entityId || null,
    };
  }

  static getSelectedEntities(context) {

    const threeObjs = context.editor.selector.selected_objects || [];

    if (threeObjs.length === 0 && context.editor.selected) {
      const singleEntity = IfcTool.getSelectedEntity(context);

      return singleEntity ? [singleEntity] : [];
    }

    const entities = [];

    for (const threeObj of threeObjs) {
      const guid = threeObj.uuid;

      let cleanGuid = guid;

      if (cleanGuid.includes("/")) {
        cleanGuid = cleanGuid.split("/").pop();
      }

      entities.push({
        GlobalId: cleanGuid,
        Name: threeObj.name || null,
        type: threeObj.ifcClassification || 'IfcElement',
        id: threeObj.entityId || null,
      });
    }

    return entities;
  }

  static async runTool(modelname, { toolName, functionName, args, entityArgs = [] }) {
    return PythonSandbox.run_api("ifcToolCall", {
      action: "toolCall",
      modelName: modelname,
      toolName,
      functionName,
      args: args || {},
      entityArgs,
    });
  }

  static async runMCPTool(modelName, mcpToolName, args) {
    return PythonSandbox.run_api("ifcToolCall", {
      action: "mcpCall",
      modelName,
      toolName: mcpToolName,
      args: args || {},
    });
  }

  static async runAPI(modelname, usecase, args, entityArgs = []) {
    return PythonSandbox.run_api("ifcToolCall", {
      action: "apiCall",
      modelName: modelname,
      usecase,
      args: args || {},
      entityArgs,
    });
  }

  static async get(modelName, type){
    return PythonSandbox.run_api("ifcToolCall", {
      action: "query",
      modelName,
      queryType: "byType",
      params: { type },
    });
  }

  static async getGLobalId(modelName, id) {
    return PythonSandbox.run_api("ifcToolCall", {
      action: "query",
      modelName,
      queryType: "getGlobalId",
      params: { id },
    });
  }

  static async isA(modelName, GlobalId, type){
    return PythonSandbox.run_api("ifcToolCall", {
      action: "query",
      modelName,
      queryType: "isA",
      params: { GlobalId, type },
    });
  }

  static async getClass(modelName, GlobalId){
    return PythonSandbox.run_api("ifcToolCall", {
      action: "query",
      modelName,
      queryType: "getClass",
      params: { GlobalId },
    });
  }

    static async getDescription(entityClass) {

      return JSON.parse( 
        
        await IfcTool.runTool(null, {
          toolName: "doc",
          functionName: "get_entity_description",
          args: {
            schema_version: IfcTool.schema,
            ifc_entity: entityClass,
          },
        })
    
      );

    }

    static getObject(globalID) {
      const scene = context.editor.scene;

      return scene.getObjectByProperty("GlobalId", globalID);
    }

    static getObjects(globalIDs) {
      const scene = context.editor.scene;

      const objects = [];

      for (const globalID of globalIDs) {
        const obj = scene.getObjectByProperty("GlobalId", globalID);
  
        if (obj) {
          objects.push(obj);
        }
      }

      return objects;
    }

    static async undo(modelName) {
    
    return await PythonSandbox.run_api('undo', {
      modelName,
    })
  }

  static async redo(modelName) {
    return await PythonSandbox.run_api('redo', {
      modelName,
    })
  }

  static async beginTransaction(modelName) {
    return await PythonSandbox.run_api('beginTransaction', {
      modelName,
    })
  }

  static async endTransaction(modelName) {
    return await PythonSandbox.run_api('endTransaction', {
      modelName,
    })
  }

  
}

export default IfcTool;
