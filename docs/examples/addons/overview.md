# Addons Example Overview

The Addons example demonstrates a full-featured application with custom addon modules, including construction management and issue tracking. Viewport navigation (toolbar, fly/drive modes, touch joysticks, and on-screen controls) is provided by the core **`world.navigation`** module (`src/modules/navigation/`), not by an addon.

**Location:** `examples/Addons/`

## What It Includes

- **Hard Hat Addon** — Construction lifting schedules, crane visualization, weather monitoring
- **Issue Tracker Addon** — BCF-style issue management with markup tools
- **PDF Markup Addon** — Annotation tools for PDF documents
- **Demo Data** — Sample data, learning paths, and Python scripts

## Running the Example

```bash
npm run build
npm run serve
# Open http://localhost:3000/examples/Addons/
```

## File Structure

```
examples/Addons/
├── index.html              # Entry point
├── app.js                  # Application with addon loading
├── sw.js                   # Service worker
├── configuration/          # App configuration
│   └── (same as HelloWorld)
├── addons/                 # Addon modules
│   ├── index.js            # Addon exports
│   ├── hard-hat/           # Construction management
│   │   ├── module.js
│   │   ├── operators.js
│   │   ├── ui.js
│   │   ├── core.js
│   │   └── utils.js
│   ├── issue-tracker/      # Issue management
│   │   ├── module.js
│   │   ├── operators.js
│   │   └── ui.js
│   └── pdf-markup/         # PDF annotations
│       ├── module.js
│       └── ...
└── data/                   # Demo data
    ├── demo.config.js
    ├── demos/
    │   ├── BIM/            # BIM Python scripts
    │   └── Python/         # Python tutorials
    └── COURSE_CURRICULUM.md
```

## How Addons Work

### 1. Module Definition

Each addon exports a module definition:

```javascript
// addons/hard-hat/module.js
import HardHatOperators from './operators.js';
import HardHatUI from './ui.js';

export default {
    id: 'addon.hardhat',
    name: 'Hard Hat Addon',
    description: 'Construction site lifting schedule management',
    version: '2.0.0',
    dependsOn: [],
    operators: HardHatOperators,
    ui: HardHatUI
};
```

### 2. Addon Export

All addons are exported from a single index:

```javascript
// addons/index.js
import HardHatModule from './hard-hat/module.js';
import IssueTrackerModule from './issue-tracker/module.js';

export const ADDONS = [
    { module: HardHatModule, active: true },
    { module: IssueTrackerModule, active: true }
];
```

### 3. Registration

Addons are registered in app.js:

```javascript
// app.js
import { ADDONS } from "./addons/index.js";

// Pre-register signals used by addons
const addonSignals = [
    "hardHatEnabled",
    "hardHatStoreChanged",
    "weatherChanged",
    "issueTrackerStoreChanged",
    // ...
];

simulation.createUI({ 
    config: AECOConfiguration, 
    container: document.body,
    addons: { 
        ADDONS, 
        Listeners: addonSignals 
    }
});
```

## Hard Hat Addon

Construction site management with crane operations:

**Features:**
- Tower crane visualization
- Lifting schedule management
- Weather monitoring integration
- Equipment tracking (cranes, forklifts)
- Gantt and spreadsheet views

**Key Files:**
- `module.js` — Module definition
- `operators.js` — Business logic operations
- `ui.js` — Panel components
- `core.js` — Data persistence (loadStore/saveStore)
- `utils.js` — Grid configurations, calculations

**Operators:**
```javascript
class EnableHardHat extends Operator {
    static operatorName = "hardhat.enable";
    
    async execute() {
        // Load saved data
        const store = Core.loadStore();
        
        // Create crane visualization
        const crane = tools.world.model.createTowerCrane(config);
        
        // Fetch weather data
        const weather = await getWeather(location);
        
        // Dispatch signals
        this.context.signals.hardHatEnabled.dispatch({ store });
    }
}
```

## Issue Tracker Addon

BCF-style issue management:

**Features:**
- Issue creation and tracking
- PDF and SVG markup support
- Multiple documents per issue
- Layer-based organization

**Signals:**
- `issueTrackerStoreChanged`
- `issueCreated`
- `issueUpdated`
- `issueDeleted`

## Core navigation (`world.navigation`)

Touch-friendly viewport controls (virtual move/look sticks, on-screen key clusters, navigation settings) live in the core navigation module, not in this example’s addon folder.

**Location:** `src/modules/navigation/` (`module.js`, `operators.js`, `ui.js`).

**Operators** use the `navigation.*` namespace (for example `navigation.toggle_fly_mode`, `navigation.configure_fly`, `navigation.enable_mobile_joystick`, `navigation.open_map_link`).

Ensure **`world.navigation`** is active in your app’s core module list (see `examples/Addons/configuration/config.modules.js`).

## Addon Architecture Pattern

```
┌─────────────────────────────────────────────────────────┐
│                       app.js                             │
│  • Pre-registers signals                                 │
│  • Passes ADDONS to createUI()                          │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   Module Registry                        │
│  • Validates module dependencies                         │
│  • Registers addon operators                             │
│  • Instantiates UI classes                              │
└───────────────────────────┬─────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   Operators     │ │       UI        │ │      Core       │
│                 │ │                 │ │                 │
│ • Commands      │ │ • Panels        │ │ • Data store    │
│ • Execute()     │ │ • Signal listen │ │ • Persistence   │
│ • Undo()        │ │ • User input    │ │ • Transforms    │
└─────────────────┘ └─────────────────┘ └─────────────────┘
          │                 ▲
          │  dispatch       │ listen
          │  signals        │ to signals
          └─────────────────┘
```

## Demo Data

The `data/` folder contains demonstration content:

### BIM Scripts (`data/demos/BIM/`)
Python scripts for IFC operations:
- Ex1: Open IFC file
- Ex5: Count storeys
- Ex6: Get properties, calculate costs
- Ex7: Create walls
- Ex8: Get similar elements

### Python Tutorials (`data/demos/Python/`)
Educational Python scripts:
- Location-based operations
- Budget calculations
- Building metadata queries

### Configuration (`data/demo.config.js`)
Sample application state with:
- 3D Tiles URLs (NASA, NY Times, Cesium samples)
- Game state for learning paths
- Terrain and environment settings

## Creating Your Own Addon

Based on patterns from this example:

1. **Create folder structure:**
```
addons/my-addon/
├── module.js
├── operators.js
└── ui.js
```

2. **Define module:**
```javascript
// module.js
export default {
    id: 'addon.myaddon',
    name: 'My Addon',
    description: 'Description',
    version: '1.0.0',
    dependsOn: [],
    operators: [],
    ui: MyUI
};
```

3. **Export from index:**
```javascript
// addons/index.js
import MyAddonModule from './my-addon/module.js';
export const ADDONS = [
    // ... existing
    { module: MyAddonModule, active: true }
];
```

4. **Register signals in app.js:**
```javascript
const addonSignals = [
    // ... existing signals
    "myAddonSignal"
];
```

## Related Documentation

- [First Addon Tutorial](../../getting-started/first-addon.md)
- [Writing Operators](../../guides/writing-operators.md)
- [Building UI](../../guides/building-ui.md)
- [HelloWorld Example](../helloworld/overview.md)
