import { Operator } from "../../operators/Operator.js";

import AECO_tools from "../../tool/index.js";

import operators from "../../operators/index.js";

import * as BIMCore from "../../core/bim.js";

class BIM_LoadModelFromPath extends Operator {
    static operatorName = "bim.load_model_from_path";

    static operatorLabel = "Load BIM Model from Path";

    static operatorOptions = ["REGISTER"];

    constructor( context, path, arrayBuffer = null, fileName = null ) {
        super( context );

        this.context = context;

        this.path = path;

        this.arrayBuffer = arrayBuffer;

        this.fileName = fileName;
    }

    poll() {
      return Boolean(AECO_tools.code.pyWorker.initialized.bim);
    }

    async execute() {
      if (!this.path && !this.arrayBuffer) {
        return { status: "CANCELLED" };
      }

      if (this.path) {

        const {GlobalId, FileName, Name} = await BIMCore.loadBIMModelFromPath(this.path, {
          context: this.context,
          bimTools: AECO_tools.bim,
          signals: this.context.signals
        });

        this.GlobalId = GlobalId;

        this.modelName = FileName;

        return { status: "FINISHED", result: {GlobalId, FileName, Name}  };

      } else if (this.arrayBuffer) {

        const blobFileName = this.fileName || "uploaded_model.ifc";

        const {GlobalId, FileName, Name} = await BIMCore.loadBIMModelFromBlob(blobFileName, this.arrayBuffer, {
          context: this.context,
          bimTools: AECO_tools.bim,
          signals: this.context.signals
        });

        this.GlobalId = GlobalId;

        this.modelName = FileName;

        return { status: "FINISHED", result: {GlobalId, FileName, Name}  };

      }

    }

    undo() {
      BIMCore.deleteBIMModel(this.GlobalId, {
        bimTools: AECO_tools.bim,
        signals: this.context.signals
      });

      return { status: "CANCELLED" };
    }
}

class BIM_SetActiveModel extends Operator {

    static operatorName = "bim.set_active_model";

    static operatorLabel = "Set Active BIM Model";

    static operatorOptions = ["REGISTER"];

    constructor( context, modelName ) {

        super( context );

        this.context = context;

        this.modelName = modelName;
    }

    poll() {
      return AECO_tools.code.pyWorker.initialized.bim;
    }

    async execute() {

      BIMCore.setActiveBIMModel(this.modelName, false, {
        context: this.context
      } )

      return { status: "FINISHED" };

    }
}

class BIM_EditProjectName extends Operator {
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
      return AECO_tools.initialized.bim && this.currentModel != null;
    }

    async execute() {
      const currentModel = this.currentModel;

      const GlobalId = await AECO_tools.ifc.getGLobalId( currentModel, 1 );

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

      const layerCollection = AECO_tools.world.layer.getLayerByName(currentModel);

      if (layerCollection) {
        layerCollection.name = this.new_name;

        if (layerCollection.scene) {
          layerCollection.scene.name = this.new_name;
        }
      }

      AECO_tools.bim.project.refreshProjectCollection(GlobalId, this.new_name);

      await operators.execute("bim.enable_editing_attributes", this.context, currentModel, GlobalId);

      this.context.signals.activeLayerUpdate.dispatch(AECO_tools.world.layer.World);

      this.context.signals.projectChanged.dispatch({ name: this.new_name });

      return { status: "FINISHED", result };
    }

    undo() {
      AECO_tools.undo(this.currentModel);

      return { status: "CANCELLED" };
    }

    redo() {
      AECO_tools.redo(this.currentModel);

      return { status: "FINISHED" };
    }
}

class BIM_SaveIFC extends Operator {
  static operatorName = "bim.save_ifc";

  static operatorLabel = "Save IFC Model";

  static operatorOptions = ["REGISTER"];

  constructor(context, modelName, format, fileHandle = null) {
    super(context);

    this.context = context;

    this.modelName = modelName;

    this.format = format || "ifc";

    this.fileHandle = fileHandle;
  }

  poll() {
    return AECO_tools.code.pyWorker.initialized.bim && this.modelName;
  }

  async execute() {
    const result = await BIMCore.saveBIMModelToFile(
      this.modelName,
      this.format,
      this.fileHandle,
      {
        bimTools: AECO_tools.bim,
      }
    );

    return { status: "FINISHED", result };
  }
}

class BIM_LoadGeometryData extends Operator {
    static operatorName = "bim.load_geometry_data";

    static operatorLabel = "Load Geometry Data";

    static operatorOptions = ["REGISTER"];

    constructor( context, modelName, targetLayerPath = null, geometryBackend = null ) {
        super( context );

        this.context = context;

        this.modelName = modelName;

        this.targetLayerPath = targetLayerPath || "Buildings" ;

        this.geometryBackend = geometryBackend || context.ifc.geometryBackend || "ifcopenshell";

      }

    poll() {
      const canExecute = this.modelName && AECO_tools.code.pyWorker.initialized.bim;

      if (! canExecute) {
        console.warn("[bim.load_geometry_data]Cannot execute operator,", { modelName: this.modelName, bimInitialized: AECO_tools.code.pyWorker.initialized.bim });
      }

        return canExecute;
    }

    async execute() {

      const projectRootGroup = await BIMCore.loadGeometryData(this.modelName, "IFC4", this.targetLayerPath, {
        projectTool : AECO_tools.bim.project,
        layerTool: AECO_tools.world.layer,
        sceneTool: AECO_tools.world.scene,
        placementTool:  AECO_tools.world.placement,
        geometryBackend: this.geometryBackend,
        context: this.context
      });

      operators.execute("world.activate_layer", this.context, projectRootGroup.userData.collectionId);

      return { status: "FINISHED" , group: projectRootGroup  };
    }
}

class BIM_NewModel extends Operator {
    static operatorName = "bim.new_model";

    static operatorLabel = "Create BIM";

    static operatorOptions = ["REGISTER"];

    constructor( context, modelName ) {
        super( context );

        this.context = context;

        this.modelName = modelName || "default";
    }

    poll() {
      return AECO_tools.code.pyWorker.initialized.bim;
    }

    async execute() {
        const result = await BIMCore.newBIMModel(this.modelName, {
          context: this.context,
          bimTools: AECO_tools.bim,
          signals: this.context.signals
        });

        this.GlobalId = result.GlobalId;

        return { status: "FINISHED", result };
    }

    undo() {
      BIMCore.deleteBIMModel(this.GlobalId, {
        bimTools: AECO_tools.bim,
        signals: this.context.signals
      });

      return { status: "CANCELLED" };
    }
}

export default [ BIM_EditProjectName, BIM_SetActiveModel, BIM_SaveIFC, BIM_LoadGeometryData, BIM_NewModel, BIM_LoadModelFromPath ];