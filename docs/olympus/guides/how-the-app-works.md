# How the app works

This guide describes the Olympus application architecture: the entrypoint, Core, tools, operators, and UI.

## Entrypoint: `src/index.js`

The application starts from **`src/index.js`**, which exports the **`AECO`** class and the shared **`context`** and **`Core`**.

In tutorials the **`AECO` instance** is often stored in a variable named `simulation`; the following steps use that name.

1. **Constructor:** `new AECO(container)`  
   - Stores `context`, `tools`, `operators` (`ops`), `data`, `core`, `moduleRegistry` on the instance.  
   - Calls `_createEnvironment(context, container)`: creates or reuses the World/Viewport DOM, instantiates the **Editor**, adds lights and orientation gizmo, calls **`Core.Init.storeEditor(context, editor)`**, creates the **Viewport** and **Sidebar**.

2. **Creating the UI:** `simulation.createUI({ config, container, addons })`  
   - Merges `config.ui` with the default `AECOConfiguration.ui` and sets app config (including `CoreModules`) on `context`.  
   - Sets addons config on `context`.  
   - Builds the list of active module IDs (from `config.app.CoreModules` and from addons).  
   - Instantiates **`UI`** with `(container, context, operators, activeIds)`.  
   - Calls **`_loadModules()`**: registers all core module definitions, then **`_loadCoreModules()`** and **`_loadAddons()`**, applies default theme and scene config.

So: **AECO** wires the **Editor** (3D scene, history, sidebar), **Core** (namespaced APIs), **tools** (scene, model, code, BIM), **operators** (registered from active modules and addons), and **UI** (driven by config and active module IDs).

## Core

**Core** is a single object from `src/core/index.js`. Each key is a namespace (e.g. `Init`, `Viewpoint`, `BIM`) whose value is a set of functions. Operators and the app call these functions to perform actions (e.g. create a viewpoint, load a model). Core does not depend on the DOM; it is the logical API layer. See [Core API](core-api.md) for the list of namespaces and functions.

## Tools

**Tools** are low-level capabilities attached to `simulation.tools`. They are classes/objects for:

- **World/viewer:** scene, model, layer, placement, drawing, slicer, markup, notification, viewpoint, animation path, measure, section box, configurator.
- **Code:** Python sandbox (`pyWorker`), JavaScript sandbox (`js`), code editor, node editor.
- **BIM:** project, geometry, attribute, pset, sequence, types, modeling.
- **IFC:** single IFC tool.

Modules and Core use these tools (e.g. Core.Viewpoint uses `tools.world.viewpoint`). See [Tools](tools.md) for the full list and paths.

## Operators

**Operators** are the command layer. Each operator is a class with a static `operatorName` (e.g. `theme.change_to`, `viewpoint.create`). They are registered when their module is active. The app and UI run them via:

```js
simulation.ops.execute("operator.name", context, ...args);
```

Operators typically call **Core** and/or **tools** and return a result (e.g. `{ status: "FINISHED" }`). See [Modules](modules.md) and [Operators](operators.md) for the full reference.

## UI

The **UI** is built by `src/ui/index.js` (**`UI`** class). It reads `context.config.ui` and the **UserInterface** model (from `src/ui/WorldModel/UserInterface.js` and related config). It draws the base layout (viewport, sidebars, toolbars) and shows/hides sections based on **active module IDs**. Each active module can contribute **UI classes** (in its `ui` array); the registry instantiates them with `{ context, operators }` when the module is activated. So the visible UI is a combination of the base layout and the UI components from active core modules and addons.

## Data flow (summary)

- **Config** (app + UI) is set on **context** before the UI is built.  
- **Core modules** and **addons** are registered; only active ones have their operators registered and their UI classes instantiated.  
- User actions in the UI call **`operators.execute(...)`**, which runs the corresponding operator; operators use **Core** and **tools** and update **context** / **editor** as needed.

See [Creating addons](creating-addons.md) for how to add a new module and [Configuration](configuration.md) for config files.
