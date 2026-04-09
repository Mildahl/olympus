/**
 * Terminal UI Components
 * 
 * UI panels for managing and using interactive terminal sessions.
 */
import { Components as UIComponents, BasePanel } from "../../ui/Components/Components.js";

import dataStore from "../../data/index.js";

import FocusManager from "../../utils/FocusManager.js";

import Paths from "../../utils/paths.js";

class TerminalsUI extends BasePanel {
  constructor({ context, operators }) {
    super({
      context,
      operators,
      parentId: "TerminalModule",
      panelStyles: {
        height: "fit-content",
        maxHeight: "60vh",
        minWidth: "fit-content",
        maxWidth: "80vw",
      },
      resizeHandles: ['w', 'n', 'nw'],
      draggable: true,
      position: 'above-left',
      testing: false,
    });

    this.listContainer = null;

    this.searchQuery = "";

    this.draw();

    this.listen(context, operators);
  }

  listen(context, operators) {
    context.signals.newTerminal.add((terminalGuid) => {
      this.updateTerminalsList();
    });

    context.signals.terminalClosed.add((terminalGuid) => {
      this.updateTerminalsList();
    });
  }

  draw() {
    this.clearPanel();

    const headerRow = this.createHeader('Terminals', 'terminal');

    this.header.add(headerRow);

    const terminalActions = UIComponents.row();

    terminalActions
      .setStyle("justify-content", ["space-between"])
      .setStyle("align-items", ["center"])
      .setStyle("padding", ["0.5rem 0.75rem"])

    const addButton = UIComponents.icon("add");

    addButton.addClass("Button");

    addButton.setStyle("cursor", ["pointer"]);

    addButton.onClick(() => {
      this.showNewTerminalDialog();
    });

    terminalActions.add(addButton);

    this.panel.add(terminalActions);

    this.listContainer = UIComponents.column();

    this.listContainer
      .setStyle("overflow-y", ["auto"])
      .setStyle("max-height", ["35vh"]);

    this.panel.add(this.listContainer);

    this.updateTerminalsList();
  }

  updateTerminalsList() {
    if (!this.listContainer) return;

    this.listContainer.clear();

    const allTerminals = dataStore.getCollections("TerminalCollection");

    const terminals = this.searchQuery
      ? allTerminals.filter(
          (term) =>
            term.name &&
            term.name.toLowerCase().includes(this.searchQuery.toLowerCase())
        )
      : allTerminals;

    if (terminals.length === 0) {
      const emptyMessage = UIComponents.text(
        this.searchQuery
          ? "No terminals match your search"
          : "No terminals yet"
      );

      emptyMessage
        .setStyle("padding", ["1rem"])
        .setStyle("text-align", ["center"])
        .setStyle("color", ["var(--theme-text-light)"])
        .setStyle("font-size", ["0.8rem"]);

      this.listContainer.add(emptyMessage);

      return;
    }

    for (const terminal of terminals) {
      const item = this.drawTerminalItem(terminal);

      this.listContainer.add(item);
    }
  }

  drawTerminalItem(terminal) {
    const item = UIComponents.div();

    item.addClass("ListboxItem");

    item
      .setStyle("display", ["flex"])
      .setStyle("flex-direction", ["column"])
      .setStyle("padding", ["0.5rem 0.75rem"])
      .setStyle("border-bottom", ["1px solid var(--border)"])
      .setStyle("cursor", ["pointer"]);

    const mainRow = UIComponents.row();

    mainRow
      .setStyle("justify-content", ["space-between"])
      .setStyle("align-items", ["center"]);

    const leftContent = UIComponents.row();

    leftContent.setStyle("align-items", ["center"]).setStyle("gap", ["0.5rem"]);

    leftContent.setStyle("flex", ["1"]);

    const termIcon = UIComponents.icon("terminal");

    termIcon.setStyle("font-size", ["1rem"]).setStyle("color", ["var(--theme-text-light)"]);

    leftContent.add(termIcon);

    const logoLanguage = UIComponents.image(Paths.data('resources/images/python.svg'));

    logoLanguage.setStyles({
      width: '1rem',
      height: '1rem',
    });

    leftContent.add(logoLanguage);

    const nameContainer = UIComponents.div();

    nameContainer.setStyle("flex", ["1"]);

    const name = UIComponents.text(terminal.name || `Terminal (${terminal.language})`);

    name.addClass("ListboxItem-name");

    nameContainer.add(name);

    nameContainer.dom.addEventListener("dblclick", (e) => {
      e.stopPropagation();

      this.showRenameInput(nameContainer, name, terminal);
    });

    leftContent.add(nameContainer);

    mainRow.add(leftContent);

    const info = UIComponents.row();

    info.setStyle("align-items", ["center"]).setStyle("gap", ["0.25rem"]);

    const countBadge = UIComponents.text().addClass('GameNumber');

    countBadge.setValue(`${terminal.history.length} commands`);

    info.add(countBadge);

    const openButton = UIComponents.operator("open_in_new");

    openButton.addClass("Button");

    openButton.setStyle("cursor", ["pointer"]);

    openButton.onClick((e) => {
      e.stopPropagation();

      this.operators.execute("terminal.open", this.context, terminal.guid);
    });

    info.add(openButton);

    info.addClass("ListboxItem-info");

    mainRow.add(info);

    item.add(mainRow);

    return item;
  }

  filterTerminals(query) {
    this.searchQuery = query;

    this.updateTerminalsList();
  }

  showNewTerminalDialog() {
    
    const overlay = UIComponents.div();

    overlay.setStyle("position", ["fixed"]);

    overlay.setStyle("top", ["0"]);

    overlay.setStyle("left", ["0"]);

    overlay.setStyle("width", ["100vw"]);

    overlay.setStyle("height", ["100vh"]);

    overlay.setStyle("background", ["rgba(0,0,0,0.5)"]);

    overlay.setStyle("display", ["flex"]);

    overlay.setStyle("align-items", ["center"]);

    overlay.setStyle("justify-content", ["center"]);

    overlay.setStyle("z-index", ["10000"]);

    const dialog = UIComponents.column();

    dialog.setStyle("background", ["var(--theme-background)"]);

    dialog.setStyle("border", ["1px solid var(--border)"]);

    dialog.setStyle("border-radius", ["8px"]);

    dialog.setStyle("padding", ["1rem"]);

    dialog.setStyle("min-width", ["300px"]);

    dialog.setStyle("gap", ["0.75rem"]);

    const title = UIComponents.text("New Terminal");

    title.setStyle("font-weight", ["600"]);

    title.setStyle("font-size", ["1rem"]);

    title.setStyle("margin-bottom", ["0.5rem"]);

    dialog.add(title);

    const langLabel = UIComponents.text("Language:");

    langLabel.setStyle("font-size", ["0.8rem"]);

    langLabel.setStyle("color", ["var(--theme-text-light)"]);

    dialog.add(langLabel);

    const langSelect = UIComponents.select();

    langSelect.setOptions({
      "python": "Python",
      "javascript": "JavaScript"
    });

    langSelect.setValue("python");

    langSelect.setStyle("padding", ["0.5rem"]);

    langSelect.setStyle("border", ["1px solid var(--border)"]);

    langSelect.setStyle("border-radius", ["4px"]);

    langSelect.setStyle("background", ["var(--theme-background-2)"]);

    dialog.add(langSelect);

    const buttonsRow = UIComponents.row();

    buttonsRow.setStyle("justify-content", ["flex-end"]);

    buttonsRow.setStyle("gap", ["0.5rem"]);

    buttonsRow.setStyle("margin-top", ["0.5rem"]);

    const cancelBtn = UIComponents.text("Cancel");

    cancelBtn.addClass("Button");

    cancelBtn.setStyle("padding", ["0.5rem 1rem"]);

    cancelBtn.setStyle("cursor", ["pointer"]);

    cancelBtn.setStyle("border-radius", ["4px"]);

    cancelBtn.onClick(() => {
      document.body.removeChild(overlay.dom);
    });

    buttonsRow.add(cancelBtn);

    const createBtn = UIComponents.text("Create");

    createBtn.addClass("Button");

    createBtn.setStyle("padding", ["0.5rem 1rem"]);

    createBtn.setStyle("cursor", ["pointer"]);

    createBtn.setStyle("background", ["var(--primary)"]);

    createBtn.setStyle("color", ["white"]);

    createBtn.setStyle("border-radius", ["4px"]);

    createBtn.onClick(() => {
      const language = langSelect.getValue();

      this.operators.execute("terminal.new", this.context, language);

      document.body.removeChild(overlay.dom);
    });

    buttonsRow.add(createBtn);

    dialog.add(buttonsRow);

    overlay.add(dialog);

    overlay.dom.addEventListener("click", (e) => {
      if (e.target === overlay.dom) {
        document.body.removeChild(overlay.dom);
      }
    });

    document.body.appendChild(overlay.dom);
  }

  showRenameInput(container, nameElement, terminal) {
    nameElement.setStyle("display", ["none"]);

    const currentDisplayName = nameElement.dom.textContent || terminal.name || "";

    const input = UIComponents.input(currentDisplayName);

    input.setStyle("padding", ["0.25rem"]);

    input.setStyle("font-size", ["inherit"]);

    input.setStyle("border", ["1px solid var(--primary)"]);

    input.setStyle("border-radius", ["2px"]);

    input.setStyle("background", ["var(--theme-background-2)"]);

    input.setStyle("width", ["100%"]);

    container.add(input);

    input.dom.focus();

    input.dom.select();

    let finished = false;

    const finishEdit = () => {
      if (finished) return;

      finished = true;

      const newName = input.getValue().trim();

      if (newName && newName !== terminal.name) {
        this.operators.execute("terminal.rename", this.context, terminal.guid, newName);

        nameElement.dom.textContent = newName;
      }

      if (container.dom.contains(input.dom)) {
        container.dom.removeChild(input.dom);
      }

      nameElement.setStyle("display", [""]);
    };

    input.dom.addEventListener("blur", finishEdit);

    input.dom.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();

        finishEdit();
      } else if (e.key === "Escape") {
        finished = true;

        if (container.dom.contains(input.dom)) {
          container.dom.removeChild(input.dom);
        }

        nameElement.setStyle("display", [""]);
      }
    });
  }
}

/**
 * TerminalUI - Interactive command-line terminal interface
 * Allows line-by-line execution of Python or JavaScript commands
 */
class TerminalUI {
  constructor({ context, operators }) {
    this.panels = new Map();

    this.context = context;

    this.operators = operators;

    this.listen(context, operators);
  }

  listen(context, operators) {
    context.signals.newTerminal.add((terminalGuid) => {
      if (!terminalGuid) return;

      const terminal = dataStore.getCollectionByGuid(terminalGuid);

      if (terminal) {
        this._createTerminalWindow(terminal, context, operators);
      }
    });

    context.signals.openTerminal.add((terminal) => {
      const existing = this.panels.get(terminal.guid);

      if (existing) {
        this._showTerminalWindow(existing);
      } else {
        this._createTerminalWindow(terminal, context, operators);
      }
    });

    context.signals.terminalOutput.add(({ terminalGuid, command, output, success, timestamp }) => {
      const panel = this.panels.get(terminalGuid);

      if (panel && panel.outputContainer) {
        this._appendOutput(panel, command, output, success, timestamp);
      }
    });

    context.signals.terminalCleared.add((terminalGuid) => {
      const panel = this.panels.get(terminalGuid);

      if (panel && panel.outputContainer) {
        panel.outputContainer.dom.innerHTML = '';
      }
    });

    context.signals.terminalLanguageChanged.add(({ terminalGuid, language }) => {
      const panel = this.panels.get(terminalGuid);

      if (panel && panel.langBadge) {
        panel.langBadge.setValue(language);

        panel.promptLabel.dom.textContent = language === 'python' ? '>>>' : '>';
      }
    });

    context.signals.terminalExecuting.add(({ terminalGuid, isExecuting }) => {
      const panel = this.panels.get(terminalGuid);

      if (panel) {
        panel.inputField.dom.disabled = isExecuting;

        if (isExecuting) {
          panel.promptLabel.setStyle('color', ['var(--warning)']);
        } else {
          panel.promptLabel.setStyle('color', ['var(--success)']);

          panel.inputField.dom.focus();
        }
      }
    });

    context.signals.terminalNameChanged.add(({ guid, name }) => {
      const panel = this.panels.get(guid);

      if (panel && panel.floatingWindow && panel.floatingWindow.setTitle) {
        const terminal = dataStore.getCollectionByGuid(guid);

        const displayName = name || terminal?.language || "Terminal";

        panel.floatingWindow.setTitle(`Terminal: ${displayName}`);
      }
    });
  }

  _showTerminalWindow(panel) {
    if (!document.body.contains(panel.floatingWindow.dom)) {
      document.body.appendChild(panel.floatingWindow.dom);
    }

    panel.inputField.dom.focus();
  }

  _createTerminalWindow(terminal, context, operators) {
    const guid = terminal.guid;

    const floatingWindow = UIComponents.floatingPanel({
      title: `Terminal: ${terminal.language}`,
    });

    floatingWindow.setIcon("terminal");

    document.body.appendChild(floatingWindow.dom);

    floatingWindow.setSize("50vw", "400px");

    floatingWindow.setStyle("top", ["10vh"]);

    floatingWindow.setStyle("left", ["25vw"]);

    const mainContainer = UIComponents.column();

    mainContainer.addClass("fill-height").addClass("fill-width");

    mainContainer.setStyle("display", ["flex"]);

    mainContainer.setStyle("flex-direction", ["column"]);

    mainContainer.setStyle("background", ["#1e1e1e"]);

    floatingWindow.setContent(mainContainer);

    FocusManager.registerContext('terminal', mainContainer.dom, { priority: 2 });

    const toolbar = UIComponents.row();

    toolbar.setStyle("justify-content", ["space-between"]);

    toolbar.setStyle("align-items", ["center"]);

    toolbar.setStyle("padding", ["0.5rem"]);

    toolbar.setStyle("border-bottom", ["1px solid var(--border)"]);

    toolbar.setStyle("flex-shrink", ["0"]);

    const leftTools = UIComponents.row();

    leftTools.setStyle("gap", ["0.5rem"]);

    leftTools.setStyle("align-items", ["center"]);

    const langLabel = UIComponents.text("Language:");

    langLabel.setStyle("font-size", ["0.75rem"]);

    langLabel.setStyle("color", ["var(--theme-text-light)"]);

    leftTools.add(langLabel);

    const langBadge = UIComponents.badge();

    langBadge.setValue(terminal.language);

    langBadge.setStyle("cursor", ["pointer"]);

    langBadge.onClick(() => {
      const newLang = terminal.language === 'python' ? 'javascript' : 'python';

      operators.execute("terminal.set_language", context, guid, newLang);
    });

    leftTools.add(langBadge);

    toolbar.add(leftTools);

    const rightTools = UIComponents.row();

    rightTools.setStyle("gap", ["0.5rem"]);

    const clearButton = UIComponents.icon("delete_sweep");

    clearButton.addClass("Button");

    clearButton.setStyle("cursor", ["pointer"]);

    clearButton.onClick(() => {
      operators.execute("terminal.clear", context, guid);
    });

    rightTools.add(clearButton);

    toolbar.add(rightTools);

    mainContainer.add(toolbar);

    const outputContainer = UIComponents.column();

    outputContainer.addClass("fill-width");

    outputContainer.setStyle("flex", ["1"]);

    outputContainer.setStyle("overflow-y", ["auto"]);

    outputContainer.setStyle("padding", ["0.5rem"]);

    outputContainer.setStyle("font-family", ["'Consolas', 'Monaco', monospace"]);

    outputContainer.setStyle("font-size", ["13px"]);

    outputContainer.setStyle("color", ["#d4d4d4"]);

    mainContainer.add(outputContainer);

    for (const entry of terminal.history) {
      this._appendOutput({ outputContainer }, entry.input, entry.output, entry.success, entry.timestamp);
    }

    const inputRow = UIComponents.row();

    inputRow.setStyle("padding", ["0.5rem"]);

    inputRow.setStyle("border-top", ["1px solid var(--border)"]);

    inputRow.setStyle("flex-shrink", ["0"]);

    inputRow.setStyle("align-items", ["center"]);

    inputRow.setStyle("gap", ["0.5rem"]);

    inputRow.setStyle("background", ["#252526"]);

    const promptLabel = UIComponents.text(terminal.language === 'python' ? '>>>' : '>');

    promptLabel.setStyle("font-family", ["'Consolas', 'Monaco', monospace"]);

    promptLabel.setStyle("font-weight", ["bold"]);

    promptLabel.setStyle("color", ["var(--success)"]);

    promptLabel.setStyle("flex-shrink", ["0"]);

    inputRow.add(promptLabel);

    const inputField = UIComponents.input('');

    inputField.dom.placeholder = 'Enter command...';

    inputField.setStyle("flex", ["1"]);

    inputField.setStyle("background", ["transparent"]);

    inputField.setStyle("border", ["none"]);

    inputField.setStyle("outline", ["none"]);

    inputField.setStyle("color", ["#d4d4d4"]);

    inputField.setStyle("font-family", ["'Consolas', 'Monaco', monospace"]);

    inputField.setStyle("font-size", ["13px"]);

    inputField.dom.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();

        const command = inputField.getValue().trim();

        if (command) {
          inputField.setValue('');

          operators.execute("terminal.execute", context, command, guid);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();

        const prevCmd = terminal.getPreviousCommand();

        if (prevCmd) inputField.setValue(prevCmd);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();

        const nextCmd = terminal.getNextCommand();

        inputField.setValue(nextCmd);
      } else if (e.key === 'l' && e.ctrlKey) {
        e.preventDefault();

        operators.execute("terminal.clear", context, guid);
      }
    });

    inputRow.add(inputField);

    const runButton = UIComponents.icon("send");

    runButton.addClass("Button");

    runButton.setStyle("cursor", ["pointer"]);

    runButton.setStyle("color", ["var(--success)"]);

    runButton.onClick(() => {
      const command = inputField.getValue().trim();

      if (command) {
        inputField.setValue('');

        operators.execute("terminal.execute", context, command, guid);
      }
    });

    inputRow.add(runButton);

    mainContainer.add(inputRow);

    const panelData = {
      floatingWindow,
      outputContainer,
      inputField,
      promptLabel,
      langBadge,
      terminal
    };

    this.panels.set(guid, panelData);

    setTimeout(() => inputField.dom.focus(), 100);

    return floatingWindow;
  }

  _appendOutput(panel, command, output, success, timestamp) {
    const { outputContainer } = panel;

    const cmdLine = UIComponents.div();

    cmdLine.setStyle("margin-bottom", ["0.25rem"]);

    const cmdPrompt = UIComponents.text('>>> ');

    cmdPrompt.setStyle("color", ["var(--success)"]);

    cmdPrompt.setStyle("font-weight", ["bold"]);

    cmdLine.add(cmdPrompt);

    const cmdText = UIComponents.text(command);

    cmdText.setStyle("color", ["#9cdcfe"]);

    cmdLine.add(cmdText);

    outputContainer.add(cmdLine);

    if (output && output.trim()) {
      const outputLines = output.split('\n');

      for (const line of outputLines) {
        const outLine = UIComponents.div();

        outLine.setStyle("margin-left", ["1rem"]);

        outLine.setStyle("margin-bottom", ["0.125rem"]);

        outLine.setStyle("white-space", ["pre-wrap"]);

        outLine.setStyle("word-break", ["break-all"]);

        if (!success) {
          outLine.setStyle("color", ["#f48771"]);
        } else {
          outLine.setStyle("color", ["#d4d4d4"]);
        }

        outLine.dom.textContent = line;

        outputContainer.add(outLine);
      }
    }

    outputContainer.dom.scrollTop = outputContainer.dom.scrollHeight;
  }
}

export { TerminalsUI, TerminalUI };
