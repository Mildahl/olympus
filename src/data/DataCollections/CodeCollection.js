import { Collection, _generateGuid } from "./Collection.js";

class CodeCollection extends Collection {
  constructor(initialCode = '', guid = null) {
    super();

    this.type = 'CodeCollection';

    this.guid = guid || _generateGuid();

    this.initialCode = initialCode;

    this.code = initialCode;

    this.currentCode = initialCode;

    this.runCount = 0;

    this.lastRun = null;

    this.lastSave = null;

    this.language = 'python'; 
  }

  saveCode(code) {
    if (code) {
      this.currentCode = code;
    }

    this.code = this.currentCode;

    this.lastSave = new Date();
  }

  updateCode(code) {
    this.currentCode = code;
  }

  reset() {
    this.currentCode = this.code;
  }

  setLanguage(language) {
    this.language = language;
  }
}

export { CodeCollection };
