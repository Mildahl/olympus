/**
 * Terminal Operators
 * 
 * Operators for terminal session management and command execution.
 */
import { Operator } from "../../operators/Operator.js";

import AECO_TOOLS from "../../tool/index.js";

import * as TerminalCore from "../../core/terminal.js";
class TERMINAL_New extends Operator {
  static operatorName = "terminal.new";

  static operatorLabel = "New Terminal";

  static operatorOptions = ["REGISTER"];

  constructor(context, language = 'python') {
    super(context);

    this.language = language;
  }

  async execute() {
    const terminal = await TerminalCore.newTerminal(this.language, {
      codeTool: AECO_TOOLS.code.editor,
      signals: this.context.signals,
    });

    return { status: "FINISHED", terminal };
  }
}

class TERMINAL_Open extends Operator {
  static operatorName = "terminal.open";

  static operatorLabel = "Open Terminal";

  static operatorOptions = ["REGISTER"];

  constructor(context, terminalGuid) {
    super(context);

    this.terminalGuid = terminalGuid;
  }

  async execute() {
    await TerminalCore.openTerminal(this.terminalGuid, {
      codeTool: AECO_TOOLS.code.editor,
      signals: this.context.signals,
    });

    return { status: "FINISHED" };
  }
}

class TERMINAL_Execute extends Operator {
  static operatorName = "terminal.execute";

  static operatorLabel = "Execute Terminal Command";

  static operatorOptions = ["REGISTER"];

  constructor(context, command, terminalGuid) {
    super(context);

    this.command = command;

    this.terminalGuid = terminalGuid;
  }

  async execute() {
    const result = await TerminalCore.executeTerminalCommand(this.command, this.terminalGuid, {
      signals: this.context.signals,
      pythonTool: AECO_TOOLS.code.pyWorker,
      jsTool: AECO_TOOLS.code.js,
      codeTool: AECO_TOOLS.code.editor,
    });

    return { status: "FINISHED", ...result };
  }
}

class TERMINAL_Clear extends Operator {
  static operatorName = "terminal.clear";

  static operatorLabel = "Clear Terminal";

  static operatorOptions = ["REGISTER"];

  constructor(context, terminalGuid) {
    super(context);

    this.terminalGuid = terminalGuid;
  }

  execute() {
    TerminalCore.clearTerminal(this.terminalGuid, {
      codeTool: AECO_TOOLS.code.editor,
      signals: this.context.signals,
    });

    return { status: "FINISHED" };
  }
}

class TERMINAL_SetLanguage extends Operator {
  static operatorName = "terminal.set_language";

  static operatorLabel = "Set Terminal Language";

  static operatorOptions = ["REGISTER"];

  constructor(context, terminalGuid, language) {
    super(context);

    this.terminalGuid = terminalGuid;

    this.language = language;
  }

  execute() {
    TerminalCore.setTerminalLanguage(this.terminalGuid, this.language, {
      codeTool: AECO_TOOLS.code.editor,
      signals: this.context.signals,
    });

    return { status: "FINISHED" };
  }
}

class TERMINAL_Rename extends Operator {
  static operatorName = "terminal.rename";

  static operatorLabel = "Rename Terminal";

  static operatorOptions = ["REGISTER"];

  constructor(context, terminalGuid, newName) {
    super(context);

    this.terminalGuid = terminalGuid;

    this.newName = newName;
  }

  async execute() {
    TerminalCore.renameTerminal(this.terminalGuid, this.newName, {
      codeTool: AECO_TOOLS.code.editor,
      signals: this.context.signals,
    });

    return { status: "FINISHED" };
  }
}

export default [
  TERMINAL_New,
  TERMINAL_Open,
  TERMINAL_Execute,
  TERMINAL_Clear,
  TERMINAL_SetLanguage,
  TERMINAL_Rename,
];
