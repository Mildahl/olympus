import * as THREE from "three";

/**
 * SliceTool - Stateless scene mesh extraction for slice generation
 *
 * This tool handles THREE.js scene-specific operations (mesh data extraction).
 * All pure slice logic (cutting, rendering, export) is in the addon's core.js.
 *
 * Architecture:
 *   UI → Operators → Core (pure logic, uses tools for scene access)
 *   Tool = scene data extraction (THREE.js dependent)
 *   Core = pure data processing (no THREE.js dependency)
 *
 * Usage:
 *   const meshData = tools.world.slicer.getMeshDataFromScene(context);
 *   const drawing = Core.generateDrawing(meshData, config); // Core handles the rest
 */
class SliceTool {

  /**
   * Extract mesh data from a single Three.js object (world matrix applied).
   * @param {THREE.Mesh|THREE.Object3D} object - Mesh or object with geometry
   * @param {number} modelIndex - Model index for multi-model
   * @returns {MeshData|null} { positions, indices, expressId, ifcType, modelIndex } or null
   */
  static getMeshDataFromObject(object, modelIndex = 0) {
    if (!object || !object.geometry) return null;

    const geom = object.geometry;

    const positionAttr = geom.getAttribute("position");

    if (!positionAttr || positionAttr.count === 0) return null;

    const worldMatrix = object.matrixWorld;

    const positions = new Float32Array(positionAttr.count * 3);

    const posArray = positionAttr.array;

    const v = new THREE.Vector3();

    for (let i = 0; i < positionAttr.count; i++) {
      v.fromArray(posArray, i * 3);

      v.applyMatrix4(worldMatrix);

      positions[i * 3] = v.x;

      positions[i * 3 + 1] = v.y;

      positions[i * 3 + 2] = v.z;
    }

    let indices;

    if (geom.index) {
      indices = new Uint32Array(geom.index.array.length);

      indices.set(geom.index.array);
    } else {
      indices = new Uint32Array(positionAttr.count);

      for (let i = 0; i < positionAttr.count; i++) indices[i] = i;
    }

    const expressId = object.userData?.expressId ?? object.userData?.GlobalId ?? 0;

    const ifcType = object.userData?.ifcType ?? object.type ?? "Mesh";

    return {
      positions,
      indices,
      expressId: typeof expressId === "string" ? 0 : expressId,
      ifcType,
      modelIndex,
    };
  }

  /**
   * Collect mesh data from all meshes in the scene (traverse visible, non-helper).
   * @param {Object} context - Application context with context.editor.scene
   * @returns {MeshData[]}
   */
  static getMeshDataFromScene(context) {
    if (!context?.editor?.scene) return [];

    const meshes = [];

    context.editor.scene.traverseVisible((object) => {
      if (object.isMesh && object.geometry && !object.userData?.isHelper) {
        const data = SliceTool.getMeshDataFromObject(object, 0);

        if (data) meshes.push(data);
      }
    });

    return meshes;
  }
}

export default SliceTool;
