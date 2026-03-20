import * as THREE from 'three';

/**
 * SnapTool - Static utility class for snapping operations
 * Provides reusable snapping logic for vertex, edge, face, and grid snapping.
 * Extracted from MeasureTool for shared use across tools like DrawingTool and MeasureTool.
 */
class SnapTool {
  static DEFAULT_OPTIONS = {
    snapThreshold: 0.5,
    snapIndicatorColor: 0xffff00,
  };
  /**
   * Create a snap indicator mesh
   * @param {Object} options - Visual options
   * @returns {Object} { indicator: THREE.Mesh, ring: THREE.Mesh }
   */
  static createSnapIndicator(options = {}) {
    const color = options.snapIndicatorColor || this.DEFAULT_OPTIONS.snapIndicatorColor;

    const geometry = new THREE.SphereGeometry(0.05, 16, 16);

    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8,
      depthTest: false,
    });

    const indicator = new THREE.Mesh(geometry, material);

    indicator.visible = false;
    const ringGeometry = new THREE.RingGeometry(0.11, 0.12, 32);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthTest: false,
    });

    const ring = new THREE.Mesh(ringGeometry, ringMaterial);

    ring.visible = false;

    return { indicator, ring };
  }

  /**
   * Update snap indicator position and visibility
   * @param {THREE.Mesh} indicator - Snap indicator mesh
   * @param {THREE.Mesh} ring - Snap ring mesh
   * @param {THREE.Vector3|null} point - Snap point or null to hide
   * @param {THREE.Camera} camera - Camera for orientation
   */
  static updateSnapIndicator(indicator, ring, point, camera) {
    if (!point) {
      indicator.visible = false;

      ring.visible = false;

      return;
    }

    indicator.position.copy(point);

    indicator.visible = true;

    ring.position.copy(point);

    ring.lookAt(camera.position);

    ring.visible = true;
    const distance = camera.position.distanceTo(point);

    const scale = Math.max(0.5, distance * 0.02);

    indicator.scale.setScalar(scale);

    ring.scale.setScalar(scale);
  }
  /**
   * Get snap point from mouse position
   * @param {Object} params - Parameters
   * @param {THREE.Raycaster} params.raycaster - Raycaster instance
   * @param {THREE.Vector2} params.mouse - Normalized mouse coordinates
   * @param {THREE.Camera} params.camera - Camera
   * @param {THREE.Camera} params.scene - Scene to intersect
   * @param {Object} params.snapOptions - Snap configuration
   * @param {number} params.elevation - Z elevation for plane intersection
   * @returns {Object|null} { point: THREE.Vector3, type: string, object: THREE.Object3D, face, faceIndex }
   * When snapEnabled is false, returns the mouse position on the plane at elevation.
   * When snapEnabled is true, returns snapped point to objects or plane.
   */
  static getSnapPoint({ raycaster, mouse, camera, scene, snapOptions = {}, elevation = 0 }) {
    const {
      snapEnabled = true,
      snapToVertex = true,
      snapToEdge = true,
      snapToFace = true,
      snapToGrid = true,
      snapThreshold = this.DEFAULT_OPTIONS.snapThreshold,
    } = snapOptions;

    raycaster.setFromCamera(mouse, camera);
    if (!snapEnabled) {
      return this.getGridSnapPoint(raycaster, 1, elevation, false);
    }
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length === 0) {
      
      return this.getGridSnapPoint(raycaster, 1, elevation, snapToGrid);
    }

    const intersection = intersects[0];

    const point = intersection.point.clone();

    let snapType = 'FACE';

    let snapPoint = point;
    if (snapToVertex && snapEnabled) {
      const vertexSnap = this.findNearestVertex(intersection);

      if (vertexSnap && vertexSnap.distance < snapThreshold) {
        snapPoint = vertexSnap.point;

        snapType = 'VERTEX';
      }
    }
    if (snapType === 'FACE' && snapToEdge && snapEnabled) {
      const edgeSnap = this.findNearestEdge(intersection, snapThreshold);

      if (edgeSnap && edgeSnap.distance < snapThreshold) {
        snapPoint = edgeSnap.point;

        snapType = 'EDGE';
      }
    }

    return {
      point: snapPoint,
      type: snapType,
      object: intersection.object,
      face: intersection.face,
      faceIndex: intersection.faceIndex,
    };
  }

  /**
   * Find nearest vertex to intersection point
   * @param {Object} intersection - Raycaster intersection result
   * @returns {Object|null} { point: THREE.Vector3, distance: number }
   */
  static findNearestVertex(intersection) {
    const object = intersection.object;

    const point = intersection.point;

    if (!object.geometry) return null;

    const geometry = object.geometry;

    const position = geometry.attributes.position;

    if (!position) return null;

    let nearestVertex = null;

    let nearestDistance = Infinity;
    const worldMatrix = object.matrixWorld;

    const tempVertex = new THREE.Vector3();

    for (let i = 0; i < position.count; i++) {
      tempVertex.fromBufferAttribute(position, i);

      tempVertex.applyMatrix4(worldMatrix);

      const distance = point.distanceTo(tempVertex);

      if (distance < nearestDistance) {
        nearestDistance = distance;

        nearestVertex = tempVertex.clone();
      }
    }

    return nearestVertex ? { point: nearestVertex, distance: nearestDistance } : null;
  }

  /**
   * Find nearest edge to intersection point
   * @param {Object} intersection - Raycaster intersection result
   * @param {number} threshold - Snap threshold
   * @returns {Object|null} { point: THREE.Vector3, distance: number }
   */
  static findNearestEdge(intersection, threshold) {
    const object = intersection.object;

    const point = intersection.point;

    const face = intersection.face;

    if (!object.geometry || !face) return null;

    const geometry = object.geometry;

    const position = geometry.attributes.position;

    const index = geometry.index;

    if (!position) return null;

    const worldMatrix = object.matrixWorld;

    const vertices = [];
    if (index) {
      const a = index.getX(intersection.faceIndex * 3);

      const b = index.getX(intersection.faceIndex * 3 + 1);

      const c = index.getX(intersection.faceIndex * 3 + 2);

      vertices.push(
        new THREE.Vector3().fromBufferAttribute(position, a).applyMatrix4(worldMatrix),
        new THREE.Vector3().fromBufferAttribute(position, b).applyMatrix4(worldMatrix),
        new THREE.Vector3().fromBufferAttribute(position, c).applyMatrix4(worldMatrix)
      );
    } else {
      vertices.push(
        new THREE.Vector3().fromBufferAttribute(position, face.a).applyMatrix4(worldMatrix),
        new THREE.Vector3().fromBufferAttribute(position, face.b).applyMatrix4(worldMatrix),
        new THREE.Vector3().fromBufferAttribute(position, face.c).applyMatrix4(worldMatrix)
      );
    }
    let nearestPoint = null;

    let nearestDistance = Infinity;

    const edges = [
      [vertices[0], vertices[1]],
      [vertices[1], vertices[2]],
      [vertices[2], vertices[0]],
    ];

    for (const [start, end] of edges) {
      const edgePoint = this.closestPointOnLine(point, start, end);

      const distance = point.distanceTo(edgePoint);

      if (distance < nearestDistance) {
        nearestDistance = distance;

        nearestPoint = edgePoint;
      }
    }

    return nearestPoint ? { point: nearestPoint, distance: nearestDistance } : null;
  }

  /**
   * Get closest point on a line segment
   * @param {THREE.Vector3} point - Point to measure from
   * @param {THREE.Vector3} lineStart - Line segment start
   * @param {THREE.Vector3} lineEnd - Line segment end
   * @returns {THREE.Vector3} Closest point on line
   */
  static closestPointOnLine(point, lineStart, lineEnd) {
    const line = new THREE.Vector3().subVectors(lineEnd, lineStart);

    const len = line.length();

    line.normalize();

    const v = new THREE.Vector3().subVectors(point, lineStart);

    let d = v.dot(line);

    d = Math.max(0, Math.min(len, d));

    return new THREE.Vector3().addVectors(lineStart, line.multiplyScalar(d));
  }

  /**
   * Get grid/plane snap point when no object intersection
   * @param {THREE.Raycaster} raycaster - Raycaster instance
   * @param {number} gridSize - Grid spacing
   * @param {number} elevation - Z elevation for plane
   * @param {boolean} snapToGrid - Whether to snap to grid or free on plane
   * @returns {Object|null} { point: THREE.Vector3, type: 'GRID'|'PLANE', object: null }
   */
  static getGridSnapPoint(raycaster, gridSize = 1, elevation = 0, snapToGrid = true) {
    
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -elevation);

    const intersectPoint = new THREE.Vector3();

    if (raycaster.ray.intersectPlane(plane, intersectPoint)) {
      if (snapToGrid) {
        
        intersectPoint.x = Math.round(intersectPoint.x / gridSize) * gridSize;

        intersectPoint.y = Math.round(intersectPoint.y / gridSize) * gridSize;
      }

      intersectPoint.z = elevation;

      return {
        point: intersectPoint,
        type: snapToGrid ? 'GRID' : 'PLANE',
        object: null,
      };
    }

    return null;
  }
}

export default SnapTool;