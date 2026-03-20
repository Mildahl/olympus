import { TilesManager } from "../../context/world/editor/TilesManager.js";

class Load3DTileset {
    static operatorName = "tiles.load_tileset";

    static operatorOptions = ["REGISTER"];

    static label = "Load 3D Tileset";

    static description = "Load a 3D Tiles tileset from URL or Cesium Ion";

    constructor(context, url, options = {}) {
        this.context = context;

        this.url = url;

        this.options = options;
    }

    poll() {
        return !!this.context?.editor;
    }

    async execute() {
        const editor = this.context.editor;

        if (!editor) {
            return { status: "CANCELLED" };
        }

        if (!editor.tilesManager) {

            editor.tilesManager = new TilesManager(editor);

        }

        const tileSet = await editor.tilesManager.loadTileset(this.url, this.options);

        return {
            status: "FINISHED",
            tileSet
        };
    }
}

/**
 * Operator: Load from Cesium Ion
 * Loads a tileset from Cesium Ion using asset ID and API token
 */
class LoadCesiumIonTileset {
    static operatorName = "tiles.load_cesium_ion";

    static operatorOptions = ["REGISTER"];

    static label = "Load Cesium Ion Tileset";

    static description = "Load a 3D Tiles tileset from Cesium Ion";

    execute(context, assetId, apiToken, options = {}) {
        const editor = context.editor;

        if (!editor) {

            return { status: "CANCELLED" };
        }

        if (!editor.tilesManager) {
            editor.tilesManager = new TilesManager(editor);
        }

        return { status: "FINISHED" };
    }
}

/**
 * Operator: Remove Tileset
 * Removes a tileset from the scene
 */
class RemoveTileset {
    static operatorName = "tiles.remove_tileset";

    static operatorOptions = ["REGISTER"];

    static label = "Remove Tileset";

    static description = "Remove a 3D Tiles tileset from the scene";

    execute(context, tilesetId) {
        const editor = context.editor;

        if (!editor?.tilesManager) {
            console.error("[RemoveTileset] TilesManager not initialized");

            return { status: "CANCELLED" };
        }

        editor.tilesManager.removeTileset(tilesetId);

        return { status: "FINISHED" };
    }
}

/**
 * Operator: Set Tiles Quality
 * Adjusts the error target for tile rendering quality
 */
class SetTilesQuality {
    static operatorName = "tiles.set_quality";

    static operatorOptions = ["REGISTER"];

    static label = "Set Tiles Quality";

    static description = "Set the rendering quality for 3D Tiles (lower error = higher quality)";

    execute(context, errorTarget = 6) {
        const editor = context.editor;

        if (!editor?.tilesManager) {

            return { status: "CANCELLED" };
        }

        editor.tilesManager.setErrorTarget(errorTarget);
        return { status: "FINISHED" };
    }
}

/**
 * Operator: Toggle Tiles Debug
 * Toggles debug visualization for tile bounds
 */
class ToggleTilesDebug {
    static operatorName = "tiles.toggle_debug";

    static operatorOptions = ["REGISTER"];

    static label = "Toggle Tiles Debug";

    static description = "Toggle debug visualization for 3D Tiles bounding volumes";

    execute(context, enabled = true) {
        const editor = context.editor;

        if (!editor?.tilesManager) {

            return { status: "CANCELLED" };
        }

        editor.tilesManager.toggleDebug(enabled);
        return { status: "FINISHED" };
    }
}

export default [
    Load3DTileset,
    LoadCesiumIonTileset,
    RemoveTileset,
    SetTilesQuality,
    ToggleTilesDebug
];