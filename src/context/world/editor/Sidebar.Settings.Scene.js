import { UIPanel, UIText, UIColor, UISelect, UINumber } from '../../../../drawUI/ui.js';

import { UITexture } from '../../../ui/ui.three.js';

import { Components as UIComponents } from '../../../ui/Components/Components.js';

import { createSettingsControlsGroup, createSettingsListRow } from './Sidebar.Settings.rows.js';

import * as THREE from 'three';

function SidebarSettingsScene( editor ) {

	const config = editor.config;

	const strings = editor.strings;

	const signals = editor.signals;

	const container = new UIPanel();

	container.add( UIComponents.title( 'Scene Settings' ) );

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

	const backgroundColor = new UIColor().setValue( '#000000' ).onInput( onBackgroundChanged );

	const backgroundTexture = new UITexture( editor ).onChange( onBackgroundChanged );

	backgroundTexture.setDisplay( 'none' );

	const backgroundEquirectangularTexture = new UITexture( editor ).onChange( onBackgroundChanged );

	backgroundEquirectangularTexture.setDisplay( 'none' );

	const backgroundRow = createSettingsListRow();

	backgroundRow.add( new UIText( strings.getKey( 'sidebar/scene/background' ) ).setClass( 'Label' ) );

	const backgroundControls = createSettingsControlsGroup();

	backgroundControls.add( backgroundType );

	backgroundControls.add( backgroundColor );

	backgroundControls.add( backgroundTexture );

	backgroundControls.add( backgroundEquirectangularTexture );

	backgroundRow.add( backgroundControls );

	const backgroundColorSpace = new UISelect().setOptions( {

		[ THREE.NoColorSpace ]: 'No Color Space',
		[ THREE.LinearSRGBColorSpace ]: 'srgb-linear',
		[ THREE.SRGBColorSpace ]: 'srgb',

	} ).setWidth( '150px' );

	backgroundColorSpace.setValue( THREE.NoColorSpace );

	backgroundColorSpace.onChange( onBackgroundChanged );

	const backgroundColorSpaceRow = createSettingsListRow();

	backgroundColorSpaceRow.setDisplay( 'none' );

	backgroundColorSpaceRow.dom.style.marginLeft = '120px';

	const backgroundColorSpaceControls = createSettingsControlsGroup();

	backgroundColorSpaceControls.add( backgroundColorSpace );

	backgroundColorSpaceRow.add( backgroundColorSpaceControls );

	const backgroundBlurriness = new UINumber( 0 ).setWidth( '40px' ).setRange( 0, 1 ).onChange( onBackgroundChanged );

	const backgroundIntensity = new UINumber( 1 ).setWidth( '40px' ).setRange( 0, Infinity ).onChange( onBackgroundChanged );

	const backgroundRotation = new UINumber( 0 ).setWidth( '40px' ).setRange( - 180, 180 ).setStep( 10 ).setNudge( 0.1 ).setUnit( '°' ).onChange( onBackgroundChanged );

	const backgroundEquirectRow = createSettingsListRow();

	backgroundEquirectRow.setDisplay( 'none' );

	backgroundEquirectRow.dom.style.marginLeft = '120px';

	const backgroundEquirectControls = createSettingsControlsGroup();

	backgroundEquirectControls.add( backgroundBlurriness );

	backgroundEquirectControls.add( backgroundIntensity );

	backgroundEquirectControls.add( backgroundRotation );

	backgroundEquirectRow.add( backgroundEquirectControls );

	container.add( backgroundRow );

	container.add( backgroundColorSpaceRow );

	container.add( backgroundEquirectRow );

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

	const environmentEquirectangularTexture = new UITexture( editor ).onChange( onEnvironmentChanged );

	environmentEquirectangularTexture.setDisplay( 'none' );

	const environmentRow = createSettingsListRow();

	environmentRow.add( new UIText( strings.getKey( 'sidebar/scene/environment' ) ).setClass( 'Label' ) );

	const environmentControls = createSettingsControlsGroup();

	environmentControls.add( environmentType );

	environmentControls.add( environmentEquirectangularTexture );

	environmentRow.add( environmentControls );

	container.add( environmentRow );

	const fogType = new UISelect().setOptions( {

		'None': '',
		'Fog': 'Linear',
		'FogExp2': 'Exponential'

	} ).setWidth( '150px' );

	fogType.onChange( function () {

		onFogChanged();

		refreshFogUI();

	} );

	const fogTypeRow = createSettingsListRow();

	fogTypeRow.add( new UIText( strings.getKey( 'sidebar/scene/fog' ) ).setClass( 'Label' ) );

	const fogTypeControls = createSettingsControlsGroup();

	fogTypeControls.add( fogType );

	fogTypeRow.add( fogTypeControls );

	container.add( fogTypeRow );

	const fogColor = new UIColor().setValue( '#aaaaaa' );

	fogColor.onInput( onFogSettingsChanged );

	const fogNear = new UINumber( 0.1 ).setWidth( '40px' ).setRange( 0, Infinity ).onChange( onFogSettingsChanged );

	const fogFar = new UINumber( 50 ).setWidth( '40px' ).setRange( 0, Infinity ).onChange( onFogSettingsChanged );

	const fogDensity = new UINumber( 0.05 ).setWidth( '40px' ).setRange( 0, 0.1 ).setStep( 0.001 ).setPrecision( 3 ).onChange( onFogSettingsChanged );

	const fogPropertiesRow = createSettingsListRow();

	fogPropertiesRow.setDisplay( 'none' );

	fogPropertiesRow.dom.style.marginLeft = '120px';

	const fogPropertiesControls = createSettingsControlsGroup();

	fogPropertiesControls.add( fogColor );

	fogPropertiesControls.add( fogNear );

	fogPropertiesControls.add( fogFar );

	fogPropertiesControls.add( fogDensity );

	fogPropertiesRow.add( fogPropertiesControls );

	container.add( fogPropertiesRow );

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

		const type = fogType.getValue();

		const color = fogColor.getHexValue();

		const near = fogNear.getValue();

		const far = fogFar.getValue();

		const density = fogDensity.getValue();

		signals.sceneFogChanged.dispatch(type, color, near, far, density);

		saveFogConfig(type, color, near, far, density);

	}

	function onFogSettingsChanged() {

		const type = fogType.getValue();

		const color = fogColor.getHexValue();

		const near = fogNear.getValue();

		const far = fogFar.getValue();

		const density = fogDensity.getValue();

		signals.sceneFogSettingsChanged.dispatch(type, color, near, far, density);

		saveFogConfig(type, color, near, far, density);

	}

	function saveFogConfig(fogTypeVal, fogColor, fogNear, fogFar, fogDensity) {

		console.log('[saveFogConfig] dispatching settingUpdated signals', { fogTypeVal, fogColor, fogNear, fogFar, fogDensity });

		if (fogTypeVal === 'None') {

			signals.settingUpdated.dispatch('app.Scene.enableFog', false);

			signals.settingUpdated.dispatch('app.Scene.fog', null);

		} else {

			signals.settingUpdated.dispatch('app.Scene.enableFog', true);

			signals.settingUpdated.dispatch('app.Scene.fog', {
				fogType: fogTypeVal,
				fogColor,
				fogNear,
				fogFar,
				fogDensity
			});
		}
	}

	function refreshFogUI() {

		const type = fogType.getValue();

		fogPropertiesRow.setDisplay( type === 'None' ? 'none' : '' );

		fogNear.setDisplay( type === 'Fog' ? '' : 'none' );

		fogFar.setDisplay( type === 'Fog' ? '' : 'none' );

		fogDensity.setDisplay( type === 'FogExp2' ? '' : 'none' );

	}

	function refreshSceneSettingsUI() {

		const scene = editor.scene;

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

	refreshSceneSettingsUI();

	signals.sceneGraphChanged.add( refreshSceneSettingsUI );

	signals.sceneBackgroundChanged.add( function () {

		if ( environmentType.getValue() === 'Background' ) {

			onEnvironmentChanged();

			refreshEnvironmentUI();

		}

	} );

	return container;

}

export { SidebarSettingsScene };