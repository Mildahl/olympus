import dataStore from "../../data/index.js";

import * as THREE from "three";

import tools from "../index.js";

import InteractiveObject, { makeInteractive } from "./animate/InteractiveObject.js";

class ModelTool {

  static aecoContext() {
    const group = new THREE.Group();

    group.name = "Environment";

    group.isAECO = true;

    return group;
  }

  static findVehicle(editor) {
    return editor.findVehicle();
  }

  static createGlowingRing({
    position,
    diameter = 2,
    color = 0x00ffff,
    tubeRadius = 0.05,
    glowIntensity = 1.5,
  }) {
    const ringGroup = new THREE.Group();

    ringGroup.name = "GlowingRing";
    
    const radius = diameter / 2;

    const geometry = new THREE.TorusGeometry(radius, tubeRadius, 16, 64);

    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: glowIntensity,
      transparent: true,
      opacity: 0.9,
    });

    const ring = new THREE.Mesh(geometry, material);

    const glowGeometry = new THREE.TorusGeometry(
      radius,
      tubeRadius * 2.5,
      16,
      64
    );

    const glowMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });

    const glowRing = new THREE.Mesh(glowGeometry, glowMaterial);

    ringGroup.add(ring);

    ringGroup.add(glowRing);

    if (position) {
        const vectorPosition = new THREE.Vector3(
            position.x,
            position.y,
            position.z
        );

      ringGroup.position.copy(vectorPosition);
    }
    ring.name = "Ring_Core";

    glowRing.name = "Ring_Glow";

    ringGroup.rotation.x = Math.PI / 2;

    return ringGroup;
  }

  static createTextLabel({text, position, size = 2, color = 0xffffff}) {
    const canvas = document.createElement("canvas");

    const context = canvas.getContext("2d");

    const fontSize = 64;

    const fontFamily = "Arial";

    context.font = `${fontSize}px ${fontFamily}`;
    const textMetrics = context.measureText(text);

    const textWidth = textMetrics.width;

    const padding = 20;

    canvas.width = Math.ceil(textWidth + padding * 2);

    canvas.height = Math.ceil(fontSize * 1.5);
    context.font = `${fontSize}px ${fontFamily}`;

    context.fillStyle = "#ffffff";

    context.textAlign = "center";

    context.textBaseline = "middle";

    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.Texture(canvas);

    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const sprite = new THREE.Sprite(material);

    position ? sprite.position.copy(position) : null;
    const aspectRatio = canvas.width / canvas.height;

    sprite.scale.set(size * aspectRatio, size, 1);

    return sprite;
  }

  /**
   * Creates a road/construction signage (hexagonal) with drawn text and a post.
   * Reuses shape/extrusion helpers and a canvas texture for crisp text and border.
   * Returns an InteractiveObject wrapper.
   */
  static createSignage(options = {}) {
    const {
      position = { x: 0, y: 0, z: 0 },
      radius = 1,
      depth = 0.12,
      text = "SLOW\nDOWN",
      signColor = 0xffd200, 
      borderColor = 0x000000,
      textColor = "#000000",
      fontFamily = "Arial",
      fontWeight = "700",
      postHeight = 3,
      postRadius = 0.06,
      canvasSize = 1024,
    } = options;

    const signGroup = new THREE.Group();
    const hexShape = new THREE.Shape();

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + Math.PI / 6; 

      const x = Math.cos(angle) * radius;

      const y = Math.sin(angle) * radius;

      i === 0 ? hexShape.moveTo(x, y) : hexShape.lineTo(x, y);
    }

    hexShape.closePath();
    const extrudeSettings = { depth: depth, bevelEnabled: false };

    const signBodyGeom = new THREE.ExtrudeGeometry(hexShape, extrudeSettings);
    signBodyGeom.computeBoundingBox();

    const bmin = signBodyGeom.boundingBox.min;

    const bmax = signBodyGeom.boundingBox.max;

    const cx = (bmin.x + bmax.x) / 2;

    const cy = (bmin.y + bmax.y) / 2;

    const cz = (bmin.z + bmax.z) / 2;

    signBodyGeom.translate(-cx, -cy, -cz);

    const sideMaterial = ModelTool.createMaterial(signColor);

    const signBody = new THREE.Mesh(signBodyGeom, sideMaterial);

    signBody.name = "Signage_Body";
    const frontGeom = new THREE.ShapeGeometry(hexShape);

    frontGeom.computeBoundingBox();
    const fbmin = frontGeom.boundingBox.min;

    const fbmax = frontGeom.boundingBox.max;

    const fcx = (fbmin.x + fbmax.x) / 2;

    const fcy = (fbmin.y + fbmax.y) / 2;

    const fwidth = fbmax.x - fbmin.x;

    const fheight = fbmax.y - fbmin.y;
    const modelToCanvas = (x, y) => {
      const px = canvasSize / 2 + ((x - fcx) * (canvasSize / fwidth));

      const py = canvasSize / 2 - ((y - fcy) * (canvasSize / fheight));

      return { x: px, y: py };
    };
    const canvas = document.createElement("canvas");

    canvas.width = canvasSize;

    canvas.height = canvasSize;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvasSize, canvasSize);
    ctx.beginPath();

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + Math.PI / 6; 

      const mx = Math.cos(angle) * radius;

      const my = Math.sin(angle) * radius;

      const p = modelToCanvas(mx, my);

      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    }

    ctx.closePath();
    ctx.fillStyle = `#${signColor.toString(16).padStart(6, "0")}`;

    ctx.fill();
    ctx.lineWidth = Math.max(4, Math.floor(canvasSize * 0.02));

    ctx.strokeStyle = `#${borderColor.toString(16).padStart(6, "0")}`;

    ctx.stroke();
    ctx.fillStyle = textColor;

    const lines = String(text).split("\n");
    const scalePxX = canvasSize / fwidth;

    const scalePxY = canvasSize / fheight;

    const scalePx = Math.min(scalePxX, scalePxY) * 0.85; 
    const fontSizePx = Math.max(8, Math.floor((Math.min(fwidth, fheight) * scalePx) * 0.32 / Math.max(1, lines.length)));

    ctx.font = `${fontWeight} ${fontSizePx}px ${fontFamily}`;

    ctx.textAlign = "center";

    ctx.textBaseline = "middle";
    const centerModel = { x: fcx, y: fcy };

    const centerCanvas = modelToCanvas(centerModel.x, centerModel.y);

    const lineSpacing = fontSizePx * 0.95;

    const totalTextHeight = lines.length * lineSpacing;

    let startYPx = centerCanvas.y - totalTextHeight / 2 + lineSpacing / 2;
    const outlineEnabled = true;

    const outlineColor = `#${borderColor.toString(16).padStart(6, "0")}`;

    const outlineWidthPx = Math.max(1, Math.floor(fontSizePx * 0.1));

    for (let i = 0; i < lines.length; i++) {
      const y = startYPx + i * lineSpacing;

      if (outlineEnabled) {
        ctx.lineWidth = outlineWidthPx;

        ctx.lineJoin = "round";

        ctx.strokeStyle = outlineColor;

        ctx.strokeText(lines[i], centerCanvas.x, y);
      }

      ctx.fillText(lines[i], centerCanvas.x, y);
    }

    const texture = new THREE.CanvasTexture(canvas);

    texture.needsUpdate = true;

    texture.minFilter = THREE.LinearFilter;

    texture.flipY = false; 

    const frontMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
      alphaTest: 0.5,
    });
    frontGeom.translate(-fcx, -fcy, 0);
    if (!frontGeom.attributes.uv || true) {
      const pos = frontGeom.attributes.position;

      const uvArray = new Float32Array(pos.count * 2);

      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i) + fcx; 

        const vy = pos.getY(i) + fcy;

        const u = (vx - fbmin.x) / Math.max(1e-6, fwidth);
        const v = 1 - ( (vy - fbmin.y) / Math.max(1e-6, fheight) );

        uvArray[i * 2 + 0] = u;

        uvArray[i * 2 + 1] = v;
      }

      frontGeom.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));
    }

    const frontMesh = new THREE.Mesh(frontGeom, frontMaterial);
    const offset = depth / 2 + 0.001;
    frontMesh.position.z = offset;

    frontMesh.name = "Signage_Front";
    const backMaterial = new THREE.MeshStandardMaterial({ color: signColor });

    const backMesh = new THREE.Mesh(frontGeom.clone(), backMaterial);

    backMesh.position.z = -offset;

    backMesh.rotation.y = Math.PI; 

    backMesh.name = "Signage_Back";
    const postHeightLocal = postHeight;

    const postGeom = new THREE.CylinderGeometry(postRadius, postRadius, postHeightLocal, 16);

    const postMat = ModelTool.createMaterial(0x333333);

    const postMesh = new THREE.Mesh(postGeom, postMat);

    postMesh.name = "Signage_Post";
    postMesh.position.set(0, -radius - postHeightLocal / 2, 0);
    const bracketGeom = new THREE.BoxGeometry(Math.max(0.08, radius * 0.2), 0.06, 0.06);

    const bracket = new THREE.Mesh(bracketGeom, postMat);

    bracket.position.set(0, -radius + 0.02, 0);

    bracket.name = "Signage_Bracket";
    signGroup.add(signBody);

    signGroup.add(frontMesh);

    signGroup.add(backMesh);

    signGroup.add(bracket);

    signGroup.add(postMesh);

    tools.world.placement.setPosition( signGroup, position)

    return new InteractiveObject(signGroup, { type: "Signage" });
  }

  static add(editor, obj, parent = null) {
    editor.addObject(obj, parent);
  }

  static batchAdd(objects) {
    return tools.world.scene.batchAdd(objects);
  }

  static createMeshesFromIfcMeshData(meshData, globalId, options = {}) {
    const assembly =
      options.assembly === "multiMesh" ||
      options.ifcGeometryAssembly === "multiMesh"
        ? "multiMesh"
        : "merged";

    return tools.bim.geometry.createThreeJSMesh(meshData, globalId, {
      assembly,
    });
  }

  /**
   * Creates a DriverPOV (Driver Point of View) empty object for vehicle cabins
   * This is used by NavigationController for first-person driving view
   * @param {Object} options - POV configuration
   * @param {Object} options.position - Position {x, y, z} relative to parent
   * @param {Object} [options.lookDirection] - Optional look direction {x, y, z}
   * @returns {THREE.Object3D} The DriverPOV empty object
   */
  static createDriverPOV(options = {}) {
    const {
      position = { x: 0, y: 0, z: 0 },
      lookDirection = { x: -1, y: 0, z: 0 } 
    } = options;

    const pov = new THREE.Object3D();

    pov.name = 'DriverPOV';

    pov.position.set(position.x, position.y, position.z);
    pov.userData.lookDirection = new THREE.Vector3(
      lookDirection.x,
      lookDirection.y,
      lookDirection.z
    ).normalize();
    
    return pov;
  }

  /**
   * Creates a rectangular profile shape
   * @param {number} x - Starting x position
   * @param {number} y - Starting y position
   * @param {number} width - Width of the profile
   * @param {number} height - Height of the profile
   * @returns {THREE.Shape} The rectangular profile shape
   */
  static createProfileShape(x, y, width, height) {
    const shape = new THREE.Shape();

    shape.moveTo(x, y);

    shape.lineTo(x + height, -y);

    shape.lineTo(x + height, -y - width);

    shape.lineTo(x, -y - width);

    shape.lineTo(x, y);

    return shape;
  }

  /**
   * Extrudes a profile shape along a curve and applies material
   * @param {THREE.Shape} profile - The shape to extrude
   * @param {THREE.Curve} curve - The curve path to extrude along
   * @param {THREE.Material} material - The material to apply
   * @param {Object} options - Extrusion options
   * @param {number} options.steps - Number of steps for extrusion (default: 100)
   * @param {boolean} options.bevelEnabled - Whether to enable bevel (default: false)
   * @returns {THREE.Mesh} The extruded mesh with material applied
   */
  static extrudeProfile(profile, curve, material, options = {}) {
    const extrudeSettings = {
      extrudePath: curve,
      steps: options.steps || 100,
      bevelEnabled: options.bevelEnabled || false,
    };

    const geometry = new THREE.ExtrudeGeometry(profile, extrudeSettings);

    const mesh = new THREE.Mesh(geometry, material);

    return mesh;
  }

  /**
   * Creates a curve from coordinate points
   * @param {Array} coordinates - Array of {x, y, z} coordinate objects
   * @returns {THREE.CatmullRomCurve3} The curve
   */
  static createCurveFromCoordinates(coordinates) {
    const points = [];

    coordinates.forEach((coord) =>
      points.push(new THREE.Vector3(coord.x, coord.z, -coord.y))
    );

    return new THREE.CatmullRomCurve3(points);
  }

  /**
   * Creates a material for road elements
   * @param {number} color - Hex color value
   * @param {Object} options - Additional material options
   * @returns {THREE.MeshLambertMaterial} The material
   */
  static createMaterial(color, options = {}) {
    return new THREE.MeshLambertMaterial({
      color: color,
      ...options,
    });
  }

  /**
   * Creates road center line stripes (dashed lines) along a curve path
   * Z-up convention: stripes are flat on the ground (X-Y plane) with minimal Z thickness
   * @param {Object} options - Road stripes configuration options
   * @param {THREE.Curve} options.curve - The curve path to follow
   * @param {number} [options.stripeLength=2] - Length of each stripe segment
   * @param {number} [options.gapLength=2] - Length of gap between stripes
   * @param {number} [options.stripeWidth=0.15] - Width of the stripe
   * @param {number} [options.stripeHeight=0.02] - Height/thickness of the stripe (Z direction)
   * @param {number} [options.color=0xffffff] - Color of the stripes
   * @param {number} [options.offsetFromEnds=0.5] - Distance to offset from start and end of road
   * @param {number} [options.lateralOffset=0] - Offset from center line (positive = right, negative = left)
   * @returns {THREE.Group} Group containing all stripe meshes
   */
  static createRoadStripes(options = {}) {
    const {
      curve,
      stripeLength = 2,
      gapLength = 2,
      stripeWidth = 0.15,
      stripeHeight = 0.02,
      color = 0xffffff,
      offsetFromEnds = 0.5,
      lateralOffset = 0,
    } = options;

    const stripesGroup = new THREE.Group();

    stripesGroup.name = "RoadStripes";

    const curveLength = curve.getLength();

    const usableLength = curveLength - (offsetFromEnds * 2);

    const patternLength = stripeLength + gapLength;

    const stripeCount = Math.floor(usableLength / patternLength);

    const stripeMaterial = new THREE.MeshLambertMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.2,
    });

    for (let i = 0; i < stripeCount; i++) {
      
      const startDist = offsetFromEnds + (i * patternLength);

      const centerDist = startDist + (stripeLength / 2);

      const t = centerDist / curveLength;
      const point = curve.getPointAt(t);

      const tangent = curve.getTangentAt(t);
      const stripeGeom = new THREE.BoxGeometry(stripeLength, stripeHeight, stripeWidth);

      const stripe = new THREE.Mesh(stripeGeom, stripeMaterial);
      stripe.position.copy(point);
      const angle = Math.atan2(-tangent.z, tangent.x);

      stripe.rotation.y = angle;
      if (lateralOffset !== 0) {
        
        const perpX = -tangent.z;

        const perpZ = tangent.x;

        const len = Math.sqrt(perpX * perpX + perpZ * perpZ);
        
        if (len > 0.001) {
          stripe.position.x += (perpX / len) * lateralOffset;

          stripe.position.z += (perpZ / len) * lateralOffset;
        }
      }
      stripe.position.y += stripeHeight / 2 + 0.001;

      stripe.name = `RoadStripe_${i + 1}`;

      stripesGroup.add(stripe);
    }

    return stripesGroup;
  }

  /**
   * Draws a road with optional curbs and center stripes along a curve path
   * @param {Object} options - Road configuration options
   * @param {string} options.name - Name of the road
   * @param {Array} options.curve - Array of {x, y, z} coordinate objects defining the road path
   * @param {number} [options.width=4] - Width of the road surface
   * @param {number} [options.depth=0.1] - Depth/thickness of the road surface
   * @param {number} [options.color=0x333333] - Color of the road surface
   * @param {Object} [options.curb] - Curb configuration (omit to disable curbs)
   * @param {number} [options.curb.width] - Width of the curb (default: 12.5% of road width)
   * @param {number} [options.curb.height] - Height of the curb (default: 2x road depth)
   * @param {number} [options.curb.color=0xcccccc] - Color of the curbs
   * @param {Object} [options.stripes] - Center line stripes configuration (omit to disable stripes)
   * @param {number} [options.stripes.length=2] - Length of each stripe segment
   * @param {number} [options.stripes.gap=2] - Gap between stripe segments
   * @param {number} [options.stripes.width=0.15] - Width of stripes
   * @param {number} [options.stripes.color=0xffffff] - Color of stripes
   * @param {number} [options.stripes.offsetFromEnds=0.5] - Distance to offset stripes from road ends
   * @param {number} [options.stripes.lateralOffset=0] - Offset from center (positive=right, negative=left)
   * @param {Object} [options.label] - Label configuration (omit to disable label)
   * @param {number} [options.label.size=0.5] - Size of the label
   * @param {number} [options.label.color=0xffffff] - Color of the label
   * @returns {THREE.Group} The road group containing road surface, curbs, stripes, and label
   */
  static drawRoad(options) {
    const {
      name,
      curve: curveCoordinates,
      width = 4,
      depth = 0.1,
      color = 0x333333,
      curb = {},
      stripes = null,
      label = {},
    } = options;
    const curve = ModelTool.createCurveFromCoordinates(curveCoordinates);
    const roadMaterial = ModelTool.createMaterial(color);

    const roadProfile = ModelTool.createProfileShape(
      0,
      0,
      width,
      depth,
    );

    const road = ModelTool.extrudeProfile(roadProfile, curve, roadMaterial);

    road.name = name;
    const roadGroup = new THREE.Group();

    roadGroup.add(road);
    if (curb !== false && curb !== null) {
      const curbWidth = 0.125;

      const curbHeight = 0.2;

      const curbColor =  0xcccccc;

      const curbMaterial = ModelTool.createMaterial(curbColor);

      const curbProfile = ModelTool.createProfileShape(
        0,
        0,
        curbWidth,
        curbHeight
      );

      const extrudeSettings = {
        extrudePath: curve,
        steps: 100,
        bevelEnabled: false,
      };

      const curbGeometry = new THREE.ExtrudeGeometry(curbProfile, extrudeSettings);

      const curbs = new THREE.InstancedMesh(curbGeometry, curbMaterial, 2);
      const leftTranslation =  {
        x: -curbWidth, y: 0, z: 0
      }

      const matrixLeft = new THREE.Matrix4().makeTranslation(leftTranslation.x, -leftTranslation.y, -leftTranslation.z);

      curbs.setMatrixAt(0, matrixLeft);
      const translation =  {
        x: width, y: 0, z: 0
      }

      const matrixRight = new THREE.Matrix4().makeTranslation(translation.x, translation.z, translation.y);

      curbs.setMatrixAt(1, matrixRight);

      curbs.name = name + " Curbs";

      roadGroup.add(curbs);

      roadGroup.isAECO = true;
    }
    if (stripes !== false && stripes !== null) {
      const stripesGroup = ModelTool.createRoadStripes({
        curve: curve,
        stripeLength: stripes.length ?? 2,
        gapLength: stripes.gap ?? 2,
        stripeWidth: stripes.width ?? 0.15,
        stripeHeight: stripes.height ?? 0.02,
        color: stripes.color ?? 0xffffff,
        offsetFromEnds: stripes.offsetFromEnds ?? 0.5,
        lateralOffset: stripes.lateralOffset ?? 0,
      });

      stripesGroup.name = name + " Stripes";

      roadGroup.add(stripesGroup);
    }
    roadGroup.name = name;
    return roadGroup;
  }

  /**
   * Creates a truck group object using profile extrusion
   * @param {Object} options - Truck configuration options
   * @param {Object} [options.position] - Position {x, y, z} of the truck
   * @param {number} [options.scale=1] - Scale factor for the truck
   * @param {number} [options.cabColor=0x1a3a4a] - Color of the cab
   * @param {number} [options.cargoColor=0xddeeff] - Color of the cargo box
   * @param {number} [options.wheelColor=0x222222] - Color of the wheels
   * @param {number} [options.windowColor=0x88ccdd] - Color of the windows
   * @returns {THREE.Group} The truck group
   */
  static createTruck(options = {}) {
    const {
      position = { x: 0, y: 0, z: 0 },
      scale = 1,
      cabColor = 0x1a3a4a,
      cargoColor = 0xddeeff,
      wheelColor = 0x222222,
      windowColor = 0x88ccdd,
      rimColor = 0x666666,
    } = options;

    const truckGroup = new THREE.Group();

    truckGroup.isAECO = true;

    truckGroup.name = "Truck";
    const cabLength = 1.5;

    const cabWidth = 2;

    const cabHeight = 1.8;

    const cargoLength = 4;

    const cargoWidth = 2.2;

    const cargoHeight = 2.5;

    const wheelRadius = 0.4;

    const wheelWidth = 0.25;

    const chassisHeight = 0.3;
    const chassisLength = cabLength + cargoLength + 0.3;

    const chassisGeometry = new THREE.BoxGeometry(chassisLength, chassisHeight, cabWidth * 0.8);

    const chassisMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });

    const chassis = new THREE.Mesh(chassisGeometry, chassisMaterial);

    chassis.position.set(chassisLength / 2, wheelRadius + chassisHeight / 2, 0);

    chassis.name = "Truck_Chassis";

    truckGroup.add(chassis);
    const cabGeometry = new THREE.BoxGeometry(cabLength, cabHeight, cabWidth);

    const cabMaterial = new THREE.MeshLambertMaterial({ color: cabColor });

    const cab = new THREE.Mesh(cabGeometry, cabMaterial);

    cab.position.set(cabLength / 2, wheelRadius + chassisHeight + cabHeight / 2, 0);

    cab.name = "Truck_Cab";

    truckGroup.add(cab);
    const windowMaterial = new THREE.MeshLambertMaterial({ 
      color: windowColor, 
      transparent: true, 
      opacity: 0.7 
    });
    const frontWindowGeom = new THREE.BoxGeometry(0.05, cabHeight * 0.5, cabWidth * 0.8);

    const frontWindow = new THREE.Mesh(frontWindowGeom, windowMaterial);

    frontWindow.position.set(-0.02, wheelRadius + chassisHeight + cabHeight * 0.65, 0);

    frontWindow.name = "Truck_FrontWindow";

    truckGroup.add(frontWindow);
    const sideWindowGeom = new THREE.BoxGeometry(cabLength * 0.5, cabHeight * 0.4, 0.05);
    
    const leftWindow = new THREE.Mesh(sideWindowGeom, windowMaterial);

    leftWindow.position.set(cabLength * 0.6, wheelRadius + chassisHeight + cabHeight * 0.65, cabWidth / 2 + 0.02);

    leftWindow.name = "Truck_LeftWindow";

    truckGroup.add(leftWindow);

    const rightWindow = new THREE.Mesh(sideWindowGeom, windowMaterial);

    rightWindow.position.set(cabLength * 0.6, wheelRadius + chassisHeight + cabHeight * 0.65, -cabWidth / 2 - 0.02);

    rightWindow.name = "Truck_RightWindow";

    truckGroup.add(rightWindow);
    const driverPOV = ModelTool.createDriverPOV({
      position: {
        x: cabLength * 0.3,  
        y: wheelRadius + chassisHeight + cabHeight * 0.6,  
        z: 0  
      },
      lookDirection: { x: -1, y: 0, z: 0 }  
    });

    truckGroup.add(driverPOV);
    const cargoGeometry = new THREE.BoxGeometry(cargoLength, cargoHeight, cargoWidth);

    const cargoMaterial = new THREE.MeshLambertMaterial({ color: cargoColor });

    const cargo = new THREE.Mesh(cargoGeometry, cargoMaterial);

    cargo.position.set(cabLength + cargoLength / 2 + 0.1, wheelRadius + chassisHeight + cargoHeight / 2, 0);

    cargo.name = "Truck_Cargo";

    truckGroup.add(cargo);
    const wheelGeometry = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 24);

    wheelGeometry.rotateX(Math.PI / 2); 

    const wheelMaterial = new THREE.MeshLambertMaterial({ color: wheelColor });

    const rimGeometry = new THREE.CylinderGeometry(wheelRadius * 0.5, wheelRadius * 0.5, wheelWidth + 0.02, 16);

    rimGeometry.rotateX(Math.PI / 2);

    const rimMaterial = new THREE.MeshLambertMaterial({ color: rimColor });
    const wheelPositions = [
      
      { x: cabLength * 0.7, z: cabWidth / 2 + wheelWidth / 2, name: 'FL' },
      { x: cabLength * 0.7, z: -cabWidth / 2 - wheelWidth / 2, name: 'FR' },
      
      { x: cabLength + cargoLength * 0.6, z: cabWidth / 2 + wheelWidth / 2, name: 'RL1' },
      { x: cabLength + cargoLength * 0.6, z: -cabWidth / 2 - wheelWidth / 2, name: 'RR1' },
      { x: cabLength + cargoLength * 0.85, z: cabWidth / 2 + wheelWidth / 2, name: 'RL2' },
      { x: cabLength + cargoLength * 0.85, z: -cabWidth / 2 - wheelWidth / 2, name: 'RR2' },
    ];

    wheelPositions.forEach((pos) => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);

      wheel.position.set(pos.x, wheelRadius, pos.z);

      wheel.name = `Truck_Wheel_${pos.name}`;

      truckGroup.add(wheel);

      const rim = new THREE.Mesh(rimGeometry, rimMaterial);

      rim.position.set(pos.x, wheelRadius, pos.z);

      rim.name = `Truck_Rim_${pos.name}`;

      truckGroup.add(rim);
    });
    truckGroup.scale.set(scale, scale, scale);

    tools.world.placement.setPosition( truckGroup, position);

    return new InteractiveObject(truckGroup, { type: 'Truck' });
  }

  /**
   * Creates a mobile crane (truck-mounted crane) group object
   * @param {Object} options - Mobile crane configuration options
   * @param {Object} [options.position] - Position {x, y, z} of the crane
   * @param {number} [options.scale=1] - Scale factor for the crane
   * @param {number} [options.boomLength=12] - Length of the main boom in meters
   * @param {number} [options.jibLength=6] - Length of the jib (fly extension) in meters
   * @param {number} [options.boomAngle=45] - Angle of the boom from horizontal in degrees
   * @param {number} [options.boomRotation=0] - Rotation of the boom around vertical axis in degrees
   * @param {number} [options.tonnage=50] - Crane capacity in tons (affects counterweight size)
   * @param {number} [options.cabColor=0x1a3a4a] - Color of the cab
   * @param {number} [options.boomColor=0xffcc00] - Color of the boom/jib
   * @param {number} [options.baseColor=0x333333] - Color of the base/chassis
   * @param {number} [options.outriggerColor=0x222222] - Color of the outriggers
   * @returns {THREE.Group} The mobile crane group
   */
  static createMobileCrane(options = {}) {
    const {
      position = { x: 0, y: 0, z: 0 },
      scale = 1,
      boomLength = 12,
      jibLength = 6,
      boomAngle = 45,
      boomRotation = 0,
      tonnage = 50,
      cabColor = 0x1a3a4a,
      boomColor = 0xffcc00,
      baseColor = 0x333333,
      outriggerColor = 0x222222,
      wheelColor = 0x222222,
      windowColor = 0x88ccdd,
      rimColor = 0x666666,
      cableColor = 0x444444,
    } = options;

    const craneGroup = new THREE.Group();

    craneGroup.isAECO = true;

    craneGroup.name = "MobileCrane";
    const counterweightSize = Math.max(1, tonnage / 25);
    const bodyGroup = new THREE.Group();

    bodyGroup.name = "MobileCrane_Body";
    const cabLength = 2;

    const cabWidth = 2.5;

    const cabHeight = 2;

    const carrierLength = 6;

    const carrierWidth = 2.8;

    const carrierHeight = 1.2;

    const wheelRadius = 0.5;

    const wheelWidth = 0.3;

    const chassisHeight = 0.4;
    const carrierGeometry = new THREE.BoxGeometry(carrierLength, carrierWidth, carrierHeight);

    const carrierMaterial = new THREE.MeshLambertMaterial({ color: baseColor });

    const carrier = new THREE.Mesh(carrierGeometry, carrierMaterial);

    carrier.position.set(carrierLength / 2, 0, wheelRadius + carrierHeight / 2);

    carrier.name = "MobileCrane_Carrier";

    bodyGroup.add(carrier);
    const cabGeometry = new THREE.BoxGeometry(cabLength, cabWidth, cabHeight);

    const cabMaterial = new THREE.MeshLambertMaterial({ color: cabColor });

    const cab = new THREE.Mesh(cabGeometry, cabMaterial);

    cab.position.set(cabLength / 2, 0, wheelRadius + carrierHeight + cabHeight / 2);

    cab.name = "MobileCrane_Cab";

    bodyGroup.add(cab);
    const windowMaterial = new THREE.MeshLambertMaterial({ 
      color: windowColor, 
      transparent: true, 
      opacity: 0.7 
    });

    const frontWindowGeom = new THREE.BoxGeometry(0.05, cabWidth * 0.8, cabHeight * 0.5);

    const frontWindow = new THREE.Mesh(frontWindowGeom, windowMaterial);

    frontWindow.position.set(0, 0, wheelRadius + carrierHeight + cabHeight * 0.65);

    frontWindow.name = "MobileCrane_FrontWindow";

    bodyGroup.add(frontWindow);
    const driverPOV = ModelTool.createDriverPOV({
      position: {
        x: cabLength * 0.3,   
        y: 0,                  
        z: wheelRadius + carrierHeight + cabHeight * 0.6  
      },
      lookDirection: { x: -1, y: 0, z: 0 }  
    });

    bodyGroup.add(driverPOV);
    const platformRadius = 1.8;

    const platformHeight = 0.5;

    const platformGeometry = new THREE.CylinderGeometry(platformRadius, platformRadius, platformHeight, 32);

    const platformMaterial = new THREE.MeshLambertMaterial({ color: baseColor });

    const platform = new THREE.Mesh(platformGeometry, platformMaterial);

    platform.position.set(carrierLength * 0.65, 0, wheelRadius + carrierHeight + platformHeight / 2);

    platform.rotation.x = Math.PI / 2;

    platform.name = "MobileCrane_Platform";

    bodyGroup.add(platform);
    const superstructureGroup = new THREE.Group();

    superstructureGroup.name = "MobileCrane_Superstructure";
    const houseWidth = 2.2;

    const houseLength = 2.5;

    const houseHeight = 1.8;

    const houseGeometry = new THREE.BoxGeometry(houseLength, houseWidth, houseHeight);

    const houseMaterial = new THREE.MeshLambertMaterial({ color: cabColor });

    const house = new THREE.Mesh(houseGeometry, houseMaterial);

    house.position.set(-houseLength / 2 + cabLength/2 + 0.3, 0, houseHeight / 2 + platformHeight);

    house.name = "MobileCrane_House";

    superstructureGroup.add(house);
    const counterweightGeometry = new THREE.BoxGeometry(counterweightSize * 0.8, counterweightSize * 1.2, counterweightSize * 0.6);

    const counterweightMaterial = new THREE.MeshLambertMaterial({ color: 0x555555 });

    const counterweight = new THREE.Mesh(counterweightGeometry, counterweightMaterial);

    counterweight.position.set(-houseLength - counterweightSize * 0.3, 0, counterweightSize * 0.3 + platformHeight);

    counterweight.name = "MobileCrane_Counterweight";

    superstructureGroup.add(counterweight);
    const boomGroup = new THREE.Group();

    boomGroup.name = "MobileCrane_BoomAssembly";

    const boomWidth = 0.4;

    const boomDepth = 0.5;
    const boomGeometry = new THREE.BoxGeometry(boomLength, boomWidth, boomDepth);

    const boomMaterial = new THREE.MeshLambertMaterial({ color: boomColor });

    const boom = new THREE.Mesh(boomGeometry, boomMaterial);

    boom.position.set(boomLength / 2, 0, 0);

    boom.name = "MobileCrane_Boom";

    boomGroup.add(boom);
    const latticeCount = Math.floor(boomLength / 1.5);

    const latticeMaterial = new THREE.MeshLambertMaterial({ color: boomColor });

    for (let i = 0; i < latticeCount; i++) {
      const latticeGeom = new THREE.BoxGeometry(0.08, boomWidth * 1.2, boomDepth * 0.08);

      const lattice = new THREE.Mesh(latticeGeom, latticeMaterial);

      lattice.position.set(1 + i * 1.5, 0, 0);

      lattice.name = `MobileCrane_BoomLattice_${i}`;

      boomGroup.add(lattice);
    }
    if (jibLength > 0) {
      const jibWidth = boomWidth * 0.7;

      const jibDepth = boomDepth * 0.7;

      const jibGeometry = new THREE.BoxGeometry(jibLength, jibWidth, jibDepth);

      const jibMaterial = new THREE.MeshLambertMaterial({ color: boomColor });

      const jib = new THREE.Mesh(jibGeometry, jibMaterial);

      jib.position.set(boomLength + jibLength / 2, 0, 0);

      jib.name = "MobileCrane_Jib";

      boomGroup.add(jib);
      const jibLatticeCount = Math.floor(jibLength / 1.2);

      for (let i = 0; i < jibLatticeCount; i++) {
        const latticeGeom = new THREE.BoxGeometry(0.06, jibWidth * 1.2, jibDepth * 0.08);

        const lattice = new THREE.Mesh(latticeGeom, latticeMaterial);

        lattice.position.set(boomLength + 0.8 + i * 1.2, 0, 0);

        lattice.name = `MobileCrane_JibLattice_${i}`;

        boomGroup.add(lattice);
      }
    }
    const totalReach = boomLength + jibLength;

    const hookBlockGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.5);

    const hookBlockMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });

    const hookBlock = new THREE.Mesh(hookBlockGeometry, hookBlockMaterial);

    hookBlock.position.set(totalReach - 0.5, 0, -2);

    hookBlock.name = "MobileCrane_HookBlock";

    boomGroup.add(hookBlock);
    const hookGeometry = new THREE.TorusGeometry(0.15, 0.04, 8, 16, Math.PI * 1.5);

    const hookMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });

    const hook = new THREE.Mesh(hookGeometry, hookMaterial);

    hook.position.set(totalReach - 0.5, 0, -2.6);

    hook.rotation.y = Math.PI / 2;

    hook.name = "MobileCrane_Hook";

    boomGroup.add(hook);
    const cableGeometry = new THREE.CylinderGeometry(0.02, 0.02, 2, 8);

    const cableMaterial = new THREE.MeshLambertMaterial({ color: cableColor });

    const cable = new THREE.Mesh(cableGeometry, cableMaterial);

    cable.position.set(totalReach - 0.5, 0, -1);

    cable.name = "MobileCrane_Cable";

    boomGroup.add(cable);
    boomGroup.position.set(0.5, 0, houseHeight + platformHeight + 0.3);

    boomGroup.rotation.y = THREE.MathUtils.degToRad(-boomAngle);

    superstructureGroup.add(boomGroup);
    superstructureGroup.rotation.z = THREE.MathUtils.degToRad(boomRotation);

    superstructureGroup.position.set(carrierLength * 0.65, 0, wheelRadius + carrierHeight);
    
    bodyGroup.add(superstructureGroup);
    const outriggerExtension = 2;

    const outriggerWidth = 0.3;

    const outriggerHeight = 0.2;

    const outriggerMaterial = new THREE.MeshLambertMaterial({ color: outriggerColor });

    const outriggerPositions = [
      { x: carrierLength * 0.2, y: carrierWidth / 2 + outriggerExtension / 2, side: 'left_front' },
      { x: carrierLength * 0.2, y: -carrierWidth / 2 - outriggerExtension / 2, side: 'right_front' },
      { x: carrierLength * 0.8, y: carrierWidth / 2 + outriggerExtension / 2, side: 'left_rear' },
      { x: carrierLength * 0.8, y: -carrierWidth / 2 - outriggerExtension / 2, side: 'right_rear' },
    ];

    outriggerPositions.forEach((pos) => {
      
      const beamGeom = new THREE.BoxGeometry(outriggerWidth, outriggerExtension, outriggerHeight);

      const beam = new THREE.Mesh(beamGeom, outriggerMaterial);

      beam.position.set(pos.x, pos.y, wheelRadius + carrierHeight / 2);

      beam.name = `MobileCrane_Outrigger_${pos.side}`;

      bodyGroup.add(beam);
      const padGeom = new THREE.CylinderGeometry(0.4, 0.5, 0.1, 16);

      const pad = new THREE.Mesh(padGeom, outriggerMaterial);

      const padY = pos.y > 0 ? pos.y + outriggerExtension / 2 : pos.y - outriggerExtension / 2;

      pad.position.set(pos.x, padY, 0.05);

      pad.rotation.x = Math.PI / 2;

      pad.name = `MobileCrane_OutriggerPad_${pos.side}`;

      bodyGroup.add(pad);
      const jackGeom = new THREE.CylinderGeometry(0.1, 0.1, wheelRadius + carrierHeight / 2, 8);

      const jackMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });

      const jack = new THREE.Mesh(jackGeom, jackMaterial);

      jack.position.set(pos.x, padY, (wheelRadius + carrierHeight / 2) / 2);

      jack.rotation.x = Math.PI / 2;

      jack.name = `MobileCrane_OutriggerJack_${pos.side}`;

      bodyGroup.add(jack);
    });
    bodyGroup.rotation.x = -Math.PI / 2;

    craneGroup.add(bodyGroup);
    const wheelGeometry = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 24);

    const wheelMaterial = new THREE.MeshLambertMaterial({ color: wheelColor });

    const rimGeometry = new THREE.CylinderGeometry(wheelRadius * 0.5, wheelRadius * 0.5, wheelWidth + 0.02, 16);

    const rimMaterial = new THREE.MeshLambertMaterial({ color: rimColor });
    const wheelPositions = [
      
      { x: carrierLength * 0.15, y: wheelRadius, z: carrierWidth / 2 + wheelWidth / 2 },
      { x: carrierLength * 0.15, y: wheelRadius, z: -carrierWidth / 2 - wheelWidth / 2 },
      
      { x: carrierLength * 0.35, y: wheelRadius, z: carrierWidth / 2 + wheelWidth / 2 },
      { x: carrierLength * 0.35, y: wheelRadius, z: -carrierWidth / 2 - wheelWidth / 2 },
      
      { x: carrierLength * 0.65, y: wheelRadius, z: carrierWidth / 2 + wheelWidth / 2 },
      { x: carrierLength * 0.65, y: wheelRadius, z: -carrierWidth / 2 - wheelWidth / 2 },
      
      { x: carrierLength * 0.85, y: wheelRadius, z: carrierWidth / 2 + wheelWidth / 2 },
      { x: carrierLength * 0.85, y: wheelRadius, z: -carrierWidth / 2 - wheelWidth / 2 },
    ];

    wheelPositions.forEach((pos, index) => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);

      wheel.rotation.x = Math.PI / 2;

      wheel.position.set(pos.x, pos.y, pos.z);

      wheel.name = `MobileCrane_Wheel_${index + 1}`;

      craneGroup.add(wheel);

      const rim = new THREE.Mesh(rimGeometry, rimMaterial);

      rim.rotation.x = Math.PI / 2;

      rim.position.set(pos.x, pos.y, pos.z);

      rim.name = `MobileCrane_Rim_${index + 1}`;

      craneGroup.add(rim);
    });
    craneGroup.scale.set(scale, scale, scale);

    tools.world.placement.setPosition( craneGroup, position)

    return new InteractiveObject(craneGroup, { type: 'MobileCrane' });
  }

  /**
   * Creates a fixed tower crane group object
   * @param {Object} options - Tower crane configuration options
   * @param {Object} [options.position] - Position {x, y, z} of the crane base
   * @param {number} [options.scale=1] - Scale factor for the crane
   * @param {number} [options.towerHeight=40] - Height of the tower in meters
   * @param {number} [options.boomLength=50] - Length of the horizontal jib (boom) in meters
   * @param {number} [options.counterJibLength=15] - Length of the counter-jib in meters
   * @param {number} [options.tonnage=12] - Crane capacity in tons (affects counterweight)
   * @param {number} [options.trolleyPosition=0.5] - Position of trolley along boom (0-1)
   * @param {number} [options.boomRotation=0] - Rotation of the boom around vertical axis in degrees
   * @param {number} [options.towerColor=0xffcc00] - Color of the tower
   * @param {number} [options.boomColor=0xffcc00] - Color of the boom/jib
   * @param {number} [options.cabColor=0x1a3a4a] - Color of the operator cab
   * @param {number} [options.baseColor=0x555555] - Color of the concrete base
   * @returns {THREE.Group} The tower crane group
   */
  static createTowerCrane(options = {}) {
    const {
      position = { x: 0, y: 0, z: 0 },
      scale = 1,
      towerHeight = 40,
      boomLength = 50,
      counterJibLength = 15,
      tonnage = 12,
      trolleyPosition = 0.5,
      boomRotation = 0,
      towerColor = 0xffcc00,
      boomColor = 0xffcc00,
      cabColor = 0x1a3a4a,
      baseColor = 0x555555,
      cableColor = 0x444444,
      windowColor = 0x88ccdd,
    } = options;

    const craneGroup = new THREE.Group();

    craneGroup.isAECO = true;

    craneGroup.name = "TowerCrane";
    const counterweightSize = Math.max(1.5, tonnage / 4);
    const towerWidth = 2;

    const baseSize = 4;

    const baseHeight = 1;

    const postRadius = 0.12;

    const jibBaseHeight = 2; 

    const jibHeight = 1.5; 

    const jibWidth = 1.2;

    const aFrameHeight = 5;
    const towerMaterial = new THREE.MeshLambertMaterial({ color: towerColor });

    const jibMaterial = new THREE.MeshLambertMaterial({ color: boomColor });

    const cableMaterial = new THREE.MeshLambertMaterial({ color: cableColor });

    const windowMaterial = new THREE.MeshLambertMaterial({ 
      color: windowColor, 
      transparent: true, 
      opacity: 0.7 
    });
    const baseGeometry = new THREE.BoxGeometry(baseSize, baseHeight, baseSize);

    const baseMaterial = new THREE.MeshLambertMaterial({ color: baseColor });

    const base = new THREE.Mesh(baseGeometry, baseMaterial);

    base.position.set(0, baseHeight / 2, 0);

    base.name = "TowerCrane_Base";

    craneGroup.add(base);
    const halfTW = towerWidth / 2 - postRadius;

    const postPositions = [
      { x: halfTW, z: halfTW },
      { x: -halfTW, z: halfTW },
      { x: halfTW, z: -halfTW },
      { x: -halfTW, z: -halfTW },
    ];

    const postGeometry = new THREE.CylinderGeometry(postRadius, postRadius, towerHeight, 8);

    postPositions.forEach((pos, index) => {
      const post = new THREE.Mesh(postGeometry, towerMaterial);

      post.position.set(pos.x, baseHeight + towerHeight / 2, pos.z);

      post.name = `TowerCrane_Post_${index + 1}`;

      craneGroup.add(post);
    });
    const bracingCount = Math.floor(towerHeight / 4);

    const sectionHeight = towerHeight / bracingCount;

    for (let i = 0; i <= bracingCount; i++) {
      const y = baseHeight + i * sectionHeight;
      const braceGeomX = new THREE.BoxGeometry(towerWidth, 0.06, 0.06);

      const braceGeomZ = new THREE.BoxGeometry(0.06, 0.06, towerWidth);
      const braceFront = new THREE.Mesh(braceGeomX, towerMaterial);

      braceFront.position.set(0, y, halfTW);

      craneGroup.add(braceFront);

      const braceBack = new THREE.Mesh(braceGeomX, towerMaterial);

      braceBack.position.set(0, y, -halfTW);

      craneGroup.add(braceBack);
      const braceLeft = new THREE.Mesh(braceGeomZ, towerMaterial);

      braceLeft.position.set(-halfTW, y, 0);

      craneGroup.add(braceLeft);

      const braceRight = new THREE.Mesh(braceGeomZ, towerMaterial);

      braceRight.position.set(halfTW, y, 0);

      craneGroup.add(braceRight);
    }
    const slewingGroup = new THREE.Group();

    slewingGroup.name = "TowerCrane_Slewing";
    const platformGeom = new THREE.CylinderGeometry(1.5, 1.5, 0.5, 32);

    const platformMat = new THREE.MeshLambertMaterial({ color: 0x333333 });

    const platform = new THREE.Mesh(platformGeom, platformMat);

    platform.position.set(0, 0.25, 0);

    platform.name = "TowerCrane_Platform";

    slewingGroup.add(platform);
    const houseGeom = new THREE.BoxGeometry(3, 2, 2.5);

    const houseMat = new THREE.MeshLambertMaterial({ color: cabColor });

    const house = new THREE.Mesh(houseGeom, houseMat);

    house.position.set(-1, 1.5, 0);

    house.name = "TowerCrane_House";

    slewingGroup.add(house);
    const cabGeometry = new THREE.BoxGeometry(2.5, 2.5, 2);

    const cabMaterial = new THREE.MeshLambertMaterial({ color: cabColor });

    const cab = new THREE.Mesh(cabGeometry, cabMaterial);

    cab.position.set(1.5, jibBaseHeight - 0.5, 0);

    cab.name = "TowerCrane_Cab";

    slewingGroup.add(cab);
    const frontWindowGeom = new THREE.BoxGeometry(0.05, 2 * 0.6, 1.5 * 0.8);

    const frontWindow = new THREE.Mesh(frontWindowGeom, windowMaterial);

    frontWindow.position.set(2.75, jibBaseHeight - 0.5, 0);

    frontWindow.name = "TowerCrane_CabFrontWindow";

    slewingGroup.add(frontWindow);
    const bottomWindowGeom = new THREE.BoxGeometry(1.5, 0.05, 1.2);

    const bottomWindow = new THREE.Mesh(bottomWindowGeom, windowMaterial);

    bottomWindow.position.set(1.5, jibBaseHeight - 1.7, 0);

    bottomWindow.name = "TowerCrane_CabBottomWindow";

    slewingGroup.add(bottomWindow);
    const aFrameBaseY = jibBaseHeight;

    const aFramePeakY = aFrameBaseY + aFrameHeight;

    const aFrameSpread = 1.2;

    const aFrameLegLength = Math.sqrt(aFrameHeight * aFrameHeight + aFrameSpread * aFrameSpread);

    const aFrameLegGeom = new THREE.CylinderGeometry(0.1, 0.1, aFrameLegLength, 8);

    const aFrameAngle = Math.atan2(aFrameSpread, aFrameHeight);
    const aFrameLeft = new THREE.Mesh(aFrameLegGeom, jibMaterial);

    aFrameLeft.position.set(0, aFrameBaseY + aFrameHeight / 2, aFrameSpread / 2);

    aFrameLeft.rotation.x = aFrameAngle;

    aFrameLeft.name = "TowerCrane_AFrameLeft";

    slewingGroup.add(aFrameLeft);
    const aFrameRight = new THREE.Mesh(aFrameLegGeom, jibMaterial);

    aFrameRight.position.set(0, aFrameBaseY + aFrameHeight / 2, -aFrameSpread / 2);

    aFrameRight.rotation.x = -aFrameAngle;

    aFrameRight.name = "TowerCrane_AFrameRight";

    slewingGroup.add(aFrameRight);
    const peakGeom = new THREE.BoxGeometry(0.4, 0.4, 0.4);

    const peak = new THREE.Mesh(peakGeom, jibMaterial);

    peak.position.set(0, aFramePeakY, 0);

    peak.name = "TowerCrane_Peak";

    slewingGroup.add(peak);
    const aFrameCrossGeom = new THREE.BoxGeometry(0.08, 0.08, aFrameSpread * 2);

    const aFrameCross = new THREE.Mesh(aFrameCrossGeom, jibMaterial);

    aFrameCross.position.set(0, aFrameBaseY + aFrameHeight * 0.4, 0);

    aFrameCross.name = "TowerCrane_AFrameCross";

    slewingGroup.add(aFrameCross);
    const jibBottomY = jibBaseHeight;

    const jibTopY = jibBaseHeight + jibHeight;
    const topChordGeom = new THREE.BoxGeometry(boomLength, 0.12, 0.12);

    const topChord = new THREE.Mesh(topChordGeom, jibMaterial);

    topChord.position.set(boomLength / 2, jibTopY, 0);

    topChord.name = "TowerCrane_JibTopChord";

    slewingGroup.add(topChord);
    const bottomChordGeom = new THREE.BoxGeometry(boomLength, 0.1, 0.1);

    const bottomChordLeft = new THREE.Mesh(bottomChordGeom, jibMaterial);

    bottomChordLeft.position.set(boomLength / 2, jibBottomY, jibWidth / 2 - 0.05);

    bottomChordLeft.name = "TowerCrane_JibBottomChordLeft";

    slewingGroup.add(bottomChordLeft);

    const bottomChordRight = new THREE.Mesh(bottomChordGeom, jibMaterial);

    bottomChordRight.position.set(boomLength / 2, jibBottomY, -jibWidth / 2 + 0.05);

    bottomChordRight.name = "TowerCrane_JibBottomChordRight";

    slewingGroup.add(bottomChordRight);
    const jibVerticalCount = Math.floor(boomLength / 3);

    const verticalGeom = new THREE.BoxGeometry(0.08, jibHeight, 0.08);

    const tieGeom = new THREE.BoxGeometry(0.06, 0.06, jibWidth);

    for (let i = 0; i <= jibVerticalCount; i++) {
      const x = (i * boomLength) / jibVerticalCount;
      const vertLeft = new THREE.Mesh(verticalGeom, jibMaterial);

      vertLeft.position.set(x, jibBottomY + jibHeight / 2, jibWidth / 2 - 0.04);

      vertLeft.name = `TowerCrane_JibVertLeft_${i}`;

      slewingGroup.add(vertLeft);
      const vertRight = new THREE.Mesh(verticalGeom, jibMaterial);

      vertRight.position.set(x, jibBottomY + jibHeight / 2, -jibWidth / 2 + 0.04);

      vertRight.name = `TowerCrane_JibVertRight_${i}`;

      slewingGroup.add(vertRight);
      const tieBottom = new THREE.Mesh(tieGeom, jibMaterial);

      tieBottom.position.set(x, jibBottomY, 0);

      tieBottom.name = `TowerCrane_JibTieBottom_${i}`;

      slewingGroup.add(tieBottom);

      const tieTop = new THREE.Mesh(tieGeom, jibMaterial);

      tieTop.position.set(x, jibTopY, 0);

      tieTop.name = `TowerCrane_JibTieTop_${i}`;

      slewingGroup.add(tieTop);
    }
    const counterTopChordGeom = new THREE.BoxGeometry(counterJibLength, 0.12, 0.12);

    const counterTopChord = new THREE.Mesh(counterTopChordGeom, jibMaterial);

    counterTopChord.position.set(-counterJibLength / 2 - 1, jibTopY, 0);

    counterTopChord.name = "TowerCrane_CounterJibTopChord";

    slewingGroup.add(counterTopChord);
    const counterBottomChordGeom = new THREE.BoxGeometry(counterJibLength, 0.1, 0.1);

    const counterBottomLeft = new THREE.Mesh(counterBottomChordGeom, jibMaterial);

    counterBottomLeft.position.set(-counterJibLength / 2 - 1, jibBottomY, jibWidth / 2 - 0.05);

    counterBottomLeft.name = "TowerCrane_CounterJibBottomLeft";

    slewingGroup.add(counterBottomLeft);

    const counterBottomRight = new THREE.Mesh(counterBottomChordGeom, jibMaterial);

    counterBottomRight.position.set(-counterJibLength / 2 - 1, jibBottomY, -jibWidth / 2 + 0.05);

    counterBottomRight.name = "TowerCrane_CounterJibBottomRight";

    slewingGroup.add(counterBottomRight);
    const counterVertCount = Math.floor(counterJibLength / 2.5);

    for (let i = 0; i <= counterVertCount; i++) {
      const x = -1 - (i * counterJibLength) / counterVertCount;
      
      const vertL = new THREE.Mesh(verticalGeom, jibMaterial);

      vertL.position.set(x, jibBottomY + jibHeight / 2, jibWidth / 2 - 0.04);

      vertL.name = `TowerCrane_CounterJibVertL_${i}`;

      slewingGroup.add(vertL);

      const vertR = new THREE.Mesh(verticalGeom, jibMaterial);

      vertR.position.set(x, jibBottomY + jibHeight / 2, -jibWidth / 2 + 0.04);

      vertR.name = `TowerCrane_CounterJibVertR_${i}`;

      slewingGroup.add(vertR);
      const tie = new THREE.Mesh(tieGeom, jibMaterial);

      tie.position.set(x, jibBottomY, 0);

      tie.name = `TowerCrane_CounterJibTie_${i}`;

      slewingGroup.add(tie);
    }
    const counterweightGeometry = new THREE.BoxGeometry(counterweightSize, counterweightSize * 0.5, counterweightSize * 0.8);

    const counterweightMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
    
    const cwCount = Math.ceil(tonnage / 4);

    for (let i = 0; i < Math.min(cwCount, 4); i++) {
      const cw = new THREE.Mesh(counterweightGeometry, counterweightMaterial);

      cw.position.set(-counterJibLength + counterweightSize / 2, jibBottomY - 0.5 - i * counterweightSize * 0.45, 0);

      cw.name = `TowerCrane_Counterweight_${i + 1}`;

      slewingGroup.add(cw);
    }
    const pendantEndX = boomLength;

    const pendantStartY = aFramePeakY;

    const pendantEndY = jibTopY;

    const pendantDeltaX = pendantEndX;

    const pendantDeltaY = pendantStartY - pendantEndY;

    const pendantLength = Math.sqrt(pendantDeltaX * pendantDeltaX + pendantDeltaY * pendantDeltaY);

    const pendantAngle = Math.atan2(pendantDeltaY, pendantDeltaX);

    const pendantGeom = new THREE.CylinderGeometry(0.025, 0.025, pendantLength, 6);

    const pendant = new THREE.Mesh(pendantGeom, cableMaterial);

    pendant.position.set(pendantEndX / 2, (pendantStartY + pendantEndY) / 2, 0);

    pendant.rotation.z = Math.PI / 2 - pendantAngle;

    pendant.name = "TowerCrane_Pendant";

    slewingGroup.add(pendant);
    const counterPendantEndX = -counterJibLength - 1;

    const counterPendantDeltaX = Math.abs(counterPendantEndX);

    const counterPendantLength = Math.sqrt(counterPendantDeltaX * counterPendantDeltaX + pendantDeltaY * pendantDeltaY);

    const counterPendantAngle = Math.atan2(pendantDeltaY, counterPendantDeltaX);

    const counterPendantGeom = new THREE.CylinderGeometry(0.025, 0.025, counterPendantLength, 6);

    const counterPendant = new THREE.Mesh(counterPendantGeom, cableMaterial);

    counterPendant.position.set(counterPendantEndX / 2, (pendantStartY + pendantEndY) / 2, 0);

    counterPendant.rotation.z = Math.PI / 2 + counterPendantAngle;

    counterPendant.name = "TowerCrane_CounterPendant";

    slewingGroup.add(counterPendant);
    const trolleyX = trolleyPosition * boomLength;

    const trolleyGeom = new THREE.BoxGeometry(1.2, 0.4, jibWidth + 0.3);

    const trolleyMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });

    const trolley = new THREE.Mesh(trolleyGeom, trolleyMaterial);

    trolley.position.set(trolleyX, jibBottomY - 0.2, 0);

    trolley.name = "TowerCrane_Trolley";

    slewingGroup.add(trolley);
    const trolleyWheelGeom = new THREE.CylinderGeometry(0.1, 0.1, 0.08, 12);

    const trolleyWheelMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });
    
    [0.4, -0.4].forEach((xOff, i) => {
      [jibWidth / 2 - 0.05, -jibWidth / 2 + 0.05].forEach((zOff, j) => {
        const wheel = new THREE.Mesh(trolleyWheelGeom, trolleyWheelMaterial);

        wheel.position.set(trolleyX + xOff, jibBottomY, zOff);

        wheel.rotation.x = Math.PI / 2;

        wheel.name = `TowerCrane_TrolleyWheel_${i * 2 + j + 1}`;

        slewingGroup.add(wheel);
      });
    });
    const hookCableLength = 15;

    const hookCableGeom = new THREE.CylinderGeometry(0.02, 0.02, hookCableLength, 8);

    const hookCable = new THREE.Mesh(hookCableGeom, cableMaterial);

    hookCable.position.set(trolleyX, jibBottomY - 0.4 - hookCableLength / 2, 0);

    hookCable.name = "TowerCrane_HookCable";

    slewingGroup.add(hookCable);
    const hookBlockGeom = new THREE.BoxGeometry(0.5, 0.8, 0.5);

    const hookBlockMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });

    const hookBlock = new THREE.Mesh(hookBlockGeom, hookBlockMaterial);

    hookBlock.position.set(trolleyX, jibBottomY - 0.4 - hookCableLength - 0.4, 0);

    hookBlock.name = "TowerCrane_HookBlock";

    slewingGroup.add(hookBlock);
    const hookGeom = new THREE.TorusGeometry(0.2, 0.05, 8, 16, Math.PI * 1.5);

    const hookMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });

    const hook = new THREE.Mesh(hookGeom, hookMaterial);

    hook.position.set(trolleyX, jibBottomY - 0.4 - hookCableLength - 1, 0);

    hook.rotation.z = Math.PI / 2;

    hook.name = "TowerCrane_Hook";

    slewingGroup.add(hook);
    const driverPOV = ModelTool.createDriverPOV({
      position: { x: 2.0, y: jibBaseHeight - 0.3, z: 0 }, 
      lookDirection: { x: 1, y: 0, z: 0 } 
    });

    slewingGroup.add(driverPOV);
    slewingGroup.position.set(0, baseHeight + towerHeight, 0);

    slewingGroup.rotation.y = THREE.MathUtils.degToRad(boomRotation);

    craneGroup.add(slewingGroup);
    craneGroup.scale.set(scale, scale, scale);

    tools.world.placement.setPosition( craneGroup, position)

    return new InteractiveObject(craneGroup, { type: 'TowerCrane' });

  }

  static createForklift(options = {}) {
    const {
      position = { x: 0, y: 0, z: 0 },
      scale = 1,
      color = 0xffaa00,
    } = options;

    const group = new THREE.Group();

    group.isAECO = true;

    group.name = "Forklift";
    const chassisGeom = new THREE.BoxGeometry(2, 0.8, 1.2);

    const chassisMat = new THREE.MeshLambertMaterial({ color });

    const chassis = new THREE.Mesh(chassisGeom, chassisMat);

    chassis.position.y = 0.6;

    chassis.name = "Forklift_Chassis";

    group.add(chassis);
    const cabGeom = new THREE.BoxGeometry(1, 1.4, 1);

    const cabMat = new THREE.MeshLambertMaterial({ color: 0x333333, transparent: true, opacity: 0.5 });

    const cab = new THREE.Mesh(cabGeom, cabMat);

    cab.position.set(0.2, 1.7, 0);

    cab.name = "Forklift_Cab";

    group.add(cab);
    const mastGroup = new THREE.Group();

    mastGroup.name = "Forklift_Mast";

    mastGroup.position.set(-1.1, 0.5, 0);
    
    const mastGeom = new THREE.BoxGeometry(0.2, 3, 0.8);

    const mastMat = new THREE.MeshLambertMaterial({ color: 0x333333 });

    const mast = new THREE.Mesh(mastGeom, mastMat);

    mast.position.y = 1.5;

    mastGroup.add(mast);

    group.add(mastGroup);
    const forksGroup = new THREE.Group();

    forksGroup.name = "Forklift_Forks";

    forksGroup.position.set(-0.2, 0.2, 0); 
    
    const forkGeom = new THREE.BoxGeometry(1.2, 0.05, 0.15);

    const forkMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    
    const forkL = new THREE.Mesh(forkGeom, forkMat);

    forkL.position.set(-0.6, 0, 0.2);

    forksGroup.add(forkL);
    
    const forkR = new THREE.Mesh(forkGeom, forkMat);

    forkR.position.set(-0.6, 0, -0.2);

    forksGroup.add(forkR);
    
    mastGroup.add(forksGroup);
    const wheelGeom = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);

    wheelGeom.rotateX(Math.PI / 2); 

    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });

    const wheels = [
      { x: -0.8, z: 0.7, name: 'FL' },
      { x: -0.8, z: -0.7, name: 'FR' },
      { x: 0.8, z: 0.7, name: 'RL' },
      { x: 0.8, z: -0.7, name: 'RR' },
    ];

    wheels.forEach(w => {
      const wheel = new THREE.Mesh(wheelGeom, wheelMat);

      wheel.position.set(w.x, 0.3, w.z);

      wheel.name = `Forklift_Wheel_${w.name}`;

      group.add(wheel);
    });
    const driverPOV = ModelTool.createDriverPOV({
      position: {
        x: 0.2,   
        y: 1.7,   
        z: 0      
      },
      lookDirection: { x: -1, y: 0, z: 0 }  
    });

    group.add(driverPOV);

    tools.world.placement.setPosition( group, position);

    group.scale.set(scale, scale, scale);

    return new InteractiveObject(group, { type: 'Forklift' });
  }

  /**
   * Creates a lifting hoist (chain hoist / block and tackle)
   * @param {Object} options - Hoist configuration options
   * @param {Object} [options.position] - Position {x, y, z} of the hoist mounting point
   * @param {number} [options.scale=1] - Scale factor
   * @param {number} [options.chainLength=3] - Length of the chain in meters
   * @param {number} [options.hookSize=0.3] - Size of the hook
   * @param {number} [options.bodyColor=0xffcc00] - Color of the hoist body
   * @param {number} [options.chainColor=0x666666] - Color of the chain
   * @param {number} [options.hookColor=0x333333] - Color of the hook
   * @returns {Object} Object containing the hoist group
   */
  static createLiftingHoist(options = {}) {
    const {
      position = { x: 0, y: 0, z: 0 },
      scale = 1,
      chainLength = 3,
      hookSize = 0.3,
      bodyColor = 0xffcc00,
      chainColor = 0x666666,
      hookColor = 0x333333,
    } = options;

    const group = new THREE.Group();

    group.isAECO = true;

    group.name = "LiftingHoist";
    const bodyGeom = new THREE.BoxGeometry(0.4, 0.5, 0.3);

    const bodyMat = new THREE.MeshLambertMaterial({ color: bodyColor });

    const body = new THREE.Mesh(bodyGeom, bodyMat);

    body.position.y = 0;

    body.name = "Hoist_Body";

    group.add(body);
    const bracketGeom = new THREE.BoxGeometry(0.5, 0.1, 0.4);

    const bracketMat = new THREE.MeshLambertMaterial({ color: 0x333333 });

    const bracket = new THREE.Mesh(bracketGeom, bracketMat);

    bracket.position.y = 0.3;

    bracket.name = "Hoist_Bracket";

    group.add(bracket);
    const mountHookGeom = new THREE.TorusGeometry(0.1, 0.025, 8, 16, Math.PI);

    const mountHook = new THREE.Mesh(mountHookGeom, new THREE.MeshLambertMaterial({ color: hookColor }));

    mountHook.rotation.x = Math.PI;

    mountHook.position.y = 0.4;

    mountHook.name = "Hoist_MountHook";

    group.add(mountHook);
    const chainGroup = new THREE.Group();

    chainGroup.name = "Hoist_Chain";

    const linkCount = Math.floor(chainLength / 0.08);

    const linkGeom = new THREE.TorusGeometry(0.03, 0.008, 6, 8);

    const chainMat = new THREE.MeshLambertMaterial({ color: chainColor });

    for (let i = 0; i < linkCount; i++) {
      const link = new THREE.Mesh(linkGeom, chainMat);

      link.position.y = -0.25 - i * 0.06;
      if (i % 2 === 0) {
        link.rotation.x = Math.PI / 2;
      } else {
        link.rotation.z = Math.PI / 2;

        link.rotation.x = Math.PI / 2;
      }

      chainGroup.add(link);
    }

    group.add(chainGroup);
    const hookGroup = new THREE.Group();

    hookGroup.name = "Hoist_LoadHook";

    hookGroup.position.y = -chainLength;
    const shankGeom = new THREE.CylinderGeometry(0.03, 0.03, hookSize * 0.5, 8);

    const hookMat = new THREE.MeshLambertMaterial({ color: hookColor });

    const shank = new THREE.Mesh(shankGeom, hookMat);

    shank.position.y = hookSize * 0.25;

    hookGroup.add(shank);
    const hookCurveGeom = new THREE.TorusGeometry(hookSize * 0.4, 0.03, 8, 16, Math.PI * 1.3);

    const hookCurve = new THREE.Mesh(hookCurveGeom, hookMat);

    hookCurve.rotation.x = Math.PI / 2;

    hookCurve.rotation.z = -Math.PI * 0.15;

    hookCurve.position.y = -hookSize * 0.1;

    hookGroup.add(hookCurve);
    const latchGeom = new THREE.BoxGeometry(hookSize * 0.6, 0.015, 0.02);

    const latchMat = new THREE.MeshLambertMaterial({ color: 0xff0000 });

    const latch = new THREE.Mesh(latchGeom, latchMat);

    latch.position.set(hookSize * 0.15, -hookSize * 0.2, 0);

    latch.rotation.z = -Math.PI * 0.2;

    hookGroup.add(latch);

    group.add(hookGroup);

    tools.world.placement.setPosition( group, position);

    group.scale.set(scale, scale, scale);

    return { object: group };
  }

  static createDigger(options = {}) {
    const {
      position = { x: 0, y: 0, z: 0 },
      scale = 1,
      color = 0xffcc00,
      trackColor = 0x333333,
      cabColor = 0x333333,
    } = options;

    const group = new THREE.Group();

    group.isAECO = true;

    group.name = "Digger";
    const undercarriage = new THREE.Group();

    undercarriage.name = "Digger_Undercarriage";

    group.add(undercarriage);
    const trackGeom = new THREE.BoxGeometry(3.5, 0.8, 0.6);

    const trackMat = new THREE.MeshLambertMaterial({ color: trackColor });
    
    const leftTrack = new THREE.Mesh(trackGeom, trackMat);

    leftTrack.position.set(0, 0.4, 1);

    undercarriage.add(leftTrack);

    const rightTrack = new THREE.Mesh(trackGeom, trackMat);

    rightTrack.position.set(0, 0.4, -1);

    undercarriage.add(rightTrack);
    const chassisGeom = new THREE.BoxGeometry(2, 0.4, 1.4);

    const chassisMat = new THREE.MeshLambertMaterial({ color: 0x222222 });

    const chassis = new THREE.Mesh(chassisGeom, chassisMat);

    chassis.position.set(0, 0.6, 0);

    undercarriage.add(chassis);
    const bodyGroup = new THREE.Group();

    bodyGroup.name = "Digger_Body";

    bodyGroup.position.set(0, 0.8, 0); 

    group.add(bodyGroup);
    const platformGeom = new THREE.BoxGeometry(2.5, 0.8, 2.2);

    const platformMat = new THREE.MeshLambertMaterial({ color: color });

    const platform = new THREE.Mesh(platformGeom, platformMat);

    platform.position.set(0.2, 0.4, 0);

    bodyGroup.add(platform);
    const cabGeom = new THREE.BoxGeometry(1.2, 1.4, 0.8);

    const cabMat = new THREE.MeshLambertMaterial({ color: cabColor, transparent: true, opacity: 0.6 });

    const cab = new THREE.Mesh(cabGeom, cabMat);

    cab.position.set(-0.2, 1.5, 0.5);

    bodyGroup.add(cab);
    const driverPOV = ModelTool.createDriverPOV({
      position: {
        x: -0.2,   
        y: 1.8,    
        z: 0.5     
      },
      lookDirection: { x: -1, y: -0.2, z: 0 }  
    });

    bodyGroup.add(driverPOV);
    const engineGeom = new THREE.BoxGeometry(1.0, 1.0, 2.2);

    const engineMat = new THREE.MeshLambertMaterial({ color: color });

    const engine = new THREE.Mesh(engineGeom, engineMat);

    engine.position.set(0.95, 0.5, 0);

    bodyGroup.add(engine);
    const boomPivot = new THREE.Group();

    boomPivot.name = "Digger_Boom_Pivot";

    boomPivot.position.set(-0.8, 0.6, 0); 

    bodyGroup.add(boomPivot);
    const boomGroup = new THREE.Group();

    boomGroup.name = "Digger_Boom";

    boomPivot.add(boomGroup);
    const boomLowerGeom = new THREE.BoxGeometry(2.5, 0.4, 0.4);

    const boomMat = new THREE.MeshLambertMaterial({ color: color });

    const boomLower = new THREE.Mesh(boomLowerGeom, boomMat);

    boomLower.position.set(-1.1, 0.8, 0);

    boomLower.rotation.z = -Math.PI / 6; 

    boomGroup.add(boomLower);
    const boomUpperGeom = new THREE.BoxGeometry(2.0, 0.4, 0.4);

    const boomUpper = new THREE.Mesh(boomUpperGeom, boomMat);

    boomUpper.position.set(-2.8, 1.8, 0); 

    boomUpper.rotation.z = Math.PI / 8; 

    boomGroup.add(boomUpper);
    const cylGeom = new THREE.CylinderGeometry(0.1, 0.1, 1.5);

    const cylMat = new THREE.MeshLambertMaterial({ color: 0xcccccc });

    const boomCyl = new THREE.Mesh(cylGeom, cylMat);

    boomCyl.rotation.z = -Math.PI / 4;

    boomCyl.position.set(-1.0, 0.5, 0);

    boomGroup.add(boomCyl);
    const stickPivot = new THREE.Group();

    stickPivot.name = "Digger_Stick_Pivot";

    stickPivot.position.set(-3.6, 1.5, 0); 

    boomGroup.add(stickPivot);

    const stickGeom = new THREE.BoxGeometry(2.0, 0.3, 0.3);

    const stick = new THREE.Mesh(stickGeom, boomMat);

    stick.position.set(-0.8, -0.5, 0);

    stick.rotation.z = Math.PI / 2.5; 

    stickPivot.add(stick);
    const stickCyl = new THREE.Mesh(cylGeom, cylMat);

    stickCyl.rotation.z = -Math.PI / 2;

    stickCyl.position.set(0.5, 0.2, 0);

    stickPivot.add(stickCyl);
    const bucketPivot = new THREE.Group();

    bucketPivot.name = "Digger_Bucket_Pivot";

    bucketPivot.position.set(-1.4, -1.8, 0); 

    stick.add(bucketPivot);
    const bucketShape = new THREE.Shape();

    bucketShape.moveTo(0, 0);

    bucketShape.lineTo(0.6, 0);

    bucketShape.lineTo(0.8, 0.5);

    bucketShape.lineTo(0.5, 0.8);

    bucketShape.lineTo(0, 0.8);

    bucketShape.lineTo(0, 0);

    const bucketExtrudeSettings = {
      steps: 1,
      depth: 0.6,
      bevelEnabled: false,
    };

    const bucketGeom = new THREE.ExtrudeGeometry(bucketShape, bucketExtrudeSettings);

    const bucketMat = new THREE.MeshLambertMaterial({ color: 0x222222 });

    const bucket = new THREE.Mesh(bucketGeom, bucketMat);
    bucket.geometry.center();

    bucket.rotation.x = -Math.PI / 2; 

    bucket.rotation.z = -Math.PI / 2; 
    
    bucketPivot.add(bucket);
    tools.world.placement.setPosition( group, position);

    group.scale.set(scale, scale, scale);

    return new InteractiveObject(group, { type: 'Digger' });
  }

  static createRobot(config = {}) {
    const {
      scale = 1,
      color = 0x00ff00, 
      position = { x: 0, y: 0, z: 0 },
    } = config;

    const group = new THREE.Group();

    group.isAECO = true;

    group.name = "Robot";
    const bodyGeom = new THREE.BoxGeometry(0.8, 1, 0.5);

    const bodyMat = new THREE.MeshLambertMaterial({ color });

    const body = new THREE.Mesh(bodyGeom, bodyMat);

    body.position.y = 1.5;

    body.name = "Robot_Body";

    group.add(body);
    const headGeom = new THREE.BoxGeometry(0.4, 0.4, 0.4);

    const headMat = new THREE.MeshLambertMaterial({ color: 0xffffff });

    const head = new THREE.Mesh(headGeom, headMat);

    head.position.set(0, 0.7, 0); 

    head.name = "Robot_Head";

    body.add(head);
    const eyeGeom = new THREE.BoxGeometry(0.05, 0.05, 0.1);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });

    const eyeL = new THREE.Mesh(eyeGeom, eyeMat);

    eyeL.position.set(0.2, 0, 0.1);

    head.add(eyeL);

    const eyeR = new THREE.Mesh(eyeGeom, eyeMat);

    eyeR.position.set(0.2, 0, -0.1);

    head.add(eyeR);
    const armGeom = new THREE.BoxGeometry(0.2, 0.8, 0.2);

    const armMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
    
    const armL = new THREE.Mesh(armGeom, armMat);

    armL.position.set(0, 0, 0.4);

    armL.name = "Robot_Arm_L";

    body.add(armL);

    const armR = new THREE.Mesh(armGeom, armMat);

    armR.position.set(0, 0, -0.4);

    armR.name = "Robot_Arm_R";

    body.add(armR);
    const legGeom = new THREE.BoxGeometry(0.25, 1, 0.25);

    const legMat = new THREE.MeshLambertMaterial({ color: 0x666666 });

    const legL = new THREE.Mesh(legGeom, legMat);

    legL.position.set(0, 1.0, 0.15); 

    legL.geometry.translate(0, -0.5, 0); 

    legL.name = "Robot_Leg_L";

    group.add(legL);

    const legR = new THREE.Mesh(legGeom, legMat);

    legR.position.set(0, 1.0, -0.15);

    legR.geometry.translate(0, -0.5, 0);

    legR.name = "Robot_Leg_R";

    group.add(legR);

    group.scale.set(scale, scale, scale);

    tools.world.placement.setPosition( group, position);

    return new InteractiveObject(group, { type: 'Robot' });
  }

  /**
   * Creates a simple drone with 4 circular helices (quadcopter)
   * @param {Object} options - Drone configuration options
   * @param {Object} [options.position] - Position {x, y, z} of the drone
   * @param {number} [options.scale=1] - Scale factor for the drone
   * @param {number} [options.bodyColor=0x333333] - Color of the drone body
   * @param {number} [options.armColor=0x444444] - Color of the arms
   * @param {number} [options.propellerColor=0x222222] - Color of the propeller blades
   * @param {number} [options.motorColor=0x666666] - Color of the motors
   * @param {number} [options.ledColor=0x00ff00] - Color of LED indicators
   * @returns {THREE.Group} The drone group wrapped in InteractiveObject
   */
  static createDrone(options = {}) {
    const {
      position = { x: 0, y: 0, z: 0 },
      scale = 1,
      bodyColor = 0x333333,
      armColor = 0x444444,
      propellerColor = 0x222222,
      motorColor = 0x666666,
      ledColor = 0x00ff00,
    } = options;

    const droneGroup = new THREE.Group();

    droneGroup.isAECO = true;

    droneGroup.name = "Drone";
    const bodyGroup = new THREE.Group();

    bodyGroup.name = "Drone_Body";
    const bodyRadius = 0.15;

    const bodyHeight = 0.08;

    const bodyGeometry = new THREE.CylinderGeometry(bodyRadius, bodyRadius, bodyHeight, 16);

    const bodyMaterial = new THREE.MeshLambertMaterial({ color: bodyColor });

    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);

    body.rotation.x = Math.PI / 2;

    body.name = "Drone_CentralBody";

    bodyGroup.add(body);
    const domeGeometry = new THREE.SphereGeometry(bodyRadius * 0.8, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);

    const domeMaterial = new THREE.MeshLambertMaterial({ color: bodyColor });

    const dome = new THREE.Mesh(domeGeometry, domeMaterial);

    dome.position.set(0, 0, bodyHeight / 2);

    dome.name = "Drone_Dome";

    bodyGroup.add(dome);
    const armLength = 0.25;

    const armWidth = 0.03;

    const armHeight = 0.02;

    const armGeometry = new THREE.BoxGeometry(armLength, armWidth, armHeight);

    const armMaterial = new THREE.MeshLambertMaterial({ color: armColor });
    const armAngles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];

    const motorPositions = [];

    armAngles.forEach((angle, index) => {
      const arm = new THREE.Mesh(armGeometry, armMaterial);

      const armCenterDistance = bodyRadius + armLength / 2 - 0.02;

      arm.position.set(
        Math.cos(angle) * armCenterDistance,
        Math.sin(angle) * armCenterDistance,
        0
      );

      arm.rotation.z = angle;

      arm.name = `Drone_Arm_${index + 1}`;

      bodyGroup.add(arm);
      const motorDistance = bodyRadius + armLength - 0.02;

      motorPositions.push({
        x: Math.cos(angle) * motorDistance,
        y: Math.sin(angle) * motorDistance,
        z: 0
      });
    });
    const motorRadius = 0.025;

    const motorHeight = 0.03;

    const motorGeometry = new THREE.CylinderGeometry(motorRadius, motorRadius, motorHeight, 12);

    const motorMaterial = new THREE.MeshLambertMaterial({ color: motorColor });

    const propellerRadius = 0.08;

    const propellerThickness = 0.005;

    const propellerMaterial = new THREE.MeshLambertMaterial({ color: propellerColor });
    const helixTorusRadius = propellerRadius;

    const helixTubeRadius = 0.003;

    motorPositions.forEach((pos, index) => {
      
      const motor = new THREE.Mesh(motorGeometry, motorMaterial);

      motor.position.set(pos.x, pos.y, pos.z + motorHeight / 2 + armHeight / 2);

      motor.rotation.x = Math.PI / 2;

      motor.name = `Drone_Motor_${index + 1}`;

      bodyGroup.add(motor);
      const propellerGroup = new THREE.Group();

      propellerGroup.name = `Drone_Propeller_${index + 1}`;
      const helixGeometry = new THREE.TorusGeometry(helixTorusRadius, helixTubeRadius, 8, 32);

      const helixMaterial = new THREE.MeshLambertMaterial({ color: propellerColor });

      const helix = new THREE.Mesh(helixGeometry, helixMaterial);

      helix.name = `Drone_Helix_${index + 1}`;

      propellerGroup.add(helix);
      const bladeGeometry = new THREE.BoxGeometry(propellerRadius * 2, 0.015, propellerThickness);

      const blade1 = new THREE.Mesh(bladeGeometry, propellerMaterial);

      blade1.name = `Drone_Blade_${index + 1}_A`;

      propellerGroup.add(blade1);

      const blade2 = new THREE.Mesh(bladeGeometry, propellerMaterial);

      blade2.rotation.z = Math.PI / 2;

      blade2.name = `Drone_Blade_${index + 1}_B`;

      propellerGroup.add(blade2);
      propellerGroup.position.set(pos.x, pos.y, pos.z + motorHeight + armHeight / 2 + 0.01);

      bodyGroup.add(propellerGroup);
    });
    const legRadius = 0.008;

    const legHeight = 0.06;

    const legGeometry = new THREE.CylinderGeometry(legRadius, legRadius, legHeight, 8);

    const legMaterial = new THREE.MeshLambertMaterial({ color: armColor });

    const legAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];

    const legDistance = bodyRadius * 0.7;

    legAngles.forEach((angle, index) => {
      const leg = new THREE.Mesh(legGeometry, legMaterial);

      leg.position.set(
        Math.cos(angle) * legDistance,
        Math.sin(angle) * legDistance,
        -bodyHeight / 2 - legHeight / 2
      );

      leg.rotation.x = Math.PI / 2;

      leg.name = `Drone_Leg_${index + 1}`;

      bodyGroup.add(leg);
      const padGeometry = new THREE.SphereGeometry(legRadius * 1.5, 8, 8);

      const pad = new THREE.Mesh(padGeometry, legMaterial);

      pad.position.set(
        Math.cos(angle) * legDistance,
        Math.sin(angle) * legDistance,
        -bodyHeight / 2 - legHeight
      );

      pad.name = `Drone_LandingPad_${index + 1}`;

      bodyGroup.add(pad);
    });
    const ledGeometry = new THREE.SphereGeometry(0.01, 8, 8);

    const ledMaterialFront = new THREE.MeshBasicMaterial({ 
      color: ledColor,
    });

    const ledMaterialBack = new THREE.MeshBasicMaterial({ 
      color: 0xff0000,
    });
    const frontLed = new THREE.Mesh(ledGeometry, ledMaterialFront);

    frontLed.position.set(bodyRadius + 0.01, 0, 0);

    frontLed.name = "Drone_LED_Front";

    bodyGroup.add(frontLed);
    const backLed = new THREE.Mesh(ledGeometry, ledMaterialBack);

    backLed.position.set(-bodyRadius - 0.01, 0, 0);

    backLed.name = "Drone_LED_Back";

    bodyGroup.add(backLed);
    const driverPOV = ModelTool.createDriverPOV({
      position: { x: bodyRadius + 0.02, y: 0, z: 0 }, 
      lookDirection: { x: 1, y: 0, z: 0 } 
    });

    bodyGroup.add(driverPOV);
    bodyGroup.rotation.x = -Math.PI / 2;

    droneGroup.add(bodyGroup);
    droneGroup.scale.set(scale, scale, scale);

    tools.world.placement.setPosition( droneGroup, position)

    return new InteractiveObject(droneGroup, { type: 'Drone' });
  }
  /**
   * Makes any THREE.Object3D interactive with animation controls
   * @param {THREE.Object3D} object - The object to make interactive
   * @param {Object} [options] - Options passed to InteractiveObject
   * @returns {InteractiveObject} The interactive wrapper
   */
  static makeInteractive(object, options = {}) {
    return makeInteractive(object, options);
  }

  /**
   * Creates an interactive mobile crane with animation controls
   * @param {Object} options - Same options as createMobileCrane
   * @returns {InteractiveObject} Interactive mobile crane wrapper
   * 
   * @example
   * const crane = ModelTool.createInteractiveMobileCrane({ position: { x: 0, y: 0, z: 0 } });
   * crane.contractOutriggers(0.5);
   * crane.setBoomAngle(60, 1);
   * crane.setBoomRotation(90, 0.5);
   */
  static createInteractiveMobileCrane(options = {}) {
    const craneGroup = ModelTool.createMobileCrane(options);

    return new InteractiveObject(craneGroup, { type: 'MobileCrane' });
  }

  /**
   * Creates an interactive tower crane with animation controls
   * @param {Object} options - Same options as createTowerCrane
   * @returns {InteractiveObject} Interactive tower crane wrapper
   * 
   * @example
   * const crane = ModelTool.createInteractiveTowerCrane({ towerHeight: 50 });
   * crane.setTrolleyPosition(0.8, 1);
   * crane.setBoomRotation(180, 0.5);
   * crane.setHookHeight(25, 1);
   */
  static createInteractiveTowerCrane(options = {}) {
    const craneGroup = ModelTool.createTowerCrane(options);
    const interactive = new InteractiveObject(craneGroup, { type: 'TowerCrane' });
    interactive._config = {
      boomLength: options.boomLength || 50,
      towerHeight: options.towerHeight || 40,
      jibBaseHeight: 2,
    };
    
    return interactive;
  }

  /**
   * Creates an interactive truck with animation controls
   * @param {Object} options - Same options as createTruck
   * @returns {InteractiveObject} Interactive truck wrapper
   * 
   * @example
   * const truck = ModelTool.createInteractiveTruck({ position: { x: 10, y: 0, z: 0 } });
   * truck.moveTo({ x: 50, y: 0, z: 20 }, 1);
   * truck.rotateTo(90, 0.5);
   */
  static createInteractiveTruck(options = {}) {
    const truckGroup = ModelTool.createTruck(options);

    return new InteractiveObject(truckGroup, { type: 'Truck' });
  }
  /**
   * Creates a safety post (delineator post) with reflective bands
   * @param {Object} options - Safety post configuration options
   * @param {Object} [options.position] - Position {x, y, z} of the post base
   * @param {number} [options.scale=1] - Scale factor
   * @param {number} [options.height=1.2] - Height of the post in meters
   * @param {number} [options.postColor=0xff6600] - Color of the post (orange)
   * @param {number} [options.stripeColor=0xffffff] - Color of reflective stripes
   * @param {number} [options.baseColor=0x333333] - Color of the base
   * @returns {Object} Object containing the safety post group
   */
  static createSafetyPost(options = {}) {
    const {
      position = { x: 0, y: 0, z: 0 },
      scale = 1,
      height = 1.2,
      postColor = 0xff6600,
      stripeColor = 0xffffff,
      baseColor = 0x333333,
    } = options;

    const group = new THREE.Group();

    group.isAECO = true;

    group.name = "SafetyPost";
    const baseGeom = new THREE.CylinderGeometry(0.2, 0.22, 0.08, 16);

    const baseMat = new THREE.MeshLambertMaterial({ color: baseColor });

    const base = new THREE.Mesh(baseGeom, baseMat);

    base.position.y = 0.04;

    base.name = "SafetyPost_Base";

    group.add(base);
    const postRadius = 0.04;

    const postGeom = new THREE.CylinderGeometry(postRadius, postRadius * 1.2, height, 12);

    const postMat = new THREE.MeshLambertMaterial({ color: postColor });

    const post = new THREE.Mesh(postGeom, postMat);

    post.position.y = 0.08 + height / 2;

    post.name = "SafetyPost_Body";

    group.add(post);
    const stripeCount = 3;

    const stripeHeight = 0.06;

    const stripeRadius = postRadius + 0.002;

    const stripeMat = new THREE.MeshLambertMaterial({ 
      color: stripeColor,
      emissive: stripeColor,
      emissiveIntensity: 0.3
    });

    for (let i = 0; i < stripeCount; i++) {
      const stripeGeom = new THREE.CylinderGeometry(stripeRadius, stripeRadius, stripeHeight, 12);

      const stripe = new THREE.Mesh(stripeGeom, stripeMat);
      stripe.position.y = 0.08 + height * 0.5 + (i - 1) * (height * 0.2);

      stripe.name = `SafetyPost_Stripe_${i + 1}`;

      group.add(stripe);
    }
    const capGeom = new THREE.SphereGeometry(postRadius * 1.3, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);

    const capMat = new THREE.MeshLambertMaterial({ color: postColor });

    const cap = new THREE.Mesh(capGeom, capMat);

    cap.position.y = 0.08 + height;

    cap.name = "SafetyPost_Cap";

    group.add(cap);

    tools.world.placement.setPosition( group, position);

    group.scale.set(scale, scale, scale);

    return { object: group };
  }

  /**
   * Creates a safety traffic cone
   * @param {Object} options - Safety cone configuration options
   * @param {Object} [options.position] - Position {x, y, z} of the cone base
   * @param {number} [options.scale=1] - Scale factor
   * @param {number} [options.height=0.75] - Height of the cone in meters
   * @param {number} [options.coneColor=0xff6600] - Color of the cone (orange)
   * @param {number} [options.stripeColor=0xffffff] - Color of reflective stripes
   * @param {number} [options.baseColor=0x333333] - Color of the base
   * @returns {Object} Object containing the safety cone group
   */
  static createSafetyCone(options = {}) {
    const {
      position = { x: 0, y: 0, z: 0 },
      scale = 1,
      height = 0.75,
      coneColor = 0xff6600,
      stripeColor = 0xffffff,
      baseColor = 0x333333,
    } = options;

    const group = new THREE.Group();

    group.isAECO = true;

    group.name = "SafetyCone";
    const baseSize = height * 0.6;

    const baseGeom = new THREE.BoxGeometry(baseSize, 0.03, baseSize);

    const baseMat = new THREE.MeshLambertMaterial({ color: baseColor });

    const base = new THREE.Mesh(baseGeom, baseMat);

    base.position.y = 0.015;

    base.name = "SafetyCone_Base";

    group.add(base);
    const bottomRadius = height * 0.2;

    const topRadius = height * 0.03;

    const coneGeom = new THREE.CylinderGeometry(topRadius, bottomRadius, height, 16, 1, true);

    const coneMat = new THREE.MeshLambertMaterial({ 
      color: coneColor,
      side: THREE.DoubleSide
    });

    const cone = new THREE.Mesh(coneGeom, coneMat);

    cone.position.y = 0.03 + height / 2;

    cone.name = "SafetyCone_Body";

    group.add(cone);
    const stripe1Height = height * 0.12;

    const stripe2Height = height * 0.1;

    const stripeMat = new THREE.MeshLambertMaterial({ 
      color: stripeColor,
      emissive: stripeColor,
      emissiveIntensity: 0.3,
      side: THREE.DoubleSide
    });
    const stripe1Y = 0.03 + height * 0.35;

    const stripe1BottomRadius = bottomRadius * (1 - 0.35 + stripe1Height / height / 2);

    const stripe1TopRadius = bottomRadius * (1 - 0.35 - stripe1Height / height / 2);

    const stripe1Geom = new THREE.CylinderGeometry(
      stripe1TopRadius * 0.85,
      stripe1BottomRadius * 0.85,
      stripe1Height,
      16, 1, true
    );

    const stripe1 = new THREE.Mesh(stripe1Geom, stripeMat);

    stripe1.position.y = stripe1Y;

    stripe1.name = "SafetyCone_Stripe_1";

    group.add(stripe1);
    const stripe2Y = 0.03 + height * 0.6;

    const stripe2BottomRadius = bottomRadius * (1 - 0.6 + stripe2Height / height / 2);

    const stripe2TopRadius = bottomRadius * (1 - 0.6 - stripe2Height / height / 2);

    const stripe2Geom = new THREE.CylinderGeometry(
      stripe2TopRadius * 0.75,
      stripe2BottomRadius * 0.75,
      stripe2Height,
      16, 1, true
    );

    const stripe2 = new THREE.Mesh(stripe2Geom, stripeMat);

    stripe2.position.y = stripe2Y;

    stripe2.name = "SafetyCone_Stripe_2";

    group.add(stripe2);
    const tipGeom = new THREE.ConeGeometry(topRadius, height * 0.05, 8);

    const tipMat = new THREE.MeshLambertMaterial({ color: coneColor });

    const tip = new THREE.Mesh(tipGeom, tipMat);

    tip.position.y = 0.03 + height + height * 0.025;

    tip.name = "SafetyCone_Tip";

    group.add(tip);

    tools.world.placement.setPosition( group, position);

    group.scale.set(scale, scale, scale);

    return { object: group };
  }

  /**
   * Creates a safety barrier (jersey barrier / construction barrier)
   * @param {Object} options - Safety barrier configuration options
   * @param {Object} [options.position] - Position {x, y, z} of the barrier center
   * @param {number} [options.scale=1] - Scale factor
   * @param {number} [options.length=2] - Length of the barrier in meters
   * @param {number} [options.height=0.8] - Height of the barrier in meters
   * @param {string} [options.type='jersey'] - Type: 'jersey' (concrete), 'plastic', 'fence'
   * @param {number} [options.color=0xcccccc] - Main color
   * @param {number} [options.stripeColor=0xff6600] - Color of warning stripes
   * @returns {Object} Object containing the safety barrier group
   */
  static createSafetyBarrier(options = {}) {
    const {
      position = { x: 0, y: 0, z: 0 },
      scale = 1,
      length = 2,
      height = 0.8,
      type = 'jersey',
      color = 0xcccccc,
      stripeColor = 0xff6600,
    } = options;

    const group = new THREE.Group();

    group.isAECO = true;

    group.name = "SafetyBarrier";
    if (type === 'jersey') {
      const shape = new THREE.Shape();

      const baseWidth = 0.6;

      const topWidth = 0.15;

      const slopeBreak = height * 0.4; 
      shape.moveTo(-baseWidth / 2, 0);

      shape.lineTo(-baseWidth / 2, slopeBreak * 0.3);

      shape.lineTo(-topWidth / 2 - 0.1, slopeBreak);

      shape.lineTo(-topWidth / 2, height);

      shape.lineTo(topWidth / 2, height);

      shape.lineTo(topWidth / 2 + 0.1, slopeBreak);

      shape.lineTo(baseWidth / 2, slopeBreak * 0.3);

      shape.lineTo(baseWidth / 2, 0);

      shape.lineTo(-baseWidth / 2, 0);

      const extrudeSettings = {
        steps: 1,
        depth: length,
        bevelEnabled: false,
      };

      const barrierGeom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      barrierGeom.rotateY(Math.PI / 2);

      barrierGeom.translate(-length / 2, 0, 0);

      const barrierMat = new THREE.MeshLambertMaterial({ color: color });

      const barrier = new THREE.Mesh(barrierGeom, barrierMat);

      barrier.name = "SafetyBarrier_Body";

      group.add(barrier);
      const stripeGeom = new THREE.BoxGeometry(length * 0.15, topWidth * 0.8, 0.02);

      const stripeMat = new THREE.MeshLambertMaterial({ color: stripeColor });

      for (let i = 0; i < 3; i++) {
        const stripe = new THREE.Mesh(stripeGeom, stripeMat);

        stripe.position.set((i - 1) * (length * 0.35), 0, height + 0.01);

        stripe.name = `SafetyBarrier_Stripe_${i + 1}`;

        group.add(stripe);
      }

    } else if (type === 'plastic') {
      const barrierDepth = 0.5;
      
      const barrierGeom = new THREE.BoxGeometry(length, height, barrierDepth);

      const barrierMat = new THREE.MeshLambertMaterial({ 
        color: stripeColor,
        transparent: true,
        opacity: 0.9
      });

      const barrier = new THREE.Mesh(barrierGeom, barrierMat);

      barrier.position.y = height / 2;

      barrier.name = "SafetyBarrier_Body";

      group.add(barrier);
      const stripeMat = new THREE.MeshLambertMaterial({ 
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.2
      });

      const stripeThickness = 0.01;

      const stripeHeightSize = height * 0.12;
      const stripeGeomFront = new THREE.BoxGeometry(length * 0.95, stripeHeightSize, stripeThickness);

      const stripe1Front = new THREE.Mesh(stripeGeomFront, stripeMat);

      stripe1Front.position.set(0, height * 0.25, barrierDepth / 2 + stripeThickness / 2);

      stripe1Front.name = "SafetyBarrier_Stripe_Front_1";

      group.add(stripe1Front);

      const stripe2Front = new THREE.Mesh(stripeGeomFront, stripeMat);

      stripe2Front.position.set(0, height * 0.75, barrierDepth / 2 + stripeThickness / 2);

      stripe2Front.name = "SafetyBarrier_Stripe_Front_2";

      group.add(stripe2Front);
      const stripe1Back = new THREE.Mesh(stripeGeomFront, stripeMat);

      stripe1Back.position.set(0, height * 0.25, -barrierDepth / 2 - stripeThickness / 2);

      stripe1Back.name = "SafetyBarrier_Stripe_Back_1";

      group.add(stripe1Back);

      const stripe2Back = new THREE.Mesh(stripeGeomFront, stripeMat);

      stripe2Back.position.set(0, height * 0.75, -barrierDepth / 2 - stripeThickness / 2);

      stripe2Back.name = "SafetyBarrier_Stripe_Back_2";

      group.add(stripe2Back);
      const capGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.08, 8);

      const capMat = new THREE.MeshLambertMaterial({ color: 0x333333 });

      const cap = new THREE.Mesh(capGeom, capMat);

      cap.position.set(0, height + 0.04, 0);

      cap.name = "SafetyBarrier_Cap";

      group.add(cap);

    } else if (type === 'fence') {
      const postHeight = height;

      const postRadius = 0.025;

      const postMat = new THREE.MeshLambertMaterial({ color: 0x666666 });
      const postGeom = new THREE.CylinderGeometry(postRadius, postRadius, postHeight, 8);
      const leftPost = new THREE.Mesh(postGeom, postMat);

      leftPost.position.set(-length / 2 + 0.05, postHeight / 2, 0);

      leftPost.name = "SafetyBarrier_LeftPost";

      group.add(leftPost);
      const rightPost = new THREE.Mesh(postGeom.clone(), postMat);

      rightPost.position.set(length / 2 - 0.05, postHeight / 2, 0);

      rightPost.name = "SafetyBarrier_RightPost";

      group.add(rightPost);
      const railGeom = new THREE.CylinderGeometry(postRadius * 0.8, postRadius * 0.8, length - 0.1, 8);

      railGeom.rotateZ(Math.PI / 2); 

      const topRail = new THREE.Mesh(railGeom, postMat);

      topRail.position.set(0, postHeight - 0.05, 0);

      topRail.name = "SafetyBarrier_TopRail";

      group.add(topRail);
      const bottomRail = new THREE.Mesh(railGeom.clone(), postMat);

      bottomRail.position.set(0, 0.1, 0);

      bottomRail.name = "SafetyBarrier_BottomRail";

      group.add(bottomRail);
      const meshMat = new THREE.MeshLambertMaterial({ color: stripeColor });

      const meshSpacing = 0.1;

      const meshWireRadius = 0.008;
      const vWireGeom = new THREE.CylinderGeometry(meshWireRadius, meshWireRadius, postHeight - 0.2, 4);

      const vWireCount = Math.floor((length - 0.2) / meshSpacing);

      for (let i = 0; i <= vWireCount; i++) {
        const wire = new THREE.Mesh(vWireGeom, meshMat);

        wire.position.set(-length / 2 + 0.1 + i * meshSpacing, postHeight / 2, 0);

        group.add(wire);
      }
      const hWireGeom = new THREE.CylinderGeometry(meshWireRadius, meshWireRadius, length - 0.2, 4);

      hWireGeom.rotateZ(Math.PI / 2); 

      const hWireCount = Math.floor((postHeight - 0.2) / meshSpacing);

      for (let i = 0; i <= hWireCount; i++) {
        const wire = new THREE.Mesh(hWireGeom, meshMat);

        wire.position.set(0, 0.1 + i * meshSpacing, 0);

        group.add(wire);
      }
      const footGeom = new THREE.BoxGeometry(0.15, 0.05, 0.4);

      const footMat = new THREE.MeshLambertMaterial({ color: 0x666666 });
      const leftFootFront = new THREE.Mesh(footGeom, footMat);

      leftFootFront.position.set(-length / 2 + 0.05, 0.025, 0.2);

      leftFootFront.name = "SafetyBarrier_LeftFoot_Front";

      group.add(leftFootFront);

      const leftFootBack = new THREE.Mesh(footGeom, footMat);

      leftFootBack.position.set(-length / 2 + 0.05, 0.025, -0.2);

      leftFootBack.name = "SafetyBarrier_LeftFoot_Back";

      group.add(leftFootBack);
      const rightFootFront = new THREE.Mesh(footGeom, footMat);

      rightFootFront.position.set(length / 2 - 0.05, 0.025, 0.2);

      rightFootFront.name = "SafetyBarrier_RightFoot_Front";

      group.add(rightFootFront);

      const rightFootBack = new THREE.Mesh(footGeom, footMat);

      rightFootBack.position.set(length / 2 - 0.05, 0.025, -0.2);

      rightFootBack.name = "SafetyBarrier_RightFoot_Back";

      group.add(rightFootBack);
    }

    tools.world.placement.setPosition( group, position);

    group.scale.set(scale, scale, scale);

    return { object: group };
  }
}

export default ModelTool;
