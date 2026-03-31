/** Default relative path when monacoBaseUrl is not set (serve vendor/monaco-editor/<version> next to app). */
const MONACO_DEFAULT_VERSION = '0.52.2';
const MONACO_DEFAULT_RELATIVE_BASE = `vendor/monaco-editor/${MONACO_DEFAULT_VERSION}`;

export class MonacoEditor {
  constructor() {
    this.loaded = false;

    this.monaco = null;

    this._loadingPromise = null;

    this._models = new Map();

    this._viewStates = new Map();

    this._activeModelGuid = null;

    this._editorInstance = null;

    this._editorContainer = null;

    /** Base URL for Monaco min/ (set from config or default). No trailing slash. */
    this._baseUrl = null;
  }

  /**
   * Set base URL for Monaco (loader and require baseUrl). Call before load() when config is available.
   * @param {string|null} url - e.g. "/external/vendor/monaco-editor/0.52.2" or "vendor/monaco-editor/0.52.2". null = use default relative path.
   */
  setBaseUrl(url) {
    this._baseUrl = url;
  }

  _getAbsoluteBaseUrl() {
    const base = this._baseUrl ?? MONACO_DEFAULT_RELATIVE_BASE;
    if (base.startsWith('http://') || base.startsWith('https://')) {
      return base.replace(/\/$/, '');
    }
    return new URL(base.replace(/\/$/, ''), window.location.href).href;
  }

  async load() {
    if (this.loaded) return;

    if (this._loadingPromise) return this._loadingPromise;

    const absoluteBase = this._getAbsoluteBaseUrl();
    const loaderSrc = `${absoluteBase}/vs/loader.js`;
    const editorMainUrl = `${absoluteBase}/vs/editor/editor.main.js`;

    this._loadingPromise = new Promise((resolve, reject) => {
      if (window.monaco) {
        this.monaco = window.monaco;

        this.loaded = true;

        this._loadingPromise = null;

        resolve();

        return;
      }

      const script = document.createElement('script');

      script.src = loaderSrc;

      script.type = 'text/javascript';

      script.onload = () => {
        const requireFn = window.require;

        const configFn = requireFn && requireFn.config;

        if (typeof configFn !== 'function') {
          this._loadingPromise = null;

          reject(
            new Error(
              `Monaco AMD loader did not initialise for "${loaderSrc}".`
            )
          );

          return;
        }

        configFn.call(requireFn, { baseUrl: absoluteBase + '/' });

        requireFn(
          ['vs/editor/editor.main'],
          () => {
            this.monaco = window.monaco;

            requireFn(['vs/basic-languages/python/python'], (pythonLang) => {
              const langId = 'python';

              this.monaco.languages.setMonarchTokensProvider(
                langId,
                pythonLang.language
              );

              this.monaco.languages.setLanguageConfiguration(
                langId,
                pythonLang.conf
              );
            });

            this.loaded = true;

            this._loadingPromise = null;

            resolve();
          },
          (err) => {
            this._loadingPromise = null;

            reject(
              new Error(
                `Monaco editor failed to load from "${editorMainUrl}". ${err}`
              )
            );
          }
        );
      };

      script.onerror = () => {
        this._loadingPromise = null;

        reject(new Error(`Failed to load Monaco loader from "${loaderSrc}".`));
      };

      document.head.appendChild(script);
    });

    return this._loadingPromise;
  }

  getEditor() {
    return this._editorInstance;
  }

  layout() {
    const editorInstance = this._editorInstance;

    if (editorInstance && typeof editorInstance.layout === 'function') {
      editorInstance.layout();
    }
  }

  colorizeText(dom) {
    this.monaco.editor.colorizeElement(dom, {});
  }

  createCodeEditor(container) {

    if (this._editorInstance) {
      
      if (this._editorContainer !== container) {

        container.appendChild(this._editorInstance.getDomNode());

        this._editorContainer = container;
      }

      return this._editorInstance;
    }

    const settings = {
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: true }
    };

    this._editorInstance = this.monaco.editor.create(container, settings);

    this._editorContainer = container;

    return this._editorInstance;
  }
  hasModel(guid) {
    return this._models.has(guid);
  }

  createScriptModel(guid, code, language = 'python') {
    if (!this.loaded) throw new Error('Monaco not loaded');

    if (this._models.has(guid)) {
      return this._models.get(guid);
    }

    const uri = this.monaco.Uri.parse(`file:///${guid}`);

    const model = this.monaco.editor.createModel(code, language, uri);

    this._models.set(guid, model);

    return model;
  }

  getModel(guid) {
    return this._models.get(guid);
  }

  activateScript(guid) {
    if (!this._editorInstance) {
      return false;
    }

    const model = this._models.get(guid);

    if (!model) {
      return false;
    }

    this._editorInstance.setModel(model);

    this._activeModelGuid = guid;

    const savedViewState = this._viewStates.get(guid);

    if (savedViewState) {
      this._editorInstance.restoreViewState(savedViewState);
    }

    return true;
  }
  saveCurrentScript() {
    
    const activeScript = this.getActiveScriptGuid();

    if (activeScript) {
      const viewState = this._editorInstance.saveViewState();

      if (viewState) {
        this._viewStates.set(activeScript, viewState);
      }
      
    }

  }

  clearActiveEditor() {
    if (this._editorInstance) {
      this.saveCurrentScript();
      this._editorInstance.setModel(null);
    }
    this._activeModelGuid = null;
  }

  getActiveScriptGuid() {
    return this._activeModelGuid;
  }

  getModelValue(guid) {
    const model = this._models.get(guid);

    return model ? model.getValue() : null;
  }

  setModelValue(guid, code) {
    const model = this._models.get(guid);

    if (model) {
      model.setValue(code);

      return true;
    }

    return false;
  }

  setModelLanguage(guid, language) {
    const model = this._models.get(guid);

    if (model) {
      this.monaco.editor.setModelLanguage(model, language);

      return true;
    }

    return false;
  }

  disposeModel(guid) {
    const model = this._models.get(guid);

    if (model) {
      model.dispose();

      this._models.delete(guid);

      this._viewStates.delete(guid);

      if (this._activeModelGuid === guid) {
        this._activeModelGuid = null;

        if (this._editorInstance) {
          this._editorInstance.setModel(null);
        }
      }

      return true;
    }

    return false;
  }
  registerViewerAPIIntelliSense(apiDefinitions) {

  this.monaco.languages.registerCompletionItemProvider('python', {
      triggerCharacters: ['.'],
      provideCompletionItems: (model, position) => {
        return this._provideCompletionItems(model, position, apiDefinitions);
      }
    });

    this.monaco.languages.registerSignatureHelpProvider('python', {
      signatureHelpTriggerCharacters: ['(', ','],
      provideSignatureHelp: (model, position) => {
        return this._provideSignatureHelp(model, position, apiDefinitions);
      }
    });
  }
  _provideCompletionItems(model, position, apiDefs) {
    const textUntilPosition = model.getValueInRange({
      startLineNumber: position.lineNumber,
      startColumn: 1,
      endLineNumber: position.lineNumber,
      endColumn: position.column
    });

    const suggestions = [];

    const word = model.getWordUntilPosition(position);

    const range = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endColumn: word.endColumn
    };
    const beforeWord = textUntilPosition.substring(0, word.startColumn - 1);

    const dotMatch = beforeWord.match(/([\w.]+)\.\s*$/);

    const currentWord = word.word || '';

    if (dotMatch) {
      const path = dotMatch[1];

      const parts = path.split('.');
      const allKeys = [
        ...Object.keys(apiDefs.tools || {}).map(k => ({ key: k, type: 'tools', def: apiDefs.tools[k] })),
        ...Object.keys(apiDefs.operators || {}).map(k => ({ key: `operators.${k}`, type: 'operators', def: apiDefs.operators[k] })),
        ...Object.keys(apiDefs.core || {}).map(k => ({ key: k, type: 'core', def: apiDefs.core[k] }))
      ];

      const pathPrefix = path + '.';
      const matchingKeys = allKeys.filter(({ key }) => key.startsWith(pathPrefix));
      const nextLevelItems = new Set();

      matchingKeys.forEach(({ key, type, def }) => {
        const remaining = key.substring(pathPrefix.length);

        const nextPart = remaining.split('.')[0];
        
        if (nextPart && !remaining.includes('.', 1)) {
          
          if (!currentWord || nextPart.toLowerCase().startsWith(currentWord.toLowerCase())) {
            suggestions.push({
              label: nextPart,
              kind: this.monaco.languages.CompletionItemKind.Method,
              detail: def.signature || nextPart,
              documentation: def.description || '',
              insertText: nextPart,
              range: range
            });
          }
        } else if (nextPart) {
          
          nextLevelItems.add(nextPart);
        }
      });
      nextLevelItems.forEach(item => {
        if (!currentWord || item.toLowerCase().startsWith(currentWord.toLowerCase())) {
          suggestions.push({
            label: item,
            kind: this.monaco.languages.CompletionItemKind.Class,
            detail: `${path}.${item}`,
            documentation: `${item} namespace`,
            insertText: item,
            range: range
          });
        }
      });
    } else {
      
      const fileContent = model.getValue();

      const hasViewerImport = /(?:from\s+viewer\s+import|import\s+viewer)/.test(fileContent);
      
      if (/^\s*(?:from|import)\s+\w*$/.test(textUntilPosition) && !hasViewerImport) {
        suggestions.push({
          label: 'viewer',
          kind: this.monaco.languages.CompletionItemKind.Module,
          detail: 'ViewerAPI module',
          documentation: 'Import AECO viewer functionality (tools, operators, core)',
          insertText: 'viewer',
          range: range
        });
      }
      
      if (/from\s+viewer\s+import\s+[\w,\s]*$/.test(textUntilPosition)) {
        ['tools', 'operators', 'core'].forEach(ns => {
          suggestions.push({
            label: ns,
            kind: this.monaco.languages.CompletionItemKind.Module,
            detail: `ViewerAPI ${ns} namespace`,
            documentation: `Access ${ns} functionality from the viewer`,
            insertText: ns,
            range: range
          });
        });
      }
      
      if (hasViewerImport) {
        ['tools', 'operators', 'core'].forEach(ns => {
          suggestions.push({
            label: ns,
            kind: this.monaco.languages.CompletionItemKind.Module,
            detail: `ViewerAPI ${ns} namespace`,
            insertText: ns,
            range: range
          });
        });
      }
    }

    return { suggestions };
  }
  _provideSignatureHelp(model, position, apiDefs) {
    const textUntilPosition = model.getValueInRange({
      startLineNumber: position.lineNumber,
      startColumn: 1,
      endLineNumber: position.lineNumber,
      endColumn: position.column
    });
    const functionMatch = textUntilPosition.match(/([\w.]+)\s*\(([^)]*)$/);

    if (!functionMatch) return null;

    const fullPath = functionMatch[1];

    const currentArgs = functionMatch[2];

    const paramIndex = currentArgs ? currentArgs.split(',').length - 1 : 0;
    let signature = null;

    let documentation = '';
    if (apiDefs.tools && apiDefs.tools[fullPath]) {
      signature = apiDefs.tools[fullPath].signature;

      documentation = apiDefs.tools[fullPath].description || '';
    }
    
    else if (apiDefs.operators && apiDefs.operators[fullPath]) {
      signature = apiDefs.operators[fullPath].signature;

      documentation = apiDefs.operators[fullPath].description || '';
    }
    
    else if (apiDefs.core && apiDefs.core[fullPath]) {
      signature = apiDefs.core[fullPath].signature;

      documentation = apiDefs.core[fullPath].description || '';
    }

    if (!signature) return null;
    const paramMatch = signature.match(/\(([^)]*)\)/);

    const params = paramMatch ? paramMatch[1].split(',').map(p => p.trim()).filter(Boolean) : [];

    return {
      value: {
        signatures: [{
          label: signature,
          documentation: documentation,
          parameters: params.map(param => ({
            label: param,
            documentation: ''
          }))
        }],
        activeSignature: 0,
        activeParameter: Math.min(paramIndex, params.length - 1)
      },
      dispose: () => {}
    };
  }
  
}
