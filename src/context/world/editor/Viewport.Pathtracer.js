import { WebGLPathTracer } from 'three-gpu-pathtracer';

function ViewportPathtracer( renderer ) {

	let pathTracer = null;

	function init( scene, camera ) {

		if ( pathTracer === null ) {

			pathTracer = new WebGLPathTracer( renderer );

			pathTracer.filterGlossyFactor = 0.5;

		}

		pathTracer.setScene( scene, camera );

	}

	function setSize(  ) {

		if ( pathTracer === null ) return;
		pathTracer.updateCamera();

	}

	function setBackground(  ) {

		if ( pathTracer === null ) return;
		pathTracer.updateEnvironment();

	}

	function updateMaterials() {

		if ( pathTracer === null ) return;

		pathTracer.updateMaterials();

	}

	function setEnvironment(  ) {

		if ( pathTracer === null ) return;

		pathTracer.updateEnvironment();

	}

	function update() {

		if ( pathTracer === null ) return;

		pathTracer.renderSample();

	}

	function reset() {

		if ( pathTracer === null ) return;

		pathTracer.updateCamera();

	}

	function getSamples() {

		if ( pathTracer === null ) return;

		return pathTracer.samples;

	}

	return {
		init: init,
		setSize: setSize,
		setBackground: setBackground,
		setEnvironment: setEnvironment,
		updateMaterials: updateMaterials,
		update: update,
		reset: reset,
		getSamples: getSamples
	};

}

export { ViewportPathtracer };
