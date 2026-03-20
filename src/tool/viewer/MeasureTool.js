import * as THREE from 'three';

import SnapTool from './SnapTool.js';

/**
 * MeasureTool - Stateless utility class for measurement operations
 * 
 * All methods are static and pure - they take explicit dependencies and return results.
 * State is managed externally via DataStore (MeasurementCollection) and Context signals.
 * 
 * Features:
 * - Point-to-point distance measurement
 * - Angle measurement (3 points)
 * - Area measurement (polygon)
 * - Perpendicular distance measurement
 * - Vertex/Edge/Face/Grid snapping utilities
 */
class MeasureTool {
  static DEFAULT_OPTIONS = {
    lineColor: 0x00ff88,
    pointColor: 0xff6600,
    labelColor: '#ffffff',
    snapIndicatorColor: 0xffff00,
    snapThreshold: 0.5,
  };
  /**
   * Create a snap indicator mesh
   * @param {Object} options - Visual options
   * @returns {Object} { indicator: THREE.Mesh, ring: THREE.Mesh }
   */
  static createSnapIndicator(options = {}) {
    return SnapTool.createSnapIndicator(options);
  }

  /**
   * Update snap indicator position and visibility
   * @param {THREE.Mesh} indicator - Snap indicator mesh
   * @param {THREE.Mesh} ring - Snap ring mesh
   * @param {THREE.Vector3|null} point - Snap point or null to hide
   * @param {THREE.Camera} camera - Camera for orientation
   */
  static updateSnapIndicator(indicator, ring, point, camera) {
    return SnapTool.updateSnapIndicator(indicator, ring, point, camera);
  }

  /**
   * Get snap point from mouse position
   * @param {Object} params - Parameters
   * @param {THREE.Raycaster} params.raycaster - Raycaster instance
   * @param {THREE.Vector2} params.mouse - Normalized mouse coordinates
   * @param {THREE.Camera} params.camera - Camera
   * @param {THREE.Scene} params.scene - Scene to intersect
   * @param {Object} params.snapOptions - Snap configuration
   * @returns {Object|null} { point: THREE.Vector3, type: string, object: THREE.Object3D, face, faceIndex }
   */
  static getSnapPoint(params) {
    return SnapTool.getSnapPoint(params);
  }

  /**
   * Find nearest vertex to intersection point
   * @param {Object} intersection - Raycaster intersection result
   * @returns {Object|null} { point: THREE.Vector3, distance: number }
   */
  static findNearestVertex(intersection) {
    return SnapTool.findNearestVertex(intersection);
  }

  /**
   * Find nearest edge to intersection point
   * @param {Object} intersection - Raycaster intersection result
   * @param {number} threshold - Snap threshold
   * @returns {Object|null} { point: THREE.Vector3, distance: number }
   */
  static findNearestEdge(intersection, threshold) {
    return SnapTool.findNearestEdge(intersection, threshold);
  }
  /**
   * Get closest point on a line segment
   * @param {THREE.Vector3} point - Point to measure from
   * @param {THREE.Vector3} lineStart - Line segment start
   * @param {THREE.Vector3} lineEnd - Line segment end
   * @returns {THREE.Vector3} Closest point on line
   */
  static closestPointOnLine(point, lineStart, lineEnd) {
    return SnapTool.closestPointOnLine(point, lineStart, lineEnd);
  }

  /**
   * Get grid snap point when no object intersection
   * @param {THREE.Raycaster} raycaster - Raycaster instance
   * @param {number} gridSize - Grid spacing
   * @returns {Object|null} { point: THREE.Vector3, type: 'GRID', object: null }
   */
  static getGridSnapPoint(raycaster, gridSize = 1) {
    return SnapTool.getGridSnapPoint(raycaster, gridSize);
  }
  /**
   * Create a distance measurement
   * @param {Object} params - Parameters
   * @param {THREE.Vector3} params.start - Start point
   * @param {THREE.Vector3} params.end - End point
   * @param {Object} params.options - Visual options
   * @returns {Object} { id, type, value, unit, start, end, threeObject }
   */
  static createDistanceMeasurement({ start, end, options = {} }) {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    const group = new THREE.Group();

    group.userData.measurementType = 'DISTANCE';

    group.userData.start = start.clone();

    group.userData.end = end.clone();
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([start, end]);

    const lineMaterial = new THREE.LineBasicMaterial({
      color: opts.lineColor,
      depthTest: false,
      linewidth: 2,
    });

    const line = new THREE.Line(lineGeometry, lineMaterial);

    line.userData.isMainLine = true;

    group.add(line);
    const handleGeometry = new THREE.SphereGeometry(0.06, 16, 16);

    const handleMaterial = new THREE.MeshBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.8,
      depthTest: false,
    });

    const startHandle = new THREE.Mesh(handleGeometry, handleMaterial.clone());

    startHandle.position.copy(start);

    startHandle.userData.isDraggableHandle = true;

    startHandle.userData.handleType = 'start';

    group.add(startHandle);

    const endHandle = new THREE.Mesh(handleGeometry, handleMaterial.clone());

    endHandle.position.copy(end);

    endHandle.userData.isDraggableHandle = true;

    endHandle.userData.handleType = 'end';

    group.add(endHandle);
    const capGeometry = new THREE.SphereGeometry(0.02, 8, 8);

    const capMaterial = new THREE.MeshBasicMaterial({
      color: opts.pointColor,
      depthTest: false,
    });

    const startCap = new THREE.Mesh(capGeometry, capMaterial);

    startCap.position.copy(start);

    group.add(startCap);

    const endCap = new THREE.Mesh(capGeometry, capMaterial);

    endCap.position.copy(end);

    group.add(endCap);
    const distance = start.distanceTo(end);

    group.userData.value = distance;

    group.userData.unit = 'm';
    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

    const label = this.createLabel(`${distance.toFixed(3)} m`, midPoint, opts.labelColor);

    group.add(label);
    this.addDimensionEndCaps(group, start, end, opts.lineColor);

    return {
      id: THREE.MathUtils.generateUUID(),
      type: 'DISTANCE',
      value: distance,
      unit: 'm',
      start: start.clone(),
      end: end.clone(),
      threeObject: group,
    };
  }

  /**
   * Create an angle measurement
   * @param {Object} params - Parameters
   * @param {THREE.Vector3} params.point1 - First point
   * @param {THREE.Vector3} params.vertex - Vertex (angle origin)
   * @param {THREE.Vector3} params.point3 - Third point
   * @param {Object} params.options - Visual options
   * @returns {Object} { id, type, value, unit, vertex, point1, point3, threeObject }
   */
  static createAngleMeasurement({ point1, vertex, point3, options = {} }) {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    const group = new THREE.Group();

    group.userData.measurementType = 'ANGLE';
    const v1 = new THREE.Vector3().subVectors(point1, vertex).normalize();

    const v2 = new THREE.Vector3().subVectors(point3, vertex).normalize();

    const angle = Math.acos(Math.max(-1, Math.min(1, v1.dot(v2))));

    const angleDeg = THREE.MathUtils.radToDeg(angle);

    group.userData.value = angleDeg;

    group.userData.unit = '°';
    const lineGeometry1 = new THREE.BufferGeometry().setFromPoints([vertex, point1]);

    const lineGeometry2 = new THREE.BufferGeometry().setFromPoints([vertex, point3]);

    const lineMaterial = new THREE.LineBasicMaterial({
      color: opts.lineColor,
      depthTest: false,
    });

    group.add(new THREE.Line(lineGeometry1, lineMaterial));

    group.add(new THREE.Line(lineGeometry2, lineMaterial));
    const arcRadius = Math.min(
      0.3,
      vertex.distanceTo(point1) * 0.3,
      vertex.distanceTo(point3) * 0.3
    );

    const arc = this.createAngleArc(vertex, v1, v2, arcRadius, angle, opts.lineColor);

    group.add(arc);
    const labelPos = new THREE.Vector3()
      .addVectors(v1, v2)
      .normalize()
      .multiplyScalar(arcRadius * 1.5)
      .add(vertex);

    const label = this.createLabel(`${angleDeg.toFixed(1)}°`, labelPos, opts.labelColor);

    group.add(label);

    return {
      id: THREE.MathUtils.generateUUID(),
      type: 'ANGLE',
      value: angleDeg,
      unit: '°',
      vertex: vertex.clone(),
      point1: point1.clone(),
      point3: point3.clone(),
      threeObject: group,
    };
  }

  /**
   * Create an area measurement
   * @param {Object} params - Parameters
   * @param {THREE.Vector3[]} params.points - Polygon points
   * @param {Object} params.options - Visual options
   * @returns {Object} { id, type, value, unit, points, threeObject }
   */
  static createAreaMeasurement({ points, options = {} }) {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    const group = new THREE.Group();

    group.userData.measurementType = 'AREA';
    const outlinePoints = [...points, points[0]];

    const lineGeometry = new THREE.BufferGeometry().setFromPoints(outlinePoints);

    const lineMaterial = new THREE.LineBasicMaterial({
      color: opts.lineColor,
      depthTest: false,
    });

    group.add(new THREE.Line(lineGeometry, lineMaterial));
    const shape = new THREE.Shape();

    shape.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i].x, points[i].y);
    }

    shape.closePath();

    const shapeGeometry = new THREE.ShapeGeometry(shape);

    const shapeMaterial = new THREE.MeshBasicMaterial({
      color: opts.lineColor,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthTest: false,
    });

    const shapeMesh = new THREE.Mesh(shapeGeometry, shapeMaterial);

    shapeMesh.position.z = points[0].z || 0;

    group.add(shapeMesh);
    const area = this.calculatePolygonArea(points);

    group.userData.value = area;

    group.userData.unit = 'm²';
    const centroid = this.calculateCentroid(points);

    const label = this.createLabel(`${area.toFixed(3)} m²`, centroid, opts.labelColor);

    group.add(label);

    return {
      id: THREE.MathUtils.generateUUID(),
      type: 'AREA',
      value: area,
      unit: 'm²',
      points: points.map(p => p.clone()),
      threeObject: group,
    };
  }

  /**
   * Create perpendicular distance measurement
   * @param {Object} params - Parameters
   * @param {THREE.Vector3} params.lineStart - Line segment start
   * @param {THREE.Vector3} params.lineEnd - Line segment end
   * @param {THREE.Vector3} params.point - Point to measure from
   * @param {Object} params.options - Visual options
   * @returns {Object} { id, type, value, unit, point, perpPoint, threeObject }
   */
  static createPerpendicularMeasurement({ lineStart, lineEnd, point, options = {} }) {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    const group = new THREE.Group();

    group.userData.measurementType = 'PERPENDICULAR';
    const perpPoint = this.closestPointOnLine(point, lineStart, lineEnd);

    const distance = point.distanceTo(perpPoint);

    group.userData.value = distance;

    group.userData.unit = 'm';
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([lineStart, lineEnd]);

    const lineMaterial = new THREE.LineDashedMaterial({
      color: 0x888888,
      dashSize: 0.1,
      gapSize: 0.05,
      depthTest: false,
    });

    const refLine = new THREE.Line(lineGeometry, lineMaterial);

    refLine.computeLineDistances();

    group.add(refLine);
    const perpGeometry = new THREE.BufferGeometry().setFromPoints([point, perpPoint]);

    const perpMaterial = new THREE.LineBasicMaterial({
      color: opts.lineColor,
      depthTest: false,
    });

    group.add(new THREE.Line(perpGeometry, perpMaterial));
    const indicator = this.createRightAngleIndicator(perpPoint, lineStart, lineEnd, point, opts.lineColor);

    group.add(indicator);
    const midPoint = new THREE.Vector3().addVectors(point, perpPoint).multiplyScalar(0.5);

    const label = this.createLabel(`${distance.toFixed(3)} m`, midPoint, opts.labelColor);

    group.add(label);

    return {
      id: THREE.MathUtils.generateUUID(),
      type: 'PERPENDICULAR',
      value: distance,
      unit: 'm',
      point: point.clone(),
      perpPoint: perpPoint.clone(),
      lineStart: lineStart.clone(),
      lineEnd: lineEnd.clone(),
      threeObject: group,
    };
  }
  /**
   * Create a point marker
   * @param {THREE.Vector3} position - Marker position
   * @param {THREE.Camera} camera - Camera for scaling
   * @param {Object} options - Visual options
   * @returns {THREE.Mesh} Point marker mesh
   */
  static createPointMarker(position, camera, options = {}) {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    const geometry = new THREE.SphereGeometry(0.03, 16, 16);

    const material = new THREE.MeshBasicMaterial({
      color: opts.pointColor,
      depthTest: false,
    });

    const marker = new THREE.Mesh(geometry, material);

    marker.position.copy(position);

    marker.userData.isMeasurePoint = true;
    const distance = camera.position.distanceTo(position);

    const scale = Math.max(0.5, distance * 0.015);

    marker.scale.setScalar(scale);

    return marker;
  }

  /**
   * Create a temporary measurement line
   * @param {THREE.Vector3} start - Start point
   * @param {THREE.Vector3} end - End point
   * @param {Object} options - Visual options
   * @returns {THREE.Line} Dashed line mesh
   */
  static createTempLine(start, end, options = {}) {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);

    const material = new THREE.LineDashedMaterial({
      color: opts.lineColor,
      dashSize: 0.1,
      gapSize: 0.05,
      depthTest: false,
    });

    const line = new THREE.Line(geometry, material);

    line.computeLineDistances();

    return line;
  }

  /**
   * Create a text label sprite
   * @param {string} text - Label text
   * @param {THREE.Vector3} position - Label position
   * @param {string} color - Text color (CSS color)
   * @returns {THREE.Sprite} Label sprite
   */
  static createLabel(text, position, color = '#ffffff') {
    const canvas = document.createElement('canvas');

    const context = canvas.getContext('2d');

    canvas.width = 256;

    canvas.height = 64;
    context.fillStyle = 'rgba(0, 0, 0, 0.7)';

    context.roundRect(0, 0, canvas.width, canvas.height, 8);

    context.fill();
    context.fillStyle = color;

    context.font = 'bold 32px Arial';

    context.textAlign = 'center';

    context.textBaseline = 'middle';

    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);

    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });

    const sprite = new THREE.Sprite(material);

    sprite.position.copy(position);

    sprite.scale.set(1, 0.25, 1);

    return sprite;
  }

  /**
   * Update label text on a sprite
   * @param {THREE.Sprite} sprite - Label sprite
   * @param {string} text - New text
   * @param {string} color - Text color
   */
  static updateLabelText(sprite, text, color = '#ffffff') {
    const canvas = document.createElement('canvas');

    const context = canvas.getContext('2d');

    canvas.width = 256;

    canvas.height = 64;

    context.fillStyle = 'rgba(0, 0, 0, 0.7)';

    context.fillRect(0, 0, canvas.width, canvas.height);

    context.font = 'bold 24px Arial';

    context.fillStyle = color;

    context.textAlign = 'center';

    context.textBaseline = 'middle';

    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);

    if (sprite.material.map) {
      sprite.material.map.dispose();
    }

    sprite.material.map = texture;

    sprite.material.needsUpdate = true;
  }

  /**
   * Add dimension-style end caps to a group
   * @param {THREE.Group} group - Parent group
   * @param {THREE.Vector3} start - Start point
   * @param {THREE.Vector3} end - End point
   * @param {number} color - Line color
   */
  static addDimensionEndCaps(group, start, end, color) {
    const direction = new THREE.Vector3().subVectors(end, start).normalize();

    const perpendicular = new THREE.Vector3(-direction.y, direction.x, 0).normalize();

    if (perpendicular.length() < 0.001) {
      perpendicular.set(1, 0, 0);
    }

    const capLength = 0.1;

    const points1 = [
      new THREE.Vector3().addVectors(start, perpendicular.clone().multiplyScalar(capLength)),
      new THREE.Vector3().addVectors(start, perpendicular.clone().multiplyScalar(-capLength)),
    ];

    const points2 = [
      new THREE.Vector3().addVectors(end, perpendicular.clone().multiplyScalar(capLength)),
      new THREE.Vector3().addVectors(end, perpendicular.clone().multiplyScalar(-capLength)),
    ];

    const geometry1 = new THREE.BufferGeometry().setFromPoints(points1);

    const geometry2 = new THREE.BufferGeometry().setFromPoints(points2);

    const material = new THREE.LineBasicMaterial({
      color: color,
      depthTest: false,
    });

    group.add(new THREE.Line(geometry1, material));

    group.add(new THREE.Line(geometry2, material));
  }

  /**
   * Create an arc for angle visualization
   * @param {THREE.Vector3} center - Arc center
   * @param {THREE.Vector3} v1 - First direction vector
   * @param {THREE.Vector3} v2 - Second direction vector
   * @param {number} radius - Arc radius
   * @param {number} angle - Angle in radians
   * @param {number} color - Line color
   * @returns {THREE.Line} Arc line
   */
  static createAngleArc(center, v1, v2, radius, angle, color) {
    const segments = Math.max(8, Math.ceil(angle * 20));

    const points = [];

    const quaternion = new THREE.Quaternion();

    const axis = new THREE.Vector3().crossVectors(v1, v2).normalize();

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;

      quaternion.setFromAxisAngle(axis, angle * t);

      const point = v1.clone().applyQuaternion(quaternion).multiplyScalar(radius).add(center);

      points.push(point);
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const material = new THREE.LineBasicMaterial({
      color: color,
      depthTest: false,
    });

    return new THREE.Line(geometry, material);
  }

  /**
   * Create right angle indicator
   * @param {THREE.Vector3} corner - Corner point
   * @param {THREE.Vector3} lineStart - Line start
   * @param {THREE.Vector3} lineEnd - Line end
   * @param {THREE.Vector3} point - External point
   * @param {number} color - Line color
   * @returns {THREE.Line} Right angle indicator
   */
  static createRightAngleIndicator(corner, lineStart, lineEnd, point, color) {
    const size = 0.1;

    const lineDir = new THREE.Vector3().subVectors(lineEnd, lineStart).normalize();

    const perpDir = new THREE.Vector3().subVectors(point, corner).normalize();

    const p1 = new THREE.Vector3().addVectors(corner, lineDir.clone().multiplyScalar(size));

    const p2 = new THREE.Vector3().addVectors(p1, perpDir.clone().multiplyScalar(size));

    const p3 = new THREE.Vector3().addVectors(corner, perpDir.clone().multiplyScalar(size));

    const points = [p1, p2, p3];

    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const material = new THREE.LineBasicMaterial({
      color: color,
      depthTest: false,
    });

    return new THREE.Line(geometry, material);
  }

  /**
   * Create area preview line (dashed polygon outline)
   * @param {THREE.Vector3[]} points - Polygon points
   * @param {Object} options - Visual options
   * @returns {THREE.Line} Dashed polygon outline
   */
  static createAreaPreview(points, options = {}) {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    if (points.length < 3) return null;

    const outlinePoints = [...points, points[0]];

    const lineGeometry = new THREE.BufferGeometry().setFromPoints(outlinePoints);

    const lineMaterial = new THREE.LineDashedMaterial({
      color: opts.lineColor,
      dashSize: 0.1,
      gapSize: 0.05,
      depthTest: false,
    });

    const line = new THREE.Line(lineGeometry, lineMaterial);

    line.computeLineDistances();

    return line;
  }
  static calculatePolygonArea(points) {
    if (points.length < 3) return 0;

    const n = points.length;

    const v1 = new THREE.Vector3().subVectors(points[1], points[0]);

    const v2 = new THREE.Vector3().subVectors(points[2], points[0]);

    const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();

    if (normal.length() === 0) {
      let area = 0;

      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;

        area += points[i].x * points[j].y - points[j].x * points[i].y;
      }

      return Math.abs(area) / 2;
    }

    const total = new THREE.Vector3();

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;

      const cross = new THREE.Vector3().crossVectors(points[i], points[j]);

      total.add(cross);
    }

    return Math.abs(total.dot(normal)) / 2;
  }

  /**
   * Calculate centroid of polygon
   * @param {THREE.Vector3[]} points - Polygon vertices
   * @returns {THREE.Vector3} Centroid point
   */
  static calculateCentroid(points) {
    const centroid = new THREE.Vector3();

    for (const point of points) {
      centroid.add(point);
    }

    centroid.divideScalar(points.length);

    return centroid;
  }

  /**
   * Calculate distance between two points
   * @param {THREE.Vector3} start - Start point
   * @param {THREE.Vector3} end - End point
   * @returns {number} Distance
   */
  static calculateDistance(start, end) {
    return start.distanceTo(end);
  }

  /**
   * Calculate angle between three points
   * @param {THREE.Vector3} point1 - First point
   * @param {THREE.Vector3} vertex - Vertex (angle origin)
   * @param {THREE.Vector3} point3 - Third point
   * @returns {number} Angle in degrees
   */
  static calculateAngle(point1, vertex, point3) {
    const v1 = new THREE.Vector3().subVectors(point1, vertex).normalize();

    const v2 = new THREE.Vector3().subVectors(point3, vertex).normalize();

    const angle = Math.acos(Math.max(-1, Math.min(1, v1.dot(v2))));

    return THREE.MathUtils.radToDeg(angle);
  }
  /**
   * Add measurement object to a scene/group
   * @param {THREE.Group} group - Parent group to add to
   * @param {Object} measurement - Measurement result from create* methods
   */
  static addToGroup(group, measurement) {
    if (measurement && measurement.threeObject) {
      group.add(measurement.threeObject);
    }
  }

  /**
   * Remove measurement object from its parent
   * @param {Object} measurement - Measurement with threeObject
   */
  static removeFromParent(measurement) {
    if (measurement && measurement.threeObject && measurement.threeObject.parent) {
      measurement.threeObject.parent.remove(measurement.threeObject);
    }
  }

  /**
   * Dispose of a measurement's Three.js resources
   * @param {Object} measurement - Measurement to dispose
   */
  static disposeMeasurement(measurement) {
    if (!measurement || !measurement.threeObject) return;

    measurement.threeObject.traverse((child) => {
      if (child.geometry) {
        child.geometry.dispose();
      }

      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }

  /**
   * Dispose of a group of measurements
   * @param {Object[]} measurements - Array of measurements
   * @param {THREE.Group} parentGroup - Parent group to remove from
   */
  static disposeAllMeasurements(measurements, parentGroup) {
    for (const measurement of measurements) {
      if (measurement.threeObject) {
        if (parentGroup) {
          parentGroup.remove(measurement.threeObject);
        }

        this.disposeMeasurement(measurement);
      }
    }
  }

  /**
   * Clear all children from a group except specified objects
   * @param {THREE.Group} group - Group to clear
   * @param {THREE.Object3D[]} exclude - Objects to exclude from removal
   */
  static clearGroup(group, exclude = []) {
    const childrenToRemove = [];

    group.children.forEach(child => {
      if (!exclude.includes(child)) {
        childrenToRemove.push(child);
      }
    });

    childrenToRemove.forEach(child => {
      group.remove(child);

      if (child.traverse) {
        child.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();

          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach(m => m.dispose());
            } else {
              obj.material.dispose();
            }
          }
        });
      }
    });
  }
  /**
   * Update distance measurement after handle drag
   * @param {Object} measurement - Distance measurement
   * @param {string} handleType - 'start' or 'end'
   * @param {THREE.Vector3} newPosition - New handle position
   * @param {Object} options - Visual options
   * @returns {Object} Updated measurement
   */
  static updateDistanceMeasurement(measurement, handleType, newPosition, options = {}) {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    if (handleType === 'start') {
      measurement.start.copy(newPosition);
    } else if (handleType === 'end') {
      measurement.end.copy(newPosition);
    }

    const group = measurement.threeObject;

    if (!group) return measurement;

    const start = measurement.start;

    const end = measurement.end;
    group.traverse((child) => {
      if (child.isLine && child.geometry) {
        const positions = child.geometry.attributes.position;

        if (positions && positions.count === 2) {
          positions.setXYZ(0, start.x, start.y, start.z);

          positions.setXYZ(1, end.x, end.y, end.z);

          positions.needsUpdate = true;
        }
      }
    });
    const distance = start.distanceTo(end);

    measurement.value = distance;

    group.userData.value = distance;
    group.traverse((child) => {
      if (child.isSprite) {
        const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

        child.position.copy(midPoint);

        this.updateLabelText(child, `${distance.toFixed(3)} m`, opts.labelColor);
      }
    });

    return measurement;
  }

  /**
   * Check for intersection with measurement handles
   * @param {THREE.Raycaster} raycaster - Raycaster
   * @param {THREE.Vector2} mouse - Mouse position
   * @param {THREE.Camera} camera - Camera
   * @param {Object[]} measurements - Array of measurements
   * @returns {Object|null} { handle, measurement } or null
   */
  static checkHandleIntersection(raycaster, mouse, camera, measurements) {
    raycaster.setFromCamera(mouse, camera);
    const handles = [];

    for (const measurement of measurements) {
      if (measurement.threeObject) {
        measurement.threeObject.traverse((child) => {
          if (child.userData.isDraggableHandle) {
            child.userData.measurement = measurement;

            handles.push(child);
          }
        });
      }
    }

    if (handles.length === 0) return null;

    const intersects = raycaster.intersectObjects(handles, false);

    if (intersects.length > 0) {
      const handle = intersects[0].object;

      return {
        handle,
        measurement: handle.userData.measurement,
      };
    }

    return null;
  }
  /**
   * Export measurements as JSON
   * @param {Object[]} measurements - Array of measurements
   * @returns {string} JSON string
   */
  static exportMeasurements(measurements) {
    return JSON.stringify(measurements.map(m => ({
      id: m.id,
      type: m.type,
      value: m.value,
      unit: m.unit,
      points: m.start ? { start: m.start.toArray(), end: m.end.toArray() } :
              m.vertex ? { vertex: m.vertex.toArray(), point1: m.point1.toArray(), point3: m.point3.toArray() } :
              m.points ? { points: m.points.map(p => p.toArray()) } :
              { point: m.point?.toArray(), perpPoint: m.perpPoint?.toArray() },
    })), null, 2);
  }

  /**
   * Get summary of measurements (for UI display)
   * @param {Object[]} measurements - Array of measurements
   * @returns {Object[]} Array of { id, type, value, unit }
   */
  static getMeasurementsSummary(measurements) {
    return measurements.map(m => ({
      id: m.id,
      type: m.type,
      value: m.value,
      unit: m.unit,
    }));
  }
}

export default MeasureTool;
