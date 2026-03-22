import { getPyodide, ifc } from './worker_state.js';
import { getIfc, getModule } from './worker_files_modules.js';
export function getAttributes( modelName = "default", GlobalId ) {
    
  let model = getIfc(modelName);

  if (!model) {
    throw new Error(`Model "${modelName}" not found in IFC context. Use the model file name (e.g. Works_Plan.ifc), not the project display name.`);
  }

  let entity = model.by_guid(GlobalId);

  if (!entity) {

    const availableModels = ifc['context'].list_models();
    
    availableModels.remove(modelName);

    availableModels.forEach( (m) => {
      
      model = getIfc(m);

      entity = model.by_guid(GlobalId);

    });
  }

  if (!entity) {

    console.warn(`Entity with GlobalId ${GlobalId} not found in model ${modelName}`);

    return { entityClass: null, attributes: null };
  }

  entity = model.by_guid(GlobalId);

  AttributesData.load(entity);
  
  const cleanData = JSON.parse(JSON.stringify(AttributesData.data));

  const entityClass = entity.is_a();
  
  return {
    entityClass: entityClass,
    attributes: cleanData
  };
}

export function refreshAttributes( modelName = "default", elementId ) {}

export function redo(modelName) {
  
  const model = getIfc(modelName);

  model.redo();

  return { redone: true };
}

export function undo(modelName) {
  
  const model = getIfc(modelName);

  model.undo();

  return { undone: true };
}

export function beginTransaction(modelName) {
  const model = getIfc(modelName);

  model.begin_transaction();

  return { transactionStarted: true };
}

export function endTransaction(modelName) {
  const model = getIfc(modelName);

  model.end_transaction();

  return { transactionEnded: true };
}

export function editAttributes(modelName, GlobalId, attributes) {

  const model = getIfc(modelName);

  const context = ifc["context"]; 

  const entity =  model.by_guid(GlobalId);

  if (!entity) {
    throw new Error(`Entity with GlobalId ${GlobalId} not found in model ${modelName}`);
  }

  console.log("Editing attributes:", { modelName, GlobalId, attributes });
 
  model.begin_transaction()
  
  const success = ifc['attribute'].run_edit_attributes(model, GlobalId, attributes);

  model.end_transaction()

  console.log("Edit attributes success:", success);

  return { success: success };
}

/**
 * Get property sets and quantity sets for an element using pset_helper.
 * @param {string} modelName - Loaded model name
 * @param {string} GlobalId - Entity GlobalId
 * @returns {{ GlobalId: string, type: string, psets: object, qtos: object } | null }
 */
export function getProperties(modelName, GlobalId) {
  const model = getIfc(modelName);
  if (!model) {
    throw new Error(`Model ${modelName} not found`);
  }
  const entity = model.by_guid(GlobalId);
  if (!entity) {
    console.warn(`Entity with GlobalId ${GlobalId} not found in model ${modelName}`);
    return null;
  }
  if (!ifc["pset_helper"]) {
    throw new Error("pset_helper not initialized. Load the pset module first.");
  }
  const elementId = entity.id();
  const result = ifc["pset_helper"].get_properties(model, elementId);
  if (!result) return null;
  const psets = typeof result.psets === "string" ? JSON.parse(result.psets) : result.psets || {};
  const qtos = typeof result.qtos === "string" ? JSON.parse(result.qtos) : result.qtos || {};
  return {
    GlobalId: result.GlobalId,
    type: result.type,
    id: result.id,
    psets,
    qtos,
  };
}

/**
 * Edit a property set for an element.
 * @param {string} modelName - Loaded model name
 * @param {string} psetGlobalId - Property set GlobalId
 * @param {object} properties - { propName: value } (values must match IFC types: number for double, etc.)
 */
export function editPropertySet(modelName, psetGlobalId, properties) {
  const model = getIfc(modelName);
  if (!model) throw new Error(`Model ${modelName} not found`);

  const pset = model.by_guid(psetGlobalId);

  if (!pset) throw new Error(`Entity with GlobalId ${psetGlobalId} not found in model ${modelName}`);

  const success = ifc["pset"].edit_property_set(model, pset, properties);
  return { success };
}

/**
 * Edit a quantity set for an element.
 * @param {string} modelName - Loaded model name
 * @param {string[]} elementGlobalIds - Array of element GlobalIds
 * @returns {{ success: boolean }}
 */
export function batchCalculateQuantities(modelName, elementGlobalIds) {
  const model = getIfc(modelName);
  if (!model) throw new Error(`Model ${modelName} not found`);

  const success = ifc["pset"].calculate_and_apply_quantities(model, elementGlobalIds);
  return { success };
}

/**
 * Calculate quantities for an element.
 * @param {string} modelName - Loaded model name
 * @param {string} elementGlobalId - Element GlobalId
 * @returns {{ success: boolean }}
 */
export function  calculateQuantities(modelName, elementGlobalId) {
  const model = getIfc(modelName);
  if (!model) throw new Error(`Model ${modelName} not found`);
  const element = model.by_guid(elementGlobalId);
  if (!element) throw new Error(`Entity with GlobalId ${elementGlobalId} not found in model ${modelName}`);
  const success = ifc["pset"].calculate_and_apply_quantities(model, element.id());
  return { success };
}
/**
 * Export model to string or binary content for saving.
 * @param {string} modelName - Loaded model name (e.g. "model.ifc")
 * @param {string} format - "ifc" | "ifcxml" | "ifczip"
 * @returns {{ content: string, filename: string, mimeType: string, isBase64?: boolean }}
 */
export function saveModel(modelName, format) {
  const pyodide = getPyodide();
  const model = getIfc(modelName);
  if (!model) {
    throw new Error(`Model ${modelName} not found`);
  }
  const normalizedFormat = String(format).toLowerCase();
  const ext = normalizedFormat === "ifcxml" ? ".ifcxml" : normalizedFormat === "ifczip" ? ".ifczip" : ".ifc";
  const tmpPath = "/tmp/export" + ext;
  model.write(tmpPath);
  let content;
  if (normalizedFormat === "ifczip") {
    const data = pyodide.FS.readFile(tmpPath);
    content = btoa(String.fromCharCode.apply(null, data));
  } else {
    content = pyodide.FS.readFile(tmpPath, { encoding: "utf8" });
  }
  pyodide.FS.unlink(tmpPath);
  const baseName = modelName.replace(/\.ifc$/i, "") || "model";
  const filename = baseName + ext;
  const mimeType = normalizedFormat === "ifczip" ? "application/zip" : normalizedFormat === "ifcxml" ? "application/xml" : "text/plain";
  return {
    content,
    filename,
    mimeType,
    isBase64: normalizedFormat === "ifczip",
  };
}

export function getDirectorOverview(modelName) {
  const model = getIfc(modelName);
  if (!model) {
    throw new Error(`Model ${modelName} not found`);
  }
  const analyticsModule = getModule("analytics");
  const raw = analyticsModule.get_director_overview_json(model);
  const text = typeof raw === "string" ? raw : String(raw);
  return JSON.parse(text);
}

export function getDirectorFilteredSlice(modelName, filterSpec) {
  const model = getIfc(modelName);
  if (!model) {
    throw new Error(`Model ${modelName} not found`);
  }
  const analyticsModule = getModule("analytics");
  const spec = filterSpec && typeof filterSpec === "object" ? filterSpec : {};
  const raw = analyticsModule.get_filtered_slice_json(model, spec);
  const text = typeof raw === "string" ? raw : String(raw);
  return JSON.parse(text);
}
