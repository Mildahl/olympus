/**
 * Type declarations for the AECO library public API.
 * These enable autocomplete (IntelliSense) when using aeco in external projects.
 */

export interface AECOContext {
  dom: HTMLElement | null;
  viewport: HTMLElement | null;
  root: unknown;
  config: { ui: Record<string, unknown>; app: Record<string, unknown>; addons: unknown[] };
  editor?: {
    scene: unknown;
    selected: unknown;
    signals: Record<string, { add: (cb: (...args: unknown[]) => void) => void }>;
    selectByUuid: (uuid: string) => void;
    deselect: () => void;
    hideObject: (obj: unknown) => void;
    showObject: (obj: unknown) => void;
  };
  signals: Record<string, { add: (cb: (...args: unknown[]) => void) => void; dispatch: (...args: unknown[]) => void }>;
}

export interface SceneToolStatic {
  setFog(context: AECOContext, options: { fogType?: string; hex?: number; near?: number; far?: number; density?: number }): void;
  add(context: AECOContext, obj: unknown, parent?: unknown): void;
  addToLayer(context: AECOContext, group: unknown, layerPath?: string | null): void;
  onSelection(callback: (object: unknown) => void): void;
  getLayerByPath(context: AECOContext, layerPath: string): unknown;
  getEntityGlobalId(object: unknown): string | null;
  selectObjectsByGuid(context: AECOContext, guids: string[]): void;
  focus(context: AECOContext): void;
  deselect(context: AECOContext): void;
  hide(context: AECOContext, object: unknown): void;
  show(context: AECOContext, object: unknown): void;
  addCube(context: AECOContext, size?: number, color?: number): unknown;
  addPlane(context: AECOContext, options?: Record<string, unknown>): unknown;
  addArrow(context: AECOContext, options?: Record<string, unknown>): unknown;
  addMesh(context: AECOContext, verts: unknown, edges: unknown, faces: unknown): unknown;
  addPrimitive(context: AECOContext, primitive?: string, position?: [number, number, number]): unknown;
}

export interface WorldTools {
  configurator: unknown;
  layer: {
    getLayerByPath(path: string): unknown;
    getLayerByName(name: string): unknown;
    World: unknown;
  };
  scene: SceneToolStatic;
  model: Record<string, unknown>;
  drawing: Record<string, unknown>;
  placement: Record<string, unknown>;
  notification: unknown;
  viewpoint: Record<string, unknown>;
  animationPath: Record<string, unknown>;
  measure: unknown;
  sectionBox: unknown;
}

export interface CodeTools {
  pyWorker: unknown;
  js: unknown;
  editor: unknown;
  nodes: unknown;
}

export interface BIMTools {
  project: unknown;
  geometry: unknown;
  attribute: unknown;
  pset: unknown;
  sequence: unknown;
  types: unknown;
  modeling: unknown;
}

export interface Tools {
  world: WorldTools;
  code: CodeTools;
  bim: BIMTools;
  ifc: unknown;
}

export interface Operators {
  execute(name: string, context: AECOContext, ...args: unknown[]): Promise<unknown>;
  registry: Record<string, unknown>;
}

export interface AECOInstance {
  context: AECOContext;
  tools: Tools;
  ops: Operators;
  data: unknown;
  core: unknown;
  createUI(options: { config: unknown; container: HTMLElement; addons?: unknown }): void;
  clearStorage(): void;
}

export class AECO {
  constructor(container: HTMLElement);
  context: AECOContext;
  tools: Tools;
  ops: Operators;
  data: unknown;
  core: unknown;
  createUI(options: { config: unknown; container: HTMLElement; addons?: unknown }): void;
  clearStorage(): void;
  static clearStorage(): void;
}

export const operators: Operators;
export const tools: Tools;
export const context: AECOContext;

export default AECO;
