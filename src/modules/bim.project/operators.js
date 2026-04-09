import { Operator } from "../../operators/Operator.js";

import AECO_TOOLS from "../../tool/index.js";

import operators from "../../operators/index.js";

import * as BIMCore from "../../core/bim.js";

class BIM_OP_LoadModelFromPath extends Operator {
    static operatorName = "bim.load_model_from_path";

    static operatorLabel = "Load BIM Model from Path";

    static operatorOptions = ["REGISTER"];

    static operatorParams = {
      path: { type: "string", description: "URL or file path to the .ifc file" },
      fileName: { type: "string", description: "Display name for the loaded model" },
    };

    constructor( context, path, arrayBuffer = null, fileName = null ) {
        super( context );

        this.context = context;

        this.path = path;

        this.arrayBuffer = arrayBuffer;

        this.fileName = fileName;
    }

    poll() {
      return Boolean(this.path || this.arrayBuffer);
    }

    async execute() {
      if (!this.path && !this.arrayBuffer) {
        return { status: "CANCELLED" };
      }

      if (this.path) {

        const {GlobalId, FileName, Name} = await BIMCore.loadBIMModelFromPath(this.path, {
          context: this.context,
          bimTools: AECO_TOOLS.bim
        });

        this.GlobalId = GlobalId;

        this.modelName = FileName;

        return { status: "FINISHED", result: {GlobalId, FileName, Name}  };

      } else if (this.arrayBuffer) {

        const blobFileName = this.fileName || "uploaded_model.ifc";

        const {GlobalId, FileName, Name} = await BIMCore.loadBIMModelFromBlob(blobFileName, this.arrayBuffer, {
          context: this.context,
          bimTools: AECO_TOOLS.bim,
          signals: this.context.signals
        });

        this.GlobalId = GlobalId;

        this.modelName = FileName;

        return { status: "FINISHED", result: {GlobalId, FileName, Name}  };

      }

    }

    undo() {
      BIMCore.deleteBIMModel(this.GlobalId, {
        bimTools: AECO_TOOLS.bim,
        signals: this.context.signals
      });

      return { status: "CANCELLED" };
    }
}

class BIM_OP_SetActiveModel extends Operator {

    static operatorName = "bim.set_active_model";

    static operatorLabel = "Set Active BIM Model";

    static operatorOptions = ["REGISTER"];

    static operatorParams = {
      modelName: { type: "string", description: "Name of the BIM model to set as active" },
    };

    constructor( context, modelName ) {

        super( context );

        this.context = context;

        this.modelName = modelName;
    }

    poll() {
      return Boolean(this.modelName);
    }

    async execute() {

      BIMCore.setActiveBIMModel(this.modelName, false, {
        context: this.context
      } )

      return { status: "FINISHED" };

    }
}

class BIM_OP_EditProjectName extends Operator {
    static operatorName = "bim.edit_project_name";

    static operatorLabel = "Edit Project Name";

    static operatorOptions = ["REGISTER"];

    constructor( context, name ) {
        super( context );

        this.context = context;

        this.currentModel = this.context.ifc.activeModel;

        this.new_name = name || "default";
    }

    poll() {
      return AECO_TOOLS.code.pyWorker.initialized.bim && this.currentModel != null;
    }

    async execute() {
      const currentModel = this.currentModel;

      const GlobalId = await AECO_TOOLS.bim.ifc.getGLobalId( currentModel, 1 );

      if (!GlobalId) {
        return { status: "CANCELLED", success: false, message: "No GlobalId found for project" };
      }

      const result = await operators.execute("bim.edit_attributes", this.context, currentModel, GlobalId, { Name: this.new_name });


      if (!result.success) {
        return { status: "CANCELLED", result };
      }

      this.context.ifc.activeModel = this.new_name;
      
      const modelIndex = this.context.ifc.availableModels.indexOf(currentModel);

      if (modelIndex !== -1) {
        this.context.ifc.availableModels[modelIndex] = this.new_name;
      }

      const layerCollection = AECO_TOOLS.world.layer.getLayerByName(currentModel);

      if (layerCollection) {
        layerCollection.name = this.new_name;

        if (layerCollection.scene) {
          layerCollection.scene.name = this.new_name;
        }
      }

      AECO_TOOLS.bim.project.refreshProjectCollection(GlobalId, this.new_name);

      await operators.execute("bim.enable_editing_attributes", this.context, currentModel, GlobalId);

      this.context.signals.activeLayerUpdate.dispatch(AECO_TOOLS.world.layer.World);

      this.context.signals.projectChanged.dispatch({ name: this.new_name });

      const analyticsSignal = this.context.signals.bimIfcModelAnalyticsContextChanged;

      if (analyticsSignal && typeof analyticsSignal.dispatch === "function") {
        analyticsSignal.dispatch({ fileName: this.new_name });
      }

      return { status: "FINISHED", result };
    }

    undo() {

        AECO_TOOLS.bim.ifc.undo(this.currentModel);

      return { status: "CANCELLED" };
    }

    redo() {
      AECO_TOOLS.bim.ifc.redo(this.currentModel);

      return { status: "FINISHED" };
    }
}

class BIM_OP_SaveIFC extends Operator {
  static operatorName = "bim.save_ifc";

  static operatorLabel = "Save IFC Model";

  static operatorOptions = ["REGISTER"];

  static operatorParams = {
    modelName: { type: "string", description: "Name of the model to save" },
    format: { type: "string", description: "Output format", enum: ["ifc", "ifcZIP", "ifcXML"] },
  };

  constructor(context, modelName, format, fileHandle = null) {
    super(context);

    this.context = context;

    this.modelName = modelName;

    this.format = format || "ifc";

    this.fileHandle = fileHandle;
  }

  poll() {
    return AECO_TOOLS.code.pyWorker.initialized.bim && this.modelName;
  }

  async execute() {
    const result = await BIMCore.saveBIMModelToFile(
      this.modelName,
      this.format,
      this.fileHandle,
      {
        bimTools: AECO_TOOLS.bim,
      }
    );

    return { status: "FINISHED", result };
  }
}

class BIM_OP_LoadGeometryData extends Operator {
    static operatorName = "bim.load_geometry_data";

    static operatorLabel = "Load Geometry Data";

    static operatorOptions = ["REGISTER"];

    static operatorParams = {
      modelName: { type: "string", description: "Name of the model to load geometry for" },
      targetLayerPath: { type: "string", description: "Layer path for geometry (default: Buildings)" },
      geometryBackend: { type: "string", description: "Geometry backend to use", enum: ["ifcopenshell", "web-ifc", "ifc-lite"] },
    };

    constructor( context, modelName, targetLayerPath = null, geometryBackend = null ) {
        super( context );

        this.context = context;

        this.modelName = modelName;

        this.targetLayerPath = targetLayerPath || "Buildings" ;

        this.geometryBackend = geometryBackend || context.ifc.geometryBackend || "ifcopenshell";

      }

    poll() {
      const bimReady = Boolean(
        AECO_TOOLS.code.pyWorker.isReady && AECO_TOOLS.code.pyWorker.initialized.bim,
      );

      const hasCachedSource = AECO_TOOLS.bim.project.modelHasCachedSource(this.modelName);

      const notBlocked = !this.context.ifc.geometryLoadInProgress;

      return Boolean(this.modelName && notBlocked && (bimReady || hasCachedSource));
    }

    async execute() {

      const pythonBimReady = Boolean(
        AECO_TOOLS.code.pyWorker.isReady && AECO_TOOLS.code.pyWorker.initialized.bim,
      );

      const projectRootGroup = await BIMCore.loadGeometryData(this.modelName, "IFC4", this.targetLayerPath, {
        projectTool : AECO_TOOLS.bim.project,
        layerTool: AECO_TOOLS.world.layer,
        sceneTool: AECO_TOOLS.world.scene,
        placementTool:  AECO_TOOLS.world.placement,
        geometryBackend: this.geometryBackend,
        context: this.context,
        pythonBimReady,
      });

      operators.execute("world.activate_layer", this.context, projectRootGroup.userData.collectionId);

      return { status: "FINISHED" , group: projectRootGroup  };
    }
}

class BIM_OP_NewModel extends Operator {
    static operatorName = "bim.new_model";

    static operatorLabel = "Create BIM";

    static operatorOptions = ["REGISTER"];

    static operatorParams = {
      modelName: { type: "string", description: "Name for the new IFC model" },
    };

    constructor( context, modelName ) {
        super( context );

        this.context = context;

        this.modelName = modelName || "default";
    }

    poll() {
      return AECO_TOOLS.code.pyWorker.initialized.bim;
    }

    async execute() {
        const result = await BIMCore.newBIMModel(this.modelName, {
          context: this.context,
          bimTools: AECO_TOOLS.bim
        });

        this.GlobalId = result.GlobalId;

        return { status: "FINISHED", result };
    }

    undo() {
      BIMCore.deleteBIMModel(this.GlobalId, {
        bimTools: AECO_TOOLS.bim,
        signals: this.context.signals
      });

      return { status: "CANCELLED" };
    }
}

export default [
  BIM_OP_EditProjectName,
  BIM_OP_SetActiveModel,
  BIM_OP_SaveIFC,
  BIM_OP_LoadGeometryData,
  BIM_OP_NewModel,
  BIM_OP_LoadModelFromPath,
];