import * as THREE from 'three';

/**
 * Octree Node for spatial partitioning and efficient queries
 */
class OctreeNode {
  constructor(bounds, maxObjects = 8, maxDepth = 8) {
    this.bounds = bounds; 

    this.objects = [];

    this.children = null;

    this.maxObjects = maxObjects;

    this.maxDepth = maxDepth;

    this.depth = 0;
  }

  /**
   * Insert an object into the octree
   */
  insert(object, bounds) {
    if (!this.bounds.intersectsBox(bounds)) {
      return false;
    }

    if (this.objects.length < this.maxObjects || this.depth >= this.maxDepth) {
      this.objects.push({ object, bounds });

      return true;
    }
    if (!this.children) {
      this.subdivide();
    }
    for (let child of this.children) {
      if (child.insert(object, bounds)) {
        return true;
      }
    }
    this.objects.push({ object, bounds });

    return true;
  }

  /**
   * Subdivide the node into 8 children
   */
  subdivide() {
    const center = this.bounds.getCenter(new THREE.Vector3());

    const size = this.bounds.getSize(new THREE.Vector3());

    const halfSize = size.clone().multiplyScalar(0.5);

    const quarterSize = size.clone().multiplyScalar(0.25);

    this.children = [];
    for (let x = -1; x <= 1; x += 2) {
      for (let y = -1; y <= 1; y += 2) {
        for (let z = -1; z <= 1; z += 2) {
          const offset = new THREE.Vector3(
            x * quarterSize.x,
            y * quarterSize.y,
            z * quarterSize.z
          );

          const childCenter = center.clone().add(offset);

          const childBounds = new THREE.Box3(
            childCenter.clone().sub(halfSize),
            childCenter.clone().add(halfSize)
          );

          const child = new OctreeNode(childBounds, this.maxObjects, this.maxDepth);

          child.depth = this.depth + 1;

          this.children.push(child);
        }
      }
    }
  }

  /**
   * Query objects within a frustum
   */
  queryFrustum(frustum, result = []) {
    if (!frustum.intersectsBox(this.bounds)) {
      return result;
    }
    for (let item of this.objects) {
      if (frustum.intersectsBox(item.bounds)) {
        result.push(item.object);
      }
    }
    if (this.children) {
      for (let child of this.children) {
        child.queryFrustum(frustum, result);
      }
    }

    return result;
  }

  /**
   * Query objects within a sphere
   */
  querySphere(center, radius, result = []) {
    const sphere = new THREE.Sphere(center, radius);

    if (!sphere.intersectsBox(this.bounds)) {
      return result;
    }
    for (let item of this.objects) {
      if (sphere.intersectsBox(item.bounds)) {
        result.push(item.object);
      }
    }
    if (this.children) {
      for (let child of this.children) {
        child.querySphere(center, radius, result);
      }
    }

    return result;
  }

  /**
   * Get all objects in the tree
   */
  getAllObjects(result = []) {
    result.push(...this.objects.map(item => item.object));

    if (this.children) {
      for (let child of this.children) {
        child.getAllObjects(result);
      }
    }

    return result;
  }

  /**
   * Clear the octree
   */
  clear() {
    this.objects = [];

    if (this.children) {
      for (let child of this.children) {
        child.clear();
      }

      this.children = null;
    }
  }

  /**
   * Get statistics about the octree
   */
  getStats() {
    let totalObjects = this.objects.length;

    let totalNodes = 1;

    let maxDepth = this.depth;

    if (this.children) {
      for (let child of this.children) {
        const childStats = child.getStats();

        totalObjects += childStats.totalObjects;

        totalNodes += childStats.totalNodes;

        maxDepth = Math.max(maxDepth, childStats.maxDepth);
      }
    }

    return {
      totalObjects,
      totalNodes,
      maxDepth,
      avgObjectsPerNode: totalObjects / totalNodes
    };
  }
}

/**
 * Spatial Octree for IFC geometry management
 */
export class SpatialOctree {
  constructor(bounds, maxObjects = 8, maxDepth = 8) {
    this.root = new OctreeNode(bounds, maxObjects, maxDepth);

    this.objectMap = new Map(); 
  }

  /**
   * Insert an IFC object with its bounding box
   */
  insert(ifcObject, bounds) {
    if (this.root.insert(ifcObject, bounds)) {
      this.objectMap.set(ifcObject, this.root);

      return true;
    }

    return false;
  }

  /**
   * Remove an object from the octree
   */
  remove(ifcObject) {
    this.objectMap.delete(ifcObject);

    return true;
  }

  /**
   * Query objects visible in camera frustum
   */
  queryFrustum(camera) {
    const frustum = new THREE.Frustum();

    const matrix = new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );

    frustum.setFromProjectionMatrix(matrix);

    return this.root.queryFrustum(frustum);
  }

  /**
   * Query objects within a radius of a point
   */
  queryRadius(center, radius) {
    return this.root.querySphere(center, radius);
  }

  /**
   * Get all objects
   */
  getAllObjects() {
    return this.root.getAllObjects();
  }

  /**
   * Clear the octree
   */
  clear() {
    this.root.clear();

    this.objectMap.clear();
  }

  /**
   * Get statistics
   */
  getStats() {
    return this.root.getStats();
  }

  /**
   * Rebuild the octree (useful after many insertions/removals)
   */
  rebuild(objects) {
    this.clear();
    let min = new THREE.Vector3(Infinity, Infinity, Infinity);

    let max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);

    for (let obj of objects) {
      const bounds = this.calculateBounds(obj);

      min.min(bounds.min);

      max.max(bounds.max);
    }

    const newBounds = new THREE.Box3(min, max);

    this.root = new OctreeNode(newBounds, this.root.maxObjects, this.root.maxDepth);
    for (let obj of objects) {
      const bounds = this.calculateBounds(obj);

      this.insert(obj, bounds);
    }
  }

  /**
   * Calculate bounding box for an IFC object
   */
  calculateBounds(ifcObject) {
    const bounds = new THREE.Box3();

    if (ifcObject.geometry) {
      bounds.setFromObject(ifcObject);
    } else if (ifcObject.children) {
      
      for (let child of ifcObject.children) {
        const childBounds = this.calculateBounds(child);

        bounds.union(childBounds);
      }
    }

    return bounds;
  }
}