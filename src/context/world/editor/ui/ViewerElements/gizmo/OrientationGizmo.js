import * as THREE from "three";

const FACE_COLORS = {
  "X+": "#e3e6ea",
  "X-": "#e3e6ea",
  "Y+": "#e3e6ea",
  "Y-": "#e3e6ea",
  "Z+": "#e3e6ea",
  "Z-": "#e3e6ea",
};

const FACE_COLORS_HOVER = {
  "X+": "#c8b8b8",
  "X-": "#c8b8b8",
  "Y+": "#67cd67",
  "Y-": "#b8c8b8",
  "Z+": "#b8d8f8",
  "Z-": "#b8d8f8",
};

const EDGE_COLOR = "#29cb00";

const LABEL_COLORS = {
  "X+": "#ff0000",
  "X-": "#ff0000",
  "Y+": "#00aa00",
  "Y-": "#00aa00",
  "Z+": "#0086f7",
  "Z-": "#0086f7",
};

const LABEL_COLORS_HOVER = {
  "X+": "#ff0000",
  "X-": "#ff0000",
  "Y+": "#00aa00",
  "Y-": "#00aa00",
  "Z+": "#0000ff",
  "Z-": "#0000ff",
};

const LABEL_FONT =
  'bold 36px "Fira Mono", "Menlo", "Consolas", "Liberation Mono", monospace';

const FACE_LABELS = {
  "X+": "X",
  "X-": "-X",
  "Y+": "Y",
  "Y-": "-Y",
  "Z+": "Z",
  "Z-": "-Z",
};

const topBarHeight = 38;

class OrientationGizmo {
  constructor(camera) {
    this.camera = camera;

    this.controls = null;

    this.size = 77;

    this.margin = 0;

    this.isOrientationGizmo = true;

    this.animating = false;

    this.center = new THREE.Vector3();

    this.targetPosition = new THREE.Vector3();

    this.targetQuaternion = new THREE.Quaternion();

    this.q1 = new THREE.Quaternion();

    this.q2 = new THREE.Quaternion();

    this.dummy = new THREE.Object3D();

    this.radius = 0;

    this.turnRate = 2 * Math.PI;

    this.dom = document.createElement("div");

    this.dom.id = "OrientationGizmo";
    
    Object.assign(this.dom.style, {
      position: "absolute",
      width: `${this.size}px`,
      height: `${this.size}px`,
      pointerEvents: "auto",
      zIndex: "3",
      background: "transparent",
  
      boxShadow: "none",
      transition: "background 0.2s",
    });

    this.orientationScene = new THREE.Scene();

    const ambient = new THREE.AmbientLight(0xffffff, 1.0);

    this.orientationScene.add(ambient);

    this.orientationCamera = new THREE.PerspectiveCamera(32, 1, 0.1, 10);

    this.orientationCamera.position.set(0, 0, 3.5);

    this.orientationCamera.lookAt(0, 0, 0);

    this.gizmoRenderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });

    this.gizmoRenderer.setPixelRatio(window.devicePixelRatio);

    this.gizmoRenderer.setClearColor(0x000000, 0);

    this.gizmoRenderer.setSize(this.size, this.size);

    this.dom.appendChild(this.gizmoRenderer.domElement);

    this.faceMap = [
      { normal: new THREE.Vector3(1, 0, 0), label: "X+", dir: "posX", type: "posX" },
      { normal: new THREE.Vector3(-1, 0, 0), label: "X-", dir: "negX", type: "negX" },
      { normal: new THREE.Vector3(0, 1, 0), label: "Z+", dir: "posZ", type: "posZ" },
      { normal: new THREE.Vector3(0, -1, 0), label: "Z-", dir: "negZ", type: "negZ" },
      { normal: new THREE.Vector3(0, 0, 1), label: "Y-", dir: "negY", type: "negY" },
      { normal: new THREE.Vector3(0, 0, -1), label: "Y+", dir: "posY", type: "posY" },
    ];

    this.cube = this.createMinimalistCube();

    this.orientationScene.add(this.cube);

    this.cubeEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(this.cube.geometry),
      new THREE.LineBasicMaterial({ color: EDGE_COLOR, linewidth: 1 })
    );

    this.cube.add(this.cubeEdges);

    this.raycaster = new THREE.Raycaster();

    this.pointer = new THREE.Vector2();

    this.hoveredFace = null;

    this.cubeDefaultScale = 1.0;

    this.cubeHoverScale = 1.06;

    this.enableInteraction();

  }

  setControls(controls) {
    this.controls = controls;

    if (controls && controls.center) this.center = controls.center;
  }

  prepareAnimationData(object, focusPoint) {
    const type = object.userData.type;

    switch (type) {
      case "posX":
        this.targetPosition.set(1, 0, 0);

        this.targetQuaternion.setFromEuler(new THREE.Euler(0, Math.PI * 0.5, 0));

        break;

      case "posY":
        this.targetPosition.set(0, 1, 0);

        this.targetQuaternion.setFromEuler(new THREE.Euler(-Math.PI * 0.5, 0, 0));

        break;

      case "posZ":
        this.targetPosition.set(0, 0, 1);

        this.targetQuaternion.setFromEuler(new THREE.Euler());

        break;

      case "negX":
        this.targetPosition.set(-1, 0, 0);

        this.targetQuaternion.setFromEuler(new THREE.Euler(0, -Math.PI * 0.5, 0));

        break;

      case "negY":
        this.targetPosition.set(0, -1, 0);

        this.targetQuaternion.setFromEuler(new THREE.Euler(Math.PI * 0.5, 0, 0));

        break;

      case "negZ":
        this.targetPosition.set(0, 0, -1);

        this.targetQuaternion.setFromEuler(new THREE.Euler(0, Math.PI, 0));

        break;

      default:
        console.error("OrientationGizmo: Invalid axis.");
    }

    this.radius = this.camera.position.distanceTo(focusPoint);

    this.targetPosition.multiplyScalar(this.radius).add(focusPoint);

    this.dummy.position.copy(focusPoint);

    this.dummy.lookAt(this.camera.position);

    this.q1.copy(this.dummy.quaternion);

    this.dummy.lookAt(this.targetPosition);

    this.q2.copy(this.dummy.quaternion);
  }

  update(delta) {
    const step = delta * this.turnRate;

    this.q1.rotateTowards(this.q2, step);

    this.camera.position
      .set(0, 0, 1)
      .applyQuaternion(this.q1)
      .multiplyScalar(this.radius)
      .add(this.center);

    this.camera.quaternion.rotateTowards(this.targetQuaternion, step);

    if (this.controls) this.controls.dispatchEvent({ type: 'change' });

    if (this.q1.angleTo(this.q2) === 0) {
      this.animating = false;
    }
  }

  handleClick(event) {
    if (this.animating === true) return false;

    const picked = this.pickFace(event);

    if (picked && picked.sprite) {
      const object = picked.sprite;

      this.prepareAnimationData(object, this.center);

      this.animating = true;

      return true;
    }

    return false;
  }

  createMinimalistCube() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);

    this.faceMaterials = this.faceMap.map((face) => {
      return new THREE.MeshBasicMaterial({
        color: FACE_COLORS[face.label],
        transparent: false,
        side: THREE.FrontSide,
      });
    });

    const cube = new THREE.Mesh(geometry, this.faceMaterials);

    this.labelSprites = [];

    const labelDistance = 0.65;

    [
      { pos: [labelDistance, 0, 0], label: "X+", type: "posX" },
      { pos: [-labelDistance, 0, 0], label: "X-", type: "negX" },
      { pos: [0, labelDistance, 0], label: "Z+", type: "posZ" },
      { pos: [0, -labelDistance, 0], label: "Z-", type: "negZ" },
      { pos: [0, 0, labelDistance], label: "Y-", type: "negY" },
      { pos: [0, 0, -labelDistance], label: "Y+", type: "posY" },
    ].forEach(({ pos, label, type }) => {
      const text = FACE_LABELS[label];

      const sprite = this.createLabelSprite(text, label);

      sprite.position.set(...pos);

      sprite.userData.type = type;

      this.labelSprites.push({ sprite, label });

      cube.add(sprite);
    });

    return cube;
  }

  createLabelSprite(text, faceLabel) {
    const size = 150;

    const canvas = document.createElement("canvas");

    canvas.width = canvas.height = size;

    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, size, size);

    ctx.textRendering = "optimizeLegibility";

    ctx.imageSmoothingEnabled = true;

    ctx.imageSmoothingQuality = "high";

    ctx.font = LABEL_FONT;

    ctx.textAlign = "center";

    ctx.textBaseline = "middle";

    const color = LABEL_COLORS[faceLabel] || "#6a6d70";

    ctx.fillStyle = color;

    ctx.fillText(text, size / 2, size / 2);

    const texture = new THREE.CanvasTexture(canvas);

    texture.needsUpdate = true;

    texture.minFilter = THREE.LinearFilter;

    texture.magFilter = THREE.LinearFilter;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: true,
      depthTest: true,
      sizeAttenuation: false,
    });

    const sprite = new THREE.Sprite(material);

    sprite.scale.set(0.28, 0.28, 0.28);

    sprite.position.z = 0.01;

    sprite.userData = { faceLabel, originalColor: color };

    return sprite;
  }

  updateCubeMaterials() {
    this.faceMaterials.forEach((mat, i) => {
      const face = this.faceMap[i];

      if (this.hoveredFace === i) {
        mat.color.set(FACE_COLORS_HOVER[face.label] || "#e8e8e8");
      } else {
        mat.color.set(FACE_COLORS[face.label] || "#e3e6ea");
      }
    });
  }

  syncWithMainCamera() {
    const invQ = this.camera.quaternion.clone().invert();

    this.cube.quaternion.copy(invQ);

    this.updateLabelVisibility();
  }

  updateLabelVisibility() {
    if (!this.labelSprites) return;

    const matrix = this.cube.matrixWorld;

    const cameraDir = new THREE.Vector3(0, 0, 1);

    this.labelSprites.forEach(({ sprite, label }) => {
      const faceIndex = this.faceMap.findIndex((face) => face.label === label);

      if (faceIndex === -1) return;

      const normal = this.faceMap[faceIndex].normal.clone();

      normal.transformDirection(matrix);

      const dot = normal.dot(cameraDir);

      sprite.visible = dot > -0.2;
    });
  }

  render() {
    this.syncWithMainCamera();

    this.gizmoRenderer.render(this.orientationScene, this.orientationCamera);
  }

  pickFace(event) {
    const rect = this.gizmoRenderer.domElement.getBoundingClientRect();

    const x = event.clientX - rect.left;

    const y = event.clientY - rect.top;

    if (x < 0 || x > rect.width || y < 0 || y > rect.height) return null;

    this.pointer.x = (x / rect.width) * 2 - 1;

    this.pointer.y = -(y / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.orientationCamera);

    const sprites = this.labelSprites.map(item => item.sprite);

    const intersects = this.raycaster.intersectObjects(sprites, false);

    if (intersects.length > 0) {
      return { sprite: intersects[0].object };
    }

    const cubeIntersects = this.raycaster.intersectObject(this.cube, false);

    if (cubeIntersects.length > 0) {
      const faceIndex = Math.floor(cubeIntersects[0].faceIndex / 2);

      const face = this.faceMap[faceIndex];

      return { faceIndex, faceLabel: face.label, direction: face.dir };
    }

    return null;
  }

  enableInteraction() {
    const canvas = this.gizmoRenderer.domElement;

    canvas.style.cursor = "pointer";

    canvas.addEventListener("pointermove", (e) => {
      const picked = this.pickFace(e);

      if (picked) {
        if (picked.faceIndex !== undefined && this.hoveredFace !== picked.faceIndex) {
          this.hoveredFace = picked.faceIndex;

          this.updateCubeMaterials();
        }

        canvas.style.cursor = "pointer";
      } else {
        if (this.hoveredFace !== null) {
          this.hoveredFace = null;

          this.updateCubeMaterials();
        }

        canvas.style.cursor = "default";
      }
    });

    canvas.addEventListener("pointerleave", () => {
      this.hoveredFace = null;

      this.updateCubeMaterials();

      canvas.style.cursor = "default";
    });

    canvas.addEventListener("pointerup", (e) => {
      e.stopPropagation();

      this.handleClick(e);
    });

    canvas.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
    });
  }

  dispose() {
    if (this.gizmoRenderer) this.gizmoRenderer.dispose();

    if (this.dom && this.dom.parentNode)
      this.dom.parentNode.removeChild(this.dom);

    if (this.cube) this.cube.geometry.dispose();

    this.faceMaterials.forEach((mat) => mat.dispose());

    if (this.cubeEdges) this.cubeEdges.geometry.dispose();
  }

}

;
export { OrientationGizmo };