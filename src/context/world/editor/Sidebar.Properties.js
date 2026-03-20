import { UITabbedPanel } from './../../../ui/base/ui.js';

import { SidebarObject } from './Sidebar.Object.js';
import { SidebarGeometry } from './Sidebar.Geometry.js';
import { SidebarMaterial } from './Sidebar.Material.js';
import { SidebarScript } from './Sidebar.Script.js';
import { AttributePanel } from '../../../modules/bim/attributes/ui.js';
import { PropertyPanel } from '../../../modules/bim/properties/ui.js';
import { DocumentPanel } from '../../../modules/bim/documents/ui.js';

function SidebarProperties( context, operators ) {
	const editor = context.editor;

	const strings = context.editor.strings;

	const container = new UITabbedPanel();
	container.setId( 'properties' );

	container.addTab( 'objectTab', strings.getKey( 'sidebar/properties/object' ), new SidebarObject( editor ) );
	container.addTab( 'geometryTab', strings.getKey( 'sidebar/properties/geometry' ), new SidebarGeometry( editor ) );
	container.addTab( 'materialTab', strings.getKey( 'sidebar/properties/material' ), new SidebarMaterial( editor ) );
	container.addTab( 'attributesTab', 'Attributes', new AttributePanel( context, operators ) );
	container.addTab( 'propertiesTab', 'Properties', new PropertyPanel( context, operators ) );
	container.addTab( 'documentsTab', 'Documents', DocumentPanel( context, operators ) );
	container.addTab( 'scriptTab', strings.getKey( 'sidebar/properties/script' ), new SidebarScript( editor ) );
	container.select( 'objectTab' );

	function getTabByTabId( tabs, tabId ) {

		return tabs.find( function ( tab ) {

			return tab.dom.id === tabId;

		} );

	}

	const geometryTab = getTabByTabId( container.tabs, 'geometryTab' );
	const materialTab = getTabByTabId( container.tabs, 'materialTab' );
	const attributesTab = getTabByTabId( container.tabs, 'attributesTab' );
	const propertiesTab = getTabByTabId( container.tabs, 'propertiesTab' );
	const documentsTab = getTabByTabId( container.tabs, 'documentsTab' );
	const scriptTab = getTabByTabId( container.tabs, 'scriptTab' );

	function toggleTabs( object ) {

		container.setHidden( object === null );

		if ( object === null ) return;

		geometryTab.setHidden( ! object.geometry );

		materialTab.setHidden( ! object.material );

		attributesTab.setHidden( false ); 
		propertiesTab.setHidden( false ); 
		documentsTab.setHidden( false ); 

		scriptTab.setHidden( object === editor.camera );
		if ( container.selected === 'geometryTab' ) {

			container.select( geometryTab.isHidden() ? 'objectTab' : 'geometryTab' );

		} else if ( container.selected === 'materialTab' ) {

			container.select( materialTab.isHidden() ? 'objectTab' : 'materialTab' );

		} else if ( container.selected === 'attributesTab' ) {

			container.select( attributesTab.isHidden() ? 'objectTab' : 'attributesTab' );

		} else if ( container.selected === 'propertiesTab' ) {

			container.select( propertiesTab.isHidden() ? 'objectTab' : 'propertiesTab' );

		} else if ( container.selected === 'documentsTab' ) {

			container.select( documentsTab.isHidden() ? 'objectTab' : 'documentsTab' );

		} else if ( container.selected === 'scriptTab' ) {

			container.select( scriptTab.isHidden() ? 'objectTab' : 'scriptTab' );

		}

	}

	editor.signals.objectSelected.add( toggleTabs );

	toggleTabs( editor.selected );

	return container;

}

export { SidebarProperties };
