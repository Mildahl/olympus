import LayerTool from "../tool/viewer/LayerTool.js";

/** @typedef {typeof import("../tool/viewer/LayerTool.js").default} LayerToolType */
/** @typedef {typeof import("../tool/viewer/SceneTool.js").default} SceneToolType */
/** @typedef {import("../context/index.js").default} AppContext */

/**
 * @typedef {Object} WorldNodeReferenceMap
 * @property {string} [ifc]
 * @property {string} [usd]
 */

/**
 * @typedef {Object} WorldNode
 * @property {string} type
 * @property {string} [name]
 * @property {WorldNodeReferenceMap} [references]
 * @property {Array<WorldNode>} [children]
 */

/**
 * @typedef {Object} WorldInitOptions
 * @property {LayerToolType} [layerTool]
 * @property {AppContext["signals"]} [signals]
 */

/**
 * @typedef {Object} WorldBuildOptions
 * @property {AppContext} context
 * @property {LayerToolType} [layerTool]
 * @property {SceneToolType} sceneTool
 */

/**
 * @typedef {Object} WorldLookupOptions
 * @property {LayerToolType} [layerTool]
 */

/**
 * @typedef {Object} SceneActionOptions
 * @property {AppContext} context
 * @property {SceneToolType} sceneTool
 * @property {Array<Object>|null} [objects]
 */

/**
 * @param {Object} worldLayers
 * @param {WorldInitOptions} options
 */
function initWorld(worldLayers, { layerTool = LayerTool, signals }) {
  return layerTool.initWorld(worldLayers);
}

/**
 * @param {WorldNode} config
 * @param {WorldBuildOptions} options
 */
function createWorldStructure(
  config,
  { context, layerTool = LayerTool, sceneTool },
) {
  const worldDataCollection = layerTool.World;

  const sceneLayers = context.editor.sceneLayers.World;

  const rootGroup = sceneLayers.scene;

  createNode(config, worldDataCollection, rootGroup, {
    context,
    layerTool,
    sceneTool,
  });

  context.signals.activeLayerUpdate.dispatch(worldDataCollection);

  return worldDataCollection;
}

/**
 * @param {WorldNode} node
 * @param {Object} parentCollection
 * @param {Object|null} sceneParent
 * @param {WorldBuildOptions} options
 */
function createNode(
  node,
  parentCollection,
  sceneParent,
  { context, layerTool = LayerTool, sceneTool },
) {
  let dataCollection = null;

  let sceneObject = sceneParent;

  if (node.type === "world") {
    dataCollection = parentCollection;

    sceneParent ? (dataCollection.scene = sceneParent) : null;
  } else {
    const layerType =
      node.type === "georeferenced"
        ? "Georeferenced_Spatial_Collection"
        : "Spatial_Collection";

    dataCollection = layerTool.newLayer(parentCollection, node, layerType);

    if (node.references) {
      if (node.references.ifc)
        dataCollection.nativeReference = node.references.ifc;

      if (node.references.usd)
        dataCollection.USDReference = node.references.usd;
    }

    sceneObject = sceneTool.createLayerGroup(node.name);

    sceneObject.userData.collectionId = dataCollection.GlobalId;

    dataCollection.scene = sceneObject;

    sceneParent?.add(sceneObject);
  }

  if (node.children?.length) {
    for (const child of node.children) {
      createNode(child, dataCollection, sceneObject, {
        context,
        layerTool,
        sceneTool,
      });
    }
  }

  return dataCollection;
}

/**
 * @param {WorldLookupOptions} options
 */
function getWorldStructure({ layerTool = LayerTool }) {
  return layerTool.World;
}

/**
 * @param {AppContext} context
 * @param {string} layerPath
 */
function getLayerGroup(context, layerPath) {
  const parts = layerPath.split("/");

  let current = context.editor.sceneLayers.World.layers;

  for (const part of parts) {
    if (!current[part]) return null;

    if (parts.indexOf(part) === parts.length - 1) return current[part].group;

    current = current[part].layers;
  }

  return null;
}

/**
 * @param {AppContext} context
 * @param {string} layerPath
 * @param {WorldLookupOptions} [options]
 */
function getLayerCollection(
  context,
  layerPath,
  { layerTool = LayerTool } = {},
) {
  const parts = layerPath.split("/");

  let current = context.editor.sceneLayers.World.layers;

  for (const part of parts) {
    if (!current[part]) return null;

    if (parts.indexOf(part) === parts.length - 1)
      return current[part].collection;

    current = current[part].layers;
  }

  return null;
}

/**
 * @param {AppContext} context
 * @param {string} layerName
 */
function getLayer(context, layerName) {
  const layerEntry = context.editor.sceneLayers.World.layers[layerName];

  return layerEntry ? layerEntry.group : null;
}

/**
 * @param {WorldInitOptions} options
 */
function resetWorld({ layerTool = LayerTool, signals }) {
  layerTool.reset();

  if (signals?.worldReset) signals.worldReset.dispatch();
}

/**
 * @param {"on"|"off"} mode
 * @param {SceneActionOptions} options
 */
function dimScene(
  mode,
  { context, sceneTool, objects = null },
) {
  const selectedObjects = context.editor.selector.selected_objects;

  const targetObjects = objects ?? (selectedObjects?.length ? selectedObjects : null);

  return sceneTool.dim(mode, targetObjects);
}

/**
 * @param {"on"|"off"} mode
 * @param {SceneActionOptions} options
 */
function highlightScene(
  mode,
  { context, sceneTool, objects = null },
) {
  if (mode === "off") {
    return sceneTool.highlight(mode);
  }

  const selectedObjects = context.editor.selector.selected_objects;

  const targetObjects = objects ?? (selectedObjects?.length ? selectedObjects : null);

  if (!targetObjects || targetObjects.length === 0) {
    console.warn("No objects selected to highlight");

    return null;
  }

  return sceneTool.highlight(mode, targetObjects);
}

export {
  initWorld,
  createWorldStructure,
  getWorldStructure,
  getLayerGroup,
  getLayerCollection,
  getLayer,
  resetWorld,
  createNode,
  dimScene,
  highlightScene,
};
