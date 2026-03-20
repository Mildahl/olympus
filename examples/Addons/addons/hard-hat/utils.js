/**
 * Hard-Hat Addon Utility Functions
 * 
 * Calculation and display formatting utilities.
 * All data schema and storage operations are in core.js
 */

import { DEFAULT_SUBCONTRACTORS, OBJECT_SHAPES, LIFT_STATUS_LIST } from "./core.js";

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

export const DEFAULT_CRANE_SPEED = 2; // m/min

export const DEFAULT_DROP_TIME_SEC_PER_TON = 25;

export const DEFAULT_WORKING_HOURS = 8;

// ─────────────────────────────────────────────────────────────
// CALCULATION UTILITIES
// ─────────────────────────────────────────────────────────────

/**
 * Format seconds as "X min Y sec" string
 */
export function formatMinSec(totalSec) {
  const m = Math.floor(totalSec / 60);

  const s = Math.round(totalSec % 60);

  return s > 0 ? `${m} min ${s} sec` : `${m} min`;
}

/**
 * Format seconds as ISO 8601 duration (PTxHxMxS)
 */
export function formatISODuration(totalSec) {
  const h = Math.floor(totalSec / 3600);

  const m = Math.floor((totalSec % 3600) / 60);

  const s = Math.round(totalSec % 60);

  let iso = "PT";

  if (h > 0) iso += `${h}H`;

  if (m > 0) iso += `${m}M`;

  if (s > 0 || iso === "PT") iso += `${s}S`;

  return iso;
}

/**
 * Calculate 3D distance between two points
 */
export function getLiftDistance(lift) {
  const from = lift.pFrom || lift.from;

  const to = lift.pTo || lift.to;

  if (!from || !to) return 0;

  const dx = to.x - from.x;

  const dy = to.y - from.y;

  const dz = to.z - from.z;

  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Enrich lifts with time estimates (mutates in place)
 * Computes pStart, pEnd, ifcduration, and other task-compatible fields
 * @param {Array} lifts - Array of lift objects
 * @param {number} craneSpeedMetersPerMin - Crane speed in m/min
 * @param {number} dropTimeSecPerTon - Drop time per ton in seconds
 * @returns {Array} The same lifts array, enriched
 */
export function enrichLiftsWithEstimates(
  lifts, 
  craneSpeedMetersPerMin = DEFAULT_CRANE_SPEED, 
  dropTimeSecPerTon = DEFAULT_DROP_TIME_SEC_PER_TON
) {
  const speed = Math.max(0.1, craneSpeedMetersPerMin);
  
  lifts.forEach((lift, index) => {
    const distance = getLiftDistance(lift);

    const weight = lift.pWeight ?? lift.weight ?? 1.0;

    const travelTimeSec = (distance / speed) * 60;

    const dropTimeSec = weight * dropTimeSecPerTon;

    const totalTimeSec = travelTimeSec + dropTimeSec;
    
    // Distance
    lift.pDistance = distance;
    
    // Duration in various formats
    lift.ifcduration = formatMinSec(totalTimeSec);

    lift.pDuration = formatISODuration(totalTimeSec);
    
    // Compute pStart and pEnd times
    const startDate = new Date(lift.pStart || lift.scheduledDateTime);

    const endDate = new Date(startDate.getTime() + totalTimeSec * 1000);
    
    // Store as ISO strings for Gantt compatibility
    lift.pStart = startDate.toISOString();

    lift.pEnd = endDate.toISOString();

    lift.pPlanStart = lift.pPlanStart || lift.pStart;

    lift.pPlanEnd = lift.pPlanEnd || lift.pEnd;
    
    // Assign sequential numeric IDs for Gantt (1-based index)
    lift.pNumericID = index + 1;
  });
  
  return lifts;
}

// ─────────────────────────────────────────────────────────────
// STATISTICS CALCULATIONS
// ─────────────────────────────────────────────────────────────

/**
 * Parse ISO duration to seconds
 */
function parseDurationToSec(isoDuration) {
  if (!isoDuration || typeof isoDuration !== 'string') return 0;

  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

  if (!match) return 0;

  const h = parseInt(match[1] || 0, 10);

  const m = parseInt(match[2] || 0, 10);

  const s = parseInt(match[3] || 0, 10);

  return h * 3600 + m * 60 + s;
}

/**
 * Compute aggregate statistics from lifts
 */
export function computeLiftStats(lifts) {
  const totalLifts = lifts.length;

  const totalTimeUsedSec = lifts.reduce((s, l) => s + parseDurationToSec(l.pDuration), 0);

  const weights = lifts.map(l => l.pWeight ?? l.weight ?? 0);

  const avgWeight = totalLifts > 0 ? weights.reduce((a, b) => a + b, 0) / totalLifts : 0;

  const totalWeight = weights.reduce((a, b) => a + b, 0);

  const travelDistance = lifts.reduce((s, l) => s + (l.pDistance ?? getLiftDistance(l)), 0);

  const avgEstimatedTimeSec = totalLifts > 0 ? totalTimeUsedSec / totalLifts : 0;
  
  return {
    totalLifts,
    totalTimeUsedSec,
    avgWeight,
    totalWeight,
    travelDistance,
    avgEstimatedTimeSec,
  };
}

/**
 * Compute daily capacity metrics
 */
export function computeDayCapacity(totalTimeUsedSec, workingHours = DEFAULT_WORKING_HOURS) {
  const h = Math.max(0.1, parseFloat(workingHours) || DEFAULT_WORKING_HOURS);

  const workingDaySec = h * 3600;

  const craneUsagePercent = (totalTimeUsedSec / workingDaySec) * 100;

  const remainingPercent = Math.max(0, 100 - craneUsagePercent);

  return { craneUsagePercent, remainingPercent };
}

// ─────────────────────────────────────────────────────────────
// DISPLAY DATA BUILDERS
// ─────────────────────────────────────────────────────────────

/**
 * Build stats display data for UI
 */
export function buildLiftStatsDisplay(stats) {
  return [
    { key: "Total Lifts", value: String(stats.totalLifts), icon: "numbers" },
    { key: "Total Time", value: formatMinSec(stats.totalTimeUsedSec), icon: "timer" },
    { key: "Total Distance", value: `${stats.travelDistance.toFixed(1)} m`, icon: "straighten" },
    { key: "Avg. Time", value: formatMinSec(stats.avgEstimatedTimeSec), icon: "schedule" },
    { key: "Avg. Weight", value: `${stats.avgWeight.toFixed(2)} T`, icon: "scale" },
    { key: "Total Weight", value: `${stats.totalWeight.toFixed(2)} T`, icon: "weight" },
  ];
}

/**
 * Extract weather display data
 */
export function getWeatherDisplayData(weather) {
  if (!weather?.current) return [];

  const c = weather.current;

  return [
    { label: "State", value: c.condition?.text ?? "", icon: "nest_farsight_weather" },
    { label: "Visibility", value: `${c.vis_km ?? ""} km`, icon: "visibility" },
    { label: "Wind", value: `${c.wind_kph ?? ""} km/h`, icon: "air" },
    { label: "Wind Gust", value: `${c.gust_kph ?? ""} km/h`, icon: "campaign" },
    { label: "Humidity", value: `${c.humidity ?? ""}%`, icon: "humidity_mid" },
    { label: "Pressure", value: `${c.pressure_mb ?? ""} mb`, icon: "compress" },
    { label: "Precipitation", value: `${c.precip_mm ?? ""} mm`, icon: "water_drop" },
    { label: "Dew Point", value: `${c.dewpoint_c ?? ""}°C`, icon: "thermometer" },
  ];
}

/**
 * Extract location display data
 */
export function getLocationDisplayData(weather) {
  if (!weather?.location) {
    return { lat: null, lon: null, name: "", region: "", country: "", tz_id: "", localtime: "" };
  }

  const loc = weather.location;

  return {
    lat: loc.lat,
    lon: loc.lon,
    name: loc.name ?? "",
    region: loc.region ?? "",
    country: loc.country ?? "",
    tz_id: loc.tz_id ?? "",
    localtime: loc.localtime ?? "",
  };
}

// ─────────────────────────────────────────────────────────────
// GRID DATA BUILDERS (Task-compatible with p prefix)
// ─────────────────────────────────────────────────────────────

/**
 * Column configuration for the lifting schedule spreadsheet
 * Uses task-compatible field names (p prefix)
 */
export const LIFT_COLUMN_ORDER = [
  "select",
  "pRes",
  "pName",
  "pWeight",
  "pStart",
  "pEnd",
  "ifcduration",
  "pShapeType",
  "status",
];

export const LIFT_COLUMN_CONFIG = {
  select: {
    headerName: "",
    width: 50,
    maxWidth: 50,
    checkboxSelection: true,
    headerCheckboxSelection: true,
    editable: false,
    sortable: false,
    filter: false,
    suppressMenu: true,
  },
  pRes: { 
    headerName: "Company", 
    width: 150,
    cellEditor: "agSelectCellEditor",
    cellEditorParams: { values: DEFAULT_SUBCONTRACTORS },
  },
  pName: { headerName: "Name", width: 140 },
  pWeight: { headerName: "Weight (T)", width: 100 },
  pStart: { 
    headerName: "Start", 
    width: 80, 
    editable: false,
    headerClass: "calculated-column-header",
  },
  pEnd: { 
    headerName: "End", 
    width: 80, 
    editable: false,
    headerClass: "calculated-column-header",
  },
  ifcduration: { 
    headerName: "Duration", 
    width: 100, 
    editable: false,
    headerClass: "calculated-column-header",
  },
  pShapeType: { 
    headerName: "Shape", 
    width: 100,
    cellEditor: "agSelectCellEditor",
    cellEditorParams: { values: Object.keys(OBJECT_SHAPES) },
  },
  status: { 
    headerName: "Status", 
    width: 110,
    cellEditor: "agSelectCellEditor",
    cellEditorParams: { values: LIFT_STATUS_LIST },
  },
};

/**
 * Build grid-ready data from lifts (task-compatible format)
 * Only includes essential columns for the main spreadsheet view
 * Note: pID is included in data for internal operations but hidden from column order
 */
export function buildLiftDataForGrid(lifts, columnOrder = LIFT_COLUMN_ORDER) {
  const formatTime = (isoString) => {
    if (!isoString) return "—";

    const d = new Date(isoString);

    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  };

  return lifts.map((lift) => ({
    // pID included for internal operations (delete, update) but not in column order
    pID: lift.pID,
    pRes: lift.pRes || lift.pSubcontractor || "—",
    pName: lift.pName || "—",
    pWeight: lift.pWeight ?? lift.weight ?? 0,
    pStart: formatTime(lift.pStart),
    pEnd: formatTime(lift.pEnd),
    ifcduration: lift.ifcduration || "—",
    pShapeType: lift.pShape?.type || "Box",
    status: lift.status || "NOTSTARTED",
  }));
}

/**
 * Convert lifts to full task format for Gantt/export
 * This produces data compatible with sample_tasks.json
 */
export function liftsToTaskFormat(lifts) {
  return lifts.map((lift, index) => ({
    pID: lift.pNumericID || index + 1,
    pName: lift.pName,
    pCaption: lift.pCaption || lift.pName,
    pStart: lift.pStart,
    pEnd: lift.pEnd,
    pPlanStart: lift.pPlanStart || lift.pStart,
    pPlanEnd: lift.pPlanEnd || lift.pEnd,
    pMile: lift.pMile || 0,
    pRes: lift.pRes || lift.pSubcontractor,
    pComp: lift.pComp || 0,
    pGroup: lift.pGroup || 0,
    pParent: lift.pParent || 0,
    pOpen: lift.pOpen ?? 1,
    pCost: lift.pCost || lift.pWeight || 0,
    ifcduration: lift.ifcduration,
    resourceUsage: lift.resourceUsage || "",
    status: lift.status,
    priority: lift.priority || "normal",
    inputs: lift.inputs || [],
    outputs: lift.outputs || [],
    predecessors: lift.predecessors || [],
    successors: lift.successors || [],
    dependencies: lift.dependencies || [],
    pClass: lift.pClass || "gtaskblue",
    pDepend: lift.pDepend || "",
    // Lift-specific extensions
    _liftData: {
      pWeight: lift.pWeight,
      pFrom: lift.pFrom,
      pTo: lift.pTo,
      pShape: lift.pShape,
      pDistance: lift.pDistance,
      pDescription: lift.pDescription,
    },
  }));
}
