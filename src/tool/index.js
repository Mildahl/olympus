
import NotificationTool from './viewer/NotificationTool.js';

import LayerTool from './layer/LayerTool.js';

import ConfiguratorTool from './configurator/ConfiguratorTool.js';

import SceneTool from './viewer/SceneTool.js';

import ModelTool from './model/model.js'; 

import PlacementTool from './model/placement.js'; 

import DrawingTool from './model/drawing.js';

import SliceTool from './viewer/SliceTool.js';

import MarkupTool from './viewer/MarkupTool.js';

import ViewpointTool from './viewer/ViewpointTool.js';

import AnimationPathTool from './viewer/AnimationPathTool.js';

import MeasureTool from './viewer/MeasureTool.js';

import SectionBoxTool from './viewer/SectionBoxTool.js';

import PythonSandbox from './pyodide/Python.js'

import JSSandboxTool from './js/JsSandbox.js';

import CodeEditorTool from './code/CodeEditorTool.js';

import NodeEditorTool from './code/NodeEditorTool.js';

import AttributeTool from './bim/attribute.js';

import PsetTool from './bim/pset.js';

import SequenceTool from './bim/sequence.js';

import TypeTool from './bim/type.js';

import IfcTool from './bim/ifc.js';

import ProjectTool from './bim/project.js';

import GeometryTool from './bim/geometry.js';

import BIMModelingTool from './bim/modeling.js';

import SchedulerTool from './scheduler/SchedulerTool.js';

/**
 * @typedef {Object} WorldTools
 * @property {Object} configurator - Configuration management tool
 * @property {Object} layer - Layer/World management tool
 * @property {Object} scene - Three.js scene tool
 * @property {Object} model - Model management tool
 * @property {Object} drawing - Drawing/annotation tool
 * @property {Object} placement - Transform and rotation tool
 * @property {Object} notification - Notification system
 * @property {Object} viewpoint - Camera viewpoint capture/restore
 * @property {Object} animationPath - Animation path management
 * @property {Object|null} navigate - Navigation controls
 * @property {Object|null} gizmo - Transform gizmo
 * @property {Object|null} cursor - Cursor tool
 * @property {Object} measure - Measurement tool
 * @property {Object} sectionBox - Section box tool
 * @property {Object} slicer - 2D drawing/slicing tool
 */

/**
 * @typedef {Object} CodeTools
 * @property {Object} pyWorker - Python execution sandbox (Pyodide)
 * @property {Object} js - JavaScript sandbox
 * @property {Object} editor - Code editor tool
 * @property {Object} nodes - Node editor tool
 */

/**
 * @typedef {Object} BIMTools
 * @property {Object} project - Project management
 * @property {Object} loader - IFC model loader
 * @property {Object} geometry - Geometry processing
 * @property {Object} attribute - Attribute editing
 * @property {Object} pset - Property sets and quantity sets
 * @property {Object} sequence - Construction sequence
 * @property {Object} modeling - BIM element creation
 * @property {Object} types - BIM type management
 */

/**
 * Central tools registry providing access to all tool categories.
 * 
 */
class Tools  {
  constructor() {
    /**
     * World/viewer tools for 3D scene manipulation
     * @type {WorldTools}
     */
    this.world  = {
      configurator: ConfiguratorTool,
      layer: LayerTool, 
      scene: SceneTool,
      model: ModelTool,
      drawing: DrawingTool,
      slicer: SliceTool,
      markup: MarkupTool,
      placement: PlacementTool, 
      notification: NotificationTool,
      viewpoint: ViewpointTool,
      animationPath: AnimationPathTool,
      navigate: null,
      gizmo: null,
      cursor: null,
      measure: MeasureTool,
      sectionBox: SectionBoxTool,
    }

    /**
     * Code execution tools
     * @type {CodeTools}
     */
    this.code = {
      pyWorker: PythonSandbox,
      js: JSSandboxTool,
      editor: CodeEditorTool,
      nodes: NodeEditorTool,

    }

    /**
     * BIM-specific tools for IFC manipulation
     * @type {BIMTools}
     */
    this.bim = {
      project: ProjectTool, 
      geometry: GeometryTool,
      attribute: AttributeTool,
      pset: PsetTool,
      sequence: SequenceTool,
      types: TypeTool,
      modeling: BIMModelingTool, 
    }

    /**
     * IFC-specific tool (requires Python sandbox)
     * @type {Object}
     */
    this.ifc = IfcTool;

    /**
     * Scheduler tool for task selection and management
     * @type {Object}
     */
    this.scheduler = SchedulerTool;

    /**
     * Initialization status for tool categories
     * @type {{world: boolean, python: boolean, bim: boolean, bimContext: boolean}}
     */
    this.initialized = {
      world: true,
      python: false,
      bim: false,
      bimContext : false,
    };

    this.loading = false  ;
  }

  exportJSON( object, name ) {

    const json = JSON.stringify( object );

    const a = document.createElement( 'a' );

    const file = new Blob( [ json ], { type: 'text/plain' } );

    a.href = URL.createObjectURL( file );

    a.download = name + '.json';

    a.click();

  }

  async undo(modelName) {
    return await this.code.pyWorker.run_api('undo', {
      modelName,
    });
  }
}

const AECO_TOOLS = new Tools()

export default AECO_TOOLS;
