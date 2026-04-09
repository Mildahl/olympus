# Project Structure

This document explains the Olympus/AECO project layout and key directories.

## Root Directory

```
Olympus/
├── src/                    # Source code (the library)
├── drawUI/                 # UI component library
├── external/               # Sample data, IFC files, and application stylesheets
├── examples/               # Example applications (and `examples/vendor/` from postinstall)
├── docs/                   # Documentation
├── scripts/                # Vendor sync for examples (`sync-examples-vendor.js`)
├── dist/                   # Built output (generated)
├── package.json            # Dependencies and scripts
├── webpack.config.js       # Main build configuration
└── webpack.worker.config.js # Worker build configuration
```

## Source Code (`src/`)

The core library is organized into layers:

```
src/
├── index.js                # Library entry: AECO class and public exports
├── index.d.ts              # TypeScript definitions
│
├── core/                   # Core APIs (namespaced functions)
│   ├── index.js            # Exports all namespaces
│   ├── world.js            # World management
│   ├── viewpoint.js        # Camera viewpoints
│   ├── layer.js            # Layer system
│   ├── measure.js          # Measurement tools
│   ├── sectionBox.js       # Section box controls
│   ├── navigation.js       # Navigation modes
│   ├── spatial.js          # Spatial queries
│   ├── theme.js            # Theme/colors
│   ├── bim.js              # BIM document operations
│   ├── scripting.js        # Script execution
│   └── terminal.js         # Terminal interface
│
├── operators/              # Command pattern implementation
│   ├── Operator.js         # Base Operator class
│   └── Operators.js        # Operator registry
│
├── modules/                # Feature modules
│   ├── index.js            # Module exports
│   ├── ModuleRegistry.js   # Module registration system
│   └── {module-name}/      # Individual modules
│       ├── module.js       # Module definition
│       ├── operators.js    # Module operators
│       └── ui.js           # Module UI
│
├── ui/                     # User interface layer
│   ├── Components/         # UI component wrappers
│   │   └── Components.js   # UIComponents factory
│   ├── utils/
│   │   └── LayoutManager.js # Panel/tab layout system
│   └── sidebar/            # Sidebar panels
│
├── tool/                   # Low-level tools
│   ├── world/              # 3D scene tools
│   ├── bim/                # BIM processing tools
│   └── code/               # Code execution tools
│
├── data/                   # Data management
│   ├── storage.js          # Persistence layer
│   └── history.js          # Undo/redo history
│
├── context/                # Application context
│   └── index.js            # Context class (state container)
│
├── configuration/          # Default configurations
│   ├── config.js           # Base config
│   ├── config.modules.js   # Module defaults
│   └── config.presets.js   # Configuration presets
│
├── types/                  # Type definitions
└── utils/                  # Utility functions
```

## UI Components (`drawUI/`)

The DrawUI library provides low-level UI primitives:

```
drawUI/
├── index.js                # DrawUI entry point
├── ui.js                   # Base UI elements (div, row, button, etc.)
├── BasePanel.js            # Base panel class
├── CollapsiblePanel.js     # Collapsible sections
├── FloatingPanel.js        # Draggable floating panels
├── TabPanel.js             # Tabbed content panels
├── ReorderableList.js      # Drag-to-reorder lists
└── utils/
    ├── markdownEnhancements.js
    ├── panelResizer.js
    └── quizEnhancer.js
```

## External Dependencies (`external/`)

Third-party libraries and assets:

```
external/
├── vendor/                 # JavaScript libraries
│   ├── three/              # Three.js (3D rendering)
│   ├── monaco-editor/      # Monaco code editor
│   ├── pyodide/            # Python runtime
│   ├── codemirror/         # Alternative code editor
│   ├── handsontable/       # Spreadsheet component
│   ├── jsgantt/            # Gantt chart
│   └── ...
│
├── styles/                 # CSS stylesheets
│   ├── master.css          # Main stylesheet
│   ├── responsive.css      # Responsive breakpoints
│   └── components/         # Component-specific styles
│
├── ifc/                    # Sample IFC files
│   ├── demo.ifc
│   └── ...
│
├── data/                   # Sample data files
│   ├── resources/
│   └── tasks/
│
└── pytools/                # Python utilities
    ├── ifc_author.py
    └── ...
```

## Examples (`examples/`)

Working example applications:

```
examples/
├── HelloWorld/             # Minimal starter
│   ├── index.html
│   ├── app.js
│   └── configuration/
│
└── Addons/                 # Full-featured demo
    ├── index.html
    ├── app.js
    ├── configuration/
    ├── addons/             # Custom addon modules
    │   ├── index.js        # Addon exports
    │   ├── hard-hat/
    │   ├── issue-tracker/
    │   └── navigation/
    └── data/               # Demo data
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      Application                         │
│  (examples/HelloWorld/app.js, examples/Addons/app.js)   │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                     AECO Class                           │
│                   (src/index.js)                         │
│  • createUI()  • moduleRegistry  • tools  • ops         │
└─────────────────────────────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│     Modules     │ │    Operators    │ │      Tools      │
│ (src/modules/)  │ │ (src/operators/)│ │   (src/tool/)   │
│                 │ │                 │ │                 │
│ • UI components │ │ • Commands      │ │ • Scene         │
│ • Feature sets  │ │ • Undo/redo     │ │ • BIM           │
│ • Operators     │ │ • History       │ │ • Code          │
└─────────────────┘ └─────────────────┘ └─────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Core APIs                             │
│                   (src/core/)                            │
│  World • Viewpoint • Layer • BIM • Navigation • ...     │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Context                               │
│                 (src/context/)                           │
│  • state  • signals  • editor  • storage                │
└─────────────────────────────────────────────────────────┘
```

## Key Files to Know

| File | Purpose |
|------|---------|
| `src/index.js` | AECO class, context, Core, tools, and named public exports |
| `src/core/index.js` | All Core API namespaces |
| `src/operators/Operator.js` | Base Operator class |
| `src/modules/ModuleRegistry.js` | Module system |
| `src/ui/Components/Components.js` | UIComponents factory |
| `src/ui/utils/LayoutManager.js` | Panel layout system |
| `drawUI/ui.js` | Low-level UI primitives |

## Import Patterns

From your application:

```javascript
// Import the main AECO class
import { AECO } from "aeco";

// Import specific tools
import { Operator, tools, Core } from "aeco";

// Import DrawUI components
import { DrawUI } from "../../drawUI/index.js";
// or
import { UIDiv, UIButton } from "../../drawUI/ui.js";
```

From Three.js (via import map):

```javascript
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
```

## Next Steps

- [First Addon](first-addon.md) — Create a custom module
- [Writing Operators](../guides/writing-operators.md) — Implement commands
- [Building UI](../guides/building-ui.md) — Create UI components
