import * as THREE from 'three';

import { Config } from './editor/Config.js';

import { Loader } from './editor/Loader.js';

import { History as _History } from './editor/History.js';

import { Strings } from '../../ui/language/Strings.js';

import { Storage as _Storage } from './editor/Storage.js';

import { Selector } from './Selector.js';

import { NavigationController } from "./editor/NavigationController.js";

import NavigationTool from "../../tool/viewer/NavigationTool.js";

let aspect = window.innerWidth / window.innerHeight; 

var _DEFAULT_CAMERA = new THREE.PerspectiveCamera( 65, aspect, 0.1, 1000 );

_DEFAULT_CAMERA.name = 'Camera';

_DEFAULT_CAMERA.position.set( 0, 5, -10 );

_DEFAULT_CAMERA.lookAt( new THREE.Vector3() );

function Editor( context ) {

	const Signal = signals.Signal; 

	context.editor = this;

	this.signals = {
		editScript: new Signal(),
		loadScript: new Signal(),
		startPlayer: new Signal(),
		stopPlayer: new Signal(),
		togglePlayer: new Signal(),
		enterXR: new Signal(),
		offerXR: new Signal(),
		leaveXR: new Signal(),
		editorCleared: new Signal(),

		savingStarted: new Signal(),
		savingFinished: new Signal(),

		transformModeChanged: new Signal(),
		snapChanged: new Signal(),
		spaceChanged: new Signal(),
		rendererCreated: new Signal(),
		rendererUpdated: new Signal(),
		rendererDetectKTX2Support: new Signal(),

		sceneBackgroundChanged: new Signal(),
		sceneEnvironmentChanged: new Signal(),
		sceneFogChanged: new Signal(),
		sceneFogSettingsChanged: new Signal(),
		sceneGraphChanged: new Signal(),
		settingUpdated: new Signal(),
		sceneRendered: new Signal(),

		cameraChanged: new Signal(),
		cameraResetted: new Signal(),

		measurementChanged: new Signal(),
		viewpointChanged: new Signal(),
		animationPathChanged: new Signal(),

		geometryChanged: new Signal(),

		objectSelected: new Signal(),
		selectionChanged: new Signal(),
		objectDeselected: new Signal(),
		objectFocused: new Signal(),
		isolationChanged: new Signal(),

		objectAdded: new Signal(),
		objectChanged: new Signal(),
		objectRemoved: new Signal(),

		cameraAdded: new Signal(),
		cameraRemoved: new Signal(),

		helperAdded: new Signal(),
		helperRemoved: new Signal(),

		materialAdded: new Signal(),
		materialChanged: new Signal(),
		materialRemoved: new Signal(),

		scriptAdded: new Signal(),
		scriptChanged: new Signal(),
		scriptRemoved: new Signal(),

		windowResize: new Signal(),

		showHelpersChanged: new Signal(),
		refreshSidebarObject3D: new Signal(),
		refreshSidebarEnvironment: new Signal(),
		historyChanged: new Signal(),

		viewportCameraChanged: new Signal(),
		viewportShadingChanged: new Signal(),

		intersectionsDetected: new Signal(),

		pathTracerUpdated: new Signal(),
    refreshSpatialManager: new Signal(),
		editingAttributes: new Signal(),
		attributesChanged: new Signal(),
		editingProperties: new Signal(),
		propertiesChanged: new Signal(),
		editingDocuments: new Signal(),
		documentsChanged: new Signal(),
		navigationModeChanged: new Signal(),
		navigationCameraRigChanged: new Signal(),

	};

	this.config = new Config( context );

	this.history = new _History( this );

	this.selector = new Selector( this );

	this.strings = new Strings( this.config );

	const defaultNavConfig = {
		fly: {
			movementSpeed: 10,
			lookSpeed: 0.002,
			verticalMin: -100,
			verticalMax: 100,
			chaseCameraDistance: 1.5,
			chaseCameraHeight: 0.72,
			chaseDistanceMax: 2.6,
			chaseHeightMax: 1.55,
			cockpitEyeForwardOffset: 0.11,
			navigationFieldOfView: 70,
		},
		drive: {
			movementSpeed: 5,
			verticalMin: -10,
			verticalMax: 10,
		},
	};

	this.navigationController = new NavigationController(this, defaultNavConfig);

	this.storage = new _Storage();

	this.loader = new Loader( this );

	this.camera = _DEFAULT_CAMERA.clone();

	this.scene = new THREE.Scene();

	this.scene.name = 'World';

	this.scene.up = new THREE.Vector3(0, 0, 1);

	this.sceneHelpers = new THREE.Scene();

	this.sceneHelpers.name = "Helpers";

	this.sceneLayers = {
		World: {
			scene: this.scene,
			miniMap: null,
			layers: {
				NaturalEnvironment: { group: null, collection: null, layers: {} },
				Infrastructure: { group: null, collection: null, layers: {} },
				Buildings: { group: null, collection: null, layers: {} },
				Logistics: { group: null, collection: null, layers: {} },
			}
		}
	};

	this.octree = { objects: [] };

	this.object = {};

	this.geometries = {};

	this.materials = {};

	this.textures = {};

	this.scripts = {};

	this.materialsRefCounter = new Map(); 

	this.mixer = new THREE.AnimationMixer( this.scene );

	this.selected = null;

	this.helpers = {};

	this.cameras = {};

	this.controls = null; 

	this.viewportCamera = this.camera;

	this.viewportShading = 'default';

	this.isTransforming = false;

	this.cameraAnimation = null;

	this._dimState = {
		entries: new Map(),
		highlightedEntries: new Set(),
	};

	this.addCamera( this.camera );

}

Editor.prototype = {

	setScene: function ( scene ) {

		this.scene.uuid = scene.uuid;

		this.scene.name = scene.name;

		this.scene.background = scene.background;

		this.scene.environment = scene.environment;

		this.scene.fog = scene.fog;

		this.scene.backgroundBlurriness = scene.backgroundBlurriness;

		this.scene.backgroundIntensity = scene.backgroundIntensity;

		this.scene.userData = JSON.parse( JSON.stringify( scene.userData ) );

		this.signals.sceneGraphChanged.active = false;

		while ( scene.children.length > 0 ) {

			this.addObject( scene.children[ 0 ] );

		}

		this.signals.sceneGraphChanged.active = true;

		this.signals.sceneGraphChanged.dispatch();

	},
	addObject: function ( object, parent, index ) {

		var scope = this;

		object.traverse( function ( child ) {

			if ( child.geometry !== undefined ) scope.addGeometry( child.geometry );

			if ( child.material !== undefined ) scope.addMaterial( child.material );

			scope.addCamera( child );

			scope.addHelper( child );

		} );

		if ( parent === undefined ) {

			this.scene.add( object );

		} else {

			parent.children.splice( index, 0, object );

			object.parent = parent;

		}

		this.signals.objectAdded.dispatch( object );

		this.signals.sceneGraphChanged.dispatch();

	},

	nameObject: function ( object, name ) {

		object.name = name;

		this.signals.sceneGraphChanged.dispatch();

	},

	removeObject: function ( object ) {

		if ( object.parent === null ) return; 

		var scope = this;

		object.traverse( function ( child ) {

			scope.removeCamera( child );

			scope.removeHelper( child );

			if ( child.material !== undefined ) scope.removeMaterial( child.material );

		} );

		object.parent.remove( object );

		this.signals.objectRemoved.dispatch( object );

		this.signals.sceneGraphChanged.dispatch();

	},

	addGeometry: function ( geometry ) {

		this.geometries[ geometry.uuid ] = geometry;

	},

	setGeometryName: function ( geometry, name ) {

		geometry.name = name;

		this.signals.sceneGraphChanged.dispatch();

	},

	addMaterial: function ( material ) {

		if ( Array.isArray( material ) ) {

			for ( var i = 0, l = material.length; i < l; i ++ ) {

				this.addMaterialToRefCounter( material[ i ] );

			}

		} else {

			this.addMaterialToRefCounter( material );

		}

		this.signals.materialAdded.dispatch();

	},

	addMaterialToRefCounter: function ( material ) {

		var materialsRefCounter = this.materialsRefCounter;

		var count = materialsRefCounter.get( material );

		if ( count === undefined ) {

			materialsRefCounter.set( material, 1 );

			this.materials[ material.uuid ] = material;

		} else {

			count ++;

			materialsRefCounter.set( material, count );

		}

	},

	removeMaterial: function ( material ) {

		if ( Array.isArray( material ) ) {

			for ( var i = 0, l = material.length; i < l; i ++ ) {

				this.removeMaterialFromRefCounter( material[ i ] );

			}

		} else {

			this.removeMaterialFromRefCounter( material );

		}

		this.signals.materialRemoved.dispatch();

	},

	removeMaterialFromRefCounter: function ( material ) {

		var materialsRefCounter = this.materialsRefCounter;

		var count = materialsRefCounter.get( material );

		count --;

		if ( count === 0 ) {

			materialsRefCounter.delete( material );

			delete this.materials[ material.uuid ];

		} else {

			materialsRefCounter.set( material, count );

		}

	},

	getMaterialById: function ( id ) {

		var material;

		var materials = Object.values( this.materials );

		for ( var i = 0; i < materials.length; i ++ ) {

			if ( materials[ i ].id === id ) {

				material = materials[ i ];

				break;

			}

		}

		return material;

	},

	setMaterialName: function ( material, name ) {

		material.name = name;

		this.signals.sceneGraphChanged.dispatch();

	},

	addTexture: function ( texture ) {

		this.textures[ texture.uuid ] = texture;

	},
	addCamera: function ( camera ) {

		if ( camera.isCamera ) {

			this.cameras[ camera.uuid ] = camera;

			this.signals.cameraAdded.dispatch( camera );

		}

	},

	removeCamera: function ( camera ) {

		if ( this.cameras[ camera.uuid ] !== undefined ) {

			delete this.cameras[ camera.uuid ];

			this.signals.cameraRemoved.dispatch( camera );

		}

	},
	addHelper: function () {

		var geometry = new THREE.SphereGeometry( 2, 4, 2 );

		var material = new THREE.MeshBasicMaterial( { color: 0xff0000, visible: false } );

		return function ( object, helper ) {

			if ( helper === undefined ) {

				if ( object.isCamera ) {

					helper = new THREE.CameraHelper( object );

				} else if ( object.isPointLight ) {

					helper = new THREE.PointLightHelper( object, 1 );

				} else if ( object.isDirectionalLight ) {

					helper = new THREE.DirectionalLightHelper( object, 1 );

				} else if ( object.isSpotLight ) {

					helper = new THREE.SpotLightHelper( object );

				} else if ( object.isHemisphereLight ) {

					helper = new THREE.HemisphereLightHelper( object, 1 );

				} else if ( object.isSkinnedMesh ) {

					helper = new THREE.SkeletonHelper( object.skeleton.bones[ 0 ] );

				} else if ( object.isBone === true && object.parent && object.parent.isBone !== true ) {

					helper = new THREE.SkeletonHelper( object );

				} else {
					return;

				}

				const picker = new THREE.Mesh( geometry, material );

				picker.name = 'picker';

				picker.userData.object = object;

				helper.add( picker );

			}

			this.sceneHelpers.add( helper );

			this.helpers[ object.id ] = helper;

			this.signals.helperAdded.dispatch( helper );

		};

	}(),

	removeHelper: function ( object ) {

		if ( this.helpers[ object.id ] !== undefined ) {

			var helper = this.helpers[ object.id ];

			helper.parent.remove( helper );

			helper.dispose();

			delete this.helpers[ object.id ];

			this.signals.helperRemoved.dispatch( helper );

		}

	},
	addScript: function ( object, script ) {

		if ( this.scripts[ object.uuid ] === undefined ) {

			this.scripts[ object.uuid ] = [];

		}

		this.scripts[ object.uuid ].push( script );

		this.signals.scriptAdded.dispatch( script );

	},

	removeScript: function ( object, script ) {

		if ( this.scripts[ object.uuid ] === undefined ) return;

		var index = this.scripts[ object.uuid ].indexOf( script );

		if ( index !== - 1 ) {

			this.scripts[ object.uuid ].splice( index, 1 );

		}

		this.signals.scriptRemoved.dispatch( script );

	},

	getObjectMaterial: function ( object, slot ) {

		var material = object.material;

		if ( Array.isArray( material ) && slot !== undefined ) {

			material = material[ slot ];

		}

		return material;

	},

	setObjectMaterial: function ( object, slot, newMaterial ) {

		if ( Array.isArray( object.material ) && slot !== undefined ) {

			object.material[ slot ] = newMaterial;

		} else {

			object.material = newMaterial;

		}

	},
	setView({position, target}) {

		if (!this.controls) {
			
			console.warn('Editor: controls not set yet.');

			return;
		}

		this.viewportCamera.position.set(position.x, position.y, position.z);

		this.controls.center.set(target.x, target.y, target.z);

		this.viewportCamera.lookAt(this.controls.center);

		this.signals.cameraChanged.dispatch();
	},
	setViewportCamera: function ( uuid ) {

		this.viewportCamera = this.cameras[ uuid ];

		this.signals.viewportCameraChanged.dispatch();

	},

	setViewportShading: function ( value ) {

		this.viewportShading = value;

		this.signals.viewportShadingChanged.dispatch();

	},

	select: function ( object ) {

		this.selector.select( object );

	},

	selectById: function ( id ) {

		if ( id === this.camera.id ) {

			this.select( this.camera );

			return;

		}

		this.select( this.scene.getObjectById( id ) );

	},

	selectByUuid: function ( uuid ) {

		var scope = this;

		this.scene.traverse( function ( child ) {

			if ( child.uuid === uuid ) {

				scope.select( child );

			}

		} );

	},

	deselect: function () {

		this.selector.deselect();

	},

	focus: function ( object ) {

		console.log( 'Editor.focus called for object:', object );

		if ( object !== undefined ) {

			this.signals.objectFocused.dispatch( object );

		}

	},

	focusById: function ( id ) {

		this.focus( this.scene.getObjectById( id ) );

	},

	clear: function () {

		this.history.clear();

		this.storage.clear();

		this.camera.copy( _DEFAULT_CAMERA );

		this.signals.cameraResetted.dispatch();

		this.scene.name = 'Scene';

		this.scene.userData = {};

		this.scene.background = null;

		this.scene.environment = null;

		this.scene.fog = null;

		var objects = this.scene.children;

		this.signals.sceneGraphChanged.active = false;

		while ( objects.length > 0 ) {

			this.removeObject( objects[ 0 ] );

		}

		this.signals.sceneGraphChanged.active = true;

		this.geometries = {};

		this.materials = {};

		this.textures = {};

		this.scripts = {};

		this.materialsRefCounter.clear();

		this.animations = {};

		this.mixer.stopAllAction();

		this.undimObjects();

		this.deselect();

		this.signals.editorCleared.dispatch();

	},
	fromJSON: async function ( json ) {

		var loader = new THREE.ObjectLoader();

		var camera = await loader.parseAsync( json.camera );

		const existingUuid = this.camera.uuid;

		const incomingUuid = camera.uuid;

		this.camera.copy( camera );

		this.camera.uuid = incomingUuid;

		delete this.cameras[ existingUuid ]; 

		this.cameras[ incomingUuid ] = this.camera; 

		this.signals.cameraResetted.dispatch();

		this.history.fromJSON( json.history );

		this.scripts = json.scripts;

		this.setScene( await loader.parseAsync( json.scene ) );

		if ( json.environment === 'Room' ||
			 json.environment === 'ModelViewer'  ) {

			this.signals.sceneEnvironmentChanged.dispatch( json.environment );

			this.signals.refreshSidebarEnvironment.dispatch();

		}

	},

	toJSON: function () {
		var scene = this.scene;

		var scripts = this.scripts;

		for ( var key in scripts ) {

			var script = scripts[ key ];

			if ( script.length === 0 || scene.getObjectByProperty( 'uuid', key ) === undefined ) {

				delete scripts[ key ];

			}

		}

		let environment = null;

		if ( this.scene.environment !== null && this.scene.environment.isRenderTargetTexture === true ) {

			environment = 'Room';

		}

		return {

			metadata: {},
			project: {
				shadows: this.config.getKey( 'project/renderer/shadows' ),
				shadowType: this.config.getKey( 'project/renderer/shadowType' ),
				toneMapping: this.config.getKey( 'project/renderer/toneMapping' ),
				toneMappingExposure: this.config.getKey( 'project/renderer/toneMappingExposure' )
			},
			camera: this.viewportCamera.toJSON(),
			scene: this.scene.toJSON(),
			scripts: this.scripts,
			history: this.history.toJSON(),
			environment: environment

		};

	},

	objectByUuid: function ( uuid ) {

		return this.scene.getObjectByProperty( 'uuid', uuid, true );

	},

	execute: function ( cmd, optionalName ) {

		return this.history.execute( cmd, optionalName );

	},

	undo: function () {

		this.history.undo();

	},

	redo: function () {

		this.history.redo();

	},

	findVehicle: function() {
		return NavigationTool.findDefaultVehicleInScene();
	},

	findFlyObject: function() {
		return NavigationTool.findDefaultFlyingObjectInScene();
	},

	toggleDriveMode: function(vehicle, options = {}) {

		if (!vehicle) {
			vehicle = this.findVehicle();
		}

		const navController = this.navigationController;

		navController.toggleDriveMode(vehicle, options);
	},

	toggleFlyMode: function(flyObject = null) {
		this.setNavigationMode('FLY', { flyObject: flyObject });
	},

	setNavigationMode: function(mode, options = {}) {
		const navController = this.navigationController;

		if (mode === 'DRIVE' && !options.vehicle) {
			options.vehicle = NavigationTool.findDefaultVehicleInScene();
		}

		if ((mode === 'FLY' || mode === 'FIRST_PERSON') && !options.flyObject) {
			options.flyObject = NavigationTool.findDefaultFlyingObjectInScene();
		}

		navController.setMode(mode, options);

	},

	hideObject: function(object) {
		if (object?.name === 'Drone' || object?.userData?.type === 'FlyingVehicle') {
			console.trace()

			console.log('[Drone Visibility]', 'editor.hideObject', {
				name: object?.name,
				uuid: object?.uuid,
				visibleBeforeHide: object?.visible,
				position: object?.position ? {
					x: object.position.x,
					y: object.position.y,
					z: object.position.z,
				} : null,
			});
		}

		object.visible = false;

		object.userData.skipVisibilityUpdate = true;

		this.signals.objectChanged.dispatch(object);
	},

	showObject: function(object) {
		if (object?.name === 'Drone' || object?.userData?.type === 'FlyingVehicle') {
			console.log('[Drone Visibility]', 'editor.showObject', {
				name: object?.name,
				uuid: object?.uuid,
				visibleBeforeShow: object?.visible,
				position: object?.position ? {
					x: object.position.x,
					y: object.position.y,
					z: object.position.z,
				} : null,
			});
		}

		object.visible = true;

		object.userData.skipVisibilityUpdate = true;

		this.signals.objectChanged.dispatch(object);
	},

	/**
	 * Store for visibility state before isolation (for undo)
	 */
	_isolationState: null,

	getDimmableObjects: function() {
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

		this.scene.traverse((child) => {
			const sceneObject = /** @type {any} */ (child);

			if (sceneObject === this.scene) return;

			if (sceneObject.isCamera || sceneObject.isLight || isHelper(sceneObject)) return;

			if (sceneObject.material || sceneObject.isIfc) {
				objects.push(sceneObject);
			}
		});

		return objects;
	},

	_resolveDimTargets: function(objects = null) {
		const queue = Array.isArray(objects) && objects.length > 0
			? objects.filter(Boolean)
			: this.getDimmableObjects();

		const targets = [];
		const seen = new Set();

		const pushTarget = (object) => {
			const sceneObject = /** @type {any} */ (object);

			if (!sceneObject || !sceneObject.material) return;

			if (sceneObject.isCamera || sceneObject.isLight) return;

			if (seen.has(sceneObject.uuid)) return;

			seen.add(sceneObject.uuid);
			targets.push(sceneObject);
		};

		for (const object of queue) {
			if (!object) continue;

			if (object.material) {
				pushTarget(object);
			}

			object.traverse((child) => {
				pushTarget(child);
			});
		}

		return targets;
	},

	_cloneObjectMaterial: function(object) {
		if (Array.isArray(object.material)) {
			return object.material.map((material) => material?.clone ? material.clone() : material);
		}

		return object.material?.clone ? object.material.clone() : object.material;
	},

	_applyDimToMaterial: function(material) {
		if (!material) return;

		material.opacity = 0.05;
		material.transparent = true;
		material.needsUpdate = true;
	},

	_restoreDimmedObject: function(entry) {
		if (!entry?.object) return;

		entry.object.material = entry.originalMaterial;

		const materials = Array.isArray(entry.originalMaterial)
			? entry.originalMaterial
			: [entry.originalMaterial];

		for (const material of materials) {
			if (material) {
				material.needsUpdate = true;
			}
		}
	},

	_collectComplementObjects: function(objects) {
		const dimmableObjects = this._resolveDimTargets(this.getDimmableObjects());
		const keepSet = new Set();

		for (const target of this._resolveDimTargets(objects)) {
			keepSet.add(target.uuid);
		}

		return dimmableObjects.filter((object) => !keepSet.has(object.uuid));
	},

	getHighlightedObjects: function() {
		if (this._dimState.highlightedEntries.size === 0) {
			return [];
		}

		const dimmableObjects = this._resolveDimTargets(this.getDimmableObjects());

		return dimmableObjects.filter((object) => !this._dimState.highlightedEntries.has(object.uuid));
	},

	getIsolationTargetIds: function() {
		const isolationState = this._isolationState;

		return isolationState ? isolationState.isolatedObjects : [];
	},

	/**
	 * Store for material state before dim/highlight operations.
	 */
	_dimState: {
		entries: new Map(),
		highlightedEntries: new Set(),
	},

	dimObjects: function(objects = null, options = {}) {
		const owner = options.owner || 'manual';
		const targets = this._resolveDimTargets(objects);

		if (targets.length === 0) {
			return [];
		}

		this.signals.sceneGraphChanged.active = false;

		for (const object of targets) {
			let entry = this._dimState.entries.get(object.uuid);

			if (!entry) {
				entry = {
					object,
					originalMaterial: object.material,
					dimmedMaterial: this._cloneObjectMaterial(object),
					owners: new Set(),
				};

				object.material = entry.dimmedMaterial;

				const dimmedMaterials = Array.isArray(entry.dimmedMaterial)
					? entry.dimmedMaterial
					: [entry.dimmedMaterial];

				for (const material of dimmedMaterials) {
					this._applyDimToMaterial(material);
				}

				this._dimState.entries.set(object.uuid, entry);
			}

			entry.owners.add(owner);

			if (owner === 'highlight') {
				this._dimState.highlightedEntries.add(object.uuid);
			}
		}

		this.signals.sceneGraphChanged.active = true;
		this.signals.sceneGraphChanged.dispatch();

		return targets;
	},

	undimObjects: function(objects = null, options = {}) {
		const owner = options.owner || null;
		const targets = Array.isArray(objects) && objects.length > 0
			? this._resolveDimTargets(objects)
			: Array.from(this._dimState.entries.values()).map((entry) => entry.object);

		if (targets.length === 0) {
			return [];
		}

		this.signals.sceneGraphChanged.active = false;

		for (const object of targets) {
			const entry = this._dimState.entries.get(object.uuid);

			if (!entry) continue;

			if (owner) {
				entry.owners.delete(owner);

				if (owner === 'highlight') {
					this._dimState.highlightedEntries.delete(object.uuid);
				}
			} else {
				entry.owners.clear();
				this._dimState.highlightedEntries.delete(object.uuid);
			}

			if (entry.owners.size === 0) {
				this._restoreDimmedObject(entry);
				this._dimState.entries.delete(object.uuid);
			}
		}

		this.signals.sceneGraphChanged.active = true;
		this.signals.sceneGraphChanged.dispatch();

		return targets;
	},

	highlightObjects: function(objects = null) {
		this.undimObjects(null, { owner: 'highlight' });

		const targets = this._resolveDimTargets(objects);

		if (targets.length === 0) {
			return [];
		}

		const complement = this._collectComplementObjects(targets);

		return this.dimObjects(complement, { owner: 'highlight' });
	},

	unhighlightObjects: function() {
		return this.undimObjects(null, { owner: 'highlight' });
	},

	/**
	 * Isolate selected objects - hide everything except selected objects and their ancestors
	 * Preserves materials by only modifying visibility, not removing objects
	 * @param {Array<THREE.Object3D>} objects - Objects to isolate (keep visible)
	 * @returns {Object} State object for undo
	 */
	isolateObjects: function(objects) {
		if (!objects || objects.length === 0) {
			console.warn('No objects provided to isolate');

			return null;
		}

		const previousState = new Map();
		
		this.scene.traverse((object) => {
			previousState.set(object.uuid, object.visible);
		});

		const visibleObjects = new Set();

		this.scene.traverse((object) => {
			if (object.isLight) {
				visibleObjects.add(object);

				let parent = object.parent;

				while (parent) {
					visibleObjects.add(parent);

					parent = parent.parent;
				}
			}
		});

		for (const obj of objects) {
			
			visibleObjects.add(obj);

			obj.traverse((child) => {
				visibleObjects.add(child);
			});

			let parent = obj.parent;

			while (parent) {
				visibleObjects.add(parent);

				parent = parent.parent;
			}
		}

		this.signals.sceneGraphChanged.active = false;

		this.scene.traverse((object) => {
			
			if (object === this.scene) return;

			if (object.isCamera) return;

			object.visible = visibleObjects.has(object);
		});

		this.signals.sceneGraphChanged.active = true;

		this._isolationState = {
			previousState: previousState,
			isolatedObjects: objects.map(o => o.uuid)
		};

		this.signals.sceneGraphChanged.dispatch();

		this.signals.isolationChanged.dispatch(true);

		return this._isolationState;
	},

	/**
	 * Restore visibility state from before isolation (undo isolation)
	 * @param {Object} state - Optional state object to restore. If not provided, uses last isolation state
	 */
	unisolateObjects: function(state = null) {
		const restoreState = state || this._isolationState;
		
		if (!restoreState || !restoreState.previousState) {
			console.warn('No isolation state to restore');

			return;
		}

		this.signals.sceneGraphChanged.active = false;

		this.scene.traverse((object) => {
			
			if (object.isLight) return;

			const previousVisible = restoreState.previousState.get(object.uuid);

			if (previousVisible !== undefined) {
				object.visible = previousVisible;
			}
		});

		this.signals.sceneGraphChanged.active = true;

		this._isolationState = null;

		this.signals.sceneGraphChanged.dispatch();

		this.signals.isolationChanged.dispatch(false);
	},

	/**
	 * Show all objects (reset visibility)
	 */
	showAllObjects: function() {
		
		this.signals.sceneGraphChanged.active = false;

		this.scene.traverse((object) => {
			
			if (object.isLight || object.isCamera) return;
			
			object.visible = true;
		});

		this.signals.sceneGraphChanged.active = true;

		this._isolationState = null;

		this.signals.sceneGraphChanged.dispatch();

		this.signals.isolationChanged.dispatch(false);
	},

	/**
	 * Check if scene is currently in isolated state
	 * @returns {boolean}
	 */
	isIsolated: function() {
		return this._isolationState !== null;
	},

	/**
	 * Smoothly animate camera to a new position
	 * @param {THREE.Vector3|Object} position - Target position {x, y, z}
	 * @param {Object} options - Animation options
	 * @param {number} options.duration - Animation duration in ms (default: 1000)
	 * @param {THREE.Vector3|Object} options.lookAt - Optional target to look at
	 * @param {number} options.offset - Distance offset from target (default: 10)
	 * @param {Function} options.onComplete - Callback when animation completes
	 */
	moveCameraToPosition: function(position, options = {}) {
		const { duration = 1000, lookAt = null, offset = 10, onComplete = null } = options;

		const targetPosition = new THREE.Vector3(
			position.x,
			position.y !== undefined ? position.y : -position.y,
			position.z
		);

		let finalCameraPosition = targetPosition.clone();

		let targetTarget = null;

		let startTarget = null;

		if (lookAt) {
			const lookAtPosition = new THREE.Vector3(lookAt.x, lookAt.y, lookAt.z);

			const direction = new THREE.Vector3().subVectors(targetPosition, lookAtPosition).normalize();

			finalCameraPosition = lookAtPosition.clone().add(direction.multiplyScalar(offset));

			targetTarget = lookAtPosition;

			startTarget = this.controls.center.clone();
		} else {
			
			const currentOffset = new THREE.Vector3().subVectors(this.controls.center, this.camera.position);

			targetTarget = targetPosition.clone().add(currentOffset);

			startTarget = this.controls.center.clone();
		}

		this.cameraAnimation = {
			startPosition: this.camera.position.clone(),
			targetPosition: finalCameraPosition,
			startTarget,
			targetTarget,
			startTime: performance.now(),
			duration,
			onComplete
		};
	},

	updateCameraAnimation: function() {
		if (!this.cameraAnimation) return;

		const { startPosition, targetPosition, startTarget, targetTarget, startTime, duration, onComplete } = this.cameraAnimation;

		const elapsed = performance.now() - startTime;

		const t = Math.min(elapsed / duration, 1);

		const eased = 1 - Math.pow(1 - t, 3);

		this.camera.position.lerpVectors(startPosition, targetPosition, eased);

		if (startTarget && targetTarget) {
			this.controls.center.lerpVectors(startTarget, targetTarget, eased);
		}

		this.controls.update();

		if (t >= 1) {
			this.cameraAnimation = null;

			this.signals.cameraChanged.dispatch(this.camera);

			if (onComplete) onComplete();
		}
	},

	utils: {

		save: save,
		saveArrayBuffer: saveArrayBuffer,
		saveString: saveString,
		formatNumber: formatNumber

	}

};

const link = document.createElement( 'a' );

function save( blob, filename ) {

	if ( link.href ) {

		URL.revokeObjectURL( link.href );

	}

	link.href = URL.createObjectURL( blob );

	link.download = filename || 'data.json';

	link.dispatchEvent( new MouseEvent( 'click' ) );

}

function saveArrayBuffer( buffer, filename ) {

	save( new Blob( [ buffer ], { type: 'application/octet-stream' } ), filename );

}

function saveString( text, filename ) {

	save( new Blob( [ text ], { type: 'text/plain' } ), filename );

}

function formatNumber( number ) {

	return new Intl.NumberFormat( 'en-us', { useGrouping: true } ).format( number );

}

export { Editor };
