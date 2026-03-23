import { UIPanel, UIText, UINumber } from '../../../../drawUI/ui.js';

import { Components as UIComponents } from '../../../ui/Components/Components.js';

import { createSettingsControlsGroup, createSettingsListRow } from './Sidebar.Settings.rows.js';

import { SetValueCommand } from './commands/SetValueCommand.js';

function SidebarSettingsCamera( editor ) {

	const strings = editor.strings;

	const signals = editor.signals;

	const container = new UIPanel();

	container.add( UIComponents.title( 'Camera Settings' ) );

	const cameraFovRow = createSettingsListRow();

	const cameraFov = new UINumber().onChange( update );

	cameraFovRow.add( new UIText( strings.getKey( 'sidebar/object/fov' ) ).setClass( 'Label' ) );

	const cameraFovControls = createSettingsControlsGroup();

	cameraFovControls.add( cameraFov );

	cameraFovRow.add( cameraFovControls );

	container.add( cameraFovRow );

	const cameraLeftRow = createSettingsListRow();

	const cameraLeft = new UINumber().onChange( update );

	cameraLeftRow.add( new UIText( strings.getKey( 'sidebar/object/left' ) ).setClass( 'Label' ) );

	const cameraLeftControls = createSettingsControlsGroup();

	cameraLeftControls.add( cameraLeft );

	cameraLeftRow.add( cameraLeftControls );

	container.add( cameraLeftRow );

	const cameraRightRow = createSettingsListRow();

	const cameraRight = new UINumber().onChange( update );

	cameraRightRow.add( new UIText( strings.getKey( 'sidebar/object/right' ) ).setClass( 'Label' ) );

	const cameraRightControls = createSettingsControlsGroup();

	cameraRightControls.add( cameraRight );

	cameraRightRow.add( cameraRightControls );

	container.add( cameraRightRow );

	const cameraTopRow = createSettingsListRow();

	const cameraTop = new UINumber().onChange( update );

	cameraTopRow.add( new UIText( strings.getKey( 'sidebar/object/top' ) ).setClass( 'Label' ) );

	const cameraTopControls = createSettingsControlsGroup();

	cameraTopControls.add( cameraTop );

	cameraTopRow.add( cameraTopControls );

	container.add( cameraTopRow );

	const cameraBottomRow = createSettingsListRow();

	const cameraBottom = new UINumber().onChange( update );

	cameraBottomRow.add( new UIText( strings.getKey( 'sidebar/object/bottom' ) ).setClass( 'Label' ) );

	const cameraBottomControls = createSettingsControlsGroup();

	cameraBottomControls.add( cameraBottom );

	cameraBottomRow.add( cameraBottomControls );

	container.add( cameraBottomRow );

	const cameraNearRow = createSettingsListRow();

	const cameraNear = new UINumber().onChange( update );

	cameraNearRow.add( new UIText( strings.getKey( 'sidebar/object/near' ) ).setClass( 'Label' ) );

	const cameraNearControls = createSettingsControlsGroup();

	cameraNearControls.add( cameraNear );

	cameraNearRow.add( cameraNearControls );

	container.add( cameraNearRow );

	const cameraFarRow = createSettingsListRow();

	const cameraFar = new UINumber().onChange( update );

	cameraFarRow.add( new UIText( strings.getKey( 'sidebar/object/far' ) ).setClass( 'Label' ) );

	const cameraFarControls = createSettingsControlsGroup();

	cameraFarControls.add( cameraFar );

	cameraFarRow.add( cameraFarControls );

	container.add( cameraFarRow );

	function buildCameraConfigSnapshot( camera ) {

		if ( camera.isPerspectiveCamera ) {

			return {
				type: 'perspective',
				fov: camera.fov,
				near: camera.near,
				far: camera.far
			};

		}

		if ( camera.isOrthographicCamera ) {

			return {
				type: 'orthographic',
				left: camera.left,
				right: camera.right,
				top: camera.top,
				bottom: camera.bottom,
				near: camera.near,
				far: camera.far
			};

		}

		return null;

	}

	function persistCameraConfig() {

		const camera = editor.viewportCamera;

		if ( camera === null || camera === undefined ) return;

		const snapshot = buildCameraConfigSnapshot( camera );

		if ( snapshot !== null ) {

			signals.settingUpdated.dispatch( 'app.Scene.camera', snapshot );

		}

	}

	function update() {

		const object = editor.viewportCamera;

		if ( object === null || object === undefined ) return;

		if ( object.fov !== undefined && Math.abs( object.fov - cameraFov.getValue() ) >= 0.01 ) {

			editor.execute( new SetValueCommand( editor, object, 'fov', cameraFov.getValue() ) );

			object.updateProjectionMatrix();

		}

		if ( object.left !== undefined && Math.abs( object.left - cameraLeft.getValue() ) >= 0.01 ) {

			editor.execute( new SetValueCommand( editor, object, 'left', cameraLeft.getValue() ) );

			object.updateProjectionMatrix();

		}

		if ( object.right !== undefined && Math.abs( object.right - cameraRight.getValue() ) >= 0.01 ) {

			editor.execute( new SetValueCommand( editor, object, 'right', cameraRight.getValue() ) );

			object.updateProjectionMatrix();

		}

		if ( object.top !== undefined && Math.abs( object.top - cameraTop.getValue() ) >= 0.01 ) {

			editor.execute( new SetValueCommand( editor, object, 'top', cameraTop.getValue() ) );

			object.updateProjectionMatrix();

		}

		if ( object.bottom !== undefined && Math.abs( object.bottom - cameraBottom.getValue() ) >= 0.01 ) {

			editor.execute( new SetValueCommand( editor, object, 'bottom', cameraBottom.getValue() ) );

			object.updateProjectionMatrix();

		}

		if ( object.near !== undefined && Math.abs( object.near - cameraNear.getValue() ) >= 0.01 ) {

			editor.execute( new SetValueCommand( editor, object, 'near', cameraNear.getValue() ) );

			if ( object.isOrthographicCamera ) {

				object.updateProjectionMatrix();

			}

		}

		if ( object.far !== undefined && Math.abs( object.far - cameraFar.getValue() ) >= 0.01 ) {

			editor.execute( new SetValueCommand( editor, object, 'far', cameraFar.getValue() ) );

			if ( object.isOrthographicCamera ) {

				object.updateProjectionMatrix();

			}

		}

		persistCameraConfig();

	}

	function updateRowsVisibility( object ) {

		const rowsByProperty = {
			'fov': cameraFovRow,
			'left': cameraLeftRow,
			'right': cameraRightRow,
			'top': cameraTopRow,
			'bottom': cameraBottomRow,
			'near': cameraNearRow,
			'far': cameraFarRow
		};

		for ( const property in rowsByProperty ) {

			const row = rowsByProperty[ property ];

			row.setDisplay( object[ property ] !== undefined ? '' : 'none' );

		}

	}

	function refreshCameraSettingsUI() {

		const object = editor.viewportCamera;

		if ( object === null || object === undefined || ( ! object.isPerspectiveCamera && ! object.isOrthographicCamera ) ) {

			container.setDisplay( 'none' );

			return;

		}

		container.setDisplay( '' );

		updateRowsVisibility( object );

		if ( object.fov !== undefined ) {

			cameraFov.setValue( object.fov );

		}

		if ( object.left !== undefined ) {

			cameraLeft.setValue( object.left );

		}

		if ( object.right !== undefined ) {

			cameraRight.setValue( object.right );

		}

		if ( object.top !== undefined ) {

			cameraTop.setValue( object.top );

		}

		if ( object.bottom !== undefined ) {

			cameraBottom.setValue( object.bottom );

		}

		if ( object.near !== undefined ) {

			cameraNear.setValue( object.near );

		}

		if ( object.far !== undefined ) {

			cameraFar.setValue( object.far );

		}

	}

	refreshCameraSettingsUI();

	signals.viewportCameraChanged.add( refreshCameraSettingsUI );

	signals.cameraChanged.add( function ( changedCamera ) {

		if ( changedCamera === editor.viewportCamera ) {

			refreshCameraSettingsUI();

		}

	} );

	signals.objectChanged.add( function ( object ) {

		if ( object === editor.viewportCamera ) {

			refreshCameraSettingsUI();

		}

	} );

	return container;

}

export { SidebarSettingsCamera };
