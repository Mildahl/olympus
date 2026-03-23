import { UISpan } from '../../../../drawUI/ui.js';

import { SidebarSettingsScene } from './Sidebar.Settings.Scene.js';

import { SidebarSettingsCamera } from './Sidebar.Settings.Camera.js';

import { SidebarProjectRenderer } from './Sidebar.Project.Renderer.js';

function SidebarSettings( editor ) {

	const container = new UISpan();

	container.dom.style.paddingTop = '8px';

	// Scene settings (background, environment, fog)
	container.add( new SidebarSettingsScene( editor ) );

	container.add( new SidebarSettingsCamera( editor ) );

	container.add( new SidebarProjectRenderer( editor ) );

	// const options = Object.fromEntries( [ 'en', 'fr', 'zh', 'ja', 'ko', 'fa' ].map( locale => {

	// 	return [ locale, new Intl.DisplayNames( locale, { type: 'language' } ).of( locale ) ];

	// } ) );

	// const languageRow = new UIRow();

	// const language = new UISelect().setWidth( '150px' );

	// language.setOptions( options );

	// if ( config.getKey( 'language' ) !== undefined ) {

	// 	language.setValue( config.getKey( 'language' ) );

	// }

	// language.onChange( function () {

	// 	const value = this.getValue();

	// 	editor.config.setKey( 'language', value );

	// } );

	// languageRow.add( new UIText( strings.getKey( 'sidebar/settings/language' ) ).setClass( 'Label' ) );

	// languageRow.add( language );

	// settings.add( languageRow );

	// container.add( new SidebarSettingsShortcuts( editor ) );

	// container.add( new SidebarSettingsHistory( editor ) );

	return container;

}

export { SidebarSettings };
