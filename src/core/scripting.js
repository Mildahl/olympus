/**
 * Scripting Core Functions
 *
 * Core business logic for Python/JavaScript script editing and execution.
 * These functions are called by operators and should remain decoupled from UI.
 */
import PythonSandbox from "../tool/pyodide/Python.js";

import Paths from "../utils/paths.js";

import JSSandboxTool from "../tool/js/JsSandbox.js";

import CodeEditorTool from "../tool/code/CodeEditorTool.js";

import ViewerAPI from "../tool/pyodide/ViewerAPI.js";

import operators from "../operators/index.js";

import AECO_TOOLS from "../tool/index.js";

import core from "./index.js";

import dataStore from "../data/index.js";

async function enableJavaScript({ signals, jsTool }) {
  const result = await jsTool.start();

  return result;
}

/**
 * Enable Python runtime via Pyodide
 * @param {string} version - Pyodide version
 * @param {Function} onMessage - Message callback
 * @param {Object} options
 * @param {Object} options.signals - Context signals
 * @param {Object} options.context - AECO context
 * @param {typeof PythonSandbox} options.pythonTool
 * @param {typeof CodeEditorTool} options.codeTool - Code editor tool
 */
async function enablePython(
  version = "v0.29.0",
  onMessage = null,
  { signals, context, pythonTool, codeTool },
) {
  const mode = "full";

  const baseUrl = context?.config?.app?.Settings?.pyodideBaseUrl ?? null;

  const scriptBaseUrl = context?.config?.app?.Settings?.scriptBaseUrl ?? null;

  const workerUrl = context?.config?.app?.Settings?.pyodideWorkerUrl ?? null;

  const result = await pythonTool.startPyodide(version, mode, baseUrl, scriptBaseUrl, workerUrl);

  await enableViewerAPI({ context, signals, pythonTool, codeTool });

  return result;
}

/**
 * Enable ViewerAPI - exposes AECO tools, operators, and core to Python
 * @param {Object} options
 * @param {Object} options.context - AECO context
 * @param {Object} options.signals - Context signals
 * @param {typeof PythonSandbox} options.pythonTool
 * @param {typeof CodeEditorTool} options.codeTool - Code editor tool (optional, for IntelliSense)
 */
async function enableViewerAPI({ context, signals, pythonTool, codeTool }) {
  if (ViewerAPI._initialized) {
    return { status: "FINISHED" };
  }

  ViewerAPI.initialize({
    tools: AECO_TOOLS,
    operators,
    core,
    context,
  });

  await pythonTool.registerViewerAPI(ViewerAPI);

  return { status: "FINISHED" };
}

async function enableMonacoEditor({ codeTool, context }) {
  const monacoBaseUrl = context?.config?.app?.Settings?.monacoBaseUrl ?? null;

  codeTool.monacoEditor.setBaseUrl(monacoBaseUrl);

  if (!codeTool.monacoEditor.loaded) {
    await codeTool.loadMonaco();
  }

  const apiDefinitions = ViewerAPI.getIntelliSenseDefinitions();

  codeTool.monacoEditor.registerViewerAPIIntelliSense(apiDefinitions);
}

/**
 * Run code in specified language
 * @param {string} code - Code to run
 * @param {string} language - 'python' or 'javascript'
 * @param {Object} options
 * @param {Object} options.signals - Context signals
 * @param {typeof PythonSandbox} options.pythonTool
 * @param {typeof JSSandboxTool } options.jsTool
 */
async function runCode(
  code,
  language = "javascript",
  { signals, pythonTool, jsTool },
) {
  if (language === "javascript")
    return await runJavaScriptCode(code, null, { signals, jsTool });
  else return await runPythonCode(code, null, { signals, pythonTool });
}

/** Run Python code
 * @param {string} code - Python code to run
 * @param {string} GlobalId - Optional script GUID for output dispatch
 * @param {Object} options
 * @param {Object} options.signals - Context signals
 * @param {typeof PythonSandbox} options.pythonTool
 */
async function runPythonCode(
  code = null,
  GlobalId = null,
  { signals, pythonTool },
) {

  if (!code) return { success: false, message: "No code provided" };
  
  const result = await pythonTool.execute(code);

  let outputText;

  if (result instanceof Error) {
    outputText = result.message || String(result);
  } else if (typeof result === "object" && result !== null) {
    if (result.message && (result.stack || result.name)) {
      outputText = result.message;
    } else {
      outputText = JSON.stringify(result, null, 2);
    }
  } else {
    outputText = String(result ?? "");
  }

  const isError =
    result instanceof Error ||
    (typeof result === "object" && result !== null && result.success === false);

  const codeCollection = dataStore.getCollectionByGuid(GlobalId);

  signals.openOutput.dispatch({ 
    GlobalId, 
    language: "python", 
    result, 
    outputText,
    scriptName: codeCollection?.name || "script",
  });

  if (GlobalId) { 

    signals.scriptExecutionCompleted.dispatch({
      GlobalId,
      language: "python",
      result: result,
      output: outputText,
      code: code,
      success: !isError,
      pythonTool,
    });

  }

  return result;
}

async function runJavaScriptCode(
  code = null,
  GlobalId = null,
  { signals, jsTool },
) {
  if (!code) {
    return { success: false, message: "No code provided" };
  }

  const result = await jsTool.execute(code);

  const isError = result instanceof Error;

  const outputText = isError ? `Error: ${result.message}` : String(result);

  if (GlobalId) {
    signals.openOutput.dispatch({
      GlobalId,
      language: "javascript",
      result: outputText,
      scriptName: "script",
    });
  }

  return isError
    ? { success: false, message: result.message }
    : { success: true, result: String(result) };
}

/**
 * Create a new script
 * @param {string} name - Script name
 * @param {string} code - Initial code
 * @param {string} language - 'python' or 'javascript'
 * @param {Object} options
 * @param {typeof CodeEditorTool} options.codeTool - Code editor tool (optional, for IntelliSense)
 * @param {Object} options.context - AECO context
 */
async function newScript(
  name = null,
  code = null,
  language = "python",
  { codeTool, context },
) {
  if (!code)
    code = language === "python" ? "# Your code here" : "// Your code here";

  const signals = context.signals;

  const codeCollection = codeTool.storeScript(code, name, language);

  signals.newScript.dispatch(codeCollection.guid);

  return codeCollection;
}

/**
 * Open/load a script into the code editor
 * Handles both initial editor setup and switching between scripts.
 *
 * Flow:
 * - If editor exists: Save current state -> Activate script -> Signal UI
 * - If editor doesn't exist: Create editor in container -> Create model -> Activate -> Signal UI
 *
 * @param {string} GlobalId - Script GUID
 * @param {Object} options
 * @param {typeof CodeEditorTool} options.codeTool - Code editor tool
 * @param {Object} options.context - AECO context
 * @param {HTMLElement} [options.editorContainer] - DOM element to mount editor (required for first script only)
 */
async function openScript(
  GlobalId,
  { codeTool, context, editorContainer = null },
) {
  const signals = context.signals;

  const codeCollection = codeTool.getScript(GlobalId);

  if (!codeCollection) return null;

  if (!codeTool.monacoEditor.loaded) {
    await enableMonacoEditor({ codeTool, context });
  }

  const guid = codeCollection.guid;

  const existingEditor = codeTool.getCodeEditor();

  if (existingEditor) {

    if (!codeTool.hasScriptEditor(guid)) {
      codeTool.createScriptModel(
        guid,
        codeCollection.code,
        codeCollection.language,
      );
    }

    codeTool.monacoEditor.saveCurrentScript();

    codeTool.activateScript(guid);
  } else {

    const container = editorContainer || codeTool.getEditorContainer();

    if (!container) return null;
    
    codeTool.createCodeEditor(container);

    if (!codeTool.hasScriptEditor(guid)) {
      codeTool.createScriptModel(
        guid,
        codeCollection.code,
        codeCollection.language,
      );
    }

    codeTool.activateScript(guid);
  }

  signals.openScript.dispatch({ codeCollection });

  return codeTool.getCodeEditor();
}

/**
 * Enable BIM tools (IfcOpenShell)
 * @param {Object} options
 * @param {Object} options.signals - Context signals
 * @param {typeof PythonSandbox} options.pythonTool
 * @param {Object} options.wheelsPath - Path to the IfcOpenShell wheel
 * @param {Object} options.pythonToolsPath - Path to the BIM tools
 */
async function enableBIM({ wheelsPath, pythonToolsPath, signals, pythonTool }) {

  if (pythonTool.initialized?.ifcopenshell) {
    signals.bimEnabled.dispatch();

    return { status: "FINISHED" };
  }

  if(!wheelsPath) {
    wheelsPath = `${window.location.origin}${Paths.vendor('ifcopenshell/wheels/')}`;
  }

  await pythonTool.loadIfcOpenShell(`${wheelsPath}ifcopenshell-0.8.4+1492a66-cp313-cp313-emscripten_4_0_9_wasm32.whl`);

  const modules = [
    "context",
    "spatial",
    "sequence",
    "attribute",
    "pset",
    "doc",
    "ifc_author"
  ];

  await pythonTool.startBIMTools(pythonToolsPath || `${window.location.origin}${Paths.pythonTools()}/`, modules);

  signals.bimEnabled.dispatch();

  return { status: "FINISHED" };
}

/**
 * Create Monaco editor for a script in a specific container
 * Lower-level function - prefer openScriptEditor for the main window
 *
 * @param {Object} codeCollection - Code collection object
 * @param {HTMLElement} domElement - DOM element to mount editor on
 * @param {Object} options
 * @param {typeof CodeEditorTool} options.codeTool - Code editor tool
 * @param {Object} [options.context] - AECO context (for monacoBaseUrl)
 */
async function createScriptEditor(codeCollection, domElement, { codeTool, context }) {
  if (!codeTool.monacoEditor.loaded) {
    const monacoBaseUrl = context?.config?.app?.Settings?.monacoBaseUrl ?? null;

    codeTool.monacoEditor.setBaseUrl(monacoBaseUrl);

    await codeTool.loadMonaco();
  }

  codeTool.createCodeEditor(domElement);

  const guid = codeCollection.guid;

  if (!codeTool.hasScriptEditor(guid)) {
    codeTool.createScriptModel(
      guid,
      codeCollection.code,
      codeCollection.language,
    );
  }

  codeTool.monacoEditor.saveCurrentScript();

  codeTool.activateScript(guid);

  return codeTool.getCodeEditor();
}

/**
 * Save script to collection
 * @param {string} GlobalId - Script GUID
 * @param {string} newCode - Optional new code (gets from editor if null)
 * @param {Object} options
 */
function saveScript(GlobalId, newCode, { codeTool }) {
  if (!newCode) {
    newCode = codeTool.getCode(GlobalId);
  }

  if (!newCode) return;
  
  codeTool.refreshScriptStorage(GlobalId, newCode);

  codeTool.setCode(GlobalId, newCode);
}

function refreshScript(GlobalId, newCode, { codeTool, context }) {
  saveScript(GlobalId, newCode, { codeTool });

  openScript(GlobalId, { codeTool, context });
}

/**
 * Run a saved script
 * @param {string} GlobalId - Script GUID
 * @param {Object} options
 */
async function runScript(
  GlobalId = null,
  { signals, pythonTool, jsTool, codeTool },
) {
  if (!GlobalId) {
    throw new Error("No GlobalId provided to find script");
  }

  const codeCollection = codeTool.getScript(GlobalId);

  if (!codeCollection) {
    throw new Error(`No Code Collection found with GlobalId: ${GlobalId}`);
  }

  const lang = codeCollection.language;

  const code = codeCollection.currentCode;

  codeCollection.runCount += 1;

  signals.newScript.dispatch(); 

  let result;

  if (lang === "python") {
    result = await runPythonCode(code, codeCollection.guid, {
      signals,
      pythonTool,
    });
  } else if (lang === "javascript") {
    result = await runJavaScriptCode(code, codeCollection.guid, {
      signals,
      jsTool,
    });
  }

  return result;
}

/**
 * Rename a script
 * @param {string} scriptGuid - Script GUID
 * @param {string} newName - New name
 * @param {Object} options
 */
function renameScript(scriptGuid, newName, { codeTool, signals }) {
  const script = codeTool.getScript(scriptGuid);

  if (!script) {
    throw new Error(`No script found with GUID: ${scriptGuid}`);
  }

  script.name = newName;

  signals.scriptNameChanged.dispatch({ guid: scriptGuid, name: newName });
}

/**
 * Colorize a DOM element with syntax highlighting
 * @param {HTMLElement} dom - DOM element to colorize
 * @param {Object} options
 */
async function colorizeDom(dom, { codeTool }) {
  codeTool.colorizeDom(dom);
}

/**
 * Minimize all open editor panels
 * @param {Object} options
 * @param {Object} options.signals - Context signals to dispatch minimize event
 * @param {Array<string>} options.excludeGuids - Optional array of GUIDs to exclude from minimizing
 */
function minimizeAllEditorPanels({ signals, excludeGuids = [] }) {
  signals.minimizeAllEditorPanels.dispatch({ excludeGuids });
}

/**
 * Maximize/restore a specific editor panel
 * @param {string} GlobalId - Script GUID to maximize
 * @param {Object} options
 * @param {Object} options.signals - Context signals to dispatch maximize event
 */
function maximizeEditorPanel(GlobalId, { signals }) {
  if (!GlobalId) return;
  
  signals.maximizeEditorPanel.dispatch({ GlobalId });
}

function activateScript(GlobalId, { codeTool }) {
  if (!GlobalId) return false;

  return codeTool.activateScript(GlobalId);
}

function getScriptCode(GlobalId, { codeTool }) {
  return codeTool.getCode(GlobalId);
}

export {
  enablePython,
  enableMonacoEditor,
  enableJavaScript,
  enableViewerAPI,
  enableBIM,
  runPythonCode,
  runJavaScriptCode,
  runCode,
  newScript,
  openScript,
  createScriptEditor,
  saveScript,
  refreshScript,
  runScript,
  renameScript,
  colorizeDom,
  minimizeAllEditorPanels,
  maximizeEditorPanel,
  activateScript,
  getScriptCode,
};
