
self.onerror = (e) => {
  try {
    self.postMessage({ type: 'workerError', message: e.message || String(e), filename: e.filename, lineno: e.lineno, stack: e.error?.stack });
  } catch (_) {}
};
self.onunhandledrejection = (e) => {
  try {
    const r = e.reason;
    self.postMessage({ type: 'workerError', message: r?.message ?? String(r), stack: r?.stack });
  } catch (_) {}
};
import { installedPackages, setLocalToolsPath, getLocalToolsPath, getPyodide } from './worker_state.js';
import { startPyodide, runCode, serializeForPostMessage, getVariable } from './worker_core.js';
import { loadPackageManager, loadPackage, installPackage, uninstallPackage, installIfcOpenShell } from './worker_packages.js';
import { fetchFile, loadLocalModule, importModule, getIfc } from './worker_files_modules.js';
import { getAttributes, undo, redo, editAttributes, getProperties, saveModel, getDirectorOverview, getDirectorFilteredSlice } from './worker_ifc.js';
import { 
  newIFCModel, loadModelFromPath, loadModelFromBlob, 
  generateMeshLayerStructure, generateMeshForElement,
  vertical_layer, horizontal_layer, profiled_construction, createSpace, createTypeOccurence
} from './worker_ifc_geometry.js';
import { AttributesData } from './worker_ifc_data.js';
import { registerViewerAPI } from './worker_viewer_api.js';
self.AttributesData = AttributesData;
const handlerConfig = {
  startPyodide: [startPyodide, ['version', 'mode', 'baseUrl']],
  runCode: [runCode, ['code']],
  install: [installPackage, ['packageName', 'wheelPath']],
  installIfcOpenShell: [installIfcOpenShell, ['wheelPath']],
  import: [importModule, ['moduleName']],
  isReady: [() => getPyodide() !== null, []],
  isPackageInstalled: [(packageName) => installedPackages.has(packageName), ['packageName']],
  getInstalledPackages: [() => Array.from(installedPackages), []],
  loadPackage: [loadPackage, ['packageName']],
  loadPackageManager: [loadPackageManager, []],
  setLocalPath: [(path) => { 
    setLocalToolsPath(path);
    return { path: getLocalToolsPath() }; 
  }, ['path']],
  fetchFile: [fetchFile, ['moduleName', 'modulePath']],
  loadLocalModule: [loadLocalModule, ['moduleName', 'path']],
  uninstall: [uninstallPackage, ['packageName']],
  registerViewerAPI: [registerViewerAPI, ['registry']],
  loadModelFromPath: [loadModelFromPath, ['path']],
  loadModelFromBlob: [loadModelFromBlob, ['fileName', 'blobContent']],
  undo: [undo, ['modelName']],
  redo: [redo, ['modelName']],
  newIFCModel: [newIFCModel, ['modelName']],
  generateMeshLayerStructure: [generateMeshLayerStructure, ['modelName']],
  generateMeshForElement: [generateMeshForElement, ['modelName', 'GlobalId']],
  vertical_layer: [vertical_layer, ['modelName', 'params']],
  horizontal_layer: [horizontal_layer, ['modelName', 'params']],
  profiled_construction: [profiled_construction, ['modelName', 'params']],
  createSpace: [createSpace, ['modelName', 'params']],
  createTypeOccurence: [createTypeOccurence, ['modelName', 'params']],
  getModel: [getIfc, ['modelName']],
  saveModel: [saveModel, ['modelName', 'format']],
  getAttributes: [getAttributes, ['modelName', 'GlobalId']],
  editAttributes: [editAttributes, ['modelName', 'GlobalId', 'attributes']],
  getProperties: [getProperties, ['modelName', 'GlobalId']],
  getDirectorOverview: [getDirectorOverview, ['modelName']],
  getDirectorFilteredSlice: [getDirectorFilteredSlice, ['modelName', 'filterSpec']],
  getVariable: [getVariable, ['variableName']],
  executeViewerMethod: [() => undefined, []],  
};
self.onmessage = async (event) => {
  const { id, type, payload } = event.data;

  try {
    const config = handlerConfig[type];

    if (!config) {
      throw new Error(`Unknown message type: ${type}`);
    }

    const [func, keys] = config;

    const args = keys.map(key => payload[key]);

    const result = await func(...args);

    const meshGenerationTypes = [
      "generateMeshLayerStructure",
      "generateMeshForElement", 
      "execute"
    ];

    const serializedResult = serializeForPostMessage(result);
    
    self.postMessage({ id, success: true, result: serializedResult });

  } catch (error) {

    self.postMessage({
      id,
      success: false,
      error: {
        message: error.message,
        stack: error.stack,
        type: error.name || "Error",
      },
    });

  }

};
