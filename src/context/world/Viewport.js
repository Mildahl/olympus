import * as THREE from 'three';

import { TransformControls } from 'three/addons/controls/TransformControls.js';

import { UIPanel } from '../../../drawUI/ui.js';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { EditorControls } from './EditorControls.js';

import { ViewportControls } from './editor/Viewport.Controls.js';

import { XR } from './editor/Viewport.XR.js';

import { SetPositionCommand } from './editor/commands/SetPositionCommand.js';

import { SetRotationCommand } from './editor/commands/SetRotationCommand.js';

import { SetScaleCommand } from './editor/commands/SetScaleCommand.js';

import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { ViewportPathtracer } from './editor/Viewport.Pathtracer.js';

import FocusManager from '../../utils/FocusManager.js';

import { attachViewportLoadStatusStrip } from './ViewportLoadStatusStrip.js';

function Viewport( context, ops, parent ) {

	const editor = context.editor;

	const Operator = ops

	const selector = editor.selector;

	const signals = editor.signals;

	const container = parent

	FocusManager.registerContext('viewport', parent.dom, { priority: 1 });

	let renderer = null;

	let pmremGenerator = null;

	let pathtracer = null;

	let lastViewportSyncWidth = 0;

	let lastViewportSyncHeight = 0;

	const camera = editor.camera;

	const scene = editor.scene;

	const sceneHelpers = editor.sceneHelpers;

	function normalizeHexForThree( value ) {

		if ( typeof value === 'string' && value.startsWith( '#' ) && value.length === 9 ) {

			return value.slice( 0, 7 );

		}

		return value;

	}

	const GRID_COLORS_LIGHT = [ 0x999999, 0x777777 ];

	const GRID_COLORS_DARK = [ 0x555555, 0x888888 ];

	const grid = new THREE.Group();

	function createGridHelpers( primaryConfig, secondaryConfig ) {

		const primary = primaryConfig || { size: 1500, divisions: 1500, color: GRID_COLORS_DARK[ 0 ], opacity: 0.15 };

		const secondary = secondaryConfig || { size: 1500, divisions: 150, color: GRID_COLORS_DARK[ 0 ], opacity: 0.3 };

		const g1 = new THREE.GridHelper( primary.size, primary.divisions );

		g1.material.opacity = primary.opacity;

		g1.material.transparent = true;

		g1.material.depthWrite = false;

		g1.material.color.setHex( primary.color );

		g1.material.vertexColors = false;

		const g2 = new THREE.GridHelper( secondary.size, secondary.divisions );

		g2.material.color.setHex( secondary.color );

		g2.material.opacity = secondary.opacity;

		g2.material.transparent = true;

		g2.material.depthWrite = false;

		g2.material.vertexColors = false;

		return { grid1: g1, grid2: g2 };
	}

	let grid1, grid2;

	( function initGrid() {
		const def = createGridHelpers( null, null );

		grid1 = def.grid1;

		grid2 = def.grid2;

		grid.add( grid1 );

		grid.add( grid2 );
	} )();

	sceneHelpers.add( grid );

	let orientationGizmo = null;

	container.setOrientationGizmo = function ( gizmo ) {
		orientationGizmo = gizmo;

		if (gizmo.setControls) {
			gizmo.setControls(controls);
		} else {
			
			orientationGizmo.center = controls.center;
		}
	};

	const box = new THREE.Box3();

	const SELECTION_BOX_COLOR_LIGHT = 0x008040; 

	const SELECTION_BOX_COLOR_DARK = 0x008040;  

	const HIGHLIGHT_COLOR = SELECTION_BOX_COLOR_LIGHT;

	let previousSelected = new Set();

	const selectionBox = new THREE.Box3Helper( box );

	selectionBox.material.depthTest = false;

	selectionBox.material.transparent = true;

	selectionBox.material.color.setHex( SELECTION_BOX_COLOR_LIGHT ); 

	selectionBox.visible = false;

	sceneHelpers.add( selectionBox );

	let objectPositionOnDown = null;

	let objectRotationOnDown = null;

	let objectScaleOnDown = null;

	const transformControls = new TransformControls( camera );

	transformControls.addEventListener( 'axis-changed', function () {

		if ( editor.viewportShading !== 'realistic' ) render();

	} );

	transformControls.addEventListener( 'objectChange', function () {

		signals.objectChanged.dispatch( transformControls.object );

	} );

	transformControls.addEventListener( 'mouseDown', function () {

		const object = transformControls.object;

		objectPositionOnDown = object.position.clone();

		objectRotationOnDown = object.rotation.clone();

		objectScaleOnDown = object.scale.clone();

		editor.isTransforming = true;

		controls.enabled = false;

	} );

	transformControls.addEventListener( 'mouseUp', function () {

		const object = transformControls.object;

		if ( object !== undefined ) {

			switch ( transformControls.getMode() ) {

				case 'translate':

					if ( ! objectPositionOnDown.equals( object.position ) ) {

						const delta = object.position.clone().sub( objectPositionOnDown );

					// 	Operator.execute("viewport.transform", context, { //TODO
					}

					break;

				case 'rotate':

					if ( ! objectRotationOnDown.equals( object.rotation ) ) {

						const delta = new THREE.Euler(
							object.rotation.x - objectRotationOnDown.x,
							object.rotation.y - objectRotationOnDown.y,
							object.rotation.z - objectRotationOnDown.z,
							object.rotation.order
						);
					}

					break;

				case 'scale':

					if ( ! objectScaleOnDown.equals( object.scale ) ) {

						const delta = object.scale.clone().sub( objectScaleOnDown );

						editor.execute( new SetScaleCommand( editor, object, object.scale, objectScaleOnDown ) );

					}

					break;

			}

		}

		editor.isTransforming = false;

		controls.enabled = true;

	} );

	sceneHelpers.add( transformControls.getHelper() );

	const xr = new XR( editor, transformControls );
  
	function updateAspectRatio() {

		for ( const uuid in editor.cameras ) {

			const camera = editor.cameras[ uuid ];

			const aspect = container.dom.offsetWidth / container.dom.offsetHeight;

			if ( camera.isPerspectiveCamera ) {

				camera.aspect = aspect;

			} else {

				camera.left = - aspect;

				camera.right = aspect;

			}

			camera.updateProjectionMatrix();

			const cameraHelper = editor.helpers[ camera.id ];

			if ( cameraHelper ) cameraHelper.update();

		}

	}

	function syncViewportSizeFromContainer() {

		if ( renderer === null ) return;

		const width = container.dom.offsetWidth;

		const height = container.dom.offsetHeight;

		if ( width <= 0 || height <= 0 ) return;

		if ( width === lastViewportSyncWidth && height === lastViewportSyncHeight ) return;

		lastViewportSyncWidth = width;

		lastViewportSyncHeight = height;

		renderer.setSize( width, height );

		if ( pathtracer !== null ) {

			pathtracer.setSize( width, height );

		}

		updateAspectRatio();

		render();

	}

	const onDownPosition = new THREE.Vector2();

	const onUpPosition = new THREE.Vector2();

	const onDoubleClickPosition = new THREE.Vector2();

	function getMousePosition( dom, x, y ) {

		const rect = dom.getBoundingClientRect();

		return [ ( x - rect.left ) / rect.width, ( y - rect.top ) / rect.height ];

	}

	/** While pointer lock is on the canvas, clientX/clientY do not track movement; use canvas center (crosshair) for picking. */
	function getNormalizedPickPosition( clientX, clientY ) {

		if ( renderer && document.pointerLockElement === renderer.domElement ) {

			const containerRect = container.dom.getBoundingClientRect();

			const canvasRect = renderer.domElement.getBoundingClientRect();

			const cx = canvasRect.left + canvasRect.width / 2;

			const cy = canvasRect.top + canvasRect.height / 2;

			return [
				( cx - containerRect.left ) / containerRect.width,
				( cy - containerRect.top ) / containerRect.height
			];

		}

		return getMousePosition( container.dom, clientX, clientY );

	}

	function handleClick() {

		if ( onDownPosition.distanceTo( onUpPosition ) === 0 ) {

			const intersects = selector.getPointerIntersects( onUpPosition, editor.viewportCamera );

			signals.intersectionsDetected.dispatch( intersects );

			render();

		}

	}

	function onMouseDown( event ) {
		if ( renderer === null || event.target !== renderer.domElement ) return;

		const array = getNormalizedPickPosition( event.clientX, event.clientY );

		onDownPosition.fromArray( array );

		document.addEventListener( 'mouseup', onMouseUp );

	}

	function onMouseUp( event ) {

		const array = getNormalizedPickPosition( event.clientX, event.clientY );

		onUpPosition.fromArray( array );

		handleClick();

		document.removeEventListener( 'mouseup', onMouseUp );

	}

	function onTouchStart( event ) {

		const touch = event.changedTouches[ 0 ];

		const array = getMousePosition( container.dom, touch.clientX, touch.clientY );

		onDownPosition.fromArray( array );

		document.addEventListener( 'touchend', onTouchEnd );

	}

	function onTouchEnd( event ) {

		const touch = event.changedTouches[ 0 ];

		const array = getMousePosition( container.dom, touch.clientX, touch.clientY );

		onUpPosition.fromArray( array );

		handleClick();

		document.removeEventListener( 'touchend', onTouchEnd );

	}

	function onDoubleClick( event ) {

		const array = getNormalizedPickPosition( event.clientX, event.clientY );

		onDoubleClickPosition.fromArray( array );

		const intersects = selector.getPointerIntersects( onDoubleClickPosition, camera );

		if ( intersects.length > 0 ) {

			const intersect = intersects[ 0 ];

			signals.objectFocused.dispatch( intersect.object );

		}

	}

	container.dom.addEventListener( 'mousedown', onMouseDown );

	container.dom.addEventListener( 'dblclick', onDoubleClick );

	container.dom.addEventListener( 'touchstart', onTouchStart, { passive: false } );

	const controls = new EditorControls( camera );

	controls.addEventListener( 'change', function () {

		signals.cameraChanged.dispatch( camera );

		signals.refreshSidebarObject3D.dispatch( camera );

	} );

	editor.controls = controls;

	orientationGizmo ? orientationGizmo.center = controls.center : null;

	signals.editorCleared.add( function () {

		controls.center.set( 0, 0, 0 );

		pathtracer.reset();

		editor.selector.clearAllSelectionColors();

		previousSelected.clear();

		initPT();

		render();

	} );

	signals.transformModeChanged.add( function ( mode ) {

		transformControls.setMode( mode );

		render();

	} );

	signals.snapChanged.add( function ( dist ) {

		transformControls.setTranslationSnap( dist );

	} );

	signals.spaceChanged.add( function ( space ) {

		transformControls.setSpace( space );

		render();

	} );

	signals.rendererUpdated.add( function () {

		scene.traverse( function ( child ) {

			if ( child.material !== undefined ) {

				child.material.needsUpdate = true;

			}

		} );

		render();

	} );

	signals.rendererCreated.add( function ( newRenderer ) {

		if ( renderer !== null ) {

			renderer.setAnimationLoop( null );

			renderer.dispose();

			pmremGenerator.dispose();

			container.dom.removeChild( renderer.domElement );

		}

		controls.connect( newRenderer.domElement );

		transformControls.connect( newRenderer.domElement );

		renderer = newRenderer;

		renderer.setAnimationLoop( animate );

		renderer.setClearColor( 0xaaaaaa );

		if ( window.matchMedia ) {

			const mediaQuery = window.matchMedia( '(prefers-color-scheme: dark)' );

			mediaQuery.addEventListener( 'change', function ( event ) {

				renderer.setClearColor( event.matches ? 0x333333 : 0xaaaaaa );

				updateGridColors( grid1, grid2, event.matches ? GRID_COLORS_DARK : GRID_COLORS_LIGHT );

				render();

			} );

			renderer.setClearColor( mediaQuery.matches ? 0x333333 : 0xaaaaaa );

			updateGridColors( grid1, grid2, mediaQuery.matches ? GRID_COLORS_DARK : GRID_COLORS_LIGHT );

		}

		renderer.setPixelRatio( window.devicePixelRatio );

		renderer.setSize( container.dom.offsetWidth, container.dom.offsetHeight );

		lastViewportSyncWidth = container.dom.offsetWidth;

		lastViewportSyncHeight = container.dom.offsetHeight;

		pmremGenerator = new THREE.PMREMGenerator( renderer );

		pmremGenerator.compileEquirectangularShader();

		pathtracer = new ViewportPathtracer( renderer );

		container.dom.appendChild( renderer.domElement );

		editor.renderer = renderer;

		if ( window.ResizeObserver ) {
			const resizeObserver = new ResizeObserver( function () {

				syncViewportSizeFromContainer();

			} );

			resizeObserver.observe( container.dom );
		}

		render();

	} );

	signals.rendererDetectKTX2Support.add( function ( ktx2Loader ) {

		if ( renderer !== null ) {

			ktx2Loader.detectSupport( renderer );

		}

	} );

	signals.sceneGraphChanged.add( function () {

		initPT();

		render();

	} );

	let renderScheduled = false;

	function scheduleRender() {
		if (renderScheduled) return;

		renderScheduled = true;

		requestAnimationFrame(() => {
			renderScheduled = false;

			render();
		});
	}

	signals.cameraChanged.add(scheduleRender);

	signals.measurementChanged.add(scheduleRender);

	signals.viewpointChanged.add(scheduleRender);

	signals.animationPathChanged.add(scheduleRender);

	// Timeline animation mutates scene objects (visibility/materials) and must invalidate rendering.
	signals.timelineAnimationChanged?.add(scheduleRender);

	signals.objectSelected.add( function ( object ) {

		selectionBox.visible = false;

		// TODO: Re-enable transform controls - will error on isInstanceProxy objects
		if ( object !== null && object !== scene && object !== camera ) {

			// TODO: Re-enable transform controls - will error on isInstanceProxy objects
		}

		editor.selector.updateSelectionColors();

		render();

	} );

	signals.objectFocused.add( function ( object ) {
		if ( !object ) return;

		controls.focus( object );

	} );

	signals.geometryChanged.add( function ( object ) {

		if ( object !== undefined ) {

			box.setFromObject( object, true );

		}

		initPT();

		render();

	} );

	signals.objectChanged.add( function ( object ) {

		if ( editor.selected === object ) {

			box.setFromObject( object, true );

		}

		if ( object.isPerspectiveCamera ) {

			object.updateProjectionMatrix();

		}

		const helper = editor.helpers[ object.id ];

		if ( helper !== undefined && helper.isSkeletonHelper !== true ) {

			helper.update();

		}

		initPT();

		render();

	} );

	signals.objectRemoved.add( function ( object ) {

		controls.enabled = true; 

		editor.selector.removeObjectFromColorTracking(object);

		if ( object === transformControls.object ) {

			transformControls.detach();

		}

	} );

	signals.materialChanged.add( function () {

		updatePTMaterials();

		render();

	} );

	signals.sceneBackgroundChanged.add( function ( backgroundType, backgroundColor, backgroundTexture, backgroundEquirectangularTexture, backgroundColorSpace, backgroundBlurriness, backgroundIntensity, backgroundRotation ) {

		scene.background = null;

		switch ( backgroundType ) {

			case 'Color':

				scene.background = new THREE.Color( normalizeHexForThree( backgroundColor ) );

				break;

			case 'Texture':

				if ( backgroundTexture ) {

					backgroundTexture.colorSpace = backgroundColorSpace;

					backgroundTexture.needsUpdate = true;

					scene.background = backgroundTexture;

				}

				break;

			case 'Equirectangular':

				if ( backgroundEquirectangularTexture ) {

					backgroundEquirectangularTexture.mapping = THREE.EquirectangularReflectionMapping;

					backgroundEquirectangularTexture.colorSpace = backgroundColorSpace;

					backgroundEquirectangularTexture.needsUpdate = true;

					scene.background = backgroundEquirectangularTexture;

					scene.backgroundBlurriness = backgroundBlurriness;

					scene.backgroundIntensity = backgroundIntensity;

					scene.backgroundRotation.y = backgroundRotation * THREE.MathUtils.DEG2RAD;

					if ( useBackgroundAsEnvironment ) {

						scene.environment = scene.background;

						scene.environmentRotation.y = backgroundRotation * THREE.MathUtils.DEG2RAD;

					}
				}

				break;

		}

		updatePTBackground();

		render();

	} );

	let useBackgroundAsEnvironment = false;

	signals.sceneEnvironmentChanged.add( function ( environmentType, environmentEquirectangularTexture ) {

		scene.environment = null;

		useBackgroundAsEnvironment = false;

		switch ( environmentType ) {
			case 'Background':

				useBackgroundAsEnvironment = true;

				if ( scene.background !== null && scene.background.isTexture ) {

					scene.environment = scene.background;

					scene.environment.mapping = THREE.EquirectangularReflectionMapping;

					scene.environmentRotation.y = scene.backgroundRotation.y;

				}

				break;

			case 'Equirectangular':

				if ( environmentEquirectangularTexture ) {

					scene.environment = environmentEquirectangularTexture;

					scene.environment.mapping = THREE.EquirectangularReflectionMapping;

				}

				break;

			case 'Room':

				if ( pmremGenerator !== null ) {

					scene.environment = pmremGenerator.fromScene( new RoomEnvironment(), 0.04 ).texture;

				}

				break;

		}

		updatePTEnvironment();

		render();

	} );

	let previousBackground = null; 

	signals.sceneFogChanged.add( function ( fogType, fogColor, fogNear, fogFar, fogDensity ) {

		switch ( fogType ) {

			case 'None':
				scene.fog = null;

				sceneHelpers.fog = null;

				if ( previousBackground !== null ) {

					scene.background = previousBackground;

					previousBackground = null;

				}

				break;

			case 'Fog': {
				const fogColorNorm = normalizeHexForThree( fogColor );

				scene.fog = new THREE.Fog( fogColorNorm, fogNear, fogFar );

				sceneHelpers.fog = new THREE.Fog( fogColorNorm, fogNear, fogFar );

				if ( previousBackground === null ) {

					previousBackground = scene.background;

				}

				scene.background = new THREE.Color( fogColorNorm );

				break;
			}

			case 'FogExp2': {
				const fogColorNorm = normalizeHexForThree( fogColor );

				scene.fog = new THREE.FogExp2( fogColorNorm, fogDensity );

				sceneHelpers.fog = new THREE.FogExp2( fogColorNorm, fogDensity );

				if ( previousBackground === null ) {

					previousBackground = scene.background;

				}

				scene.background = new THREE.Color( fogColorNorm );

				break;
			}

		}

		if ( renderer !== null && scene.fog !== null ) {

			renderer.setClearColor( normalizeHexForThree( fogColor ) );

		}

		render();

	} );

	signals.sceneFogSettingsChanged.add( function ( fogType, fogColor, fogNear, fogFar, fogDensity ) {

		const fogColorNorm = normalizeHexForThree( fogColor );

		const fogHexNum = typeof fogColorNorm === 'string' ? parseInt( fogColorNorm.replace( /^#/, '' ), 16 ) : fogColorNorm;

		switch ( fogType ) {

			case 'Fog':
				scene.fog.color.setHex( fogHexNum );

				scene.fog.near = fogNear;

				scene.fog.far = fogFar;

				if ( sceneHelpers.fog ) {

					sceneHelpers.fog.color.setHex( fogHexNum );

					sceneHelpers.fog.near = fogNear;

					sceneHelpers.fog.far = fogFar;

				}

				break;

			case 'FogExp2':
				scene.fog.color.setHex( fogHexNum );

				scene.fog.density = fogDensity;

				if ( sceneHelpers.fog ) {

					sceneHelpers.fog.color.setHex( fogHexNum );

					sceneHelpers.fog.density = fogDensity;

				}

				break;

		}

		if ( scene.fog !== null ) {

			scene.background = new THREE.Color( fogColorNorm );

			if ( renderer !== null ) {

				renderer.setClearColor( fogColorNorm );

			}

		}
	
		render();

	} );

	signals.settingUpdated.add( function ( path, value ) {

		const parts = path.split('.');

		let target = context.config;

		for (let i = 0; i < parts.length - 1; i++) {

			if (!target[parts[i]]) {

				console.warn('[settingUpdated] path not found:', path);

				return;
			}

			target = target[parts[i]];
		}

		const key = parts[parts.length - 1];

		target[key] = value;

		context._saveConfig();

	} );

	signals.viewportCameraChanged.add( function () {

		const viewportCamera = editor.viewportCamera;

		if ( viewportCamera.isPerspectiveCamera || viewportCamera.isOrthographicCamera ) {

			updateAspectRatio();

		}

		controls.enabled = ( viewportCamera === editor.camera );

		initPT();

		render();

	} );

	signals.viewportShadingChanged.add( function () {

		const viewportShading = editor.viewportShading;

		switch ( viewportShading ) {

			case 'realistic':
				pathtracer.init( scene, editor.viewportCamera );

				break;

			case 'solid':
				scene.overrideMaterial = null;

				break;

			case 'normals':
				scene.overrideMaterial = new THREE.MeshNormalMaterial();

				break;

			case 'wireframe':
				scene.overrideMaterial = new THREE.MeshBasicMaterial( { color: 0x000000, wireframe: true } );

				break;

		}

		render();

	} );

	signals.windowResize.add( function () {

		syncViewportSizeFromContainer();

	} );

	function onWindowResizeForViewport() {

		signals.windowResize.dispatch();

	}

	window.addEventListener( 'resize', onWindowResizeForViewport );

	signals.showHelpersChanged.add( function ( appearanceStates ) {

		grid.visible = appearanceStates.gridHelper;

		sceneHelpers.traverse( function ( object ) {

			switch ( object.type ) {

				case 'CameraHelper':

				{

					object.visible = appearanceStates.cameraHelpers;

					break;

				}

				case 'PointLightHelper':

				case 'DirectionalLightHelper':

				case 'SpotLightHelper':

				case 'HemisphereLightHelper':

				{

					object.visible = appearanceStates.lightHelpers;

					break;

				}

				case 'SkeletonHelper':

				{

					object.visible = appearanceStates.skeletonHelpers;

					break;

				}

				default:

				{
				}

			}

		} );

		render();

	} );

	signals.cameraResetted.add( updateAspectRatio );

	let prevActionsInUse = 0;

	const clock = new THREE.Clock(); 

	function animate() {

		const mixer = editor.mixer;

		const delta = clock.getDelta();

		let needsUpdate = false;

		if ( editor.tilesManager ) {
			
			editor.tilesManager.update();

			needsUpdate = true;
		}

		const actions = mixer.stats.actions;

		if ( actions.inUse > 0 || prevActionsInUse > 0 ) {

			prevActionsInUse = actions.inUse;

			mixer.update( delta );

			needsUpdate = true;

			if ( editor.selected !== null ) {

				editor.selected.updateWorldMatrix( false, true ); 

				selectionBox.box.setFromObject( editor.selected, true ); 

			}

		}

		if ( orientationGizmo.animating === true ) {

			orientationGizmo.update( delta );

			needsUpdate = true;

		}

		if ( renderer !== null && renderer.xr.isPresenting === true ) {

			needsUpdate = true;

		}

		if ( needsUpdate === true ) render();

		updatePT();

	}

	function initPT() {

		if ( editor.viewportShading === 'realistic' ) {

			pathtracer.init( scene, editor.viewportCamera );

		}

	}

	function updatePTBackground() {

		if ( editor.viewportShading === 'realistic' ) {

			pathtracer.setBackground( scene.background, scene.backgroundBlurriness );

		}

	}

	function updatePTEnvironment() {

		if ( editor.viewportShading === 'realistic' ) {

			pathtracer.setEnvironment( scene.environment );

		}

	}

	function updatePTMaterials() {

		if ( editor.viewportShading === 'realistic' ) {

			pathtracer.updateMaterials();

		}

	}

	function updatePT() {

		if ( editor.viewportShading === 'realistic' ) {

			pathtracer.update();

			editor.signals.pathTracerUpdated.dispatch( pathtracer.getSamples() );

		}

	}

	let startTime = 0;

	let endTime = 0;

	function render() {

		if ( renderer === null ) return;

		startTime = performance.now();

		renderer.setViewport( 0, 0, container.dom.offsetWidth, container.dom.offsetHeight );

		renderer.render( scene, editor.viewportCamera );

		if ( camera === editor.viewportCamera ) {

			renderer.autoClear = false;

			if ( sceneHelpers.visible === true ) renderer.render( sceneHelpers, camera );

			if ( renderer.xr.isPresenting !== true ) orientationGizmo.render();

			renderer.autoClear = true;

		}

		endTime = performance.now();

		editor.signals.sceneRendered.dispatch( endTime - startTime );

	}

	attachViewportLoadStatusStrip( context, container );

	container.applySceneConfig = function ( sceneConfig ) {

		if ( ! sceneConfig ) return;

		if ( sceneConfig.gridVisible !== undefined ) grid.visible = !! sceneConfig.gridVisible;

		if ( sceneConfig.primaryGrid || sceneConfig.secondaryGrid ) {

			grid.remove( grid1 );

			grid.remove( grid2 );

			grid1.material.dispose();

			grid2.material.dispose();

			grid1.geometry.dispose();

			grid2.geometry.dispose();

			const primary = sceneConfig.primaryGrid ? {
				size: sceneConfig.primaryGrid.size,
				divisions: sceneConfig.primaryGrid.divisions,
				color: sceneConfig.primaryGrid.color,
				opacity: sceneConfig.primaryGrid.opacity
			} : null;

			const secondary = sceneConfig.secondaryGrid ? {
				size: sceneConfig.secondaryGrid.size,
				divisions: sceneConfig.secondaryGrid.divisions,
				color: sceneConfig.secondaryGrid.color,
				opacity: sceneConfig.secondaryGrid.opacity
			} : null;

			const next = createGridHelpers( primary, secondary );

			grid1 = next.grid1;

			grid2 = next.grid2;

			grid.add( grid1 );

			grid.add( grid2 );

			if ( renderer !== null && window.matchMedia ) {

				const mq = window.matchMedia( '(prefers-color-scheme: dark)' );

				updateGridColors( grid1, grid2, mq.matches ? GRID_COLORS_DARK : GRID_COLORS_LIGHT );
			}
		}
	};

	return container;

}

function updateGridColors( grid1, grid2, colors ) {

	grid1.material.color.setHex( colors[ 0 ] );

	grid2.material.color.setHex( colors[ 1 ] );

}

export { Viewport };
