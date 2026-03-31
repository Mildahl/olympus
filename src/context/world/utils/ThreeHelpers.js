import * as THREE from "three";

export class ThreeHelpers {

  static normalizeProjectionCutAxis(axis) {
    const normalizedAxis = typeof axis === "string" ? axis.trim().toLowerCase() : "";

    if (normalizedAxis === "x" || normalizedAxis === "y" || normalizedAxis === "z") {
      return normalizedAxis;
    }

    return "z";
  }

  static getProjectionCutMetadata(axis) {
    const normalizedAxis = ThreeHelpers.normalizeProjectionCutAxis(axis);

    const projectionCutMetadataByAxis = {
      z: {
        constantAxis: "y",
        planeName: "XY",
        uiLabel: "Plan - Z (XY)",
        positionAxisLetter: "Y",
        normal: new THREE.Vector3(0, 1, 0),
        previewViewDirection: new THREE.Vector3(0, 1, 0),
        previewUpVector: new THREE.Vector3(0, 0, 1),
        previewRollDegrees: 180,
        indicatorSizeAxes: { width: "x", height: "z" },
        previewBoundsAxes: { horizontal: "x", vertical: "z" },
      },
      y: {
        constantAxis: "x",
        planeName: "ZY",
        uiLabel: "Section - Y (ZY)",
        positionAxisLetter: "X",
        normal: new THREE.Vector3(1, 0, 0),
        previewViewDirection: new THREE.Vector3(1, 0, 0),
        previewUpVector: new THREE.Vector3(0, 0, 1),
        previewRollDegrees: 90,
        indicatorSizeAxes: { width: "y", height: "z" },
        previewBoundsAxes: { horizontal: "y", vertical: "z" },
      },
      x: {
        constantAxis: "z",
        planeName: "ZX",
        uiLabel: "Section - X (ZX)",
        positionAxisLetter: "Z",
        normal: new THREE.Vector3(0, 0, 1),
        previewViewDirection: new THREE.Vector3(0, 0, 1),
        previewUpVector: new THREE.Vector3(0, 1, 0),
        previewRollDegrees: 0,
        indicatorSizeAxes: { width: "x", height: "y" },
        previewBoundsAxes: { horizontal: "x", vertical: "y" },
      },
    };

    const projectionCutMetadata = projectionCutMetadataByAxis[normalizedAxis];

    return {
      axis: normalizedAxis,
      constantAxis: projectionCutMetadata.constantAxis,
      planeName: projectionCutMetadata.planeName,
      uiLabel: projectionCutMetadata.uiLabel,
      positionAxisLetter: projectionCutMetadata.positionAxisLetter,
      normal: projectionCutMetadata.normal.clone(),
      previewViewDirection: projectionCutMetadata.previewViewDirection.clone(),
      previewUpVector: projectionCutMetadata.previewUpVector.clone(),
      previewRollDegrees: projectionCutMetadata.previewRollDegrees,
      indicatorSizeAxes: {
        width: projectionCutMetadata.indicatorSizeAxes.width,
        height: projectionCutMetadata.indicatorSizeAxes.height,
      },
      previewBoundsAxes: {
        horizontal: projectionCutMetadata.previewBoundsAxes.horizontal,
        vertical: projectionCutMetadata.previewBoundsAxes.vertical,
      },
    };
  }

  static applyProjectionPreviewRoll(camera, rollDegrees) {
    if (!Number.isFinite(rollDegrees) || rollDegrees === 0) return;

    const forward = new THREE.Vector3();

    camera.getWorldDirection(forward);

    const rollQuaternion = new THREE.Quaternion().setFromAxisAngle(
      forward,
      THREE.MathUtils.degToRad(rollDegrees)
    );

    camera.up.applyQuaternion(rollQuaternion);
  }

  static createCamera(container) {
    let aspect = window.innerWidth / window.innerHeight; 
  
    if (container) {
      aspect = container.clientWidth / container.clientHeight;
    }
  
    const camera = new THREE.PerspectiveCamera(65, aspect, 1, 2000);
  
    camera.up.set(0, 0, 1);
  
    return camera;
  }
  static addLights(scene) {

    const lightsGroup = new THREE.Group();

    lightsGroup.name = "Lights";

    scene.add(lightsGroup);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);

    ambientLight.name = "AmbientLight";

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);

    hemiLight.name = "HemisphereLight";

    hemiLight.position.set(0, 20, 0);

    lightsGroup.add(ambientLight, hemiLight);
  }

  static createTextLabel(text, position, color, size = 2) {
  const canvas = document.createElement("canvas");

  const context = canvas.getContext("2d");

  canvas.width = 128;

  canvas.height = 128;

  context.fillStyle = "#ffffff";

  context.font = "80px Arial";

  context.textAlign = "center";

  context.fillText(text, 64, 96);

  const texture = new THREE.Texture(canvas);

  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
	map: texture,
	transparent: true,
	depthTest: false,
	depthWrite: false,
  });

  const sprite = new THREE.Sprite(material);

  sprite.position.copy(position);

  sprite.scale.set(size, size, size);

  return sprite;
}

  static addHelpers(
    parent,
    size = 50,
    primaryGridSettings = {},
    secondaryGridSettings = {}
  ) {
    
    const gridHelpers = ThreeHelpers.addGrid(parent, primaryGridSettings, secondaryGridSettings);

    ThreeHelpers.addAxes(parent, size);

    return gridHelpers;
  }

  static addGrid(parent, primaryGridSettings = {}, secondaryGridSettings = {}) {
    parent.children.forEach((child) => {
    if (child instanceof THREE.GridHelper) {
      parent.remove(child);
    }
    });
  
    const secondaryGrid = new THREE.GridHelper(
    secondaryGridSettings.size || 1000,
    secondaryGridSettings.divisions || 10
    );
  
    const secondaryMaterial = secondaryGrid.material;
  
    secondaryMaterial.opacity = secondaryGridSettings.opacity || 0.5;
  
    secondaryMaterial.transparent = true;
  
    secondaryMaterial.depthWrite = false;
  
    secondaryMaterial.color.setHex(secondaryGridSettings.color || 0xaaaaaa);
  
    secondaryMaterial.vertexColors = false;
  
    const primaryGrid = new THREE.GridHelper(
    primaryGridSettings.size || 1000,
    primaryGridSettings.divisions || 100
    );
  
    const primaryMaterial = primaryGrid.material;
  
    primaryMaterial.opacity = primaryGridSettings.opacity || 0.15;
  
    primaryMaterial.transparent = true;
  
    primaryMaterial.depthWrite = false;
  
    primaryMaterial.color.setHex(primaryGridSettings.color || 0x555555);
  
    primaryMaterial.vertexColors = false;
  
    primaryGrid.renderOrder = 1;
    parent.add(secondaryGrid);
  
    parent.add(primaryGrid);
  
    const gridHelpers = {
    primary: primaryGrid,
    secondary: secondaryGrid,
    };
  
    return gridHelpers;
  }
  
  static addAxes(scene, size = 150) {
    scene.children.forEach((child) => {
    if (
      child instanceof THREE.AxesHelper ||
      (child instanceof THREE.Group &&
      child.children.some((c) => c instanceof THREE.AxesHelper))
    ) {
      scene.remove(child);
    }
    });
  
    const axesHelper = new THREE.AxesHelper(size);

    axesHelper.setRotationFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));

    axesHelper.name = "Axes Helper";
  
    axesHelper.material.depthTest = false;
  
    scene.add(axesHelper);
  
    const labelSize = size / 5;
  
    const color = 0xffffff;
  
    const xLabel = ThreeHelpers.createTextLabel(
    "X",
    new THREE.Vector3(size + size / 10, 0, 0),
    color,
    labelSize
    );
  
    xLabel.name = "X Axis Label";
    const yLabel = ThreeHelpers.createTextLabel(
    "Y",
    new THREE.Vector3(0, 0, - (size + size / 10)),
    color,
    labelSize
    );
  
    yLabel.name = "Y Axis Label";
    const zLabel = ThreeHelpers.createTextLabel(
    "Z",
    new THREE.Vector3(0, size + size / 10, 0),
    color,
    labelSize
    );
  
    zLabel.name = "Z Axis Label";
    const axesGroup = new THREE.Group();
  
    axesGroup.add(axesHelper, xLabel, yLabel, zLabel);
  
    axesGroup.name = "Axes";
  
    scene.add(axesGroup);
  
    return axesGroup;
  }
  static getMousePosition(event, renderer) {
    const rect = renderer.domElement.getBoundingClientRect();

    return new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
  }

  static raycast(event, renderer, camera, objectRegistry, raycaster = null) {
    const mouse = this.getMousePosition(event, renderer);

    const rc = raycaster || new THREE.Raycaster();

    rc.setFromCamera(mouse, camera);

    const meshes = objectRegistry.getAll();

    return rc.intersectObjects(meshes);
  }

  static getWallOrientation(face, object) {
    const normal = face.normal.clone();

    normal.transformDirection(object.matrixWorld);

    const wallDirection = new THREE.Vector3(-normal.y, normal.x, 0).normalize();

    return { normal, wallDirection };
  }

  static getWallRotation(normal) {
    const quaternion = new THREE.Quaternion();

    const angle = Math.atan2(normal.y, normal.x) - Math.PI / 2;

    quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle);

    return quaternion;
  }

  static disposeObject(object) {
    if (!object) {
      return;
    }

    if (object.geometry) {
      object.geometry.dispose();
    }

    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach((material) => material.dispose());
      } else {
        object.material.dispose();
      }
    }

    if (object.children) {
      object.children.forEach((child) => this.disposeObject(child));
    }

    object.parent ? object.parent.remove(object) : null;

    object = null;
  }

  static removeDuplicateVertices(vertices, tolerance = 0.001) {
    const unique = [];

    const processed = new Set();

    for (const vertex of vertices) {
      const key = `${vertex.x.toFixed(3)},${vertex.y.toFixed(
        3
      )},${vertex.z.toFixed(3)}`;

      if (!processed.has(key)) {
        processed.add(key);

        unique.push(vertex);
      }
    }

    return unique;
  }

  static validateElementParams(elementType, params) {
    const errors = [];

    switch (elementType) {
      case "wall":
        if (!params.start || !params.end) {
          errors.push("Wall requires start and end points");
        }

        if (params.start && params.end) {
          let distance;

          if (Array.isArray(params.start) && Array.isArray(params.end)) {
            const dx = params.end[0] - params.start[0];

            const dy = params.end[1] - params.start[1];

            distance = Math.sqrt(dx * dx + dy * dy);
          } else if (params.start.distanceTo && params.end.distanceTo) {
            distance = params.start.distanceTo(params.end);
          } else {
            errors.push("Invalid coordinate format for wall points");

            break;
          }

          if (distance < 0.1) {
            errors.push("Wall must be at least 0.1 units long");
          }
        }

        break;

      case "window":

      case "door":
        if (!params.position) {
          errors.push(`${elementType} requires position`);
        }

        if (!params.hostGuid) {
          errors.push(`${elementType} requires host wall GUID`);
        }

        break;

      default:
        errors.push(`Unsupported element type: ${elementType}`);
    }

    return errors;
  }

  static convertToJsObject(obj) {
    if (obj === null || typeof obj !== "object") return obj;

    if (typeof obj.toJs === "function") {
      return obj.toJs();
    }

    if (obj instanceof Map) {
      return Object.fromEntries(
        Array.from(obj.entries()).map(([k, v]) => [
          k,
          this.convertToJsObject(v),
        ])
      );
    }

    if (obj instanceof Set) {
      return Array.from(obj).map((item) => this.convertToJsObject(item));
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.convertToJsObject(item));
    } else {
      const newObj = {};

      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          newObj[key] = this.convertToJsObject(obj[key]);
        }
      }

      return newObj;
    }
  }

  static createTransformationMatrix(shapeTransformation) {
    const matrix = new THREE.Matrix4();

    const m = shapeTransformation.data().components.toJs();

    matrix.set(
      m[0][0],
      m[0][1],
      m[0][2],
      m[0][3],
      m[1][0],
      m[1][1],
      m[1][2],
      m[1][3],
      m[2][0],
      m[2][1],
      m[2][2],
      m[2][3],
      m[3][0],
      m[3][1],
      m[3][2],
      m[3][3]
    );

    return matrix;
  }

  static createEdgeLines({ geometry, meta, edgeColor = "black" }) {
    const color = new THREE.Color(edgeColor);

    const lineMaterial = new THREE.LineBasicMaterial({ color });

    const line = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      lineMaterial
    );

    return line;
  }

    static defaultControls({controls, block_movement=false}){
    
      controls.enableDamping = false;
  
      controls.minPolarAngle = 0.001;
  
      controls.maxPolarAngle = Math.PI - 0.001;
  
      controls.rotateSpeed = 0.8;
  
      controls.enableRotate = true;
  
      controls.screenSpacePanning = true;
  
      controls.zoomSpeed = 1.0;
  
      controls.mouseButtons.LEFT = undefined;
  
      if (block_movement){
        controls.enablePan = false;
  
        controls.enableZoom = false;
      } else {
        controls.enablePan = true;
  
        controls.enableZoom = true;
      }
  
      controls.mouseButtons.MIDDLE = THREE.MOUSE.ROTATE;
  
      controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
    }
}
