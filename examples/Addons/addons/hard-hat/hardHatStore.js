/**
 * Hard-Hat Addon Core Data Layer
 * 
 * Manages lifting schedule data storage, retrieval, and CRUD operations.
 * Similar architecture to pdf-markup addon.
 */

const STORAGE_KEY = "aeco-addon.hard-hat";

// Set to true to disable localStorage and always use fresh defaults
const TESTING = true;

// ─────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────

function nowISO() {
  return new Date().toISOString();
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// SCHEMA DEFINITIONS
// ─────────────────────────────────────────────────────────────

/**
 * Object shape templates for lifts
 */
export const OBJECT_SHAPES = {
  Box: {
    name: "Box",
    icon: "deployed_code",
    color: "#ef4444",
    dimensions: { height: 1, length: 1, depth: 1 },
  },
  Cylinder: {
    name: "Cylinder",
    icon: "circle",
    color: "#3b82f6",
    dimensions: { height: 1, radius: 0.5 },
  },
  Sphere: {
    name: "Sphere",
    icon: "radio_button_unchecked",
    color: "#22c55e",
    dimensions: { radius: 0.5 },
  },
  Flat: {
    name: "Flat",
    icon: "rectangle",
    color: "#a855f7",
    dimensions: { height: 0.1, width: 1, length: 1 },
  },
  Irregular: {
    name: "Irregular",
    icon: "shapes",
    color: "#f97316",
    dimensions: { height: 1, length: 1, depth: 1 },
  },
};

/**
 * Default subcontractor list
 */
export const DEFAULT_SUBCONTRACTORS = [
  "KIER GROUP",
  "Bouygues UK",
  "Sir Robert McAlpine",
  "BAM Nuttall",
  "Laing O'Rourke",
  "Skanska UK",
  "Balfour Beatty",
  "Morgan Sindall",
  "Wates Group",
  "ISG Ltd",
];

/**
 * Lifting equipment types
 * Each piece of equipment has its own schedule/record of lifts
 */
export const LIFTING_EQUIPMENT = {
  TC1: {
    id: "TC1",
    name: "Tower Crane 1",
    type: "tower_crane",
    icon: "precision_manufacturing",
    maxCapacity: 20, // tons
    speed: 2, // m/min
    color: "#3b82f6",
  },
  TC2: {
    id: "TC2",
    name: "Tower Crane 2",
    type: "tower_crane",
    icon: "precision_manufacturing",
    maxCapacity: 15, // tons
    speed: 2.5, // m/min
    color: "#22c55e",
  },
  FORKLIFT: {
    id: "FORKLIFT",
    name: "Forklift",
    type: "forklift",
    icon: "forklift",
    maxCapacity: 5, // tons
    speed: 4, // m/min (faster but lower capacity)
    color: "#f97316",
  },
};

export const LIFTING_EQUIPMENT_LIST = Object.values(LIFTING_EQUIPMENT);

export const LIFTING_EQUIPMENT_IDS = Object.keys(LIFTING_EQUIPMENT);

/**
 * Default crane configuration
 */
export const DEFAULT_CRANE_CONFIG = {
  position: { x: -20, y: 20, z: 0 },
  scale: 0.5,
  maxCapacity: 20, // tons
  speed: 2, // m/min
};

/**
 * Default weather payload (WeatherAPI-like shape)
 * Used for demo UX when no live weather has been fetched yet.
 */
export const DEFAULT_WEATHER = {
  location: {
    name: "London",
    region: "Greater London",
    country: "United Kingdom",
    lat: 51.5072,
    lon: -0.1276,
    tz_id: "Europe/London",
    localtime: "2026-03-18 10:00",
  },
  current: {
    condition: { text: "Partly cloudy" },
    vis_km: 10,
    wind_kph: 18,
    gust_kph: 28,
    humidity: 62,
    pressure_mb: 1016,
    precip_mm: 0.0,
    dewpoint_c: 6,
  },
};

/**
 * Default working parameters
 */
export const DEFAULT_WORKING_PARAMS = {
  workingHours: 8,
  dropTimeSecPerTon: 25,
};

// ─────────────────────────────────────────────────────────────
// LIFT STATUS MAPPING (to match task status conventions)
// ─────────────────────────────────────────────────────────────

export const LIFT_STATUS = {
  NOTSTARTED: "NOTSTARTED",
  STARTED: "STARTED",
  FINISHED: "FINISHED",
  ONHOLD: "ONHOLD",
};

export const LIFT_STATUS_LIST = Object.values(LIFT_STATUS);

// ─────────────────────────────────────────────────────────────
// LIFT TEMPLATE SCHEMA (Task-compatible with 'p' prefix)
// ─────────────────────────────────────────────────────────────

/**
 * Creates a new lift entry with task-compatible fields (p prefix)
 * Compatible with Gantt/spreadsheet components and sample_tasks.json format
 * @param {Object} opts - Lift options
 * @returns {Object} A complete lift object with task-compatible fields
 */
export function createLift(opts = {}) {
  const pID = uid("lift");

  const shape = OBJECT_SHAPES[opts.shape] || OBJECT_SHAPES.Box;

  const now = nowISO();
  
  // Parse scheduled datetime for pStart, compute pEnd later via enrichment
  const scheduledDateTime = opts.scheduledDateTime || now;
  
  return {
    // Task-compatible fields (p prefix)
    pID,
    pName: opts.name || "New Lift",
    pCaption: opts.name || "New Lift",
    pStart: scheduledDateTime,
    pEnd: "", // Computed: pStart + duration
    pPlanStart: scheduledDateTime,
    pPlanEnd: "", // Computed: pPlanStart + duration
    pMile: 0, // Not a milestone
    pRes: opts.subcontractor || DEFAULT_SUBCONTRACTORS[0], // Resource = subcontractor
    pComp: 0, // Completion percentage
    pGroup: 0, // Not a group/parent task
    pParent: opts.pParent || 0, // Parent task ID (0 = root)
    pOpen: 1, // Expanded in hierarchy
    pCost: opts.weight ?? 1.0, // Using weight as "cost" metric
    pClass: "gtaskblue", // CSS class for Gantt
    pDepend: opts.pDepend || "", // Dependency string for Gantt (e.g., "1,2FS")
    
    // Task relationships
    predecessors: opts.predecessors || [],
    successors: opts.successors || [],
    dependencies: opts.dependencies || [],
    
    // Status (task-compatible)
    status: opts.status || LIFT_STATUS.NOTSTARTED,
    priority: opts.priority || "normal",
    
    // Lift-specific fields
    pDescription: opts.description || "",
    pWeight: opts.weight ?? 1.0, // Weight in tons
    pSubcontractor: opts.subcontractor || DEFAULT_SUBCONTRACTORS[0],
    
    // Positions (in meters) - lift specific
    pFrom: opts.from || { x: 0, y: 0, z: 0 },
    pTo: opts.to || { x: 10, y: 10, z: 10 },
    
    // Shape info - lift specific
    pShape: {
      type: opts.shape || "Box",
      ...shape,
      dimensions: { ...shape.dimensions, ...(opts.dimensions || {}) },
    },
    
    // Computed fields (enriched later)
    pDuration: null, // ISO duration string
    ifcduration: null, // Duration for display
    pDistance: null, // Travel distance
    resourceUsage: "", // Resource usage info
    
    // Equipment assignment
    equipmentId: opts.equipmentId || "TC1", // Default to Tower Crane 1
    
    // Metadata
    inputs: [],
    outputs: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Creates default sample lifts for demo purposes
 * Task-compatible format with predecessors/successors for dependencies
 * Distributed across equipment types (TC1, TC2, Forklift) and multiple dates
 */
export function createDefaultLifts() {
  const lifts = [
    // ═══════════════════════════════════════════════════════════
    // TC1 - Tower Crane 1 (Heavy structural lifts)
    // ═══════════════════════════════════════════════════════════
    
    // Feb 1, 2026 - TC1
    createLift({
      equipmentId: "TC1",
      subcontractor: "KIER GROUP",
      name: "Steel Column Assembly",
      description: "Prefabricated steel column for core structure",
      weight: 12.5,
      scheduledDateTime: "2026-02-01T08:00:00",
      from: { x: 0, y: 0, z: 0 },
      to: { x: 20, y: 25, z: 15 },
      shape: "Cylinder",
      priority: "high",
      status: "FINISHED",
    }),
    createLift({
      equipmentId: "TC1",
      subcontractor: "Bouygues UK",
      name: "Precast Floor Slab",
      description: "Precast concrete floor panel for level 5",
      weight: 8.2,
      scheduledDateTime: "2026-02-01T10:30:00",
      from: { x: 5, y: 0, z: 0 },
      to: { x: 15, y: 18, z: 12 },
      shape: "Flat",
      priority: "high",
      status: "FINISHED",
    }),
    createLift({
      equipmentId: "TC1",
      subcontractor: "Sir Robert McAlpine",
      name: "HVAC Chiller Unit",
      description: "Main chiller unit for mechanical plant room",
      weight: 15.0,
      scheduledDateTime: "2026-02-01T14:00:00",
      from: { x: 0, y: 0, z: 0 },
      to: { x: 25, y: 30, z: 20 },
      shape: "Box",
      priority: "high",
      status: "FINISHED",
    }),
    
    // Feb 2, 2026 - TC1
    createLift({
      equipmentId: "TC1",
      subcontractor: "BAM Nuttall",
      name: "Concrete Skip",
      description: "Concrete delivery for level 6 pour",
      weight: 4.5,
      scheduledDateTime: "2026-02-02T08:30:00",
      from: { x: 2, y: 0, z: 0 },
      to: { x: 18, y: 20, z: 14 },
      shape: "Sphere",
      priority: "normal",
      status: "FINISHED",
    }),
    createLift({
      equipmentId: "TC1",
      subcontractor: "Laing O'Rourke",
      name: "Steel Beam Bundle",
      description: "Secondary steel beams for floor framing",
      weight: 9.8,
      scheduledDateTime: "2026-02-02T11:00:00",
      from: { x: 8, y: 0, z: 0 },
      to: { x: 22, y: 24, z: 16 },
      shape: "Cylinder",
      priority: "high",
      status: "STARTED",
    }),
    
    // Feb 3, 2026 (Today) - TC1
    createLift({
      equipmentId: "TC1",
      subcontractor: "Skanska UK",
      name: "Precast Stair Core",
      description: "Precast stairwell section for core",
      weight: 11.0,
      scheduledDateTime: "2026-02-03T08:00:00",
      from: { x: 3, y: 0, z: 0 },
      to: { x: 12, y: 22, z: 18 },
      shape: "Irregular",
      priority: "high",
      status: "NOTSTARTED",
    }),
    createLift({
      equipmentId: "TC1",
      subcontractor: "Morgan Sindall",
      name: "Generator Set",
      description: "Emergency backup generator",
      weight: 7.5,
      scheduledDateTime: "2026-02-03T10:30:00",
      from: { x: 0, y: 0, z: 0 },
      to: { x: 8, y: 6, z: 4 },
      shape: "Box",
      priority: "normal",
      status: "NOTSTARTED",
    }),
    createLift({
      equipmentId: "TC1",
      subcontractor: "Wates Group",
      name: "Rebar Cage L7",
      description: "Reinforcement cage for level 7 column",
      weight: 6.2,
      scheduledDateTime: "2026-02-03T14:00:00",
      from: { x: 10, y: 0, z: 0 },
      to: { x: 20, y: 28, z: 22 },
      shape: "Cylinder",
      priority: "normal",
      status: "NOTSTARTED",
    }),

    // ═══════════════════════════════════════════════════════════
    // TC2 - Tower Crane 2 (Medium structural lifts, east side)
    // ═══════════════════════════════════════════════════════════
    
    // Feb 1, 2026 - TC2
    createLift({
      equipmentId: "TC2",
      subcontractor: "ISG Ltd",
      name: "Curtain Wall Frame",
      description: "Aluminum curtain wall framing section",
      weight: 3.2,
      scheduledDateTime: "2026-02-01T08:30:00",
      from: { x: 40, y: 0, z: 0 },
      to: { x: 55, y: 20, z: 12 },
      shape: "Flat",
      priority: "normal",
      status: "FINISHED",
    }),
    createLift({
      equipmentId: "TC2",
      subcontractor: "Willmott Dixon",
      name: "Precast Balcony",
      description: "Precast concrete balcony unit",
      weight: 5.5,
      scheduledDateTime: "2026-02-01T11:00:00",
      from: { x: 35, y: 0, z: 0 },
      to: { x: 50, y: 15, z: 10 },
      shape: "Flat",
      priority: "high",
      status: "FINISHED",
    }),
    
    // Feb 2, 2026 - TC2
    createLift({
      equipmentId: "TC2",
      subcontractor: "Galliford Try",
      name: "Formwork Assembly",
      description: "Wall formwork for shear wall",
      weight: 4.0,
      scheduledDateTime: "2026-02-02T09:00:00",
      from: { x: 38, y: 0, z: 0 },
      to: { x: 52, y: 18, z: 14 },
      shape: "Flat",
      priority: "normal",
      status: "FINISHED",
    }),
    createLift({
      equipmentId: "TC2",
      subcontractor: "KIER GROUP",
      name: "MEP Duct Section",
      description: "Large HVAC ductwork prefab section",
      weight: 2.8,
      scheduledDateTime: "2026-02-02T13:30:00",
      from: { x: 42, y: 0, z: 0 },
      to: { x: 48, y: 22, z: 16 },
      shape: "Cylinder",
      priority: "low",
      status: "STARTED",
    }),
    
    // Feb 3, 2026 (Today) - TC2
    createLift({
      equipmentId: "TC2",
      subcontractor: "Bouygues UK",
      name: "Glass Panel Unit",
      description: "Triple-glazed curtain wall panel",
      weight: 1.8,
      scheduledDateTime: "2026-02-03T08:30:00",
      from: { x: 45, y: 0, z: 0 },
      to: { x: 58, y: 25, z: 18 },
      shape: "Flat",
      priority: "normal",
      status: "NOTSTARTED",
    }),
    createLift({
      equipmentId: "TC2",
      subcontractor: "Sir Robert McAlpine",
      name: "Precast Parapet",
      description: "Precast concrete parapet section",
      weight: 3.5,
      scheduledDateTime: "2026-02-03T11:00:00",
      from: { x: 40, y: 0, z: 0 },
      to: { x: 55, y: 30, z: 22 },
      shape: "Box",
      priority: "normal",
      status: "NOTSTARTED",
    }),

    // ═══════════════════════════════════════════════════════════
    // FORKLIFT - Ground level material handling (lighter loads)
    // ═══════════════════════════════════════════════════════════
    
    // Feb 1, 2026 - Forklift
    createLift({
      equipmentId: "FORKLIFT",
      subcontractor: "BAM Nuttall",
      name: "Brick Pallet A1",
      description: "Standard brick pallet for masonry",
      weight: 1.2,
      scheduledDateTime: "2026-02-01T07:30:00",
      from: { x: 0, y: 0, z: 0 },
      to: { x: 15, y: 0, z: 2 },
      shape: "Box",
      priority: "normal",
      status: "FINISHED",
    }),
    createLift({
      equipmentId: "FORKLIFT",
      subcontractor: "Laing O'Rourke",
      name: "Insulation Bundles",
      description: "Thermal insulation material packs",
      weight: 0.8,
      scheduledDateTime: "2026-02-01T09:00:00",
      from: { x: 5, y: 0, z: 0 },
      to: { x: 20, y: 0, z: 2 },
      shape: "Box",
      priority: "low",
      status: "FINISHED",
    }),
    createLift({
      equipmentId: "FORKLIFT",
      subcontractor: "Skanska UK",
      name: "Scaffold Frames",
      description: "Scaffolding frame components",
      weight: 1.5,
      scheduledDateTime: "2026-02-01T11:30:00",
      from: { x: 10, y: 0, z: 0 },
      to: { x: 25, y: 0, z: 2 },
      shape: "Irregular",
      priority: "normal",
      status: "FINISHED",
    }),
    
    // Feb 2, 2026 - Forklift
    createLift({
      equipmentId: "FORKLIFT",
      subcontractor: "Morgan Sindall",
      name: "Block Pallet B2",
      description: "Concrete block pallet for partitions",
      weight: 1.4,
      scheduledDateTime: "2026-02-02T08:00:00",
      from: { x: 0, y: 0, z: 0 },
      to: { x: 18, y: 0, z: 2 },
      shape: "Box",
      priority: "normal",
      status: "FINISHED",
    }),
    createLift({
      equipmentId: "FORKLIFT",
      subcontractor: "Wates Group",
      name: "Plasterboard Stack",
      description: "Plasterboard sheets for internal walls",
      weight: 0.9,
      scheduledDateTime: "2026-02-02T10:30:00",
      from: { x: 8, y: 0, z: 0 },
      to: { x: 22, y: 0, z: 2 },
      shape: "Flat",
      priority: "low",
      status: "STARTED",
    }),
    
    // Feb 3, 2026 (Today) - Forklift
    createLift({
      equipmentId: "FORKLIFT",
      subcontractor: "ISG Ltd",
      name: "Timber Battens",
      description: "Timber batten packs for cladding",
      weight: 0.6,
      scheduledDateTime: "2026-02-03T07:30:00",
      from: { x: 0, y: 0, z: 0 },
      to: { x: 12, y: 0, z: 2 },
      shape: "Cylinder",
      priority: "low",
      status: "NOTSTARTED",
    }),
    createLift({
      equipmentId: "FORKLIFT",
      subcontractor: "Willmott Dixon",
      name: "Brick Pallet C3",
      description: "Engineering bricks for external walls",
      weight: 1.3,
      scheduledDateTime: "2026-02-03T09:30:00",
      from: { x: 5, y: 0, z: 0 },
      to: { x: 16, y: 0, z: 2 },
      shape: "Box",
      priority: "normal",
      status: "NOTSTARTED",
    }),
    createLift({
      equipmentId: "FORKLIFT",
      subcontractor: "Galliford Try",
      name: "Cement Bags",
      description: "Bagged cement for site mixing",
      weight: 1.0,
      scheduledDateTime: "2026-02-03T11:30:00",
      from: { x: 2, y: 0, z: 0 },
      to: { x: 10, y: 0, z: 2 },
      shape: "Box",
      priority: "normal",
      status: "NOTSTARTED",
    }),
    createLift({
      equipmentId: "FORKLIFT",
      subcontractor: "KIER GROUP",
      name: "Steel Fixings Crate",
      description: "Miscellaneous steel fixings and brackets",
      weight: 0.7,
      scheduledDateTime: "2026-02-03T14:00:00",
      from: { x: 0, y: 0, z: 0 },
      to: { x: 8, y: 0, z: 2 },
      shape: "Box",
      priority: "low",
      status: "NOTSTARTED",
    }),
  ];

  // Set up dependencies within each equipment group
  const equipmentGroups = {};

  lifts.forEach((lift) => {
    if (!equipmentGroups[lift.equipmentId]) {
      equipmentGroups[lift.equipmentId] = [];
    }

    equipmentGroups[lift.equipmentId].push(lift);
  });

  // Create sequential dependencies within each equipment group
  Object.values(equipmentGroups).forEach((group) => {
    for (let i = 1; i < group.length; i++) {
      group[i].predecessors = [group[i - 1].pID];

      group[i - 1].successors = [group[i].pID];

      group[i].pDepend = `${i}FS`;
    }
  });

  return lifts;
}

// ─────────────────────────────────────────────────────────────
// LIFT FILTERING UTILITIES
// ─────────────────────────────────────────────────────────────

/**
 * Get all unique dates from lifts (for date filter dropdown)
 * @param {Array} lifts - Array of lift objects
 * @returns {Array} Array of date strings (YYYY-MM-DD format)
 */
export function getUniqueLiftDates(lifts) {
  const dates = new Set();

  lifts.forEach((lift) => {
    if (lift.pStart) {
      const dateStr = new Date(lift.pStart).toISOString().split("T")[0];

      dates.add(dateStr);
    }
  });

  return Array.from(dates).sort();
}

/**
 * Filter lifts by equipment ID
 * @param {Array} lifts - Array of lift objects
 * @param {string} equipmentId - Equipment ID to filter by (e.g., "TC1", "TC2", "FORKLIFT")
 * @returns {Array} Filtered lifts
 */
export function filterLiftsByEquipment(lifts, equipmentId) {
  if (!equipmentId || equipmentId === "ALL") return lifts;

  return lifts.filter((lift) => lift.equipmentId === equipmentId);
}

/**
 * Filter lifts by date (YYYY-MM-DD string)
 * @param {Array} lifts - Array of lift objects
 * @param {string} dateStr - Date string in YYYY-MM-DD format, or "ALL" for all dates
 * @returns {Array} Filtered lifts
 */
export function filterLiftsByDate(lifts, dateStr) {
  if (!dateStr || dateStr === "ALL") return lifts;

  return lifts.filter((lift) => {
    if (!lift.pStart) return false;

    const liftDate = new Date(lift.pStart).toISOString().split("T")[0];

    return liftDate === dateStr;
  });
}

/**
 * Get today's date string in YYYY-MM-DD format
 * @returns {string} Today's date
 */
export function getTodayDateStr() {
  return new Date().toISOString().split("T")[0];
}

/**
 * Filter lifts for today only
 * @param {Array} lifts - Array of lift objects
 * @returns {Array} Lifts scheduled for today
 */
export function filterLiftsForToday(lifts) {
  return filterLiftsByDate(lifts, getTodayDateStr());
}

/**
 * Combined filter: by equipment and date
 * @param {Array} lifts - Array of lift objects
 * @param {string} equipmentId - Equipment ID or "ALL"
 * @param {string} dateStr - Date string or "ALL"
 * @returns {Array} Filtered lifts
 */
export function filterLifts(lifts, equipmentId, dateStr) {
  let filtered = lifts;

  filtered = filterLiftsByEquipment(filtered, equipmentId);

  filtered = filterLiftsByDate(filtered, dateStr);

  return filtered;
}

/**
 * Format date string for display (e.g., "Feb 3, 2026")
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {string} Formatted date string
 */
export function formatDateForDisplay(dateStr) {
  if (!dateStr || dateStr === "ALL") return "All Dates";

  const date = new Date(dateStr + "T00:00:00");

  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─────────────────────────────────────────────────────────────
// ACTIVE SCHEDULE MANAGEMENT
// ─────────────────────────────────────────────────────────────

/**
 * Set the active equipment ID in the store
 * @param {Object} store - The store object
 * @param {string} equipmentId - Equipment ID ("ALL", "TC1", "TC2", "FORKLIFT")
 */
export function setActiveEquipment(store, equipmentId) {
  store.ui.activeEquipmentId = equipmentId;

  store.meta.updatedAt = nowISO();

  return store;
}

/**
 * Set the active date filter in the store
 * @param {Object} store - The store object
 * @param {string} dateStr - Date string ("ALL" or YYYY-MM-DD)
 */
export function setActiveDateFilter(store, dateStr) {
  store.ui.activeDateFilter = dateStr;

  store.meta.updatedAt = nowISO();

  return store;
}

/**
 * Get the active equipment ID from the store
 * @param {Object} store - The store object
 * @returns {string} Active equipment ID
 */
export function getActiveEquipment(store) {
  return store.ui?.activeEquipmentId || "ALL";
}

/**
 * Get the active date filter from the store
 * @param {Object} store - The store object
 * @returns {string} Active date filter
 */
export function getActiveDateFilter(store) {
  return store.ui?.activeDateFilter || "ALL";
}

/**
 * Get lifts filtered by the active equipment and date
 * @param {Object} store - The store object
 * @returns {Array} Filtered lifts based on active filters
 */
export function getActiveLifts(store) {
  const equipmentId = getActiveEquipment(store);

  const dateStr = getActiveDateFilter(store);

  return filterLifts(store.lifts, equipmentId, dateStr);
}

/**
 * Add a lift to the active equipment schedule
 * If equipmentId is not specified, uses the active equipment (unless it's "ALL", then defaults to "TC1")
 * @param {Object} store - The store object
 * @param {Object} liftData - Lift data
 * @returns {Object} The created lift
 */
export function addLiftToActiveSchedule(store, liftData) {
  let equipmentId = liftData.equipmentId;

  // If no equipment specified, use active equipment (or default to TC1 if "ALL")
  if (!equipmentId) {
    equipmentId = getActiveEquipment(store);

    if (equipmentId === "ALL") {
      equipmentId = "TC1"; // Default to TC1 when adding to "ALL" view
    }
  }

  const lift = createLift({
    ...liftData,
    equipmentId,
  });

  addLift(store, lift);

  return lift;
}

// ─────────────────────────────────────────────────────────────
// STORE SCHEMA
// ─────────────────────────────────────────────────────────────

/**
 * Creates an empty store with default structure
 */
export function createEmptyStore() {
  return {
    meta: {
      version: "1.0.0",
      createdAt: nowISO(),
      updatedAt: nowISO(),
    },
    project: {
      name: "Lifting Schedule",
      description: "",
      location: "London, UK",
    },
    crane: {
      ...DEFAULT_CRANE_CONFIG,
    },
    workingParams: {
      ...DEFAULT_WORKING_PARAMS,
    },
    ui: {
      selectedLiftId: null,
      activeEquipmentId: "ALL", // Active equipment filter (ALL, TC1, TC2, FORKLIFT)
      activeDateFilter: "ALL", // Active date filter (YYYY-MM-DD or "ALL")
    },
    lifts: [],
    weather: DEFAULT_WEATHER, // Populated from external API; defaults for demo UX
  };
}

/**
 * Migrates/validates store structure
 */
export function migrateStore(maybeStore) {
  if (!maybeStore || typeof maybeStore !== "object") {
    return createEmptyStore();
  }

  const def = createEmptyStore();

  return {
    meta: {
      ...def.meta,
      ...(maybeStore.meta || {}),
      updatedAt: nowISO(),
    },
    project: {
      ...def.project,
      ...(maybeStore.project || {}),
    },
    crane: {
      ...def.crane,
      ...(maybeStore.crane || {}),
    },
    workingParams: {
      ...def.workingParams,
      ...(maybeStore.workingParams || {}),
    },
    ui: {
      ...def.ui,
      ...(maybeStore.ui || {}),
    },
    lifts: Array.isArray(maybeStore.lifts) ? maybeStore.lifts : [],
    weather: maybeStore.weather || null,
  };
}

// ─────────────────────────────────────────────────────────────
// STORAGE OPERATIONS
// ─────────────────────────────────────────────────────────────

// In-memory store for testing mode
let _testingStore = null;

/**
 * Load store from localStorage (or memory if TESTING)
 */
export function loadStore() {
  // Testing mode: always return fresh defaults or in-memory store
  if (TESTING) {
    if (!_testingStore) {
      _testingStore = createEmptyStore();

      _testingStore.lifts = createDefaultLifts();
    }

    return _testingStore;
  }

  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    // Initialize with default lifts on first load
    const store = createEmptyStore();

    store.lifts = createDefaultLifts();

    return store;
  }

  const parsed = safeJsonParse(raw);

  return migrateStore(parsed);
}

/**
 * Save store to localStorage (or memory if TESTING)
 */
export function saveStore(store) {
  const next = migrateStore(store);

  // Testing mode: only save to memory
  if (TESTING) {
    _testingStore = next;

    return next;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(next, null, 2));

  return next;
}

/**
 * Clear store from localStorage (or memory if TESTING)
 */
export function clearStore() {
  // Testing mode: reset to fresh defaults
  if (TESTING) {
    _testingStore = createEmptyStore();

    _testingStore.lifts = createDefaultLifts();

    return _testingStore;
  }

  localStorage.removeItem(STORAGE_KEY);

  return createEmptyStore();
}

// ─────────────────────────────────────────────────────────────
// LIFT CRUD OPERATIONS
// ─────────────────────────────────────────────────────────────

/**
 * Get a lift by ID (uses pID for task compatibility)
 */
export function getLift(store, liftId) {
  return store.lifts.find((l) => l.pID === liftId) || null;
}

/**
 * Add a new lift to the store
 */
export function addLift(store, lift) {
  store.lifts.push(lift);

  store.ui.selectedLiftId = lift.pID;

  store.meta.updatedAt = nowISO();

  return lift;
}

/**
 * Update an existing lift
 */
export function updateLift(store, liftId, patch) {
  const lift = getLift(store, liftId);

  if (!lift) return false;
  
  Object.assign(lift, patch, { updatedAt: nowISO() });

  store.meta.updatedAt = nowISO();

  return true;
}

/**
 * Remove a lift from the store
 */
export function removeLift(store, liftId) {
  const index = store.lifts.findIndex((l) => l.pID === liftId);

  if (index === -1) return false;
  
  store.lifts.splice(index, 1);
  
  // Clear selection if removed lift was selected
  if (store.ui.selectedLiftId === liftId) {
    store.ui.selectedLiftId = store.lifts[0]?.pID || null;
  }
  
  store.meta.updatedAt = nowISO();

  return true;
}

/**
 * Select a lift
 */
export function selectLift(store, liftId) {
  const lift = getLift(store, liftId);

  if (!lift) return false;

  store.ui.selectedLiftId = liftId;

  return true;
}

// ─────────────────────────────────────────────────────────────
// CRANE & WORKING PARAMS OPERATIONS
// ─────────────────────────────────────────────────────────────

/**
 * Update crane configuration
 */
export function updateCraneConfig(store, patch) {
  Object.assign(store.crane, patch);

  store.meta.updatedAt = nowISO();

  return store.crane;
}

/**
 * Update working parameters
 */
export function updateWorkingParams(store, patch) {
  Object.assign(store.workingParams, patch);

  store.meta.updatedAt = nowISO();

  return store.workingParams;
}

/**
 * Update weather data
 */
export function updateWeather(store, weather) {
  store.weather = weather;

  store.meta.updatedAt = nowISO();

  return store.weather;
}

/**
 * Update project location
 */
export function updateProjectLocation(store, location) {
  store.project.location = location;

  store.meta.updatedAt = nowISO();

  return store.project;
}

// ─────────────────────────────────────────────────────────────
// IMPORT/EXPORT
// ─────────────────────────────────────────────────────────────

/**
 * Export store as JSON string
 */
export function exportStoreJson(store) {
  return JSON.stringify(migrateStore(store), null, 2);
}

/**
 * Import store from JSON string
 */
export function importStoreJson(text) {
  const parsed = safeJsonParse(text);

  if (!parsed) return null;

  return migrateStore(parsed);
}

// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────

export {
  STORAGE_KEY,
  uid,
  nowISO,
  safeJsonParse,
};
