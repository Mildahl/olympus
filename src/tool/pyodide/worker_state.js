
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
