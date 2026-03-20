/**
 * BIM Core Functions
 *
 * Core business logic for BIM (Building Information Model) management.
 * These functions are called by operators and should remain decoupled from UI.
 */
import * as THREE from "three";

import * as WorldCore from "./world.js";

async function setActiveBIMModel(
  file_name,
  isNewModel = false,
  { context },
) {
  const isAlreadyActive = context.ifc.activeModel === file_name && !isNewModel;

  context.ifc.activeModel = file_name;

  context.signals.refreshBIMLayers.dispatch();

  isNewModel? context.signals.newIFCModel.dispatch({ FileName: file_name}) : null;

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
  const result = await bimTools.project.loadModelFromPath(path);

  const file_name = path.split("/").pop();

  bimTools.project.storeProject(context, {
    GlobalId: result.GlobalId,
    Name: result.Name,
    FileName: file_name,
    Path: path,
    TotalElements: result.totalElements,
  });

  setActiveBIMModel(file_name, true, { context });

  return { GlobalId: result.GlobalId, FileName: file_name, Name: result.Name };
}

async function loadBIMModelFromBlob(fileName, arrayBuffer, { context, bimTools, signals }) {
  const result = await bimTools.project.loadModelFromBlob(fileName, arrayBuffer);

  bimTools.project.storeProject(context, {
    GlobalId: result.GlobalId,
    Name: result.Name,
    FileName: fileName,
    TotalElements: result.totalElements,
  });

  setActiveBIMModel(fileName, true, { context });

  return { GlobalId: result.GlobalId, FileName: fileName, Name: result.Name };
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
 * @param {FileSystemFileHandle|null} [fileHandle] - Optional handle from showSaveFilePicker
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
 * @param {string} [targetLayerPath] - Optional path to parent layer (e.g., "Buildings" or "Buildings/IFC Architecture"). Does NOT include "World/" prefix.
 * @param {Object} options
 * @param {Object} options.sceneTool - Scene tool
 * @param {Object} options.projectTool - Loader tool
 * @param {Object} options.layerTool - Layer tool
 * @param {Object} options.context - Context object
 * @returns {Promise<THREE.Group>} Root group of loaded geometry
 */
async function loadGeometryData(
  modelName,
  schema = "IFC4",
  targetLayerPath,
  { sceneTool, projectTool, layerTool, placementTool, geometryBackend = "ifcopenshell", context }
) {

    const place = (element, { position, rotation }) => {
      console.log("[BIM.loadGeometryData] place:start", {
        modelName,
        geometryBackend,
        position,
        rotation,
        initialRotation: {
          x: element.rotation.x,
          y: element.rotation.y,
          z: element.rotation.z,
        },
        initialPosition: {
          x: element.position.x,
          y: element.position.y,
          z: element.position.z,
        },
      });

      if (Array.isArray(rotation)) {
        rotation.forEach((r) => {
          console.log("[BIM.loadGeometryData] place:rotate", {
            modelName,
            geometryBackend,
            axis: r.axis,
            angle: r.angle,
          });

          placementTool.rotate(
            null,
            element,
            r.axis,
            r.angle,
          );

          console.log("[BIM.loadGeometryData] place:rotate:after", {
            modelName,
            geometryBackend,
            axis: r.axis,
            angle: r.angle,
            resultingRotation: {
              x: element.rotation.x,
              y: element.rotation.y,
              z: element.rotation.z,
            },
          });
        });
      } else {
        rotation
          ? placementTool.setRotation(
              null,
              element,
              rotation.axis,
              rotation.angle,
            )
          : null;
      }

      position ? placementTool.setPosition(null, element, position) : null;

      element.updateMatrixWorld(true);

      console.log("[BIM.loadGeometryData] place:end", {
        modelName,
        geometryBackend,
        finalRotation: {
          x: element.rotation.x,
          y: element.rotation.y,
          z: element.rotation.z,
        },
        finalPosition: {
          x: element.position.x,
          y: element.position.y,
          z: element.position.z,
        },
        matrixWorld: element.matrixWorld.elements.slice(),
      });
    };

  let geometrySource = schema;

  if (geometryBackend === "ifc-lite") {
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

  const projectRootGroup = projectTool.createLayer(
    spatialStructure,
    instancedGeometryMap || {},
  );

  const projectTransform = transform || {
    position: { x: 0, y: 0, z: 0 },
    rotation: { axis: "x", angle: -90 },
  };

  console.log("[BIM.loadGeometryData] transform:selected", {
    modelName,
    geometryBackend,
    geometrySource,
    projectTransform,
    success,
    loadedCount,
  });

  place(projectRootGroup, projectTransform);

  // Register the IFC file as a layer under the target world folder, then hang the
  // spatial tree (IfcProject → Site → …) under that file group. Passing
  // projectRootGroup as sceneParent used to parent the empty file group *inside*
  // the IFC project root, so the file appeared as a sibling of IfcSite in the UI.
  const createdNode = WorldCore.createNode(
    bimProjectNode,
    parentCollection,
    parentCollection.scene,
    { sceneTool, layerTool, context },
  );

  projectRootGroup.userData.collectionId = createdNode.GlobalId;

  createdNode.scene.add(projectRootGroup);

  if (geometryBackend === "ifc-lite") {
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

      console.log("[BIM.loadGeometryData] firstMesh:debug", {
        modelName,
        geometryBackend,
        localBboxMin: bbox ? { x: bbox.min.x, y: bbox.min.y, z: bbox.min.z } : null,
        localBboxMax: bbox ? { x: bbox.max.x, y: bbox.max.y, z: bbox.max.z } : null,
        worldBboxMin: transformedMin ? { x: transformedMin.x, y: transformedMin.y, z: transformedMin.z } : null,
        worldBboxMax: transformedMax ? { x: transformedMax.x, y: transformedMax.y, z: transformedMax.z } : null,
        matrixAutoUpdate: firstMesh.matrixAutoUpdate,
        visible: firstMesh.visible,
        parentVisible: firstMesh.parent?.visible,
      });
    }
  }

  context.signals.activeLayerUpdate.dispatch(layerTool.World);

  context.signals.newIFCGeometry.dispatch({ modelName, GlobalId: createdNode.GlobalId });

  context.editor.signals.sceneGraphChanged.dispatch();

  return projectRootGroup;
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

  const { meshes, lines } = bimTools.geometry.createThreeJSMesh(meshData, GlobalId);

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

  meshes.forEach((mesh, i) => {
    mesh.isIfc = true;

    mesh.GlobalId = `IFC/BodyRepresentation/${GlobalId}`;

    group.add(mesh);
  });

  worldTools.placement.setRotation(null,group,"x","-90",)

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
};
