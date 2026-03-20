export interface AECOContext {
  dom: HTMLElement | null;
  viewport: HTMLElement | null;
  root: unknown;
  config: {
    ui: Record<string, unknown>;
    app: Record<string, unknown>;
    addons: unknown[];
  };
  editor?: {
    scene: unknown;
    selected: unknown;
    camera: unknown;
    controls: unknown;
    orientationGizmo: unknown;
    signals: Record<string, {
      add: (cb: (...args: unknown[]) => void) => void;
      dispatch: (...args: unknown[]) => void;
    }>;
    selectByUuid: (uuid: string) => void;
    deselect: () => void;
    hideObject: (obj: unknown) => void;
    showObject: (obj: unknown) => void;
    execute: (cmd: unknown) => void;
  };
  signals: Record<string, {
    add: (cb: (...args: unknown[]) => void) => void;
    dispatch: (...args: unknown[]) => void;
  }>;
  setConfig(ui: Record<string, unknown>, app: Record<string, unknown>): void;
  setAddonsConfig(addons: unknown): void;
  _deepMerge<T>(target: T, source: Partial<T>): T;
}

export interface SceneToolStatic {
  setFog(context: AECOContext, options: {
    fogType?: string;
    hex?: number;
    near?: number;
    far?: number;
    density?: number;
  }): void;
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
  model: Record<string, (...args: unknown[]) => unknown>;
  drawing: Record<string, unknown>;
  slicer: unknown;
  markup: unknown;
  placement: {
    setPosition(context: AECOContext | null, object: unknown, position: { x: number; y: number; z: number }): void;
    rotate(context: AECOContext | null, object: unknown, axis: string, angle: number): void;
    [key: string]: unknown;
  };
  notification: unknown;
  viewpoint: Record<string, unknown>;
  animationPath: Record<string, unknown>;
  navigate: unknown;
  gizmo: unknown;
  cursor: unknown;
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
  scheduler: unknown;
  initialized: {
    world: boolean;
    python: boolean;
    bim: boolean;
    bimContext: boolean;
  };
  loading: boolean;
  exportJSON(object: unknown, name: string): void;
  undo(modelName?: string): Promise<unknown>;
}

export interface OperatorRegistry {
  [name: string]: unknown;
}

export interface Operators {
  registry: OperatorRegistry;
  add(operatorClass: typeof Operator): void;
  remove(operatorClass: typeof Operator): void;
  execute(name: string, context: AECOContext, ...args: unknown[]): unknown | Promise<unknown>;
  registerModuleOperators(moduleDefinitions: ModuleDefinition[], activeIds: string[]): void;
}

export interface ModuleDefinition {
  id: string;
  name: string;
  description?: string;
  version?: string;
  dependsOn?: string[];
  operators?: (typeof Operator)[];
  ui?: unknown[];
}

export interface ModuleRegistry {
  modules: Map<string, ModuleDefinition>;
  activeModules: Set<string>;
  uiInstances: Map<string, unknown>;
  register(moduleDefinition: ModuleDefinition): void;
  unregister(id: string): void;
  get(id: string): ModuleDefinition | undefined;
  has(id: string): boolean;
  list(): string[];
  listActive(): string[];
  resolveLoadOrder(moduleIds: string[]): string[];
  getAllDependencies(ids: string[]): string[];
  checkDependencies(id: string): boolean;
  activate(id: string, args: { context: AECOContext; operators: Operators }, options?: Record<string, unknown>): boolean;
  deactivate(id: string): boolean;
  activateFromConfig(moduleConfigs: unknown[], args: { context: AECOContext; operators: Operators }, options?: Record<string, unknown>): void;
  getUIInstance(moduleId: string, className: string): unknown;
  getModuleUIInstances(moduleId: string): Map<string, unknown>;
}

export interface CoreNamespace {
  Notification: unknown;
  Init: {
    storeEditor(context: AECOContext, editor: unknown): void;
    [key: string]: unknown;
  };
  World: unknown;
  Terminal: unknown;
  Scripting: unknown;
  Layer: unknown;
  Viewpoint: unknown;
  AnimationPath: unknown;
  Measure: unknown;
  SectionBox: unknown;
  Navigation: unknown;
  Spatial: unknown;
  Theme: unknown;
  BIM: unknown;
  Scheduling: unknown;
  Configurator: unknown;
}

export interface DataStore {
  collections: unknown;
  state: {
    pendingChanges: Map<string, unknown>;
    lastSaved: unknown;
  };
  objects: unknown;
  registerCollection(guid: string, collection: unknown): void;
  unregisterCollection(guid: string): void;
  getObjectCollections(globalId: string): unknown[];
  getCollections(type: string): unknown[];
  getCollectionByGuid(guid: string): unknown;
  getCollection(type: string, guid: string): unknown;
  hasCollection(type: string, guid: string): boolean;
}

export class Operator {
  static operatorName: string;
  static operatorLabel: string;
  static operatorOptions: string[];
  inMemory: boolean;
  updatable: boolean;
  id: string | null;
  type: string;
  name: string;
  options: string[];
  context: AECOContext;
  input: Record<string, unknown>;
  poll(): boolean;
  execute(...args: unknown[]): unknown;
  undo(): void;
  toJSON(): { type: string; id: string | null; name: string };
  fromJSON(json: { type: string; id: string; name: string }): void;
}

export class UIHelper {
  static createTouchGhost(originalElement: HTMLElement): HTMLElement;
  static findDropZoneAtPoint(x: number, y: number): HTMLElement | null;
  static makeDraggable(element: HTMLElement, data: unknown, options?: Record<string, unknown>): HTMLElement;
  static makeDropZone(element: HTMLElement, config?: {
    validate?: (data: unknown) => boolean;
    onCorrect?: (data: unknown) => void;
    onIncorrect?: (data: unknown) => void;
  }): HTMLElement;
  static markDropZoneCorrect(element: HTMLElement, data: unknown): void;
  static markDropZoneIncorrect(element: HTMLElement, data: unknown): void;
  static celebrateCorrectAnswer(targetElement: HTMLElement): void;
  static createConfetti(targetElement: HTMLElement): void;
  static animateCoin(element: HTMLElement, options?: { duration?: number }): void;
  static playSuccessSound(): void;
  static resetTouchDragState(): void;
  static getTouchDragState(): Record<string, unknown>;
  static makeSceneDraggable(element: HTMLElement, data: unknown, options?: {
    onDrop?: (x: number, y: number, data: unknown) => void;
  }): HTMLElement;
}

export class AECO {
  constructor(container: HTMLElement);
  context: AECOContext;
  tools: Tools;
  ops: Operators;
  data: DataStore;
  core: CoreNamespace;
  moduleRegistry: ModuleRegistry;
  createUI(options: {
    config: unknown;
    container: HTMLElement;
    addons?: { ADDONS?: unknown[] } | unknown;
  }): void;
  enablePython(): Promise<void>;
  enableBIM(): Promise<void>;
  getActiveModules(): string[];
  isModuleActive(moduleId: string): boolean;
  activateModule(moduleId: string): boolean;
  deactivateModule(moduleId: string): boolean;
}

export const operators: Operators;
export const tools: Tools;
export const dataStore: DataStore;
export const moduleRegistry: ModuleRegistry;
export const Core: CoreNamespace;
export default AECO;
