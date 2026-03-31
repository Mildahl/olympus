import * as THREE from 'three';

import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

import { MapControls } from 'three/examples/jsm/controls/MapControls.js';

import { PlanarIntersectionGenerator } from '../../../external/vendor/three-edge-projection/index.js';

import { ThreeHelpers } from '../../context/world/utils/ThreeHelpers.js';

const _LOCAL_PLANE_NORMAL = /* @__PURE__ */ new THREE.Vector3(0, 0, 1);

function applyProjectionPreviewRoll(camera, rollDegrees) {
  if (!Number.isFinite(rollDegrees) || rollDegrees === 0) {
    return;
  }

  const forward = new THREE.Vector3();

  camera.getWorldDirection(forward);

  const rollQuaternion = new THREE.Quaternion().setFromAxisAngle(
    forward,
    THREE.MathUtils.degToRad(rollDegrees)
  );

  camera.up.applyQuaternion(rollQuaternion);
}

/**
 * Scene extraction for planar section / edge-projection workflows.
 * Bounding boxes and merged geometry use **editor.scene** world space (**Z-up**).
 */
class ProjectionTool {

  static axis = 'z';
  static position = 0;
  static viewportPlaneGroup = null;

  static planarSectionPreviewHandlesByKey = {};

  static planarSectionPreviewHandle = null;

  static projectionPreviewLastSectionBounds = null;

  static projectionPreviewLastSectionAxis = 'z';

  static getPlanarSectionPreviewKey(previewKey) {
    return typeof previewKey === 'string' && previewKey.length > 0 ? previewKey : 'default';
  }

  static getOrCreatePlanarSectionPreviewState(previewKey) {
    const resolvedPreviewKey = ProjectionTool.getPlanarSectionPreviewKey(previewKey);

    let previewState = ProjectionTool.planarSectionPreviewHandlesByKey[resolvedPreviewKey];

    if (!previewState) {
      previewState = {
        handle: null,
        bounds: null,
        axis: 'z',
      };

      ProjectionTool.planarSectionPreviewHandlesByKey[resolvedPreviewKey] = previewState;
    }

    return previewState;
  }

  static syncLegacyDefaultPlanarSectionPreviewState() {
    const defaultPreviewState = ProjectionTool.getOrCreatePlanarSectionPreviewState('default');

    ProjectionTool.planarSectionPreviewHandle = defaultPreviewState.handle;
    ProjectionTool.projectionPreviewLastSectionBounds = defaultPreviewState.bounds;
    ProjectionTool.projectionPreviewLastSectionAxis = defaultPreviewState.axis;
  }

  static getPlanarSectionPreviewHandle(previewKey = 'default') {
    const previewState = ProjectionTool.getOrCreatePlanarSectionPreviewState(previewKey);

    return previewState.handle;
  }


  static mergeWorldGeometries(context) {
    if (!context || !context.editor || !context.editor.scene) return null;

    const scene = context.editor.scene;

    const geometries = [];

    const instanceMatrix = new THREE.Matrix4();

    const combinedWorldMatrix = new THREE.Matrix4();

    scene.traverseVisible((object) => {
      if (!object) return;

      if (object.userData && object.userData.isHelper) return;

      if (object.isInstancedMesh && object.geometry) {
        object.updateWorldMatrix(true, false);

        const baseGeometry = object.geometry;

        const positionAttribute = baseGeometry.getAttribute('position');

        if (!positionAttribute || positionAttribute.count === 0) return;

        const instanceCount = object.count;

        for (let instanceIndex = 0; instanceIndex < instanceCount; instanceIndex++) {
          object.getMatrixAt(instanceIndex, instanceMatrix);

          combinedWorldMatrix.multiplyMatrices(object.matrixWorld, instanceMatrix);

          const clone = baseGeometry.clone();

          clone.applyMatrix4(combinedWorldMatrix);

          for (const key in clone.attributes) {
            if (key !== 'position') clone.deleteAttribute(key);
          }

          const pos = clone.getAttribute('position');

          if (pos && pos.count > 0) {
            geometries.push(clone);
          } else {
            clone.dispose();
          }
        }

        return;
      }

      if (!object.isMesh || !object.geometry) return;

      if (object.userData && object.userData.isHelper) return;

      object.updateWorldMatrix(true, false);

      const clone = object.geometry.clone();

      clone.applyMatrix4(object.matrixWorld);

      for (const key in clone.attributes) {
        if (key !== 'position') clone.deleteAttribute(key);
      }

      const pos = clone.getAttribute('position');

      if (pos && pos.count > 0) {
        geometries.push(clone);
      } else {
        clone.dispose();
      }
    });

    if (geometries.length === 0) return null;

    const merged = mergeGeometries(geometries, false);

    for (let i = 0; i < geometries.length; i++) {
      geometries[i].dispose();
    }

    return merged;
  }


  static getVisibleMeshesWorldBox(context) {
    const box = new THREE.Box3();

    if (!context || !context.editor || !context.editor.scene) return box;

    const scene = context.editor.scene;

    const tmp = new THREE.Box3();

    const instanceMatrix = new THREE.Matrix4();

    const combinedWorldMatrix = new THREE.Matrix4();

    const vertex = new THREE.Vector3();

    scene.traverseVisible((object) => {
      if (!object) return;

      if (object.userData && object.userData.isHelper) return;

      if (object.isInstancedMesh && object.geometry) {
        object.updateWorldMatrix(true, false);

        const baseGeometry = object.geometry;

        const positionAttribute = baseGeometry.getAttribute('position');

        if (!positionAttribute || positionAttribute.count === 0) return;

        const instanceCount = object.count;

        for (let instanceIndex = 0; instanceIndex < instanceCount; instanceIndex++) {
          object.getMatrixAt(instanceIndex, instanceMatrix);

          combinedWorldMatrix.multiplyMatrices(object.matrixWorld, instanceMatrix);

          for (let vertexIndex = 0; vertexIndex < positionAttribute.count; vertexIndex++) {
            vertex.fromBufferAttribute(positionAttribute, vertexIndex);

            vertex.applyMatrix4(combinedWorldMatrix);

            box.expandByPoint(vertex);
          }
        }

        return;
      }

      if (!object.isMesh || !object.geometry) return;

      if (object.userData && object.userData.isHelper) return;

      const positionAttribute = object.geometry.getAttribute('position');

      if (!positionAttribute || !positionAttribute.count) return;

      object.updateWorldMatrix(true, false);

      tmp.setFromObject(object);

      if (!tmp.isEmpty()) box.union(tmp);
    });

    return box;
  }


  static disposeCutPlaneGroup(group) {
    if (!group) return;

    group.traverse((object) => {
      if (object.geometry) object.geometry.dispose();

      if (object.material) {
        if (Array.isArray(object.material)) {
          for (let index = 0; index < object.material.length; index++) {
            object.material[index].dispose();
          }
        } else {
          object.material.dispose();
        }
      }
    });
  }


  static removeCutPlane(editor, group) {
    if (!editor || !editor.sceneHelpers || !group) return;

    editor.sceneHelpers.remove(group);

    const signals = editor.signals;

    if (signals && signals.sceneGraphChanged) {
      signals.sceneGraphChanged.dispatch();
    }
  }


  static addCutPlane(editor, group) {
    if (!editor || !editor.sceneHelpers || !group) return;

    editor.sceneHelpers.add(group);

    const signals = editor.signals;

    if (signals && signals.sceneGraphChanged) {
      signals.sceneGraphChanged.dispatch();
    }
  }


  static normalizePlanarAxisKey(value) {
    return ThreeHelpers.normalizeProjectionCutAxis(value);
  }


  static normalForAxis(axis) {
    return ThreeHelpers.getProjectionCutMetadata(axis).normal;
  }


  static getCutPlaneAxisSelectOptions() {
    const projectionAxisOrder = ['z', 'y', 'x'];

    const options = [];

    for (let index = 0; index < projectionAxisOrder.length; index++) {
      const axisKey = projectionAxisOrder[index];

      const projectionCutMetadata = ThreeHelpers.getProjectionCutMetadata(axisKey);

      options.push({
        value: axisKey,
        label: projectionCutMetadata.uiLabel,
      });
    }

    return options;
  }

  static buildCutPlaneIndicator(axis, position, worldBox) {
    axis = ProjectionTool.normalizePlanarAxisKey(axis);

    const projectionCutMetadata = ThreeHelpers.getProjectionCutMetadata(axis);

    if (!worldBox || worldBox.isEmpty()) return null;

    const center = new THREE.Vector3();

    const size = new THREE.Vector3();

    worldBox.getCenter(center);

    worldBox.getSize(size);

    const margin = 1.08;

    const fillMat = new THREE.MeshBasicMaterial({
      color: 0x00b4d8,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const edgeMat = new THREE.LineBasicMaterial({ color: 0x48cae4, depthTest: true });

    const geomFill = new THREE.PlaneGeometry(1, 1);

    const geomEdge = new THREE.PlaneGeometry(1, 1);

    const fill = new THREE.Mesh(geomFill, fillMat);

    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geomEdge, 1), edgeMat);

    const group = new THREE.Group();

    group.name = 'ProjectionCutPlane';

    group.userData.projectionCutPlane = true;

    group.renderOrder = 990;

    fill.renderOrder = 991;

    edges.renderOrder = 992;

    const worldNormal = projectionCutMetadata.normal;

    const q = new THREE.Quaternion().setFromUnitVectors(_LOCAL_PLANE_NORMAL, worldNormal);

    fill.quaternion.copy(q);

    edges.quaternion.copy(q);

    let sx;

    let sy;

    sx = Math.max(size[projectionCutMetadata.indicatorSizeAxes.width] * margin, 1);

    sy = Math.max(size[projectionCutMetadata.indicatorSizeAxes.height] * margin, 1);

    const indicatorCenter = center.clone();

    indicatorCenter[projectionCutMetadata.constantAxis] = position;

    fill.position.copy(indicatorCenter);

    fill.scale.set(sx, sy, 1);

    edges.scale.set(sx, sy, 1);

    edges.position.copy(fill.position);

    edges.quaternion.copy(fill.quaternion);

    group.add(fill);

    group.add(edges);

    return group;
  }


  static buildViewportCutPlaneIndicatorGroup(context, axis, position) {
    const normalizedAxis = ProjectionTool.normalizePlanarAxisKey(axis);

    const worldBox = ProjectionTool.getVisibleMeshesWorldBox(context);

    return ProjectionTool.buildCutPlaneIndicator(normalizedAxis, position, worldBox);
  }


  static vertexCountFromPlanarSectionGeometry(lineGeometry) {
    if (!lineGeometry) return 0;

    const positionAttribute = lineGeometry.getAttribute('position');

    return positionAttribute && positionAttribute.count ? positionAttribute.count : 0;
  }


  static computePlanarSectionGeometry(axis, position, context) {
    axis = ProjectionTool.normalizePlanarAxisKey(axis);

    const merged = ProjectionTool.mergeWorldGeometries(context);

    if (!merged) {
      return { lineGeometry: null, bounds: new THREE.Box3(), vertexCount: 0 };
    }

    const working = merged.clone();

    merged.dispose();

    const generator = new PlanarIntersectionGenerator();

    const n = ProjectionTool.normalForAxis(axis);

    generator.plane.set(n, -position);

    const lineGeometry = generator.generate(working);

    working.dispose();

    const bounds = new THREE.Box3();

    const pos = lineGeometry.getAttribute('position');

    if (pos && pos.count > 0) {
      bounds.makeEmpty();

      const vertexPosition = new THREE.Vector3();

      for (let vertexIndex = 0; vertexIndex < pos.count; vertexIndex++) {
        vertexPosition.fromBufferAttribute(pos, vertexIndex);
        bounds.expandByPoint(vertexPosition);
      }
    }

    const vertexCount = ProjectionTool.vertexCountFromPlanarSectionGeometry(lineGeometry);

    return { lineGeometry, bounds, vertexCount };
  }


  static mountPlanarSectionPreview(hostDomElement, previewKey = 'default', options = {}) {
    if (!hostDomElement) {
      return;
    }

    const previewState = ProjectionTool.getOrCreatePlanarSectionPreviewState(previewKey);

    if (previewState.handle) {
      previewState.handle.dispose();

      previewState.handle = null;
    }

    const onHostResize = () => {
      const currentPreviewState = ProjectionTool.getOrCreatePlanarSectionPreviewState(previewKey);

      const bounds = currentPreviewState.bounds;

      const axis = currentPreviewState.axis;

      if (!bounds || !currentPreviewState.handle) {
        return;
      }

      ProjectionTool.fitPlanarSectionPreviewCamera(
        currentPreviewState.handle,
        bounds,
        axis || 'z'
      );
    };

    previewState.handle =
      ProjectionTool.createPlanarSectionPreviewViewport(hostDomElement, onHostResize, options);

    previewState.bounds = null;

    previewState.axis = 'z';

    ProjectionTool.syncLegacyDefaultPlanarSectionPreviewState();
  }


  static disposePlanarSectionPreview(previewKey = 'default') {
    const previewState = ProjectionTool.getOrCreatePlanarSectionPreviewState(previewKey);

    const preview = previewState.handle;

    if (!preview) {
      return;
    }

    preview.dispose();

    previewState.handle = null;

    previewState.bounds = null;

    previewState.axis = 'z';

    ProjectionTool.syncLegacyDefaultPlanarSectionPreviewState();
  }


  static syncPlanarSectionPreviewSize(previewKey = 'default') {
    const preview = ProjectionTool.getPlanarSectionPreviewHandle(previewKey);

    if (!preview) {
      return;
    }

    preview.syncSize();
  }


  static renderPlanarSectionPreviewFrame(previewKey = 'default') {
    const preview = ProjectionTool.getPlanarSectionPreviewHandle(previewKey);

    if (!preview) {
      return;
    }

    preview.renderFrame();
  }


  static applyPlanarSectionPreviewFromRegeneratedPayload(payload, previewKey = 'default') {
    if (!payload) {
      return;
    }

    const previewState = ProjectionTool.getOrCreatePlanarSectionPreviewState(previewKey);

    const preview = previewState.handle;

    if (!preview) {
      return;
    }

    const lineGeometry = payload.lineGeometry;

    const bounds = payload.bounds;

    const axis = ThreeHelpers.normalizeProjectionCutAxis(payload.axis);

    if (lineGeometry) {
      preview.setSectionLineGeometry(lineGeometry);

      previewState.bounds =
        bounds && typeof bounds.isEmpty === 'function' && !bounds.isEmpty()
          ? bounds.clone()
          : null;
    } else {
      preview.setSectionLineGeometry(null);

      previewState.bounds = null;
    }

    previewState.axis = axis;

    preview.syncSize();

    ProjectionTool.fitPlanarSectionPreviewCamera(
      preview,
      previewState.bounds,
      axis
    );

    ProjectionTool.syncLegacyDefaultPlanarSectionPreviewState();
  }


  static createPlanarSectionPreviewViewport(hostDomElement, onHostResize, options = {}) {
    const miniScene = new THREE.Scene();

    miniScene.background = new THREE.Color(0x1a1a1a);

    const half = 10;

    const miniCamera = new THREE.OrthographicCamera(-half, half, half, -half, 0.1, 50000);

    miniCamera.position.set(0, 0, 50);

    miniCamera.up.set(0, 1, 0);

    miniCamera.lookAt(0, 0, 0);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);

    directionalLight.position.set(1, 2, 3);

    miniScene.add(directionalLight);

    miniScene.add(new THREE.AmbientLight(0xb0bec5, 0.35));

    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xe0e0e0 });

    const lineSegments = new THREE.LineSegments(new THREE.BufferGeometry(), lineMaterial);

    miniScene.add(lineSegments);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    if (options.canvasClassName) {
      renderer.domElement.className = options.canvasClassName;
    }

    hostDomElement.appendChild(renderer.domElement);

    const controls = new MapControls(miniCamera, renderer.domElement);

    controls.enableRotate = false;

    controls.screenSpacePanning = true;

    const syncSize = () => {
      const width = Math.max(1, hostDomElement.clientWidth);

      const height = Math.max(1, hostDomElement.clientHeight);

      renderer.setSize(width, height, false);
    };

    syncSize();

    const resizeObserver = new ResizeObserver(() => {
      syncSize();

      if (typeof onHostResize === 'function') {
        onHostResize();
      }
    });

    resizeObserver.observe(hostDomElement);

    const renderFrame = () => {
      controls.update();

      renderer.render(miniScene, miniCamera);
    };

    const setSectionLineGeometry = (lineGeometry) => {
      if (lineSegments.geometry) {
        lineSegments.geometry.dispose();
      }

      lineSegments.geometry = lineGeometry || new THREE.BufferGeometry();
    };

    const dispose = () => {
      resizeObserver.disconnect();

      if (lineSegments.geometry) {
        lineSegments.geometry.dispose();
      }

      lineMaterial.dispose();

      renderer.dispose();

      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };

    return {
      syncSize,
      renderFrame,
      setSectionLineGeometry,
      dispose,
      scene: miniScene,
      camera: miniCamera,
      renderer,
      controls,
      lineSegments,
    };
  }


  static fitPlanarSectionPreviewCamera(handle, bounds, axis) {
    if (!handle || !handle.camera || !handle.controls || !handle.lineSegments) {
      return;
    }

    const hostDomElement =
      handle.renderer && handle.renderer.domElement && handle.renderer.domElement.parentNode
        ? handle.renderer.domElement.parentNode
        : null;

    if (!hostDomElement) {
      return;
    }

    const domWidth = hostDomElement.clientWidth;

    const domHeight = Math.max(1, hostDomElement.clientHeight);

    const aspect = Math.max(0.0001, domWidth / domHeight);

    const padding = 1.2;

    const miniCamera = handle.camera;

    const controls = handle.controls;

    const normalizedAxis = ThreeHelpers.normalizeProjectionCutAxis(axis);

    const projectionCutMetadata = ThreeHelpers.getProjectionCutMetadata(normalizedAxis);

    if (!bounds || bounds.isEmpty()) {
      const targetCenter = new THREE.Vector3(0, 0, 0);

      miniCamera.near = 0.1;

      miniCamera.far = 50000;

      const halfExtent = 10;

      miniCamera.left = -halfExtent * aspect;

      miniCamera.right = halfExtent * aspect;

      miniCamera.top = halfExtent;

      miniCamera.bottom = -halfExtent;

      miniCamera.up.copy(projectionCutMetadata.previewUpVector);

      miniCamera.position.copy(
        targetCenter.clone().add(
          projectionCutMetadata.previewViewDirection.clone().multiplyScalar(50)
        )
      );

      miniCamera.lookAt(0, 0, 0);

      applyProjectionPreviewRoll(miniCamera, projectionCutMetadata.previewRollDegrees);

      miniCamera.updateProjectionMatrix();

      controls.target.set(0, 0, 0);

      controls.update();

      return;
    }

    const center = new THREE.Vector3();

    const size = new THREE.Vector3();

    bounds.getCenter(center);

    bounds.getSize(size);

    const depth = Math.max(size.x, size.y, size.z, 5) * 2.5;

    miniCamera.up.copy(projectionCutMetadata.previewUpVector);

    miniCamera.position.copy(
      center.clone().add(
        projectionCutMetadata.previewViewDirection.clone().multiplyScalar(depth)
      )
    );

    miniCamera.lookAt(center.x, center.y, center.z);

    applyProjectionPreviewRoll(miniCamera, projectionCutMetadata.previewRollDegrees);

    miniCamera.updateMatrixWorld();

    const inverseWorld = miniCamera.matrixWorldInverse;

    const corner = new THREE.Vector3();

    const boxMin = bounds.min;

    const boxMax = bounds.max;

    const cornerX = [boxMin.x, boxMax.x];

    const cornerY = [boxMin.y, boxMax.y];

    const cornerZ = [boxMin.z, boxMax.z];

    let minCamX = Number.POSITIVE_INFINITY;

    let maxCamX = Number.NEGATIVE_INFINITY;

    let minCamY = Number.POSITIVE_INFINITY;

    let maxCamY = Number.NEGATIVE_INFINITY;

    let minCamZ = Number.POSITIVE_INFINITY;

    let maxCamZ = Number.NEGATIVE_INFINITY;

    for (let ix = 0; ix < 2; ix++) {
      for (let iy = 0; iy < 2; iy++) {
        for (let iz = 0; iz < 2; iz++) {
          corner.set(cornerX[ix], cornerY[iy], cornerZ[iz]);

          corner.applyMatrix4(inverseWorld);

          if (corner.x < minCamX) minCamX = corner.x;

          if (corner.x > maxCamX) maxCamX = corner.x;

          if (corner.y < minCamY) minCamY = corner.y;

          if (corner.y > maxCamY) maxCamY = corner.y;

          if (corner.z < minCamZ) minCamZ = corner.z;

          if (corner.z > maxCamZ) maxCamZ = corner.z;
        }
      }
    }

    const spanX = Math.max(maxCamX - minCamX, 1e-6);

    const spanY = Math.max(maxCamY - minCamY, 1e-6);

    let halfW = spanX * 0.5 * padding;

    let halfH = spanY * 0.5 * padding;

    if (halfW / halfH > aspect) {
      halfH = halfW / aspect;
    } else {
      halfW = halfH * aspect;
    }

    const centerCamX = (minCamX + maxCamX) * 0.5;

    const centerCamY = (minCamY + maxCamY) * 0.5;

    miniCamera.left = centerCamX - halfW;

    miniCamera.right = centerCamX + halfW;

    miniCamera.bottom = centerCamY - halfH;

    miniCamera.top = centerCamY + halfH;

    const farthestAlongView = -minCamZ;

    const closestAlongView = -maxCamZ;

    let nearDistance = 0.1;

    if (closestAlongView > 0 && nearDistance >= closestAlongView) {
      nearDistance = Math.max(closestAlongView * 0.01, 1e-4);
    }

    miniCamera.near = nearDistance;

    miniCamera.far = Math.max(
      farthestAlongView + Math.max(1, farthestAlongView * 0.01),
      nearDistance + 1,
      depth * 3
    );

    miniCamera.updateProjectionMatrix();

    controls.target.copy(center);

    controls.update();
  }


}

export default ProjectionTool;
