function Config(context) {

	function getEditor() {
		if (!context.config.app.Editor) context.config.app.Editor = {};

		return context.config.app.Editor;
	}

	return {

		getKey: function (key) {

			return getEditor()[key];

		},

		// Expose app-level History for undo/redo persistence (used by editor/History.js)
		get History() {
			const editor = getEditor();
			if (editor != null && editor.History !== undefined) return editor.History;
			if (editor != null && editor['settings/history'] !== undefined) return editor['settings/history'];
			return context.config.app != null && context.config.app.History === true;
		},

		setKey: function () {

			const editor = getEditor();

			for (let i = 0, l = arguments.length; i < l; i += 2) {

				editor[arguments[i]] = arguments[i + 1];

			}

			context._saveConfig();

		},

		clear: function () {

			if (context.initialAppConfig && context.initialAppConfig.Editor) {
				context.config.app.Editor = JSON.parse(JSON.stringify(context.initialAppConfig.Editor));
			} else {
				context.config.app.Editor = {};
			}

			context._saveConfig();

		}

	};

}

export { Config };
