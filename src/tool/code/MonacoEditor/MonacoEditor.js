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

    console.log('[MonacoEditor] load() called');
    console.log('[MonacoEditor] _baseUrl (raw config):', this._baseUrl);
    console.log('[MonacoEditor] absoluteBase (resolved):', absoluteBase);
    console.log('[MonacoEditor] loader script URL:', loaderSrc);
    console.log('[MonacoEditor] editor.main.js expected URL:', editorMainUrl);

    this._loadingPromise = new Promise((resolve, reject) => {
      if (window.monaco) {
        console.log('[MonacoEditor] window.monaco already exists, skipping load');
        this.monaco = window.monaco;

        this.loaded = true;

        this._loadingPromise = null;

        resolve();

        return;
      }
      console.log('[MonacoEditor] Pre-flight: fetching editor.main.js to verify content...');
      fetch(editorMainUrl, { method: 'GET' }).then(resp => {
        const ct = resp.headers.get('content-type') || '(none)';
        console.log(`[MonacoEditor] Pre-flight response for editor.main.js: status=${resp.status}, content-type="${ct}"`);
        if (!resp.ok) {
          console.error(`[MonacoEditor] WARNING: editor.main.js returned HTTP ${resp.status}. The server may not be serving this file.`);
        }
        if (ct.includes('text/html')) {
          console.error('[MonacoEditor] PROBLEM DETECTED: editor.main.js is being served as text/html!');
        }
        return resp.text();
      }).then(body => {
        const first80 = body.substring(0, 80);
        console.log('[MonacoEditor] Pre-flight: first 80 chars:', JSON.stringify(first80));
        console.log('[MonacoEditor] Pre-flight: total body length:', body.length);

        const lines = body.split('\n');
        console.log('[MonacoEditor] Pre-flight: total line count:', lines.length);
        for (let i = 0; i < Math.min(lines.length, 8); i++) {
          console.log(`[MonacoEditor] Pre-flight: line ${i + 1} length: ${lines[i].length} chars`);
        }
        if (lines.length >= 6) {
          const line6 = lines[5];
          const errorCol = 60155;
          const start = Math.max(0, errorCol - 40);
          const end = Math.min(line6.length, errorCol + 40);
          console.log(`[MonacoEditor] Pre-flight: line 6 around col ${errorCol}:`, JSON.stringify(line6.substring(start, end)));
          console.log(`[MonacoEditor] Pre-flight: line 6 char at col ${errorCol}:`, JSON.stringify(line6.charAt(errorCol)));
          const httpsIdx = line6.indexOf('https', errorCol - 100);
          if (httpsIdx !== -1 && httpsIdx < errorCol + 100) {
            console.log(`[MonacoEditor] Pre-flight: found 'https' near error position at col ${httpsIdx}:`, JSON.stringify(line6.substring(httpsIdx - 20, httpsIdx + 40)));
          }
        }
        const firstNul = body.indexOf('\0');
        if (firstNul !== -1) {
          console.error(`[MonacoEditor] PROBLEM DETECTED: file contains NUL byte at position ${firstNul}`);
        }

        if (first80.trimStart().startsWith('<')) {
          console.error('[MonacoEditor] PROBLEM DETECTED: body starts with HTML markup!');
        }
        try {
          new Function(body);
          console.log('[MonacoEditor] Pre-flight: syntax check PASSED (body parses as valid JS)');
        } catch (syntaxErr) {
          console.error('[MonacoEditor] Pre-flight: syntax check FAILED:', syntaxErr.message);
        }
      }).catch(err => {
        console.warn('[MonacoEditor] Pre-flight fetch failed (non-blocking):', err.message);
      });

      const script = document.createElement('script');

      script.src = loaderSrc;
      script.type = 'text/javascript';

      console.log('[MonacoEditor] Appending loader script tag to <head>...');

      script.onload = () => {

        console.log('[MonacoEditor] Loader script onload fired');
        console.log('[MonacoEditor] typeof window.require:', typeof window.require);
        console.log('[MonacoEditor] typeof window.require?.config:', typeof window.require?.config);
        console.log('[MonacoEditor] typeof window.define:', typeof window.define);

        if (typeof window.require?.config !== 'function') {
          this._loadingPromise = null;
          const msg = `Monaco AMD loader did not initialise. The file at "${loaderSrc}" was loaded but window.require.config is not a function. ` +
            `This usually means the server returned HTML (e.g. a 404 page) instead of JavaScript. ` +
            `Check that the file exists and is served with Content-Type: application/javascript.`;
          console.error('[MonacoEditor]', msg);
          reject(new Error(msg));
          return;
        }

        const requireConfig = { baseUrl: absoluteBase + '/' };
        console.log('[MonacoEditor] Calling require.config with:', JSON.stringify(requireConfig));
        window.require.config(requireConfig);

        console.log('[MonacoEditor] Calling require(["vs/editor/editor.main"]) ...');
        window.require(['vs/editor/editor.main'], () => {
          console.log('[MonacoEditor] editor.main loaded successfully, window.monaco:', !!window.monaco);
          this.monaco = window.monaco;

          window.require(['vs/basic-languages/python/python'], (pythonLang) => {
    
              const langId = 'python';

              this.monaco.languages.setMonarchTokensProvider(langId, pythonLang.language);

              this.monaco.languages.setLanguageConfiguration(langId, pythonLang.conf);
            
          });
          this.loaded = true;

          this._loadingPromise = null;

          resolve();
        }, (err) => {
          this._loadingPromise = null;

          const msg = `Monaco editor module failed to load. ` +
            `Check that "${editorMainUrl}" exists and is served as JavaScript (not HTML). ` +
            `Original error: ${err}`;
          console.error('[MonacoEditor]', msg);
          reject(new Error(msg));
        });

      };

      script.onerror = (evt) => {
        this._loadingPromise = null;

        const msg = `Failed to load Monaco loader script from "${loaderSrc}". Check the path and server configuration.`;
        console.error('[MonacoEditor]', msg, evt);
        reject(new Error(msg));
      };

      document.head.appendChild(script);
    });

    return this._loadingPromise;
  }

  getEditor() {
    return this._editorInstance;
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
      console.warn('[MonacoEditor] No editor instance to switch model');

      return false;
    }

    const model = this._models.get(guid);

    if (!model) {
      console.warn('[MonacoEditor] Model not found for guid:', guid);

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
