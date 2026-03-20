import tools from '../index.js';

import { IfcRoot, IfcModel } from '../../data/index.js';

import PythonSandbox from '../pyodide/Python.js';

class BIMModelingTool {
  /**
   * Generate mesh data for an IFC element
   * @param {string} modelName - The model name
   * @param {string} GlobalId - Element GlobalId
   * @returns {Promise<Object>} Mesh data { geometries, matrix, GlobalId, entityType }
   */
  static async generateMeshForElement(modelName, GlobalId) {
    return await PythonSandbox.run_api("generateMeshForElement", {
      modelName,
      GlobalId
    });
  }
  /**
   * Delete an IFC element
   * @param {string} modelName - The model name
   * @param {string} GlobalId - Element GlobalId
   */
  static async deleteElement(context, modelName, GlobalId) {

    const objectsToRemove = [];

    context.editor.scene.traverse(function (child) {
      if (child.uuid === GlobalId) {
        objectsToRemove.push(child);
      }
    });

    for (const obj of objectsToRemove) {
        context.editor.removeObject(obj);
    }

    return  await tools.ifc.runAPI(modelName, 'root.remove_product', {
        product: new IfcRoot(GlobalId)
    });
  }
  /**
   * Get the container (storey) for an element
   * @param {string} modelName - The model name
   * @param {string} GlobalId - Element GlobalId
   * @returns {Promise<Object|null>} Container info { GlobalId, Name }
   */
  static async getContainer(modelName, GlobalId) {
    const code = `
from viewer import ifc
from ifcopenshell.util.element import get_container

model = ifc.context.get('${modelName}')
element = model.by_guid("${GlobalId}")

container = get_container(element) if element else None
result = {"GlobalId": container.GlobalId, "Name": container.Name} if container else None

`;

   return await PythonSandbox.run_api("runCode", { code });
  }

  static async getThickness(modelName, GlobalId) {
    
  }
}

export default BIMModelingTool;
