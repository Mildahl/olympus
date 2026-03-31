class NavigationTool {
  static findFirstObjectInScene(scene, predicate) {
    let resolvedObject = null;

    if (!scene || typeof predicate !== "function") {
      return resolvedObject;
    }

    scene.traverse((object) => {
      if (!resolvedObject && predicate(object)) {
        resolvedObject = object;
      }
    });

    return resolvedObject;
  }

  static findDefaultVehicleInScene(scene) {
    return NavigationTool.findFirstObjectInScene(scene, (object) => {
      if (object.name === "Truck") {
        return true;
      }

      const userData = object.userData;

      return userData && userData.type === "Vehicle";
    });
  }

  static findDefaultFlyingObjectInScene(scene) {
    return NavigationTool.findFirstObjectInScene(scene, (object) => {
      if (object.name === "Drone") {
        return true;
      }

      const userData = object.userData;

      return userData && userData.type === "FlyingVehicle";
    });
  }
}

export default NavigationTool;
