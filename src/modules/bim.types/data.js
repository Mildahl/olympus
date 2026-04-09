import AECO_TOOLS from "../../tool/index.js";

import context from "../../context/index.js";

export function refreshData() {
  TypeData.is_loaded = false;
}

export function refreshSelectionData() {
  TypeData.is_selection_loaded = false;
}

export function refreshActiveTypeData(){
  TypeData.is_active_type_loaded = false;
}

export class TypeData { 

  static data = {
    has_element_types: false,
    element_types: [],
    isProduct: false,
    selection_data: {},
    active_type_data : {},
  };

  static is_loaded = false;

  static is_selection_loaded = false;

  static is_active_type_loaded  = false;
  static async load() {

    TypeData.data.has_element_types = await AECO_TOOLS.bim.types.hasElementTypes(context.ifc.activeModel);
    
    TypeData.data.element_types = await TypeData.getTypes(context.ifc.activeModel);
    
    TypeData.is_loaded = true;
  }

  static async loadSelection() {

    const globalId = AECO_TOOLS.world.scene.getEntityGlobalId(context.editor.selected);

    TypeData.data.is_product = await AECO_TOOLS.bim.types.isProduct();
    
    TypeData.data.selection_data =  await AECO_TOOLS.bim.types.getElementTypeData(globalId),

    TypeData.is_selection_loaded = true;
  
}

  static async loadActivetype() {
    
    TypeData.data.active_type_data = {
      is_layered_element : await AECO_TOOLS.bim.types.isLayeredElement()
    }
  }

  static async getTypes(model) {

    const unorganisedTypes =  await AECO_TOOLS.bim.types.getElementTypes(model);

    const categorisedTyped  = {};

    for (const type of unorganisedTypes) {
      if (!categorisedTyped[type.type]) {
        categorisedTyped[type.type] = [];
      }

      categorisedTyped[type.type].push(type);
    }

    return categorisedTyped;

  }
  static async totalInstances() {
    return await AECO_TOOLS.bim.ifc.totalInstances();
  }

  static async relatingType() {
    return await AECO_TOOLS.bim.types.relatingType();
  }
}
