import { getPyodide, getMicropip, ifc } from './worker_state.js';
import { loadPackageManager } from './worker_packages.js';

async function fileExists(filename) {
  const pyodide = getPyodide();
  const existsCode = `
import os
os.path.exists(${JSON.stringify(filename)})
  `;

  const exists = await pyodide.runPythonAsync(existsCode);

  return exists;
}

export async function fetchFile(moduleName, modulePath) {
  const pyodide = getPyodide();
  
  if (!pyodide) {
    throw new Error("Pyodide not initialized");
  }

  const filename = moduleName.endsWith(".py") ? moduleName : `${moduleName}.py`;

  if (await fileExists(filename)) {

    return { fetched: moduleName, path: modulePath, cached: true };
  }

  const fetchCode = `
from pyodide.http import pyfetch

async def fetch_module(module_name, path=None):
    response = await pyfetch(path)
    if response.status == 200:
        filename = module_name if module_name.endswith('.py') else f"{module_name}.py"
        with open(filename, "wb") as f:
            f.write(await response.bytes())
        return True
    return False
await fetch_module(${JSON.stringify(moduleName)}, ${JSON.stringify(modulePath)})
  `;

  await pyodide.runPythonAsync(fetchCode);

  return { fetched: moduleName, path: modulePath };
}

export async function loadFromWheel(ModulePath) {
  let micropip = getMicropip();
  
  if (!micropip) {
    await loadPackageManager();
    micropip = getMicropip();
  }

  await micropip.install(ModulePath);
}

export async function loadLocalModule(moduleName, path) {
  const pyodide = getPyodide();
  
  if (!pyodide) {
    throw new Error("Pyodide not initialized");
  }

  if (!path) {
    throw new Error("Local tools path not set. Call setLocalPath first.");
  }

  const ModulePath = path + moduleName + ".py";

  const startTime = performance.now();

  await fetchFile(moduleName, ModulePath);

  if (moduleName === "context") {

    const mod = pyodide.pyimport("context");

    ifc["context"] = mod.Context();

  } else if (moduleName === "attribute") {

    const mod = pyodide.pyimport("attribute");

    ifc[moduleName] = mod.AttributeHelper("IFC4");

  } else if (moduleName === "pset") {

    const mod = pyodide.pyimport("pset");

    ifc["pset"] = mod;

    ifc["pset_helper"] = mod.PsetHelper("IFC4");

  } else {

    ifc[moduleName] = pyodide.pyimport(moduleName);

  }

  return {
    name: moduleName,
    loaded: true,
    time: performance.now() - startTime
  };
}

export async function importModule(moduleName) {
  const pyodide = getPyodide();
  
  if (!pyodide) {
    throw new Error("Pyodide not initialized");
  }

  pyodide.pyimport(moduleName);

  return {
    name: moduleName,
    loaded: true,
  };
}

export function getModule(moduleName) {
  const pyodide = getPyodide();

  if (!pyodide) {
    throw new Error("Pyodide not initialized");
  }

  return pyodide.pyimport(moduleName);
}

export function getIfc(modelName) {

  modelName = modelName.endsWith(".ifc") ? modelName : `${modelName}.ifc`;

  if (!ifc["context"]) {
    throw new Error("IFC context not initialized");
  }

  return ifc["context"].get(modelName);

}
