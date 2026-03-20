import * as THREE from 'three';

import { WebGPURenderer } from 'three/webgpu';

import { UINumber, UIPanel, UIText, UISelect } from '../../../../drawUI/ui.js';

import { UIBoolean } from '../../../ui/ui.three.js';

import { Components as UIComponents } from '../../../ui/Components/Components.js';

import { createSettingsControlsGroup, createSettingsListRow } from './Sidebar.Settings.rows.js';

function SidebarProjectRenderer( editor ) {

	const config = editor.config;

	const signals = editor.signals;

	const strings = editor.strings;

	let currentRenderer = null;

	const container = new UIPanel();

	container.setBorderTop( '0px' );

	container.add( UIComponents.title( 'Renderer Settings' ) );

	const antialiasBoolean = new UIBoolean( config.getKey( 'project/renderer/antialias' ) ).onChange( createRenderer );

	const antialiasRow = createSettingsListRow();

	antialiasRow.add( new UIText( strings.getKey( 'sidebar/project/antialias' ) ).setClass( 'Label' ) );

	const antialiasControls = createSettingsControlsGroup();

	antialiasControls.add( antialiasBoolean );

	antialiasRow.add( antialiasControls );

	container.add( antialiasRow );

	const shadowsBoolean = new UIBoolean( config.getKey( 'project/renderer/shadows' ) ).onChange( updateShadows );

	const shadowTypeSelect = new UISelect().setOptions( {
		0: 'Basic',
		1: 'PCF',
		2: 'PCF Soft',
		
	} ).setWidth( '125px' ).onChange( updateShadows );

	shadowTypeSelect.setValue( config.getKey( 'project/renderer/shadowType' ) );

	const shadowsRow = createSettingsListRow();

	shadowsRow.add( new UIText( strings.getKey( 'sidebar/project/shadows' ) ).setClass( 'Label' ) );

	const shadowsControls = createSettingsControlsGroup();

	shadowsControls.add( shadowsBoolean );

	shadowsControls.add( shadowTypeSelect );

	shadowsRow.add( shadowsControls );

	container.add( shadowsRow );

	function updateShadows() {

		currentRenderer.shadowMap.enabled = shadowsBoolean.getValue();

		currentRenderer.shadowMap.type = parseFloat( shadowTypeSelect.getValue() );

		signals.rendererUpdated.dispatch();

	}

	const toneMappingSelect = new UISelect().setOptions( {
		0: 'No',
		1: 'Linear',
		2: 'Reinhard',
		3: 'Cineon',
		4: 'ACESFilmic',
		6: 'AgX',
		7: 'Neutral'
	} ).setWidth( '120px' ).onChange( updateToneMapping );

	toneMappingSelect.setValue( config.getKey( 'project/renderer/toneMapping' ) );

	const toneMappingExposure = new UINumber( config.getKey( 'project/renderer/toneMappingExposure' ) );

	toneMappingExposure.setDisplay( toneMappingSelect.getValue() === '0' ? 'none' : '' );

	toneMappingExposure.setWidth( '30px' );

	toneMappingExposure.setRange( 0, 10 );

	toneMappingExposure.onChange( updateToneMapping );

	const toneMappingRow = createSettingsListRow();

	toneMappingRow.add( new UIText( strings.getKey( 'sidebar/project/toneMapping' ) ).setClass( 'Label' ) );

	const toneMappingControls = createSettingsControlsGroup();

	toneMappingControls.add( toneMappingSelect );

	toneMappingControls.add( toneMappingExposure );

	toneMappingRow.add( toneMappingControls );

	container.add( toneMappingRow );

	function updateToneMapping() {

		toneMappingExposure.setDisplay( toneMappingSelect.getValue() === '0' ? 'none' : '' );

		currentRenderer.toneMapping = parseFloat( toneMappingSelect.getValue() );

		currentRenderer.toneMappingExposure = toneMappingExposure.getValue();

		signals.rendererUpdated.dispatch();

	}

	async function createRenderer() {

		currentRenderer = new WebGPURenderer( { antialias: antialiasBoolean.getValue() } );

		await currentRenderer.init();

		currentRenderer.shadowMap.enabled = shadowsBoolean.getValue();

		currentRenderer.shadowMap.type = parseFloat( shadowTypeSelect.getValue() );

		currentRenderer.toneMapping = parseFloat( toneMappingSelect.getValue() );

		currentRenderer.toneMappingExposure = toneMappingExposure.getValue();

		signals.rendererCreated.dispatch( currentRenderer );

		signals.rendererUpdated.dispatch();

	}

	createRenderer();

	signals.editorCleared.add( function () {

		currentRenderer.shadowMap.enabled = true;

		currentRenderer.shadowMap.type = THREE.PCFShadowMap;

		currentRenderer.toneMapping = THREE.NoToneMapping;

		currentRenderer.toneMappingExposure = 1;

		shadowsBoolean.setValue( currentRenderer.shadowMap.enabled );

		shadowTypeSelect.setValue( currentRenderer.shadowMap.type );

		toneMappingSelect.setValue( currentRenderer.toneMapping );

		toneMappingExposure.setValue( currentRenderer.toneMappingExposure );

		toneMappingExposure.setDisplay( currentRenderer.toneMapping === 0 ? 'none' : '' );

		signals.rendererUpdated.dispatch();

	} );

	signals.rendererUpdated.add( function () {

		config.setKey(
			'project/renderer/antialias', antialiasBoolean.getValue(),
			'project/renderer/shadows', shadowsBoolean.getValue(),
			'project/renderer/shadowType', parseFloat( shadowTypeSelect.getValue() ),
			'project/renderer/toneMapping', parseFloat( toneMappingSelect.getValue() ),
			'project/renderer/toneMappingExposure', toneMappingExposure.getValue()
		);

	} );

	return container;

}

export { SidebarProjectRenderer };
