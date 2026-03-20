/**
 * Terminal Core Functions
 * 
 * Core business logic for interactive terminal sessions.
 * These functions are called by operators and should remain decoupled from UI.
 */
/**
 * Create a new terminal session
 * @param {string} language - 'python' or 'javascript'
 * @param {Object} options
 * @param {Object} options.codeTool - Code editor tool
 * @param {Object} options.signals - Context signals
 */
async function newTerminal(language = 'python', { codeTool, signals }) {
  const terminal = codeTool.createTerminal(language);

  signals.newTerminal.dispatch(terminal.guid);

  return terminal;
}

/**
 * Open a terminal UI window
 * @param {string} terminalGuid - Terminal GUID
 * @param {Object} options
 */
async function openTerminal(terminalGuid, { codeTool, signals }) {
  const terminal = codeTool.getTerminal(terminalGuid);

  if (!terminal) {
    throw new Error(`No terminal found with GUID: ${terminalGuid}`);
  }

  signals.openTerminal.dispatch(terminal);
}

/**
 * Execute a command in a terminal session
 * @param {string} command - Command to execute
 * @param {string} terminalGuid - Terminal GUID
 * @param {Object} options
 */
async function executeTerminalCommand(command, terminalGuid, { signals, pythonTool, jsTool, codeTool }) {
  if (!command || !command.trim()) {
    return { success: false, output: '' };
  }

  const terminal = codeTool.getTerminal(terminalGuid);

  if (!terminal) {
    throw new Error(`No terminal found with GUID: ${terminalGuid}`);
  }

  terminal.isExecuting = true;

  signals.terminalExecuting.dispatch({ terminalGuid, isExecuting: true });

  let result;

  let success = true;

  try {
    if (terminal.language === 'javascript') {
      const jsResult = await jsTool.execute(command);

      result = jsResult;

      if (jsResult && typeof jsResult === 'object' && jsResult.success === false) {
        success = false;

        result = jsResult.message || String(jsResult);
      }
    } else {
      result = await pythonTool.execute(command);
      if (result && typeof result === 'string' && result.includes('Error')) {
        success = false;
      }
    }
  } catch (error) {
    success = false;

    result = error.message || String(error);
  }

  terminal.isExecuting = false;
  const output = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result || '');
  terminal.addCommand(command, output, success);
  signals.terminalOutput.dispatch({
    terminalGuid,
    command,
    output,
    success,
    timestamp: new Date()
  });

  signals.terminalExecuting.dispatch({ terminalGuid, isExecuting: false });

  return { success, output };
}

/**
 * Clear terminal history
 * @param {string} terminalGuid - Terminal GUID
 * @param {Object} options
 */
function clearTerminal(terminalGuid, { codeTool, signals }) {
  const terminal = codeTool.getTerminal(terminalGuid);

  if (terminal) {
    terminal.clearHistory();

    signals.terminalCleared.dispatch(terminalGuid);
  }
}

/**
 * Change terminal language
 * @param {string} terminalGuid - Terminal GUID
 * @param {string} language - 'python' or 'javascript'
 * @param {Object} options
 */
function setTerminalLanguage(terminalGuid, language, { codeTool, signals }) {
  const terminal = codeTool.getTerminal(terminalGuid);

  if (terminal) {
    terminal.setLanguage(language);

    signals.terminalLanguageChanged.dispatch({ terminalGuid, language });
  }
}

/**
 * Rename a terminal
 * @param {string} terminalGuid - Terminal GUID
 * @param {string} newName - New name
 * @param {Object} options
 */
function renameTerminal(terminalGuid, newName, { codeTool, signals }) {
  const terminal = codeTool.getTerminal(terminalGuid);

  if (!terminal) {
    throw new Error(`No terminal found with GUID: ${terminalGuid}`);
  }

  terminal.name = newName;

  signals.terminalNameChanged.dispatch({ guid: terminalGuid, name: newName });
}

export {
  newTerminal,
  openTerminal,
  executeTerminalCommand,
  clearTerminal,
  setTerminalLanguage,
  renameTerminal,
};
