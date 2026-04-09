import { Components as UIComponents, TabPanel } from "../../ui/Components/Components.js";

import { UIHelper } from "../../ui/UIHelper.js";

import AECO_TOOLS from "../../tool/index.js";

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
  path : Paths.ifcSamples("office-refurbishement-Live.ifc"),
  fileName: "office-refurbishement-Live.ifc",
  size: "1.2 MB"
}
]

const BIM_IFCOPEN_SHELL_GEOMETRY_LOCKED_TOOLTIP =
  "Enable Python and BIM (IfcOpenShell) to load geometry with IfcOpenShell.";

class ProjectUI extends TabPanel {
  constructor({ context, operators }) {
    super({
      context,
      operators,
      position: 'left',
      tabId: 'bim-project-ifc-models',
      tabLabel: 'IFC models',
      icon: 'domain',
      title: 'IFC Building Models',
      showHeader: false,
      floatable: true,
      autoShow: false,
    });

    this.panel.addClass("Panel");

    this.projectsList = null;

    this.progressContainer = null;

    this.progressBar = null;

    this.progressLabel = null;

    this.progressPercent = null;

    this.progressPulseTimer = null;

    this.modelsWithGeometry = new Set();

    this.baseUI(context, operators);

    this.listen(context, operators);

    this.show({ select: false });
  }

  baseUI(context, operators) {
    this.content.addClass("Column");

    const dragAndDrop = this.openByFileDrop(context, operators);

    const templatescomponent = this.drawTemplates(context, operators);

    const progressComponent = this.drawProgressBar();

    this.content.add(dragAndDrop, templatescomponent, progressComponent);

    this.drawLoadedModels(context, operators);

    this.footer.add( this.drawQuickActions(context, operators) );

  }

  listen(context, operators) {
    context.signals.newIFCModel.add(() => {
      this.refreshModelsList(context, operators);
    });

    context.signals.activeModelChanged.add(() => {
      this.refreshModelsList(context, operators);
    });

    context.signals.newIFCGeometry.add(({ modelName }) => {
      if (!modelName) return;

      this.modelsWithGeometry.add(modelName);

      this.refreshModelsList(context, operators);
    });

    context.signals.bimGeometryLoadProgress.add((payload) => {
      if (!payload) return;

      if (payload.category && payload.category !== "geometry") {
        return;
      }

      const phase = payload.phase;

      if (phase === "start") {
        this.showProgress(payload.message, payload.percent);

        return;
      }

      if (phase === "update") {
        this.updateProgress(payload.message, payload.percent);

        return;
      }

      if (phase === "complete") {
        this.updateProgress(payload.message, payload.percent);

        window.setTimeout(() => {
          this.hideProgress();
        }, 600);

        return;
      }

      if (phase === "error") {
        this.hideProgress();

        const errorDetail = payload.message ? payload.message : "Unknown error";

        operators.execute("world.new_notification", context, {
          message: `Failed to load geometry: ${errorDetail}`,
          type: "error",
        });
      }
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

    const modelGeometryLoaded = this.modelsWithGeometry.has(loadedModelName);

    let loadGeometryOp = null;

    let loadLiteGeometryOp = null;

    if (!modelGeometryLoaded) {
      loadGeometryOp = UIComponents.button("Load Geometry (Safe & Slow)");

      loadLiteGeometryOp = UIComponents.button("Load Lite (Fast & Experimental)");

      loadGeometryOp.setIcon("view_in_ar");

      loadLiteGeometryOp.setIcon("view_in_ar");

      const runGeometryLoad = async (backend) => {
        try {
          await operators.execute("bim.load_geometry_data", context, loadedModelName, "Buildings", backend);
        } catch {
          return;
        }
      };

      loadLiteGeometryOp.onClick(async (clickEvent) => {
        clickEvent?.stopPropagation?.();

        await runGeometryLoad("ifc-lite");
      });

      UIHelper.bindOperatorPolling({
        element: loadGeometryOp,
        operators,
        context,
        operatorId: "bim.load_geometry_data",
        getArgs: () => [loadedModelName, "Buildings", "ifcopenshell"],
        lockedTooltip: BIM_IFCOPEN_SHELL_GEOMETRY_LOCKED_TOOLTIP,
        extraReadyCheck: () =>
          Boolean(AECO_TOOLS.code.pyWorker.isReady && AECO_TOOLS.code.pyWorker.initialized.bim),
        onLocked: () => {
          operators.execute("world.new_notification", context, {
            message: BIM_IFCOPEN_SHELL_GEOMETRY_LOCKED_TOOLTIP,
            type: "warning",
          });
        },
        onClick: async () => {
          await runGeometryLoad("ifcopenshell");
        },
      });
    }

    if (context.ifc.activeModel === loadedModelName) item.addClass("Active");

    if (loadGeometryOp && loadLiteGeometryOp) {
      item.add(name, loadGeometryOp, loadLiteGeometryOp, saveOp);
    } else {
      item.add(name, saveOp);
    }

    this.projectsList.add(item);
  }

  openByFileDrop (context, operators) {
    const message = 'DRAG AND DROP IFC, IFCZIP, IFCXML';

    const dragComponent = UIComponents.row().addClass('centered-vertical').setStyles({
      width: "100%",
      height: "fit-content",
      padding: "var(--phi-1)",
      gap: "var(--phi-1)",
    }).setTooltip(message);


    const openText = UIComponents.text('Open model')

    const label = UIComponents.text(message).addClass('hud-label');

    const dropArea = UIComponents.div();

    UIHelper.makeFileDropZone(dropArea, {
      accept: ['.ifc', '.ifczip', '.ifcxml'],
      onFile: async (file, arrayBuffer) => {
        this.showProgress(`Loading ${file.name} into memory...`, 100);

        try {
          await operators.execute("bim.load_model_from_path", context, null, arrayBuffer, file.name);

          this.hideProgress();
        } catch (err) {
          this.hideProgress();

          console.warn("Failed to load model:", err);

          operators.execute("world.new_notification", context, { message: `Failed to load model: ${err.message}`, type: "error" });
        }
      }
    });

    dropArea.add(label);
    
    dragComponent.add(openText, dropArea);

    return dragComponent;
  }

  drawTemplates(context, operators) {

    const title = UIComponents.h5("IFC Model Templates").padding("var(--phi-0-5)")

    const grid = UIComponents.row()
    
    grid.setStyles({
      display: "grid",
      "grid-template-columns": "repeat(4, 1fr)",
      gap: "var(--phi-0-5)",
      padding: "var(--phi-1)",
      marginBottom: "var(--phi-1)",
    })

    for ( const template of IFC_TEMPLATES ) {

      const item = UIComponents.div().addClass("SquareOperator");

      const iconDownload = UIComponents.icon("download");

      item.add(iconDownload, UIComponents.text(template.name), UIComponents.span(template.size).addClass("GameNumber").setStyle("font-size", ["12px"]))
      
      grid.add(item);

      const templateModelName = template.path.split("/").pop();

      item.onClick(() => {
        this.loadModelWithProgress(context, operators, template.path, templateModelName);
      });

      const modelName = templateModelName;

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

}

export default [ ProjectUI ];
