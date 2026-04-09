import Core from "./core/index.js";

import tools from "./tool/index.js";

import operators from "./operators/index.js";

import dataStore from "./data/index.js";

import { AECOConfiguration } from "./configuration/config.js";

import { Components as UIComponents } from "./ui/Components/Components.js";

import context from "./context/index.js";

import Paths from "./utils/paths.js";

import { UIElement } from "./../drawUI/ui.js";

import { UI } from "./ui/index.js";

import {
  moduleRegistry,
  registerAllCoreModules,
} from "./modules/index.js";

import { Editor } from "./context/world/Editor.js";

import { Viewport } from "./context/world/Viewport.js";

import { ThreeHelpers } from "./context/world/utils/ThreeHelpers.js";

import { OrientationGizmo } from "./context/world/editor/ui/ViewerElements/gizmo/OrientationGizmo.js";

import { updateContextMobileViewportHints } from "./modules/world/mobileViewportDetection.js";

import { Sidebar, Properties } from "./context/world/editor/Sidebar.js";

import { Operator } from "./operators/Operator.js";

function normalizeLoadingProgressPercent(percentage) {
  const parsed = Number(percentage);

  if (Number.isNaN(parsed)) return 0;

  if (parsed < 0) return 0;

  if (parsed > 100) return 100;

  return parsed;
}

function scheduleApproximateRuntimeProgress(
  progressSignal,
  {
    category,
    label,
    pulseStartPercent = 16,
    pulseMaxPercent = 90,
  },
) {
  if (!progressSignal || typeof window === "undefined") {
    return () => {};
  }

  let pulseTimerId = null;

  let currentPercent = normalizeLoadingProgressPercent(pulseStartPercent);

  const limitPercent = normalizeLoadingProgressPercent(pulseMaxPercent);

  const dispatchProgressUpdate = (messageOverride) => {
    progressSignal.dispatch({
      phase: "update",
      category,
      message: messageOverride || label,
      percent: currentPercent,
    });
  };

  dispatchProgressUpdate();

  pulseTimerId = window.setInterval(() => {
    const remaining = limitPercent - currentPercent;

    if (remaining <= 0.5) {
      currentPercent = limitPercent;
    } else {
      currentPercent = currentPercent + Math.max(0.8, remaining * 0.08);
    }

    dispatchProgressUpdate();
  }, 160);

  return (finalPercent, finalMessage) => {
    if (pulseTimerId !== null) {
      window.clearInterval(pulseTimerId);

      pulseTimerId = null;
    }

    if (typeof finalPercent !== "number") {
      return;
    }

    currentPercent = normalizeLoadingProgressPercent(finalPercent);

    dispatchProgressUpdate(finalMessage);
  };
}

class AECO {
  constructor(container) {

    this.context = context;

    this.tools = tools;

    this.ops = operators;

    this.data = dataStore;

    this.core = Core;

    this.moduleRegistry = moduleRegistry;

    this._createEnvironment(context, container);

  }

  async initWorld({ config, container, addons }){
    if (!config || !container) {
      throw new Error("AECO constructor requires a configuration object and a DOM container.");
    }
    await this.createUI({ config, container, addons });
    this.tools.world.scene.addCube(1, "grey")

    const isPowerUser = config.app.CoreModules.some(
      (module) => module.id === "code.scripting" && module.active !== false
    );

    if (isPowerUser) {
      console.log("Power User Mode");
      await this.enablePython();
      await this.enableBIM();
    }
  }

  async createUI({ config, container, addons }){

    const mergedUI = this.context._deepMerge(
      JSON.parse(JSON.stringify(AECOConfiguration.ui)),
      config.ui || {}
    );

    const mergedApp = this.context._deepMerge(
      JSON.parse(JSON.stringify(AECOConfiguration.app)),
      config.app || {}
    );

    context.setConfig(mergedUI, mergedApp);

    Paths.configure(context.config.app.Settings);

    context.setAddonsConfig(addons);

    const coreModulesConfig = context.config.app.CoreModules || [];

    const activeIds = [
      ...coreModulesConfig.filter(c => c.active !== false).map(c => c.id),
      ...context.config.addons.filter(a => a.active !== false).map(a => a.module.id)
    ];

    const syncViewportToLayout = () => {
      if (typeof window === 'undefined') return;

      requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
      });
    };

    new UI(container, context, operators, activeIds);

    syncViewportToLayout();

    const sidebar = new Sidebar({ context, operators});

    // const properties = new Properties({ context, operators});

    this._uiDisabledModuleIds = this._collectUiDisabledModuleIds(context.config.ui?.WorldComponent);

    this.modulesReady = this._loadModules();

    await this.modulesReady;

    const layoutManager = context.ui.model.layoutManager

    this._syncMobileViewportHintsOnContext();

    this._setDefaultTheme();

    this._applySceneConfig();

    this._addTemplates();

    syncViewportToLayout();

    this.ops.execute("world.new_notification", this.context, {message: "The World is yours", type: "info"});
    
  }

  async enablePython() {
    const context = this.context;

    const progressSignal = context.signals.bimGeometryLoadProgress;

    progressSignal.dispatch({
      phase: "start",
      category: "python",
      message: "Loading Python runtime...",
      percent: 12,
    });

    const finalizeApproximateRuntimeProgress = scheduleApproximateRuntimeProgress(
      progressSignal,
      {
        category: "python",
        label: "Loading Python runtime...",
        pulseStartPercent: 18,
        pulseMaxPercent: 88,
      },
    );
    

    try {
      await this.ops.execute("code.enable_python", this.context);

      finalizeApproximateRuntimeProgress(96, "Finalizing Python runtime...");

      progressSignal.dispatch({
        phase: "complete",
        category: "python",
        message: "Python ready",
        percent: 100,
      });

      this.ops.execute("world.new_notification", context, {
        message: "Python loaded",
        type: "info",
      });
    } catch (err) {
      let errorMessage = "Python failed to load";

      if (err && err.message) {
        errorMessage = err.message;
      } else if (err) {
        errorMessage = String(err);
      }

      finalizeApproximateRuntimeProgress(0, errorMessage);

      progressSignal.dispatch({
        phase: "error",
        category: "python",
        message: errorMessage,
        percent: 0,
      });
      throw err;
    }
  }

  async enableBIM() {
    const context = this.context;

    const progressSignal = this.context.signals.bimGeometryLoadProgress;

    progressSignal.dispatch({
      phase: "start",
      category: "bim_runtime",
      message: "Loading BIM (IfcOpenShell)...",
      percent: 12,
    });

    const finalizeApproximateRuntimeProgress = scheduleApproximateRuntimeProgress(
      progressSignal,
      {
        category: "bim_runtime",
        label: "Loading BIM (IfcOpenShell)...",
        pulseStartPercent: 18,
        pulseMaxPercent: 88,
      },
    );

    try {
      const basePath = context.config.app.Settings.ifcOpenShellBasePath;

      await this.ops.execute("code.enable_bim", context, {
        wheelsPath: basePath,
      });

      finalizeApproximateRuntimeProgress(96, "Finalizing BIM runtime...");

      progressSignal.dispatch({
        phase: "complete",
        category: "bim_runtime",
        message: "BIM runtime ready",
        percent: 100,
      });

      this.ops.execute("world.new_notification", context, {
        message: "BIM loaded",
        type: "info",
      });
    } catch (err) {
      let errorMessage = "BIM runtime failed to load";

      if (err && err.message) {
        errorMessage = err.message;
      } else if (err) {
        errorMessage = String(err);
      }

      finalizeApproximateRuntimeProgress(0, errorMessage);

      progressSignal.dispatch({
        phase: "error",
        category: "bim_runtime",
        message: errorMessage,
        percent: 0,
      });

      throw err;
    }
  }

  /**
   * Traverse WorldComponent tree and collect moduleIds that have disabled: true (UI hidden in config).
   * Used so we don't load those modules' UI even though the module stays active.
   */
  _collectUiDisabledModuleIds(worldComponent) {
    const ids = new Set();

    if (!worldComponent || typeof worldComponent !== 'object') return ids;

    const visit = (node) => {
      if (node.moduleId && node.disabled === true) ids.add(node.moduleId);

      for (const child of node.children || []) visit(child);
    };

    visit(worldComponent);

    return ids;
  }

  _addTemplates() {

    this.ops.execute("world.create_world_layers", this.context);

    this._logistics();

    this._addCodeTemplates();
  }

  addConstructionEquipment(avatarName, definition) {

    const AECOFamilies = {
      drone: tools.world.model.createDrone,
      robot: tools.world.model.createRobot,
      digger: tools.world.model.createDigger,
      towerCrane: tools.world.model.createTowerCrane,
      mobileCrane: tools.world.model.createMobileCrane,
      forklift: tools.world.model.createForklift,
      truck: tools.world.model.createTruck,
    };

    const avatarElement = AECOFamilies[avatarName](definition);

    const position = {
      x:  2,
      y:  2,
      z: 2,
    };
    
    definition.position? this.tools.world.placement.setPosition(avatarElement.object, definition.position) : null;

    definition.rotation? this.tools.world.placement.rotate( avatarElement.object, definition.rotation?.axis || "z", definition.rotation?.angle || 90) : null

    this.tools.world.scene.addToLayer(avatarElement.object, "Logistics");

    return avatarElement;
  };

  _logistics() {
    
    const TC1 = {
      position: { x: 10, y: 50, z: 0 },
      rotation: { axis: 'z', angle: 0 },
      scale: 1,
      towerHeight: 30,
      boomLength: 40,
      counterJibLength: 14,
      tonnage: 10,
      trolleyPosition: 0.5,
      boomRotation: 0,
      towerColor: 0xffcc00,
      boomColor: 0xffcc00,
      cabColor: 0x1a3a4a,
      baseColor: 0x555555,
      cableColor: 0x444444,
      windowColor: 0x88ccdd,
    };

    const towerCrane = this.tools.world.model.createTowerCrane(TC1);

    this.tools.world.scene.addToLayer(towerCrane.object, "Logistics");

    const drone = this.addConstructionEquipment("drone", {
      scale: 0.5,
      position: { x: 5, y: -20, z: 10 },
      rotation: { axis: 'z', angle: 90 },
    });

    this.ops.execute("navigation.set_mode", this.context, 'FIRST_PERSON', { flyObject: drone.object });
  };

  _addCodeTemplates() {
    if (!this.isModuleActive("code.scripting")) return;

    try {
      this.ops.execute("code.create_template_scripts", this.context);
    } catch (e) {
      if (!e?.message?.includes("not found")) throw e;
    }
  }

  getActiveModules() {
    return moduleRegistry.listActive();
  }

  isModuleActive(moduleId) {
    return moduleRegistry.get(moduleId)?.isActive || false;
  }

  async activateModule(moduleId) {

    const moduleDef = moduleRegistry.get(moduleId);

    if (moduleDef) {
      for (const op of moduleDef.operators || []) {
        this.ops.add(op);
      }
    }

    return moduleRegistry.activate(moduleId, {
      context: this.context,
      operators: this.ops
    });
  }

  deactivateModule(moduleId) {
    return moduleRegistry.deactivate(moduleId);
  }

  async _loadModules() {
    const coreModulesConfig = this.context.config.app.CoreModules || [];

    const initialActiveIds = coreModulesConfig
      .filter((c) => c.active !== false)
      .map((c) => c.id)
      .filter((id) => id != null);

    const allDefinitions = registerAllCoreModules(moduleRegistry);

    const allIdsToActivate = moduleRegistry
      .getAllDependencies(initialActiveIds)
      .filter((id) => moduleRegistry.has(id));

    this.ops.registerModuleOperators(allDefinitions, allIdsToActivate);

    moduleRegistry.activateFromConfig(coreModulesConfig, {
      context: this.context,
      operators: this.ops
    }, { uiDisabledModuleIds: this._uiDisabledModuleIds });

    this._loadAddons();
  }

  _syncMobileViewportHintsOnContext() {
    updateContextMobileViewportHints(this.context);
  }
  
  _createEnvironment(context, container) {
    
    let ViewportDOM;

    if (!context.dom ) {

      const mount = container || (typeof document !== 'undefined' ? document.body : null);

      let existingWorld = null;

      if (mount) {
        try {
          existingWorld = (mount.querySelector && mount.querySelector('#' + CSS.escape('World'))) || (typeof document !== 'undefined' ? document.getElementById('World') : null);
        } catch (_) {}
      }

      if (existingWorld) {

        context.dom = existingWorld;

        context.root = new UIElement(existingWorld);

        const existingViewport = existingWorld.querySelector && existingWorld.querySelector('#' + CSS.escape('Viewport'));

        const viewportEl = existingViewport || (typeof document !== 'undefined' ? document.getElementById('Viewport') : null);

        if (viewportEl && existingWorld.contains(viewportEl)) {
          ViewportDOM = { dom: viewportEl };
        } else {
          ViewportDOM = UIComponents.div();

          ViewportDOM.setId('Viewport');

          existingWorld.appendChild(ViewportDOM.dom);
        }

        context.viewport = ViewportDOM;

      } else {

        const world = UIComponents.div();

        world.setId('World');

        ViewportDOM = UIComponents.div();

        ViewportDOM.setId('Viewport');

        world.add(ViewportDOM);

        if (mount) mount.appendChild(world.dom);

        context.dom = world.dom;

        context.root = world;

      }
      
    } else {
      ViewportDOM = context.viewport;
    }
    
    if (! ViewportDOM ) { 
      
      ViewportDOM = UIComponents.div();
      
      ViewportDOM.setId('Viewport');

      context.viewport = ViewportDOM;

      const mount = container || (typeof document !== 'undefined' ? document.body : null);

      if (mount) mount.appendChild(ViewportDOM.dom);

    }

    let applicationConfiguration = context.config.app;

    if (!applicationConfiguration.length) {

      applicationConfiguration = AECOConfiguration.app;
    }

    const editor = new Editor( context );

    ThreeHelpers.addLights(editor.scene);

    const orientationGizmo = new OrientationGizmo( editor.camera );

    let parent = document.getElementById('ViewportGizmo');

    if (!parent) {

      parent = ViewportDOM.dom;

      orientationGizmo.dom.style.top = 'var(--margin)';

      orientationGizmo.dom.style.right = 'var(--margin)';
    }

    parent.appendChild(orientationGizmo.dom);

    editor.orientationGizmo = orientationGizmo;



    context.viewport = new Viewport( context, operators, ViewportDOM );

    const controls = editor.controls;

    if (controls) {
      orientationGizmo.setControls(controls);
    }

    ViewportDOM.setOrientationGizmo(orientationGizmo);

  }

  _applySceneCameraConfig(editor, cameraSettings) {
    if (!cameraSettings || !editor || !editor.viewportCamera) return;

    const viewportCamera = editor.viewportCamera;

    const orthographicFromConfig = cameraSettings.type === 'orthographic';

    const perspectiveFromConfig = cameraSettings.type !== 'orthographic';

    if (viewportCamera.isPerspectiveCamera && perspectiveFromConfig) {
      if (cameraSettings.fov != null) viewportCamera.fov = cameraSettings.fov;

      if (cameraSettings.near != null) viewportCamera.near = cameraSettings.near;

      if (cameraSettings.far != null) viewportCamera.far = cameraSettings.far;

      viewportCamera.updateProjectionMatrix();

      editor.signals.cameraChanged.dispatch(viewportCamera);

      return;
    }

    if (viewportCamera.isOrthographicCamera && orthographicFromConfig) {
      if (cameraSettings.left != null) viewportCamera.left = cameraSettings.left;

      if (cameraSettings.right != null) viewportCamera.right = cameraSettings.right;

      if (cameraSettings.top != null) viewportCamera.top = cameraSettings.top;

      if (cameraSettings.bottom != null) viewportCamera.bottom = cameraSettings.bottom;

      if (cameraSettings.near != null) viewportCamera.near = cameraSettings.near;

      if (cameraSettings.far != null) viewportCamera.far = cameraSettings.far;

      viewportCamera.updateProjectionMatrix();

      editor.signals.cameraChanged.dispatch(viewportCamera);
    }
  }

  _applySceneConfig() {
    const context = this.context;

    const sceneConfig = context.config?.app?.Scene;

    if (!sceneConfig) return;

    const editor = context.editor;

    if (!editor) return;

    const ui = context.config?.ui;

    const currentTheme = ui?.theme?.current || ui?.theme?.default || 'night';

    const themeColors = ui?.theme?.colors?.[currentTheme];

    const themeBg = themeColors?.["background"]?.value;

    const bgColor = themeBg != null ? themeBg : sceneConfig.backgroundColor;

    if (bgColor != null) {
      editor.signals.sceneBackgroundChanged.dispatch('Color', bgColor, null, null, null, null, null, null);
    }



    if (sceneConfig.fog) {
      const fog = sceneConfig.fog;

      const fogType = fog.fogType || 'FogExp2';

      const hex = fog.fogColor != null ? fog.fogColor : 0x262626;

      const near = fog.fogNear != null ? fog.fogNear : 50;

      const far = fog.fogFar != null ? fog.fogFar : 2000;

      const density = fog.fogDensity != null ? fog.fogDensity : 0.0017;

      this.tools.world.scene.setFog({
        fogType,
        hex,
        near,
        far,
        density
      });
    } else {

      this.tools.world.scene.setFog({ fogType: 'None' });
    }

    context.viewport.applySceneConfig(sceneConfig);

    this._applySceneCameraConfig(editor, sceneConfig.camera);

    const axesSize = sceneConfig.axesSize != null ? sceneConfig.axesSize : 250;

    const axesGroup = ThreeHelpers.addAxes(editor.sceneHelpers, axesSize);

    axesGroup.visible = sceneConfig.axesVisible !== false;
  }
  
  _setDefaultTheme() {
    const ui = this.context.config?.ui;

    if (!ui?.theme) return;

    const theme = ui.theme.default;

    this.ops.execute("theme.change_to", this.context, theme);
  }

  _loadAddons() {
    const addons = this.context.config.addons || [];

    for (const addon of addons) {
      if (!addon.active) continue;

      const moduleDef = addon.module;

      moduleRegistry.register(moduleDef);

      for (const op of moduleDef.operators || []) {
        this.ops.add(op);
      }

      const loadUI = !this._uiDisabledModuleIds?.has(moduleDef.id);

      moduleRegistry.activate(moduleDef.id, {
        context: this.context,
        operators: this.ops
      }, { loadUI });
    }
  }
}

const Olympus = {
  AECO,
  Core,
  tools,
  context,
  UIComponents,
  operators,
  dataStore,
  moduleRegistry,
};

export default AECO;

export {
  AECO,
  Core,
  Operator,
  UIComponents,
  context,
  moduleRegistry,
  operators,
  dataStore,
  tools,
  Olympus,
};
