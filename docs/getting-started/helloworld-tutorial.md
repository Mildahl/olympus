# HelloWorld Tutorial

This tutorial walks you through the HelloWorld example step-by-step, explaining how the application initializes and renders a 3D scene.

## File Structure

```
examples/HelloWorld/
├── index.html              # Entry point - loads dependencies and app
├── app.js                  # Application initialization
├── sw.js                   # Service worker for offline caching
├── favicon.ico             # Browser icon
└── configuration/
    ├── config.js           # Main configuration (assembles all configs)
    ├── config.modules.js   # Active/inactive modules
    ├── config.shortcuts.js # Keyboard shortcuts
    ├── config.navigation.js# Navigation mode settings
    ├── config.scene.js     # Scene setup (background, lighting)
    └── config.ui.js        # UI layout and components
```

## Step 1: The HTML Entry Point

**index.html** sets up ES module imports and loads the application:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <title>AECO-dev</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, user-scalable=no">
    
    <!-- Styles -->
    <link rel="stylesheet" href="./../../external/styles/master.css">
    
    <!-- Signals library (event system) -->
    <script src="./../../external/vendor/editor_deps/signals.min.js"></script>
</head>
<body>
    <!-- Import map defines module resolution -->
    <script type="importmap">
    {
        "imports": {
            "aeco": "./../../dist/index.js",
            "three": "./../../external/vendor/three/build/three.module.js",
            "three/addons/": "./../../external/vendor/three/examples/jsm/"
        }
    }
    </script>
    
    <!-- Load the application -->
    <script type="module" src="./app.js"></script>
</body>
</html>
```

Key points:
- **Import map**: Maps `"aeco"` to the built library, `"three"` to Three.js
- **Signals**: Required for the event/messaging system
- **master.css**: Base styles for the UI

## Step 2: Application Initialization

**app.js** is where your application starts:

```javascript
import { DrawUI } from "./../../drawUI/index.js";

// Show splash screen while loading
const splash = DrawUI.splash({ 
    imageUrl: '/external/ifc/splash.png', 
    text: 'Initializing...' 
});
splash.show(document.body);
splash.setText('Creating UI...');

// Import AECO core
import { AECO } from "aeco";

// Import your configuration
import { AECOConfiguration } from "./configuration/config.js";

// Create the simulation instance
const simulation = new AECO();

// Access the context (state container)
const context = simulation.context;

// Create the UI with your configuration
simulation.createUI({ 
    config: AECOConfiguration, 
    container: document.body 
});

// Log active modules (useful for debugging)
simulation.moduleRegistry.logActiveModulesAndUI();

// Hide splash when ready
splash.hide();

// Add a simple test cube to the scene
simulation.tools.world.scene.addCube(context, 1, "grey");

export default simulation;
```

### What happens during initialization:

1. **Splash screen** shows loading progress
2. **AECO instance** creates the core engine
3. **createUI()** builds the interface from configuration
4. **Module registry** activates configured modules
5. **Scene tools** are available for adding 3D content

## Step 3: Main Configuration

**configuration/config.js** assembles all configuration parts:

```javascript
import { coreModules } from "./config.modules.js";
import { Shortcuts } from "./config.shortcuts.js";
import { SceneConfig } from "./config.scene.js";
import { NavigationConfig } from "./config.navigation.js";
import { WorldComponent } from "./config.ui.js";

const ApplicationConfig = {
    Name: "AECO Simulation",
    Version: "1.0.0",
    History: true,                    // Enable undo/redo
    CoreModules: coreModules,         // Which modules to load
    Scene: SceneConfig,               // Scene settings
    Shortcuts: Shortcuts,             // Keyboard bindings
    Settings: {
        save: true,
        persistSettings: false,
        devMode: false,
        pyodideBaseUrl: "/external/vendor/pyodide/v0.29.0/full",
        monacoBaseUrl: "/external/vendor/monaco-editor/0.52.2",
        vendorBaseUrl: "/external/vendor",
        dataBaseUrl: "/external/data",
    },
    Navigation: NavigationConfig,
};

const UIConfig = {
    WorldComponent: WorldComponent,   // UI layout definition
    theme: {
        default: "night",             // Default theme
        colors: { /* theme colors */ }
    }
};

export const AECOConfiguration = {
    app: ApplicationConfig,
    ui: UIConfig
};
```

## Step 4: Configure Modules

**configuration/config.modules.js** controls which features are active:

```javascript
export const coreModules = [
    { id: "configurator", active: true },
    { id: "theme", active: true },
    { id: "world", active: true },
    { id: "world.notification", active: true },
    { id: "world.layer", active: true },
    { id: "world.spatial", active: true },
    { id: "world.viewpoints", active: true },
    { id: "world.animationPath", active: true },
    { id: "world.snap", active: true },
    { id: "world.measure", active: true },
    { id: "world.sectionbox", active: false },  // Disabled
    { id: "world.history", active: true },
    { id: "world.navigation", active: true },
    { id: "settings", active: true },
    // BIM modules (optional)
    { id: "bim.project", active: false },
    { id: "bim.model", active: false },
    // Code modules (optional)
    { id: "code.scripting", active: false },
    { id: "code.terminal", active: false },
];
```

Set `active: false` to disable modules you don't need.

## Step 5: Customize the Scene

**configuration/config.scene.js** defines the 3D environment:

```javascript
export const SceneConfig = {
    background: {
        type: "color",        // "color" | "gradient" | "skybox"
        color: "#1a1a2e"
    },
    fog: {
        enabled: false,
        color: "#1a1a2e",
        near: 10,
        far: 100
    },
    grid: {
        enabled: true,
        size: 20,
        divisions: 20
    },
    axes: {
        enabled: true
    }
};
```

## Step 6: Configure Keyboard Shortcuts

**configuration/config.shortcuts.js** maps keys to operators:

```javascript
export const Shortcuts = {
    "shortcuts/undo": "ctrl+z",
    "shortcuts/redo": "ctrl+shift+z",
    "shortcuts/transform/translate": "w",
    "shortcuts/transform/rotate": "e",
    "shortcuts/transform/scale": "r",
    "shortcuts/navigation/orbit": "shift+o",
    "shortcuts/navigation/fly": "shift+f",
    "shortcuts/viewpoint/front": "numpad1",
    "shortcuts/viewpoint/right": "numpad3",
    "shortcuts/viewpoint/top": "numpad7",
};
```

## Running the Example

1. Make sure you've built the project: `npm run build`
2. Start the server: `npm run serve`
3. Open `http://localhost:3000/examples/HelloWorld/`

You should see:
- A 3D viewport with a grey cube
- Navigation controls
- Left/right panels (collapsible)
- A toolbar

## Customization Ideas

### Change the cube color
```javascript
// In app.js, change:
simulation.tools.world.scene.addCube(context, 1, "grey");
// To:
simulation.tools.world.scene.addCube(context, 2, "#ff6600");
```

### Add multiple objects
```javascript
simulation.tools.world.scene.addCube(context, 1, "red");
simulation.tools.world.scene.addSphere(context, 0.5, "blue");
```

### Load an IFC file
```javascript
simulation.ops.execute("bim.load_model", context, {
    url: "/external/ifc/demo.ifc"
});
```

## Next Steps

- [Project Structure](project-structure.md) — Understand the full codebase
- [First Addon](first-addon.md) — Create your own module
- [Configuration Guide](../guides/configuration.md) — Deep dive into config options
