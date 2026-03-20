import dataStore from "../../data/index.js";

import * as THREE from "three";

import InteractiveObject, { makeInteractive } from "./animate/InteractiveObject.js";

class PlacementTool {

  /**
   * Smoothly move camera to position (delegates to editor for proper render integration)
   * @param {Object} context - The AECO context
   * @param {Object} position - Target position {x, y, z}
   * @param {Object} options - Animation options (duration, lookAt, offset, onComplete)
   */
  static moveCameraToPosition(context, position, options = {}) {
    
    const transformedPosition = {
      x: position.x,
      y: -position.y,
      z: position.z
    };

    context.editor.moveCameraToPosition(transformedPosition, options);
  }

  /**
   * Rotates an object around a specified axis by a given angle in degrees
   * @param {Object} context - The AECO context (not used, for consistency)
   * @param {THREE.Object3D} object - The object to rotate
   * @param {string} axis - The axis to rotate around ('x', 'y', or 'z')
   * @param {number} degrees - The rotation angle in degrees
   * @returns {THREE.Object3D} The rotated object (for chaining)
   */
  static rotate(context, object, axis, degrees) {
     if ( ! object ) return;

    object.isInteractiveObject? object = object.object : null;

    const radians = THREE.MathUtils.degToRad(degrees);
    
    switch (axis.toLowerCase()) {
      case 'x':
        object.rotateX(radians);

        break;

      case 'y':
        object.rotateZ(radians);

        break;

      case 'z':
        object.rotateY(-radians);

        break;

      default:
        console.warn(`ModelTool.rotate: Invalid axis "${axis}". Use 'x', 'y', or 'z'.`);
    }
    
    return object;
  }

  static setPosition(context, object, position) {
    if ( ! object ) return;

    object.isInteractiveObject? object = object.object : null;

    object.position.set(position.x, position.z, -position.y);

    return object;
  }

  /**
   * Sets the absolute rotation of an object on a specified axis in degrees
   * @param {Object} context - The AECO context (not used, for consistency)
   * @param {THREE.Object3D} object - The object to rotate
   * @param {string} axis - The axis to set rotation for ('x', 'y', or 'z')
   * @param {number} degrees - The rotation angle in degrees
   * @returns {THREE.Object3D} The rotated object (for chaining)
   */
  static setRotation(context, object, axis, degrees) {
    const radians = THREE.MathUtils.degToRad(degrees);
    
    switch (axis.toLowerCase()) {
      case 'x':
        object.rotation.x = radians;

        break;

      case 'y':
        object.rotation.z = radians;

        break;

      case 'z':
        object.rotation.y = -radians;

        break;

      default:
        console.warn(`ModelTool.setRotation: Invalid axis "${axis}". Use 'x', 'y', or 'z'.`);
    }
    
    return object;
  }

}

export default PlacementTool;
