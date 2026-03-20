# Getting started

This guide explains how to set up the basic **HelloWorld** example and the **GameExperience** example (which includes addons). Both live under **`examples/`**.

## HelloWorld: minimal app

HelloWorld is a minimal Olympus app: one HTML page, one app script, and a configuration folder.

### Structure

- **`examples/HelloWorld/index.html`** — Page that loads the app via a module script (e.g. `app.demo.js`). It defines an **import map** so that `aeco`, `three`, and other dependencies resolve to the correct paths (e.g. `./../../src/index.js` or vendor paths).
- **`examples/HelloWorld/app.js`** (or **`app.demo.js`** if the HTML points there) — Entry script that:
  1. Imports **DrawUI** (optional spinner), **AECOConfiguration** from `./configuration/config.js`, and **ADDONS** from `./addons/index.js`.
  2. Creates **`const simulation = new AECO(document.body)`**.
  3. Calls **`simulation.createUI({ config: AECOConfiguration, container: document.body, addons: { ADDONS, Listeners: listeners } })`**.
  4. Optionally uses **`simulation.tools`** (e.g. `simulation.tools.world.scene.addCube(context, 1, "grey")`).

If HelloWorld has no addons folder, you can pass **`addons: { ADDONS: [] }`** or omit addons. The important part is **AECOConfiguration** (from `configuration/config.js`) and **createUI**.

### Configuration

- **`configuration/config.js`** — Builds **AECOConfiguration** from:
  - **config.modules.js** — which core modules are active.
  - **config.scene.js**, **config.shortcuts.js**, **config.navigation.js** — scene, shortcuts, navigation.
  - **config.ui.js** (if present) — theme, WorldComponent, etc.
- Point the HTML script at your app entry (e.g. `app.js` or `app.demo.js`). Ensure the import map and paths match your project layout (src vs static/dist, vendor paths).

### Running

Serve the project from a root that allows the import map to resolve (e.g. project root or a server that serves `examples/HelloWorld` with correct paths). Open **`examples/HelloWorld/index.html`** (or the URL that serves it). You should see the Olympus UI and viewport; with the default config, scripting and several world/BIM modules are active.

---

## GameExperience: app with addons

GameExperience is a full example that enables **addons** (custom modules) for experiences, navigation, and other features.

### Structure

- **`examples/GameExperience/index.html`** — Similar to HelloWorld: import map, scripts, and **`<script type="module" src="./app.demo.js">`** (or `app.js`).
- **`examples/GameExperience/app.js`** — Can export a **`Demo()`** function that:
  1. Creates **`const simulation = new AECO(document.body)`**.
  2. Passes **ADDONS** and optional **Listeners** into **`simulation.createUI({ config: AECOConfiguration, container: document.body, addons: { ADDONS, Listeners: listeners } })`**.
  3. Uses **`simulation.tools`** and **`simulation.ops`** (e.g. add cube, run operators).
- **`examples/GameExperience/addons/index.js`** — Exports **`ADDONS`** as an array of `{ module, active }`, e.g.:
  - **Course Experience** (`experiences/module.js`) — `active: true`.
  - **Navigation** (`navigation/module.js`) — e.g. `active: false`.

Each addon is a **module definition** (id, name, dependsOn, operators, ui). See [Creating addons](creating-addons.md).

### Addon demo: Course Experience

The **Course Experience** addon (**`addons/experiences/`**) is a simple addon demo:

- **`module.js`** — Defines `id: 'course.experiences'`, name, operators, and UI.
- **`operators.js`** — Exports an array of operator classes (e.g. for enabling a demo or welcome flow).
- **`ui.js`** — UI class instantiated with `{ context, operators }`; builds panels or welcome screens and calls **`operators.execute(...)`** when the user acts.

Enabling it in **`addons/index.js`** with **`active: true`** is enough for the app to register and activate it; no change to Olympus core is needed.

### Running

Serve the project so that **`examples/GameExperience`** is reachable and the import map resolves (e.g. `aeco` → `./../../static/dist/aeco.js` or your build). Open the GameExperience index page. You should see the full UI and the Course Experience addon (welcome/demo) if it is active. Use the browser console to inspect **`simulation.ops`** and **`simulation.tools`** if needed.

---

## Summary

| Example        | Purpose                         | Addons                          |
|----------------|----------------------------------|---------------------------------|
| **HelloWorld** | Minimal Olympus app and config  | Optional (empty or simple list) |
| **GameExperience** | Full app with addon demos   | Yes — `addons/index.js`, e.g. Course Experience |

For more on the app architecture, see [How the app works](how-the-app-works.md). For config details, see [Configuration](configuration.md). For defining your own addon, see [Creating addons](creating-addons.md).
