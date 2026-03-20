import * as THREE from "three";
export class CoordinateSystemHelper {
  static getMovementAxis(constraint) {
    switch (constraint) {
      case "x":
        return new THREE.Vector3(1, 0, 0);
      case "y":
        return new THREE.Vector3(0, 1, 0);
      case "z":
        return new THREE.Vector3(0, 0, 1);
      default:
        return new THREE.Vector3(0, 0, 0);
    }
  }

  static getConstraintColor(constraint) {
    switch (constraint) {
      case "x":
        return 0xff0000;
      case "y":
        return 0x00ff00;
      case "z":
        return 0x0000ff;
      default:
        return 0xffffff;
    }
  }

  static projectToConstraint(movementVector, constraint) {
    if (!constraint) return movementVector.clone();
    const constraintAxis = this.getMovementAxis(constraint);
    const projectedLength = movementVector.dot(constraintAxis);
    return constraintAxis.clone().multiplyScalar(projectedLength);
  }

  static getAxisDescription(constraint) {
    switch (constraint) {
      case "x":
        return "Horizontal movement (left/right)";
      case "y":
        return "Horizontal movement (forward/backward)";
      case "z":
        return "Vertical movement (up/down)";
      default:
        return "No constraint";
    }
  }

  static toIFCCoordinates(position) {
    return { x: position.x, y: -position.z, z: position.y };
  }

  static transformMatrixToIFC(threeJsMatrix) {
    let e = threeJsMatrix.elements;
    return [
      e[0], e[4], e[8], e[12],
      e[1], e[5], e[9], e[13],
      e[2], e[6], e[10], e[14],
      e[3], e[7], e[11], e[15],
    ];
  }
}
