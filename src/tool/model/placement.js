import { MathUtils, Object3D } from 'three'; 

import context from '../../context/index.js';

class PlacementTool {

  /**
   * Smoothly move camera to position (delegates to editor for proper render integration)
   * @param {Object} position - Target position {x, y, z}
   * @param {Object} options - Animation options (duration, lookAt, offset, onComplete)
   */
  static moveCameraToPosition(position, options = {}) {
    
    const transformedPosition = {
      x: position.x,
      y: -position.y,
      z: position.z
    };

    context.editor.moveCameraToPosition(transformedPosition, options);
  }

  /**
   * Rotates an object around a specified axis by a given angle in degrees
   * @param {Object3D} object - The object to rotate
   * @param {string} axis - The axis to rotate around ('x', 'y', or 'z')
   * @param {number} degrees - The rotation angle in degrees
   * @returns {Object3D} The rotated object (for chaining)
   */
  static rotate(object, axis, degrees) {
     if ( ! object ) return;

    const radians = MathUtils.degToRad(degrees);
    
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

  /**
   * Sets the absolute position of an object, converting from (x, y, z) to (x, -y, z)
   * @param {Object3D} object - The object to position
   * @param {Object} position - The target position {x, y, z}
   * @returns {Object3D} The positioned object (for chaining)
   */

  static setPosition(object, position) {
    if ( ! object ) return;

    object.position.set(position.x, position.z, -position.y);

    return object;
  }

  /**
   * Sets the absolute rotation of an object on a specified axis in degrees
   * @param {Object3D} object - The object to rotate
   * @param {string} axis - The axis to set rotation for ('x', 'y', or 'z')
   * @param {number} degrees - The rotation angle in degrees
   * @returns {Object3D} The rotated object (for chaining)
   */
  static setRotation(object, axis, degrees) {
    const radians = MathUtils.degToRad(degrees);
    
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
