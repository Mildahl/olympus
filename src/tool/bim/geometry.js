import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const lineBasicMaterial = new THREE.LineBasicMaterial({ color: 0x222222 });

class GeometryTool {

  /**
   * Calculate bounding box for an IFC object
   */
  static calculateBounds(object) {
    const bounds = new THREE.Box3();

    if (object) {
      bounds.setFromObject(object);
    } else if (object.children) {
      
      for (let child of object.children) {
        const childBounds = this.calculateBounds(child);

        bounds.union(childBounds);
      }
    }

    return bounds;
  }

  /**
   * Convert a 4x4 matrix array to THREE.Matrix4
   * @param {Array} m - 4x4 matrix as nested array [[row0], [row1], [row2], [row3]]
   * @returns {THREE.Matrix4}
   */
  static matrixFromArray(m) {
    const mat = new THREE.Matrix4();
    mat.set(
      m[0][0], m[0][1], m[0][2], m[0][3],
      m[1][0], m[1][1], m[1][2], m[1][3],
      m[2][0], m[2][1], m[2][2], m[2][3],
      m[3][0], m[3][1], m[3][2], m[3][3]
    );

    return mat;
  }

  /**
   * Create BufferGeometry from geometry data
   * @param {Object} geomData - The geometry data with vertices, normals, faces, mapping, materialData
   * @param {Array} faceIndices - Face indices for this material
   * @returns {THREE.BufferGeometry}
   */
  static createBufferGeometry(geomData, faceIndices) {
    const geometry = new THREE.BufferGeometry();
    
    const indices = [];

    for (const faceIdx of faceIndices) {
      indices.push(geomData.faces[3 * faceIdx + 0]);

      indices.push(geomData.faces[3 * faceIdx + 1]);

      indices.push(geomData.faces[3 * faceIdx + 2]);
    }
    
    geometry.setIndex(indices);

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(geomData.vertices, 3));

    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(geomData.normals, 3));
    
    return geometry;
  }

  /**
   * Create material from material data
   * @param {Object} materialInfo - Material info with diffuse and transparency
   * @returns {THREE.MeshLambertMaterial}
   */
  static createMaterial(materialInfo) {
    return new THREE.MeshLambertMaterial({
      color: new THREE.Color(...materialInfo.diffuse),
      opacity: 1.0 - (materialInfo.transparency || 0),
      transparent: (materialInfo.transparency || 0) > 1.e-5,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 1.0,
    });
  }

  /**
   * Generate an InstancedMesh from geometry data and instance transforms
   * Used for repeated geometries like windows, doors of the same type
   * 
   * @param {Object} instanceData - Data from instancedGeometryMap
   * @param {Array} instanceData.geometryData - The shared geometry data
   * @param {Array} instanceData.instances - Array of { GlobalId, matrix }
   * @returns {Object} { instancedMeshes: THREE.InstancedMesh[], instanceMapping: Map<GlobalId, instanceIndex> }
   */
  static generateInstancedMesh(instanceData) {
    const { geometryData, instances } = instanceData;
    
    if (!geometryData || !geometryData.length) {
      return { instancedMeshes: [], instanceMapping: new Map() };
    }

    const instanceCount = instances.length;

    const instancedMeshes = [];

    const instanceMapping = new Map();  

    for (const geomData of geometryData) {
      if (!geomData || !geomData.materialData || !geomData.mapping) {

        continue;
      }

      const { materialData, mapping } = geomData;
      let materials = materialData.map(m => this.createMaterial(m));
      
      let offset = 0;

      if (mapping && mapping[-1]) {
        materials.unshift(new THREE.MeshLambertMaterial({
          color: new THREE.Color(0.6, 0.6, 0.6),
          side: THREE.DoubleSide
        }));

        offset = 1;
      }
      materials.forEach((material, materialIndex) => {
        const faceIndices = mapping[materialIndex - offset];

        if (!faceIndices) return;

        const geometry = this.createBufferGeometry(geomData, faceIndices);
        
        const instancedMesh = new THREE.InstancedMesh(geometry, material, instanceCount);
        instancedMesh.matrixAutoUpdate = false;
        instancedMesh.instanceIndexToGlobalId = new Map();
        instances.forEach((instance, idx) => {
          const matrix = this.matrixFromArray(instance.matrix);

          instancedMesh.setMatrixAt(idx, matrix);

          instancedMesh.isIfc = true;

          instancedMesh.isInstancedIfc = true;
          instancedMesh.instanceIndexToGlobalId.set(idx, instance.GlobalId);
          instancedMesh.uuid = `IFC/InstancedMesh/${instances[0].GlobalId}`;
          if (!instanceMapping.has(instance.GlobalId)) {
            instanceMapping.set(instance.GlobalId, []);
          }

          instanceMapping.get(instance.GlobalId).push({
            mesh: instancedMesh,
            instanceIndex: idx,
          });
        });
        
        instancedMesh.instanceMatrix.needsUpdate = true;
        instancedMesh.matrix.identity();

        instancedMeshes.push(instancedMesh);
      });
    }

    return { instancedMeshes, instanceMapping };
  }

  static applyIfcBodyMeshUserData(mesh, GlobalId) {
    mesh.isIfc = true;

    mesh.uuid = `IFC/BodyRepresentation/${GlobalId}`;

    mesh.userData.ifcBodyMesh = true;

    mesh.userData.ifcElementGlobalId = GlobalId;
  }

  static collectGeometryMaterialPairs(meshData, GlobalId) {
    const pairs = [];

    const { geometries } = meshData;

    if (!geometries || !Array.isArray(geometries) || geometries.length === 0) {
      return pairs;
    }

    for (const geomData of geometries) {
      const { materialData, mapping } = geomData;

      if (!materialData || !Array.isArray(materialData)) {
        console.warn(`[GeometryTool.createThreeJSMesh] No material data for GlobalId: ${GlobalId}, using default material`);

        const geometry = new THREE.BufferGeometry();

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(geomData.vertices, 3));

        if (geomData.normals) {
          geometry.setAttribute('normal', new THREE.Float32BufferAttribute(geomData.normals, 3));
        }

        if (geomData.faces) {
          geometry.setIndex(Array.from(geomData.faces));
        }

        const defaultMaterial = new THREE.MeshLambertMaterial({
          color: new THREE.Color(0.6, 0.6, 0.6),
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: 1.0,
        });

        pairs.push({ geometry, material: defaultMaterial });

        continue;
      }

      let materials = materialData.map((m) => this.createMaterial(m));

      let offset = 0;

      if (mapping && mapping[-1]) {
        materials.unshift(
          new THREE.MeshLambertMaterial({
            color: new THREE.Color(0.6, 0.6, 0.6),
            side: THREE.DoubleSide,
          }),
        );

        offset = 1;
      }

      materials.forEach((material, materialIndex) => {
        const faceIndices = mapping ? mapping[materialIndex - offset] : null;

        if (!faceIndices) return;

        const geometry = this.createBufferGeometry(geomData, faceIndices);

        pairs.push({ geometry, material });
      });
    }

    return pairs;
  }

  /**
   * Generate regular mesh for non-instanced geometry
   * @param {Object} meshData - The mesh data with geometries and matrix
   * @param {string} GlobalId - The element's GlobalId
   * @param {Object} [options]
   * @param {'merged'|'multiMesh'} [options.assembly='merged']
   * @returns {Object} { meshes: THREE.Mesh[], lines: THREE.LineSegments | null }
   */
  static createThreeJSMesh(meshData, GlobalId, options) {
    const assembly =
      options && options.assembly === 'multiMesh' ? 'multiMesh' : 'merged';

    const { matrix } = meshData;

    const pairs = this.collectGeometryMaterialPairs(meshData, GlobalId);

    const meshes = [];

    const lines = null;

    if (pairs.length === 0) {
      return { meshes, lines };
    }

    const attachMatrixAndIfcBody = (mesh) => {
      if (matrix) {
        const mat = this.matrixFromArray(matrix);

        mesh.matrixAutoUpdate = false;

        mesh.matrix = mat;
      }

      this.applyIfcBodyMeshUserData(mesh, GlobalId);
    };

    const buildSeparateMeshes = () => {
      const result = [];

      for (let i = 0; i < pairs.length; i++) {
        const { geometry, material } = pairs[i];

        const mesh = new THREE.Mesh(geometry, material);

        attachMatrixAndIfcBody(mesh);

        result.push(mesh);
      }

      return result;
    };

    if (assembly === 'multiMesh' || pairs.length === 1) {
      return { meshes: buildSeparateMeshes(), lines };
    }

    const geometryList = pairs.map((entry) => entry.geometry);

    const materialList = pairs.map((entry) => entry.material);

    const mergedGeometry = mergeGeometries(geometryList, true);

    if (!mergedGeometry) {
      return { meshes: buildSeparateMeshes(), lines };
    }

    const mergedMesh = new THREE.Mesh(mergedGeometry, materialList);

    attachMatrixAndIfcBody(mergedMesh);

    meshes.push(mergedMesh);

    return { meshes, lines };
  }
  
}
export default GeometryTool;