import { Operator } from "../../operators/Operator.js";

import AECO_TOOLS from "../../tool/index.js";

import dataStore from "../../data/index.js";

import operators from "../../operators/index.js";

import { Collection } from "../../data/DataCollections/Collection.js";

import * as BIMCore from "../../core/bim.js";

import { refreshActiveTypeData } from "../bim.types/data.js";

import { CoordinateSystemHelper } from "../../context/world/utils/CoordinateSystemHelper.js";

const AVAILABLE_ELEMENT_TOOLS = AECO_TOOLS.world.drawing.AVAILABLETOOLS;

class BIM_SetActiveType extends Operator {
  static operatorName = "bim.set_active_type";

  static operatorLabel = "Operator Template";

  static operatorOptions = ["REGISTER"];

  constructor(context, GlobalId) {
    super(context);

    this.context = context;

    this.GlobalId = GlobalId;

    this.activeModel = context.ifc.activeModel;
  }

  poll() {
    return this.activeModel != null;
  }

  async execute() {
    
    this.context.ifc.activeType = this.GlobalId;

    const activeModel = this.context.ifc.activeModel;

    const ifcClass = await AECO_TOOLS.ifc.getClass(activeModel, this.GlobalId);

    const isSetup = await this._setupMode(ifcClass);

    if (!isSetup) {
      return {
        status: "CANCELLED",
        message: `BIM_SetActiveType: No available modeling Tool for IFC type ${ifcClass}`,
      };
    }

    refreshActiveTypeData();

    this.context.signals.activeTypeChanged.dispatch({
      GlobalId: this.GlobalId,
      IfcClass: ifcClass,
    });

    return { status: "FINISHED" };
  }

  async _setupMode(ifcClass) {
    const toIFC = CoordinateSystemHelper.toIFCCoordinates;

    const mode = AVAILABLE_ELEMENT_TOOLS[ifcClass];

    if (!mode) {

      return false;
    }

    AECO_TOOLS.world.drawing.setMode(this.context, mode.drawMode, ifcClass);

    await this._setupModelingParameters(ifcClass);

    AECO_TOOLS.world.drawing.onPlacementFinished = async ({ params }) => {

        if (params.start) params.start = toIFC(params.start);

        if (params.end) params.end = toIFC(params.end);

        if (params.position) params.position = toIFC(params.position);

        if (params.start && params.elevation === undefined) {
          params.elevation = params.start.z;
        }

        await operators.execute(mode.operator, this.context, this.activeModel, params);
    };

    return true;
  }

  async _setupModelingParameters(ifcClass) {

    const handlePosition = (options) => {
      const toIFC = CoordinateSystemHelper.toIFCCoordinates;

      if (isTwoPointExtrusion) {
        options.start = toIFC({ x: 0, y: 0, z: 0 });

        options.end = toIFC({ x: 3, y: 0, z: 0 });
      } else {
        options.position = toIFC({ x: 1, y: 1, z: -1 });
      }
    };

    const isLayeredConstruction = await AECO_TOOLS.bim.types.isLayeredElement();

    const isProfiledConstruction = await AECO_TOOLS.bim.types.isProfiledElement();

    const twoPointExtrusionTypes = [
      "IfcWallType",
      "IfcCoveringType",
      "IfcBeamType",
      "IfcFootingType",
    ];

    const isTwoPointExtrusion = twoPointExtrusionTypes.includes(ifcClass);

    let options = null;

    if (ifcClass === "IfcSlabType") {
      options = {
        thickness: 0.2,  
      };
      
    } else if (ifcClass === "IfcPileType") {
      
      options = {
        depth: 6.0,  
        width: 0.4,  
        thickness: 0.4,  
      };

      handlePosition(options);
    } else if (isLayeredConstruction) {
      options = {
        height: 3.0,
        length: 2,
        thickness: 0.2,
        alignment: "center",
      };

      handlePosition(options);
    } else if (isProfiledConstruction) {
      options = {
        depth: 3.0,
        width: 0.3,  
        thickness: 0.3,  
      };

      handlePosition(options);
    } else {
      
      if (ifcClass === "IfcWindowType") {
        options = {
          width: 1.2,
          height: 1.5,
          sillHeight: 1.0,
          rotation: {x: 0, y: 0, z: 0},
        };
      } else if (ifcClass === "IfcDoorType") {
        options = {
          width: 0.9,
          height: 2.1,
          rotation: {x: 0, y: 0, z: 0},
        };
      } else if (ifcClass === "IfcFurnitureType" || ifcClass === "IfcSystemFurnitureType") {
        
        options = {
          width: 1.0,
          height: 1.0,
          depth: 1.0,
          rotation: {x: 0, y: 0, z: 0},
        };
      } else {
        
        options = {
          width: 1.0,
          height: 1.0,
          depth: 1.0,
          rotation: {x: 0, y: 0, z: 0},
        };
      }

      handlePosition(options);
    }
    
    AECO_TOOLS.world.drawing.setOptions(options);
    
    return options;
  }
}

class BIM_CreateSpace extends Operator {
  static operatorName = "bim.create_space";

  static operatorLabel = "Create Space";

  static operatorOptions = ["REGISTER", "UNDO"];

  constructor(context, modelName, params) {
    super(context);

    this.context = context;

    this.modelName = modelName || context.ifc?.activeModel;

    this.params = params || {
      height: 3.0,
      polyline: [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 1, y: 0 },
        { x: 0, y: 0 },
      ],
    };

    this.createdGlobalId = null;
  }

  poll() {
    return AECO_TOOLS.code.pyWorker.initialized.bim && this.params?.polyline;
  }

  async execute() {
    const activeType = this.context.ifc.activeType;

    this.params.typeGuid = activeType;

    const data = await AECO_TOOLS.code.pyWorker.run_api("createSpace", {
      modelName: this.modelName,
      params: this.params,
    });

    const result = await BIMCore.addIfcElementToScene(data, data.GlobalId, {
      bimTools: AECO_TOOLS.bim,
      worldTools: AECO_TOOLS.world,
      context: this.context,
    });

    this.createdGlobalId = data.GlobalId;

    return { status: "FINISHED", result };
  }

  async undo() {
    if (this.createdGlobalId) {
      await BIMCore.deleteElement(this.modelName, this.createdGlobalId, {
        bimTools: AECO_TOOLS.bim,
        worldTools: AECO_TOOLS.world,
        context: this.context,
        signals: this.context.signals,
      });
    }

    return { status: "CANCELLED" };
  }
}

/**
 * Create a wall between two points
 */
class BIM_CreateLayeredConstruction extends Operator {
  static operatorName = "bim.vertical_layer";

  static operatorLabel = "Horizontal Construction";

  static operatorOptions = ["REGISTER", "UNDO"];

  constructor(context, modelName, params) {
    super(context);

    this.context = context;

    this.modelName = modelName || context.ifc?.activeModel;

    this.params = params; 

    this.createdGlobalId = null;
  }

  poll() {
    const pyWorkerReady = AECO_TOOLS.code.pyWorker.initialized.bim;

    const hasStart = this.params?.start;

    const hasEnd = this.params?.end;

    return pyWorkerReady && hasStart && hasEnd;
  }

  async execute() {

    if(! this.params.typeGuid ) {
        
        this.params.typeGuid = this.context.ifc.activeType;
        
    }

    const data = await AECO_TOOLS.code.pyWorker.run_api("vertical_layer", {
      modelName: this.modelName,
      params: this.params,
    });

    const result = await BIMCore.addIfcElementToScene(data, data.GlobalId, {
      bimTools: AECO_TOOLS.bim,
      worldTools: AECO_TOOLS.world,
      context: this.context,
    });

    this.createdGlobalId = data.GlobalId;

    return { status: "FINISHED", data };
  }

  async undo() {
    if (this.createdGlobalId) {
      await BIMCore.deleteElement(this.modelName, this.createdGlobalId, {
        bimTools: AECO_TOOLS.bim,
        worldTools: AECO_TOOLS.world,
        context: this.context,
        signals: this.context.signals,
      });
    }

    return { status: "CANCELLED" };
  }
}

class BIM_CreateProfiledConstruction extends Operator {
  static operatorName = "bim.profiled_construction";

  static operatorLabel = "Profiled Construction";

  static operatorOptions = ["REGISTER", "UNDO"];

  constructor(context, modelName, params) {
    super(context);

    this.context = context;

    this.modelName = modelName || context.ifc?.activeModel;

    this.params = params

    this.createdGlobalId = null;
  }

  poll() {
    const pyWorkerReady = AECO_TOOLS.code.pyWorker.initialized.bim;

    return pyWorkerReady;
  }

  async execute() {
        
      if(! this.params.typeGuid ) {
          
        this.params.typeGuid = this.context.ifc.activeType;
        
    }
    
    const data = await AECO_TOOLS.code.pyWorker.run_api("profiled_construction", {
      modelName: this.modelName,
      params: this.params,
    });

    const result = await BIMCore.addIfcElementToScene(data, data.GlobalId, {
      bimTools: AECO_TOOLS.bim,
      worldTools: AECO_TOOLS.world,
      context: this.context,
    });

    this.createdGlobalId = data.GlobalId;

    return { status: "FINISHED", data };
  }

  async undo() {
    if (this.createdGlobalId) {
      await BIMCore.deleteElement(this.modelName, this.createdGlobalId, {
        bimTools: AECO_TOOLS.bim,
        worldTools: AECO_TOOLS.world,
        context: this.context,
        signals: this.context.signals,
      });
    }

    return { status: "CANCELLED" };
  }
}

class BIM_CreateTypeOccurence extends Operator {
  static operatorName = "bim.new_occurence";

  static operatorLabel = "New Occurence";

  static operatorOptions = ["REGISTER", "UNDO"];

  constructor(context, modelName, params) {
    super(context);

    this.context = context;

    this.modelName = modelName || context.ifc.activeModel;

    this.params = params

    this.createdGlobalId = null;
  }

  poll() {
    const pyWorkerReady = AECO_TOOLS.code.pyWorker.initialized.bim;

    return pyWorkerReady;
  }

  async execute() {
        
      if(! this.params.typeGuid ) {
          
        this.params.typeGuid = this.context.ifc.activeType;
        
    }
    
    const data = await AECO_TOOLS.code.pyWorker.run_api("createTypeOccurence", {
      modelName: this.modelName,
      params: this.params,
    });

    const result = await BIMCore.addIfcElementToScene(data, data.GlobalId, {
      bimTools: AECO_TOOLS.bim,
      worldTools: AECO_TOOLS.world,
      context: this.context,
    });

    this.createdGlobalId = data.GlobalId;

    return { status: "FINISHED", data };
  }

  async undo() {
    if (this.createdGlobalId) {
      await BIMCore.deleteElement(this.modelName, this.createdGlobalId, {
        bimTools: AECO_TOOLS.bim,
        worldTools: AECO_TOOLS.world,
        context: this.context,
        signals: this.context.signals,
      });
    }

    return { status: "CANCELLED" };
  }
}

/**
 * Create a horizontal layered element (slab, floor) from a polyline perimeter
 */
class BIM_CreateHorizontalLayer extends Operator {
  static operatorName = "bim.horizontal_layer";

  static operatorLabel = "Horizontal Layer";

  static operatorOptions = ["REGISTER", "UNDO"];

  constructor(context, modelName, params) {
    super(context);

    this.context = context;

    this.modelName = modelName || context.ifc?.activeModel;

    this.params = params; 

    this.createdGlobalId = null;
  }

  poll() {
    const pyWorkerReady = AECO_TOOLS.code.pyWorker.initialized.bim;

    const hasPolyline = this.params?.polyline && this.params.polyline.length >= 3;

    return pyWorkerReady && hasPolyline;
  }

  async execute() {
    if (!this.params.typeGuid) {
      this.params.typeGuid = this.context.ifc.activeType;
    }

    const data = await AECO_TOOLS.code.pyWorker.run_api("horizontal_layer", {
      modelName: this.modelName,
      params: this.params,
    });

    const result = await BIMCore.addIfcElementToScene(data, data.GlobalId, {
      bimTools: AECO_TOOLS.bim,
      worldTools: AECO_TOOLS.world,
      context: this.context,
    });

    this.createdGlobalId = data.GlobalId;

    return { status: "FINISHED", data };
  }

  async undo() {
    if (this.createdGlobalId) {
      await BIMCore.deleteElement(this.modelName, this.createdGlobalId, {
        bimTools: AECO_TOOLS.bim,
        worldTools: AECO_TOOLS.world,
        context: this.context,
        signals: this.context.signals,
      });
    }

    return { status: "CANCELLED" };
  }
}

/**
 * Create a window in a wall
 */
class BIM_CreateWindow extends Operator {
  static operatorName = "bim.create_window";

  static operatorLabel = "Create Window";

  static operatorOptions = ["REGISTER", "UNDO"];

  constructor(context, modelName, params) {
    super(context);

    this.context = context;

    this.modelName = modelName || context.ifc?.activeModel;

    this.params = params; 

    this.createdGlobalId = null;

    this.hostGuid = params?.hostGuid;
  }

  poll() {
    return AECO_TOOLS.code.pyWorker.initialized.bim && this.params?.hostGuid;
  }

  async execute() {
    const result = await BIMCore.createWindow(this.modelName, this.params, {
      bimTools: AECO_TOOLS.bim,
      worldTools: AECO_TOOLS.world,
      context: this.context,
      signals: this.context.signals,
    });

    this.createdGlobalId = result.GlobalId;

    return { status: "FINISHED", result };
  }

  async undo() {
    if (this.createdGlobalId) {
      await BIMCore.deleteElement(this.modelName, this.createdGlobalId, {
        bimTools: AECO_TOOLS.bim,
        worldTools: AECO_TOOLS.world,
        context: this.context,
        signals: this.context.signals,
      });

      if (this.hostGuid) {
        await BIMCore.refreshElementGeometry(this.modelName, this.hostGuid, {
          bimTools: AECO_TOOLS.bim,
          worldTools: AECO_TOOLS.world,
          context: this.context,
          signals: this.context.signals,
        });
      }
    }

    return { status: "CANCELLED" };
  }
}

/**
 * Create a door in a wall
 */
class BIM_CreateDoor extends Operator {
  static operatorName = "bim.create_door";

  static operatorLabel = "Create Door";

  static operatorOptions = ["REGISTER", "UNDO"];

  constructor(context, modelName, params) {
    super(context);

    this.context = context;

    this.modelName = modelName || context.ifc?.activeModel;

    this.params = params; 

    this.createdGlobalId = null;

    this.hostGuid = params?.hostGuid;
  }

  poll() {
    return AECO_TOOLS.code.pyWorker.initialized.bim && this.params?.hostGuid;
  }

  async execute() {
    const result = await BIMCore.createDoor(this.modelName, this.params, {
      bimTools: AECO_TOOLS.bim,
      worldTools: AECO_TOOLS.world,
      context: this.context,
      signals: this.context.signals,
    });

    this.createdGlobalId = result.GlobalId;

    return { status: "FINISHED", result };
  }

  async undo() {
    if (this.createdGlobalId) {
      await BIMCore.deleteElement(this.modelName, this.createdGlobalId, {
        bimTools: AECO_TOOLS.bim,
        worldTools: AECO_TOOLS.world,
        context: this.context,
        signals: this.context.signals,
      });

      if (this.hostGuid) {
        await BIMCore.refreshElementGeometry(this.modelName, this.hostGuid, {
          bimTools: AECO_TOOLS.bim,
          worldTools: AECO_TOOLS.world,
          context: this.context,
          signals: this.context.signals,
        });
      }
    }

    return { status: "CANCELLED" };
  }
}

/**
 * Refresh geometry for an existing element
 */
class BIM_RefreshElement extends Operator {
  static operatorName = "bim.refresh_element";

  static operatorLabel = "Refresh Element Geometry";

  static operatorOptions = ["REGISTER"];

  constructor(context, modelName, GlobalId) {
    super(context);

    this.context = context;

    this.modelName = modelName || context.ifc?.activeModel;

    this.GlobalId = GlobalId;
  }

  poll() {
    return AECO_TOOLS.code.pyWorker.initialized.bim && this.GlobalId;
  }

  async execute() {
    await BIMCore.refreshElementGeometry(this.modelName, this.GlobalId, {
      bimTools: AECO_TOOLS.bim,
      worldTools: AECO_TOOLS.world,
      context: this.context,
      signals: this.context.signals,
    });

    return { status: "FINISHED" };
  }
}

/**
 * Delete an IFC element
 */
class BIM_DeleteElement extends Operator {
  static operatorName = "bim.delete_element";

  static operatorLabel = "Delete Element";

  static operatorOptions = ["REGISTER", "UNDO"];

  constructor(context, modelName, GlobalId) {
    super(context);

    this.context = context;

    this.modelName = modelName || context.ifc?.activeModel;

    this.GlobalId = GlobalId;

    this._undoData = null;
  }

  poll() {
    return AECO_TOOLS.code.pyWorker.initialized.bim && this.GlobalId;
  }

  async execute() {
    // TODO: Store element data for undo

    await BIMCore.deleteElement(this.modelName, this.GlobalId, {
      bimTools: AECO_TOOLS.bim,
      worldTools: AECO_TOOLS.world,
      context: this.context,
      signals: this.context.signals,
    });

    return { status: "FINISHED" };
  }
}

export default [
  BIM_SetActiveType,
  BIM_CreateSpace,
  BIM_CreateTypeOccurence,
  BIM_CreateLayeredConstruction,
  BIM_CreateHorizontalLayer,
  BIM_CreateProfiledConstruction,
  BIM_CreateWindow,
  BIM_CreateDoor,
  BIM_RefreshElement,
  BIM_DeleteElement,
];
