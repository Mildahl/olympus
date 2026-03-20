import { TilesRenderer } from '3d-tiles-renderer';

import { GLTFExtensionsPlugin, TilesFadePlugin, DebugTilesPlugin } from '3d-tiles-renderer/plugins';

import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

import * as THREE from 'three';

const DRACO_DECODER_PATH = 'https://www.gstatic.com/draco/v1/decoders/';

const DEFAULT_ERROR_TARGET = 6;

const DEFAULT_MAX_DEPTH = 15;

const UPDATE_THROTTLE_MS = 32;

const NAVIGATION_THROTTLE_MS = 500;

const POSITION_THRESHOLD = 0.5;

const TILESET_COLORS = [0x66ff66, 0xff6666, 0x6666ff, 0xffff66, 0xff66ff, 0x66ffff];

class TilesManager {
    constructor(editor) {
        this.editor = editor;

        this.tilesRenderers = new Map();

        this.debugEnabled = false;

        this.earth = null;

        this.lastCameraPosition = new THREE.Vector3();

        this.lastUpdateTime = 0;

        this.dracoLoader = this._createDracoLoader();
    }

    _createDracoLoader() {
        const loader = new DRACOLoader();

        loader.setDecoderPath(DRACO_DECODER_PATH);

        return loader;
    }

    _ensureUserData(tiles) {
        tiles.userData = tiles.userData || {};

        return tiles.userData;
    }

    _applyCameraAndResolution(tiles) {
        const { camera, renderer } = this.editor;

        const userData = this._ensureUserData(tiles);

        if (camera) {
            tiles.setCamera(camera);
        }

        if (camera && renderer) {
            tiles.setResolutionFromRenderer(camera, renderer);

            userData._resolutionPending = false;
        } else {
            userData._resolutionPending = true;
        }
    }

    _createTransparentSphereMesh(radius, segments, color, opacity, position = null) {
        const geometry = new THREE.SphereGeometry(radius, segments, segments / 2);

        const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity });

        const mesh = new THREE.Mesh(geometry, material);

        if (position) {
            mesh.position.copy(position);
        }

        return mesh;
    }

    _setupEarthReference(sphere, isGeospatial) {
        if (!this.debugEnabled) return;

        if (this.earth) {
            this.earth.visible = true;

            return;
        }

        const config = isGeospatial
            ? { radius: Math.max(sphere.radius * 3, 200), segments: 64, color: 0x7CC0CF, opacity: 0.4, yOffset: true }
            : { radius: Math.max(sphere.radius * 0.1, 10), segments: 32, color: 0xff6666, opacity: 0.5, yOffset: false };

        this.earth = this._createTransparentSphereMesh(config.radius, config.segments, config.color, config.opacity);
        
        if (config.yOffset) {
            this.earth.position.set(0, -config.radius, 0);
        }

        this.editor.scene.add(this.earth);

        this.earth.visible = true;
    }

    _addBoundingVisualization(tiles, sphere) {
        if (!this.debugEnabled) return;

        const colorIndex = (this.tilesRenderers.size - 1) % TILESET_COLORS.length;

        const boundingSphere = this._createTransparentSphereMesh(
            sphere.radius, 32, TILESET_COLORS[colorIndex], 0.2, sphere.center
        );

        tiles.group.add(boundingSphere);
    }

    _applyTilesetPositioning(tiles, sphere, isGeospatial) {
        const centerOffset = sphere.center.clone().multiplyScalar(-1);

        tiles.group.position.copy(centerOffset);

        const desiredRot = tiles.userData?.desiredRotation;

        if (desiredRot) {
            tiles.group.rotation.copy(desiredRot);
        }

        if (isGeospatial) {
            this._setupGeospatialCamera(sphere);
        }

        this.editor.signals.cameraChanged.dispatch();
    }

    _setupGeospatialCamera(sphere) {
        const distance = Math.max(sphere.radius * 2.5, 100);

        const cam = this.editor.viewportCamera || this.editor.camera;

        if (cam) {
            cam.position.set(0, 0, distance);

            cam.lookAt(0, 0, 0);
        }

        if (this.editor.controls) {
            this.editor.controls.center.set(0, 0, 0);
        }
    }

    _centerTileset(tiles) {
        const sphere = new THREE.Sphere();

        if (!tiles.getBoundingSphere(sphere)) {
            return;
        }

        const isGeospatial = Boolean(tiles.root?.boundingVolume?.region);
        
        this._applyTilesetPositioning(tiles, sphere, isGeospatial);

        this._setupEarthReference(sphere, isGeospatial);

        this._addBoundingVisualization(tiles, sphere);
    }

    _processLoadedModel(scene, tile) {
        scene.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;

                child.receiveShadow = true;

                child.userData.tileId = tile.id;

                child.userData.tileBoundingVolume = tile.boundingVolume;
            }
        });
    }

    _registerPlugins(tiles, enableFade, enableDebug) {
        tiles.registerPlugin(new GLTFExtensionsPlugin({ dracoLoader: this.dracoLoader }));
        
        if (enableFade) {
            tiles.registerPlugin(new TilesFadePlugin());
        }
        
        if (enableDebug) {
            tiles.registerPlugin(new DebugTilesPlugin());
        }
    }

    _attachTilesetEvents(tiles) {
        tiles.addEventListener('load-tile-set', () => {
            this._centerTileset(tiles);

            this.editor.signals.sceneGraphChanged.dispatch();
        });

        tiles.addEventListener('load-model', (event) => {
            this._processLoadedModel(event.scene, event.tile);
        });
    }

    async loadTileset(url, options = {}) {
        const {
            id = `tileset_${Date.now()}`,
            errorTarget = DEFAULT_ERROR_TARGET,
            maxDepth = DEFAULT_MAX_DEPTH,
            enableFade = true,
            enableDebug = false,
            position = { x: 0, y: 0, z: 0 },
            rotation = { x: 90, y: 0, z: 0 },
            scale = 1
        } = options;

        const tiles = new TilesRenderer(url);
        
        this._registerPlugins(tiles, enableFade, enableDebug);
        
        tiles.errorTarget = errorTarget;

        tiles.maxDepth = maxDepth;

        this._applyCameraAndResolution(tiles);

        tiles.group.position.set(position.x, position.y, position.z);

        tiles.group.scale.setScalar(scale);

        tiles.group.userData.skipVisibilityUpdate = true;

        const userData = this._ensureUserData(tiles);

        userData.desiredRotation = new THREE.Euler(rotation.x, rotation.y, rotation.z);

        this._attachTilesetEvents(tiles);

        this.editor.scene.add(tiles.group);

        this.tilesRenderers.set(id, tiles);

        return tiles;
    }

    _isNavigating() {
        const navController = this.editor.navigationController;

        return navController && (navController.mode === 'FLY' || navController.mode === 'FIRST_PERSON' || navController.mode === 'DRIVE');
    }

    _shouldSkipUpdate() {
        const now = performance.now();

        const isNavigating = this._isNavigating();

        const throttleTime = isNavigating ? NAVIGATION_THROTTLE_MS : UPDATE_THROTTLE_MS;

        if (now - this.lastUpdateTime < throttleTime) {
            return true;
        }

        const currentPosition = this.editor.camera.position;

        const distance = this.lastCameraPosition.distanceTo(currentPosition);

        const threshold = isNavigating ? POSITION_THRESHOLD * 2 : POSITION_THRESHOLD;

        if (distance < threshold) {
            return true;
        }

        this.lastCameraPosition.copy(currentPosition);

        this.lastUpdateTime = now;

        return false;
    }

    _resolvePendingResolutions() {
        if (!this.editor.renderer) {
            return;
        }

        for (const tiles of this.tilesRenderers.values()) {
            if (tiles.userData._resolutionPending) {
                this._applyCameraAndResolution(tiles);
            }
        }
    }

    update() {
        if (!this.editor.camera) {
            return;
        }

        this._resolvePendingResolutions();

        if (this._shouldSkipUpdate()) {
            return;
        }

        for (const tiles of this.tilesRenderers.values()) {
            tiles.update();
        }
    }

    getTileset(id) {
        return this.tilesRenderers.get(id);
    }

    removeTileset(id) {
        const tiles = this.tilesRenderers.get(id);

        if (!tiles) {
            return;
        }

        this.editor.scene.remove(tiles.group);

        tiles.dispose();

        this.tilesRenderers.delete(id);
    }

    setErrorTarget(errorTarget) {
        for (const tiles of this.tilesRenderers.values()) {
            tiles.errorTarget = errorTarget;
        }
    }

    toggleDebug(enabled) {
        this.debugEnabled = enabled;

        for (const tiles of this.tilesRenderers.values()) {
            const debugPlugin = tiles.getPluginByName('DEBUG_TILES_PLUGIN');

            if (debugPlugin) {
                debugPlugin.enabled = enabled;

                debugPlugin.displayBoxBounds = enabled;
            }
        }
    }

    getLoadingProgress() {
        const progress = {};

        for (const [id, tiles] of this.tilesRenderers) {
            const lp = tiles.loadProgress;

            progress[id] = {
                loading: lp?.loading || 0,
                loaded: lp?.loaded || 0,
                failed: lp?.failed || 0,
                total: lp?.total || 0
            };
        }

        return progress;
    }

    raycast(raycaster) {
        const intersections = [];

        for (const tiles of this.tilesRenderers.values()) {
            intersections.push(...raycaster.intersectObject(tiles.group, true));
        }

        return intersections.sort((a, b) => a.distance - b.distance);
    }

    dispose() {
        for (const tiles of this.tilesRenderers.values()) {
            this.editor.scene.remove(tiles.group);

            tiles.dispose();
        }

        this.tilesRenderers.clear();

        if (this.earth) {
            this.editor.scene.remove(this.earth);

            this.earth = null;
        }

        if (this.dracoLoader) {
            this.dracoLoader.dispose();
        }
    }
}

export { TilesManager };
