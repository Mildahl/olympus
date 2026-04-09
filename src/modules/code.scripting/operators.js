import { Operator } from "../../operators/Operator.js";

import AECO_TOOLS from "../../tool/index.js";

import * as Core from "../../core/scripting.js";

import * as BIMCore from "../../core/bim.js";

import { testCode as templateScripts } from "../../tool/code/CodeTemplates.js";

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
    this.wasEnabled = AECO_TOOLS.initialized.python;

    const onMessage = (msg) => console.log('[PYTHON]:', msg);

    const pyodideVersion = this.pyodideVersion || 'v0.29.0';
    
    await Core.enablePython(pyodideVersion, onMessage, {
      context: this.context,
      context: this.context,
      pythonTool: AECO_TOOLS.code.pyWorker,
      codeTool: AECO_TOOLS.code.editor,
    });

    AECO_TOOLS.initialized.python = true;

    return { status: "FINISHED" };
  }

  undo() {
    AECO_TOOLS.initialized.python = this.wasEnabled;

    return { status: "CANCELLED" };
  }
}

class CODE_EnableBIM extends Operator {
  static operatorName = "code.enable_bim";

  static operatorLabel = "Enable BIM";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;

    this.wasEnabled = false;
  }

  poll() {
    return AECO_TOOLS.code.pyWorker.isReady;
  }

  async execute() {
    this.wasEnabled = AECO_TOOLS.code.pyWorker.initialized.bim;

    await Core.enableBIM({
      context: this.context,
      pythonTool: AECO_TOOLS.code.pyWorker,
    });

    AECO_TOOLS.code.pyWorker.initialized.bim = true;

    BIMCore.displayOnSelection({
      sceneTool: AECO_TOOLS.world.scene,
      attributeTool: AECO_TOOLS.bim.attribute,
      psetTool: AECO_TOOLS.bim.pset,
      sequenceTool: AECO_TOOLS.bim.sequence,
      costTool: AECO_TOOLS.bim.cost,
      context: this.context,
    });

    return { status: "FINISHED" };
  }

  undo() {
    AECO_TOOLS.code.pyWorker.initialized.bim = this.wasEnabled;

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
    return AECO_TOOLS.code.pyWorker.isReady;
  }

  async execute() {
    await Core.enableViewerAPI({
      context: this.context,
      pythonTool: AECO_TOOLS.code.pyWorker,
      codeTool: AECO_TOOLS.code.editor,
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
    return AECO_TOOLS.code.pyWorker.isReady;
  }

  async execute() {
    await Core.runPythonCode(this.code, null, {
      context: this.context,
      pythonTool: AECO_TOOLS.code.pyWorker,
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
    await Core.runCode(this.code, {
      context: this.context,
      pythonTool: AECO_TOOLS.code.pyWorker,
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
    const codeCollection = await Core.newScript(this.name, this.code, this.language, {
      codeTool: AECO_TOOLS.code.editor,
      context: this.context,
    });

    this.createdCollection = codeCollection;

    return { status: "FINISHED", codeCollection };
  }

  undo() {
    if (this.createdCollection) {
      AECO_TOOLS.code.editor.deleteScript(this.createdCollection);

      AECO_TOOLS.code.editor.disposeModel(this.createdCollection.guid);

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

    const codeCollection = AECO_TOOLS.code.editor.getScript(this.scriptGuid);

    if (!codeCollection) {
      console.error('[CODE_OpenScript] Script not found:', this.scriptGuid);

      return { status: "CANCELLED" };
    }

    this.previousActiveGuid = AECO_TOOLS.code.editor.activeScriptGuid;

    this.context.signals.showCodeEditor.dispatch({ visible: true });

    await Core.enableMonacoEditor({ codeTool: AECO_TOOLS.code.editor, context: this.context });

    const editorContainer = this.context._scriptEditorContainer;

    await Core.openScript(this.scriptGuid, {
      codeTool: AECO_TOOLS.code.editor,
      context: this.context,
      editorContainer,
    });

    return { status: "FINISHED" };
  }

  undo() {
    if (this.previousActiveGuid) {
      Core.activateScript(this.previousActiveGuid, {
        codeTool: AECO_TOOLS.code.editor,
      });

      const codeCollection = AECO_TOOLS.code.editor.getScript(this.previousActiveGuid);

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
    const codeCollection = AECO_TOOLS.code.editor.getScript(this.GlobalId);

    if (codeCollection) {
      this.previousCode = codeCollection.code;
    }

    Core.saveScript(this.GlobalId, null, {
      context: this.context,
      codeTool: AECO_TOOLS.code.editor,
    });

    return { status: "FINISHED" };
  }

  undo() {
    if (this.previousCode !== null) {
      const codeCollection = AECO_TOOLS.code.editor.getScript(this.GlobalId);

      if (codeCollection) {
        codeCollection.saveCode(this.previousCode);

        AECO_TOOLS.code.editor.setCode(this.GlobalId, this.previousCode);
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
    const codeCollection = AECO_TOOLS.code.editor.getScript(this.GlobalId);

    if (codeCollection) {
      this.previousCode = codeCollection.code;
    }

    Core.refreshScript(this.GlobalId, this.newCode, {
      context: this.context,
      codeTool: AECO_TOOLS.code.editor,
      context: this.context,
    });

    return { status: "FINISHED" };
  }

  undo() {
    if (this.previousCode !== null) {
      Core.refreshScript(this.GlobalId, this.previousCode, {
        context: this.context,
        codeTool: AECO_TOOLS.code.editor,
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
    Core.saveScript(this.GlobalId, null, {
      context: this.context,
      codeTool: AECO_TOOLS.code.editor,
    });

    await Core.runScript(this.GlobalId, {
      context: this.context,
      codeTool: AECO_TOOLS.code.editor,
      pythonTool: AECO_TOOLS.code.pyWorker,
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
    const script = AECO_TOOLS.code.editor.getScript(this.scriptGuid);

    if (script) {
      this.previousName = script.name;
    }

    Core.renameScript(this.scriptGuid, this.newName, {
      codeTool: AECO_TOOLS.code.editor,
      context: this.context,
    });

    return { status: "FINISHED" };
  }

  undo() {
    if (this.previousName !== null) {
      Core.renameScript(this.scriptGuid, this.previousName, {
        codeTool: AECO_TOOLS.code.editor,
        context: this.context,
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

    const codeCollection = AECO_TOOLS.code.editor.getScript(this.scriptGuid);

    if (!codeCollection) {
      console.error('[CODE_SwitchScript] Script not found:', this.scriptGuid);

      return { status: "CANCELLED" };
    }

    this.previousActiveGuid = AECO_TOOLS.code.editor.activeScriptGuid;

    const switched = Core.activateScript(this.scriptGuid, {
      codeTool: AECO_TOOLS.code.editor,
    });

    if (switched) {
      
      this.context.signals.openScript.dispatch({ codeCollection });
    }

    return { status: "FINISHED" };
  }

  undo() {
    if (this.previousActiveGuid) {
      const switched = Core.activateScript(this.previousActiveGuid, {
        codeTool: AECO_TOOLS.code.editor,
      });

      if (switched) {
        const codeCollection = AECO_TOOLS.code.editor.getScript(this.previousActiveGuid);

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

    const codeCollection = AECO_TOOLS.code.editor.getScript(this.scriptGuid);

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
      const codeCollection = AECO_TOOLS.code.editor.getScript(this.closedScript.guid);

      if (codeCollection) {
        await Core.openScript(this.closedScript.guid, {
          codeTool: AECO_TOOLS.code.editor,
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
    const codeTool = AECO_TOOLS.code.editor;

    const existingScripts = codeTool.getScriptNames();

    for (const template of templateScripts) {
      
      if (existingScripts.includes(template.name)) {
        continue;
      }

      const language = template.language || "python";

      const codeCollection = await Core.newScript(template.name, template.code, language, {
        codeTool,
        context: this.context,
      });

      this.createdScripts.push(codeCollection);
    }

    return { status: "FINISHED" };
  }

  undo() {
    const codeTool = AECO_TOOLS.code.editor;

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
  CODE_RunPython,
  CODE_RunCode,
  CODE_EnableBIM,
  CODE_EnableViewerAPI,

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
