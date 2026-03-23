import * as THREE from 'three';

import { AddObjectCommand } from './commands/AddObjectCommand.js';

import { LoaderUtils } from './LoaderUtils.js';

function Loader( editor ) {

	const scope = this;

	this.texturePath = '';

	this.loadItemList = function ( items ) {

		LoaderUtils.getFilesFromItemList( items, function ( files, filesMap ) {

			scope.loadFiles( files, filesMap );

		} );

	};

	this.loadFiles = function ( files, filesMap ) {

		if ( files.length > 0 ) {

			filesMap = filesMap || LoaderUtils.createFilesMap( files );

			const manager = new THREE.LoadingManager();

			manager.setURLModifier( function ( url ) {

				url = url.replace( /^(\.?\/)/, '' ); 

				const file = filesMap[ url ];

				if ( file ) {

					return URL.createObjectURL( file );

				}

				return url;

			} );

			for ( let i = 0; i < files.length; i ++ ) {

				scope.loadFile( files[ i ], manager );

			}

		}

	};

	this.loadFile = function ( file, manager ) {

		const filename = file.name;

		const extension = filename.split( '.' ).pop().toLowerCase();

		const reader = new FileReader();

		reader.addEventListener( 'progress', function ( event ) {

			const size = '(' + editor.utils.formatNumber( Math.floor( event.total / 1000 ) ) + ' KB)';

			const progress = Math.floor( ( event.loaded / event.total ) * 100 ) + '%';

		} );

		switch ( extension ) {

			case 'glb':

			{

				reader.addEventListener( 'load', async function ( event ) {

					const contents = event.target.result;

					const loader = await createGLTFLoader();

					loader.parse( contents, '', function ( result ) {

						const scene = result.scene;

						scene.name = filename;

						scene.animations.push( ...result.animations );

						editor.execute( new AddObjectCommand( editor, scene ) );

						loader.dracoLoader.dispose();

						loader.ktx2Loader.dispose();

					} );

				}, false );

				reader.readAsArrayBuffer( file );

				break;

			}

			case 'gltf':

			{

				reader.addEventListener( 'load', async function ( event ) {

					const contents = event.target.result;

					const loader = await createGLTFLoader( manager );

					loader.parse( contents, '', function ( result ) {

						const scene = result.scene;

						scene.name = filename;

						scene.animations.push( ...result.animations );

						editor.execute( new AddObjectCommand( editor, scene ) );

						loader.dracoLoader.dispose();

						loader.ktx2Loader.dispose();

					} );

				}, false );

				reader.readAsArrayBuffer( file );

				break;

			}

			case 'js':

			case 'json':

			{

				reader.addEventListener( 'load', function ( event ) {

					const contents = event.target.result;
					if ( contents.indexOf( 'postMessage' ) !== - 1 ) {

						const blob = new Blob( [ contents ], { type: 'text/javascript' } );

						const url = URL.createObjectURL( blob );

						const worker = new Worker( url );

						worker.onmessage = function ( event ) {

							event.data.metadata = { version: 2 };

							handleJSON( event.data );

						};

						worker.postMessage( Date.now() );

						return;

					}
					let data;

					try {

						data = JSON.parse( contents );

					} catch ( error ) {

						alert( error );

						return;

					}

					handleJSON( data );

				}, false );

				reader.readAsText( file );

				break;

			}

			case 'obj':

			{

				reader.addEventListener( 'load', async function ( event ) {

					const contents = event.target.result;

					const { OBJLoader } = await import( 'three/addons/loaders/OBJLoader.js' );

					const object = new OBJLoader().parse( contents );

					object.name = filename;

					editor.execute( new AddObjectCommand( editor, object ) );

				}, false );

				reader.readAsText( file );

				break;

			}

			case 'stl':

			{

				reader.addEventListener( 'load', async function ( event ) {

					const contents = event.target.result;

					const { STLLoader } = await import( 'three/addons/loaders/STLLoader.js' );

					const geometry = new STLLoader().parse( contents );

					const material = new THREE.MeshStandardMaterial();

					const mesh = new THREE.Mesh( geometry, material );

					mesh.name = filename;

					editor.execute( new AddObjectCommand( editor, mesh ) );

				}, false );

				if ( reader.readAsBinaryString !== undefined ) {

					reader.readAsBinaryString( file );

				} else {

					reader.readAsArrayBuffer( file );

				}

				break;

			}

			case 'zip':

			{

				reader.addEventListener( 'load', function ( event ) {

					void handleZIP( event.target.result ).catch( function ( loadError ) {

						console.error( loadError );

					} );

				}, false );

				reader.readAsArrayBuffer( file );

				break;

			}

			default:

				console.error( 'Unsupported file format (' + extension + ').' );

				break;

		}

	};

	function handleJSON( data ) {

		if ( data.metadata === undefined ) { 

			data.metadata = { type: 'Geometry' };

		}

		if ( data.metadata.type === undefined ) { 

			data.metadata.type = 'Geometry';

		}

		if ( data.metadata.formatVersion !== undefined ) {

			data.metadata.version = data.metadata.formatVersion;

		}

		switch ( data.metadata.type.toLowerCase() ) {

			case 'buffergeometry':

			{

				const loader = new THREE.BufferGeometryLoader();

				const result = loader.parse( data );

				const mesh = new THREE.Mesh( result );

				editor.execute( new AddObjectCommand( editor, mesh ) );

				break;

			}

			case 'geometry':

				console.error( 'Loader: "Geometry" is no longer supported.' );

				break;

			case 'object':

			{

				const loader = new THREE.ObjectLoader();

				loader.setResourcePath( scope.texturePath );

				loader.parse( data, function ( result ) {

					editor.execute( new AddObjectCommand( editor, result ) );

				} );

				break;

			}

			case 'app':

				editor.fromJSON( data );

				break;

		}

	}

	async function handleZIP( contents ) {

		const { unzipSync, strFromU8 } = await import(
			/* webpackChunkName: "fflate" */
			/* webpackMode: "lazy" */
			'three/addons/libs/fflate.module.js'
		);

		const zip = unzipSync( new Uint8Array( contents ) );

		const manager = new THREE.LoadingManager();

		manager.setURLModifier( function ( url ) {

			const file = zip[ url ];

			if ( file ) {
				const blob = new Blob( [ file.buffer ], { type: 'application/octet-stream' } );

				return URL.createObjectURL( blob );

			}

			return url;

		} );
		if ( zip[ 'model.obj' ] && zip[ 'materials.mtl' ] ) {

			const { MTLLoader } = await import( 'three/addons/loaders/MTLLoader.js' );

			const { OBJLoader } = await import( 'three/addons/loaders/OBJLoader.js' );

			const materials = new MTLLoader( manager ).parse( strFromU8( zip[ 'materials.mtl' ] ) );

			const object = new OBJLoader().setMaterials( materials ).parse( strFromU8( zip[ 'model.obj' ] ) );

			editor.execute( new AddObjectCommand( editor, object ) );

			return;

		}
		for ( const path in zip ) {

			const file = zip[ path ];

			const extension = path.split( '.' ).pop().toLowerCase();

			switch ( extension ) {

				case 'glb':

				{

					const loader = await createGLTFLoader();

					loader.parse( file.buffer, '', function ( result ) {

						const scene = result.scene;

						scene.animations.push( ...result.animations );

						editor.execute( new AddObjectCommand( editor, scene ) );

						loader.dracoLoader.dispose();

						loader.ktx2Loader.dispose();

					} );

					break;

				}

				case 'gltf':

				{

					const loader = await createGLTFLoader( manager );

					loader.parse( strFromU8( file ), '', function ( result ) {

						const scene = result.scene;

						scene.animations.push( ...result.animations );

						editor.execute( new AddObjectCommand( editor, scene ) );

						loader.dracoLoader.dispose();

						loader.ktx2Loader.dispose();

					} );

					break;

				}

			}

		}

	}

	async function createGLTFLoader( manager ) {

		const { GLTFLoader } = await import( 'three/addons/loaders/GLTFLoader.js' );

		const { DRACOLoader } = await import( 'three/addons/loaders/DRACOLoader.js' );

		const { KTX2Loader } = await import( 'three/addons/loaders/KTX2Loader.js' );

		const { MeshoptDecoder } = await import( 'three/addons/libs/meshopt_decoder.module.js' );

		const dracoLoader = new DRACOLoader();

		dracoLoader.setDecoderPath( '../examples/jsm/libs/draco/gltf/' );

		const ktx2Loader = new KTX2Loader( manager );

		ktx2Loader.setTranscoderPath( '../examples/jsm/libs/basis/' );

		editor.signals.rendererDetectKTX2Support.dispatch( ktx2Loader );

		const loader = new GLTFLoader( manager );

		loader.setDRACOLoader( dracoLoader );

		loader.setKTX2Loader( ktx2Loader );

		loader.setMeshoptDecoder( MeshoptDecoder );

		return loader;

	}

}

export { Loader };
