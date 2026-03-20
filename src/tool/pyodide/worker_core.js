import {
  getPyodide, setPyodide, getOutputBuffer, setOutputBuffer, appendOutputBuffer,
  ifc, scene, model, placement, notification, viewpoint, animation, measure, section, layer, utils
} from './worker_state.js';

const PRESERVED_GLOBALS = new Set([
  
  '__name__', '__doc__', '__package__', '__loader__', '__spec__',
  '__builtins__', '__file__', '__cached__', '__annotations__',
  'pyodide_py', '_pyodide_core', 'sys', 'os', 'asyncio',
  'viewer',
  'ifcopenshell', 'numpy', 'pandas', 'json', 're', 'math',
  'typing', 'collections', 'itertools', 'functools',
  'models', 'getIfc',
]);
function _sanitize_val(v) {
  if (v === null || v === undefined) {
    return v;
  } else if (Array.isArray(v)) {
    return v.map((i) => _sanitize_val(i));
  } else return String(v);
}
export async function startPyodide(version = "v0.29.0", mode = "full", baseUrl = null) {
  if (getPyodide()) {
    return { status: "already_initialized" };
  }
  let indexURL;
  const origin = self.location.origin + "/";
  let pathSegment;
  if (baseUrl == null || String(baseUrl).trim() === "") {
    pathSegment = `external/vendor/pyodide/${version}/${mode}/`;
  } else if (baseUrl.startsWith("http://") || baseUrl.startsWith("https://")) {
    try {
      pathSegment = new URL(baseUrl).pathname.replace(/\/?$/, "") + "/";
      if (pathSegment === "/") pathSegment = `external/vendor/pyodide/${version}/${mode}/`;
      else if (!pathSegment.startsWith("/")) pathSegment = "/" + pathSegment;
    } catch {
      pathSegment = `external/vendor/pyodide/${version}/${mode}/`;
    }
  } else {
    pathSegment = baseUrl.startsWith("/") ? baseUrl.replace(/\/?$/, "") + "/" : baseUrl.replace(/\/?$/, "") + "/";
  }
  const base = new URL(pathSegment, origin).href;
  indexURL = base.replace(/\/?$/, "/");
  const pyodideModuleUrl = indexURL + "pyodide.mjs";
  self.postMessage({ type: "progress", message: "Loading Pyodide...", pyodideUrl: pyodideModuleUrl, indexURL });

  let loadPyodide;
  const cdnUrl = `https://cdn.jsdelivr.net/pyodide/${version}/${mode}/pyodide.mjs`;
  const cdnIndexURL = `https://cdn.jsdelivr.net/pyodide/${version}/${mode}/`;

  try {
    const mod = await import(/* webpackIgnore: true */ pyodideModuleUrl);

    loadPyodide = mod.loadPyodide;
  } catch (localErr) {
    self.postMessage({
      type: "progress",
      message: `Local Pyodide failed (${localErr?.message ?? String(localErr)}), trying CDN...`,
    });
    try {
      const mod = await import(/* webpackIgnore: true */ cdnUrl);
      loadPyodide = mod.loadPyodide;
      indexURL = cdnIndexURL;
    } catch (cdnErr) {
      self.postMessage({
        type: "workerError",
        message: `Failed to load Pyodide from ${pyodideModuleUrl}: ${localErr?.message ?? String(localErr)}. CDN fallback also failed: ${cdnErr?.message ?? String(cdnErr)}`,
        stack: cdnErr?.stack,
      });
      throw cdnErr;
    }
  }

  setOutputBuffer("");

  const pyodideInstance = await loadPyodide({

    indexURL,

    checkIntegrity: false,

    stdout: (text) => {

      appendOutputBuffer(text + "\n");

      self.postMessage({ type: "stdout", text });
    },

    stderr: (text) => {
      self.postMessage({ type: "stderr", text });
    },

  });

  setPyodide(pyodideInstance);
  pyodideInstance.registerJsModule("viewer", {
    
    ifc,
    
    scene,
    model,
    placement,
    notification,
    viewpoint,
    animation,
    measure,
    section,
    layer,
    utils,
  });

  self.postMessage({ type: "progress", message: "Pyodide loaded!" });

  return { status: "initialized", version };
}

/**
 * Convert Pyodide proxy objects to plain JavaScript objects for postMessage
 * This is necessary because Pyodide proxies cannot be cloned by structured clone algorithm
 * 
 * Note: This function deep-copies all objects. Shared references (same object in multiple places)
 * are duplicated, which is correct for postMessage serialization. Only true circular references
 * (object referencing itself in its own tree) are detected and replaced with '[circular reference]'.
 * 
 * @param {*} value - The value to serialize
 * @param {WeakSet} [ancestors] - Track ancestor objects in current path to detect true circular refs
 * @param {number} [depth] - Current recursion depth
 * @returns {*} Plain JS value that can be cloned
 */
export function serializeForPostMessage(value, ancestors = new WeakSet(), depth = 0) {

  const MAX_DEPTH = 50;

  if (depth > MAX_DEPTH) return '[max depth exceeded]';

  if (value === null || value === undefined) return value;
  
  if (typeof value !== 'object' && typeof value !== 'function') return value;
  
  if (typeof value === 'function') return '[function]';
  
  if (value && typeof value.toJs === 'function') {
    const jsValue = value.toJs({ dict_converter: Object.fromEntries });

    return serializeForPostMessage(jsValue, ancestors, depth + 1);
  }
  if (ancestors.has(value)) return '[circular reference]';

  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
    return value;
  }
  ancestors.add(value);

  let result;

  if (Array.isArray(value)) {
    result = value.map(item => serializeForPostMessage(item, ancestors, depth + 1));
  } else if (value instanceof Map) {
    result = {};

    for (const [k, v] of value) {
      result[k] = serializeForPostMessage(v, ancestors, depth + 1);
    }
  } else if (typeof value === 'object') {
    if (value.__isObjectRef) {
      result = value;
    } else {
      result = {};

      for (const key of Object.keys(value)) {
        result[key] = serializeForPostMessage(value[key], ancestors, depth + 1);
      }
    }
  } else {
    result = value;
  }
  ancestors.delete(value);

  return result;
}
export async function cleanupUserGlobals() {
  const cleanupGlobals = `
import sys

_aeco_preserved = ${JSON.stringify([...PRESERVED_GLOBALS])}
_aeco_to_remove = []

for _aeco_name in list(globals().keys()):
    if _aeco_name.startswith('_'):
        continue
    if _aeco_name in _aeco_preserved:
        continue
    # Skip modules (imported packages should persist)
    if hasattr(globals()[_aeco_name], '__module__') and globals()[_aeco_name].__module__ is not None:
        # But remove user-defined functions/classes (their __module__ is __main__)
        if getattr(globals()[_aeco_name], '__module__', None) == '__main__':
            _aeco_to_remove.append(_aeco_name)
        continue
    # Remove other user variables
    _aeco_to_remove.append(_aeco_name)

for _aeco_name in _aeco_to_remove:
    del globals()[_aeco_name]

del _aeco_preserved, _aeco_to_remove, _aeco_name
`;

  await getPyodide().runPythonAsync(cleanupGlobals);

}
export async function runCode(code) {
  const pyodide = getPyodide();
  
  if (!pyodide) {
    throw new Error("Pyodide not initialized. Call init first.");
  }

  await cleanupUserGlobals();

  setOutputBuffer("");

  const result = await pyodide.runPythonAsync(code);

  let jsResult = result;

  if (result && typeof result.toJs === "function") jsResult = result.toJs();
  
  if (jsResult instanceof Promise) jsResult = await jsResult;

  return {
    result: jsResult,
    output: getOutputBuffer(),
  };
}
/**
 * Get a variable value from Python globals
 * @param {string} variableName - The name of the variable to get
 * @returns {*} The value of the variable or undefined if not found
 */
export function getVariable(variableName) {
  const pyodide = getPyodide();
  
  if (!pyodide) {
    throw new Error("Pyodide not initialized");
  }

  try {
    const value = pyodide.globals.get(variableName);
    
    if (value === undefined) {
      return { exists: false, value: undefined };
    }
    let jsValue = value;

    if (value && typeof value.toJs === 'function') {
      jsValue = value.toJs({ dict_converter: Object.fromEntries });
    }
    
    return { exists: true, value: serializeForPostMessage(jsValue) };
  } catch (e) {
    console.warn(`[Worker] Failed to get variable ${variableName}:`, e.message);

    return { exists: false, error: e.message };
  }
}
