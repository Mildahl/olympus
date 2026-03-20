class IfcLiteGeometryTool {
  static geometryProcessor = null;

  static parser = null;

  static extractEntityAttributesOnDemand = null;

  static initialized = false;

  static async loadModules() {
    const geometryModule = await import("@ifc-lite/geometry");
    const parserModule = await import("@ifc-lite/parser");

    return {
      GeometryProcessor: geometryModule.GeometryProcessor,
      IfcParser: parserModule.IfcParser,
      extractEntityAttributesOnDemand: parserModule.extractEntityAttributesOnDemand,
    };
  }

  static async ensureReady() {
    const modules = await IfcLiteGeometryTool.loadModules();

    if (!IfcLiteGeometryTool.geometryProcessor) {
      IfcLiteGeometryTool.geometryProcessor = new modules.GeometryProcessor();
    }

    if (!IfcLiteGeometryTool.initialized) {
      await IfcLiteGeometryTool.geometryProcessor.init();

      IfcLiteGeometryTool.initialized = true;
    }

    if (!IfcLiteGeometryTool.parser) {
      IfcLiteGeometryTool.parser = new modules.IfcParser();
    }

    if (!IfcLiteGeometryTool.extractEntityAttributesOnDemand) {
      IfcLiteGeometryTool.extractEntityAttributesOnDemand = modules.extractEntityAttributesOnDemand;
    }
  }

  static identityMatrix() {
    return [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ];
  }

  static toLegacyMeshData(mesh, includeMatrix = true) {
    const faceCount = Math.floor(mesh.indices.length / 3);

    const faceMapping = [];

    for (let i = 0; i < faceCount; i++) {
      faceMapping.push(i);
    }

    const result = {
      geometries: [{
        vertices: Array.from(mesh.positions),
        normals: Array.from(mesh.normals),
        faces: Array.from(mesh.indices),
        materialData: [{
          diffuse: [mesh.color[0], mesh.color[1], mesh.color[2]],
          transparency: 1 - mesh.color[3],
        }],
        mapping: {
          0: faceMapping,
        },
      }],
    };

    if (includeMatrix) {
      result.matrix = IfcLiteGeometryTool.identityMatrix();
    }

    return result;
  }

  static async generateMeshLayerStructure(modelName, arrayBuffer) {
    if (!arrayBuffer) {
      throw new Error("No IFC file buffer available for ifc-lite geometry generation");
    }

    await IfcLiteGeometryTool.ensureReady();

    const geometryResult = await IfcLiteGeometryTool.geometryProcessor.process(
      new Uint8Array(arrayBuffer),
    );

    const buildingRotationRad = geometryResult?.coordinateInfo?.buildingRotation;

    const buildingRotationDeg = Number.isFinite(buildingRotationRad)
      ? (buildingRotationRad * 180) / Math.PI
      : null;

    console.log("[IfcLiteGeometryTool] coordinateInfo", {
      modelName,
      coordinateInfo: geometryResult?.coordinateInfo,
      buildingRotationRad,
      buildingRotationDeg,
      meshCount: geometryResult?.meshes?.length,
    });

    const dataStore = await IfcLiteGeometryTool.parser.parseColumnar(arrayBuffer);

    const rootGlobalId = `IFCLITE_PROJECT_${modelName}`;

    const rootNode = {
      id: 1,
      name: modelName,
      type: "IfcProject",
      container: true,
      children: {},
      unsorted: [],
    };

    const spatialStructure = {
      [rootGlobalId]: rootNode,
    };

    for (const mesh of geometryResult.meshes) {
      const attributes = IfcLiteGeometryTool.extractEntityAttributesOnDemand(dataStore, mesh.expressId) || {};

      let elementGlobalId = attributes.globalId;

      if (!elementGlobalId) {
        elementGlobalId = `IFCLITE_${modelName}_${mesh.expressId}`;
      }

      let elementName = attributes.name;

      if (!elementName) {
        elementName = elementGlobalId;
      }

      let elementType = mesh.ifcType;

      if (!elementType && dataStore.entities && typeof dataStore.entities.getTypeName === "function") {
        elementType = dataStore.entities.getTypeName(mesh.expressId);
      }

      if (!elementType) {
        elementType = "IfcBuildingElement";
      }

      rootNode.children[elementGlobalId] = {
        id: mesh.expressId,
        name: elementName,
        type: elementType,
        container: false,
        meshData: IfcLiteGeometryTool.toLegacyMeshData(mesh, false),
        children: {},
      };
    }

    const transform = {
      position: { x: 0, y: 0, z: 0 },
      rotation: [
        { axis: "x", angle: 0 },
        ...(buildingRotationDeg !== null ? [{ axis: "z", angle: buildingRotationDeg }] : []),
      ],
    };

    console.log("[IfcLiteGeometryTool] output transform", {
      modelName,
      transform,
    });

    return {
      spatialStructure,
      loadedCount: geometryResult.meshes.length,
      instancedGeometryMap: {},
      success: true,
      transform,
    };
  }
}

export default IfcLiteGeometryTool;