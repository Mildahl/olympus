import { Components as UIComponents, TabPanel } from "../../ui/Components/Components.js";

import { UIHelper } from "../../ui/UIHelper.js";

import AECO_TOOLS from "../../tool/index.js";

import {
  getBIMChatConfig,
  getBIMChatToolCatalog,
} from "./llm.js";

import {
  DEFAULT_MODEL_ID,
  getModelOptions,
  resolveModelInfo,
  estimateContextUsage,
  formatTokenCount,
} from "./llm.models.js";

const STORAGE_KEY = "olympus_llm_chat_tabs_v2";

const TOOL_PREFS_STORAGE_KEY = "olympus_llm_chat_tool_prefs_v1";

const DEFAULT_TAB_TITLE = "Chat";

const CONNECTION_CHECK_DEBOUNCE_MS = 1500;

function loadDisabledToolNamesFromStorage(validToolNames) {
  const validNames = new Set(Array.isArray(validToolNames) ? validToolNames : []);

  try {
    const raw = localStorage.getItem(TOOL_PREFS_STORAGE_KEY);

    if (!raw) {
      return new Set();
    }

    const parsed = JSON.parse(raw);
    const disabledToolNames = Array.isArray(parsed && parsed.disabledToolNames)
      ? parsed.disabledToolNames
      : [];
    const result = new Set();

    for (const name of disabledToolNames) {
      if (typeof name === "string" && validNames.has(name)) {
        result.add(name);
      }
    }

    return result;
  } catch (error) {
    console.warn("Failed to load LLM chat tool preferences:", error);
    return new Set();
  }
}

function saveDisabledToolNamesToStorage(disabledToolNames) {
  try {
    const payload = {
      disabledToolNames: Array.from(disabledToolNames || []),
    };

    localStorage.setItem(TOOL_PREFS_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("Failed to save LLM chat tool preferences:", error);
  }
}

function generateTabId() {
  return `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateTurnId() {
  return `turn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createDefaultTab() {
  return {
    id: generateTabId(),
    title: DEFAULT_TAB_TITLE,
    messages: [],
    inputItems: [],
    promptDraft: "",
    settings: {
      modelId: DEFAULT_MODEL_ID,
      maxIterations: null,
    },
  };
}

function loadTabsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    if (!parsed || !Array.isArray(parsed.tabs) || parsed.tabs.length === 0) {
      return null;
    }

    const validTabs = parsed.tabs.filter(
      (tab) => tab && typeof tab.id === "string" && Array.isArray(tab.messages)
    );

    if (validTabs.length === 0) {
      return null;
    }

    for (const tab of validTabs) {
      tab.inputItems = Array.isArray(tab.inputItems) ? tab.inputItems : [];
      tab.promptDraft = typeof tab.promptDraft === "string" ? tab.promptDraft : "";
      tab.title = typeof tab.title === "string" ? tab.title : DEFAULT_TAB_TITLE;
      tab.settings = tab.settings && typeof tab.settings === "object" ? tab.settings : {};
      tab.settings.modelId = typeof tab.settings.modelId === "string"
        ? tab.settings.modelId
        : DEFAULT_MODEL_ID;
      tab.settings.maxIterations = Number.isInteger(tab.settings.maxIterations) && tab.settings.maxIterations > 0
        ? tab.settings.maxIterations
        : null;
    }

    let activeTabId = typeof parsed.activeTabId === "string" ? parsed.activeTabId : null;
    const activeExists = validTabs.some((tab) => tab.id === activeTabId);

    if (!activeExists) {
      activeTabId = validTabs[0].id;
    }

    return { tabs: validTabs, activeTabId };
  } catch (error) {
    console.warn("Failed to load LLM chat tabs from storage:", error);
    return null;
  }
}

function saveTabsToStorage(tabs, activeTabId) {
  try {
    const payload = { tabs, activeTabId };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("Failed to save LLM chat tabs to storage:", error);
  }
}

function buildJsonTree(value, depth) {
  depth = depth || 0;
  const MAX_STR = 80;
  const MAX_ITEMS = 50;

  if (value === null) {
    const s = document.createElement('span');
    s.className = 'LLMChat-jNull';
    s.textContent = 'null';
    return s;
  }

  const type = typeof value;

  if (type === 'boolean') {
    const s = document.createElement('span');
    s.className = 'LLMChat-jBool';
    s.textContent = String(value);
    return s;
  }

  if (type === 'number') {
    const s = document.createElement('span');
    s.className = 'LLMChat-jNum';
    s.textContent = String(value);
    return s;
  }

  if (type === 'string') {
    const s = document.createElement('span');
    s.className = 'LLMChat-jStr';
    if (value.length > MAX_STR) {
      s.textContent = `"${value.slice(0, MAX_STR)}\u2026"`;
      s.title = value;
    } else {
      s.textContent = `"${value}"`;
    }
    return s;
  }

  if (type !== 'object') {
    const s = document.createElement('span');
    s.textContent = String(value);
    return s;
  }

  const isArray = Array.isArray(value);
  const rawEntries = isArray ? value : Object.entries(value);
  const truncated = isArray && value.length > MAX_ITEMS;
  const entries = isArray
    ? value.slice(0, MAX_ITEMS).map((v, i) => [String(i), v])
    : Object.entries(value);
  const [open, close] = isArray ? ['[', ']'] : ['{', '}'];
  const count = isArray ? value.length : entries.length;

  if (count === 0) {
    const s = document.createElement('span');
    s.className = 'LLMChat-jEmpty';
    s.textContent = `${open}${close}`;
    return s;
  }

  const details = document.createElement('details');
  details.className = 'LLMChat-jNode';
  details.open = depth < 3;

  const summary = document.createElement('summary');
  summary.className = 'LLMChat-jSummary';
  summary.innerHTML =
    `<span class="LLMChat-jBracket">${open}</span>` +
    `<span class="LLMChat-jCount">${count}</span>` +
    `<span class="LLMChat-jBracket">${close}</span>`;
  details.appendChild(summary);

  const children = document.createElement('div');
  children.className = 'LLMChat-jChildren';

  for (const [key, val] of entries) {
    const row = document.createElement('div');
    row.className = 'LLMChat-jRow';
    if (!isArray) {
      const keyEl = document.createElement('span');
      keyEl.className = 'LLMChat-jKey';
      keyEl.textContent = `${key}: `;
      row.appendChild(keyEl);
    }
    row.appendChild(buildJsonTree(val, depth + 1));
    children.appendChild(row);
  }

  if (truncated) {
    const more = document.createElement('div');
    more.className = 'LLMChat-jRow LLMChat-jMore';
    more.textContent = `\u2026 ${value.length - MAX_ITEMS} more`;
    children.appendChild(more);
  }

  details.appendChild(children);
  return details;
}

class LLMChatUI extends TabPanel {
  constructor({ context, operators }) {
    super({
      context,
      operators,
      position: "right",
      tabId: "llm-chat-panel",
      tabLabel: "Olympus AI Agent",
      icon: "smart_toy",
      title: "Olympus AI Agent",
      showHeader: false,
      floatable: true,
      panelStyles: { minWidth: '800px', minHeight: '100%' },
      autoShow: false,
    });

    
    this.panel.addClass("Panel");

    const chatConfig = getBIMChatConfig(context);

    this.defaultMaxIterations = chatConfig.maxIterations;
    this.defaultSystemInstructions = chatConfig.systemInstructions;
    this.toolCatalog = getBIMChatToolCatalog(AECO_TOOLS, context);
    this.allToolNameSet = new Set(this.toolCatalog.allToolNames || []);

    this.refs = {
      root: null,
      sidebar: null,
      sidebarList: null,
      sidebarToggleButton: null,
      messagesList: null,
      promptInput: null,
      apiKeyInput: null,
      modelSelect: null,
      maxIterationsInput: null,
      statusText: null,
      toolsButton: null,
      settingsButton: null,
      toolsWindow: null,
      toolsSearchInput: null,
      toolsSelectedCount: null,
      toolsListContainer: null,
      settingsWindow: null,
      contextBarLabel: null,
      contextBarFill: null,
      contextBarMsgCount: null,
      contextBarPercent: null,
      contextDetailWindow: null,
      contextDetailSummaryLabel: null,
      contextDetailSummaryPercent: null,
      contextDetailFill: null,
      contextDetailSysPercent: null,
      contextDetailToolsPercent: null,
      contextDetailMsgsPercent: null,
      contextDetailWarning: null,
    };

    this.state = {
      tabs: [],
      activeTabId: null,
      busy: false,
      sidebarVisible: false,
      disabledToolNames: loadDisabledToolNamesFromStorage(this.toolCatalog.allToolNames),
      toolSearchQuery: "",
      settingsWindowOutsideHandler: null,
      settingsWindowEscHandler: null,
      toolsWindowOutsideHandler: null,
      toolsWindowEscHandler: null,
      contextDetailOutsideHandler: null,
      contextDetailEscHandler: null,
      signalSubscriptions: [],
      connectionCheckTimer: null,
      connectionCheckRequestId: 0,
      activeModelName: "",
      liveThinking: null,
      readiness: {
        pythonReady: false,
        bimEnabled: false,
        hasIfcModel: false,
        llmApiConnected: false,
        llmChecked: false,
        llmCheckInProgress: false,
        llmConnectionError: "",
        llmCheckedAt: 0,
      },
    };

    this.initializeReadinessState(context);
    this.initializeTabs();
    this.baseUI(context, operators);
    this.registerReadinessSignals(context);
    this.updateReadinessStatus();

    this.show({ select: false });
  }

  updateReadiness(partial) {
    Object.assign(this.state.readiness, partial);
  }

  getActiveIfcModelName() {
    const contextModelName = this.context && this.context.ifc && typeof this.context.ifc.activeModel === "string"
      ? this.context.ifc.activeModel.trim()
      : "";

    if (contextModelName) {
      this.state.activeModelName = contextModelName;
      return contextModelName;
    }

    return typeof this.state.activeModelName === "string" ? this.state.activeModelName : "";
  }

  updateActiveModelState(fileName = "") {
    const normalizedFileName = typeof fileName === "string" ? fileName.trim() : "";
    const activeModelName = normalizedFileName || this.getActiveIfcModelName();

    this.state.activeModelName = activeModelName;
    this.updateReadiness({
      hasIfcModel: Boolean(activeModelName),
    });
  }

  initializeTabs() {
    const restored = loadTabsFromStorage();

    if (restored) {
      this.state.tabs = restored.tabs;
      this.state.activeTabId = restored.activeTabId;
    } else {
      const defaultTab = createDefaultTab();

      this.state.tabs = [defaultTab];
      this.state.activeTabId = defaultTab.id;
    }
  }

  getActiveTab() {
    return this.state.tabs.find((tab) => tab.id === this.state.activeTabId) || this.state.tabs[0];
  }

  persistTabs() {
    saveTabsToStorage(this.state.tabs, this.state.activeTabId);
  }

  persistToolPreferences() {
    saveDisabledToolNamesToStorage(this.state.disabledToolNames);
  }

  refreshToolCatalog() {
    const nextCatalog = getBIMChatToolCatalog(AECO_TOOLS, this.context);
    const validToolNames = Array.isArray(nextCatalog && nextCatalog.allToolNames)
      ? nextCatalog.allToolNames
      : [];
    const validToolNameSet = new Set(validToolNames);
    const disabledFromStorage = loadDisabledToolNamesFromStorage(validToolNames);

    for (const toolName of this.state.disabledToolNames || []) {
      if (validToolNameSet.has(toolName)) {
        disabledFromStorage.add(toolName);
      }
    }

    this.toolCatalog = nextCatalog;
    this.allToolNameSet = validToolNameSet;
    this.state.disabledToolNames = disabledFromStorage;
  }

  isToolEnabled(toolName) {
    return !this.state.disabledToolNames.has(toolName);
  }

  setToolEnabled(toolName, enabled) {
    if (!this.allToolNameSet.has(toolName)) {
      return;
    }

    if (enabled) {
      this.state.disabledToolNames.delete(toolName);
    } else {
      this.state.disabledToolNames.add(toolName);
    }
  }

  setToolsEnabled(toolNames, enabled) {
    for (const toolName of toolNames) {
      this.setToolEnabled(toolName, enabled);
    }
  }

  getEnabledToolNames() {
    const enabled = [];

    for (const toolName of this.toolCatalog.allToolNames || []) {
      if (this.isToolEnabled(toolName)) {
        enabled.push(toolName);
      }
    }

    return enabled;
  }

  getEnabledToolCount() {
    return this.getEnabledToolNames().length;
  }

  getVisibleToolsByCategory() {
    const query = this.state.toolSearchQuery.trim().toLowerCase();

    return (this.toolCatalog.categories || [])
      .map((category) => {
        const tools = (category.tools || []).filter((tool) => {
          if (!query) {
            return true;
          }

          const haystack = `${tool.name} ${tool.description || ""} ${tool.subcategoryId || ""}`.toLowerCase();

          return haystack.includes(query);
        });

        return {
          ...category,
          tools,
        };
      })
      .filter((category) => category.tools.length > 0);
  }

  initializeReadinessState(context) {
    const activeModelName = context && context.ifc && typeof context.ifc.activeModel === "string"
      ? context.ifc.activeModel.trim()
      : "";

    this.state.activeModelName = activeModelName;
    this.updateReadiness({
      pythonReady: Boolean(AECO_TOOLS.code.pyWorker.isReady),
      bimEnabled: Boolean(AECO_TOOLS.code.pyWorker.initialized.bim),
      hasIfcModel: Boolean(activeModelName),
      llmApiConnected: false,
      llmChecked: false,
      llmConnectionError: "",
      llmCheckedAt: 0,
      llmCheckInProgress: false,
    });
  }

  syncRuntimeReadinessState() {
    const activeModelName = this.getActiveIfcModelName();

    this.updateReadiness({
      pythonReady: Boolean(AECO_TOOLS.code.pyWorker.isReady),
      bimEnabled: Boolean(AECO_TOOLS.code.pyWorker.initialized.bim),
      hasIfcModel: Boolean(activeModelName),
    });
  }

  getResolvedApiKey() {
    if (this.refs.apiKeyInput) {
      return String(this.refs.apiKeyInput.getValue() || "").trim();
    }

    return "";
  }

  getSelectedModelId() {
    if (this.refs.modelSelect) {
      return String(this.refs.modelSelect.getValue() || DEFAULT_MODEL_ID);
    }

    const activeTab = this.getActiveTab();

    if (activeTab && activeTab.settings && typeof activeTab.settings.modelId === "string") {
      return activeTab.settings.modelId;
    }

    return DEFAULT_MODEL_ID;
  }

  buildBasePayload() {
    const modelInfo = resolveModelInfo(this.getSelectedModelId());

    return {
      apiKey: this.getResolvedApiKey(),
      modelName: modelInfo.modelName,
      apiEndpoint: modelInfo.endpoint,
    };
  }

  buildConnectionCheckPayload() {
    return this.buildBasePayload();
  }

  canRunConnectionCheck() {
    this.syncRuntimeReadinessState();

    const checkPayload = this.buildConnectionCheckPayload();
    const readiness = this.state.readiness;

    return Boolean(
      readiness.pythonReady
      && readiness.bimEnabled
      && readiness.hasIfcModel
      && checkPayload.apiKey
      && checkPayload.modelName
    );
  }

  invalidateConnectionState() {
    this.updateReadiness({
      llmApiConnected: false,
      llmChecked: false,
      llmConnectionError: "",
    });
  }

  clearPendingConnectionCheck() {
    if (this.state.connectionCheckTimer !== null) {
      clearTimeout(this.state.connectionCheckTimer);
      this.state.connectionCheckTimer = null;
    }

    this.state.connectionCheckRequestId += 1;
  }

  queueConnectionCheck(delayMs = CONNECTION_CHECK_DEBOUNCE_MS) {
    if (!this.canRunConnectionCheck()) {
      return;
    }

    if (this.state.connectionCheckTimer !== null) {
      clearTimeout(this.state.connectionCheckTimer);
      this.state.connectionCheckTimer = null;
    }

    const delayNumber = Number(delayMs);
    const resolvedDelay = Number.isFinite(delayNumber) && delayNumber >= 0
      ? delayNumber
      : CONNECTION_CHECK_DEBOUNCE_MS;

    this.state.connectionCheckTimer = setTimeout(() => {
      this.state.connectionCheckTimer = null;
      this.runConnectionCheck();
    }, resolvedDelay);
  }

  async runConnectionCheck() {
    if (this.state.busy || this.state.readiness.llmCheckInProgress) {
      return;
    }

    if (!this.canRunConnectionCheck()) {
      this.updateReadinessStatus();
      return;
    }

    this.updateReadiness({ llmCheckInProgress: true });
    this.updateReadinessStatus();

    const requestId = ++this.state.connectionCheckRequestId;
    const payload = this.buildConnectionCheckPayload();

    try {
      await this.operators.execute("llm.chat.check_connection", this.context, payload);
    } catch (error) {
      if (requestId !== this.state.connectionCheckRequestId) {
        return;
      }

      this.updateReadiness({
        llmApiConnected: false,
        llmChecked: true,
        llmConnectionError: error && error.message ? error.message : String(error),
        llmCheckedAt: Date.now(),
      });
    } finally {
      if (requestId !== this.state.connectionCheckRequestId) {
        return;
      }

      this.updateReadiness({ llmCheckInProgress: false });
      this.updateReadinessStatus();
    }
  }

  registerReadinessSignals(context) {
    const signals = context && context.signals ? context.signals : null;

    if (!signals) {
      return;
    }

    const subscribe = (signalName, handler) => {
      const signal = signals[signalName];

      if (!signal || typeof signal.add !== "function") {
        return;
      }

      signal.add(handler);
      this.state.signalSubscriptions.push({ signal, handler });
    };

    subscribe("pythonReady", () => {
      this.updateReadiness({ pythonReady: true });
      this.updateReadinessStatus();
    });

    subscribe("bimEnabled", () => {
      this.updateReadiness({ bimEnabled: true });
      this.updateReadinessStatus();
    });

    subscribe("newIFCModel", (payload = null) => {
      const fileName = payload && typeof payload === "object" ? payload.FileName : "";

      this.updateActiveModelState(fileName);
      this.updateReadinessStatus();
    });

    subscribe("activeModelChanged", (payload = null) => {
      const fileName = payload && typeof payload === "object" ? payload.FileName : "";

      this.updateActiveModelState(fileName);
      this.updateReadinessStatus();
    });

    subscribe("llmChatToolEvent", (payload) => {
      this.handleLiveToolEvent(payload);
    });

    subscribe("llmAPIConnected", (payload) => {
      this.handleLLMConnectionSignal(payload);
    });
  }

  unregisterReadinessSignals() {
    for (const subscription of this.state.signalSubscriptions) {
      if (!subscription || !subscription.signal || typeof subscription.signal.remove !== "function") {
        continue;
      }

      subscription.signal.remove(subscription.handler);
    }

    this.state.signalSubscriptions = [];
  }

  handleLLMConnectionSignal(payload) {
    if (!payload || typeof payload !== "object") {
      return;
    }

    const modelInfo = resolveModelInfo(this.getSelectedModelId());
    const payloadModelName = typeof payload.modelName === "string" ? payload.modelName : "";
    const payloadEndpoint = typeof payload.apiEndpoint === "string" ? payload.apiEndpoint : "";

    if (payloadModelName && payloadModelName !== modelInfo.modelName) {
      return;
    }

    if (payloadEndpoint && payloadEndpoint !== modelInfo.endpoint) {
      return;
    }

    const connected = Boolean(payload.connected);

    this.updateReadiness({
      llmApiConnected: connected,
      llmChecked: true,
      llmConnectionError: connected ? "" : (typeof payload.error === "string" ? payload.error : ""),
      llmCheckedAt: Number.isFinite(Number(payload.checkedAt)) ? Number(payload.checkedAt) : Date.now(),
    });
    this.updateReadinessStatus();
  }

  getReadinessStatusText() {
    const checkPayload = this.buildConnectionCheckPayload();
    const readiness = this.state.readiness;

    if (this.state.busy) {
      return "Running...";
    }

    if (!readiness.pythonReady) {
      return "Waiting for Python runtime...";
    }

    if (!readiness.bimEnabled) {
      return "Waiting for BIM runtime...";
    }

    if (!readiness.hasIfcModel) {
      return "Waiting for IFC model...";
    }

    if (!checkPayload.apiKey) {
      return "Waiting for API key...";
    }

    if (!checkPayload.modelName) {
      return "Waiting for model...";
    }

    if (readiness.llmCheckInProgress) {
      return "Checking LLM API...";
    }

    if (!readiness.llmChecked) {
      return "Waiting for LLM API check...";
    }

    if (!readiness.llmApiConnected) {
      return "LLM API not connected";
    }

    return "Ready";
  }

  updateReadinessStatus() {
    this.syncRuntimeReadinessState();

    const canRunCheck = this.canRunConnectionCheck();
    const readiness = this.state.readiness;

    if (!canRunCheck) {
      this.clearPendingConnectionCheck();
      this.updateReadiness({ llmCheckInProgress: false });
      this.invalidateConnectionState();
    } else if (!readiness.llmChecked && !readiness.llmCheckInProgress) {
      const cooldownMs = 60000;
      const timeSinceLastCheck = readiness.llmCheckedAt > 0 ? Date.now() - readiness.llmCheckedAt : Infinity;

      if (timeSinceLastCheck > cooldownMs) {
        this.queueConnectionCheck();
      }
    }

    this.setChatStatus(this.getReadinessStatusText());
  }

  baseUI(context, operators) {
    this.content.addClass("LLMChat-root");

    const root = this.drawChatPanel(context, operators);

    this.content.add(root);
  }

  drawChatPanel(context, operators) {
    const root = UIComponents.row();

    root.addClass("LLMChat-layout");
    this.refs.root = root;

    this.refs.sidebar = this.drawSidebar();
    const mainPane = this.drawMainPane(context, operators);

    root.add(this.refs.sidebar, mainPane);
    this.applySidebarVisibility();

    this.renderActiveTabMessages();

    return root;
  }

  drawMainPane(context, operators) {
    const pane = UIComponents.column();

    pane.addClass("LLMChat-main");

    const toolbar = this.drawTopToolbar(context, operators);

    const transcriptSection = this.drawTranscriptSection();

    const composerSection = this.drawComposerSection(context, operators);



    pane.add(toolbar, transcriptSection, composerSection);

    return pane;
  }

  drawTopToolbar(context, operators) {
    const toolbar = UIComponents.row().gap("var(--phi-0-5)");

    toolbar.addClass("LLMChat-topToolbar").addClass("justify-between");

    const actionsRow = UIComponents.row().gap("var(--phi-0-5)");
    actionsRow.addClass("LLMChat-toolbarActions");

    this.refs.statusText = UIComponents.smallText("Waiting for dependencies...");

    this.refs.statusText.addClass("LLMChat-statusText");

    const sidebarToggle = UIComponents.operator("dock_to_left");

    sidebarToggle.addClass("LLMChat-inlineControlButton");
    sidebarToggle.dom.title = "Toggle sessions sidebar";
    sidebarToggle.onClick((event) => {
      if (event) {
        event.stopPropagation();
      }

      this.toggleSidebarVisibility();
    });

    this.refs.sidebarToggleButton = sidebarToggle;

    const newChatButton = UIComponents.button("New Chat");

    newChatButton.addClass("LLMChat-newChatButton");
    newChatButton.onClick(() => this.createNewTab());

    actionsRow.add(sidebarToggle, newChatButton);

    toolbar.add(actionsRow, this.refs.statusText);

    return toolbar;
  }

  drawSidebar() {
    const sidebar = UIComponents.column();

    sidebar.addClass("LLMChat-sidebar");

    const header = UIComponents.row();

    header.addClass("LLMChat-sidebarHeader");

    const title = UIComponents.smallText("Sessions");

    title.addClass("LLMChat-sidebarTitle");

    header.add(title);

    this.refs.sidebarList = UIComponents.column();
    this.refs.sidebarList.addClass("LLMChat-sidebarList");

    sidebar.add(header, this.refs.sidebarList);

    this.rebuildSidebarList();

    return sidebar;
  }

  rebuildSidebarList() {
    if (!this.refs.sidebarList) {
      return;
    }

    this.refs.sidebarList.clear();

    for (const tab of this.state.tabs) {
      this.refs.sidebarList.add(this.createSidebarItem(tab));
    }
  }

  createSidebarItem(tab) {
    const isActive = tab.id === this.state.activeTabId;
    const item = UIComponents.row();

    item.addClass("LLMChat-sidebarItem");

    if (isActive) {
      item.addClass('Active');
    }

    const title = UIComponents.smallText(tab.title || DEFAULT_TAB_TITLE);

    title.addClass("LLMChat-sidebarItemTitle");
    title.dom.title = tab.title || DEFAULT_TAB_TITLE;
    title.dom.addEventListener("dblclick", (event) => {
      event.stopPropagation();
      this.startInlineRename(tab, title);
    });

    const deleteButton = UIComponents.icon("close");

    deleteButton.addClass("LLMChat-sidebarDelete");
    deleteButton.dom.title = "Delete chat";
    deleteButton.onClick((event) => {
      event.stopPropagation();
      this.closeTab(tab.id);
    });

    item.onClick(() => this.switchToTab(tab.id));
    item.add(title, deleteButton);

    return item;
  }

  startInlineRename(tab, titleElement) {
    if (!titleElement || !titleElement.dom || !titleElement.dom.parentNode) {
      return;
    }

    const parent = titleElement.dom.parentNode;
    const inputComp = UIComponents.input().addClass("hud-input").addClass("LLMChat-sidebarRenameInput");
    inputComp.setValue(tab.title || DEFAULT_TAB_TITLE);
    const inputDom = inputComp.dom;

    titleElement.dom.style.display = "none";
    parent.insertBefore(inputDom, titleElement.dom);
    inputDom.focus();
    if (typeof /** @type {HTMLInputElement} */ (inputDom).select === "function") {
      /** @type {HTMLInputElement} */ (inputDom).select();
    }

    const finish = (shouldCommit) => {
      if (!inputDom.parentNode) {
        return;
      }

      if (shouldCommit) {
        const nextTitle = (inputComp.getValue() || "").trim();
        tab.title = nextTitle || DEFAULT_TAB_TITLE;
        this.persistTabs();
      }

      parent.removeChild(inputDom);
      titleElement.dom.style.display = "";
      this.rebuildSidebarList();
    };

    inputDom.addEventListener("blur", () => finish(true));
    inputDom.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        finish(true);
      } else if (event.key === "Escape") {
        event.preventDefault();
        finish(false);
      }
    });
  }

  drawTranscriptSection() {
    const section = UIComponents.column();
    section.addClass("LLMChat-transcriptSection");

    this.refs.messagesList = UIComponents.column().gap("var(--phi-0-5)");
    this.refs.messagesList.addClass("LLMChat-messages");

    section.add(this.refs.messagesList);

    return section;
  }

  drawComposerSection(context, operators) {
    const section = UIComponents.column().gap("var(--phi-0-5)");
    section.addClass("LLMChat-composerSection");

    const activeTab = this.getActiveTab();

    this.refs.promptInput = UIComponents.textarea().addClass("hud-input");
    this.refs.promptInput.addClass("LLMChat-promptInput");
    this.refs.promptInput.dom.setAttribute("placeholder", "Ask about BIM model contents or actions...");
    this.refs.promptInput.setValue(activeTab.promptDraft || "");

    this.refs.promptInput.dom.addEventListener("input", () => {
      const tab = this.getActiveTab();

      if (tab) {
        tab.promptDraft = this.refs.promptInput.getValue() || "";
      }

      this.updateContextBar();
    });

    this.refs.promptInput.dom.addEventListener("keydown", async (event) => {
      if (event.key !== "Enter" || event.shiftKey) {
        return;
      }

      event.preventDefault();
      await this.runChatTurn(context, operators);
    });

    const textareaWrapper = UIComponents.div();

    textareaWrapper.addClass("LLMChat-textareaWrapper");

    const contextBarRow = this.drawContextBar();

    const apiKeyRow = UIComponents.row().gap("var(--phi-0-5)");
    apiKeyRow.addClass("LLMChat-fieldRow");

    this.refs.apiKeyInput = UIComponents.input().addClass("hud-input");
    this.refs.apiKeyInput.addClass("LLMChat-fieldInput");
    this.refs.apiKeyInput.dom.setAttribute("type", "password");
    this.refs.apiKeyInput.dom.setAttribute("placeholder", "API key (required each session)");
    this.refs.apiKeyInput.dom.setAttribute("autocomplete", "off");
    this.refs.apiKeyInput.dom.addEventListener("input", () => {
      this.invalidateConnectionState();
      this.updateReadinessStatus();
    });
    apiKeyRow.add(this.refs.apiKeyInput);

    const actionsRow = UIComponents.row().gap("var(--phi-0-5)");
    actionsRow.addClass("LLMChat-actionsRow");

    const settingsButton = UIComponents.operator("settings");

    const toolsButton = UIComponents.operator("build");

    toolsButton.addClass("LLMChat-inlineControlButton");
    toolsButton.dom.title = "Configure tools";
    toolsButton.onClick((event) => {
      if (event) {
        event.stopPropagation();
      }

      this.toggleToolsWindow(context, operators, toolsButton.dom);
    });
    this.refs.toolsButton = toolsButton;

    settingsButton.addClass("LLMChat-inlineControlButton");
    settingsButton.dom.title = "Chat settings";
    settingsButton.onClick((event) => {
      if (event) {
        event.stopPropagation();
      }

      this.toggleSettingsWindow(context, operators, settingsButton.dom);
    });
    this.refs.settingsButton = settingsButton;

    this.refs.modelSelect = UIComponents.select().addClass("hud-input");
    this.refs.modelSelect.addClass("LLMChat-modelSelect");
    this.refs.modelSelect.setOptions(getModelOptions());
    this.refs.modelSelect.setValue(activeTab.settings.modelId || DEFAULT_MODEL_ID);
    this.refs.modelSelect.dom.addEventListener("change", () => {
      this.syncSettingsToActiveTab();
      this.invalidateConnectionState();
      this.updateContextBar();
      this.updateReadinessStatus();
    });


    const buttonsRow = UIComponents.row().gap("var(--phi-0-5)");
    buttonsRow.addClass("LLMChat-actionsButtons");

    const clearButton = UIComponents.icon("delete_sweep");
    clearButton.addClass("LLMChat-clearButton");

    clearButton.dom.title = "Clear conversation";
    clearButton.onClick(() => this.clearActiveTab());

    const sendButton = UIComponents.button("");
    sendButton.addClass("LLMChat-sendButton");

    sendButton.setIcon("send");
    sendButton.dom.title = "Send message";

    UIHelper.bindOperatorPolling({
      element: sendButton,
      operators,
      context,
      operatorId: "llm.chat.turn",
      getArgs: () => [this.buildTurnPayload()],
      lockedTooltip: "Enable BIM, and provide API key/model/prompt.",
      extraReadyCheck: () => !this.state.busy,
      onLocked: () => {
        operators.execute("world.new_notification", context, {
          message: "Chat is not ready. Provide API key/model/prompt and ensure BIM is enabled.",
          type: "warning",
        });
      },
      onClick: async () => {
        await this.runChatTurn(context, operators);
      },
    });

    buttonsRow.add(clearButton, sendButton);
    actionsRow.add(toolsButton, settingsButton, this.refs.modelSelect, buttonsRow);

    textareaWrapper.add(this.refs.promptInput, actionsRow);

    section.add(apiKeyRow, textareaWrapper, contextBarRow);

    return section;
  }

  applySidebarVisibility() {
    if (!this.refs.root) {
      return;
    }

    if (this.state.sidebarVisible) {
      this.refs.root.removeClass("LLMChat-sidebar-collapsed");
    } else {
      this.refs.root.addClass("LLMChat-sidebar-collapsed");
    }

    if (this.refs.sidebarToggleButton) {
      if (this.state.sidebarVisible) {
        this.refs.sidebarToggleButton.addClass('Active');
      } else {
        this.refs.sidebarToggleButton.removeClass('Active');
      }
    }
  }

  toggleSidebarVisibility() {
    this.state.sidebarVisible = !this.state.sidebarVisible;
    this.applySidebarVisibility();
  }

  detachSettingsWindowListeners() {
    if (this.state.settingsWindowOutsideHandler) {
      document.removeEventListener("mousedown", this.state.settingsWindowOutsideHandler, true);
      this.state.settingsWindowOutsideHandler = null;
    }

    if (this.state.settingsWindowEscHandler) {
      document.removeEventListener("keydown", this.state.settingsWindowEscHandler, true);
      this.state.settingsWindowEscHandler = null;
    }
  }

  detachToolsWindowListeners() {
    if (this.state.toolsWindowOutsideHandler) {
      document.removeEventListener("mousedown", this.state.toolsWindowOutsideHandler, true);
      this.state.toolsWindowOutsideHandler = null;
    }

    if (this.state.toolsWindowEscHandler) {
      document.removeEventListener("keydown", this.state.toolsWindowEscHandler, true);
      this.state.toolsWindowEscHandler = null;
    }
  }

  closeSettingsWindow() {
    if (!this.refs.settingsWindow) {
      return;
    }

    const windowRef = this.refs.settingsWindow;

    this.refs.settingsWindow = null;
    this.refs.maxIterationsInput = null;
    this.detachSettingsWindowListeners();

    windowRef.hide();

    if (windowRef.dom && windowRef.dom.parentNode) {
      windowRef.dom.parentNode.removeChild(windowRef.dom);
    }
  }

  closeToolsWindow() {
    if (!this.refs.toolsWindow) {
      return;
    }

    const windowRef = this.refs.toolsWindow;

    this.refs.toolsWindow = null;
    this.refs.toolsSearchInput = null;
    this.refs.toolsSelectedCount = null;
    this.refs.toolsListContainer = null;
    this.detachToolsWindowListeners();

    windowRef.hide();

    if (windowRef.dom && windowRef.dom.parentNode) {
      windowRef.dom.parentNode.removeChild(windowRef.dom);
    }
  }

  renderToolsWindowList() {
    if (!this.refs.toolsListContainer || !this.refs.toolsListContainer.dom) {
      return;
    }

    const listDom = this.refs.toolsListContainer.dom;

    listDom.innerHTML = "";

    const visibleCategories = this.getVisibleToolsByCategory();

    if (visibleCategories.length === 0) {
      const empty = document.createElement("div");

      empty.className = "LLMChat-toolsEmpty";
      empty.textContent = "No tools match your search.";
      listDom.appendChild(empty);
    }

    for (const category of visibleCategories) {
      const categoryEnabledCount = category.tools.filter((tool) => this.isToolEnabled(tool.name)).length;
      const allCategoryEnabled = categoryEnabledCount === category.tools.length;
      const someCategoryEnabled = categoryEnabledCount > 0 && !allCategoryEnabled;

      const details = document.createElement("details");

      details.className = "LLMChat-toolsCategory";
      details.open = true;

      const summary = document.createElement("summary");

      summary.className = "LLMChat-toolsCategorySummary";

      const categoryCheckbox = UIComponents.checkbox(allCategoryEnabled);

      categoryCheckbox.dom.classList.add("LLMChat-toolsCategoryCheckbox");
      if ("indeterminate" in categoryCheckbox.dom) {
        /** @type {HTMLInputElement} */ (categoryCheckbox.dom).indeterminate = someCategoryEnabled;
      }
      categoryCheckbox.dom.addEventListener("click", (event) => {
        event.stopPropagation();
      });
      categoryCheckbox.dom.addEventListener("change", () => {
        this.setToolsEnabled(category.tools.map((tool) => tool.name), categoryCheckbox.getValue());
        this.persistToolPreferences();
        this.renderToolsWindowList();
      });

      const label = document.createElement("span");

      label.className = "LLMChat-toolsCategoryLabel";
      label.textContent = category.label;

      const count = document.createElement("span");

      count.className = "LLMChat-toolsCategoryCount";
      count.textContent = `${categoryEnabledCount}/${category.tools.length}`;

      summary.appendChild(categoryCheckbox.dom);
      summary.appendChild(label);
      summary.appendChild(count);

      const groupBody = document.createElement("div");

      groupBody.className = "LLMChat-toolsCategoryBody";

      let currentSubcategoryId = null;

      for (const tool of category.tools) {
        const nextSubcategoryId = typeof tool.subcategoryId === "string" && tool.subcategoryId.length > 0
          ? tool.subcategoryId
          : null;

        if (nextSubcategoryId && nextSubcategoryId !== currentSubcategoryId) {
          const subcategoryHeader = document.createElement("div");

          subcategoryHeader.className = "LLMChat-toolsSubcategoryHeader";
          subcategoryHeader.textContent = nextSubcategoryId;
          groupBody.appendChild(subcategoryHeader);
          currentSubcategoryId = nextSubcategoryId;
        }

        const row = document.createElement("label");

        row.className = "LLMChat-toolsToolRow";

        const toolCheckbox = UIComponents.checkbox(this.isToolEnabled(tool.name));

        toolCheckbox.dom.addEventListener("change", () => {
          this.setToolEnabled(tool.name, toolCheckbox.getValue());
          this.persistToolPreferences();
          this.renderToolsWindowList();
        });

        const textWrap = document.createElement("div");

        textWrap.className = "LLMChat-toolsToolText";

        const name = document.createElement("div");

        name.className = "LLMChat-toolsToolName";
        name.textContent = tool.name;

        const description = document.createElement("div");

        description.className = "LLMChat-toolsToolDescription";
        description.textContent = tool.description || "";

        textWrap.appendChild(name);
        textWrap.appendChild(description);

        row.appendChild(toolCheckbox.dom);
        row.appendChild(textWrap);
        groupBody.appendChild(row);
      }

      details.appendChild(summary);
      details.appendChild(groupBody);
      listDom.appendChild(details);
    }

    if (this.refs.toolsSelectedCount) {
      this.refs.toolsSelectedCount.setTextContent(`${this.getEnabledToolCount()} selected`);
    }
  }

  toggleToolsWindow(context, operators, anchorDom) {
    if (this.refs.toolsWindow) {
      this.closeToolsWindow();
      return;
    }

    // Active modules/operators can change after startup, so refresh the catalog at open time.
    this.refreshToolCatalog();

    this.closeSettingsWindow();

    const toolsWindow = UIComponents.floatingWindow({ context, operators });
    const content = UIComponents.column().gap("var(--phi-0-5)");

    content.addClass("LLMChat-floatingToolsContent");

    const headerRow = UIComponents.row().gap("var(--phi-0-5)");

    headerRow.addClass("LLMChat-toolsHeaderRow");

    this.refs.toolsSearchInput = UIComponents.input().addClass("hud-input");
    this.refs.toolsSearchInput.addClass("LLMChat-toolsSearchInput");
    this.refs.toolsSearchInput.dom.setAttribute("placeholder", "Search tools...");
    this.refs.toolsSearchInput.setValue(this.state.toolSearchQuery);
    this.refs.toolsSearchInput.dom.addEventListener("input", () => {
      this.state.toolSearchQuery = String(this.refs.toolsSearchInput.getValue() || "");
      this.renderToolsWindowList();
    });

    this.refs.toolsSelectedCount = UIComponents.smallText(`${this.getEnabledToolCount()} selected`);
    this.refs.toolsSelectedCount.addClass("LLMChat-toolsSelectedCount");

    headerRow.add(this.refs.toolsSearchInput, this.refs.toolsSelectedCount);

    this.refs.toolsListContainer = UIComponents.div();
    this.refs.toolsListContainer.addClass("LLMChat-toolsListContainer");

    const footerRow = UIComponents.row().gap("var(--phi-0-5)");

    footerRow.addClass("LLMChat-toolsFooterRow");

    const enableAllButton = UIComponents.button("Enable all");

    enableAllButton.addClass("LLMChat-toolsFooterButton");
    enableAllButton.onClick(() => {
      this.state.disabledToolNames.clear();
      this.persistToolPreferences();
      this.renderToolsWindowList();
    });

    const disableAllButton = UIComponents.button("Disable all");

    disableAllButton.addClass("LLMChat-toolsFooterButton");
    disableAllButton.onClick(() => {
      this.state.disabledToolNames = new Set(this.toolCatalog.allToolNames || []);
      this.persistToolPreferences();
      this.renderToolsWindowList();
    });

    footerRow.add(enableAllButton, disableAllButton);

    content.add(headerRow, this.refs.toolsListContainer, footerRow);

    toolsWindow
      .setTitle("Configure Tools")
      .setIcon("build")
      .setContent(content);

    const hostRect = context && context.dom && context.dom.getBoundingClientRect
      ? context.dom.getBoundingClientRect()
      : { top: 0, left: 0, width: window.innerWidth };
    const anchorRect = anchorDom && anchorDom.getBoundingClientRect
      ? anchorDom.getBoundingClientRect()
      : null;
    const width = 520;
    let left = hostRect.width - width - 12;
    let top = 12;

    if (anchorRect) {
      left = anchorRect.right - hostRect.left - width + 32;
      top = anchorRect.top - hostRect.top - 420;
    }

    left = Math.max(8, Math.min(left, hostRect.width - width - 8));
    top = Math.max(8, top);

    toolsWindow.position({
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
      width: `${width}px`,
    });

    const originalHide = toolsWindow.hide.bind(toolsWindow);

    toolsWindow.hide = () => {
      const result = originalHide();

      if (this.refs.toolsWindow === toolsWindow) {
        this.refs.toolsWindow = null;
        this.refs.toolsSearchInput = null;
        this.refs.toolsSelectedCount = null;
        this.refs.toolsListContainer = null;
        this.detachToolsWindowListeners();
      }

      return result;
    };

    toolsWindow.show();

    this.refs.toolsWindow = toolsWindow;

    this.state.toolsWindowOutsideHandler = (event) => {
      if (!this.refs.toolsWindow) {
        return;
      }

      const target = event.target;
      const clickedInsideWindow = this.refs.toolsWindow.dom.contains(target);
      const clickedAnchor = anchorDom && anchorDom.contains(target);

      if (!clickedInsideWindow && !clickedAnchor) {
        this.closeToolsWindow();
      }
    };

    this.state.toolsWindowEscHandler = (event) => {
      if (event.key === "Escape" && this.refs.toolsWindow) {
        this.closeToolsWindow();
      }
    };

    document.addEventListener("mousedown", this.state.toolsWindowOutsideHandler, true);
    document.addEventListener("keydown", this.state.toolsWindowEscHandler, true);

    if (this.state.busy) {
      this.refs.toolsSearchInput.dom.setAttribute("disabled", "disabled");
      enableAllButton.dom.setAttribute("disabled", "disabled");
      disableAllButton.dom.setAttribute("disabled", "disabled");
    }

    this.renderToolsWindowList();
  }

  toggleSettingsWindow(context, operators, anchorDom) {
    if (this.refs.settingsWindow) {
      this.closeSettingsWindow();
      return;
    }

    this.closeToolsWindow();

    const settingsWindow = UIComponents.floatingWindow({ context, operators });
    const activeTab = this.getActiveTab();
    const content = UIComponents.column().gap("var(--phi-0-5)");

    content.addClass("LLMChat-floatingSettingsContent");

    const maxIterRow = UIComponents.row().gap("var(--phi-0-5)");
    maxIterRow.addClass("LLMChat-fieldRow");

    const maxIterLabel = UIComponents.smallText("Max Steps");
    maxIterLabel.addClass("LLMChat-fieldLabel");

    this.refs.maxIterationsInput = UIComponents.number(
      activeTab.settings.maxIterations ?? this.defaultMaxIterations
    ).addClass("hud-input");
    this.refs.maxIterationsInput.addClass("LLMChat-fieldInput");
    this.refs.maxIterationsInput.dom.setAttribute("min", "1");
    this.refs.maxIterationsInput.dom.setAttribute("max", "200");
    this.refs.maxIterationsInput.dom.title = "Max tool-call iterations per turn (context usage increases with each step)";
    this.refs.maxIterationsInput.dom.addEventListener("change", () => this.syncSettingsToActiveTab());
    maxIterRow.add(maxIterLabel, this.refs.maxIterationsInput);

    content.add(maxIterRow);

    settingsWindow
      .setTitle("Chat Settings")
      .setIcon("settings")
      .setContent(content);

    const hostRect = context && context.dom && context.dom.getBoundingClientRect
      ? context.dom.getBoundingClientRect()
      : { top: 0, left: 0, width: window.innerWidth };
    const anchorRect = anchorDom && anchorDom.getBoundingClientRect
      ? anchorDom.getBoundingClientRect()
      : null;
    const width = 320;
    let left = hostRect.width - width - 12;
    let top = 12;

    if (anchorRect) {
      left = anchorRect.right - hostRect.left - width + 32;
      top = anchorRect.top - hostRect.top - 176;
    }

    left = Math.max(8, Math.min(left, hostRect.width - width - 8));
    top = Math.max(8, top);

    settingsWindow.position({
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
      width: `${width}px`,
    });

    const originalHide = settingsWindow.hide.bind(settingsWindow);

    settingsWindow.hide = () => {
      const result = originalHide();

      if (this.refs.settingsWindow === settingsWindow) {
        this.refs.settingsWindow = null;
        this.refs.maxIterationsInput = null;
        this.detachSettingsWindowListeners();
      }

      return result;
    };

    settingsWindow.show();

    this.refs.settingsWindow = settingsWindow;

    this.state.settingsWindowOutsideHandler = (event) => {
      if (!this.refs.settingsWindow) {
        return;
      }

      const target = event.target;
      const clickedInsideWindow = this.refs.settingsWindow.dom.contains(target);
      const clickedAnchor = anchorDom && anchorDom.contains(target);

      if (!clickedInsideWindow && !clickedAnchor) {
        this.closeSettingsWindow();
      }
    };

    this.state.settingsWindowEscHandler = (event) => {
      if (event.key === "Escape" && this.refs.settingsWindow) {
        this.closeSettingsWindow();
      }
    };

    document.addEventListener("mousedown", this.state.settingsWindowOutsideHandler, true);
    document.addEventListener("keydown", this.state.settingsWindowEscHandler, true);

    if (this.state.busy) {
      this.refs.maxIterationsInput.dom.setAttribute("disabled", "disabled");
    }
  }

  drawContextBar() {
    const row = UIComponents.row().gap("var(--phi-0-5)");
    row.addClass("LLMChat-contextBar");

    const usageIcon = UIComponents.icon("data_usage");
    usageIcon.addClass("LLMChat-contextIcon");

    this.refs.contextBarLabel = UIComponents.smallText("~0 / 128k tokens");
    this.refs.contextBarLabel.addClass("LLMChat-contextLabel");

    const barTrack = UIComponents.div();
    barTrack.addClass("LLMChat-contextTrack");

    this.refs.contextBarFill = UIComponents.div();
    this.refs.contextBarFill.addClass("LLMChat-contextFill");

    barTrack.add(this.refs.contextBarFill);

    this.refs.contextBarMsgCount = UIComponents.smallText("");
    this.refs.contextBarMsgCount.addClass("LLMChat-contextMsgCount");

    const percentLabel = UIComponents.smallText("");
    percentLabel.addClass("LLMChat-contextPercent");
    this.refs.contextBarPercent = percentLabel;

    row.add(usageIcon, this.refs.contextBarLabel, barTrack, this.refs.contextBarMsgCount, percentLabel);

    row.dom.style.cursor = "pointer";
    row.onClick(() => this.toggleContextDetailWindow(row.dom));

    return row;
  }

  updateContextBar() {
    if (!this.refs.contextBarLabel || !this.refs.contextBarFill || !this.refs.contextBarMsgCount) {
      return;
    }

    const tab = this.getActiveTab();
    const inputItems = tab ? tab.inputItems : [];
    const msgCount = tab && Array.isArray(tab.messages) ? tab.messages.length : 0;
    const modelId = this.refs.modelSelect
      ? String(this.refs.modelSelect.getValue() || DEFAULT_MODEL_ID)
      : DEFAULT_MODEL_ID;
    const draftPrompt = this.refs.promptInput ? String(this.refs.promptInput.getValue() || "") : "";

    const enabledToolNames = this.getEnabledToolNames();
    const toolDefsEstimate = (this.toolCatalog.entries || [])
      .filter((entry) => enabledToolNames.includes(entry.name))
      .map((entry) => ({ name: entry.name, description: entry.description }));

    const { estimatedTokens, contextWindow, percent, breakdown } = estimateContextUsage(
      inputItems,
      this.defaultSystemInstructions,
      modelId,
      draftPrompt,
      toolDefsEstimate
    );

    this.refs.contextBarLabel.setTextContent(
      `~${formatTokenCount(estimatedTokens)} / ${formatTokenCount(contextWindow)} tokens`
    );
    this.refs.contextBarMsgCount.setTextContent(`(${msgCount} msg${msgCount !== 1 ? "s" : ""})`);

    if (this.refs.contextBarPercent) {
      this.refs.contextBarPercent.setTextContent(`${percent}%`);
    }

    const likelyTpmPressure = estimatedTokens >= 18000;

    let fillColor;

    if (percent >= 85 || estimatedTokens >= 26000) {
      fillColor = "var(--theme-error, #e05252)";
    } else if (percent >= 60 || likelyTpmPressure) {
      fillColor = "var(--theme-warning, #d4a017)";
    } else {
      fillColor = "var(--theme-accent, #4c9a72)";
    }

    this.refs.contextBarFill.setStyle("width", [`${percent}%`]);
    this.refs.contextBarFill.setStyle("background", [fillColor]);

    const tooltip = `Click to view context window breakdown (${percent}%)`;
    this.refs.contextBarLabel.dom.title = tooltip;
    this.refs.contextBarFill.dom.title = tooltip;

    this.state.lastContextBreakdown = breakdown;
    this.state.lastContextPercent = percent;
    this.state.lastContextEstimatedTokens = estimatedTokens;
    this.state.lastContextWindow = contextWindow;
    this.state.lastContextFillColor = fillColor;

    this.updateContextDetailWindow(breakdown, percent, estimatedTokens, contextWindow, fillColor);
  }

  getToolDefinitionsForEstimation() {
    const enabledToolNames = this.getEnabledToolNames();

    return (this.toolCatalog.entries || [])
      .filter((entry) => enabledToolNames.includes(entry.name))
      .map((entry) => ({ name: entry.name, description: entry.description }));
  }

  toggleContextDetailWindow(anchorDom) {
    if (this.refs.contextDetailWindow) {
      this.closeContextDetailWindow();
      return;
    }

    this.closeSettingsWindow();
    this.closeToolsWindow();

    const detailWindow = UIComponents.floatingWindow({ context: this.context, operators: this.operators });
    const content = UIComponents.column().gap("var(--phi-0-5)");
    content.addClass("LLMChat-contextDetailContent");

    const headerRow = UIComponents.row().gap("var(--phi-0-5)");
    headerRow.addClass("LLMChat-contextDetailHeader");

    const headerLabel = UIComponents.smallText("Context Window");
    headerLabel.addClass("LLMChat-contextDetailTitle");
    headerRow.add(headerLabel);
    content.add(headerRow);

    const summaryRow = UIComponents.row().gap("var(--phi-0-5)");
    summaryRow.addClass("LLMChat-contextDetailSummary");

    this.refs.contextDetailSummaryLabel = UIComponents.smallText("");
    this.refs.contextDetailSummaryLabel.addClass("LLMChat-contextDetailSummaryText");

    this.refs.contextDetailSummaryPercent = UIComponents.smallText("");
    this.refs.contextDetailSummaryPercent.addClass("LLMChat-contextDetailSummaryPercent");

    summaryRow.add(this.refs.contextDetailSummaryLabel, this.refs.contextDetailSummaryPercent);
    content.add(summaryRow);

    const detailTrack = UIComponents.div();
    detailTrack.addClass("LLMChat-contextDetailTrack");

    this.refs.contextDetailFill = UIComponents.div();
    this.refs.contextDetailFill.addClass("LLMChat-contextDetailFill");
    detailTrack.add(this.refs.contextDetailFill);
    content.add(detailTrack);

    const sectionSystem = UIComponents.column().gap("2px");
    sectionSystem.addClass("LLMChat-contextDetailSection");

    const sysHeading = UIComponents.smallText("System");
    sysHeading.addClass("LLMChat-contextDetailSectionHeading");
    sectionSystem.add(sysHeading);

    const sysInstrRow = UIComponents.row().gap("var(--phi-0-5)");
    sysInstrRow.addClass("LLMChat-contextDetailRow");
    const sysInstrLabel = UIComponents.smallText("System Instructions");
    sysInstrLabel.addClass("LLMChat-contextDetailRowLabel");
    this.refs.contextDetailSysPercent = UIComponents.smallText("0%");
    this.refs.contextDetailSysPercent.addClass("LLMChat-contextDetailRowValue");
    sysInstrRow.add(sysInstrLabel, this.refs.contextDetailSysPercent);
    sectionSystem.add(sysInstrRow);

    const toolDefRow = UIComponents.row().gap("var(--phi-0-5)");
    toolDefRow.addClass("LLMChat-contextDetailRow");
    const toolDefLabel = UIComponents.smallText("Tool Definitions");
    toolDefLabel.addClass("LLMChat-contextDetailRowLabel");
    this.refs.contextDetailToolsPercent = UIComponents.smallText("0%");
    this.refs.contextDetailToolsPercent.addClass("LLMChat-contextDetailRowValue");
    toolDefRow.add(toolDefLabel, this.refs.contextDetailToolsPercent);
    sectionSystem.add(toolDefRow);

    content.add(sectionSystem);

    const sectionUser = UIComponents.column().gap("2px");
    sectionUser.addClass("LLMChat-contextDetailSection");

    const userHeading = UIComponents.smallText("Conversation");
    userHeading.addClass("LLMChat-contextDetailSectionHeading");
    sectionUser.add(userHeading);

    const msgsRow = UIComponents.row().gap("var(--phi-0-5)");
    msgsRow.addClass("LLMChat-contextDetailRow");
    const msgsLabel = UIComponents.smallText("Messages");
    msgsLabel.addClass("LLMChat-contextDetailRowLabel");
    this.refs.contextDetailMsgsPercent = UIComponents.smallText("0%");
    this.refs.contextDetailMsgsPercent.addClass("LLMChat-contextDetailRowValue");
    msgsRow.add(msgsLabel, this.refs.contextDetailMsgsPercent);
    sectionUser.add(msgsRow);

    content.add(sectionUser);

    this.refs.contextDetailWarning = UIComponents.smallText("");
    this.refs.contextDetailWarning.addClass("LLMChat-contextDetailWarning");
    content.add(this.refs.contextDetailWarning);

    const compactRow = UIComponents.row().gap("var(--phi-0-5)");
    compactRow.addClass("LLMChat-contextDetailActions");

    const compactButton = UIComponents.button("Compact Conversation");
    compactButton.addClass("LLMChat-contextDetailCompactButton");
    compactButton.dom.title = "Trim older messages to free context space";
    compactButton.onClick(() => {
      this.compactConversation();
    });

    compactRow.add(compactButton);
    content.add(compactRow);

    detailWindow
      .setTitle("Context Window")
      .setIcon("data_usage")
      .setContent(content);

    const hostRect = this.context && this.context.dom && this.context.dom.getBoundingClientRect
      ? this.context.dom.getBoundingClientRect()
      : { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
    const anchorRect = anchorDom && anchorDom.getBoundingClientRect
      ? anchorDom.getBoundingClientRect()
      : null;
    const width = 280;
    let left = hostRect.width - width - 12;
    let top = 12;

    if (anchorRect) {
      left = anchorRect.left - hostRect.left;
      top = anchorRect.top - hostRect.top - 300;
    }

    left = Math.max(8, Math.min(left, hostRect.width - width - 8));
    top = Math.max(8, top);

    detailWindow.position({
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
      width: `${width}px`,
    });

    const originalHide = detailWindow.hide.bind(detailWindow);

    detailWindow.hide = () => {
      const result = originalHide();

      if (this.refs.contextDetailWindow === detailWindow) {
        this.refs.contextDetailWindow = null;
        this.refs.contextDetailSysPercent = null;
        this.refs.contextDetailToolsPercent = null;
        this.refs.contextDetailMsgsPercent = null;
        this.refs.contextDetailWarning = null;
        this.refs.contextDetailSummaryLabel = null;
        this.refs.contextDetailSummaryPercent = null;
        this.refs.contextDetailFill = null;
        this.detachContextDetailListeners();
      }

      return result;
    };

    detailWindow.show();
    this.refs.contextDetailWindow = detailWindow;

    if (this.state.lastContextBreakdown) {
      this.updateContextDetailWindow(
        this.state.lastContextBreakdown,
        this.state.lastContextPercent,
        this.state.lastContextEstimatedTokens,
        this.state.lastContextWindow,
        this.state.lastContextFillColor
      );
    }

    this.state.contextDetailOutsideHandler = (event) => {
      if (!this.refs.contextDetailWindow) {
        return;
      }

      const target = event.target;
      const clickedInside = this.refs.contextDetailWindow.dom.contains(target);
      const clickedAnchor = anchorDom && anchorDom.contains(target);

      if (!clickedInside && !clickedAnchor) {
        this.closeContextDetailWindow();
      }
    };

    this.state.contextDetailEscHandler = (event) => {
      if (event.key === "Escape" && this.refs.contextDetailWindow) {
        this.closeContextDetailWindow();
      }
    };

    document.addEventListener("mousedown", this.state.contextDetailOutsideHandler, true);
    document.addEventListener("keydown", this.state.contextDetailEscHandler, true);
  }

  updateContextDetailWindow(breakdown, percent, estimatedTokens, contextWindow, fillColor) {
    if (!this.refs.contextDetailWindow) {
      return;
    }

    if (this.refs.contextDetailSummaryLabel) {
      this.refs.contextDetailSummaryLabel.setTextContent(
        `${formatTokenCount(estimatedTokens)} / ${formatTokenCount(contextWindow)} tokens`
      );
    }

    if (this.refs.contextDetailSummaryPercent) {
      this.refs.contextDetailSummaryPercent.setTextContent(`${percent}%`);
    }

    if (this.refs.contextDetailFill) {
      this.refs.contextDetailFill.setStyle("width", [`${percent}%`]);
      this.refs.contextDetailFill.setStyle("background", [fillColor]);
    }

    if (breakdown) {
      if (this.refs.contextDetailSysPercent) {
        this.refs.contextDetailSysPercent.setTextContent(`${breakdown.systemInstructions.percent}%`);
      }

      if (this.refs.contextDetailToolsPercent) {
        this.refs.contextDetailToolsPercent.setTextContent(`${breakdown.toolDefinitions.percent}%`);
      }

      if (this.refs.contextDetailMsgsPercent) {
        this.refs.contextDetailMsgsPercent.setTextContent(`${breakdown.messages.percent}%`);
      }
    }

    if (this.refs.contextDetailWarning) {
      if (percent >= 60) {
        this.refs.contextDetailWarning.setTextContent("Quality may decline as limit nears.");
        this.refs.contextDetailWarning.dom.style.display = "";
      } else {
        this.refs.contextDetailWarning.setTextContent("");
        this.refs.contextDetailWarning.dom.style.display = "none";
      }
    }
  }

  closeContextDetailWindow() {
    if (this.refs.contextDetailWindow) {
      this.refs.contextDetailWindow.hide();
    }

    this.detachContextDetailListeners();
  }

  detachContextDetailListeners() {
    if (this.state.contextDetailOutsideHandler) {
      document.removeEventListener("mousedown", this.state.contextDetailOutsideHandler, true);
      this.state.contextDetailOutsideHandler = null;
    }

    if (this.state.contextDetailEscHandler) {
      document.removeEventListener("keydown", this.state.contextDetailEscHandler, true);
      this.state.contextDetailEscHandler = null;
    }
  }

  compactConversation() {
    const tab = this.getActiveTab();

    if (!tab || !Array.isArray(tab.inputItems) || tab.inputItems.length <= 4) {
      return;
    }

    const half = Math.max(2, Math.floor(tab.inputItems.length / 2));

    tab.inputItems = tab.inputItems.slice(half);

    if (Array.isArray(tab.messages) && tab.messages.length > 0) {
      const keepMsgs = Math.max(2, Math.ceil(tab.messages.length / 2));

      tab.messages = tab.messages.slice(tab.messages.length - keepMsgs);
    }

    this.renderActiveTabMessages();
    this.updateContextBar();
    this.persistTabs();
  }

  syncSettingsToActiveTab() {
    const tab = this.getActiveTab();

    if (!tab) {
      return;
    }

    tab.settings.modelId = this.refs.modelSelect
      ? String(this.refs.modelSelect.getValue() || DEFAULT_MODEL_ID)
      : DEFAULT_MODEL_ID;

    const rawIter = this.refs.maxIterationsInput
      ? parseInt(String(this.refs.maxIterationsInput.getValue()), 10)
      : NaN;

    tab.settings.maxIterations = Number.isInteger(rawIter) && rawIter > 0 ? rawIter : null;

    this.persistTabs();
  }

  createNewTab() {
    const newTab = createDefaultTab();
    const tabNumber = this.state.tabs.length + 1;

    newTab.title = `${DEFAULT_TAB_TITLE} ${tabNumber}`;

    this.state.tabs.push(newTab);
    this.switchToTab(newTab.id);
  }

  switchToTab(tabId) {
    if (this.state.activeTabId === tabId) {
      return;
    }

    const currentTab = this.getActiveTab();

    if (currentTab && this.refs.promptInput) {
      currentTab.promptDraft = this.refs.promptInput.getValue() || "";
    }

    this.state.activeTabId = tabId;

    const newTab = this.getActiveTab();

    if (this.refs.promptInput) {
      this.refs.promptInput.setValue(newTab.promptDraft || "");
    }

    if (this.refs.modelSelect) {
      this.refs.modelSelect.setValue(newTab.settings.modelId || DEFAULT_MODEL_ID);
    }

    if (this.refs.maxIterationsInput) {
      this.refs.maxIterationsInput.setValue(
        newTab.settings.maxIterations ?? this.defaultMaxIterations
      );
    }

    this.rebuildSidebarList();
    this.renderActiveTabMessages();
    this.invalidateConnectionState();
    this.updateReadinessStatus();
    this.persistTabs();
  }

  closeTab(tabId) {
    if (this.state.tabs.length <= 1) {
      return;
    }

    const index = this.state.tabs.findIndex((tab) => tab.id === tabId);

    if (index === -1) {
      return;
    }

    this.state.tabs.splice(index, 1);

    if (this.state.activeTabId === tabId) {
      const newIndex = Math.min(index, this.state.tabs.length - 1);

      this.state.activeTabId = this.state.tabs[newIndex].id;

      const newTab = this.getActiveTab();

      if (this.refs.promptInput) {
        this.refs.promptInput.setValue(newTab.promptDraft || "");
      }

      if (this.refs.modelSelect) {
        this.refs.modelSelect.setValue(newTab.settings.modelId || DEFAULT_MODEL_ID);
      }

      if (this.refs.maxIterationsInput) {
        this.refs.maxIterationsInput.setValue(
          newTab.settings.maxIterations ?? this.defaultMaxIterations
        );
      }

      this.renderActiveTabMessages();
    }

    this.rebuildSidebarList();
    this.updateReadinessStatus();
    this.persistTabs();
  }

  clearActiveTab() {
    const tab = this.getActiveTab();

    if (!tab) {
      return;
    }

    tab.messages = [];
    tab.inputItems = [];

    this.renderActiveTabMessages();
    this.updateReadinessStatus();
    this.persistTabs();
  }

  renderActiveTabMessages() {
    if (!this.refs.messagesList) {
      return;
    }

    this.refs.messagesList.clear();
    this.clearLiveThinkingBlock();

    const tab = this.getActiveTab();

    if (!tab || !Array.isArray(tab.messages)) {
      return;
    }

    for (const message of tab.messages) {
      this.renderMessageElement(message.role, message.text);
    }

    if (this.state.liveThinking && this.state.liveThinking.tabId === this.state.activeTabId) {
      this.showLiveThinkingBlock(this.state.liveThinking.toolEvents || []);
    }

    this.scrollMessagesToBottom();
    this.updateContextBar();
  }

  renderMessageElement(role, text) {
    if (!this.refs.messagesList) {
      return;
    }

    const roleText = typeof role === "string" ? role : "assistant";
    const messageText = typeof text === "string" ? text : JSON.stringify(text);

    const messageItem = UIComponents.column().gap("2px");
    messageItem.addClass("LLMChat-messageItem");
    messageItem.addClass(`role-${roleText}`);

    // Thinking block — grouped tool events from one completed turn
    if (roleText === "thinking") {
      let toolEvents = [];

      try {
        toolEvents = JSON.parse(messageText);
      } catch {
        // ignore
      }

      if (!Array.isArray(toolEvents)) {
        toolEvents = [];
      }

      messageItem.add(this._buildThinkingThread(toolEvents));
      this.refs.messagesList.add(messageItem);

      return;
    }

    // Legacy: single tool_call stored entry → wrap as 1-step thinking thread
    if (roleText === "tool_call") {
      let event = null;

      try {
        event = JSON.parse(messageText);
      } catch {
        // ignore
      }

      const events = event && typeof event === "object" ? [event] : [];

      messageItem.add(this._buildThinkingThread(events));
      this.refs.messagesList.add(messageItem);

      return;
    }

    // Legacy plain-text tool rows (backward compat with stored sessions)
    if (roleText === "tool") {
      const roleLabel = UIComponents.smallText("TOOL");

      roleLabel.addClass("LLMChat-messageRole");

      const body = UIComponents.text(messageText);

      body.addClass("LLMChat-messageBody");
      body.addClass("LLMChat-messageBody--mono");
      messageItem.add(roleLabel, body);
      this.refs.messagesList.add(messageItem);

      return;
    }

    // User and assistant — plain-text for user, markdown for assistant
    const roleLabel = UIComponents.smallText(roleText.toUpperCase());

    roleLabel.addClass("LLMChat-messageRole");

    const body = roleText === "assistant"
      ? UIComponents.markdown(messageText)
      : UIComponents.text(messageText);

    body.addClass("LLMChat-messageBody");
    messageItem.add(roleLabel, body);
    this.refs.messagesList.add(messageItem);
  }

  _buildThinkingThread(toolEvents, options = {}) {
    const events = Array.isArray(toolEvents) ? toolEvents : [];
    const isLive = options.live === true;
    const stepCount = events.length;
    const stepLabel = stepCount === 1 ? "1 step" : `${stepCount} steps`;

    const block = UIComponents.div().addClass("LLMChat-thinkingBlock");

    if (isLive) {
      block.addClass("open");
    }

    const header = UIComponents.div().addClass("LLMChat-thinkingHeader");

    const icon = UIComponents.icon("memory").addClass("LLMChat-thinkingIcon");
    const label = UIComponents.span("Thought process").addClass("LLMChat-thinkingLabel");
    const metaText = isLive ? `· ${stepLabel} · running` : `· ${stepLabel}`;
    const meta = UIComponents.span(metaText).addClass("LLMChat-thinkingMeta");
    const chevron = UIComponents.icon("expand_more").addClass("LLMChat-thinkingChevron");

    header.add(icon, label, meta, chevron);

    const body = UIComponents.div().addClass("LLMChat-thinkingBody");

    for (const event of events) {
      if (event && event.kind === "model_thought") {
        const thoughtText = typeof event.text === "string" ? event.text.trim() : "";

        if (thoughtText) {
          const step = UIComponents.div().addClass("LLMChat-thinkingStep");
          const thoughtRow = UIComponents.div().addClass("LLMChat-thinkingRow");
          const thoughtArrow = UIComponents.span("·").addClass("LLMChat-thinkingArrow").addClass("LLMChat-thinkingArrow--call");
          const thoughtLabel = Number.isInteger(event.iteration)
            ? `Model thought (step ${event.iteration})\n${thoughtText}`
            : `Model thought\n${thoughtText}`;
          const thoughtBody = UIComponents.span(thoughtLabel).addClass("LLMChat-thinkingRowText");

          thoughtRow.add(thoughtArrow, thoughtBody);
          step.add(thoughtRow);
          body.add(step);
        }

        continue;
      }

      const toolName = typeof event.name === "string" ? event.name : "tool";
      const args = event.args != null ? event.args : {};
      const result = event.result;
      const argsStr = JSON.stringify(args);
      const resultStr = result != null ? JSON.stringify(result) : "";

      const step = UIComponents.div().addClass("LLMChat-thinkingStep");
      const callRow = UIComponents.div().addClass("LLMChat-thinkingRow");
      const callArrow = UIComponents.span("→").addClass("LLMChat-thinkingArrow").addClass("LLMChat-thinkingArrow--call");
      const callText = UIComponents.span(argsStr === "{}" ? toolName : `${toolName} ${argsStr}`).addClass("LLMChat-thinkingRowText");

      callRow.add(callArrow, callText);
      step.add(callRow);

      if (resultStr) {
        const resultRow = UIComponents.div().addClass("LLMChat-thinkingRow").addClass("LLMChat-thinkingRow--result");
        const resultArrow = UIComponents.span("←").addClass("LLMChat-thinkingArrow").addClass("LLMChat-thinkingArrow--result");

        let resultContent;
        try {
          const parsed = typeof result === "string" ? JSON.parse(result) : result;
          if (parsed !== null && typeof parsed === "object") {
            resultContent = UIComponents.div().addClass("LLMChat-jsonTreeWrap");
            resultContent.dom.appendChild(buildJsonTree(parsed, 0));
          }
        } catch (_) { /* fall through */ }

        if (!resultContent) {
          resultContent = UIComponents.span(resultStr).addClass("LLMChat-thinkingRowText").addClass("LLMChat-thinkingRowText--result");
        }

        resultRow.add(resultArrow, resultContent);
        step.add(resultRow);
      }

      body.add(step);
    }

    header.onClick(() => {
      block.dom.classList.toggle("open");
    });

    block.add(header, body);

    return block;
  }

  showTypingIndicator() {
    this.hideTypingIndicator();

    if (!this.refs.messagesList) {
      return;
    }

    const indicator = UIComponents.div()
      .addClass("LLMChat-typingIndicator")
      .addClass("LLMChat-messageItem")
      .addClass("role-assistant");

    indicator.setId("llmchat-typing-indicator");

    for (let i = 0; i < 3; i += 1) {
      indicator.add(UIComponents.div().addClass("LLMChat-typingDot"));
    }

    this.refs.messagesList.add(indicator);
    this.scrollMessagesToBottom();
  }

  hideTypingIndicator() {
    const existing = document.getElementById("llmchat-typing-indicator");

    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
  }

  clearLiveThinkingBlock() {
    const liveThinking = this.state.liveThinking;

    if (liveThinking) {
      liveThinking.messageItem = null;
    }

    const existing = document.getElementById("llmchat-live-thinking");

    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
  }

  showLiveThinkingBlock(toolEvents) {
    if (!this.refs.messagesList || !this.state.liveThinking || this.state.liveThinking.tabId !== this.state.activeTabId) {
      return;
    }

    this.clearLiveThinkingBlock();

    const messageItem = UIComponents.column().gap("2px");

    messageItem.addClass("LLMChat-messageItem");
    messageItem.addClass("role-thinking");
    messageItem.dom.id = "llmchat-live-thinking";
    messageItem.add(this._buildThinkingThread(toolEvents, { live: true }));

    this.refs.messagesList.add(messageItem);
    this.state.liveThinking.messageItem = messageItem;
    this.scrollMessagesToBottom();
  }

  startLiveThinking(turnId, tabId) {
    this.state.liveThinking = {
      turnId,
      tabId,
      toolEvents: [],
      messageItem: null,
    };
  }

  finishLiveThinking(turnId) {
    if (!this.state.liveThinking) {
      return;
    }

    if (turnId && this.state.liveThinking.turnId !== turnId) {
      return;
    }

    this.clearLiveThinkingBlock();
    this.state.liveThinking = null;
  }

  handleLiveToolEvent(payload) {
    if (!payload || typeof payload !== "object") {
      return;
    }

    const liveThinking = this.state.liveThinking;

    if (!liveThinking || payload.turnId !== liveThinking.turnId) {
      return;
    }

    const toolEvents = Array.isArray(payload.toolEvents) ? payload.toolEvents : [];

    liveThinking.toolEvents = toolEvents;

    if (liveThinking.tabId === this.state.activeTabId) {
      this.showLiveThinkingBlock(toolEvents);
    }
  }

  appendThinkingBlock(toolEvents, targetTab = this.getActiveTab()) {
    const tab = targetTab;

    if (!tab) {
      return;
    }

    const text = JSON.stringify(Array.isArray(toolEvents) ? toolEvents : []);

    tab.messages.push({ role: "thinking", text });

    if (tab.id === this.state.activeTabId) {
      this.renderMessageElement("thinking", text);
      this.scrollMessagesToBottom();
      this.updateContextBar();
    }

    this.persistTabs();
  }

  scrollMessagesToBottom() {
    if (this.refs.messagesList && this.refs.messagesList.dom) {
      this.refs.messagesList.dom.scrollTop = this.refs.messagesList.dom.scrollHeight;
    }
  }

  appendChatMessage(role, text, targetTab = this.getActiveTab()) {
    const tab = targetTab;

    if (!tab) {
      return;
    }

    tab.messages.push({ role, text });

    if (tab.id === this.state.activeTabId) {
      this.renderMessageElement(role, text);
      this.scrollMessagesToBottom();
      this.updateContextBar();
    }

    this.persistTabs();
  }

  buildTurnPayload() {
    const tab = this.getActiveTab();
    const base = this.buildBasePayload();
    const promptText = this.refs.promptInput ? String(this.refs.promptInput.getValue() || "") : "";
    const tabMaxIter = tab && Number.isInteger(tab.settings?.maxIterations) && tab.settings.maxIterations > 0
      ? tab.settings.maxIterations
      : null;
    const maxIterations = tabMaxIter !== null ? tabMaxIter : this.defaultMaxIterations;
    const enabledToolNames = this.getEnabledToolNames();

    return {
      ...base,
      turnId: generateTurnId(),
      userText: promptText.trim(),
      inputItems: tab ? tab.inputItems : [],
      systemInstructions: this.defaultSystemInstructions,
      maxIterations,
      activeModelName: this.getActiveIfcModelName(),
      enabledToolNames,
    };
  }

  setChatStatus(text) {
    if (!this.refs.statusText) {
      return;
    }

    this.refs.statusText.setTextContent(text);
  }

  setChatBusy(isBusy) {
    this.state.busy = Boolean(isBusy);

    const inputElements = [
      this.refs.promptInput,
      this.refs.apiKeyInput,
      this.refs.modelSelect,
      this.refs.maxIterationsInput,
      this.refs.toolsSearchInput,
    ];

    for (const inputElement of inputElements) {
      if (!inputElement || !inputElement.dom) {
        continue;
      }

      if (this.state.busy) {
        inputElement.dom.setAttribute("disabled", "disabled");
      } else {
        inputElement.dom.removeAttribute("disabled");
      }
    }

    if (this.refs.settingsButton && this.refs.settingsButton.dom) {
      if (this.state.busy) {
        this.refs.settingsButton.dom.setAttribute("aria-disabled", "true");
      } else {
        this.refs.settingsButton.dom.removeAttribute("aria-disabled");
      }
    }

    if (this.refs.toolsButton && this.refs.toolsButton.dom) {
      if (this.state.busy) {
        this.refs.toolsButton.dom.setAttribute("aria-disabled", "true");
      } else {
        this.refs.toolsButton.dom.removeAttribute("aria-disabled");
      }
    }
  }

  async runChatTurn(context, operators) {
    if (this.state.busy) {
      return;
    }

    const payload = this.buildTurnPayload();

    if (!payload.userText) {
      operators.execute("world.new_notification", context, {
        message: "Enter a prompt before sending.",
        type: "warning",
      });

      return;
    }

    if (!Array.isArray(payload.enabledToolNames) || payload.enabledToolNames.length === 0) {
      operators.execute("world.new_notification", context, {
        message: "No tools enabled. Open Tools and enable at least one tool.",
        type: "warning",
      });

      return;
    }

    const tab = this.getActiveTab();
    const turnId = payload.turnId;

    if (tab) {
      tab.promptDraft = "";
    }

    this.appendChatMessage("user", payload.userText, tab);
    this.refs.promptInput.setValue("");
    this.setChatBusy(true);
    this.setChatStatus("Running...");
    this.showTypingIndicator();
    this.startLiveThinking(turnId, tab ? tab.id : null);

    try {
      const response = await operators.execute("llm.chat.turn", context, payload);
      const result = response && response.result ? response.result : {};
      const conversationItems = Array.isArray(result.inputItems) ? result.inputItems : [];
      const toolEvents = Array.isArray(result.toolEvents) ? result.toolEvents : [];
      const assistantText = typeof result.assistantText === "string" ? result.assistantText : "";

      if (tab) {
        tab.inputItems = conversationItems;
      }

      this.hideTypingIndicator();
      this.finishLiveThinking(turnId);

      if (toolEvents.length > 0) {
        this.appendThinkingBlock(toolEvents, tab);
      }

      if (assistantText) {
        this.appendChatMessage("assistant", assistantText, tab);
      }

      if (result.reachedLimit) {
        this.appendChatMessage("assistant", "Tool-call loop limit reached. Narrow the request.", tab);
      }
    } catch (error) {
      const message = error && error.message ? error.message : String(error);

      this.hideTypingIndicator();
      this.finishLiveThinking(turnId);
      this.appendChatMessage("assistant", `Error: ${message}`, tab);
      this.setChatStatus("Error");
      operators.execute("world.new_notification", context, {
        message: `AI Agent chat failed: ${message}`,
        type: "error",
      });
    } finally {
      this.finishLiveThinking(turnId);
      this.setChatBusy(false);
      this.persistTabs();
      this.updateReadinessStatus();
    }
  }

  destroy() {
    this.clearPendingConnectionCheck();
    this.unregisterReadinessSignals();
    this.closeSettingsWindow();
    this.closeToolsWindow();
    super.destroy();
  }
}

export default [LLMChatUI];
