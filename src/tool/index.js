
import NotificationTool from './viewer/NotificationTool.js';

import LayerTool from './viewer/LayerTool.js';

import ConfiguratorTool from './configurator/ConfiguratorTool.js';

import SceneTool from './viewer/SceneTool.js';

import ModelTool from './model/model.js'; 

import PlacementTool from './model/placement.js'; 

import DrawingTool from './model/drawing.js';

import MarkupTool from './viewer/MarkupTool.js';

import ViewpointTool from './viewer/ViewpointTool.js';

import AnimationPathTool from './viewer/AnimationPathTool.js';

import MeasureTool from './viewer/MeasureTool.js';

import SectionBoxTool from './viewer/SectionBoxTool.js';

import ProjectionTool from './viewer/ProjectionTool.js';

import NavigationTool from './viewer/NavigationTool.js';

import PythonSandbox from './pyodide/Python.js'

import CodeEditorTool from './code/CodeEditorTool.js';

import IfcTool from './bim/ifc.js';

import ProjectTool from './bim/project.js';
import GeometryTool from './bim/geometry.js';
import AttributeTool from './bim/attribute.js';
import PsetTool from './bim/pset.js';
import SequenceTool from './bim/sequence.js';
import CostTool from './bim/cost.js';
import TypeTool from './bim/type.js';
import BIMModelingTool from './bim/modeling.js';

/** @typedef {typeof import('./viewer/NotificationTool.js').default} NotificationToolType */
/** @typedef {typeof import('./viewer/LayerTool.js').default} LayerToolType */
/** @typedef {typeof import('./configurator/ConfiguratorTool.js').default} ConfiguratorToolType */
/** @typedef {typeof import('./viewer/SceneTool.js').default} SceneToolType */
/** @typedef {typeof import('./model/model.js').default} ModelToolType */
/** @typedef {typeof import('./model/placement.js').default} PlacementToolType */
/** @typedef {typeof import('./model/drawing.js').default} DrawingToolType */
/** @typedef {typeof import('./viewer/MarkupTool.js').default} MarkupToolType */
/** @typedef {typeof import('./viewer/ViewpointTool.js').default} ViewpointToolType */
/** @typedef {typeof import('./viewer/AnimationPathTool.js').default} AnimationPathToolType */
/** @typedef {typeof import('./viewer/MeasureTool.js').default} MeasureToolType */
/** @typedef {typeof import('./viewer/SectionBoxTool.js').default} SectionBoxToolType */
/** @typedef {typeof import('./viewer/ProjectionTool.js').default} ProjectionToolType */
/** @typedef {typeof import('./viewer/NavigationTool.js').default} NavigationToolType */
/** @typedef {typeof import('./pyodide/Python.js').default} PythonSandboxToolType */
/** @typedef {typeof import('./code/CodeEditorTool.js').default} CodeEditorToolType */
/** @typedef {typeof import('./bim/ifc.js').default} IfcToolType */
/** @typedef {typeof import('./bim/project.js').default} ProjectToolType */
/** @typedef {typeof import('./bim/geometry.js').default} GeometryToolType */
/** @typedef {typeof import('./bim/attribute.js').default} AttributeToolType */
/** @typedef {typeof import('./bim/pset.js').default} PsetToolType */
/** @typedef {typeof import('./bim/sequence.js').default} SequenceToolType */
/** @typedef {typeof import('./bim/cost.js').default} CostToolType */
/** @typedef {typeof import('./bim/type.js').default} TypeToolType */
/** @typedef {typeof import('./bim/modeling.js').default} BIMModelingToolType */

/**
 * @typedef {Object} WorldTools
 * @property {ConfiguratorToolType} configurator - Configuration management tool
 * @property {LayerToolType} layer - Layer/World management tool
 * @property {SceneToolType} scene - Three.js scene tool
 * @property {ModelToolType} model - Model management tool
 * @property {DrawingToolType} drawing - Drawing/annotation tool
 * @property {MarkupToolType} markup - Markup helpers
 * @property {PlacementToolType} placement - Transform and rotation tool
 * @property {NotificationToolType} notification - Notification system
 * @property {ViewpointToolType} viewpoint - Camera viewpoint capture/restore
 * @property {AnimationPathToolType} animationPath - Animation path management
 * @property {NavigationToolType} navigate - Navigation scene helpers and defaults
 * @property {MeasureToolType} measure - Measurement tool
 * @property {SectionBoxToolType} sectionBox - Section box tool
 * @property {ProjectionToolType} projection - Planar section / merged world geometry helper
 */

/**
 * @typedef {Object} CodeTools
 * @property {PythonSandboxToolType} pyWorker - Python execution sandbox (Pyodide)
 * @property {CodeEditorToolType} editor - Code editor tool
 */

/**
 * @typedef {Object} BIMTools
 * @property {IfcToolType} ifc - IFC root
 * @property {ProjectToolType} project - Project management
 * @property {GeometryToolType} geometry - Geometry processing
 * @property {AttributeToolType} attribute - Attribute editing
 * @property {PsetToolType} pset - Property sets and quantity sets
 * @property {SequenceToolType} sequence - Construction sequence
 * @property {CostToolType} cost - Cost schedule management
 * @property {BIMModelingToolType} modeling - BIM element creation
 * @property {TypeToolType} types - BIM type management
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
      markup: MarkupTool,
      placement: PlacementTool, 
      notification: NotificationTool,
      viewpoint: ViewpointTool,
      animationPath: AnimationPathTool,
      navigate: NavigationTool,
      measure: MeasureTool,
      sectionBox: SectionBoxTool,
      projection: ProjectionTool,
    }

    /**
     * Code execution tools
     * @type {CodeTools}
     */
    this.code = {
      pyWorker: PythonSandbox,
      editor: CodeEditorTool,

    }

    /**
     * BIM-specific tools for IFC manipulation
     * @type {BIMTools}
     */
    this.bim = {
      ifc: IfcTool,
      project: ProjectTool,
      geometry: GeometryTool,
      attribute: AttributeTool,
      pset: PsetTool,
      sequence: SequenceTool,
      cost: CostTool,
      types: TypeTool,
      modeling: BIMModelingTool,
    };

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

}

/** @type {Tools} */
const AECO_TOOLS = new Tools()

export default AECO_TOOLS;
