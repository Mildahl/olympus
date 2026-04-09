import * as THREE from 'three';

import { UIPanel, UIBreak, UIRow, UIColor, UISelect, UIText, UINumber, UIButton } from '../../../../drawUI/ui.js';

import { UIOutliner, UITexture } from '../../../ui/ui.three.js';

function SidebarScene( editor ) {

	const signals = editor.signals;

	const strings = editor.strings;

	const container = new UIPanel();

	container.setBorderTop( '0' );

	container.setPaddingTop( '20px' );
	const nodeStates = new WeakMap();

	function traverse( object, callback ) {

		callback( object );

		for ( const child of object.children ) {
			traverse( child, callback );
		}

	}

	function collapseAll() {

		traverse( editor.scene, obj => nodeStates.set( obj, false ) );

		refreshUI();

	}

	function expandAll() {

		traverse( editor.scene, obj => nodeStates.set( obj, true ) );

		refreshUI();

	}

	function buildOption( object, draggable ) {

		const option = document.createElement( 'div' );

		option.draggable = draggable;

		option.value = object.id;
		if ( nodeStates.has( object ) ) {
			const state = nodeStates.get( object );

			const opener = document.createElement( 'span' );

			opener.classList.add( 'opener' );

			if ( object.children.length > 0 ) {
				opener.classList.add( state ? 'open' : 'closed' );
			}

			opener.addEventListener( 'click', function () {
				nodeStates.set( object, nodeStates.get( object ) === false ); 

				refreshUI();
			} );

			option.appendChild( opener );
		}
		const ifcIconClasses = [
			'IfcWall', 'IfcDoor', 'IfcProject', 'IfcSite', 'IfcWindow', 'IfcOpening'
		];

		if (object.ifcClass && ifcIconClasses.includes(object.ifcClass)) {
			const iconImg = document.createElement('img');

			iconImg.className = 'icon';

			iconImg.src = `./data/resources/icons/entities/${object.ifcClass}.svg`;

			iconImg.alt = object.ifcClass;

			iconImg.style.marginRight = '6px';

			option.appendChild(iconImg);
		}
		const nameSpan = document.createElement('span');

		nameSpan.className = 'object-name';

		nameSpan.innerHTML = escapeHTML(object.name);

		option.appendChild(nameSpan);

		if (object.ifcClass) {
			
			const badge = document.createElement('span');

			badge.className = 'ui-badge';

			badge.textContent = object.ifcClass;

			badge.style.marginLeft = '8px';

			option.appendChild(badge);
		}
		option.innerHTML += buildHTMLExtras(object);

		return option;

	}

	function getMaterialName( material ) {

		if ( Array.isArray( material ) ) {

			const array = [];

			for ( let i = 0; i < material.length; i ++ ) {

				array.push( material[ i ].name );

			}

			return array.join( ',' );

		}

		return material.name;

	}

	function escapeHTML( html ) {

		return html
			.replace( /&/g, '&amp;' )
			.replace( /"/g, '&quot;' )
			.replace( /'/g, '&#39;' )
			.replace( /</g, '&lt;' )
			.replace( />/g, '&gt;' );

	}

	function getObjectType( object ) {

		if ( object.isScene ) return 'Scene';

		if ( object.isCamera ) return 'Camera';

		if ( object.isLight ) return 'Light';

		if ( object.isMesh ) return 'Mesh';

		if ( object.isLine ) return 'Line';

		if ( object.isPoints ) return 'Points';

		return 'Object3D';

	}
	function buildHTMLExtras( object ) {
		let html = '';

		if ( object.isMesh ) {
			const geometry = object.geometry;

			const material = object.material;

			html += ` <span class="type Geometry"></span> ${ escapeHTML( geometry.name ) }`;

			html += ` <span class="type Material"></span> ${ escapeHTML( getMaterialName( material ) ) }`;
		}

		html += getScript( object.uuid );

		return html;
	}

	function getScript( uuid ) {

		if ( editor.scripts[ uuid ] === undefined ) return '';

		if ( editor.scripts[ uuid ].length === 0 ) return '';

		return ' <span class="type Script"></span>';

	}

	let ignoreObjectSelectedSignal = false;

	const spatialStructure = new UIOutliner( editor );

	spatialStructure.setId( 'spatialStructure' );

	spatialStructure.onChange( function () {

		ignoreObjectSelectedSignal = true;

		editor.selectById( parseInt( spatialStructure.getValue() ) );

		ignoreObjectSelectedSignal = false;

	} );

	spatialStructure.onDblClick( function () {

		editor.focusById( parseInt( spatialStructure.getValue() ) );

	} );

	container.add( spatialStructure );

	container.add( new UIBreak() );
	const buttonsRow = new UIRow();

	const collapseButton = new UIButton( 'Collapse All' );

	const expandButton = new UIButton( 'Expand All' );

	collapseButton.onClick( collapseAll );

	expandButton.onClick( expandAll );

	buttonsRow.add( collapseButton );

	buttonsRow.add( expandButton );

	container.add( buttonsRow );

	container.add( new UIBreak() );
	const backgroundRow = new UIRow();

	const backgroundType = new UISelect().setOptions( {

		'None': '',
		'Color': 'Color',
		'Texture': 'Texture',
		'Equirectangular': 'Equirect'

	} ).setWidth( '150px' );

	backgroundType.onChange( function () {

		onBackgroundChanged();

		refreshBackgroundUI();

	} );

	backgroundRow.add( new UIText( strings.getKey( 'sidebar/scene/background' ) ).setClass( 'Label' ) );

	backgroundRow.add( backgroundType );

	const backgroundColor = new UIColor().setValue( '#d47979ff' ).setMarginLeft( '8px' ).onInput( onBackgroundChanged );

	backgroundRow.add( backgroundColor );

	const backgroundTexture = new UITexture( editor ).setMarginLeft( '8px' ).onChange( onBackgroundChanged );

	backgroundTexture.setDisplay( 'none' );

	backgroundRow.add( backgroundTexture );

	const backgroundEquirectangularTexture = new UITexture( editor ).setMarginLeft( '8px' ).onChange( onBackgroundChanged );

	backgroundEquirectangularTexture.setDisplay( 'none' );

	backgroundRow.add( backgroundEquirectangularTexture );

	const backgroundColorSpaceRow = new UIRow();

	backgroundColorSpaceRow.setDisplay( 'none' );

	backgroundColorSpaceRow.setMarginLeft( '120px' );

	const backgroundColorSpace = new UISelect().setOptions( {

		[ THREE.NoColorSpace ]: 'No Color Space',
		[ THREE.LinearSRGBColorSpace ]: 'srgb-linear',
		[ THREE.SRGBColorSpace ]: 'srgb',

	} ).setWidth( '150px' );

	backgroundColorSpace.setValue( THREE.NoColorSpace );

	backgroundColorSpace.onChange( onBackgroundChanged );

	backgroundColorSpaceRow.add( backgroundColorSpace );

	container.add( backgroundRow );

	container.add( backgroundColorSpaceRow );

	const backgroundEquirectRow = new UIRow();

	backgroundEquirectRow.setDisplay( 'none' );

	backgroundEquirectRow.setMarginLeft( '120px' );

	const backgroundBlurriness = new UINumber( 0 ).setWidth( '40px' ).setRange( 0, 1 ).onChange( onBackgroundChanged );

	backgroundEquirectRow.add( backgroundBlurriness );

	const backgroundIntensity = new UINumber( 1 ).setWidth( '40px' ).setRange( 0, Infinity ).onChange( onBackgroundChanged );

	backgroundEquirectRow.add( backgroundIntensity );

	const backgroundRotation = new UINumber( 0 ).setWidth( '40px' ).setRange( - 180, 180 ).setStep( 10 ).setNudge( 0.1 ).setUnit( '°' ).onChange( onBackgroundChanged );

	backgroundEquirectRow.add( backgroundRotation );

	container.add( backgroundEquirectRow );

	function onBackgroundChanged() {

		signals.sceneBackgroundChanged.dispatch(
			backgroundType.getValue(),
			backgroundColor.getHexValue(),
			backgroundTexture.getValue(),
			backgroundEquirectangularTexture.getValue(),
			backgroundColorSpace.getValue(),
			backgroundBlurriness.getValue(),
			backgroundIntensity.getValue(),
			backgroundRotation.getValue()
		);

	}

	function refreshBackgroundUI() {

		const type = backgroundType.getValue();

		backgroundType.setWidth( type === 'None' ? '150px' : '110px' );

		backgroundColor.setDisplay( type === 'Color' ? '' : 'none' );

		backgroundTexture.setDisplay( type === 'Texture' ? '' : 'none' );

		backgroundEquirectangularTexture.setDisplay( type === 'Equirectangular' ? '' : 'none' );

		backgroundEquirectRow.setDisplay( type === 'Equirectangular' ? '' : 'none' );

		if ( type === 'Texture' || type === 'Equirectangular' ) {

			backgroundColorSpaceRow.setDisplay( '' );

		} else {

			backgroundColorSpaceRow.setDisplay( 'none' );

		}

	}
	const environmentRow = new UIRow();

	const environmentType = new UISelect().setOptions( {

		'None': '',
		'Background': 'Background',
		'Equirectangular': 'Equirect',
		'Room': 'Room'

	} ).setWidth( '150px' );

	environmentType.setValue( 'None' );

	environmentType.onChange( function () {

		onEnvironmentChanged();

		refreshEnvironmentUI();

	} );

	environmentRow.add( new UIText( strings.getKey( 'sidebar/scene/environment' ) ).setClass( 'Label' ) );

	environmentRow.add( environmentType );

	const environmentEquirectangularTexture = new UITexture( editor ).setMarginLeft( '8px' ).onChange( onEnvironmentChanged );

	environmentEquirectangularTexture.setDisplay( 'none' );

	environmentRow.add( environmentEquirectangularTexture );

	container.add( environmentRow );

	function onEnvironmentChanged() {

		signals.sceneEnvironmentChanged.dispatch(
			environmentType.getValue(),
			environmentEquirectangularTexture.getValue()
		);

	}

	function refreshEnvironmentUI() {

		const type = environmentType.getValue();

		environmentType.setWidth( type !== 'Equirectangular' ? '150px' : '110px' );

		environmentEquirectangularTexture.setDisplay( type === 'Equirectangular' ? '' : 'none' );

	}
	function onFogChanged() {

		signals.sceneFogChanged.dispatch(
			fogType.getValue(),
			fogColor.getHexValue(),
			fogNear.getValue(),
			fogFar.getValue(),
			fogDensity.getValue()
		);

	}

	function onFogSettingsChanged() {

		signals.sceneFogSettingsChanged.dispatch(
			fogType.getValue(),
			fogColor.getHexValue(),
			fogNear.getValue(),
			fogFar.getValue(),
			fogDensity.getValue()
		);

	}

	const fogTypeRow = new UIRow();

	const fogType = new UISelect().setOptions( {

		'None': '',
		'Fog': 'Linear',
		'FogExp2': 'Exponential'

	} ).setWidth( '150px' );

	fogType.onChange( function () {

		onFogChanged();

		refreshFogUI();

	} );

	fogTypeRow.add( new UIText( strings.getKey( 'sidebar/scene/fog' ) ).setClass( 'Label' ) );

	fogTypeRow.add( fogType );

	container.add( fogTypeRow );
	const fogPropertiesRow = new UIRow();

	fogPropertiesRow.setDisplay( 'none' );

	fogPropertiesRow.setMarginLeft( '120px' );

	container.add( fogPropertiesRow );

	const fogColor = new UIColor().setValue( '#aaaaaa' );

	fogColor.onInput( onFogSettingsChanged );

	fogPropertiesRow.add( fogColor );
	const fogNear = new UINumber( 0.1 ).setWidth( '40px' ).setRange( 0, Infinity ).onChange( onFogSettingsChanged );

	fogPropertiesRow.add( fogNear );
	const fogFar = new UINumber( 50 ).setWidth( '40px' ).setRange( 0, Infinity ).onChange( onFogSettingsChanged );

	fogPropertiesRow.add( fogFar );
	const fogDensity = new UINumber( 0.05 ).setWidth( '40px' ).setRange( 0, 0.1 ).setStep( 0.001 ).setPrecision( 3 ).onChange( onFogSettingsChanged );

	fogPropertiesRow.add( fogDensity );
	function refreshUI() {

		const camera = editor.camera;

		const scene = editor.scene;

		const options = [];
		options.push( buildOption( scene, false ) );

		( function addObjects( objects, pad ) {
			for ( let i = 0, l = objects.length; i < l; i ++ ) {
				const object = objects[ i ];

				if (object.isLine) continue; 

				if ( nodeStates.has( object ) === false ) {
					nodeStates.set( object, true );
				}

				const option = buildOption( object, true );

				option.style.paddingLeft = ( pad * 18 ) + 'px';

				options.push( option );

				if ( nodeStates.get( object ) === true ) {
					addObjects( object.children, pad + 1 );
				}
			}
		} )( scene.children, 0 );

		spatialStructure.setOptions( options );

		if ( editor.selected !== null ) {

			spatialStructure.setValue( editor.selected.id );

		}

		if ( scene.background ) {

			if ( scene.background.isColor ) {

				backgroundType.setValue( 'Color' );

				backgroundColor.setHexValue( scene.background.getHex() );

			} else if ( scene.background.isTexture ) {

				if ( scene.background.mapping === THREE.EquirectangularReflectionMapping ) {

					backgroundType.setValue( 'Equirectangular' );

					backgroundEquirectangularTexture.setValue( scene.background );

					backgroundBlurriness.setValue( scene.backgroundBlurriness );

					backgroundIntensity.setValue( scene.backgroundIntensity );

				} else {

					backgroundType.setValue( 'Texture' );

					backgroundTexture.setValue( scene.background );

				}

				backgroundColorSpace.setValue( scene.background.colorSpace );

			}

		} else {

			backgroundType.setValue( 'None' );

			backgroundTexture.setValue( null );

			backgroundEquirectangularTexture.setValue( null );

			backgroundColorSpace.setValue( THREE.NoColorSpace );

		}

		if ( scene.environment ) {

			if ( scene.background && scene.background.isTexture && scene.background.uuid === scene.environment.uuid ) {

				environmentType.setValue( 'Background' );

			} else if ( scene.environment.mapping === THREE.EquirectangularReflectionMapping ) {

				environmentType.setValue( 'Equirectangular' );

				environmentEquirectangularTexture.setValue( scene.environment );

			} else if ( scene.environment.isRenderTargetTexture === true ) {

				environmentType.setValue( 'Room' );

			}

		} else {

			environmentType.setValue( 'None' );

			environmentEquirectangularTexture.setValue( null );

		}

		if ( scene.fog ) {

			fogColor.setHexValue( scene.fog.color.getHex() );

			if ( scene.fog.isFog ) {

				fogType.setValue( 'Fog' );

				fogNear.setValue( scene.fog.near );

				fogFar.setValue( scene.fog.far );

			} else if ( scene.fog.isFogExp2 ) {

				fogType.setValue( 'FogExp2' );

				fogDensity.setValue( scene.fog.density );

			}

		} else {

			fogType.setValue( 'None' );

		}

		refreshBackgroundUI();

		refreshEnvironmentUI();

		refreshFogUI();

	}

	function refreshFogUI() {

		const type = fogType.getValue();

		fogPropertiesRow.setDisplay( type === 'None' ? 'none' : '' );

		fogNear.setDisplay( type === 'Fog' ? '' : 'none' );

		fogFar.setDisplay( type === 'Fog' ? '' : 'none' );

		fogDensity.setDisplay( type === 'FogExp2' ? '' : 'none' );

	}

	refreshUI();
	signals.editorCleared.add( refreshUI );

	signals.sceneGraphChanged.add( refreshUI );

	signals.refreshSidebarEnvironment.add( refreshUI );

	signals.objectChanged.add( function ( object ) {

		const options = spatialStructure.options;

		for ( let i = 0; i < options.length; i ++ ) {

			const option = options[ i ];

			if ( option.value === object.id ) {

				const openerElement = option.querySelector( ':scope > .opener' );

				const openerHTML = openerElement ? openerElement.outerHTML : '';
				const iconHTML = object.ifcClass && ['IfcWall', 'IfcDoor', 'IfcProject', 'IfcSite', 'IfcWindow', 'IfcOpening'].includes(object.ifcClass)
					? `<img class="icon" src="./data/resources/icons/entities/${object.ifcClass}.svg" alt="${object.ifcClass}" style="margin-right: 6px;">`
					: '';
				
				const badgeHTML = object.ifcClass
					? `<span class="ui-badge" style="margin-left: 8px;">${object.ifcClass}</span>`
					: '';

				option.innerHTML = openerHTML + iconHTML + 
					`<span class="object-name">${escapeHTML(object.name)}</span>` + 
					badgeHTML + buildHTMLExtras( object );

				return;

			}

		}

	} );

	signals.scriptAdded.add( function () {

		if ( editor.selected !== null ) signals.objectChanged.dispatch( editor.selected );

	} );

	signals.scriptRemoved.add( function () {

		if ( editor.selected !== null ) signals.objectChanged.dispatch( editor.selected );

	} );
	signals.objectSelected.add( function ( object ) {

		if ( ignoreObjectSelectedSignal === true ) return;

		if ( object !== null && object.parent !== null ) {

			let needsRefresh = false;

			let parent = object.parent;

			while ( parent !== editor.scene ) {

				if ( nodeStates.get( parent ) !== true ) {

					nodeStates.set( parent, true );

					needsRefresh = true;

				}

				parent = parent.parent;

			}

			if ( needsRefresh ) refreshUI();

			spatialStructure.setValue( object.id );

		} else {

			spatialStructure.setValue( null );

		}

	} );

	signals.sceneBackgroundChanged.add( function () {

		if ( environmentType.getValue() === 'Background' ) {

			onEnvironmentChanged();

			refreshEnvironmentUI();

		}

	} );

	return container;

}

export { SidebarScene };
