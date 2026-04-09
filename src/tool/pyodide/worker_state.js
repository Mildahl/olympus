
export let pyodide = null;

export let micropip = null;

export const installedPackages = new Set();

export let localToolsPath = null;
export const ifc = {
  context: null,    
  doc: null,        
  geom: null,       
  placement: null,  
  attribute: null,  
  sequence: null,   
  cost: null,       
  spatial: null,    
  pset: null,       
  pset_helper: null, 
};
export const scene = {};       

export const model = {};       

export const placement = {};   

export const notification = {}; 

export const viewpoint = {};   

export const animation = {};   

export const measure = {};     

export const section = {};     

export const layer = {};       

export const utils = {};       

export let outputBuffer = "";
export const bootstrapMetrics = {
  runId: null,
  startedAt: null,
  completedAt: null,
  marks: {},
  durations: {},
  localModules: {},
  firstIfcToolReadyAt: null,
  ifcToolCalls: 0,
};

/** When using local vendor, base URL for packages (no trailing slash). Used to load micropip by URL and bypass lockfile SRI. */
export let packageBaseUrl = "";

export function setPackageBaseUrl(value) { packageBaseUrl = value || ""; }
export function getPackageBaseUrl() { return packageBaseUrl; }
export function setPyodide(value) { pyodide = value; }
export function getPyodide() { return pyodide; }
export function setMicropip(value) { micropip = value; }
export function getMicropip() { return micropip; }
export function setLocalToolsPath(value) { localToolsPath = value; }
export function getLocalToolsPath() { return localToolsPath; }
export function setOutputBuffer(value) { outputBuffer = value; }
export function getOutputBuffer() { return outputBuffer; }
export function appendOutputBuffer(value) { outputBuffer += value; }
export function resetBootstrapMetrics() {
  bootstrapMetrics.runId = crypto.randomUUID();
  bootstrapMetrics.startedAt = performance.now();
  bootstrapMetrics.completedAt = null;
  bootstrapMetrics.marks = {};
  bootstrapMetrics.durations = {};
  bootstrapMetrics.localModules = {};
  bootstrapMetrics.firstIfcToolReadyAt = null;
  bootstrapMetrics.ifcToolCalls = 0;
}
export function markBootstrapMetric(name) {
  bootstrapMetrics.marks[name] = performance.now();
}
export function measureBootstrapDuration(name, startMark, endMark) {
  const startValue = bootstrapMetrics.marks[startMark];
  const endValue = bootstrapMetrics.marks[endMark];
  if (typeof startValue === "number" && typeof endValue === "number") {
    bootstrapMetrics.durations[name] = Number((endValue - startValue).toFixed(3));
  }
}
export function setBootstrapCompleted() {
  bootstrapMetrics.completedAt = performance.now();
}
export function markLocalModuleLoaded(moduleName, elapsedMs) {
  bootstrapMetrics.localModules[moduleName] = Number(elapsedMs.toFixed(3));
}
export function markFirstIfcToolReady() {
  if (bootstrapMetrics.firstIfcToolReadyAt === null) {
    bootstrapMetrics.firstIfcToolReadyAt = performance.now();
    bootstrapMetrics.marks.first_ifc_tool_ready = bootstrapMetrics.firstIfcToolReadyAt;
    measureBootstrapDuration("first_ifc_tool_ready_ms", "runtime_start", "first_ifc_tool_ready");
  }
}
export function incrementIfcToolCallCount() {
  bootstrapMetrics.ifcToolCalls += 1;
}
