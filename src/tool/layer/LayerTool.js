import dataStore from "../../data/index.js";

import { SpatialCollection, CRS_Spatial_Collection } from "../../data/DataCollections/GeoReference.js";

import * as THREE from "three";

function generateGuid() {
  return THREE.MathUtils.generateUUID();
}

class LayerTool {
  static World = new CRS_Spatial_Collection({
    name: "World",
    GlobalId: generateGuid(),
    entityId: "root",
    classificationCode: "AECO_World",
  });

  static initWorld(name) {
    dataStore.registerCollection(LayerTool.World.GlobalId, LayerTool.World);

    return LayerTool.World;
  }
  static newLayer(
    parent,
    node,
    type = "Spatial_Collection"
  ) {

    const { name, path, references } = node;

    const createLayer = () => {
    if (type === "Georeferenced_Spatial_Collection") {
      return new CRS_Spatial_Collection({
        name: name,
        GlobalId: generateGuid(),
        classificationCode:  "AECO_Georeferenced_Layer",
      });
    } else {
      return new SpatialCollection({
        name: name,
        GlobalId: generateGuid(),
        classificationCode: "AECO_Spatial_Layer",
      });
    }

    }

    const layer = createLayer();

    layer.path = path

    layer.references = references || {};

    if (
      parent &&
      (parent instanceof CRS_Spatial_Collection ||
        parent instanceof SpatialCollection)
    ) {
      parent.children.push(layer);
    } else {
      dataStore.registerCollection(layer.GlobalId, layer);
    }

    return layer;
  }
  static getLayerByName(name) {
    const world = LayerTool.World;

    const findLayerByName = (collection, name) => {

      if (collection.name === name) {
        return collection;
      }

      for (const child of collection.children) {
        const result = findLayerByName(child, name);

        if (result) {
          return result;
        }
      }

      return null;
    };

    return findLayerByName(world, name);
  }

  static getLayerByGuid(guid) {
    const world = LayerTool.World;

    const findLayerByGuid = (collection, guid) => {
      if (collection.GlobalId === guid) {
        return collection;
      }

      for (const child of collection.children) {
        const result = findLayerByGuid(child, guid);

        if (result) {
          return result;
        }
      }

      return null;
    };

    return findLayerByGuid(world, guid);
  }
  static getLayerByPath(layerPath) {
    if (!layerPath) return null;
    
    const rootCollection = LayerTool.World;

    const findLayerByPath = (collection, path) => {
      if (collection.path === path) {
        return collection;
      }

      for (const child of collection.children) {
        const result = findLayerByPath(child, path);

        if (result) {
          return result;
        }
      }

      return null;
    };

    return findLayerByPath(rootCollection, layerPath);
  }

  static reset() {
    LayerTool.World.children = [];
  }
}

export default LayerTool;
