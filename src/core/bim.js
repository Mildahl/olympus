/**
 * BIM Core Functions
 *
 * Core business logic for BIM (Building Information Model) management.
 * These functions are called by operators and should remain decoupled from UI.
 */
import * as THREE from "three";

import * as WorldCore from "./world.js";

import * as AttributeCore from "./bim.attribute.js";

import * as SequenceCore from "./bim.sequence.js";

import * as CostCore from "./bim.cost.js";

import AttributeTool from "../tool/bim/attribute.js";

import PsetTool from "../tool/bim/pset.js";

import SceneTool from "../tool/viewer/SceneTool.js";

import SequenceTool from "../tool/bim/sequence.js";

import CostTool from "../tool/bim/cost.js";

function normalizeGeometryLoadProgressPercentage(percentage) {
  const parsed = Number(percentage);

  if (Number.isNaN(parsed)) return 0;

  if (parsed < 0) return 0;

  if (parsed > 100) return 100;

  return parsed;
}

function dispatchBimGeometryLoadProgressSignal(context, payload) {
  const progressSignal = context.signals.bimGeometryLoadProgress;

  if (!progressSignal) return;

  const merged = Object.assign({}, payload);

  if (!merged.category) {
    merged.category = "geometry";
  }

  progressSignal.dispatch(merged);
}


function scheduleApproximateBimGeometryLoadProgress(
  context,
  modelName,
  geometryBackend,
  label,
  pulseStartPercent,
  pulseMaxPercent,
  category = "geometry",
) {
  let pulseTimerId = null;

  let currentPercent = normalizeGeometryLoadProgressPercentage(pulseStartPercent);

  const limitPercent = normalizeGeometryLoadProgressPercentage(pulseMaxPercent);

  const dispatchProgressUpdate = () => {
    dispatchBimGeometryLoadProgressSignal(context, {
      phase: "update",
      category,
      modelName,
      geometryBackend,
      message: label,
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

  return function finalizeApproximateGeometryLoadProgress(finalProgress, finalMessage) {
    if (pulseTimerId !== null) {
      window.clearInterval(pulseTimerId);

      pulseTimerId = null;
    }

    if (typeof finalProgress === "number") {
      dispatchBimGeometryLoadProgressSignal(context, {
        phase: "update",
        category,
        modelName,
        geometryBackend,
        message: finalMessage || label,
        percent: normalizeGeometryLoadProgressPercentage(finalProgress),
      });
    }
  };
}

async function setActiveBIMModel(
  file_name,
  isNewModel = false,
  { context },
) {
  const isAlreadyActive = context.ifc.activeModel === file_name && !isNewModel;

  context.ifc.activeModel = file_name;

  context.signals.refreshBIMLayers.dispatch({ FileName: file_name});

  if (isNewModel) {
    context.signals.newIFCModel.dispatch({ FileName: file_name });
  }

  if (!isAlreadyActive) {
    context.signals.activeModelChanged.dispatch({ FileName: file_name });
  }

}

/**
 * Load a BIM model from file path
 * @param {string} path - Path to the IFC file
 * @param {Object} options
 * @returns {Object} Loaded model info
 */
async function loadBIMModelFromPath(path, { context, bimTools }) {
  const file_name = path.split("/").pop();

  let finalizeApproximateModelLoadProgress = null;

  dispatchBimGeometryLoadProgressSignal(context, {
    phase: "start",
    category: "ifc_model",
    message: `Loading IFC model ${file_name}...`,
    percent: 8,
  });

  try {
    finalizeApproximateModelLoadProgress = scheduleApproximateBimGeometryLoadProgress(
      context,
      file_name,
      null,
      `Reading IFC model ${file_name}...`,
      12,
      90,
      "ifc_model",
    );

    const result = await bimTools.project.loadModelFromPath(path);

    if (typeof finalizeApproximateModelLoadProgress === "function") {
      finalizeApproximateModelLoadProgress(96, `Finalizing IFC model ${file_name}...`);
    }

    bimTools.project.storeProject(context, {
      GlobalId: result.GlobalId,
      Name: result.Name,
      FileName: file_name,
      Path: path,
      TotalElements: result.totalElements,
    });

    setActiveBIMModel(file_name, true, { context });

    dispatchBimGeometryLoadProgressSignal(context, {
      phase: "complete",
      category: "ifc_model",
      message: `IFC model ${file_name} ready`,
      percent: 100,
    });

    return { GlobalId: result.GlobalId, FileName: file_name, Name: result.Name };
  } catch (err) {
    let errorMessage = "IFC model load failed";

    if (err && err.message) {
      errorMessage = err.message;
    } else if (err) {
      errorMessage = String(err);
    }

    if (typeof finalizeApproximateModelLoadProgress === "function") {
      finalizeApproximateModelLoadProgress(0, errorMessage);
    }

    dispatchBimGeometryLoadProgressSignal(context, {
      phase: "error",
      category: "ifc_model",
      message: errorMessage,
      percent: 0,
    });

    throw err;
  }
}


async function loadBIMModelFromBlob(fileName, arrayBuffer, { context, bimTools, signals }) {
  let finalizeApproximateModelLoadProgress = null;

  dispatchBimGeometryLoadProgressSignal(context, {
    phase: "start",
    category: "ifc_model",
    message: `Loading IFC model ${fileName}...`,
    percent: 8,
  });

  try {
    finalizeApproximateModelLoadProgress = scheduleApproximateBimGeometryLoadProgress(
      context,
      fileName,
      null,
      `Reading IFC model ${fileName}...`,
      12,
      90,
      "ifc_model",
    );

    const result = await bimTools.project.loadModelFromBlob(fileName, arrayBuffer);

    if (typeof finalizeApproximateModelLoadProgress === "function") {
      finalizeApproximateModelLoadProgress(96, `Finalizing IFC model ${fileName}...`);
    }

    bimTools.project.storeProject(context, {
      GlobalId: result.GlobalId,
      Name: result.Name,
      FileName: fileName,
      TotalElements: result.totalElements,
    });

    setActiveBIMModel(fileName, true, { context });

    dispatchBimGeometryLoadProgressSignal(context, {
      phase: "complete",
      category: "ifc_model",
      message: `IFC model ${fileName} ready`,
      percent: 100,
    });

    return { GlobalId: result.GlobalId, FileName: fileName, Name: result.Name };
  } catch (err) {
    let errorMessage = "IFC model load failed";

    if (err && err.message) {
      errorMessage = err.message;
    } else if (err) {
      errorMessage = String(err);
    }

    if (typeof finalizeApproximateModelLoadProgress === "function") {
      finalizeApproximateModelLoadProgress(0, errorMessage);
    }

    dispatchBimGeometryLoadProgressSignal(context, {
      phase: "error",
      category: "ifc_model",
      message: errorMessage,
      percent: 0,
    });

    throw err;
  }
}


/**
 * Create a new BIM model
 * @param {string} modelName - Name for the new model
 * @param {Object} options
 * @param {Object} options.bimTools - BIM tools (project, loader)
 * @param {Object} options.context - Context object
 * 
 */
async function newBIMModel(
  modelName = "default",
  { bimTools, context },
) {
  const result = await bimTools.project.newIFCModel(modelName);

  const fileName = result.Name + ".ifc";

  bimTools.project.storeProject(context, {
    GlobalId: result.GlobalId,
    Name: result.Name,
    FileName: fileName,
    Path: "Memory/" + result.Name,
    TotalElements: result.totalElements,
  });

  setActiveBIMModel(fileName, true, { context });

  return result;
}


/**
 * Delete a BIM model
 * @param {string} GlobalId - Model GlobalId
 * @param {Object} options
 */
async function deleteBIMModel(GlobalId, { bimTools, signals }) {
  await bimTools.project.deleteProject({ GlobalId });

  if (signals?.refreshBIMLayers) {
    signals.refreshBIMLayers.dispatch();
  }

  if (signals?.bimModelDeleted) {
    signals.bimModelDeleted.dispatch(GlobalId);
  }

  return { status: "FINISHED", GlobalId };
}

/**
 * Save a BIM model to file (File System Access API or download fallback).
 * @param {string} modelName - Loaded model name
 * @param {string} format - "ifc" | "ifcxml" | "ifczip"
 * @param {FileSystemFileHandle|null} fileHandle - Optional handle from showSaveFilePicker
 * @param {Object} options
 * @param {Object} options.bimTools - BIM tools (project)
 * @returns {Promise<{ status: string, path?: string }>}
 */
async function saveBIMModelToFile(modelName, format, fileHandle, { bimTools }) {
  const { content, filename, mimeType, isBase64 } = await bimTools.project.saveModelContent(modelName, format);

  const blob = isBase64
    ? new Blob([Uint8Array.from(atob(content), (c) => c.charCodeAt(0))], { type: mimeType })
    : new Blob([content], { type: mimeType + ";charset=utf-8" });

  if (fileHandle && typeof fileHandle.createWritable === "function") {
    const writable = await fileHandle.createWritable();

    await writable.write(blob);

    await writable.close();

    return { status: "FINISHED", path: filename };
  }

  const a = document.createElement("a");

  a.href = URL.createObjectURL(blob);

  a.download = filename;

  document.body.appendChild(a);

  a.click();

  document.body.removeChild(a);

  URL.revokeObjectURL(a.href);

  return { status: "FINISHED", path: filename };
}

/**
 * Load geometry data for a model
 * @param {string} modelName - Model name
 * @param {string} schema - Schema type (e.g., 'IFC4')
 * @param {string} targetLayerPath - Optional path to parent layer (e.g., "Buildings" or "Buildings/IFC Architecture"). Does NOT include "World/" prefix.
 * @param {Object} options
 * @param {Object} options.sceneTool - Scene tool
 * @param {Object} options.projectTool - Loader tool
 * @param {Object} options.layerTool - Layer tool
 * @param {Object} options.placementTool - Placement tool
 * @param {string} options.geometryBackend - Geometry backend
 * @param {boolean} [options.pythonBimReady] - When false, ifcopenshell requests use ifc-lite
 * @param {Object} options.context - Context object
 * @returns {Promise<THREE.Group>} Root group of loaded geometry
 */
async function loadGeometryData(
  modelName,
  schema = "IFC4",
  targetLayerPath,
  {
    sceneTool,
    projectTool,
    layerTool,
    placementTool,
    geometryBackend = "ifcopenshell",
    context,
    pythonBimReady,
  }
) {
  if (context.ifc.geometryLoadInProgress) {
    throw new Error("A geometry load is already in progress.");
  }

  context.ifc.geometryLoadInProgress = true;

  let finalizeApproximateGeometryLoadProgress = null;

  let effectiveGeometryBackend =
    geometryBackend ?? context.ifc.geometryBackend ?? "ifcopenshell";

  if (pythonBimReady === false && effectiveGeometryBackend === "ifcopenshell") {
    effectiveGeometryBackend = "ifc-lite";
  }

  const place = (element, { position, rotation }) => {


    if (Array.isArray(rotation)) {
      rotation.forEach((r) => {

        placementTool.rotate(
          element,
          r.axis,
          r.angle,
        );

      });
    } else {
      rotation
        ? placementTool.setRotation(
            element,
            rotation.axis,
            rotation.angle,
          )
        : null;
    }

    position ? placementTool.setPosition( element, position) : null;

    element.updateMatrixWorld(true);

  };

  const progressLabel =
    effectiveGeometryBackend === "ifc-lite"
      ? `Loading ${modelName} geometry with ifc-lite...`
      : `Loading ${modelName} geometry...`;

  try {
    dispatchBimGeometryLoadProgressSignal(context, {
      phase: "start",
      modelName,
      geometryBackend: effectiveGeometryBackend,
      message: progressLabel,
      percent: 8,
    });

    finalizeApproximateGeometryLoadProgress = scheduleApproximateBimGeometryLoadProgress(
      context,
      modelName,
      effectiveGeometryBackend,
      progressLabel,
      12,
      92,
    );

    let geometrySource = schema;

    if (effectiveGeometryBackend === "ifc-lite") {
      geometrySource = "IFC_LITE";
    }

    const { spatialStructure, loadedCount, instancedGeometryMap, success, transform } =
      await projectTool.generateMeshLayerStructure(geometrySource, modelName);

    if (spatialStructure == null || typeof spatialStructure !== "object") {
      throw new Error(
        `[BIM] loadGeometryData: no spatial structure for model "${modelName}". ` +
          `Load that IFC first and pass the same registered file name as the URL basename (e.g. Works_Plan.ifc).`,
      );
    }

    const parentLayerPath =
      targetLayerPath && String(targetLayerPath).includes("/")
        ? targetLayerPath
        : `World/${targetLayerPath || "Buildings"}`;

    let parentCollection = layerTool.getLayerByPath(parentLayerPath);

    if (!parentCollection) {
      parentCollection = layerTool.getLayerByPath("World/Buildings");
    }

    const parentPath = parentCollection?.path || "World/Buildings";
    const bimProjectNodePath = parentPath.endsWith("/") ? parentPath : `${parentPath}/`;

    const bimProjectNode = {
      name: modelName,
      path: bimProjectNodePath,
      type: "georeferenced",
      references: {
        ifc: modelName,
        path: null,
        usd: null,
        glb: null,
      },
    };

    const ifcGeometryAssembly =
      context.ifc && context.ifc.ifcGeometryAssembly === "multiMesh"
        ? "multiMesh"
        : "merged";

    const projectRootGroup = projectTool.createLayer(
      spatialStructure,
      instancedGeometryMap || {},
      { ifcGeometryAssembly },
    );

    const projectTransform = transform || {
      position: { x: 0, y: 0, z: 0 },
      rotation: { axis: "x", angle: -90 },
    };

    place(projectRootGroup, projectTransform);

    const createdNode = WorldCore.createNode(
      bimProjectNode,
      parentCollection,
      parentCollection.scene,
      { sceneTool, layerTool, context },
    );

    projectRootGroup.userData.collectionId = createdNode.GlobalId;

    createdNode.scene.add(projectRootGroup);

    if (effectiveGeometryBackend === "ifc-lite") {
      projectRootGroup.updateMatrixWorld(true);

      const firstMesh = projectRootGroup.getObjectByProperty("isMesh", true);

      if (firstMesh) {
        const worldPos = new THREE.Vector3();

        firstMesh.getWorldPosition(worldPos);

        if (firstMesh.geometry && !firstMesh.geometry.boundingBox) {
          firstMesh.geometry.computeBoundingBox();
        }

        const bbox = firstMesh.geometry?.boundingBox;

        const transformedMin = bbox?.min.clone().applyMatrix4(firstMesh.matrixWorld);

        const transformedMax = bbox?.max.clone().applyMatrix4(firstMesh.matrixWorld);

      }
    }

    context.signals.activeLayerUpdate.dispatch(layerTool.World);

    context.signals.newIFCGeometry.dispatch({ modelName, GlobalId: createdNode.GlobalId });

    context.editor.signals.sceneGraphChanged.dispatch();

    finalizeApproximateGeometryLoadProgress(
      100,
      `Geometry loaded for ${modelName}`,
    );

    dispatchBimGeometryLoadProgressSignal(context, {
      phase: "complete",
      modelName,
      geometryBackend: effectiveGeometryBackend,
      message: `Geometry loaded for ${modelName}`,
      percent: 100,
    });

    return projectRootGroup;
  } catch (err) {
    if (typeof finalizeApproximateGeometryLoadProgress === "function") {
      finalizeApproximateGeometryLoadProgress(0, "Geometry loading failed");
    }

    let errorMessage = "Geometry loading failed";

    if (err && err.message) {
      errorMessage = err.message;
    } else if (err) {
      errorMessage = String(err);
    }

    dispatchBimGeometryLoadProgressSignal(context, {
      phase: "error",
      modelName,
      geometryBackend: effectiveGeometryBackend,
      message: errorMessage,
    });

    throw err;
  } finally {
    context.ifc.geometryLoadInProgress = false;
  }
}

/**
 * Create a wall between two points
 * @param {string} modelName - Model name
 * @param {Object} params - Wall parameters { start, end, height, thickness, elevation, alignment }
 * @param {Object} options
 * @returns {Object} Created wall info with mesh data
 */
async function createWall(
  modelName,
  params,
  { bimTools, worldTools, context, signals },
) {

  const { result, output } = await bimTools.modeling.createWall(modelName, params);

  const meshData = await bimTools.modeling.generateMeshForElement(
    modelName,
    result.GlobalId,
  );

  if (!meshData) return;

  const threeJsObjects = addIfcElementToScene(meshData, result.GlobalId, {
    bimTools,
    worldTools,
    context,
  });

  return result;
}

/**
 * Create a window in a wall
 * @param {string} modelName - Model name
 * @param {Object} params - Window parameters { hostGuid, position, width, height, sillHeight }
 * @param {Object} options
 * @returns {Object} Created window info
 */
async function createWindow(
  modelName,
  params,
  { bimTools, worldTools, context, signals },
) {
  const { result, output } = await bimTools.modeling.createWindow(modelName, params);

  const meshData = await bimTools.modeling.generateMeshForElement(
    modelName,
    result.GlobalId,
  );

  if (!meshData) return;

  const threeJsObjects = addIfcElementToScene(meshData, result.GlobalId, {
    bimTools,
    worldTools,
    context,
  });

  if (result.hostGuid) {
    await refreshElementGeometry(modelName, result.hostGuid, {
      bimTools,
      worldTools,
      context,
      signals,
    });
  }

  return result;
}

/**
 * Create a door in a wall
 * @param {string} modelName - Model name
 * @param {Object} params - Door parameters { hostGuid, position, width, height }
 * @param {Object} options
 * @returns {Object} Created door info
 */
async function createDoor(
  modelName,
  params,
  { bimTools, worldTools, context, signals },
) {
  const { result, output } = await bimTools.modeling.createDoor(modelName, params);

  const meshData = await bimTools.modeling.generateMeshForElement(
    modelName,
    result.GlobalId,
  );

  if(!meshData) return;

  const threeJsObjects = addIfcElementToScene(meshData, result.GlobalId, {
    bimTools,
    worldTools,
    context,
  });

  if (result.hostGuid) {
    await refreshElementGeometry(modelName, result.hostGuid, {
      bimTools,
      worldTools,
      context,
      signals,
    });
  }

  return result;
}

/**
 * Refresh/regenerate geometry for an existing element
 * Used after IFC database operations
 * @param {string} modelName - Model name
 * @param {string} GlobalId - Element GlobalId
 * @param {Object} options
 */
async function refreshElementGeometry(
  modelName,
  GlobalId,
  { bimTools, worldTools, context, signals },
) {
  const meshData = await bimTools.modeling.generateMeshForElement(
    modelName,
    GlobalId,
  );

  if (!meshData) {
    console.warn(`No mesh data returned for element ${GlobalId}`);

    return null;
  }

  removeIfcElementFromScene(GlobalId, { worldTools, context });

  const threeJsObjects = addIfcElementToScene(meshData, GlobalId, {
    bimTools,
    worldTools,
    context,
  });

  signals.elementGeometryRefreshed.dispatch({
    modelName,
    GlobalId,
    entityType: meshData.entityType,
  });

  return { GlobalId, threeJsObjects };
}

/**
 * Delete an IFC element
 * @param {string} modelName - Model name
 * @param {string} GlobalId - Element GlobalId
 * @param {Object} options
 */
async function deleteElement(
  modelName,
  GlobalId,
  { bimTools, worldTools, context, signals },
) {
  
  removeIfcElementFromScene(GlobalId, { worldTools, context });

  const result = await bimTools.modeling.deleteElement(
    context,
    modelName,
    GlobalId,
  );

  if (signals?.elementDeleted) {
    signals.elementDeleted.dispatch({
      modelName,
      GlobalId,
    });
  }

  return result;
}

/**
 * Add an IFC element to the Three.js scene
 * @param {Object} meshData - Mesh data from generateMeshForElement
 * @param {string} GlobalId - Element GlobalId
 * @param {Object} options
 * @returns {THREE.Group} The created Three.js group
 */
function addIfcElementToScene(
  meshData,
  GlobalId,
  { bimTools, worldTools, context },
) {

  const ifcGeometryAssembly =
    context.ifc && context.ifc.ifcGeometryAssembly === "multiMesh"
      ? "multiMesh"
      : "merged";

  const { meshes, lines } = bimTools.geometry.createThreeJSMesh(
    meshData,
    GlobalId,
    { assembly: ifcGeometryAssembly },
  );

  if (!meshes || meshes.length === 0) {
    console.warn(
      `[addIfcElementToScene] No meshes generated for element ${GlobalId}`,
    );

    return null;
  }

  const group = new THREE.Group();

  group.name = GlobalId;

  group.GlobalId = GlobalId;

  group.isIfc = true;

  group.userData.entityType = meshData.entityType || "IfcWall";

  meshes.forEach((mesh) => {
    group.add(mesh);
  });

  worldTools.placement.setRotation(group,"x","-90",)

  context.editor.scene.add(group);

  context.editor.signals.sceneGraphChanged.dispatch();

  return group;
}

/**
 * Remove an IFC element from the Three.js scene
 * @param {string} GlobalId - Element GlobalId
 * @param {Object} options
 */
function removeIfcElementFromScene(GlobalId, { worldTools, context }) {
  const editor = context.editor;

  if (!editor || !editor.scene) return;

  let objectToRemove = null;

  editor.scene.traverse((obj) => {
    if (obj.GlobalId === GlobalId || obj.name === GlobalId) {
      objectToRemove = obj;
    }
  });

  if (objectToRemove) {
    
    objectToRemove.traverse((child) => {
      if (child.geometry) {
        child.geometry.dispose();
      }

      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });

    if (objectToRemove.parent) {
      objectToRemove.parent.remove(objectToRemove);
    }
  }
}






/** * Load attributes and properties for a selected entity and dispatch a signal to update the UI.
 * @param {Object} params
 * @param {SceneTool} params.sceneTool - The tool for interacting with the 3D scene.
 * @param {AttributeTool} params.attributeTool - The tool for fetching and storing BIM attributes.
 * @param {PsetTool} params.psetTool - The tool for fetching and storing BIM properties.
 * @param {SequenceTool} params.sequenceTool - The tool for fetching and storing BIM sequence data.
 * @param {CostTool} params.costTool - The tool for fetching and storing BIM cost data.
 * @param {Object} params.context - The application context containing signals and state.
 */

async function displayOnSelection({context, sceneTool, attributeTool, psetTool, sequenceTool, costTool}) {

  if (context.ifc.isAttributeSelectionCallbackEnabled) {
    return;
  }

  context.ifc.isAttributeSelectionCallbackEnabled = true;

    sceneTool.onSelection(async (object) => {

        if (!context.ifc.activeModel) return;

        if (!object)
            return

        if (!sceneTool.isIfcObject(object)) return;

        const entityGlobalId = sceneTool.getEntityGlobalId(object);

        if (!entityGlobalId) return;

        const isSameActiveElement = context.ifc.activeElement === entityGlobalId;

        context.ifc.activeElement = entityGlobalId;

        if (!isSameActiveElement) {
          await AttributeCore.enableEditingAttributes(context.ifc.activeModel, entityGlobalId, {context, attributeTool, psetTool});
          await SequenceCore.enableEditingElementTasks(context.ifc.activeModel, entityGlobalId, {context, sequenceTool});
          await CostCore.enableEditingElementCosts(context.ifc.activeModel, entityGlobalId, {context, costTool});
        }
      });

}


export {
  newBIMModel,
  setActiveBIMModel,
  loadBIMModelFromPath,
  loadBIMModelFromBlob,
  deleteBIMModel,
  saveBIMModelToFile,
  loadGeometryData,
  createWall,
  createWindow,
  createDoor,
  refreshElementGeometry,
  deleteElement,
  addIfcElementToScene,
  removeIfcElementFromScene,
  displayOnSelection,
};
