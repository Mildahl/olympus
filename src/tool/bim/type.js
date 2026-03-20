import dataStore from "../../data/index.js";

import tools from "../index.js";

import { Collection } from "../../data/index.js";

import { IfcRoot, IfcModel } from "../../data/index.js";

import context from '../../context/index.js'

class BIMTypeProperties extends Collection {
  constructor(GlobalId, name) {
    super({
      GlobalId: GlobalId,
      type: "BIMTypeProperties",
      classificationCode: "IFC",
    });

    this.name = name;
  }

  static predefinedTypes = [];
}

class TypeTool {

  static async getElementTypes(modelName) {
      
      const code = `
from viewer import ifc
import ifcopenshell.util.element
model = ifc.context.get('${modelName}')

list_types = []

types = model.by_type('IfcElementType')

for t in types:    
    data= t.get_info()
    data['instances'] = len(ifcopenshell.util.element.get_types(t))
    list_types.append(data)

list_types
`;

    const result = await tools.code.pyWorker.execute(code);

    return result || {};
  }

  static async hasElementTypes(modelName) {
    return await tools.ifc.get(modelName, "IfcElementType").then((types) => {
      return types && types.length > 0;
    });
  }

  static async isProduct() {

    if (!context.editor.selected) return false;

    let GlobalId = context.editor.selected.uuid;
    
    GlobalId = GlobalId.includes("/") ? GlobalId.split("/").pop() : GlobalId;

    const activeModel = context.ifc.activeModel;

    const check =  await tools.ifc.isA(activeModel, GlobalId, "IfcProduct");

    return check;
  }

  static async getElementTypeData(globalId) {

    if(!globalId) return {}

      const modelName = context.ifc.activeModel;
      
      const code = `
from viewer import ifc
import ifcopenshell.util.element
model = ifc.context.get('${modelName}')

element = model.by_guid('${globalId}')
element_type = ifcopenshell.util.element.get_type(element)
types = ifcopenshell.util.element.get_types(element_type)
data= element_type.get_info()
data['instances'] = len(types)
data
`;

    const result = await tools.code.pyWorker.execute(code);

    return result || {};
  }

  static async getTypeData(globalId) {

    if(!globalId) return {}

      const modelName = context.ifc.activeModel;
      
      const code = `
from viewer import ifc
import ifcopenshell.util.element
model = ifc.context.get('${modelName}')

element_type = model.by_guid('${globalId}')
instances = ifcopenshell.util.element.get_types(element_type)
data= element_type.get_info()
data['similar'] = [instance.GlobalId for instance in instances]
data
`;

    const result = await tools.code.pyWorker.execute(code);

    return result || {};
  }

  static async isLayeredElement() {

    if (!context.ifc.activeModel ) return

    const modelName = context.ifc.activeModel;

    const activeType = context.ifc.activeType

    const layered_classes = [
        "IfcWallType",
        "IfcSlabType",
        "IfcCoveringType",
    ]

    const typeClass = await tools.ifc.getClass(modelName, activeType)

    return layered_classes.includes(typeClass);
  }

  static async isProfiledElement() {

    if (!context.ifc.activeModel ) return

    const modelName = context.ifc.activeModel;

    const activeType = context.ifc.activeType

    const profiled_classes = [
        "IfcBeamType",
        "IfcColumnType",
    ]

    const typeClass = await tools.ifc.getClass(modelName, activeType)

    return profiled_classes.includes(typeClass);
  }
}

export default TypeTool;
