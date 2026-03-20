import { Collection, _generateGuid } from "./Collection.js";

/**
 * TerminalCollection - Stores terminal session history and state
 */
class TerminalCollection extends Collection {
  constructor(guid = null) {
    super();

    this.type = 'TerminalCollection';

    this.guid = guid || _generateGuid();

    this.name = 'Terminal';

    this.language = 'python'; 

    this.history = []; 

    this.commandHistory = []; 

    this.historyIndex = -1; 

    this.isExecuting = false;

    this.createdAt = new Date();
  }

  addCommand(input, output, success = true) {
    const entry = {
      input,
      output,
      timestamp: new Date(),
      success
    };

    this.history.push(entry);
    if (input && (this.commandHistory.length === 0 || 
        this.commandHistory[this.commandHistory.length - 1] !== input)) {
      this.commandHistory.push(input);
    }

    this.historyIndex = this.commandHistory.length;

    return entry;
  }

  getPreviousCommand() {
    if (this.commandHistory.length === 0) return '';

    if (this.historyIndex > 0) {
      this.historyIndex--;
    }

    return this.commandHistory[this.historyIndex] || '';
  }

  getNextCommand() {
    if (this.commandHistory.length === 0) return '';

    if (this.historyIndex < this.commandHistory.length - 1) {
      this.historyIndex++;

      return this.commandHistory[this.historyIndex];
    }

    this.historyIndex = this.commandHistory.length;

    return '';
  }

  clearHistory() {
    this.history = [];
  }

  setLanguage(language) {
    this.language = language;
  }
}

export { TerminalCollection };
