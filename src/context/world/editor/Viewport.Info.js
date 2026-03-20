import { UIPanel, UIBreak, UIText, UIColumn } from './../../../ui/base/ui.js';
function ViewportInfo( editor ) {

	const signals = editor.signals;

	const container = new UIPanel()

	container.setId( 'SceneInformation' ).setStyles({
		padding: 'var(--phi-1)',
	})

	const frametimeText = new UIText( '0' ).setTextAlign( 'right' ).setWidth( '60px' ).setMarginRight( '6px' ).addClass("hud-input");

	const fpsText = new UIText( '0' ).setTextAlign( 'right' ).setWidth( '60px' ).setMarginRight( '6px' ).addClass("hud-input");

	const renderTimeText = new UIText( 'ms' ).addClass("hud-label");

	const fpsUnitText = new UIText( 'fps' ).addClass("hud-label");

	container.add( new UIColumn().add(renderTimeText, frametimeText, new UIBreak()) );

	container.add( new UIColumn().add(fpsUnitText, fpsText, new UIBreak()) );

	signals.sceneRendered.add( updateFrametime );

	function updateFrametime( frametime ) {

		frametimeText.setValue( Number( frametime ).toFixed( 2 ) );

		const fps = frametime > 0 ? ( 1000 / frametime ) : 0;

		fpsText.setValue( Math.round( fps ) );

	}

	return container;

}

export { ViewportInfo };
