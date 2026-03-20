import { Operator } from "../../operators/Operator.js";

import operators from "../../operators/index.js";

import AECO_tools from "../../tool/index.js";

import * as ScriptingCore from "../../core/scripting.js";

import { testCode as templateScripts } from "../../tool/code/code.js";

class CODE_EnablePython extends Operator {
  static operatorName = "code.enable_python";

  static operatorLabel = "Enable Python";

  static operatorOptions = ["REGISTER"];

  constructor(context, pyodideVersion = null) {
    super(context);

    this.context = context;

    this.pyodideVersion = pyodideVersion;

    this.wasEnabled = false;
  }

  async execute() {
    this.wasEnabled = AECO_tools.initialized.python;

    const onMessage = (msg) => console.log('[PYTHON]:', msg);

    const pyodideVersion = this.pyodideVersion || 'v0.29.0';
    
    await ScriptingCore.enablePython(pyodideVersion, onMessage, {
      signals: this.context.signals,
      context: this.context,
      pythonTool: AECO_tools.code.pyWorker,
      codeTool: AECO_tools.code.editor,
    });

    AECO_tools.initialized.python = true;

    return { status: "FINISHED" };
  }

  undo() {
    AECO_tools.initialized.python = this.wasEnabled;

    return { status: "CANCELLED" };
  }
}

class CODE_EnableJavaScript extends Operator {
  static operatorName = "code.enable_javascript";

  static operatorLabel = "Enable JavaScript";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;

    this.wasEnabled = false;
  }

  async execute() {
    this.wasEnabled = AECO_tools.code.js?.isReady || false;

    await ScriptingCore.enableJavaScript({
      signals: this.context.signals,
      jsTool: AECO_tools.code.js,
    });

    return { status: "FINISHED" };
  }

  undo() {
    return { status: "CANCELLED" };
  }
}

class CODE_EnableBIM extends Operator {
  static operatorName = "code.enable_bim";

  static operatorLabel = "Enable BIM";

  static operatorOptions = ["REGISTER"];

  constructor(context, { wheelsPath = null, pythonToolsPath = null }) {
    super(context);

    this.context = context;

    this.wheelsPath = wheelsPath;

    this.pythonToolsPath = pythonToolsPath;

    this.wasEnabled = false;
  }

  poll() {
    return AECO_tools.code.pyWorker.isReady;
  }

  async execute() {
    this.wasEnabled = AECO_tools.initialized.bim;

    await ScriptingCore.enableBIM({
      signals: this.context.signals,
      pythonTool: AECO_tools.code.pyWorker,
      wheelsPath: this.wheelsPath,
      pythonToolsPath: this.pythonToolsPath,
    });

    AECO_tools.initialized.bim = true;

    operators.execute("bim.enable_bim_selection", this.context);

    return { status: "FINISHED" };
  }

  undo() {
    AECO_tools.initialized.bim = this.wasEnabled;

    return { status: "CANCELLED" };
  }
}

class CODE_EnableViewerAPI extends Operator {
  static operatorName = "code.enable_viewer_api";

  static operatorLabel = "Enable Viewer API";

  static operatorOptions = ["REGISTER"];

  constructor(context, editor = null) {
    super(context);

    this.context = context;

    this.editor = editor;
  }

  poll() {
    return AECO_tools.code.pyWorker.isReady;
  }

  async execute() {
    await ScriptingCore.enableViewerAPI({
      context: this.context,
      signals: this.context.signals,
      pythonTool: AECO_tools.code.pyWorker,
      codeTool: AECO_tools.code.editor,
    });

    return { status: "FINISHED" };
  }

  undo() {
    return { status: "CANCELLED" };
  }
}

class CODE_RunPython extends Operator {
  static operatorName = "code.run_python";

  static operatorLabel = "Run Python Code";

  static operatorOptions = ["REGISTER"];

  constructor(context, code) {
    super(context);

    this.code = code;
  }

  poll() {
    return AECO_tools.code.pyWorker.isReady;
  }

  async execute() {
    await ScriptingCore.runPythonCode(this.code, null, {
      signals: this.context.signals,
      pythonTool: AECO_tools.code.pyWorker,
    });

    return { status: "FINISHED" };
  }

  undo() {
    return { status: "CANCELLED" };
  }
}

class CODE_RunJavaScript extends Operator {
  static operatorName = "code.run_javascript";

  static operatorLabel = "Run JavaScript";

  static operatorOptions = ["REGISTER"];

  constructor(context, code) {
    super(context);

    this.code = code;
  }

  async execute() {
    const result = await ScriptingCore.runJavaScriptCode(this.code, null, {
      signals: this.context.signals,
      jsTool: AECO_tools.code.js,
    });

    return { status: "FINISHED" };
  }

  undo() {
    return { status: "CANCELLED" };
  }
}

class CODE_RunCode extends Operator {
  static operatorName = "code.run_code";

  static operatorLabel = "Run Code";

  static operatorOptions = ["REGISTER"];

  constructor(context, code, language) {
    super(context);

    this.code = code;

    this.language = language;
  }

  async execute() {
    await ScriptingCore.runCode(this.code, this.language, {
      signals: this.context.signals,
      pythonTool: AECO_tools.code.pyWorker,
      jsTool: AECO_tools.code.js,
    });

    return { status: "FINISHED" };
  }

  undo() {
    return { status: "CANCELLED" };
  }
}

class CODE_NewScript extends Operator {
  static operatorName = "code.new_script";

  static operatorLabel = "New Script";

  static operatorOptions = ["REGISTER"];

  constructor(context, name = null, language = "python", code = null) {
    super(context);

    this.name = name;

    this.language = language;

    this.code = code;

    this.createdCollection = null;
  }

  async execute() {
    const codeCollection = await ScriptingCore.newScript(this.name, this.code, this.language, {
      codeTool: AECO_tools.code.editor,
      context: this.context,
    });

    this.createdCollection = codeCollection;

    return { status: "FINISHED", codeCollection };
  }

  undo() {
    if (this.createdCollection) {
      AECO_tools.code.editor.deleteScript(this.createdCollection);

      AECO_tools.code.editor.disposeModel(this.createdCollection.guid);

      this.context.signals.scriptTabClosed.dispatch({ guid: this.createdCollection.guid });
    }

    return { status: "CANCELLED" };
  }
}

/**
 * Show the code editor window (UI concern only)
 * Does not load any script - just shows the window
 */
class CODE_ShowEditor extends Operator {
  static operatorName = "code.show_editor";

  static operatorLabel = "Show Code Editor";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.wasVisible = false;
  }

  async execute() {
    this.wasVisible = this.context._codeEditorVisible || false;

    this.context.signals.showCodeEditor.dispatch({ visible: true });

    return { status: "FINISHED" };
  }

  undo() {
    this.context.signals.showCodeEditor.dispatch({ visible: this.wasVisible });

    return { status: "CANCELLED" };
  }
}

/**
 * Open a script in the code editor (data concern)
 * Loads the script into the editor - also shows the window
 */
class CODE_OpenScript extends Operator {
  static operatorName = "code.open_script";

  static operatorLabel = "Open Script";

  static operatorOptions = ["REGISTER"];

  constructor(context, scriptGuid) {
    super(context);

    this.scriptGuid = scriptGuid;

    this.previousActiveGuid = null;
  }

  async execute() {
    if (!this.scriptGuid) {
      console.warn('[CODE_OpenScript] No scriptGuid provided');

      return { status: "CANCELLED" };
    }

    const codeCollection = AECO_tools.code.editor.getScript(this.scriptGuid);

    if (!codeCollection) {
      console.error('[CODE_OpenScript] Script not found:', this.scriptGuid);

      return { status: "CANCELLED" };
    }

    this.previousActiveGuid = AECO_tools.code.editor.activeScriptGuid;

    this.context.signals.showCodeEditor.dispatch({ visible: true });

    await ScriptingCore.enableMonacoEditor({ codeTool: AECO_tools.code.editor, context: this.context });

    const editorContainer = this.context._scriptEditorContainer;

    await ScriptingCore.openScript(this.scriptGuid, {
      codeTool: AECO_tools.code.editor,
      context: this.context,
      editorContainer,
    });

    return { status: "FINISHED" };
  }

  undo() {
    if (this.previousActiveGuid) {
      ScriptingCore.activateScript(this.previousActiveGuid, {
        codeTool: AECO_tools.code.editor,
      });

      const codeCollection = AECO_tools.code.editor.getScript(this.previousActiveGuid);

      if (codeCollection) {
        this.context.signals.openScript.dispatch({ codeCollection });
      }
    }

    return { status: "CANCELLED" };
  }
}

class CODE_SaveScript extends Operator {
  static operatorName = "code.save_script";

  static operatorLabel = "Save Script";

  static operatorOptions = ["REGISTER"];

  constructor(context, GlobalId) {
    super(context);

    this.GlobalId = GlobalId;

    this.previousCode = null;
  }

  async execute() {
    const codeCollection = AECO_tools.code.editor.getScript(this.GlobalId);

    if (codeCollection) {
      this.previousCode = codeCollection.code;
    }

    ScriptingCore.saveScript(this.GlobalId, null, {
      signals: this.context.signals,
      codeTool: AECO_tools.code.editor,
    });

    return { status: "FINISHED" };
  }

  undo() {
    if (this.previousCode !== null) {
      const codeCollection = AECO_tools.code.editor.getScript(this.GlobalId);

      if (codeCollection) {
        codeCollection.saveCode(this.previousCode);

        AECO_tools.code.editor.setCode(this.GlobalId, this.previousCode);
      }
    }

    return { status: "CANCELLED" };
  }
}

class CODE_UpdateScript extends Operator {
  static operatorName = "code.update_script";

  static operatorLabel = "Update Script";

  static operatorOptions = ["REGISTER"];

  constructor(context, GlobalId, newCode) {
    super(context);

    this.GlobalId = GlobalId;

    this.newCode = newCode;

    this.previousCode = null;
  }

  async execute() {
    const codeCollection = AECO_tools.code.editor.getScript(this.GlobalId);

    if (codeCollection) {
      this.previousCode = codeCollection.code;
    }

    ScriptingCore.refreshScript(this.GlobalId, this.newCode, {
      signals: this.context.signals,
      codeTool: AECO_tools.code.editor,
      context: this.context,
    });

    return { status: "FINISHED" };
  }

  undo() {
    if (this.previousCode !== null) {
      ScriptingCore.refreshScript(this.GlobalId, this.previousCode, {
        signals: this.context.signals,
        codeTool: AECO_tools.code.editor,
        context: this.context,
      });
    }

    return { status: "CANCELLED" };
  }
}

class CODE_RunScript extends Operator {
  static operatorName = "code.run_script";

  static operatorLabel = "Run Script";

  static operatorOptions = ["REGISTER"];

  constructor(context, GlobalId) {
    super(context);

    this.GlobalId = GlobalId;
  }

  async execute() {
    ScriptingCore.saveScript(this.GlobalId, null, {
      signals: this.context.signals,
      codeTool: AECO_tools.code.editor,
    });

    await ScriptingCore.runScript(this.GlobalId, {
      signals: this.context.signals,
      codeTool: AECO_tools.code.editor,
      pythonTool: AECO_tools.code.pyWorker,
      jsTool: AECO_tools.code.js,
    });

    return { status: "FINISHED" };
  }

  undo() {
    return { status: "CANCELLED" };
  }
}

class CODE_RenameScript extends Operator {
  static operatorName = "code.rename_script";

  static operatorLabel = "Rename Script";

  static operatorOptions = ["REGISTER"];

  constructor(context, scriptGuid, newName) {
    super(context);

    this.scriptGuid = scriptGuid;

    this.newName = newName;

    this.previousName = null;
  }

  async execute() {
    const script = AECO_tools.code.editor.getScript(this.scriptGuid);

    if (script) {
      this.previousName = script.name;
    }

    ScriptingCore.renameScript(this.scriptGuid, this.newName, {
      codeTool: AECO_tools.code.editor,
      signals: this.context.signals,
    });

    return { status: "FINISHED" };
  }

  undo() {
    if (this.previousName !== null) {
      ScriptingCore.renameScript(this.scriptGuid, this.previousName, {
        codeTool: AECO_tools.code.editor,
        signals: this.context.signals,
      });
    }

    return { status: "CANCELLED" };
  }
}

/**
 * Switch to a different script tab (activates an already open script)
 */
class CODE_SwitchScript extends Operator {
  static operatorName = "code.switch_script";

  static operatorLabel = "Switch Script";

  static operatorOptions = ["REGISTER"];

  constructor(context, scriptGuid) {
    super(context);

    this.scriptGuid = scriptGuid;

    this.previousActiveGuid = null;
  }

  async execute() {
    if (!this.scriptGuid) {
      console.warn('[CODE_SwitchScript] No scriptGuid provided');

      return { status: "CANCELLED" };
    }

    const codeCollection = AECO_tools.code.editor.getScript(this.scriptGuid);

    if (!codeCollection) {
      console.error('[CODE_SwitchScript] Script not found:', this.scriptGuid);

      return { status: "CANCELLED" };
    }

    this.previousActiveGuid = AECO_tools.code.editor.activeScriptGuid;

    const switched = ScriptingCore.activateScript(this.scriptGuid, {
      codeTool: AECO_tools.code.editor,
    });

    if (switched) {
      
      this.context.signals.openScript.dispatch({ codeCollection });
    }

    return { status: "FINISHED" };
  }

  undo() {
    if (this.previousActiveGuid) {
      const switched = ScriptingCore.activateScript(this.previousActiveGuid, {
        codeTool: AECO_tools.code.editor,
      });

      if (switched) {
        const codeCollection = AECO_tools.code.editor.getScript(this.previousActiveGuid);

        if (codeCollection) {
          this.context.signals.openScript.dispatch({ codeCollection });
        }
      }
    }

    return { status: "CANCELLED" };
  }
}

/**
 * Close a script tab
 */
class CODE_CloseScriptTab extends Operator {
  static operatorName = "code.close_script_tab";

  static operatorLabel = "Close Script Tab";

  static operatorOptions = ["REGISTER"];

  constructor(context, scriptGuid) {
    super(context);

    this.scriptGuid = scriptGuid;

    this.closedScript = null;
  }

  async execute() {
    if (!this.scriptGuid) {
      console.warn('[CODE_CloseScriptTab] No scriptGuid provided');

      return { status: "CANCELLED" };
    }

    const codeCollection = AECO_tools.code.editor.getScript(this.scriptGuid);

    if (codeCollection) {
      this.closedScript = {
        guid: codeCollection.guid,
        name: codeCollection.name,
        code: codeCollection.code,
        language: codeCollection.language,
      };
    }

    this.context.signals.scriptTabClosed.dispatch({ guid: this.scriptGuid });

    return { status: "FINISHED" };
  }

  async undo() {
    if (this.closedScript) {
      const codeCollection = AECO_tools.code.editor.getScript(this.closedScript.guid);

      if (codeCollection) {
        await ScriptingCore.openScript(this.closedScript.guid, {
          codeTool: AECO_tools.code.editor,
          context: this.context,
          editorContainer: this.context._scriptEditorContainer,
        });
      }
    }

    return { status: "CANCELLED" };
  }
}

/**
 * Create template scripts from pre-defined code templates
 * Called during module initialization to provide starter scripts
 */
class CODE_CreateTemplateScripts extends Operator {
  static operatorName = "code.create_template_scripts";

  static operatorLabel = "Create Template Scripts";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.createdScripts = [];
  }

  async execute() {
    const codeTool = AECO_tools.code.editor;

    const existingScripts = codeTool.getScriptNames();

    for (const template of templateScripts) {
      
      if (existingScripts.includes(template.name)) {
        continue;
      }

      const language = template.language || "python";

      const codeCollection = await ScriptingCore.newScript(template.name, template.code, language, {
        codeTool,
        context: this.context,
      });

      this.createdScripts.push(codeCollection);
    }

    return { status: "FINISHED" };
  }

  undo() {
    const codeTool = AECO_tools.code.editor;

    for (const collection of this.createdScripts) {
      codeTool.deleteScript(collection);

      codeTool.disposeModel(collection.guid);

      this.context.signals.scriptTabClosed.dispatch({ guid: collection.guid });
    }

    this.createdScripts = [];

    return { status: "CANCELLED" };
  }
}

export default [
  
  CODE_EnablePython,
  CODE_EnableJavaScript,
  CODE_EnableBIM,
  CODE_EnableViewerAPI,
  
  CODE_RunPython,
  CODE_RunJavaScript,
  CODE_RunCode,
  
  CODE_NewScript,
  CODE_UpdateScript,
  CODE_ShowEditor,
  CODE_OpenScript,
  CODE_SaveScript,
  CODE_RunScript,
  CODE_RenameScript,
  
  CODE_SwitchScript,
  CODE_CloseScriptTab,
  
  CODE_CreateTemplateScripts,
];
