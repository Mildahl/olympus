/**
 * Output Utilities for Code Editor
 * 
 * Shared utilities for handling console output, error parsing, and markers.
 */

/**
 * Format output with script execution header
 * @param {string} scriptName - Name of the script
 * @param {string} language - 'python' or 'javascript'
 * @returns {string} Formatted header string
 */
export function formatScriptHeader(scriptName, language = 'python') {
  const ext = language === 'python' ? '.py' : '.js';

  const cmd = language === 'python' ? 'python' : 'node';

  return `>>> ${cmd} ${scriptName}${ext}`;
}

/**
 * Append text to a Monaco editor with optional styling
 * @param {Object} editor - Monaco editor instance
 * @param {string} text - Text to append
 * @param {string} type - Output type: 'stdout', 'stderr', 'command'
 * @param {Object} options - Additional options
 */
export function appendToEditor(editor, text, type = 'stdout', options = {}) {
  if (!editor || text === undefined || text === null) return;

  const { scriptName = null, language = null } = options;

  const model = editor.getModel();

  if (!model) return;

  const currentValue = model.getValue();

  const separator = currentValue ? '\n' : '';
  let formattedText = text;

  if (scriptName && type === 'command') {
    formattedText = formatScriptHeader(scriptName, language);
  }

  model.setValue(currentValue + separator + formattedText);
  const lineCount = model.getLineCount();

  editor.revealLine(lineCount);
}

/**
 * Clear a Monaco editor
 */
export function clearEditor(editor) {
  if (!editor) return;

  const model = editor.getModel();

  if (model) {
    model.setValue('');
  }
}

/**
 * Copy editor content to clipboard
 */
export async function copyEditorToClipboard(editor) {
  if (!editor) return;

  const model = editor.getModel();

  if (model) {
    const text = model.getValue();

    try {
      await navigator.clipboard.writeText(text);

    } catch (err) {
      console.error('[OutputUtils] Failed to copy:', err);
    }
  }
}

/**
 * Parse error lines from Python/JavaScript output
 */
export function parseErrorLines(text) {
  const errors = [];

  if (!text) return errors;
  const pythonPattern = /File ".*?", line (\d+)/g;

  let match;

  while ((match = pythonPattern.exec(text)) !== null) {
    errors.push({
      line: parseInt(match[1], 10),
      message: text.substring(match.index, text.indexOf('\n', match.index) || text.length)
    });
  }
  const jsPattern = /(?:at line |:)(\d+)(?::|$)/g;

  while ((match = jsPattern.exec(text)) !== null) {
    const lineNum = parseInt(match[1], 10);

    if (!errors.find(e => e.line === lineNum)) {
      errors.push({
        line: lineNum,
        message: text.substring(Math.max(0, match.index - 50), Math.min(text.length, match.index + 100))
      });
    }
  }

  return errors;
}

/**
 * Set error markers in Monaco editor
 */
export function setErrorMarkers(editor, errors) {
  if (!editor || !window.monaco) return;

  const model = editor.getModel();

  if (!model) return;

  const markers = errors.map(err => ({
    severity: window.monaco.MarkerSeverity.Error,
    message: err.message || 'Error',
    startLineNumber: err.line,
    startColumn: 1,
    endLineNumber: err.line,
    endColumn: model.getLineMaxColumn(err.line) || 1,
  }));

  window.monaco.editor.setModelMarkers(model, 'runtime-errors', markers);
}

/**
 * Clear error markers from Monaco editor
 */
export function clearErrorMarkers(editor) {
  if (!editor || !window.monaco) return;

  const model = editor.getModel();

  if (model) {
    window.monaco.editor.setModelMarkers(model, 'runtime-errors', []);
  }
}

/**
 * Setup click handler to jump to errors in source code
 */
export function setupErrorClickHandler(outputEditor, sourceEditor) {
  if (!outputEditor || !sourceEditor) return;

  outputEditor.onMouseDown((e) => {
    const position = e.target.position;

    if (!position) return;

    const model = outputEditor.getModel();

    if (!model) return;

    const lineContent = model.getLineContent(position.lineNumber);
    const errors = parseErrorLines(lineContent);

    if (errors.length > 0) {
      const targetLine = errors[0].line;

      sourceEditor.revealLineInCenter(targetLine);

      sourceEditor.setPosition({ lineNumber: targetLine, column: 1 });

      sourceEditor.focus();
    }
  });
}
