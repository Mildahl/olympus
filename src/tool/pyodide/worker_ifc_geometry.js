import { getPyodide, ifc } from './worker_state.js';
import { getIfc } from './worker_files_modules.js';

let last_geometries;

let last_mesh_id = -1;

var geometryIterator = null;

var iteratorInitialized = false;

let ifcopenshell_geom = null;

var projectNames = [];

/**
 * Cache for geometry data by geometry ID
 * Used to detect repeated geometries (e.g., same window/door type) and enable instancing
 * Key: shape.geometry.id, Value: { geometryData, materialData, mapping }
 */
let geometryCache = new Map();

/**
 * Track which geometries are used multiple times for instancing
 * Key: geometryId, Value: Array of { GlobalId, matrix }
 */
let instancedGeometries = new Map();

export function newIFCModel(modelName = "default") {

  const model = ifc["context"].new_model(modelName);

  const test1 = getIfc(modelName);

  const test2 = getIfc(modelName.replace(".ifc", ""));

  const project = model.by_type("IfcProject")[0];

  model.begin_transaction();

  const proectName = modelName.replace(".ifc", "");

  project.Name = proectName;

  model.end_transaction();

  return { GlobalId: project.GlobalId, Name: project.Name, totalElements: model.by_type('IfcElement').length  };
}

export async function loadModelFromPath(path) {
  const response = await fetch(path);

  const content = await response.text();

  const bimContext = ifc["context"];

  const ifcopenshellModel = await bimContext.load_model_from_path(path, content);

  const project = ifcopenshellModel.by_type("IfcProject")[0];

  return {
    success: true,
    Name: project.Name,
    GlobalId: project.GlobalId,
    totalElements: ifcopenshellModel.by_type("IfcElement").length,
  };
}

export async function loadModelFromBlob(fileName, blobContent) {
  const bimContext = ifc["context"];

  const ifcopenshellModel = await bimContext.load_model_from_blob(fileName, blobContent);

  const project = ifcopenshellModel.by_type("IfcProject")[0];

  return {
    success: true,
    Name: project.Name,
    GlobalId: project.GlobalId,
    totalElements: ifcopenshellModel.by_type("IfcElement").length,
  };
}

export async function generateMeshLayerStructure(modelName, settings = {}) {
  const pyodide = getPyodide();
  
  function findNodeByGlobalId(structure, targetGlobalId) {
    if (typeof structure !== "object" || structure === null) return null;

    for (const [key, value] of Object.entries(structure)) {
      if (key === targetGlobalId) {
        return value;
      }

      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        const result = findNodeByGlobalId(value, targetGlobalId);

        if (result) return result;
      }
    }

    return null;
  }

  const startTime = performance.now();
  geometryCache.clear();

  instancedGeometries.clear();

  let model = getIfc(modelName)

  if (!model) model = getIfc(modelName.replace(".ifc", ""));

  if (! model ) return { success: false, spatialStructure: null, loadedCount: 0, duration: 0, instancedGeometryMap: {} };

  const spatialStructure = JSON.parse(ifc.spatial.get_project_tree(model));

  if (!model) {
    throw new Error(`Model ${modelName} not found`);
  }

  let ifcopenshell_geom = pyodide.pyimport("ifcopenshell.geom");

  let s = ifcopenshell_geom.settings();

  s.set(s.WELD_VERTICES, false);

  const exclude = settings.exclude || ["IfcAnnotation", "IfcOpeningElement"];

  const iteratorArgs = {
    settings: s,
    file_or_filename: model,
    exclude: exclude,
    geometry_library: "hybrid-cgal-simple-opencascade",
  };

  let geometryIterator = ifcopenshell_geom.iterator.callKwargs(iteratorArgs);

  let loadedCount = 0;
  if (geometryIterator.initialize()) {
    while (true) {
      let shape = geometryIterator.get();

      let entity = model.by_id(shape.id);

      let geometryId = shape.geometry.id;

      let matrix = shape.transformation.data().components.toJs();

      let node = findNodeByGlobalId(spatialStructure, entity.GlobalId);

      if (!node) {

        const hasNext = geometryIterator.next();

        if (!hasNext) break;

        continue;
      }

      if (geometryCache.has(geometryId)) {
        node.meshData = {
          geometryId: geometryId,
          isInstanceRef: true,
          matrix: matrix,
        };
        if (!instancedGeometries.has(geometryId)) {
          instancedGeometries.set(geometryId, []);
        }

        instancedGeometries.get(geometryId).push({
          GlobalId: entity.GlobalId,
          matrix: matrix,
        });
      } else {
        
        let mesh = generateMesh(shape);
        geometryCache.set(geometryId, mesh);

        node.meshData = {
          geometryId: geometryId,
          geometries: mesh,
          matrix: matrix,
          isInstanceRef: false,
        };
        instancedGeometries.set(geometryId, [{
          GlobalId: entity.GlobalId,
          matrix: matrix,
        }]);
      }

      loadedCount++;

      const hasNext = geometryIterator.next();

      if (!hasNext) {
        break;
      }
    }
  }

  const duration = performance.now() - startTime;
  const instancedGeometryMap = {};

  for (const [geometryId, instances] of instancedGeometries.entries()) {
    if (instances.length > 1) {
      const geometryData = geometryCache.get(geometryId);
      
      instancedGeometryMap[geometryId] = {
        instanceCount: instances.length,
        instances: instances,  
        geometryData: geometryData,  
      };
      const firstGlobalId = instances[0].GlobalId;

      const firstNode = findNodeByGlobalId(spatialStructure, firstGlobalId);
      
      if (firstNode && firstNode.meshData && firstNode.meshData.geometries) {
        firstNode.meshData = {
          geometryId: geometryId,
          isInstanceRef: true,
          matrix: firstNode.meshData.matrix,
        };
      }
    }
  }
  last_geometries = null;

  last_mesh_id = -1;

  return { spatialStructure, loadedCount, duration, instancedGeometryMap, success: true };
}

function generateMesh(shape) {
  let geometries;

  if (last_mesh_id == shape.geometry.id) {
    geometries = last_geometries;
  } else {
    geometries = [];

    const materialData = [];

    if (shape.geometry.materials) {

      shape.geometry.materials.toJs().forEach((m) => {
        materialData.push({
          diffuse: m.diffuse.components.toJs(),
          transparency: m.transparency,
        });
      });

    }

    let mapping = {};

    shape.geometry.material_ids.toJs().forEach((i, idx) => {
      mapping[i] = mapping[i] || [];

      mapping[i].push(idx);
    });

    let vs = new Float32Array(shape.geometry.verts.toJs());

    let ns = new Float32Array(shape.geometry.normals.toJs());

    let es = shape.geometry.edges.toJs();

    let fs = shape.geometry.faces.toJs();
    let offset = 0;

    let geomData = {
      vertices: vs,
      normals: ns,
      edges: es,
      faces: fs,
      materialData: materialData || [],
      mapping: mapping,
    };

    geometries.push(geomData);

    last_geometries = geometries;

    last_mesh_id = shape.geometry.id;
  }

  return geometries;
}

/**
 * Generate mesh data for a single IFC element by GlobalId
 * Used for native IFC modeling (walls, windows, doors) where geometry 
 * is generated after object defintion in the IFC database
 * 
 * @param {string} modelName - The model name
 * @param {string} GlobalId - The element's GlobalId
 * @returns {Object} Mesh data { geometries, matrix, GlobalId, entityType }
 */
export function generateMeshForElement(modelName, GlobalId) {
  const pyodide = getPyodide();

  const model = getIfc(modelName);

  const entity = model.by_guid(GlobalId);
  
  if (!entity) {
    throw new Error(`Element with GlobalId ${GlobalId} not found in model ${modelName}`);
  }

  const entityType = entity.is_a();

  let ifcopenshell_geom = pyodide.pyimport("ifcopenshell.geom");

  let settings = ifcopenshell_geom.settings();

  settings.set(settings.WELD_VERTICES, false);

  const shapeArgs = {
    settings: settings,
    inst: entity,
    geometry_library: "hybrid-cgal-simple-opencascade",
  };

  const shape = ifcopenshell_geom.create_shape.callKwargs(shapeArgs);

  const geometries = generateMesh(shape);

  let matrix = shape.transformation.data().components.toJs();

  const result = {
    geometries: geometries,
    matrix: matrix,
    GlobalId: String(GlobalId),
    entityType: String(entityType),
  };

  return result;
}
function createMeshData(element) {
  const pyodide = getPyodide();
  let ifcopenshell_geom = pyodide.pyimport("ifcopenshell.geom");

  let settings = ifcopenshell_geom.settings();

  settings.set(settings.WELD_VERTICES, false);

  const shapeArgs = {
    settings: settings,
    inst: element,
    geometry_library: "hybrid-cgal-simple-opencascade",
  };

  const shape = ifcopenshell_geom.create_shape.callKwargs(shapeArgs);

  const geometries = generateMesh(shape);

  let matrix = shape.transformation.data().components.toJs();

  const result = {
    geometries: geometries,
    matrix: matrix,
    GlobalId: String(element.GlobalId),
    entityType: String(element.is_a()),
  };

  return result;
}

export function vertical_layer(modelName, params) {
  const pyodide = getPyodide();

  const {
      start,
      end,
      height,
      typeGuid,
      elevation = 0,
      alignment = 'center',
      containerGuid
    } = params;
  const model = getIfc(modelName)

  const elementType = model.by_guid(typeGuid);
  
  let storey = null;

  if (containerGuid) {
    storey = model.by_guid(containerGuid);
  } else {
    storey = model.by_type("IfcBuildingStorey")[0];
  }

  if(! model || ! elementType ) {
    return { success: false, message: "Model or Wall Type not found" };
  }

  const ifc_author = pyodide.pyimport("ifc_author");

  let occurence = ifc_author.LayeredTypesTool.two_point_occurence(
    model,
    elementType,
    start,
    end,
    height,
    null,
    storey,
    elevation
  )
  return createMeshData(occurence);

  }

export function profiled_construction(modelName, params) {
  const pyodide = getPyodide();

  const model = getIfc(modelName)

  const {
    position,
    depth,
    typeGuid,
    containerGuid,
    start,
    end
  } = params;
  const elementType = model.by_guid(typeGuid);

  let storey = null;

  if (containerGuid) {
    storey = model.by_guid(containerGuid);
  } else {
    storey = model.by_type("IfcBuildingStorey")[0];
  }

  if(! model || ! elementType ) {
    return { success: false, message: "Model or Type not found" };
  }

  let occurence;

  const ifc_author = pyodide.pyimport("ifc_author");

  if (elementType.is_a() === "IfcColumnType") {

    occurence = ifc_author.ColumnTool.create_at_position(
      model,
      elementType,
      depth,
      storey,
      position
    )

  } else if (elementType.is_a() === "IfcBeamType") {

    occurence = ifc_author.BeamTool.create_between_positions(
      model,
      elementType,
      start,
      end,
      storey
    )

  } else if (elementType.is_a() === "IfcPileType") {

    occurence = ifc_author.PileTool.create_at_position(
      model,
      elementType,
      depth,
      storey,
      position
    )

  } else if (elementType.is_a() === "IfcFootingTool") {
    occurence = ifc_author.BeamTool.create_between_positions(
      model,
      elementType,
      start,
      end,
      storey
    )

  }

  return createMeshData(occurence);

  }

/**
 * Create a horizontal layered element (slab, floor) from a polyline perimeter
 * @param {string} modelName - The model name
 * @param {Object} params - Parameters including polyline, thickness, typeGuid, etc.
 * @returns {Object} Mesh data for the created element
 */
export function horizontal_layer(modelName, params) {
  const pyodide = getPyodide();
  const model = getIfc(modelName);

  const {
    polyline,
    thickness,
    typeGuid,
    containerGuid,
    elevation = 0
  } = params;
  const elementType = model.by_guid(typeGuid);

  let storey = null;

  if (containerGuid) {
    storey = model.by_guid(containerGuid);
  } else {
    storey = model.by_type("IfcBuildingStorey")[0];
  }

  if (!model || !elementType) {
    return { success: false, message: "Model or Type not found" };
  }

  const ifc_author = pyodide.pyimport("ifc_author");
  const perimeter = polyline.map(p => ifc_author.Position(p.x, p.y, p.z || 0));

  let occurence;

  if (elementType.is_a() === "IfcSlabType") {
    occurence = ifc_author.SlabTool.new_slab(
      model,
      elementType,
      storey,
      perimeter,
      elevation
    );
  } else if (elementType.is_a() === "IfcCoveringType") {
    occurence = ifc_author.CoveringTool.new_horizontal_cover(
      model,
      elementType,
      storey,
      perimeter,
      elevation
    );
  } else {
    
    occurence = ifc_author.LayeredTypesTool.occurence_by_perimeter(
      model,
      elementType,
      perimeter,
      null,  
      ifc_author.Position(0, 0, elevation),  
      storey
    );
  }

  return createMeshData(occurence);
}

export function createSpace(modelName, params) {
  const pyodide = getPyodide();
  const model = getIfc(modelName)
  const ifc_author = pyodide.pyimport("ifc_author");

  const { height, polyline } = params;

  const randomStorey = model.by_guid(params.containerGuid);

  const space_entity = ifc_author.SpaceTool.new_space_from_polyline(
    model,
    polyline,
    height,
    randomStorey
  )

  return createMeshData(space_entity);
}

export function createTypeOccurence(modelName, params) {
  const pyodide = getPyodide();
  
  const {
    typeGuid,
    containerGuid,
    position,
    rotation,
    elevation = 0
  } = params;

  const model = getIfc(modelName);

  const elementType = model.by_guid(typeGuid);
  
  const storey = containerGuid ? model.by_guid(containerGuid) : model.by_type("IfcBuildingStorey")[0];

  if (!model || !elementType || !storey) {
    return { success: false, message: "Model, Type or Storey not found" };
  }

  const ifc_author = pyodide.pyimport("ifc_author");
  const occurence = ifc_author.TypeTool.new_occurence(
    model,
    elementType
  );

  ifc_author.SpatialTool.run_assign_container(occurence, storey)

  ifc_author.PlacementTool.place_and_rotate(occurence, 
    ifc_author.Position(position.x, position.y, position.z ), 
    ifc_author.Rotation(0, 0, rotation?.z || 0)
  )

  return createMeshData(occurence);

}
