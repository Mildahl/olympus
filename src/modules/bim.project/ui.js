import { Components as UIComponents } from "../../ui/Components/Components.js";

import { UIHelper } from "../../ui/UIHelper.js";

import AECO_tools from "../../tool/index.js";

import Paths from "../../utils/paths.js";

const IFC_TEMPLATES = [{
  name: "5D",
  path : Paths.ifcSamples("5D.ifc"),
  fileName: "5D.ifc",
  size: "6.3 MB"
}, {
  name: "Window Wall",
  path : Paths.ifcSamples("window_wall.ifc"),
  fileName: "window_wall.ifc",
  size: "98 KB"
},
{
  name: "Wall",
  path : Paths.ifcSamples("demo.ifc"),
  fileName: "demo.ifc",
  size: "88.6 KB"
},
{
  name: "Works Plan",
  path : Paths.ifcSamples("Works_Plan.ifc"),
  fileName: "Works_Plan.ifc",
  size: "1.2 MB"
}
]

/** Shown when IFC load operators are polled as not ready (Python / IfcOpenShell). */
const BIM_IFC_OPERATOR_LOCKED_TOOLTIP =
  "Enable Python and BIM (IfcOpenShell) first, then try again.";

class ProjectUI {
  constructor({ context, operators }) {
    this.context = context;

    this.operators = operators;

    // IFC project UI lives in the left workspace (same pattern as bim.sequence).
    this.position = "left";

    this.tabId = "bim-project-ifc-models";

    this.tabLabel = "IFC models";

    this.panel = UIComponents.div();

    this.panel.addClass("Panel");

    this.panel.setStyle("display", ["flex"]);

    this.panel.setStyle("flex-direction", ["column"]);

    this.panel.setStyle("height", ["100%"]);

    this.panel.setStyle("overflow", ["hidden"]);

    this.panel.setStyle("min-width", ["0"]);

    this.header = UIComponents.div();

    this.header.addClass("PanelHeader");

    this.header.setStyle("flex-shrink", ["0"]);

    this.content = UIComponents.div();

    this.content.addClass("PanelContent");

    this.content.setStyle("flex", ["1"]);

    this.content.setStyle("overflow-y", ["auto"]);

    this.content.setStyle("overflow-x", ["hidden"]);

    this.content.setStyle("min-height", ["0"]);

    this.footer = UIComponents.row();

    this.footer.addClass("PanelFooter");

    this.footer.setStyle("flex-shrink", ["0"]);

    this.panel.add(this.header, this.content, this.footer);

    this.projectsList = null;

    this.modelOverviewSection = null;

    this.modelOverviewContent = null;

    this.progressContainer = null;

    this.progressBar = null;

    this.progressLabel = null;

    this.progressPercent = null;

    this.progressPulseTimer = null;

    this.baseUI(context, operators);

    context.layoutManager?.ensureTab("left", this.tabId, this.tabLabel, this.panel, {
      open: false,
      replace: false,
    });

    this.listen(context, operators);
  }

  _createPanelHeader(title, iconName, actions = []) {
    const headerRow = UIComponents.row()
      .addClass("fill-parent")
      .setStyle("justify-content", ["space-between"])
      .setStyle("align-items", ["center"])
      .setStyle("padding", ["0.5rem 0.75rem"]);

    const headerLeft = UIComponents.row()
      .setStyle("align-items", ["center"])
      .setStyle("gap", ["0.5rem"]);

    if (iconName) {
      const icon = UIComponents.icon(iconName);

      icon.setStyle("font-size", ["1.2rem"]);

      headerLeft.add(icon);
    }

    const titleText = UIComponents.text(title);

    titleText.setStyle("font-weight", ["600"]);

    titleText.setStyle("font-size", ["0.9rem"]);

    headerLeft.add(titleText);

    headerRow.add(headerLeft);

    if (actions.length > 0) {
      const actionsRow = UIComponents.row().setStyle("gap", ["0.5rem"]);

      for (const action of actions) {
        actionsRow.add(action);
      }

      headerRow.add(actionsRow);
    }

    return headerRow;
  }

  baseUI(context, operators) {
    
    this.content.addClass("Column")

    this.header.add(this._createPanelHeader("IFC Building Models", "domain"));

    const dragAndDrop = this.openByFileDrop(context, operators);

    const templatescomponent = this.drawTemplates(context, operators);

    const progressComponent = this.drawProgressBar();

    this.content.add(dragAndDrop, templatescomponent, progressComponent);

    this.drawLoadedModels(context, operators);

    this.drawModelOverview(context, operators);

    this.footer.add( this.drawQuickActions(context, operators) );

  }

  listen(context, operators) {
    context.signals.newIFCModel.add(() => {
      this.refreshModelsList(context, operators);
    });

    context.signals.activeModelChanged.add(async ({ FileName }) => {
      this.refreshModelsList(context, operators);

      await this.updateModelOverview(FileName);
    });
  }

  refreshModelsList(context, operators) {
    if (!this.projectsList) return;
    
    this.projectsList.clear();
    
    const availableModels = context.ifc.availableModels || [];

    for (const modelName of availableModels) {
      this.drawItem(context, operators, modelName);
    }
  }

  drawItem(context, operators, loadedModelName) {
    const item = UIComponents.listItem();

    item.onClick(() => {
      operators.execute("bim.set_active_model", context, loadedModelName);
    });

    const name = UIComponents.text(loadedModelName);

    const saveOp = UIComponents.button("Save");

    saveOp.setIcon("save");

    if (saveOp.setTooltip) saveOp.setTooltip("Save IFC model (ifc, ifcxml, ifczip)");

    saveOp.onClick(async (e) => {
      e?.stopPropagation?.();

      const formatInput = window.prompt("Save format: ifc, ifcxml, or ifczip", "ifc");

      if (formatInput == null || formatInput.trim() === "") return;

      const format = formatInput.trim().toLowerCase();

      if (!["ifc", "ifcxml", "ifczip"].includes(format)) {
        operators.execute("world.new_notification", context, { message: "Invalid format. Use: ifc, ifcxml, or ifczip", type: "warning" });

        return;
      }

      const ext = format === "ifcxml" ? ".ifcxml" : format === "ifczip" ? ".ifczip" : ".ifc";

      const baseName = loadedModelName.replace(/\.ifc$/i, "") || "model";

      const suggestedName = baseName + ext;

      let fileHandle = null;

      const showSave = typeof window !== "undefined" && typeof window.showSaveFilePicker === "function";

      if (showSave) {
        try {
          const acceptKey = format === "ifc" ? "text/plain" : format === "ifcxml" ? "application/xml" : "application/octet-stream";

          const types = [{ description: format.toUpperCase() + " file", accept: { [acceptKey]: [ext.slice(1)] } }];

          fileHandle = await window.showSaveFilePicker({ suggestedName, types });
        } catch (e) {
          if (e.name === "AbortError") return;

          console.warn("showSaveFilePicker failed, using download fallback:", e);
        }
      }

      try {
        await operators.execute("bim.save_ifc", context, loadedModelName, format, fileHandle);

        operators.execute("world.new_notification", context, { message: "Model saved", type: "success" });
      } catch (err) {
        operators.execute("world.new_notification", context, { message: `Save failed: ${err.message}`, type: "error" });
      }
    });

    const loadGeometryOp = UIComponents.button("Load Geometry");

    const loadLiteGeometryOp = UIComponents.button("Load Lite");

    loadGeometryOp.setIcon("view_in_ar");

    loadLiteGeometryOp.setIcon("view_in_ar");

    if (context.ifc.activeModel === loadedModelName) item.addClass("Active");

    let geometryLoadInProgress = false;

    const runGeometryLoad = async (backend) => {
      const isLite = backend === "ifc-lite";

      const geometryProgressText = isLite
        ? `Loading ${loadedModelName} geometry with ifc-lite...`
        : `Loading ${loadedModelName} geometry...`;

      geometryLoadInProgress = true;

      this.showProgress(geometryProgressText, 8);

      const stopPulse = this.startProgressPulse(geometryProgressText, 12, 92);

      item.remove(loadGeometryOp);

      item.remove(loadLiteGeometryOp);

      try {
        await operators.execute("bim.load_geometry_data", context, loadedModelName, "Buildings", backend);

        stopPulse(100, `Geometry loaded for ${loadedModelName}`);


        setTimeout(() => {
          this.hideProgress();
        }, 600);
      } catch (err) {
        stopPulse(0, "Geometry loading failed");

        this.hideProgress();

        operators.execute("world.new_notification", context, { message: `Failed to load geometry: ${err.message}`, type: "error" });
      } finally {
        geometryLoadInProgress = false;
      }
    };

    const onGeometryLocked = () => {
      operators.execute("world.new_notification", context, {
        message: BIM_IFC_OPERATOR_LOCKED_TOOLTIP,
        type: "warning",
      });
    };

    UIHelper.bindOperatorPolling({
      element: loadGeometryOp,
      operators,
      context,
      operatorId: "bim.load_geometry_data",
      getArgs: () => [loadedModelName, "Buildings", "ifcopenshell"],
      lockedTooltip: BIM_IFC_OPERATOR_LOCKED_TOOLTIP,
      extraReadyCheck: () => !geometryLoadInProgress,
      onLocked: onGeometryLocked,
      onClick: async () => {
        await runGeometryLoad("ifcopenshell");
      },
    });

    UIHelper.bindOperatorPolling({
      element: loadLiteGeometryOp,
      operators,
      context,
      operatorId: "bim.load_geometry_data",
      getArgs: () => [loadedModelName, "Buildings", "ifc-lite"],
      lockedTooltip: BIM_IFC_OPERATOR_LOCKED_TOOLTIP,
      extraReadyCheck: () => !geometryLoadInProgress,
      onLocked: onGeometryLocked,
      onClick: async () => {
        await runGeometryLoad("ifc-lite");
      },
    });

    item.add(name, loadGeometryOp, loadLiteGeometryOp, saveOp);

    this.projectsList.add(item);
  }

  openByFileDrop (context, operators) {
    const message = 'DRAG AND DROP IFC, IFCZIP, IFCXML';

    const dragComponent = UIComponents.row().addClass('centered-vertical').setStyles({
      width: "100%",
      height: "fit-content",
    }).setTooltip(message);

    const label = UIComponents.text(message).addClass('hud-label');

    const dropArea = UIComponents.div().addClass('hud-input').setStyles({
      width: "50%",
      height: "30px",
    });

    UIHelper.bindOperatorPolling({
      element: dropArea,
      operators,
      context,
      operatorId: "bim.load_model_from_path",
      getArgs: () => [null, null, null],
      lockedTooltip: BIM_IFC_OPERATOR_LOCKED_TOOLTIP,
    });

    UIHelper.makeFileDropZone(dropArea, {
      accept: ['.ifc', '.ifczip', '.ifcxml'],
      onFile: async (file, arrayBuffer) => {
        if (!operators.canExecute("bim.load_model_from_path", context, null, null, null)) {
          operators.execute("world.new_notification", context, {
            message: BIM_IFC_OPERATOR_LOCKED_TOOLTIP,
            type: "warning",
          });

          return;
        }

        this.showProgress(`Loading ${file.name} into memory...`, 100);

        try {
          await operators.execute("bim.load_model_from_path", context, null, arrayBuffer, file.name);

          this.hideProgress();
        } catch (err) {
          this.hideProgress();

          operators.execute("world.new_notification", context, { message: `Failed to load model: ${err.message}`, type: "error" });
        }
      }
    });
    
    dragComponent.add(label, dropArea);

    return dragComponent;
  }

  drawTemplates(context, operators) {

    const title = UIComponents.h5("IFC Model Templates");

    const grid = UIComponents.row()

    grid.setStyle("display", ["grid"]);

    grid.setStyle("grid-template-columns", ["repeat(2, 1fr)"]);

    grid.setStyle("gap", ["var(--phi-0-5)"]);

    for ( const template of IFC_TEMPLATES ) {

      const item = UIComponents.div().addClass("SquareOperator");

      const iconDownload = UIComponents.icon("download");

      item.add(iconDownload);

      item.add(UIComponents.text(template.name));
      
      item.add(UIComponents.span(template.size).addClass("GameNumber").setStyle("font-size", ["12px"]))
      
      grid.add(item);

      UIHelper.bindOperatorPolling({
        element: item,
        operators,
        context,
        operatorId: "bim.load_model_from_path",
        getArgs: () => [null, null, null],
        lockedTooltip: BIM_IFC_OPERATOR_LOCKED_TOOLTIP,
        onLocked: () => {
          operators.execute("world.new_notification", context, {
            message: BIM_IFC_OPERATOR_LOCKED_TOOLTIP,
            type: "warning",
          });
        },
        onClick: () => {
          const modelName = template.path.split("/").pop();

          this.loadModelWithProgress(context, operators, template.path, modelName);
        },
      });

      const modelName = template.path.split("/").pop();

      context.signals.newIFCModel.add(({ FileName }) => {

        const isLoaded = FileName === modelName;

        if ( isLoaded ) {

          item.addClass("Active");

          if ( item.contains(iconDownload) ) iconDownload.setIcon("check_circle");

        }

      })

    }

    return UIComponents.column().gap("var(--phi-0-5)").add(title, grid)
  }

  drawProgressBar() {
    this.progressContainer = UIComponents.column().gap("var(--phi-0-5)").setStyles({
      width: "100%",
      display: "none"
    });

    this.progressContainer.addClass("BIMProject-progress");

    const progressHeader = UIComponents.row().setStyles({
      width: "100%"
    });

    progressHeader.setStyle("align-items", ["center"]);

    progressHeader.setStyle("justify-content", ["space-between"]);

    this.progressLabel = UIComponents.text("").addClass("BIMProject-progressLabel").setStyles({
      fontSize: "12px",
      color: "var(--theme-text-light)"
    });

    this.progressPercent = UIComponents.text("0%").addClass("BIMProject-progressPercent");

    const progressWrapper = UIComponents.div().addClass("BIMProject-progressTrack").setStyles({
      width: "100%",
      height: "10px"
    });

    this.progressBar = UIComponents.div().addClass("BIMProject-progressFill").setStyles({
      width: "0%",
      height: "100%"
    });

    this.progressBar.setStyle("transition", ["width 0.2s ease"]);

    progressWrapper.add(this.progressBar);

    progressHeader.add(this.progressLabel, this.progressPercent);

    this.progressContainer.add(progressHeader, progressWrapper);

    return this.progressContainer;
  }

  showProgress(text, percentage = 0) {
    if (!this.progressContainer) return;

    const nextPercentage = this.normalizeProgress(percentage);

    this.progressContainer.setStyle("display", ["flex"]);

    this.progressLabel.setTextContent(text);

    if (this.progressPercent) {
      this.progressPercent.setTextContent(`${Math.round(nextPercentage)}%`);
    }

    this.progressBar.setStyle("width", [`${nextPercentage}%`]);
  }

  updateProgress(text, percentage) {
    if (!this.progressLabel || !this.progressBar) return;

    const nextPercentage = this.normalizeProgress(percentage);

    this.progressLabel.setTextContent(text);

    if (this.progressPercent) {
      this.progressPercent.setTextContent(`${Math.round(nextPercentage)}%`);
    }

    this.progressBar.setStyle("width", [`${nextPercentage}%`]);
  }

  hideProgress() {
    if (!this.progressContainer) return;

    this.stopProgressPulse();

    this.progressContainer.setStyle("display", ["none"]);

    if (this.progressPercent) {
      this.progressPercent.setTextContent("0%");
    }

    this.progressBar.setStyle("width", ["0%"]);
  }

  normalizeProgress(percentage) {
    const parsed = Number(percentage);

    if (Number.isNaN(parsed)) return 0;

    if (parsed < 0) return 0;

    if (parsed > 100) return 100;

    return parsed;
  }

  startProgressPulse(text, start = 12, max = 92) {
    this.stopProgressPulse();

    let current = this.normalizeProgress(start);

    const limit = this.normalizeProgress(max);

    this.updateProgress(text, current);

    this.progressPulseTimer = window.setInterval(() => {
      const remaining = limit - current;

      if (remaining <= 0.5) {
        current = limit;
      } else {
        current = current + Math.max(0.8, remaining * 0.08);
      }

      this.updateProgress(text, current);
    }, 160);

    return (finalProgress = null, finalText = text) => {
      this.stopProgressPulse();

      if (typeof finalProgress === "number") {
        this.updateProgress(finalText, finalProgress);
      }
    };
  }

  stopProgressPulse() {
    if (this.progressPulseTimer === null) return;

    window.clearInterval(this.progressPulseTimer);

    this.progressPulseTimer = null;
  }

  async fetchWithProgress(url) {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentLength = response.headers.get('content-length');

    const total = contentLength ? parseInt(contentLength, 10) : 0;

    if (!response.body) {
      const arrayBuffer = await response.arrayBuffer();

      return arrayBuffer;
    }

    const reader = response.body.getReader();

    const chunks = [];

    let receivedLength = 0;

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      chunks.push(value);

      receivedLength += value.length;

      if (total > 0) {
        const percentage = Math.round((receivedLength / total) * 100);

        this.updateProgress(`Downloading... ${this.formatBytes(receivedLength)} / ${this.formatBytes(total)}`, percentage);
      } else {
        this.updateProgress(`Downloading... ${this.formatBytes(receivedLength)}`, 50);
      }
    }

    const allChunks = new Uint8Array(receivedLength);

    let position = 0;

    for (const chunk of chunks) {
      allChunks.set(chunk, position);

      position += chunk.length;
    }

    return allChunks.buffer;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';

    const k = 1024;

    const sizes = ['B', 'KB', 'MB', 'GB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  async loadModelWithProgress(context, operators, path, modelName) {
    if (!operators.canExecute("bim.load_model_from_path", context, null, null, null)) {
      operators.execute("world.new_notification", context, {
        message: BIM_IFC_OPERATOR_LOCKED_TOOLTIP,
        type: "warning",
      });

      return;
    }

    try {
      this.showProgress(`Downloading ${modelName}...`, 0);

      const arrayBuffer = await this.fetchWithProgress(path);

      this.updateProgress(`Loading ${modelName} into memory...`, 100);

      await operators.execute("bim.load_model_from_path", context, null, arrayBuffer, modelName);

      this.hideProgress();
    } catch (err) {
      this.hideProgress();

      operators.execute("world.new_notification", context, { message: `Failed to load model: ${err.message}`, type: "error" });
    }
  }

  drawLoadedModels(context, operators) {
    
    const section = UIComponents.collapsibleSection({
      title: 'Loaded Models',
      icon: 'view_in_ar',
      collapsed: false
    });

    this.projectsList = UIComponents.list();

    section.setContent(this.projectsList);

    this.content.add( section );
  
  }

  drawModelOverview(context, operators) {
    this.modelOverviewSection = UIComponents.collapsibleSection({
      title: 'Model Analytics',
      icon: 'analytics',
      collapsed: false
    });

    this.modelOverviewContent = UIComponents.column().gap("var(--phi-0-5)");
    
    const emptyState = UIComponents.text("Select a model to view its overview");

    emptyState.setStyle("font-size", ["12px"]);

    emptyState.setStyle("color", ["var(--theme-text-light)"]);

    emptyState.setStyle("padding", ["var(--phi-0-5)"]);

    this.modelOverviewContent.add(emptyState);

    this.modelOverviewSection.setContent(this.modelOverviewContent);

    this.content.add(this.modelOverviewSection);
  }

  async updateModelOverview(modelName) {
    if (!this.modelOverviewContent) return;
    
    this.modelOverviewContent.clear();

    if (!modelName) {
      const emptyState = UIComponents.text("Select a model to view its overview");

      emptyState.setStyle("font-size", ["12px"]);

      emptyState.setStyle("color", ["var(--theme-text-light)"]);

      emptyState.setStyle("padding", ["var(--phi-0-5)"]);

      this.modelOverviewContent.add(emptyState);

      return;
    }

    const loadingText = UIComponents.text("Loading...");

    loadingText.setStyle("font-size", ["12px"]);

    loadingText.setStyle("color", ["var(--theme-text-light)"]);

    this.modelOverviewContent.add(loadingText);

    try {
      const overview = await AECO_tools.bim.project.getModelOverview(modelName);

      this.modelOverviewContent.clear();

      const camelToTitle = (str) => str.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim();

      const statsGrid = UIComponents.row();

      statsGrid.setStyle("display", ["grid"]);

      statsGrid.setStyle("grid-template-columns", ["repeat(3, 1fr)"]);

      statsGrid.setStyle("gap", ["var(--phi-0-5)"]);

      for (const [key, value] of Object.entries(overview)) {
        const count = Array.isArray(value) ? value.length : 0;

        const label = camelToTitle(key);
        
        const item = UIComponents.div().addClass("SquareOperator");

        item.add(UIComponents.text(label));

        item.add(UIComponents.span(String(count)).addClass("GameNumber"));

        statsGrid.add(item);
      }

      this.modelOverviewContent.add(statsGrid);

      if (overview.costSchedules && overview.costSchedules.length > 0) {
        const costSection = UIComponents.collapsibleSection({
          title: `Cost Schedules (${overview.costSchedules.length})`,
          collapsed: true
        });

        const costList = UIComponents.list();

        for (const cost of overview.costSchedules) {
          const item = UIComponents.listItem().addClass("justify-between");

          item.add(UIComponents.text(cost.Name || "Unnamed"));

          item.add(UIComponents.badge(cost.type?.replace("Ifc", "") || ""));

          costList.add(item);
        }

        costSection.setContent(costList);

        this.modelOverviewContent.add(costSection);
      }

      if (overview.workSchedules && overview.workSchedules.length > 0) {
        const scheduleSection = UIComponents.collapsibleSection({
          title: `Work Schedules (${overview.workSchedules.length})`,
          collapsed: true
        });

        const scheduleList = UIComponents.list();

        for (const schedule of overview.workSchedules) {
          const item = UIComponents.listItem().addClass("justify-between");

          item.add(UIComponents.text(schedule.Name || "Unnamed"));

          item.add(UIComponents.badge(schedule.type?.replace("Ifc", "") || ""));

          scheduleList.add(item);
        }

        scheduleSection.setContent(scheduleList);

        this.modelOverviewContent.add(scheduleSection);
      }

    } catch (err) {
      this.modelOverviewContent.clear();

      const errorText = UIComponents.text("Failed to load overview");

      errorText.setStyle("color", ["var(--theme-error)"]);

      this.modelOverviewContent.add(errorText);
    }
  }

  drawQuickActions(context, operators) {

    const newModelCreation = () => {
      const createProject = UIComponents.column().setStyles({
      width: "100%",
      height: "fit-content",
      });

      const labelProject = UIComponents.text("Create New IFC Model:").addClass('hud-label')

      const nameInput = UIComponents.input().addClass('hud-input')

      nameInput.setValue("Project Name");

      const add = UIComponents.operator("add")

      add.onClick( () => {

        const name = nameInput.getValue() || "Unnamed";

        operators.execute("bim.new_model", context, name );
      
      } );

      const tooltip = UIComponents.tooltip("Add New BIM Model");

      tooltip.attachTo(add);

      createProject.add(labelProject, UIComponents.row().gap("var(--phi-0-5)").add(nameInput, add) );

      return createProject;
    }

    const row = UIComponents.row().gap("var(--phi-0-5)").padding("var(--phi-1)");

    row.setStyles({
      width: "100%"
    });

    row.setStyle("align-items", ["center"]);

    row.setStyle("justify-content", ["space-between"]);

    const createProject = newModelCreation();

    row.add(createProject);
  
    return row
  }
}

export default [ ProjectUI ];
