import { UIPanel, UIBreak, UIRow, UIButton } from '../../../../drawUI/ui.js';

import { UIOutliner } from '../../../ui/ui.three.js';

function SidebarSceneManager( editor ) {

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

			opener.addEventListener( 'click', function ( event ) {
				event.stopPropagation();

				event.preventDefault();

				nodeStates.set( object, nodeStates.get( object ) === false ); 

				refreshUI();
			} );

			opener.style.cursor = 'pointer';

			opener.style.userSelect = 'none';

			option.appendChild( opener );
		}

		const ifcIconClasses = [
			'IfcWall', 'IfcDoor', 'IfcProject', 'IfcSite', 'IfcWindow', 'IfcOpening'
		];

		if (object.ifcClass && ifcIconClasses.includes(object.ifcClass)) {
			const iconImg = document.createElement('img');

			iconImg.className = 'icon';

			iconImg.src = `./../examples/resources/icons/entities/${object.ifcClass}.svg`;

			iconImg.alt = object.ifcClass;

			iconImg.style.marginRight = '6px';

			option.appendChild(iconImg);
		}

		const nameSpan = document.createElement('span');

		nameSpan.className = 'object-name';

		nameSpan.innerHTML = escapeHTML(object.name || 'Object');

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

		if ( typeof html !== 'string' ) {
			return '';
		}

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

	function refreshUI() {

		const camera = editor.camera;

		const scene = editor.scene;

		const options = [];

		( function addObjects( objects, pad ) {
			for ( let i = 0, l = objects.length; i < l; i ++ ) {
				const object = objects[ i ];

				if (object.isLine) continue; 

				if ( nodeStates.has( object ) === false ) {
					nodeStates.set( object, true );
				}

				const option = buildOption( object, object !== scene );

				option.style.paddingLeft = ( pad * 18 ) + 'px';

				options.push( option );

				if ( nodeStates.get( object ) === true ) {
					addObjects( object.children, pad + 1 );
				}
			}
		} )( [scene], 0 );

		spatialStructure.setOptions( options );

		if ( editor.selected !== null ) {

			spatialStructure.setValue( editor.selected.id );

		}
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
					? `<img class="icon" src="./../examples/resources/icons/entities/${object.ifcClass}.svg" alt="${object.ifcClass}" style="margin-right: 6px;">`
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

	return container;

}

export { SidebarSceneManager };
