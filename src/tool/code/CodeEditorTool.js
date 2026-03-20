import dataStore, {
  CodeCollection,
  TerminalCollection,
} from "../../data/index.js";

import { MonacoEditor } from "./MonacoEditor/MonacoEditor.js";

class CodeEditorTool {
  static monacoEditor = new MonacoEditor();

  static editors = new Map();

  static activeScriptGuid = null;

  static storeScript(initialCode = "", name = null, language = null) {
    const collection = new CodeCollection(initialCode);

    if (name) collection.name = name;

    if (language) collection.language = language;
    dataStore.registerCollection(collection.guid, collection);

    return collection;
  }

  static getScript(guid) {
    return dataStore.getCollectionByGuid(guid);
  }

  static getScriptNames() {
    const codeCollections = dataStore.getCollections('CodeCollection');

    return codeCollections.map(c => c.name);
  }

  static updateCount(collection, newCode) {
    
    collection.lastRun = new Date();

    collection.runCount += 1;
  }

  static refreshScriptStorage(guid, newCode) {

    const collection = CodeEditorTool.getScript(guid);

    collection.saveCode(newCode);

    return collection;
  }

  static deleteScript(collection) {
    const guid = collection.guid;

    if (guid) {
      dataStore.unregisterCollection(guid);

      //TODO CORE context.signals.newScript.dispatch(false);

      return true;
    }

    return false;
  }

  static async loadMonaco() {
    if (CodeEditorTool.monacoEditor.loaded) return true;

    await CodeEditorTool.monacoEditor.load();

    CodeEditorTool.monacoEditor.loaded = true;

    return true;
  }

  static createCodeEditor(container) {
    return CodeEditorTool.monacoEditor.createCodeEditor(container);
  }

  static getCodeEditor() {
    return CodeEditorTool.monacoEditor.getEditor();
  }

  static getEditorContainer() {
    return CodeEditorTool.monacoEditor._editorContainer;
  }

  static hasScriptEditor(globalId) {
    return CodeEditorTool.monacoEditor.hasModel(globalId);
  }

  static createScriptModel(guid, code, language) {
    return CodeEditorTool.monacoEditor.createScriptModel(guid, code, language);
  }

  static activateScript(guid) {
    const switched = CodeEditorTool.monacoEditor.activateScript(guid);

    if (switched) {
      CodeEditorTool.activeScriptGuid = guid;
    }

    return switched;
  }

  static getCode(guid) {
    return CodeEditorTool.monacoEditor.getModelValue(guid);
  }

  static setCode(guid, code) {
    return CodeEditorTool.monacoEditor.setModelValue(guid, code);
  }

  static getScriptModel(globalId) {
    return CodeEditorTool.monacoEditor.getModel(globalId);
  }

  static disposeModel(guid) {
    return CodeEditorTool.monacoEditor.disposeModel(guid);
  }

  static storeMonacoEditor(globalId, editor) {
    CodeEditorTool.editors.set(globalId, editor);
  }
  static terminals = new Map(); 

  static createTerminal(language = "python") {
    const terminal = new TerminalCollection();

    terminal.language = language;

    dataStore.registerCollection(terminal.guid, terminal);

    this.terminals.set(terminal.guid, terminal);

    return terminal;
  }

  static getTerminal(guid) {
    return dataStore.getCollectionByGuid(guid);
  }

  static getAllTerminals() {
    return dataStore.getCollections("TerminalCollection");
  }

  static deleteTerminal(guid) {
    const terminal = this.terminals.get(guid);

    if (terminal) {
      this.terminals.delete(guid);

      dataStore.unregisterCollection(guid);

      return true;
    }

    return false;
  }

  static async highlightCode(container) {
    await CodeEditorTool.loadMonaco();

    const codeBlocks = container
      ? container.querySelectorAll("pre code")
      : document.querySelectorAll("pre code");

    if (!codeBlocks.length) return;

    for (const code of codeBlocks) {
      
      if (code.classList.contains("monaco-colorized")) continue;
      const langClass = Array.from(code.classList).find((c) =>
        c.startsWith("language-")
      );

      const lang = langClass ? langClass.replace("language-", "") : "python";
      code.setAttribute("data-lang", lang);
      await CodeEditorTool.monacoEditor.colorizeElement(code, {
        theme: "vs-dark",
        mimeType: lang === "python" ? "text/x-python" : undefined,
      });

      code.classList.add("monaco-colorized");
    }

    return;
  }
}

export default CodeEditorTool;
