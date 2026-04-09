class PythonSandbox {
  static version = "v0.29.0";

  static mode = "dev";

  static worker = null;

  static loading = false;

  static isReady = false;

  static isExecutingScript = false;

  static pendingRequests = new Map();

  static requestId = 0;

  static installedPackages = new Set();

  static micropipLoaded = false;

  static outputData = { text: "" };

  static _injectedLineOffset = 0;

  static dependencyPath = `https://cdn.jsdelivr.net/pyodide/${PythonSandbox.version}/${PythonSandbox.mode}/pyodide.js`;

  static pip = null;

  static localToolsPath = null;

  static initialized = {
    ifcopenshell: false,
    bim: false,
  };
  static onProgress = null;

  static onStdout = null;

  static onStderr = null;
  static _objectRegistry = new Map();

  static _nextRefId = 1;

  /** Returns the default worker script path so the main bundle does not emit a worker chunk (worker is built separately). */
  static _getPyodideWorkerScriptPath() {
    return "./pyodide.worker.js";
  }

  static async startPyodide(
    version,
    mode,
    baseUrl = null,
    scriptBaseUrl = null,
    workerUrlOverride = null,
    ifcopenshellWheelsBaseUrl = null,
  ) {
    if (PythonSandbox.worker) return { status: "already_started" };

    const documentBase = typeof window !== "undefined" && window.location?.href
      ? window.location.href
      : "https://localhost/";

    const origin = typeof window !== "undefined" && window.location?.origin
      ? window.location.origin + "/"
      : "https://localhost/";

    let workerUrl;

    if (workerUrlOverride && String(workerUrlOverride).trim().length > 0) {
      workerUrl = new URL(workerUrlOverride, documentBase);
    } else if (scriptBaseUrl && String(scriptBaseUrl).trim().length > 0) {
      const base = String(scriptBaseUrl).trim();

      const baseWithSlash = base.endsWith("/") ? base : base + "/";

      const workerPath = baseWithSlash + "pyodide.worker.js";

      workerUrl = base.startsWith("http")
        ? new URL(workerPath)
        : new URL(workerPath, origin);
    } else {
      workerUrl = new URL(/* webpackIgnore: true */ "./pyodide.worker.js", import.meta.url);
    }

    PythonSandbox.worker = new Worker(workerUrl, { type: 'module' });

    PythonSandbox.worker.onmessage = (event) => {
      PythonSandbox._handleMessage(event.data);
    };

    PythonSandbox.worker.onerror = () => {
      console.error(
        "Pyodide Worker Error: worker failed to load or threw. Worker script URL:",
        workerUrl.href,
        "- If 404: serve dist/pyodide.worker.js at this path"
      );
    };

    const result = await PythonSandbox.run_api("startPyodide", {
      version: version,
      mode: mode,
      baseUrl: baseUrl ?? undefined,
      ifcopenshellWheelsBaseUrl: ifcopenshellWheelsBaseUrl ?? undefined,
    });

    window.addEventListener('beforeunload', () => {
      PythonSandbox.dispose();
    });

    PythonSandbox.isReady = true;

    return result;
  }

  static async loadIfcOpenShell(wheelPath) {

    if (PythonSandbox.initialized.ifcopenshell) return;

    if (!PythonSandbox.isReady) {
      console.warn("Python Must be started before loading BIM dependencies");

      return;
    }

    PythonSandbox.loading = true;

    const result = await PythonSandbox.install("ifcopenshell", wheelPath);

    PythonSandbox.initialized.ifcopenshell = true;

    PythonSandbox.loading = false;

    return result;
  }

  static async startBIMTools(pythonToolsPath, modules) {

    if (PythonSandbox.initialized.bim) return;
    
    if (!PythonSandbox.isReady) return;

    if (!PythonSandbox.initialized.ifcopenshell) return
    
    PythonSandbox.setLocalPath(pythonToolsPath);

    for (const moduleName of modules) {
      
      const result = await PythonSandbox.run_api("loadLocalModule", {
        moduleName,
        path: PythonSandbox.localToolsPath,
      });

    }

    PythonSandbox.initialized.bim = true;

  }

  static setLocalPath(path) {
    PythonSandbox.localToolsPath = path;
  }

  static async import(moduleName) {
    PythonSandbox._checkReady();

    return PythonSandbox.run_api("import", { moduleName });
  }

  static async execute(code) {
    PythonSandbox._checkReady();

    PythonSandbox.isExecutingScript = true;

    PythonSandbox.outputData = { text: "" };

    const hadStdout = PythonSandbox.onStdout;

    const hadStderr = PythonSandbox.onStderr;

    try {
      const result = await PythonSandbox.run_api("runCode", { code });

      PythonSandbox.outputData.text = result.output || "";

      PythonSandbox.isExecutingScript = false;

      if (result.error) {
        return PythonSandbox._handleScriptError(result.error);
      }

      return result.result || PythonSandbox.outputData.text;
    } catch (error) {
      PythonSandbox.isExecutingScript = false;
      PythonSandbox.onStdout = hadStdout;

      PythonSandbox.onStderr = hadStderr;

      return error;
    }
  }

  static async getVariable(variableName) {
    PythonSandbox._checkReady();

    const result = await PythonSandbox.run_api("getVariable", { variableName });

    return result;
  }

  static async getBootstrapMetrics() {
    PythonSandbox._checkReady();
    return PythonSandbox.run_api("getBootstrapMetrics", {});
  }

  static async resetBootstrapMetrics() {
    PythonSandbox._checkReady();
    return PythonSandbox.run_api("resetBootstrapMetrics", {});
  }

  static async install(packageName, wheelPath = null) {
    PythonSandbox._checkReady();

    if (PythonSandbox.isPackageInstalled(packageName)) {
      return { installed: packageName, alreadyInstalled: true };
    }

    if (packageName === "ifcopenshell") {

      const result = await PythonSandbox.run_api("installIfcOpenShell", {
        wheelPath,
      });

      PythonSandbox.installedPackages.add(packageName);
      if (Array.isArray(result.dependencies)) {
        result.dependencies.forEach((p) => PythonSandbox.installedPackages.add(p));
      }

      return result;
    }

    const result = await PythonSandbox.run_api("install", {
      packageName,
      wheelPath,
    });

    PythonSandbox.installedPackages.add(packageName);

    return result;
  }
  static isPackageInstalled(packageName) {
    return PythonSandbox.installedPackages.has(packageName);
  }

  static getInstalledPackages() {
    return Array.from(PythonSandbox.installedPackages);
  }

  static _handleScriptError(error, container) {
    let errorMessage = error.message || String(error);

    if (errorMessage.includes("Traceback")) {
      const lines = errorMessage.split("\n");

      let userLineInfo = null;

      let errorType = null;

      let errorDescription = null;

      let userLineNumber = null;

      for (let i = lines.length - 1; i >= 0 && !errorType; i--) {
        const line = lines[i].trim();

        if (line !== "") {
          const errorMatch = line.match(/^(\w+Error|Exception):\s*(.*)/);

          if (errorMatch) {
            [, errorType, errorDescription] = errorMatch;
          } else {
            errorDescription = line;
          }
        }
      }

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.includes('File "<exec>"') || line.includes('File ""')) {
          const match = line.match(/File ["|<].*["|>], line (\d+)/);

          if (match && match[1]) {
            userLineNumber = parseInt(match[1], 10);

            const offset = PythonSandbox._injectedLineOffset;

            const adjustedLine =
              userLineNumber > offset
                ? userLineNumber - offset
                : userLineNumber;

            userLineInfo = `line ${adjustedLine}`;

            break;
          }
        }
      }

      if (errorType && errorDescription) {
        errorMessage = userLineInfo
          ? `${errorType} at ${userLineInfo}: ${errorDescription}`
          : `${errorType}: ${errorDescription}`;
      } else if (userLineInfo) {
        errorMessage = `Error at ${userLineInfo}: ${
          errorDescription || "Unknown error"
        }`;
      }
    }

    return errorMessage;
  }

  static _checkReady() {
    if (!PythonSandbox.isReady) {
      throw new Error("PythonSandbox not initialized. Call start() first.");
    }
  }

  static run_api(type, payload = {}) {
    return new Promise((resolve, reject) => {
      const id = ++PythonSandbox.requestId;

      PythonSandbox.pendingRequests.set(id, { resolve, reject, type });

      PythonSandbox.worker.postMessage({ id, type, payload });
    });
  }

  static _handleMessage(data) {
    if (data.type === "workerError") {
      console.error("[Pyodide Worker]", data.message, data.stack || "", data.filename ? ` at ${data.filename}:${data.lineno ?? ""}` : "");

      return;
    }

    if (data.type === "progress") {

      if (PythonSandbox.onProgress) PythonSandbox.onProgress(data.message);

      return;
    }

    if (data.type === "stdout") { 
      
      PythonSandbox.outputData.text += data.text + "\n";

      if (PythonSandbox.onStdout) PythonSandbox.onStdout(data.text);
      return;
    }

    if (data.type === "stderr") { 
      if (PythonSandbox.onStderr) PythonSandbox.onStderr(data.text);
      
      return;
    }
    
    if (data.type === "executeViewerMethod") {
      PythonSandbox._executeViewerMethodFromWorker(data);

      return;
    }
    const { id, success, result, error } = data;

    if (!id) return;

    const pending = PythonSandbox.pendingRequests.get(id);

    if (!pending) return;
    
    PythonSandbox.pendingRequests.delete(id);

    if (success) {

      pending.resolve(result);

    } else if (error) {

      const workerError = new Error(
        error?.message || "Unknown error from worker"
      );

      if (pending.type) {
        workerError.message = `Failed to execute '${pending.type}': ${workerError.message}`;
      }

      if (error?.stack) {
        workerError.stack = `${workerError.message}\n\nWorker Stack Trace:\n${error.stack}\n\nClient Stack Trace:\n${workerError.stack}`;
      }

      pending.reject(workerError);

    }
  }

  static dispose() {
    if (PythonSandbox.worker) {
      PythonSandbox.worker.terminate();

      PythonSandbox.worker = null;

      PythonSandbox.isReady = false;

      PythonSandbox.pendingRequests.clear();

      PythonSandbox.installedPackages.clear();
    }
  }
  static async getPythonObjectDir(variableName, fullCode = "", uptoLine = -1) {
    if (!PythonSandbox.isReady) {
      return [];
    }

    try {
      return await PythonSandbox.run_api("getPythonObjectDir", {
        variableName,
        fullCode,
        uptoLine,
      });
    } catch (error) {
      return [];
    }
  }
  static _viewerAPI = null;

  static async registerViewerAPI(viewerAPI) {
    PythonSandbox._checkReady();

    if (!viewerAPI) {
      throw new Error('ViewerAPI not provided');
    }

    PythonSandbox._viewerAPI = viewerAPI;

    const registry = viewerAPI.getRegistry();

    const result = await PythonSandbox.run_api("registerViewerAPI", { registry });

    return { status: "FINISHED", ...result };
  }
  static _serializeResult(value, depth = 0) {
    
    if (depth > 10) {
      console.warn(
        "[PythonSandbox] Max serialization depth in _serializeResult"
      );

      return "[max depth]";
    }
    if (value === null || value === undefined) {
      return value;
    }
    if (typeof value !== "object") {
      return value;
    }
    if (depth === 0) {
      console.log(
        "[PythonSandbox] _serializeResult input:",
        value?.type,
        value?.isObject3D,
        value?.constructor?.name
      );
    }
    if (value.isInteractiveObject) {
      const refId = `__obj_ref_${PythonSandbox._nextRefId++}`;

      PythonSandbox._objectRegistry.set(refId, value);
      const simple = {};

      const keys = Object.keys(value);

      for (const key of keys) {
        if (key === "object" && value[key].isObject3D) {
          
          simple[key] = PythonSandbox._serializeResult(value[key], depth + 1);
        } else if (key.startsWith("_") || typeof value[key] === "function") {
          continue;
        } else {
          simple[key] = PythonSandbox._serializeResult(value[key], depth + 1);
        }
      }

      simple.__isObjectRef = true;

      simple.refId = refId;

      simple.isInteractiveObject = true;

      console.log(
        `[PythonSandbox] Serialized InteractiveObject ${value.type} as ${refId}`
      );

      return simple;
    }
    if (
      value.isObject3D ||
      value.isMesh ||
      value.isGroup ||
      value.isScene ||
      value.type === "Group" ||
      value.type === "Mesh" ||
      value.type === "Scene"
    ) {
      
      const refId = `__obj_ref_${PythonSandbox._nextRefId++}`;

      PythonSandbox._objectRegistry.set(refId, value);

      console.log(
        `[PythonSandbox] Stored Three.js object ${value.type} as ${refId} (depth ${depth})`
      );

      return {
        __isObjectRef: true,
        refId,
        type: value.type || "Object3D",
        name: value.name || "",
      };
    }
    if (Array.isArray(value)) {
      return value.map((item) =>
        PythonSandbox._serializeResult(item, depth + 1)
      );
    }
    try {
      const simple = {};

      const keys = Object.keys(value);
      for (const key of keys) {
        if (
          (key.startsWith("_") && !key.startsWith("__ifcEntity") && !key.startsWith("_debug")) ||
          key === "children" ||
          key === "parent" ||
          key === "matrix" ||
          key === "matrixWorld" ||
          key === "geometry" ||
          key === "material"
        ) {
          continue;
        }

        const propValue = value[key];
        if (typeof propValue === "function") continue;

        simple[key] = PythonSandbox._serializeResult(propValue, depth + 1);
      }

      return simple;
    } catch (e) {
      
      const refId = `__obj_ref_${PythonSandbox._nextRefId++}`;

      PythonSandbox._objectRegistry.set(refId, value);

      return { __isObjectRef: true, refId, type: "Object" };
    }
  }

  /**
   * Resolve object references and IFC proxies in arguments from worker
   * @param {Array} args - Arguments that may contain object references or IFC proxies
   * @returns {Promise<Array>} Arguments with refs resolved to actual objects
   */
  static async _resolveObjectRefs(args) {
    return Promise.all(args.map(async (arg) => {
      if (arg && typeof arg === "object") {
        
        if (arg.__ifcProxy__) {
          console.log(
            `[PythonSandbox] Passing through IFC proxy: ${arg.type} (${arg.GlobalId})`
          );

          return arg;
        }
        
        if (arg.__isObjectRef && arg.refId) {
          const obj = PythonSandbox._objectRegistry.get(arg.refId);

          console.log(
            `[PythonSandbox] Resolving ref ${arg.refId}:`,
            obj ? `found (${obj.type || "object"})` : "NOT FOUND"
          );

          console.log(
            `[PythonSandbox] Registry has ${PythonSandbox._objectRegistry.size} entries:`,
            [...PythonSandbox._objectRegistry.keys()]
          );

          if (obj) return obj;

          console.warn(`[PythonSandbox] Object ref not found: ${arg.refId}`);

          return null;
        }
        if (Array.isArray(arg)) {
          return await PythonSandbox._resolveObjectRefs(arg);
        }
        const resolved = {};

        for (const key of Object.keys(arg)) {
          resolved[key] = (await PythonSandbox._resolveObjectRefs([arg[key]]))[0];
        }

        return resolved;
      }

      return arg;
    }));
  }

  /**
   * Execute a ViewerAPI method from a worker request
   * Called when worker receives a Python call to viewer methods
   * @param {Object} data - Message data from worker
   */
  static async _executeViewerMethodFromWorker(data) {
    const { id, payload } = data;

    const { namespace, path, method, args } = payload;

    try {
      if (!PythonSandbox._viewerAPI) {
        throw new Error('ViewerAPI not initialized');
      }
      const result = await PythonSandbox._viewerAPI.executeMethod(
        namespace,
        path,
        method,
        args
      );
      const serialized = PythonSandbox._serializeResult(result);
      
      PythonSandbox.worker.postMessage({
        id,
        success: true,
        result: serialized,
      });
    } catch (error) {
      console.error(
        `[PythonSandbox] Error executing ${namespace}.${path.join('.')}.${method}:`,
        error
      );

      PythonSandbox.worker.postMessage({
        id,
        success: false,
        error: {
          message: error.message,
          stack: error.stack,
        },
      });
    }
  }

  /**
   * Execute a ViewerAPI method from a worker request
   * Called when worker receives a Python call to viewer methods
   * @param {string} namespace - The namespace (scene, model, etc.)
   * @param {string} method - The method name
   * @param {Array} args - Arguments to pass
   * @returns {*} The result of the method call
   */
  static async executeViewerMethod(namespace, method, args = []) {
    if (!PythonSandbox._viewerAPI) {
      console.error("[PythonSandbox] ViewerAPI not registered");

      return { error: "ViewerAPI not registered" };
    }

    try {
      const api = PythonSandbox._viewerAPI.getAPI();

      if (!api[namespace]) {
        return { error: `Unknown namespace: ${namespace}` };
      }

      if (typeof api[namespace][method] !== "function") {
        return { error: `Unknown method: ${namespace}.${method}` };
      }
      console.log(
        `[PythonSandbox] executeViewerMethod ${namespace}.${method} with args:`,
        JSON.stringify(args)
      );

      const resolvedArgs = await PythonSandbox._resolveObjectRefs(args);

      console.log(
        `[PythonSandbox] Resolved args:`,
        resolvedArgs.map((a) => a?.type || typeof a)
      );
      const result = api[namespace][method](...resolvedArgs);
      if (result instanceof Promise) {
        return result
          .then((r) => ({ result: PythonSandbox._serializeResult(r) }))
          .catch((e) => ({ error: e.message }));
      }
      return { result: PythonSandbox._serializeResult(result) };
    } catch (error) {
      console.error(
        `[PythonSandbox] Error executing ${namespace}.${method}:`,
        error
      );

      return { error: error.message };
    }
  }

  /**
   * Quick setup for viewer API with AECO context
   * @param {Object} options - Configuration options
   * @param {Object} options.editor - The Three.js editor
   * @param {Object} options.context - The AECO context
   * @param {Object} options.dataStore - The data store
   * @param {Object} options.ViewerAPI - The ViewerAPI class (should already be initialized)
   */
  static async setupViewerAPI({ editor, context, dataStore, ViewerAPI }) {
    if (!ViewerAPI) {
      console.warn("[PythonSandbox] ViewerAPI class not provided");

      return;
    }
    await PythonSandbox.registerViewerAPI(ViewerAPI);
  }
}

export default PythonSandbox;
