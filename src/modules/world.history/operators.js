import { Operator } from "../../operators/Operator.js";

class HistoryUndo extends Operator {
  static operatorName = "history.undo";

  static operatorLabel = "Undo";

  static operatorOptions = ["REGISTER", "SKIP_HISTORY"];

  constructor(context) {
    super(context);

    this.context = context;
  }

  poll() {
    return this.context.editor && 
           this.context.editor.history && 
           this.context.editor.history.undos.length > 0;
  }

  execute() {
    this.context.editor.history.undo();

    return { status: "FINISHED" };
  }
}

class HistoryRedo extends Operator {
  static operatorName = "history.redo";

  static operatorLabel = "Redo";

  static operatorOptions = ["REGISTER", "SKIP_HISTORY"];

  constructor(context) {
    super(context);

    this.context = context;
  }

  poll() {
    return this.context.editor && 
           this.context.editor.history && 
           this.context.editor.history.redos.length > 0;
  }

  execute() {
    this.context.editor.history.redo();

    return { status: "FINISHED" };
  }
}

class HistoryClear extends Operator {
  static operatorName = "history.clear";

  static operatorLabel = "Clear History";

  static operatorOptions = ["REGISTER", "SKIP_HISTORY"];

  constructor(context, skipConfirm = false) {
    super(context);

    this.context = context;

    this.skipConfirm = skipConfirm;
  }

  poll() {
    return this.context.editor && this.context.editor.history;
  }

  execute() {
    const strings = this.context.editor.strings;

    if (!this.skipConfirm) {
      const confirmMessage = strings?.getKey('prompt/history/clear') || 'Clear history?';

      if (!confirm(confirmMessage)) {
        return { status: "CANCELLED" };
      }
    }

    this.context.editor.history.clear();

    return { status: "FINISHED" };
  }
}

class HistoryGoToState extends Operator {
  static operatorName = "history.go_to_state";

  static operatorLabel = "Go To History State";

  static operatorOptions = ["REGISTER", "SKIP_HISTORY"];

  constructor(context, stateId) {
    super(context);

    this.context = context;

    this.stateId = stateId;
  }

  poll() {
    return this.context.editor && 
           this.context.editor.history && 
           this.stateId !== undefined;
  }

  execute() {
    this.context.editor.history.goToState(this.stateId);

    return { status: "FINISHED" };
  }
}

export default [
  HistoryUndo,
  HistoryRedo,
  HistoryClear,
  HistoryGoToState
];
