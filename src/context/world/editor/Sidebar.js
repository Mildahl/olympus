import { SidebarSettings } from './Sidebar.Settings.js';

import { TabPanel } from '../../../../drawUI/TabPanel.js';

import { Components as UIComponents } from '../../../ui/Components/Components.js';

/**
 * Sidebar - Application sidebar panel that integrates with the layout system.
 * 
 * The sidebar is displayed as a tab in the right layout panel. It contains
 * scene settings and configuration options.
 * 
 * @param {Object} context - Application context.
 * @param {Object} operators - Operators reference.
 * @returns {TabPanel} The sidebar panel instance.
 * 
 * @example
 * // Create and show the sidebar
 * const sidebar = new Sidebar(context, operators);
 */
function Sidebar( context, operators ) {

	const editor = context.editor;

	const strings = editor.strings;

	// 3D / Three.js controls (scene + renderer); more tabs are added by the settings module
	const settings = SidebarSettings( editor );

	const internalTabs = UIComponents.tabbedPanel();

	internalTabs.addTab( 'threejs', 'Three.js', settings );

	internalTabs.select( 'threejs' );

	if ( context.ui ) {
		context.ui.sidebarSettingsTabbedPanel = internalTabs;
	}

	// Create TabPanel that integrates with LayoutManager
	const sidebarPanel = new TabPanel({
		context,
		operators,
		position: 'right',
		tabId: 'sidebar-3d-settings',
		tabLabel: strings.getKey( 'sidebar/3d-settings' ) || '3D Settings',
		icon: 'view_in_ar',
		title: strings.getKey( 'sidebar/3d-settings' ) || '3D Settings',
		showHeader: false,
		panelStyles: {
			minWidth: '280px',
		},
		autoShow: true,
	});

	sidebarPanel.content.add( internalTabs );

	return sidebarPanel;

}

export { Sidebar };
