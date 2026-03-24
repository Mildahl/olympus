import * as THREE from 'three';

import { Components as UIComponents } from '../../ui/Components/Components.js';

class Selector {

	static HIGHLIGHT_COLOR = 0x77ff55;
	static BLUE_COLOR = 0x5588ff;

	constructor(editor) {
		this.editor = editor;
		this.signals = editor.signals;
		this.disabled = false;

		this.originalColors = new Map();
		this.originalInstanceColors = new Map();
		this.selected_objects = [];
		this.active_object = null;

		this.raycaster = new THREE.Raycaster();
		this.raycaster.params.Line.threshold = 0.01;
		this.raycaster.params.Points.threshold = 0.05;
		this.mouse = new THREE.Vector2();

		this.mouseMoveThrottle = 16;
		this.lastMouseMoveTime = 0;

		this.rectangleSelection = {
			isActive: false,
			isDragging: false,
			startPoint: new THREE.Vector2(),
			endPoint: new THREE.Vector2(),
			startScreenPoint: null,
			endScreenPoint: null,
			threshold: 5,
		};

		this.createSelectionRectangle();

		this.boundHandlers = {
			mousedown: this.handleMouseDown.bind(this),
			mousemove: this.handleMouseMove.bind(this),
			mouseup: this.handleMouseUp.bind(this),
		};

		this.initializeCanvasEvents();
	}

	createSelectionRectangle() {
		const rect = UIComponents.div();
		rect.setStyles({
			position: "fixed",
			border: "1px dashed rgb(119, 255, 85)",
			backgroundColor: "rgba(85, 255, 93, 0.15)",
			pointerEvents: "none",
			display: "none",
			zIndex: "1000",
			borderRadius: "2px",
			userSelect: "none",
			width: "0px",
			height: "0px",
		});
		this.selectionRectangleElement = rect.dom;
		document.body.appendChild(rect.dom);
	}

	initializeCanvasEvents() {
		const attach = () => {
			const dom = this.editor.renderer?.domElement;
			if (!dom) return setTimeout(attach, 100);

			this.removeCanvasEvents();
			dom.addEventListener("mousedown", this.boundHandlers.mousedown, false);
			dom.addEventListener("mousemove", this.boundHandlers.mousemove, false);
			dom.addEventListener("mouseup", this.boundHandlers.mouseup, false);
			dom.addEventListener("contextmenu", e => e.preventDefault(), false);
		};
		attach();
	}

	removeCanvasEvents() {
		const dom = this.editor.renderer?.domElement;
		if (!dom) return;

		dom.removeEventListener("mousedown", this.boundHandlers.mousedown, false);
		dom.removeEventListener("mousemove", this.boundHandlers.mousemove, false);
		dom.removeEventListener("mouseup", this.boundHandlers.mouseup, false);
	}

	handleMouseDown(event) {
		if (this.disabled || !this.isValidMouseEvent(event) || this.editor.isTransforming) return;

		this.rectangleSelection.isActive = false;
		this.rectangleSelection.isDragging = false;
		this.selectionRectangleElement.style.display = "none";
		this.rectangleSelection.startScreenPoint = { x: event.clientX, y: event.clientY };

		this.updateMousePosition(event);
		this.rectangleSelection.startPoint.copy(this.mouse);
		event.stopPropagation();
	}

	updateRectangleSelection(event) {
		if (!this.rectangleSelection.startScreenPoint) return;

		const dx = event.clientX - this.rectangleSelection.startScreenPoint.x;
		const dy = event.clientY - this.rectangleSelection.startScreenPoint.y;
		const distance = Math.sqrt(dx * dx + dy * dy);

		if (distance > this.rectangleSelection.threshold) {
			if (!this.rectangleSelection.isActive) {
				this.rectangleSelection.isActive = true;
				this.rectangleSelection.isDragging = true;
				this.selectionRectangleElement.style.display = "block";
			}

			this.rectangleSelection.endScreenPoint = { x: event.clientX, y: event.clientY };
			this.updateSelectionRectangleVisual();
			this.updateMousePosition(event);
			this.rectangleSelection.endPoint.copy(this.mouse);
		}
	}

	handleMouseMove(event) {
		if (this.isPointerLockedToCanvas()) return;

		if (this.isEventInUI(event) || this.editor.isTransforming) return;

		const now = performance.now();
		if (now - this.lastMouseMoveTime < this.mouseMoveThrottle) return;
		this.lastMouseMoveTime = now;

		if (!this.rectangleSelection.startScreenPoint) return;

		const rect = this.editor.renderer.domElement.getBoundingClientRect();
		const outOfBounds = event.clientX < rect.left || event.clientX > rect.right ||
		                    event.clientY < rect.top || event.clientY > rect.bottom;

		if (outOfBounds) {
			if (this.rectangleSelection.isActive) {
				this.selectionRectangleElement.style.display = "none";
				this.rectangleSelection.isActive = false;
				this.rectangleSelection.isDragging = false;
			}
			return;
		}

		this.updateRectangleSelection(event);
		if (this.rectangleSelection.isActive) event.stopPropagation();
	}

	handleMouseUp(event) {
		if (this.disabled || !this.isValidMouseEvent(event, false) || this.editor.isTransforming) return;
		if (!this.rectangleSelection.startScreenPoint) return;

		const wasRectangleSelection = this.rectangleSelection.isActive && this.rectangleSelection.isDragging;

		if (wasRectangleSelection) {
			this.selectionRectangleElement.style.display = "none";
			this.performRectangleSelection(event.shiftKey, event.ctrlKey || event.metaKey);
		} else {
			const rect = this.editor.renderer.domElement.getBoundingClientRect();
			const inBounds = this.isPointerLockedToCanvas() ||
				(event.clientX >= rect.left && event.clientX <= rect.right &&
				 event.clientY >= rect.top && event.clientY <= rect.bottom);
			if (inBounds) {
				this.updateMousePosition(event);
				this.selectAtPosition(event.shiftKey, event.ctrlKey || event.metaKey);
			}
		}

		this.rectangleSelection.startScreenPoint = null;
		this.rectangleSelection.endScreenPoint = null;
		this.rectangleSelection.isActive = false;
		this.rectangleSelection.isDragging = false;

		if (wasRectangleSelection) event.stopPropagation();
	}

	updateSelectionRectangleVisual() {
		const start = this.rectangleSelection.startScreenPoint;
		const end = this.rectangleSelection.endScreenPoint;

		Object.assign(this.selectionRectangleElement.style, {
			left: Math.min(start.x, end.x) + "px",
			top: Math.min(start.y, end.y) + "px",
			width: Math.abs(end.x - start.x) + "px",
			height: Math.abs(end.y - start.y) + "px",
		});
	}

	performRectangleSelection(additive = false, deselect = false) {
		const camera = this.editor.viewportCamera;
		const scene = this.editor.scene;
		const start = this.rectangleSelection.startScreenPoint;
		const end = this.rectangleSelection.endScreenPoint;

		if (!camera || !scene || !start || !end) return;

		const rect = this.editor.renderer.domElement.getBoundingClientRect();

		const toNDC = (x, y) => ({
			x: ((x - rect.left) / rect.width) * 2 - 1,
			y: -((y - rect.top) / rect.height) * 2 + 1,
		});

		const startNDC = toNDC(start.x, start.y);
		const endNDC = toNDC(end.x, end.y);

		const minX = Math.min(startNDC.x, endNDC.x);
		const maxX = Math.max(startNDC.x, endNDC.x);
		const minY = Math.min(startNDC.y, endNDC.y);
		const maxY = Math.max(startNDC.y, endNDC.y);

		const visibleObjects = this.getVisibleObjects();
		const selectedObjects = [];
		const tempBox3 = new THREE.Box3();
		const tempVector3 = new THREE.Vector3();

		for (const object of visibleObjects) {
			if (!this.isObjectVisible(object)) continue;

			tempBox3.setFromObject(object);
			if (tempBox3.isEmpty()) continue;

			tempBox3.getCenter(tempVector3);
			tempVector3.project(camera);

			if (tempVector3.x >= minX && tempVector3.x <= maxX &&
			    tempVector3.y >= minY && tempVector3.y <= maxY) {
				selectedObjects.push(object);
			}
		}

		const dedupedSelection = [];

		const seenKeys = new Set();

		for (let i = 0; i < selectedObjects.length; i++) {
			const resolved = this.resolveIfcSelectionTarget(selectedObjects[i]);

			const key =
				resolved && resolved.GlobalId
					? resolved.GlobalId
					: resolved
						? resolved.uuid
						: null;

			if (key === null || seenKeys.has(key)) continue;

			seenKeys.add(key);

			dedupedSelection.push(resolved);
		}

		this.selectObjects(dedupedSelection, deselect, additive);
	}

	isPointerLockedToCanvas() {
		const dom = this.editor.renderer?.domElement;
		return Boolean(dom && document.pointerLockElement === dom);
	}

	isEventInUI(event) {
		let element = event.target;
		const uiSelectors = ["code-editor-panel", "properties"];
		const uiClasses = ["CodeMirror", "sidebar", "toolbar", "menu"];
		const uiTags = ["INPUT", "TEXTAREA", "SELECT", "BUTTON"];

		while (element) {
			if (uiSelectors.includes(element.id) ||
			    uiClasses.some(cls => element.classList?.contains(cls)) ||
			    uiTags.includes(element.tagName) ||
			    element.contentEditable === "true") {
				return true;
			}
			element = element.parentElement;
		}
		return false;
	}

	isValidMouseEvent(event, checkBounds = true) {
		if (event.button !== 0 || this.isEventInUI(event)) return false;

		if (checkBounds) {
			if (this.isPointerLockedToCanvas()) return true;
			const rect = this.editor.renderer.domElement.getBoundingClientRect();
			return event.clientX >= rect.left && event.clientX <= rect.right &&
			       event.clientY >= rect.top && event.clientY <= rect.bottom;
		}
		return true;
	}

	updateMousePosition(event) {
		const rect = this.editor.renderer.domElement.getBoundingClientRect();
		if (this.isPointerLockedToCanvas()) {
			this.mouse.x = 0;
			this.mouse.y = 0;
			return;
		}
		this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
	}

	selectAtPosition(additive = false, deselect = false) {
		const camera = this.editor.viewportCamera;
		const scene = this.editor.scene;
		if (!camera || !scene) return;

		this.raycaster.setFromCamera(this.mouse, camera);
		const intersects = this.raycaster.intersectObjects(this.getVisibleObjects(), true);

		if (intersects.length > 0) {
			const selectableObject = this.findSelectableObject(intersects);

			if (selectableObject) {
				if (deselect) {
					const existingIndex = this.findSelectedIndex(selectableObject);
					if (existingIndex !== -1) {
						this.deselectObject(selectableObject);
					} else {
						this.selectObjects([selectableObject], false, true);
					}
				} else {
					this.selectObjects([selectableObject], false, additive);
				}
				return;
			}
		}

		if (!additive && !deselect) this.deselectAll();
	}

	getVisibleObjects() {
		const objects = [];

		const isHelper = (child) => {
			if (child.isHelperGroup || child.name === '_InstancedMeshes') return true;
			let parent = child.parent;
			while (parent) {
				if (parent.isHelperGroup || parent.name === '_InstancedMeshes') return true;
				parent = parent.parent;
			}
			return false;
		};

		this.editor.scene.traverseVisible(child => {
			if (!isHelper(child)) objects.push(child);
		});

		this.editor.sceneHelpers.traverseVisible(child => {
			if (child.name === 'picker') objects.push(child);
		});

		return objects;
	}

	findElementGroupByGlobalId(globalId) {
		let found = null;
		this.editor.scene.traverse(obj => {
			if (!found && obj.GlobalId === globalId && obj.isIfc) found = obj;
		});
		return found;
	}

	resolveIfcSelectionTarget(object3D) {
		if (!object3D) return object3D;

		if (object3D.userData && object3D.userData.ifcBodyMesh === true) {
			let walk = object3D.parent;

			while (walk) {
				if (walk.isIfc && walk.GlobalId && !walk.isMesh) return walk;

				walk = walk.parent;
			}

			return object3D;
		}

		if (object3D.isIfc && object3D.GlobalId && !object3D.isMesh) {
			return object3D;
		}

		if (object3D.isMesh && object3D.isIfc) {
			let walk = object3D.parent;

			while (walk) {
				if (walk.isIfc && walk.GlobalId && !walk.isMesh) return walk;

				walk = walk.parent;
			}
		}

		return object3D;
	}

	findSelectableObject(intersects) {
		if (!intersects || intersects.length === 0) return null;

		for (const intersect of intersects) {
			let obj = intersect.object;

			if (obj.isInstancedMesh && obj.isInstancedIfc && intersect.instanceId !== undefined) {
				const instanceGlobalId = obj.instanceIndexToGlobalId?.get(intersect.instanceId);

				if (instanceGlobalId && this.isObjectVisible(obj)) {
					const elementGroup = this.findElementGroupByGlobalId(instanceGlobalId);
					if (elementGroup) return elementGroup;
				}
			}

			while (obj) {
				if (obj.userData.object !== undefined) {
					const targetObj = obj.userData.object;
					if (this.isObjectVisible(targetObj)) return this.resolveIfcSelectionTarget(targetObj);
				}

				if (obj.isMesh && !obj.isLine && this.isObjectVisible(obj)) {
					return this.resolveIfcSelectionTarget(obj);
				}

				obj = obj.parent;
			}
		}

		return null;
	}

	isObjectVisible(object) {
		let current = object;
		while (current) {
			if (current.visible === false) return false;
			current = current.parent;
		}
		return true;
	}

	selectObjects(objects, deselect = false, additive = false) {
		let selection = objects.filter(obj => obj.isMesh || obj.isIfc);

		if (selection.length === 0) {
			if (!deselect && !additive) this.deselectAll();
			return;
		}

		if (!additive && !deselect) this.selected_objects = [];

		for (const obj of selection) {
			const existingIndex = this.findSelectedIndex(obj);

			if (deselect && existingIndex !== -1) {
				this.selected_objects.splice(existingIndex, 1);
			} else if (existingIndex === -1) {
				this.selected_objects.push(obj);
			}
		}

		this.active_object = this.selected_objects[this.selected_objects.length - 1] || null;
		this.editor.selected = this.active_object;

		this.signals.selectionChanged.dispatch(this.selected_objects.length);
		this.signals.objectSelected.dispatch(this.active_object);
	}

	findSelectedIndex(obj) {
		if (obj.GlobalId) {
			const idx = this.selected_objects.findIndex(s => s.GlobalId === obj.GlobalId);
			if (idx !== -1) return idx;
		}
		return this.selected_objects.indexOf(obj);
	}

	applySelectionColors() {
		for (const obj of this.selected_objects) {
			const color = obj === this.active_object ? Selector.HIGHLIGHT_COLOR : Selector.BLUE_COLOR;

			if (obj.isInstancedRef && obj.instancedMeshInfos) {
				for (const { mesh, instanceIndex } of obj.instancedMeshInfos) {
					this.applyInstanceColor(mesh, instanceIndex, color);
				}
			} else if (obj.material?.color) {
				this.applyMaterialColor(obj.material, color);
			} else if (obj.isIfc && obj.children) {
				for (const child of obj.children) {
					if (child.isMesh && child.material?.color) {
						this.applyMaterialColor(child.material, color);
					}
				}
			}
		}
	}

	applyMaterialColor(material, color) {
		if (!this.originalColors.has(material)) {
			this.originalColors.set(material, material.color.getHex());
		}
		material.color.setHex(color);
	}

	setActiveObject(obj) {
		this.editor.selected = obj;
		this.active_object = obj;
	}

	deselectObject(object) {
		const index = this.findSelectedIndex(object);
		if (index === -1) return;

		if (object.isInstancedRef && object.instancedMeshInfos) {
			for (const { mesh, instanceIndex } of object.instancedMeshInfos) {
				this.restoreInstanceColor(mesh, instanceIndex);
			}
		} else if (object.material?.color && this.originalColors.has(object.material)) {
			this.restoreMaterialColor(object.material, index);
		} else if (object.isIfc && object.children) {
			for (const child of object.children) {
				if (child.isMesh && child.material?.color && this.originalColors.has(child.material)) {
					this.restoreMaterialColor(child.material, index);
				}
			}
		}

		this.selected_objects.splice(index, 1);
		this.active_object = this.selected_objects[this.selected_objects.length - 1] || null;
		this.editor.selected = this.active_object;

		this.signals.selectionChanged.dispatch(this.selected_objects.length);
		this.signals.objectSelected.dispatch(this.active_object);
	}

	restoreMaterialColor(material, excludeIndex) {
		material.color.setHex(this.originalColors.get(material));

		const stillUsed = this.selected_objects.some((o, i) => {
			if (i === excludeIndex) return false;
			if (o.material === material) return true;
			return o.children?.some(c => c.material === material);
		});

		if (!stillUsed) this.originalColors.delete(material);
	}

	select(obj) {
		this.selectObjects(obj ? [obj] : [], false, false);
	}

	deselect() {
		this.deselectAll();
	}

	deselectAll() {
		this.restoreAllColors();
		this.selected_objects = [];
		this.active_object = null;
		this.editor.selected = null;
		this.signals.objectSelected.dispatch(null);
		this.signals.selectionChanged.dispatch(0);
	}

	getSelected() {
		return this.selected_objects;
	}

	getActive() {
		return this.active_object;
	}

	getIntersects(raycaster) {
		return raycaster.intersectObjects(this.getVisibleObjects(), false);
	}

	getPointerIntersects(point, camera) {
		this.mouse.set((point.x * 2) - 1, -(point.y * 2) + 1);
		this.raycaster.setFromCamera(this.mouse, camera);
		return this.getIntersects(this.raycaster);
	}

	updateSelectionColors() {
		this.restoreAllColors();
		this.applySelectionColors();
	}

	restoreAllColors() {
		for (const [mat, origColor] of this.originalColors) {
			mat.color.setHex(origColor);
		}
		this.originalColors.clear();

		for (const [instancedMesh, colorMap] of this.originalInstanceColors) {
			for (const [instanceId, origColor] of colorMap) {
				this.setInstanceColor(instancedMesh, instanceId, origColor.getHex());
			}
		}
		this.originalInstanceColors.clear();
	}

	clearAllSelectionColors() {
		this.restoreAllColors();
	}

	removeObjectFromColorTracking(object) {
		if (object.material) this.originalColors.delete(object.material);
	}

	ensureInstanceColors(instancedMesh) {
		if (!instancedMesh.instanceColor) {
			const count = instancedMesh.count;
			const colors = new Float32Array(count * 3);

			for (let i = 0; i < count; i++) {
				colors[i * 3] = 1;
				colors[i * 3 + 1] = 1;
				colors[i * 3 + 2] = 1;
			}

			instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
		}

		if (!instancedMesh.material.vertexColors) {
			instancedMesh.material.vertexColors = true;
			instancedMesh.material.needsUpdate = true;
		}
	}

	setInstanceColor(instancedMesh, instanceId, color) {
		this.ensureInstanceColors(instancedMesh);
		instancedMesh.setColorAt(instanceId, new THREE.Color(color));
		instancedMesh.instanceColor.needsUpdate = true;
	}

	getInstanceColor(instancedMesh, instanceId) {
		if (!instancedMesh.instanceColor) return new THREE.Color(1, 1, 1);

		const color = new THREE.Color();
		instancedMesh.getColorAt(instanceId, color);
		return color;
	}

	applyInstanceColor(instancedMesh, instanceIndex, color) {
		if (!this.originalInstanceColors.has(instancedMesh)) {
			this.originalInstanceColors.set(instancedMesh, new Map());
		}

		const meshColorMap = this.originalInstanceColors.get(instancedMesh);
		if (!meshColorMap.has(instanceIndex)) {
			meshColorMap.set(instanceIndex, this.getInstanceColor(instancedMesh, instanceIndex).clone());
		}

		this.setInstanceColor(instancedMesh, instanceIndex, color);
	}

	restoreInstanceColor(instancedMesh, instanceIndex) {
		const meshColorMap = this.originalInstanceColors.get(instancedMesh);
		if (!meshColorMap) return;

		const origColor = meshColorMap.get(instanceIndex);
		if (origColor) {
			this.setInstanceColor(instancedMesh, instanceIndex, origColor.getHex());
			meshColorMap.delete(instanceIndex);
		}

		if (meshColorMap.size === 0) this.originalInstanceColors.delete(instancedMesh);
	}

	dispose() {
		this.removeCanvasEvents();

		if (this.selectionRectangleElement?.parentNode) {
			this.selectionRectangleElement.parentNode.removeChild(this.selectionRectangleElement);
		}

		this.restoreAllColors();
		this.selected_objects = [];
		this.active_object = null;
	}
}

export { Selector };
