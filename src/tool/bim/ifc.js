import dataStore from "../../data/index.js";

import { BIMAttributes } from "../../data/BIMCollections/BIMAttribute.js";

import PythonSandbox from "../pyodide/Python.js";

import { Collection } from "../../data/index.js";

import { IfcRoot, IfcModel } from "../../data/index.js";

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

    static async runTool(modelname, { toolName, functionName, args }) {
       let argsProcessorLines = [];

      let argsAssignments = [];

      for (const [key, value] of Object.entries(args)) {
        if (value instanceof IfcRoot) {
          
          const globalId = value.GlobalId;

          argsProcessorLines.push(`${key}_entity = model.by_guid("${globalId}")`);

          argsAssignments.push(`"${key}": ${key}_entity`);
        } else if (value instanceof IfcModel) {
          argsProcessorLines.push(`model_instance = model`)

          argsAssignments.push(`"model": model_instance`)

        } else {
          
          const serializedValue = JSON.stringify(value);

          argsAssignments.push(`"${key}": ${serializedValue}`);
        }
      }

      const argsProcessorCode =
        argsProcessorLines.length > 0
          ? argsProcessorLines.join("\n        ")
          : "";

      const argsDict =
        argsAssignments.length > 0 ? `{${argsAssignments.join(", ")}}` : "{}";

      const code = `
  from viewer import ifc
  import ifcopenshell.api

  model = ifc.context.get('${modelname}')

  ${argsProcessorCode}

  args = ${argsDict}

  result = ifc.${toolName}.${functionName}(**args)

  result
  `;


      return await PythonSandbox.execute(code);
    }

    static async runAPI( modelname, usecase, args ) {
        let argsProcessorLines = [];

        let argsAssignments = [];

        for (const [key, value] of Object.entries(args)) {

            if (value instanceof IfcRoot) {
                
                const globalId = value.GlobalId;

                argsProcessorLines.push(`${key}_entity = model.by_guid("${globalId}")`);

                argsAssignments.push(`"${key}": ${key}_entity`);

            } else {
                
                const serializedValue = JSON.stringify(value);

                argsAssignments.push(`"${key}": ${serializedValue}`);
            }
        }

        const argsProcessorCode = argsProcessorLines.length > 0 
            ? argsProcessorLines.join('\n        ') 
            : '';

        const argsDict = argsAssignments.length > 0 
            ? `{${argsAssignments.join(', ')}}` 
            : '{}';

        const code = `
from viewer import ifc
import ifcopenshell.api

model = ifc.context.get('${modelname}')

${argsProcessorCode}

args = ${argsDict}

result = ifcopenshell.api.run("${usecase}", model, **args)

str(result) if result is not None else "Success"
`;

      return await PythonSandbox.execute(code);
    }

    static async get(modelName, type){
      
        const code = `
from viewer import ifc

model = ifc.context.get('${modelName}')

elements = model.by_type('${type}')

[{"GlobalId": e.GlobalId if hasattr(e, 'GlobalId') else str(e.id()), "Name": getattr(e, 'Name', None), "type": e.is_a()} for e in elements]
`;

      return await PythonSandbox.execute(code);

    }

    static async getGLobalId(modelName, id) {

      const code = `
from viewer import ifc
global_id = None
model = ifc.context.get('${modelName}')
if model:
    element = model.by_id(int(${id}))
    global_id = element.GlobalId
global_id
`;

      return await PythonSandbox.execute(code);

    }

    static async isA(modelName, GlobalId, type){
      const code = `
from viewer import ifc
model = ifc.context.get('${modelName}')

element = model.by_guid('${GlobalId}')
element.is_a('${type}')
`;

      return await PythonSandbox.execute(code);

    }

    static async getClass(modelName, GlobalId){
      const code = `
from viewer import ifc
model = ifc.context.get('${modelName}')

element = model.by_guid('${GlobalId}')
element.is_a()
`;

      return await PythonSandbox.execute(code);

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

    static getObject(context, globalID) {
      const scene = context.editor.scene;

      return scene.getObjectByProperty("GlobalId", globalID);
    }

    static getObjects(context, globalIDs) {
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
}

export default IfcTool;
