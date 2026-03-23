# Getting started

This guide explains how to set up the **HelloWorld** example (minimal app) and the **Addons** example (app that loads custom addon modules). Both live under **`examples/`**.

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

## Addons: app with custom modules

The **Addons** example (**`examples/Addons`**) is a full app that registers **addon** modules (same contract as core modules) alongside the usual configuration. Viewport navigation comes from the core **`world.navigation`** module (`src/modules/navigation/`), not from an addon.

### Structure

- **`examples/Addons/index.html`** — Import map and script entry (e.g. **`app.js`**).
- **`examples/Addons/app.js`** — Creates **`new AECO()`**, passes **ADDONS** and **Listeners** into **`simulation.createUI({ config: AECOConfiguration, container: document.body, addons: { ADDONS, Listeners: listeners } })`**, and may use **`simulation.tools`** / **`simulation.ops`**.
- **`examples/Addons/addons/index.js`** — Exports **`ADDONS`** as an array of `{ module, active }` (see the **Hard Hat** addon in **`addons/hard-hat/`**).

Each addon is a **module definition** (id, name, dependsOn, operators, ui). See [Creating addons](creating-addons.md).

### Running

Serve the project so that **`examples/Addons`** is reachable and the import map resolves (e.g. `aeco` → your built bundle or `src/index.js`). Open **`examples/Addons/index.html`**. Use the browser console to inspect **`simulation.ops`** and **`simulation.tools`** if needed.

---

## Summary

| Example       | Purpose                        | Addons                                  |
|---------------|--------------------------------|-----------------------------------------|
| **HelloWorld** | Minimal Olympus app and config | Optional (empty list or simple addons) |
| **Addons**     | Host app for custom modules    | Yes — `examples/Addons/addons/index.js` |

For more on the app architecture, see [How the app works](how-the-app-works.md). For config details, see [Configuration](configuration.md). For defining your own addon, see [Creating addons](creating-addons.md).
