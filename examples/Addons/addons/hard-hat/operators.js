import { Operator, tools } from "aeco";

import * as THREE from "three";

import * as hardHatStore from "./hardHatStore.js";

const SIGNALS = [
  "hardHatEnabled",
  "hardHatStoreChanged",
  "hardHatLiftAdded",
  "hardHatLiftRemoved",
  "hardHatLiftSelected",
  "hardHatScheduleViewToggled",
  "weatherChanged",
];

async function getWeather(location) {
  const weatherData = {
    "location": {
        "name": "London",
        "region": "City of London, Greater London",
        "country": "United Kingdom",
        "lat": 51.5171,
        "lon": -0.1062,
        "tz_id": "Europe/London",
        "localtime_epoch": 1770039291,
        "localtime": "2026-02-02 13:34"
    },
    "current": {
        "last_updated_epoch": 1770039000,
        "last_updated": "2026-02-02 13:30",
        "temp_c": 9,
        "temp_f": 48.2,
        "is_day": 1,
        "condition": {
            "text": "Partly cloudy",
            "icon": "//cdn.weatherapi.com/weather/64x64/day/116.png",
            "code": 1003
        },
        "wind_mph": 10.5,
        "wind_kph": 16.9,
        "wind_degree": 97,
        "wind_dir": "E",
        "pressure_mb": 996,
        "pressure_in": 29.41,
        "precip_mm": 0.02,
        "precip_in": 0,
        "humidity": 81,
        "cloud": 25,
        "feelslike_c": 6.5,
        "feelslike_f": 43.6,
        "windchill_c": 6.2,
        "windchill_f": 43.1,
        "heatindex_c": 8.8,
        "heatindex_f": 47.8,
        "dewpoint_c": 4.7,
        "dewpoint_f": 40.4,
        "vis_km": 10,
        "vis_miles": 6,
        "uv": 0.7,
        "gust_mph": 13.3,
        "gust_kph": 21.3
    }
  };

  return weatherData;
}

class EnableHardHat extends Operator {
  static operatorName = "hardhat.enable";

  static operatorLabel = "Enable Hard Hat";

  static operatorOptions = ["REGISTER"];

  constructor(context, location) {
    super(context);

    this.context = context;

    this.location = location || "London, UK";

    this.context.addListeners(SIGNALS);
  }

  poll() {
    return true;
  }

  async execute() {
    const store = hardHatStore.loadStore();
    
    if (this.location) {
      hardHatStore.updateProjectLocation(store, this.location);
    }

    hardHatStore.saveStore(store);

    this.context.hardHat = this.context.hardHat || {};

    this.context.hardHat.store = store;

    const craneConfig = store.crane;

    const towerCrane = tools.world.model.createTowerCrane(craneConfig);

    tools.world.scene.addToLayer(towerCrane.object, "Logistics");

    this.context.editor.signals.sceneGraphChanged.dispatch();

    const weather = await getWeather(this.location);

    hardHatStore.updateWeather(store, weather);

    hardHatStore.saveStore(store);

    const weatherPanel = tools.world.scene.attachWeatherToCrane(
      weather,
      { object: towerCrane.object, config: craneConfig }
    );

    this._setupInteraction(weatherPanel);

    this.context.signals.hardHatEnabled.dispatch({ store });

    this.context.signals.hardHatStoreChanged.dispatch({ store });

    this.context.signals.weatherChanged.dispatch({ weather });

    return { status: "FINISHED", store, weatherPanel };
  }

  _setupInteraction(panel) {
    const editor = this.context.editor;

    const camera = editor.camera;

    const domElement = editor.viewport?.dom || this.context.dom;

    const raycaster = new THREE.Raycaster();

    const mouse = new THREE.Vector2();

    const onPointerDown = (event) => {
      const rect = domElement.getBoundingClientRect();

      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;

      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(panel.group.children, true);

      if (intersects.length > 0) {
        panel.toggle();
      }
    };

    domElement.addEventListener("pointerdown", onPointerDown);

    panel.removeInteraction = () => {
      domElement.removeEventListener("pointerdown", onPointerDown);
    };
  }
}

class AddLift extends Operator {
  static operatorName = "hardhat.add_lift";

  static operatorLabel = "Add Lift";

  static operatorOptions = ["REGISTER"];

  constructor(context, liftData = {}) {
    super(context);

    this.context = context;

    this.liftData = liftData;
  }

  poll() {
    return true;
  }

  execute() {
    const store = hardHatStore.loadStore();
    
    // Use addLiftToActiveSchedule which respects the active equipment filter
    const lift = hardHatStore.addLiftToActiveSchedule(store, {
      subcontractor: this.liftData.subcontractor || this.liftData.pRes,
      name: this.liftData.name || this.liftData.pName || "New Lift",
      description: this.liftData.description || this.liftData.pDescription,
      weight: this.liftData.weight ?? this.liftData.pWeight ?? 1.0,
      scheduledDateTime: this.liftData.scheduledDateTime || this.liftData.pStart,
      from: this.liftData.from || this.liftData.pFrom,
      to: this.liftData.to || this.liftData.pTo,
      shape: this.liftData.shape,
      dimensions: this.liftData.dimensions,
      pParent: this.liftData.pParent,
      predecessors: this.liftData.predecessors,
      successors: this.liftData.successors,
      pDepend: this.liftData.pDepend,
      priority: this.liftData.priority,
      equipmentId: this.liftData.equipmentId, // Can override if specified
    });

    hardHatStore.saveStore(store);

    this.context.hardHat = this.context.hardHat || {};

    this.context.hardHat.store = store;

    this.context.signals.hardHatLiftAdded.dispatch({ lift });

    this.context.signals.hardHatStoreChanged.dispatch({ store });

    return { status: "FINISHED", lift };
  }
}

class RemoveLift extends Operator {
  static operatorName = "hardhat.remove_lift";

  static operatorLabel = "Remove Lift";

  static operatorOptions = ["REGISTER"];

  constructor(context, liftId) {
    super(context);

    this.context = context;

    this.liftId = liftId;
  }

  poll() {
    return !!this.liftId;
  }

  execute() {
    const store = hardHatStore.loadStore();
    
    if (!hardHatStore.removeLift(store, this.liftId)) {
      return { status: "CANCELLED", reason: "Lift not found" };
    }

    hardHatStore.saveStore(store);

    this.context.hardHat = this.context.hardHat || {};

    this.context.hardHat.store = store;

    this.context.signals.hardHatLiftRemoved.dispatch({ liftId: this.liftId });

    this.context.signals.hardHatStoreChanged.dispatch({ store });

    return { status: "FINISHED", liftId: this.liftId };
  }
}

class UpdateLift extends Operator {
  static operatorName = "hardhat.update_lift";

  static operatorLabel = "Update Lift";

  static operatorOptions = ["REGISTER"];

  constructor(context, liftId, patch) {
    super(context);

    this.context = context;

    this.liftId = liftId;

    this.patch = patch || {};
  }

  poll() {
    return !!this.liftId;
  }

  execute() {
    const store = hardHatStore.loadStore();
    
    if (!hardHatStore.updateLift(store, this.liftId, this.patch)) {
      return { status: "CANCELLED", reason: "Lift not found" };
    }

    hardHatStore.saveStore(store);

    this.context.hardHat = this.context.hardHat || {};

    this.context.hardHat.store = store;

    this.context.signals.hardHatStoreChanged.dispatch({ store });

    return { status: "FINISHED", liftId: this.liftId, patch: this.patch };
  }
}

class SelectLift extends Operator {
  static operatorName = "hardhat.select_lift";

  static operatorLabel = "Select Lift";

  static operatorOptions = ["REGISTER"];

  constructor(context, liftId) {
    super(context);

    this.context = context;

    this.liftId = liftId;
  }

  poll() {
    return true;
  }

  execute() {
    const store = hardHatStore.loadStore();
    
    if (!hardHatStore.selectLift(store, this.liftId)) {
      return { status: "CANCELLED", reason: "Lift not found" };
    }

    hardHatStore.saveStore(store);

    this.context.hardHat = this.context.hardHat || {};

    this.context.hardHat.store = store;

    this.context.signals.hardHatLiftSelected.dispatch({ liftId: this.liftId });

    this.context.signals.hardHatStoreChanged.dispatch({ store });

    return { status: "FINISHED", liftId: this.liftId };
  }
}

class UpdateCraneSpeed extends Operator {
  static operatorName = "hardhat.update_crane_speed";

  static operatorLabel = "Update Crane Speed";

  static operatorOptions = ["REGISTER"];

  constructor(context, speed) {
    super(context);

    this.context = context;

    this.speed = speed;
  }

  poll() {
    return this.speed > 0;
  }

  execute() {
    const store = hardHatStore.loadStore();

    hardHatStore.updateCraneConfig(store, { speed: this.speed });

    hardHatStore.saveStore(store);

    this.context.hardHat = this.context.hardHat || {};

    this.context.hardHat.store = store;

    this.context.signals.hardHatStoreChanged.dispatch({ store });

    return { status: "FINISHED", speed: this.speed };
  }
}

class UpdateWorkingHours extends Operator {
  static operatorName = "hardhat.update_working_hours";

  static operatorLabel = "Update Working Hours";

  static operatorOptions = ["REGISTER"];

  constructor(context, hours) {
    super(context);

    this.context = context;

    this.hours = hours;
  }

  poll() {
    return this.hours > 0;
  }

  execute() {
    const store = hardHatStore.loadStore();

    hardHatStore.updateWorkingParams(store, { workingHours: this.hours });

    hardHatStore.saveStore(store);

    this.context.hardHat = this.context.hardHat || {};

    this.context.hardHat.store = store;

    this.context.signals.hardHatStoreChanged.dispatch({ store });

    return { status: "FINISHED", hours: this.hours };
  }
}

class ExportLiftingSchedule extends Operator {
  static operatorName = "hardhat.export_schedule";

  static operatorLabel = "Export Lifting Schedule";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;
  }

  execute() {
    const store = hardHatStore.loadStore();

    const json = hardHatStore.exportStoreJson(store);

    const blob = new Blob([json], { type: "application/json" });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;

    a.download = `lifting-schedule-${new Date().toISOString().split('T')[0]}.json`;

    document.body.appendChild(a);

    a.click();

    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    return { status: "FINISHED" };
  }
}

class ImportLiftingSchedule extends Operator {
  static operatorName = "hardhat.import_schedule";

  static operatorLabel = "Import Lifting Schedule";

  static operatorOptions = ["REGISTER"];

  constructor(context, jsonText) {
    super(context);

    this.context = context;

    this.jsonText = jsonText;
  }

  poll() {
    return !!this.jsonText;
  }

  execute() {
    const imported = hardHatStore.importStoreJson(this.jsonText);
    
    if (!imported) {
      return { status: "CANCELLED", reason: "Invalid JSON data" };
    }

    hardHatStore.saveStore(imported);

    this.context.hardHat = this.context.hardHat || {};

    this.context.hardHat.store = imported;

    this.context.signals.hardHatStoreChanged.dispatch({ store: imported });

    return { status: "FINISHED", store: imported };
  }
}

class ClearLiftingSchedule extends Operator {
  static operatorName = "hardhat.clear_schedule";

  static operatorLabel = "Clear Lifting Schedule";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;
  }

  poll() {
    return true;
  }

  execute() {
    const store = hardHatStore.loadStore();

    store.lifts = [];

    store.ui.selectedLiftId = null;

    hardHatStore.saveStore(store);

    this.context.hardHat = this.context.hardHat || {};

    this.context.hardHat.store = store;

    this.context.signals.hardHatStoreChanged.dispatch({ store });

    return { status: "FINISHED" };
  }
}

class EnableAppointedPerson extends EnableHardHat {
  static operatorName = "hardhat.enable_appointed_person";

  static operatorLabel = "Enable Appointed Person";

  static operatorOptions = ["REGISTER"];
}

class ToggleScheduleView extends Operator {
  static operatorName = "hardhat.toggle_schedule_view";

  static operatorLabel = "Toggle Schedule View";

  static operatorOptions = ["REGISTER"];

  constructor(context, viewType = null) {
    super(context);

    this.context = context;

    this.viewType = viewType; // "gantt", "spreadsheet", "hierarchy", or null to toggle visibility
  }

  poll() {
    return true;
  }

  execute() {
    this.context.signals.hardHatScheduleViewToggled.dispatch({ 
      viewType: this.viewType 
    });

    return { status: "FINISHED", viewType: this.viewType };
  }
}

class ExportTaskData extends Operator {
  static operatorName = "hardhat.export_task_data";

  static operatorLabel = "Export as Task Data";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;
  }

  execute() {
    const store = hardHatStore.loadStore();
    
    // Import the conversion function dynamically to avoid circular deps
    import("./utils.js").then(({ enrichLiftsWithEstimates, liftsToTaskFormat }) => {
      const lifts = [...store.lifts];

      const craneSpeed = store.crane?.speed || 2;

      enrichLiftsWithEstimates(lifts, craneSpeed);
      
      const taskData = liftsToTaskFormat(lifts);

      const json = JSON.stringify(taskData, null, 2);
      
      const blob = new Blob([json], { type: "application/json" });

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");

      a.href = url;

      a.download = `lifting-tasks-${new Date().toISOString().split('T')[0]}.json`;

      document.body.appendChild(a);

      a.click();

      a.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });

    return { status: "FINISHED" };
  }
}

class SetActiveEquipment extends Operator {
  static operatorName = "hardhat.set_active_equipment";

  static operatorLabel = "Set Active Equipment";

  static operatorOptions = ["REGISTER"];

  constructor(context, equipmentId) {
    super(context);

    this.context = context;

    this.equipmentId = equipmentId;
  }

  poll() {
    return true;
  }

  execute() {
    const store = hardHatStore.loadStore();

    hardHatStore.setActiveEquipment(store, this.equipmentId);

    hardHatStore.saveStore(store);

    this.context.hardHat = this.context.hardHat || {};

    this.context.hardHat.store = store;

    this.context.signals.hardHatStoreChanged.dispatch({ store });

    return { status: "FINISHED", equipmentId: this.equipmentId };
  }
}

class SetActiveDateFilter extends Operator {
  static operatorName = "hardhat.set_active_date";

  static operatorLabel = "Set Active Date Filter";

  static operatorOptions = ["REGISTER"];

  constructor(context, dateStr) {
    super(context);

    this.context = context;

    this.dateStr = dateStr;
  }

  poll() {
    return true;
  }

  execute() {
    const store = hardHatStore.loadStore();

    hardHatStore.setActiveDateFilter(store, this.dateStr);

    hardHatStore.saveStore(store);

    this.context.hardHat = this.context.hardHat || {};

    this.context.hardHat.store = store;

    this.context.signals.hardHatStoreChanged.dispatch({ store });

    return { status: "FINISHED", dateStr: this.dateStr };
  }
}

export default [
  EnableHardHat,
  EnableAppointedPerson,
  AddLift,
  RemoveLift,
  UpdateLift,
  SelectLift,
  UpdateCraneSpeed,
  UpdateWorkingHours,
  ExportLiftingSchedule,
  ImportLiftingSchedule,
  ClearLiftingSchedule,
  ToggleScheduleView,
  ExportTaskData,
  SetActiveEquipment,
  SetActiveDateFilter,
];
