import * as THREE from "three";
import SceneTool from "../tool/viewer/SceneTool.js";

export const ANIMATION_COLOR_SCHEMES = {
  standard: {
    name: "Standard",
    predefinedTypes: {
      CONSTRUCTION: 0x4caf50,
      DEMOLITION: 0xf44336,
      RENOVATION: 0xff9800,
      OPERATION: 0x2196f3,
      MAINTENANCE: 0x9c27b0,
      MOVE: 0x00bcd4,
      USERDEFINED: 0x607d8b,
      NOTDEFINED: 0x9e9e9e,
    },
    status: {
      NOTSTARTED: 0x9e9e9e,
      STARTED: 0xffc107,
      FINISHED: 0x4caf50,
      ONHOLD: 0xf44336,
    },
    input: 0x2196f3,
    output: 0x4caf50,
    inactive: 0x424242,
  },
  monochrome: {
    name: "Monochrome",
    predefinedTypes: {
      CONSTRUCTION: 0x333333,
      DEMOLITION: 0x666666,
      RENOVATION: 0x444444,
      OPERATION: 0x555555,
      MAINTENANCE: 0x777777,
      MOVE: 0x888888,
      USERDEFINED: 0x999999,
      NOTDEFINED: 0xaaaaaa,
    },
    status: {
      NOTSTARTED: 0xcccccc,
      STARTED: 0x666666,
      FINISHED: 0x333333,
      ONHOLD: 0x999999,
    },
    input: 0x555555,
    output: 0x333333,
    inactive: 0xeeeeee,
  },
  highContrast: {
    name: "High Contrast",
    predefinedTypes: {
      CONSTRUCTION: 0x00ff00,
      DEMOLITION: 0xff0000,
      RENOVATION: 0xffff00,
      OPERATION: 0x0000ff,
      MAINTENANCE: 0xff00ff,
      MOVE: 0x00ffff,
      USERDEFINED: 0xffffff,
      NOTDEFINED: 0x808080,
    },
    status: {
      NOTSTARTED: 0x808080,
      STARTED: 0xffff00,
      FINISHED: 0x00ff00,
      ONHOLD: 0xff0000,
    },
    input: 0x0000ff,
    output: 0x00ff00,
    inactive: 0x000000,
  },
};

/**
 * TimelinePlaybackEngine
 *
 * Task-agnostic playback + scene application engine.
 * A provider supplies per-date frame data (guids + optional colors).
 */
export class TimelinePlaybackEngine {
  constructor(context, { provider = null } = {}) {
    this.context = context;
    this.provider = provider;

    this.isPlaying = false;
    this.currentDate = null;
    this.startDate = null;
    this.endDate = null;

    this.playbackSpeed = 1;
    this.colorScheme = "standard";
    this.colorMode = "predefinedType";

    this.frameId = null;
    this.lastFrameTime = 0;
    this.msPerDay = 100;

    this.originalVisibility = new Map();
    this.originalColors = new Map();
    this.originalInstanceMatrices = new Map();
    this.originalInstanceColors = new Map();

    this._signalsBound = false;
    this._bindSignals();
  }

  setProvider(provider) {
    this.provider = provider;
  }

  _toDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    return new Date(value);
  }

  _bindSignals() {
    if (this._signalsBound) return;
    this._signalsBound = true;

    const signals = this.context?.signals;
    if (!signals) return;

    signals.scheduleAnimationDateChanged?.add(({ currentDate, startDate, endDate }) => {
      const cd = this._toDate(currentDate);
      if (!cd) return;

      const sd = startDate ? this._toDate(startDate) : null;
      const ed = endDate ? this._toDate(endDate) : null;

      if (sd) this.startDate = sd;
      if (ed) this.endDate = ed;

      this.currentDate = cd;
      this.applyFrame(cd);
    });

    signals.scheduleAnimationPlaybackChanged?.add(({ isPlaying }) => {
      if (isPlaying) this._playInternal();
      else this._pauseInternal();
    });

    signals.scheduleAnimationColorSchemeChanged?.add(({ scheme, mode, colorScheme }) => {
      const resolvedScheme = scheme ?? colorScheme ?? this.colorScheme;
      const resolvedMode = mode ?? this.colorMode;

      if (resolvedScheme) this.colorScheme = resolvedScheme;
      if (resolvedMode) this.colorMode = resolvedMode;

      if (this.currentDate) this.applyFrame(this.currentDate);
    });

    signals.scheduleAnimationReset?.add(() => {
      this.stop();
      this.resetScene();
    });
  }

  play() {
    if (!this.startDate || !this.endDate) return;
    if (!this.currentDate) this.currentDate = new Date(this.startDate);
    if (this.isPlaying) return;

    this.context?.signals?.scheduleAnimationPlaybackChanged?.dispatch({ isPlaying: true });
  }

  pause() {
    this.context?.signals?.scheduleAnimationPlaybackChanged?.dispatch({ isPlaying: false });
  }

  stop() {
    this.isPlaying = false;
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  _playInternal() {
    if (!this.startDate || !this.endDate) return;
    if (!this.currentDate) this.currentDate = new Date(this.startDate);
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.lastFrameTime = performance.now();
    this._animate();
  }

  _pauseInternal() {
    this.isPlaying = false;
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  _animate() {
    if (!this.isPlaying) return;

    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    const daysToAdvance = (deltaTime / this.msPerDay) * this.playbackSpeed;
    const msToAdvance = daysToAdvance * 24 * 60 * 60 * 1000;

    const newDate = new Date(this.currentDate.getTime() + msToAdvance);

    if (this.endDate && newDate >= this.endDate) {
      this.context?.signals?.scheduleAnimationDateChanged?.dispatch({
        currentDate: this.endDate,
        startDate: this.startDate,
        endDate: this.endDate,
      });
      this.pause();
      return;
    }

    this.context?.signals?.scheduleAnimationDateChanged?.dispatch({
      currentDate: newDate,
      startDate: this.startDate,
      endDate: this.endDate,
    });

    this.frameId = requestAnimationFrame(() => this._animate());
  }

  async applyFrame(date) {
    if (!this.provider) return;

    if (this.provider.loadIfNeeded) {
      await this.provider.loadIfNeeded();
    }

    const frame = await this.provider.getFrameData(date, {
      colorScheme: this.colorScheme,
      colorMode: this.colorMode,
    });

    if (!frame) return;

    const visibleGuids = frame.visibleGuids ?? new Set();
    const activeGuids = frame.activeGuids ?? new Set();
    const colorByGuid = frame.colorByGuid ?? new Map();

    this.applySceneChanges({ visibleGuids, activeGuids, colorByGuid });
  }

  isAnimatableIfcObject(object) {
    if (!object || !object.isIfc || object.isSpatialContainer) return false;
    if (object.isInstancedRef && Array.isArray(object.instancedMeshInfos)) return true;
    if (!Array.isArray(object.children) || object.children.length === 0) return false;
    return object.children.some((child) => child && child.isMesh);
  }

  normalizeGuid(value) {
    if (typeof value !== "string") return null;
    if (value.startsWith("IFC/BodyRepresentation/")) return value.replace("IFC/BodyRepresentation/", "");
    if (value.startsWith("IFC/InstancedMesh/")) return value.replace("IFC/InstancedMesh/", "");
    return value;
  }

  setInstancedVisibility(object, isVisible) {
    if (!object || !Array.isArray(object.instancedMeshInfos)) return false;

    let didChange = false;

    for (const info of object.instancedMeshInfos) {
      if (!info || !info.mesh || info.instanceIndex === undefined) continue;
      const { mesh, instanceIndex } = info;

      if (!this.originalInstanceMatrices.has(mesh)) {
        this.originalInstanceMatrices.set(mesh, new Map());
      }

      const meshMatrices = this.originalInstanceMatrices.get(mesh);
      if (!meshMatrices.has(instanceIndex)) {
        const originalMatrix = new THREE.Matrix4();
        mesh.getMatrixAt(instanceIndex, originalMatrix);
        meshMatrices.set(instanceIndex, originalMatrix.clone());
      }

      const desiredMatrix = (() => {
        if (isVisible) return meshMatrices.get(instanceIndex);
        const hiddenMatrix = new THREE.Matrix4();
        hiddenMatrix.makeScale(0, 0, 0);
        return hiddenMatrix;
      })();

      const currentMatrix = new THREE.Matrix4();
      mesh.getMatrixAt(instanceIndex, currentMatrix);
      if (!currentMatrix.equals(desiredMatrix)) {
        mesh.setMatrixAt(instanceIndex, desiredMatrix);
        mesh.instanceMatrix.needsUpdate = true;
        didChange = true;
      }
    }

    return didChange;
  }

  setInstancedColor(object, color) {
    if (!object || !Array.isArray(object.instancedMeshInfos)) return false;

    let didChange = false;

    for (const info of object.instancedMeshInfos) {
      if (!info || !info.mesh || info.instanceIndex === undefined) continue;
      const { mesh, instanceIndex } = info;

      if (!this.originalInstanceColors.has(mesh)) {
        this.originalInstanceColors.set(mesh, new Map());
      }

      const meshColors = this.originalInstanceColors.get(mesh);
      if (!meshColors.has(instanceIndex)) {
        const originalColor = new THREE.Color();
        if (mesh.instanceColor) mesh.getColorAt(instanceIndex, originalColor);
        else if (mesh.material && mesh.material.color) originalColor.copy(mesh.material.color);
        else originalColor.setHex(0xffffff);
        meshColors.set(instanceIndex, originalColor.clone());
      }

      const desired = new THREE.Color(color);
      const current = new THREE.Color();
      if (mesh.instanceColor) mesh.getColorAt(instanceIndex, current);
      else if (mesh.material && mesh.material.color) current.copy(mesh.material.color);
      else current.setHex(0xffffff);

      if (!current.equals(desired)) {
        mesh.setColorAt(instanceIndex, desired);
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        didChange = true;
      }
    }

    return didChange;
  }

  applySceneChanges({ visibleGuids, activeGuids, colorByGuid }) {
    const scene = this.context?.editor?.scene;
    if (!scene) return;

    const hasElementData = visibleGuids && visibleGuids.size > 0;
    let didChange = false;

    scene.traverse((object) => {
      if (!this.isAnimatableIfcObject(object)) return;

      const guid = this.normalizeGuid(SceneTool.getEntityGlobalId(object));
      if (!guid) return;

      if (!this.originalVisibility.has(object)) {
        this.originalVisibility.set(object, object.visible);
      }

      if (!hasElementData) return;

      const isVisible = visibleGuids.has(guid);
      if (object.visible !== isVisible) {
        object.visible = isVisible;
        didChange = true;
      }

      if (object.isInstancedRef) {
        if (this.setInstancedVisibility(object, isVisible)) didChange = true;
      }

      const shouldTint = isVisible && activeGuids.has(guid) && colorByGuid.has(guid);
      if (shouldTint) {
        const color = colorByGuid.get(guid);

        if (object.isInstancedRef) {
          if (this.setInstancedColor(object, color)) didChange = true;
        }

        if (object.material && object.material.color) {
          if (!this.originalColors.has(object.material)) {
            this.originalColors.set(object.material, object.material.color.getHex());
          }
          if (object.material.color.getHex() !== color) {
            object.material.color.setHex(color);
            didChange = true;
          }
        }

        if (Array.isArray(object.children)) {
          object.children.forEach((child) => {
            if (!child || !child.material) return;

            if (Array.isArray(child.material)) {
              child.material.forEach((material) => {
                if (!material || !material.color) return;
                if (!this.originalColors.has(material)) {
                  this.originalColors.set(material, material.color.getHex());
                }
                if (material.color.getHex() !== color) {
                  material.color.setHex(color);
                  didChange = true;
                }
              });
              return;
            }

            if (!child.material.color) return;
            if (!this.originalColors.has(child.material)) {
              this.originalColors.set(child.material, child.material.color.getHex());
            }
            if (child.material.color.getHex() !== color) {
              child.material.color.setHex(color);
              didChange = true;
            }
          });
        }

        return;
      }

      // No tint requested: restore if we have originals.
      if (object.material && object.material.color && this.originalColors.has(object.material)) {
        const originalHex = this.originalColors.get(object.material);
        if (object.material.color.getHex() !== originalHex) {
          object.material.color.setHex(originalHex);
          didChange = true;
        }
      }

      if (Array.isArray(object.children)) {
        object.children.forEach((child) => {
          if (!child || !child.material) return;

          if (Array.isArray(child.material)) {
            child.material.forEach((material) => {
              if (!material || !material.color) return;
              if (!this.originalColors.has(material)) return;
              const originalHex = this.originalColors.get(material);
              if (material.color.getHex() !== originalHex) {
                material.color.setHex(originalHex);
                didChange = true;
              }
            });
            return;
          }

          if (!child.material.color) return;
          if (!this.originalColors.has(child.material)) return;
          const originalHex = this.originalColors.get(child.material);
          if (child.material.color.getHex() !== originalHex) {
            child.material.color.setHex(originalHex);
            didChange = true;
          }
        });
      }
    });

    if (didChange) {
      this.context?.editor?.signals?.timelineAnimationChanged?.dispatch({
        date: this.currentDate,
        activeCount: activeGuids?.size ?? 0,
      });
      this.context?.editor?.signals?.animationPathChanged?.dispatch();
    }
  }

  resetScene() {
    const scene = this.context?.editor?.scene;
    if (!scene) return;

    let didChange = false;

    scene.traverse((object) => {
      if (!this.isAnimatableIfcObject(object)) return;
      const guid = this.normalizeGuid(SceneTool.getEntityGlobalId(object));
      if (!guid) return;

      if (this.originalVisibility.has(object)) {
        const nextVisible = this.originalVisibility.get(object);
        if (object.visible !== nextVisible) {
          object.visible = nextVisible;
          didChange = true;
        }
      }

      if (object.material && object.material.color && this.originalColors.has(object.material)) {
        const nextHex = this.originalColors.get(object.material);
        if (object.material.color.getHex() !== nextHex) {
          object.material.color.setHex(nextHex);
          didChange = true;
        }
      }

      if (Array.isArray(object.children)) {
        object.children.forEach((child) => {
          if (!child || !child.material) return;

          if (Array.isArray(child.material)) {
            child.material.forEach((material) => {
              if (!material || !material.color) return;
              if (!this.originalColors.has(material)) return;
              const nextHex = this.originalColors.get(material);
              if (material.color.getHex() !== nextHex) {
                material.color.setHex(nextHex);
                didChange = true;
              }
            });
            return;
          }

          if (!child.material.color) return;
          if (!this.originalColors.has(child.material)) return;
          const nextHex = this.originalColors.get(child.material);
          if (child.material.color.getHex() !== nextHex) {
            child.material.color.setHex(nextHex);
            didChange = true;
          }
        });
      }

      if (object.isInstancedRef && Array.isArray(object.instancedMeshInfos)) {
        object.instancedMeshInfos.forEach((info) => {
          if (!info || !info.mesh || info.instanceIndex === undefined) return;

          const matrices = this.originalInstanceMatrices.get(info.mesh);
          if (matrices && matrices.has(info.instanceIndex)) {
            const desiredMatrix = matrices.get(info.instanceIndex);
            const currentMatrix = new THREE.Matrix4();
            info.mesh.getMatrixAt(info.instanceIndex, currentMatrix);
            if (!currentMatrix.equals(desiredMatrix)) {
              info.mesh.setMatrixAt(info.instanceIndex, desiredMatrix);
              info.mesh.instanceMatrix.needsUpdate = true;
              didChange = true;
            }
          }

          const colors = this.originalInstanceColors.get(info.mesh);
          if (colors && colors.has(info.instanceIndex)) {
            const desiredColor = colors.get(info.instanceIndex);
            const currentColor = new THREE.Color();
            if (info.mesh.instanceColor) info.mesh.getColorAt(info.instanceIndex, currentColor);
            else if (info.mesh.material && info.mesh.material.color) currentColor.copy(info.mesh.material.color);
            else currentColor.setHex(0xffffff);

            if (!currentColor.equals(desiredColor)) {
              info.mesh.setColorAt(info.instanceIndex, desiredColor);
              if (info.mesh.instanceColor) info.mesh.instanceColor.needsUpdate = true;
              didChange = true;
            }
          }
        });
      }
    });

    this.originalVisibility.clear();
    this.originalColors.clear();
    this.originalInstanceMatrices.clear();
    this.originalInstanceColors.clear();

    if (didChange) {
      this.context?.editor?.signals?.timelineAnimationChanged?.dispatch({ reset: true });
      this.context?.editor?.signals?.animationPathChanged?.dispatch();
    }
  }
}

