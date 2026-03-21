# HelloWorld Example Overview

The HelloWorld example is a minimal starter application demonstrating core AECO functionality.

**Location:** `examples/HelloWorld/`

## What It Does

- Shows a 3D viewport with a simple cube
- Demonstrates the configuration system
- Provides navigation controls
- Includes collapsible side panels

## Running the Example

```bash
# From project root
npm run build
npm run serve
# Open http://localhost:3000/examples/HelloWorld/
```

## File Structure

```
examples/HelloWorld/
├── index.html              # Entry point
├── app.js                  # Application initialization
├── sw.js                   # Service worker (offline caching)
├── favicon.ico             # Browser icon
└── configuration/
    ├── config.js           # Main config (assembles all)
    ├── config.modules.js   # Active/inactive modules
    ├── config.shortcuts.js # Keyboard shortcuts
    ├── config.navigation.js# Navigation modes
    ├── config.scene.js     # Scene settings
    └── config.ui.js        # UI layout
```

## Key Files Explained

### index.html

Sets up module imports and loads the application:

```html
<script type="importmap">
{
    "imports": {
        "aeco": "./../../dist/index.js",
        "three": "./../../external/vendor/three/build/three.module.js",
        "three/addons/": "./../../external/vendor/three/examples/jsm/"
    }
}
</script>
<script type="module" src="./app.js"></script>
```

### app.js

Initializes and runs the application:

```javascript
import { AECO } from "aeco";
import { AECOConfiguration } from "./configuration/config.js";

const simulation = new AECO();
const context = simulation.context;

simulation.createUI({
    config: AECOConfiguration,
    container: document.body
});

simulation.tools.world.scene.addCube(context, 1, "grey");
```

### config.js

Main configuration combining all settings:

```javascript
import { coreModules } from "./config.modules.js";
import { Shortcuts } from "./config.shortcuts.js";
import { SceneConfig } from "./config.scene.js";
import { NavigationConfig } from "./config.navigation.js";
import { WorldComponent } from "./config.ui.js";

const ApplicationConfig = {
    Name: "AECO Simulation",
    Version: "1.0.0",
    History: true,
    CoreModules: coreModules,
    Scene: SceneConfig,
    Shortcuts: Shortcuts,
    Settings: {
        pyodideBaseUrl: "/external/vendor/pyodide/v0.29.0/full",
        monacoBaseUrl: "/external/vendor/monaco-editor/0.52.2",
        vendorBaseUrl: "/external/vendor",
        dataBaseUrl: "/external/data",
    },
    Navigation: NavigationConfig,
};

const UIConfig = {
    WorldComponent: WorldComponent,
    theme: {
        default: "night",
        colors: { /* theme definitions */ }
    }
};

export const AECOConfiguration = {
    app: ApplicationConfig,
    ui: UIConfig
};
```

### config.modules.js

Controls which modules are active:

```javascript
export const coreModules = [
    { id: "configurator", active: true },
    { id: "theme", active: true },
    { id: "world", active: true },
    { id: "world.notification", active: true },
    { id: "world.layer", active: true },
    { id: "world.viewpoints", active: true },
    { id: "world.measure", active: true },
    { id: "world.history", active: true },
    { id: "world.navigation", active: true },
    { id: "settings", active: true },
    // Disabled by default
    { id: "world.sectionbox", active: false },
    { id: "bim.project", active: false },
];
```

### config.shortcuts.js

Keyboard shortcut definitions:

```javascript
export const Shortcuts = {
    "shortcuts/undo": "ctrl+z",
    "shortcuts/redo": "ctrl+shift+z",
    "shortcuts/transform/translate": "w",
    "shortcuts/transform/rotate": "e",
    "shortcuts/transform/scale": "r",
    "shortcuts/navigation/orbit": "shift+o",
    "shortcuts/viewpoint/front": "numpad1",
    "shortcuts/viewpoint/right": "numpad3",
    "shortcuts/viewpoint/top": "numpad7",
};
```

## Customization Guide

### Change the Scene Background

In `config.scene.js`:
```javascript
export const SceneConfig = {
    background: {
        type: "color",
        color: "#1a1a2e"  // Change this
    }
};
```

### Enable BIM Features

In `config.modules.js`:
```javascript
{ id: "bim.project", active: true },
{ id: "bim.model", active: true },
```

### Add Keyboard Shortcuts

In `config.shortcuts.js`:
```javascript
"shortcuts/my-action": "ctrl+m",
```

### Add 3D Content

In `app.js`:
```javascript
// Add different objects
simulation.tools.world.scene.addCube(context, 1, "red");
simulation.tools.world.scene.addSphere(context, 0.5, "blue");

// Load an IFC model
simulation.ops.execute("bim.load_model", context, {
    url: "/external/ifc/demo.ifc"
});
```

### Change Default Theme

In `config.js`:
```javascript
const UIConfig = {
    theme: {
        default: "day",  // or "night"
    }
};
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      index.html                          │
│  • Import maps                                           │
│  • Style sheets                                          │
│  • Loads app.js                                          │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                        app.js                            │
│  • Creates AECO instance                                 │
│  • Loads configuration                                   │
│  • Calls createUI()                                      │
│  • Adds test content                                     │
└───────────────────────────┬─────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│     AECOConfiguration   │  │      AECO Engine        │
│  • ApplicationConfig    │  │  • Module registry      │
│  • UIConfig             │  │  • Operators            │
│  • Theme                │  │  • Tools                │
└─────────────────────────┘  │  • Context              │
                             └─────────────────────────┘
```

## Next Steps

- [First Addon](../../getting-started/first-addon.md) — Add custom functionality
- [Addons Example](../addons/overview.md) — See a full-featured example
- [Configuration Guide](../../guides/configuration.md) — Deep dive into config

## Related Files

- [app.js](../../examples/HelloWorld/app.js)
- [config.js](../../examples/HelloWorld/configuration/config.js)
- [config.modules.js](../../examples/HelloWorld/configuration/config.modules.js)
