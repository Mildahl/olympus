import * as THREE from 'three';

import AECO_TOOLS from '../../../tool/index.js';

import { UIPanel, UIRow, UIInput, UIButton, UIColor, UICheckbox, UIInteger, UITextArea, UIText, UINumber, UIBreak, UIDiv } from '../../../../drawUI/ui.js';

import { UIBoolean } from '../../../ui/ui.three.js';

import { SetUuidCommand } from './commands/SetUuidCommand.js';

import { SetValueCommand } from './commands/SetValueCommand.js';

import { SetPositionCommand } from './commands/SetPositionCommand.js';

import { SetRotationCommand } from './commands/SetRotationCommand.js';

import { SetScaleCommand } from './commands/SetScaleCommand.js';

import { SetColorCommand } from './commands/SetColorCommand.js';

import { SetShadowValueCommand } from './commands/SetShadowValueCommand.js';

import { SidebarObjectAnimation } from './Sidebar.Object.Animation.js';

function SidebarObject( editor ) {

	const strings = editor.strings;

	const signals = editor.signals;

	const container = new UIPanel();

	container.setBorderTop( '0' );

	container.add( new UIBreak() );

	const emptySelectionRow = new UIRow();

	const emptySelectionHint = new UIText( strings.getKey( 'sidebar/properties/no-selection' ) );

	emptySelectionHint.setStyle( 'display', [ 'inline-block' ] );

	emptySelectionHint.setStyle( 'font-style', [ 'italic' ] );

	emptySelectionHint.setStyle( 'color', [ 'var(--theme-text-light)' ] );

	emptySelectionHint.setStyle( 'padding', [ '0.35rem 0' ] );

	emptySelectionRow.add( emptySelectionHint );

	const objectForm = new UIDiv();

	const objectTypeRow = new UIRow();

	const objectType = new UIText();
	objectTypeRow.add( new UIText( strings.getKey( 'sidebar/object/type' ) ).setClass( 'Label' ) );

	objectTypeRow.add( objectType );

	objectForm.add( objectTypeRow );
	const objectUUIDRow = new UIRow();

	const objectUUID = new UIInput().setWidth( '102px' ).setFontSize( '12px' ).setDisabled( true );

	const objectUUIDRenew = new UIButton( strings.getKey( 'sidebar/object/new' ) ).setMarginLeft( '7px' ).onClick( function () {

		objectUUID.setValue( THREE.MathUtils.generateUUID() );

		editor.execute( new SetUuidCommand( editor, editor.selected, objectUUID.getValue() ) );

	} );

	objectUUIDRow.add( new UIText( strings.getKey( 'sidebar/object/uuid' ) ).setClass( 'Label' ) );

	objectUUIDRow.add( objectUUID );

	objectUUIDRow.add( objectUUIDRenew );

	objectForm.add( objectUUIDRow );
	const objectNameRow = new UIRow();

	const objectName = new UIInput().setWidth( '150px' ).setFontSize( '12px' ).onChange( function () {

		editor.execute( new SetValueCommand( editor, editor.selected, 'name', objectName.getValue() ) );

	} );

	objectNameRow.add( new UIText( strings.getKey( 'sidebar/object/name' ) ).setClass( 'Label' ) );

	objectNameRow.add( objectName );

	objectForm.add( objectNameRow );
	const objectPositionRow = new UIRow();

	const objectPositionX = new UINumber().setPrecision( 3 ).setWidth( '50px' ).onChange( update );

	const objectPositionY = new UINumber().setPrecision( 3 ).setWidth( '50px' ).onChange( update );

	const objectPositionZ = new UINumber().setPrecision( 3 ).setWidth( '50px' ).onChange( update );

	objectPositionRow.add( new UIText( strings.getKey( 'sidebar/object/position' ) ).setClass( 'Label' ) );

	objectPositionRow.add( objectPositionX, objectPositionY, objectPositionZ );

	objectForm.add( objectPositionRow );
	const objectRotationRow = new UIRow();

	const objectRotationX = new UINumber().setStep( 10 ).setNudge( 0.1 ).setUnit( '°' ).setWidth( '50px' ).onChange( update );

	const objectRotationY = new UINumber().setStep( 10 ).setNudge( 0.1 ).setUnit( '°' ).setWidth( '50px' ).onChange( update );

	const objectRotationZ = new UINumber().setStep( 10 ).setNudge( 0.1 ).setUnit( '°' ).setWidth( '50px' ).onChange( update );

	objectRotationRow.add( new UIText( strings.getKey( 'sidebar/object/rotation' ) ).setClass( 'Label' ) );

	objectRotationRow.add( objectRotationX, objectRotationY, objectRotationZ );

	objectForm.add( objectRotationRow );
	const objectScaleRow = new UIRow();

	const objectScaleX = new UINumber( 1 ).setPrecision( 3 ).setWidth( '50px' ).onChange( update );

	const objectScaleY = new UINumber( 1 ).setPrecision( 3 ).setWidth( '50px' ).onChange( update );

	const objectScaleZ = new UINumber( 1 ).setPrecision( 3 ).setWidth( '50px' ).onChange( update );

	objectScaleRow.add( new UIText( strings.getKey( 'sidebar/object/scale' ) ).setClass( 'Label' ) );

	objectScaleRow.add( objectScaleX, objectScaleY, objectScaleZ );

	objectForm.add( objectScaleRow );
	const objectFovRow = new UIRow();

	const objectFov = new UINumber().onChange( update );

	objectFovRow.add( new UIText( strings.getKey( 'sidebar/object/fov' ) ).setClass( 'Label' ) );

	objectFovRow.add( objectFov );

	objectForm.add( objectFovRow );
	const objectLeftRow = new UIRow();

	const objectLeft = new UINumber().onChange( update );

	objectLeftRow.add( new UIText( strings.getKey( 'sidebar/object/left' ) ).setClass( 'Label' ) );

	objectLeftRow.add( objectLeft );

	objectForm.add( objectLeftRow );
	const objectRightRow = new UIRow();

	const objectRight = new UINumber().onChange( update );

	objectRightRow.add( new UIText( strings.getKey( 'sidebar/object/right' ) ).setClass( 'Label' ) );

	objectRightRow.add( objectRight );

	objectForm.add( objectRightRow );
	const objectTopRow = new UIRow();

	const objectTop = new UINumber().onChange( update );

	objectTopRow.add( new UIText( strings.getKey( 'sidebar/object/top' ) ).setClass( 'Label' ) );

	objectTopRow.add( objectTop );

	objectForm.add( objectTopRow );
	const objectBottomRow = new UIRow();

	const objectBottom = new UINumber().onChange( update );

	objectBottomRow.add( new UIText( strings.getKey( 'sidebar/object/bottom' ) ).setClass( 'Label' ) );

	objectBottomRow.add( objectBottom );

	objectForm.add( objectBottomRow );
	const objectNearRow = new UIRow();

	const objectNear = new UINumber().onChange( update );

	objectNearRow.add( new UIText( strings.getKey( 'sidebar/object/near' ) ).setClass( 'Label' ) );

	objectNearRow.add( objectNear );

	objectForm.add( objectNearRow );
	const objectFarRow = new UIRow();

	const objectFar = new UINumber().onChange( update );

	objectFarRow.add( new UIText( strings.getKey( 'sidebar/object/far' ) ).setClass( 'Label' ) );

	objectFarRow.add( objectFar );

	objectForm.add( objectFarRow );
	const objectIntensityRow = new UIRow();

	const objectIntensity = new UINumber().onChange( update );

	objectIntensityRow.add( new UIText( strings.getKey( 'sidebar/object/intensity' ) ).setClass( 'Label' ) );

	objectIntensityRow.add( objectIntensity );

	objectForm.add( objectIntensityRow );
	const objectColorRow = new UIRow();

	const objectColor = new UIColor().onInput( update );

	objectColorRow.add( new UIText( strings.getKey( 'sidebar/object/color' ) ).setClass( 'Label' ) );

	objectColorRow.add( objectColor );

	objectForm.add( objectColorRow );
	const objectGroundColorRow = new UIRow();

	const objectGroundColor = new UIColor().onInput( update );

	objectGroundColorRow.add( new UIText( strings.getKey( 'sidebar/object/groundcolor' ) ).setClass( 'Label' ) );

	objectGroundColorRow.add( objectGroundColor );

	objectForm.add( objectGroundColorRow );
	const objectDistanceRow = new UIRow();

	const objectDistance = new UINumber().setRange( 0, Infinity ).onChange( update );

	objectDistanceRow.add( new UIText( strings.getKey( 'sidebar/object/distance' ) ).setClass( 'Label' ) );

	objectDistanceRow.add( objectDistance );

	objectForm.add( objectDistanceRow );
	const objectAngleRow = new UIRow();

	const objectAngle = new UINumber().setPrecision( 3 ).setRange( 0, Math.PI / 2 ).onChange( update );

	objectAngleRow.add( new UIText( strings.getKey( 'sidebar/object/angle' ) ).setClass( 'Label' ) );

	objectAngleRow.add( objectAngle );

	objectForm.add( objectAngleRow );
	const objectPenumbraRow = new UIRow();

	const objectPenumbra = new UINumber().setRange( 0, 1 ).onChange( update );

	objectPenumbraRow.add( new UIText( strings.getKey( 'sidebar/object/penumbra' ) ).setClass( 'Label' ) );

	objectPenumbraRow.add( objectPenumbra );

	objectForm.add( objectPenumbraRow );
	const objectDecayRow = new UIRow();

	const objectDecay = new UINumber().setRange( 0, Infinity ).onChange( update );

	objectDecayRow.add( new UIText( strings.getKey( 'sidebar/object/decay' ) ).setClass( 'Label' ) );

	objectDecayRow.add( objectDecay );

	objectForm.add( objectDecayRow );
	const objectShadowRow = new UIRow();

	objectShadowRow.add( new UIText( strings.getKey( 'sidebar/object/shadow' ) ).setClass( 'Label' ) );

	const objectCastShadow = new UIBoolean( false, strings.getKey( 'sidebar/object/cast' ) ).onChange( update );

	objectShadowRow.add( objectCastShadow );

	const objectReceiveShadow = new UIBoolean( false, strings.getKey( 'sidebar/object/receive' ) ).onChange( update );

	objectShadowRow.add( objectReceiveShadow );

	objectForm.add( objectShadowRow );
	const objectShadowIntensityRow = new UIRow();

	objectShadowIntensityRow.add( new UIText( strings.getKey( 'sidebar/object/shadowIntensity' ) ).setClass( 'Label' ) );

	const objectShadowIntensity = new UINumber( 0 ).setRange( 0, 1 ).onChange( update );

	objectShadowIntensityRow.add( objectShadowIntensity );

	objectForm.add( objectShadowIntensityRow );
	const objectShadowBiasRow = new UIRow();

	objectShadowBiasRow.add( new UIText( strings.getKey( 'sidebar/object/shadowBias' ) ).setClass( 'Label' ) );

	const objectShadowBias = new UINumber( 0 ).setPrecision( 5 ).setStep( 0.0001 ).setNudge( 0.00001 ).onChange( update );

	objectShadowBiasRow.add( objectShadowBias );

	objectForm.add( objectShadowBiasRow );
	const objectShadowNormalBiasRow = new UIRow();

	objectShadowNormalBiasRow.add( new UIText( strings.getKey( 'sidebar/object/shadowNormalBias' ) ).setClass( 'Label' ) );

	const objectShadowNormalBias = new UINumber( 0 ).onChange( update );

	objectShadowNormalBiasRow.add( objectShadowNormalBias );

	objectForm.add( objectShadowNormalBiasRow );
	const objectShadowRadiusRow = new UIRow();

	objectShadowRadiusRow.add( new UIText( strings.getKey( 'sidebar/object/shadowRadius' ) ).setClass( 'Label' ) );

	const objectShadowRadius = new UINumber( 1 ).onChange( update );

	objectShadowRadiusRow.add( objectShadowRadius );

	objectForm.add( objectShadowRadiusRow );
	const objectVisibleRow = new UIRow();

	const objectVisible = new UICheckbox().onChange( update );

	objectVisibleRow.add( new UIText( strings.getKey( 'sidebar/object/visible' ) ).setClass( 'Label' ) );

	objectVisibleRow.add( objectVisible );

	objectForm.add( objectVisibleRow );
	const objectFrustumCulledRow = new UIRow();

	const objectFrustumCulled = new UICheckbox().onChange( update );

	objectFrustumCulledRow.add( new UIText( strings.getKey( 'sidebar/object/frustumcull' ) ).setClass( 'Label' ) );

	objectFrustumCulledRow.add( objectFrustumCulled );

	objectForm.add( objectFrustumCulledRow );
	const objectRenderOrderRow = new UIRow();

	const objectRenderOrder = new UIInteger().setWidth( '50px' ).onChange( update );

	objectRenderOrderRow.add( new UIText( strings.getKey( 'sidebar/object/renderorder' ) ).setClass( 'Label' ) );

	objectRenderOrderRow.add( objectRenderOrder );

	objectForm.add( objectRenderOrderRow );
	const objectUserDataRow = new UIRow();

	const objectUserData = new UITextArea().setWidth( '150px' ).setHeight( '40px' ).setFontSize( '12px' ).onChange( update );

	objectUserData.onKeyUp( function () {

		try {

			JSON.parse( objectUserData.getValue() );

			objectUserData.dom.classList.add( 'success' );

			objectUserData.dom.classList.remove( 'fail' );

		} catch ( error ) {

			objectUserData.dom.classList.remove( 'success' );

			objectUserData.dom.classList.add( 'fail' );

		}

	} );

	objectUserDataRow.add( new UIText( strings.getKey( 'sidebar/object/userdata' ) ).setClass( 'Label' ) );

	objectUserDataRow.add( objectUserData );

	objectForm.add( objectUserDataRow );
	const exportJson = new UIButton( strings.getKey( 'sidebar/object/export' ) );

	exportJson.setMarginLeft( '120px' );

	exportJson.onClick( function () {

		const object = editor.selected;

		let output = object.toJSON();

		try {

			output = JSON.stringify( output, null, '\t' );

			output = output.replace( /[\n\t]+([\d\.e\-\[\]]+)/g, '$1' );

		} catch ( e ) {

			output = JSON.stringify( output );

		}
		editor.utils.save( new Blob( [ output ] ), `${ objectName.getValue() || 'object' }.json` );

	} );

	objectForm.add( exportJson );
	objectForm.add( new SidebarObjectAnimation( editor ) );

	container.add( emptySelectionRow );

	container.add( objectForm );
	function update() {

		const object = editor.selected;

		if ( object !== null ) {

			const newPosition = new THREE.Vector3( objectPositionX.getValue(), objectPositionY.getValue(), objectPositionZ.getValue() );

			if ( object.position.distanceTo( newPosition ) >= 0.01 ) {

				editor.execute( new SetPositionCommand( editor, object, newPosition ) );

			}

			const newRotation = new THREE.Euler( objectRotationX.getValue() * THREE.MathUtils.DEG2RAD, objectRotationY.getValue() * THREE.MathUtils.DEG2RAD, objectRotationZ.getValue() * THREE.MathUtils.DEG2RAD );

			if ( new THREE.Vector3().setFromEuler( object.rotation ).distanceTo( new THREE.Vector3().setFromEuler( newRotation ) ) >= 0.01 ) {

				editor.execute( new SetRotationCommand( editor, object, newRotation ) );

			}

			const newScale = new THREE.Vector3( objectScaleX.getValue(), objectScaleY.getValue(), objectScaleZ.getValue() );

			if ( object.scale.distanceTo( newScale ) >= 0.01 ) {

				editor.execute( new SetScaleCommand( editor, object, newScale ) );

			}

			if ( object.fov !== undefined && Math.abs( object.fov - objectFov.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'fov', objectFov.getValue() ) );

				object.updateProjectionMatrix();

			}

			if ( object.left !== undefined && Math.abs( object.left - objectLeft.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'left', objectLeft.getValue() ) );

				object.updateProjectionMatrix();

			}

			if ( object.right !== undefined && Math.abs( object.right - objectRight.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'right', objectRight.getValue() ) );

				object.updateProjectionMatrix();

			}

			if ( object.top !== undefined && Math.abs( object.top - objectTop.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'top', objectTop.getValue() ) );

				object.updateProjectionMatrix();

			}

			if ( object.bottom !== undefined && Math.abs( object.bottom - objectBottom.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'bottom', objectBottom.getValue() ) );

				object.updateProjectionMatrix();

			}

			if ( object.near !== undefined && Math.abs( object.near - objectNear.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'near', objectNear.getValue() ) );

				if ( object.isOrthographicCamera ) {

					object.updateProjectionMatrix();

				}

			}

			if ( object.far !== undefined && Math.abs( object.far - objectFar.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'far', objectFar.getValue() ) );

				if ( object.isOrthographicCamera ) {

					object.updateProjectionMatrix();

				}

			}

			if ( object.intensity !== undefined && Math.abs( object.intensity - objectIntensity.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'intensity', objectIntensity.getValue() ) );

			}

			if ( object.color !== undefined && object.color.getHex() !== objectColor.getHexValue() ) {

				editor.execute( new SetColorCommand( editor, object, 'color', objectColor.getHexValue() ) );

			}

			if ( object.groundColor !== undefined && object.groundColor.getHex() !== objectGroundColor.getHexValue() ) {

				editor.execute( new SetColorCommand( editor, object, 'groundColor', objectGroundColor.getHexValue() ) );

			}

			if ( object.distance !== undefined && Math.abs( object.distance - objectDistance.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'distance', objectDistance.getValue() ) );

			}

			if ( object.angle !== undefined && Math.abs( object.angle - objectAngle.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'angle', objectAngle.getValue() ) );

			}

			if ( object.penumbra !== undefined && Math.abs( object.penumbra - objectPenumbra.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'penumbra', objectPenumbra.getValue() ) );

			}

			if ( object.decay !== undefined && Math.abs( object.decay - objectDecay.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'decay', objectDecay.getValue() ) );

			}

			if ( object.visible !== objectVisible.getValue() ) {

				editor.execute( new SetValueCommand( editor, object, 'visible', objectVisible.getValue() ) );

			}

			if ( object.frustumCulled !== objectFrustumCulled.getValue() ) {

				editor.execute( new SetValueCommand( editor, object, 'frustumCulled', objectFrustumCulled.getValue() ) );

			}

			if ( object.renderOrder !== objectRenderOrder.getValue() ) {

				editor.execute( new SetValueCommand( editor, object, 'renderOrder', objectRenderOrder.getValue() ) );

			}

			if ( object.castShadow !== undefined && object.castShadow !== objectCastShadow.getValue() ) {

				editor.execute( new SetValueCommand( editor, object, 'castShadow', objectCastShadow.getValue() ) );

			}

			if ( object.receiveShadow !== objectReceiveShadow.getValue() ) {

				if ( object.material !== undefined ) object.material.needsUpdate = true;

				editor.execute( new SetValueCommand( editor, object, 'receiveShadow', objectReceiveShadow.getValue() ) );

			}

			if ( object.shadow !== undefined ) {

				if ( object.shadow.intensity !== objectShadowIntensity.getValue() ) {

					editor.execute( new SetShadowValueCommand( editor, object, 'intensity', objectShadowIntensity.getValue() ) );

				}

				if ( object.shadow.bias !== objectShadowBias.getValue() ) {

					editor.execute( new SetShadowValueCommand( editor, object, 'bias', objectShadowBias.getValue() ) );

				}

				if ( object.shadow.normalBias !== objectShadowNormalBias.getValue() ) {

					editor.execute( new SetShadowValueCommand( editor, object, 'normalBias', objectShadowNormalBias.getValue() ) );

				}

				if ( object.shadow.radius !== objectShadowRadius.getValue() ) {

					editor.execute( new SetShadowValueCommand( editor, object, 'radius', objectShadowRadius.getValue() ) );

				}

			}

			try {

				const userData = JSON.parse( objectUserData.getValue() );

				if ( JSON.stringify( object.userData ) != JSON.stringify( userData ) ) {

					editor.execute( new SetValueCommand( editor, object, 'userData', userData ) );

				}

			} catch ( exception ) {

				console.warn( exception );

			}

		}

	}

	function updateRows( object ) {

		const properties = {
			'fov': objectFovRow,
			'left': objectLeftRow,
			'right': objectRightRow,
			'top': objectTopRow,
			'bottom': objectBottomRow,
			'near': objectNearRow,
			'far': objectFarRow,
			'intensity': objectIntensityRow,
			'color': objectColorRow,
			'groundColor': objectGroundColorRow,
			'distance': objectDistanceRow,
			'angle': objectAngleRow,
			'penumbra': objectPenumbraRow,
			'decay': objectDecayRow,
			'castShadow': objectShadowRow,
			'receiveShadow': objectReceiveShadow,
			'shadow': [ objectShadowIntensityRow, objectShadowBiasRow, objectShadowNormalBiasRow, objectShadowRadiusRow ]
		};

		for ( const property in properties ) {

			const uiElement = properties[ property ];

			if ( Array.isArray( uiElement ) === true ) {

				for ( let i = 0; i < uiElement.length; i ++ ) {

					uiElement[ i ].setDisplay( object[ property ] !== undefined ? '' : 'none' );

				}

			} else {

				uiElement.setDisplay( object[ property ] !== undefined ? '' : 'none' );

			}

		}
		if ( object.isLight ) {

			objectReceiveShadow.setDisplay( 'none' );

		}

		if ( object.isAmbientLight || object.isHemisphereLight ) {

			objectShadowRow.setDisplay( 'none' );

		}

	}

	function updateTransformRows( object ) {

		if ( object.isLight ) {

			objectRotationRow.setDisplay( 'none' );

			objectScaleRow.setDisplay( 'none' );

		} else {

			objectRotationRow.setDisplay( '' );

			objectScaleRow.setDisplay( '' );

		}

	}
	function applyObjectSelectionToSidebar( object ) {

		if ( object !== null ) {

			container.setDisplay( 'block' );

			emptySelectionRow.setDisplay( 'none' );

			objectForm.setDisplay( '' );

			updateRows( object );

			updateUI( object );

		} else {

			container.setDisplay( 'block' );

			emptySelectionRow.setDisplay( '' );

			objectForm.setDisplay( 'none' );

		}

	}

	signals.objectSelected.add( applyObjectSelectionToSidebar );

	applyObjectSelectionToSidebar( editor.selected );

	signals.objectChanged.add( function ( object ) {

		if ( object !== editor.selected ) return;

		updateUI( object );

	} );

	signals.refreshSidebarObject3D.add( function ( object ) {

		if ( object !== editor.selected ) return;

		updateUI( object );

	} );

	function updateUI( object ) {

		objectType.setValue( object.type );

		objectUUID.setValue( object.uuid );

		objectName.setValue( object.name );

		objectPositionX.setValue( object.position.x );

		objectPositionY.setValue( object.position.y );

		objectPositionZ.setValue( object.position.z );

		objectRotationX.setValue( object.rotation.x * THREE.MathUtils.RAD2DEG );

		objectRotationY.setValue( object.rotation.y * THREE.MathUtils.RAD2DEG );

		objectRotationZ.setValue( object.rotation.z * THREE.MathUtils.RAD2DEG );

		objectScaleX.setValue( object.scale.x );

		objectScaleY.setValue( object.scale.y );

		objectScaleZ.setValue( object.scale.z );

		if ( object.fov !== undefined ) {

			objectFov.setValue( object.fov );

		}

		if ( object.left !== undefined ) {

			objectLeft.setValue( object.left );

		}

		if ( object.right !== undefined ) {

			objectRight.setValue( object.right );

		}

		if ( object.top !== undefined ) {

			objectTop.setValue( object.top );

		}

		if ( object.bottom !== undefined ) {

			objectBottom.setValue( object.bottom );

		}

		if ( object.near !== undefined ) {

			objectNear.setValue( object.near );

		}

		if ( object.far !== undefined ) {

			objectFar.setValue( object.far );

		}

		if ( object.intensity !== undefined ) {

			objectIntensity.setValue( object.intensity );

		}

		if ( object.color !== undefined ) {

			objectColor.setHexValue( object.color.getHexString() );

		}

		if ( object.groundColor !== undefined ) {

			objectGroundColor.setHexValue( object.groundColor.getHexString() );

		}

		if ( object.distance !== undefined ) {

			objectDistance.setValue( object.distance );

		}

		if ( object.angle !== undefined ) {

			objectAngle.setValue( object.angle );

		}

		if ( object.penumbra !== undefined ) {

			objectPenumbra.setValue( object.penumbra );

		}

		if ( object.decay !== undefined ) {

			objectDecay.setValue( object.decay );

		}

		if ( object.castShadow !== undefined ) {

			objectCastShadow.setValue( object.castShadow );

		}

		if ( object.receiveShadow !== undefined ) {

			objectReceiveShadow.setValue( object.receiveShadow );

		}

		if ( object.shadow !== undefined ) {

			objectShadowIntensity.setValue( object.shadow.intensity );

			objectShadowBias.setValue( object.shadow.bias );

			objectShadowNormalBias.setValue( object.shadow.normalBias );

			objectShadowRadius.setValue( object.shadow.radius );

		}

		objectVisible.setValue( object.visible );

		objectFrustumCulled.setValue( object.frustumCulled );

		objectRenderOrder.setValue( object.renderOrder );

		try {

			objectUserData.setValue( JSON.stringify( object.userData, null, '  ' ) );

		} catch ( error ) {

			console.log( error );

		}

		objectUserData.setBorderColor( 'transparent' );

		objectUserData.setBackgroundColor( '' );

		updateTransformRows( object );

	}

	return container;

}

export { SidebarObject };
