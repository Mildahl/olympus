import LayerTool from "../tool/layer/LayerTool.js";

function initWorld(worldLayers, { layerTool = LayerTool, signals }) {
  return layerTool.initWorld(worldLayers);
}

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

    sceneObject = sceneTool.createLayerGroup(context, node.name);

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

function getWorldStructure({ layerTool = LayerTool }) {
  return layerTool.World;
}

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

function getLayer(context, layerName) {
  const layerEntry = context.editor.sceneLayers.World.layers[layerName];

  return layerEntry ? layerEntry.group : null;
}

function resetWorld({ layerTool = LayerTool, signals }) {
  layerTool.reset();

  if (signals?.worldReset) signals.worldReset.dispatch();
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
};
