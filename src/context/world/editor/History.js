import * as Commands from './operators/Commands.js';

class History {

	constructor( editor ) {

		this.editor = editor;

		this.undos = [];

		this.redos = [];

		this.lastCmdTime = Date.now();

		this.idCounter = 0;

		this.historyDisabled = false;

		this.config = editor.config;
		const scope = this;

		this.editor.signals.startPlayer.add( function () {

			scope.historyDisabled = true;

		} );

		this.editor.signals.stopPlayer.add( function () {

			scope.historyDisabled = false;

		} );

	}

	execute( cmd, optionalName ) {

		const lastCmd = this.undos[ this.undos.length - 1 ];

		const timeDifference = Date.now() - this.lastCmdTime;

		const isUpdatableCmd = lastCmd &&
			lastCmd.updatable &&
			cmd.updatable &&
			lastCmd.object === cmd.object &&
			lastCmd.type === cmd.type &&
			lastCmd.script === cmd.script &&
			lastCmd.attributeName === cmd.attributeName;

		if ( isUpdatableCmd && cmd.type === 'SetScriptValueCommand' ) {
			lastCmd.update( cmd );

			cmd = lastCmd;

		} else if ( isUpdatableCmd && timeDifference < 500 ) {

			lastCmd.update( cmd );

			cmd = lastCmd;

		} else {
			this.undos.push( cmd );

			cmd.id = ++ this.idCounter;

		}

		cmd.name = ( optionalName !== undefined ) ? optionalName : cmd.name;

		const result = cmd.execute();

		cmd.inMemory = true;

		if ( this.config.History ) {

			cmd.json = cmd.toJSON();	

		}

		this.lastCmdTime = Date.now();
		this.redos = [];

		this.editor.signals.historyChanged.dispatch( cmd );

		return result;

	}

	undo() {

		if ( this.historyDisabled ) {

			alert( this.editor.strings.getKey( 'prompt/history/forbid' ) );

			return;

		}

		let cmd = undefined;

		while ( this.undos.length > 0 ) {

			cmd = this.undos.pop();

			if ( cmd.inMemory === false ) {

				cmd.fromJSON( cmd.json );

			}

			if ( cmd.undoable !== false ) {

				cmd.undo();

				this.redos.push( cmd );

				this.editor.signals.historyChanged.dispatch( cmd );

				return cmd;

			}

			this.redos.push( cmd );

		}

		return undefined;

	}

	redo() {

		if ( this.historyDisabled ) {

			alert( this.editor.strings.getKey( 'prompt/history/forbid' ) );

			return;

		}

		let cmd = undefined;

		if ( this.redos.length > 0 ) {

			cmd = this.redos.pop();

			if ( cmd.inMemory === false ) {

				cmd.fromJSON( cmd.json );

			}

		}

		if ( cmd !== undefined ) {

			cmd.execute();

			this.undos.push( cmd );

			this.editor.signals.historyChanged.dispatch( cmd );

		}

		return cmd;

	}

	toJSON() {

		const history = {};

		history.undos = [];

		history.redos = [];

		if ( ! this.config.History ) {

			return history;

		}
		for ( let i = 0; i < this.undos.length; i ++ ) {

			if ( this.undos[ i ].hasOwnProperty( 'json' ) ) {

				history.undos.push( this.undos[ i ].json );

			}

		}
		for ( let i = 0; i < this.redos.length; i ++ ) {

			if ( this.redos[ i ].hasOwnProperty( 'json' ) ) {

				history.redos.push( this.redos[ i ].json );

			}

		}

		return history;

	}

	fromJSON( json ) {

		if ( json === undefined ) return;

		for ( let i = 0; i < json.undos.length; i ++ ) {

			const cmdJSON = json.undos[ i ];

			const cmd = new Commands[ cmdJSON.type ]( this.editor ); 

			cmd.json = cmdJSON;

			cmd.id = cmdJSON.id;

			cmd.name = cmdJSON.name;

			this.undos.push( cmd );

			this.idCounter = ( cmdJSON.id > this.idCounter ) ? cmdJSON.id : this.idCounter; 

		}

		for ( let i = 0; i < json.redos.length; i ++ ) {

			const cmdJSON = json.redos[ i ];

			const cmd = new Commands[ cmdJSON.type ]( this.editor ); 

			cmd.json = cmdJSON;

			cmd.id = cmdJSON.id;

			cmd.name = cmdJSON.name;

			this.redos.push( cmd );

			this.idCounter = ( cmdJSON.id > this.idCounter ) ? cmdJSON.id : this.idCounter; 

		}
		this.editor.signals.historyChanged.dispatch( this.undos[ this.undos.length - 1 ] );

	}

	clear() {

		this.undos = [];

		this.redos = [];

		this.idCounter = 0;

		this.editor.signals.historyChanged.dispatch();

	}

	goToState( id ) {

		if ( this.historyDisabled ) {

			alert( this.editor.strings.getKey( 'prompt/history/forbid' ) );

			return;

		}

		if ( id === undefined || id === null || Number.isNaN( id ) ) return;

		id = this.getNearestUndoableStateId( id );

		if ( id === undefined ) return;

		this.editor.signals.sceneGraphChanged.active = false;

		this.editor.signals.historyChanged.active = false;

		let cmd = this.undos.length > 0 ? this.undos[ this.undos.length - 1 ] : undefined;

		if ( cmd === undefined || id > cmd.id ) {

			cmd = this.redo();

			while ( cmd !== undefined && id > cmd.id ) {

				cmd = this.redo();

			}

		} else {

			while ( true ) {

				cmd = this.undos[ this.undos.length - 1 ];

				if ( cmd === undefined || id === cmd.id ) break;

				this.undo();

			}

		}

		this.editor.signals.sceneGraphChanged.active = true;

		this.editor.signals.historyChanged.active = true;

		this.editor.signals.sceneGraphChanged.dispatch();

		this.editor.signals.historyChanged.dispatch( cmd );

	}

	getNearestUndoableStateId( id ) {

		const currentId = this.undos.length > 0 ? this.undos[ this.undos.length - 1 ].id : undefined;

		if ( currentId === undefined ) return id;

		for ( let i = this.undos.length - 1; i >= 0; i -- ) {

			const cmd = this.undos[ i ];

			if ( cmd.id === id ) {

				if ( cmd.undoable !== false ) return id;

				for ( let j = i - 1; j >= 0; j -- ) {

					if ( this.undos[ j ].undoable !== false ) return this.undos[ j ].id;

				}

				return undefined;

			}

		}

		for ( let i = this.redos.length - 1; i >= 0; i -- ) {

			const cmd = this.redos[ i ];

			if ( cmd.id === id ) {

				if ( cmd.undoable !== false ) return id;

				return currentId;

			}

		}

		return id;

	}

	enableSerialization( id ) {

		/**
		 * because there might be commands in this.undos and this.redos
		 * which have not been serialized with .toJSON() we go back
		 * to the oldest command and redo one command after the other
		 * while also calling .toJSON() on them.
		 */

		this.goToState( - 1 );

		this.editor.signals.sceneGraphChanged.active = false;

		this.editor.signals.historyChanged.active = false;

		let cmd = this.redo();

		while ( cmd !== undefined ) {

			if ( ! cmd.hasOwnProperty( 'json' ) ) {

				cmd.json = cmd.toJSON();

			}

			cmd = this.redo();

		}

		this.editor.signals.sceneGraphChanged.active = true;

		this.editor.signals.historyChanged.active = true;

		this.goToState( id );

	}

}

export { History };
