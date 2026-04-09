import context from '../../context/index.js';

class NavigationTool {
  static findFirstObjectInScene(predicate) {
    let resolvedObject = null;

    context.editor.scene.traverse((object) => {
      if (!resolvedObject && predicate(object)) {
        resolvedObject = object;
      }
    });

    return resolvedObject;
  }

  static findDefaultVehicleInScene() {
    return NavigationTool.findFirstObjectInScene((object) => {
      if (object.name === "Truck") {
        return true;
      }

      const userData = object.userData;

      return userData && userData.type === "Vehicle";
    });
  }

  static findDefaultFlyingObjectInScene() {
    return NavigationTool.findFirstObjectInScene((object) => {
      if (object.name === "Drone") {
        return true;
      }

      const userData = object.userData;

      return userData && userData.type === "FlyingVehicle";
    });
  }
}

export default NavigationTool;
