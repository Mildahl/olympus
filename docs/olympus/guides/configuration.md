# Configuration

The app is configured via a single **config object** passed to **`createUI({ config, container, addons })`**. The config is merged with defaults from **`olympus/configuration/config.js`** (`AECOConfiguration`) and stored on **`context.config`**. This guide describes the main config files used in the examples.

## Config shape

The config object has two top-level keys:

- **`config.app`** — application behaviour: core modules, scene, shortcuts, settings, navigation.
- **`config.ui`** — UI behaviour: theme, language, welcome screen, and optional overrides (e.g. `WorldComponent`).

So you typically build **`AECOConfiguration`** (or a copy) from smaller files and pass it as `config`.

## Main config file: `config.js`

In the examples, **`configuration/config.js`** assembles the full config:

- Imports **`coreModules`** from `config.modules.js`.
- Imports **Shortcuts**, **SceneConfig**, **NavigationConfig** from `config.shortcuts.js`, `config.scene.js`, `config.navigation.js`.
- Builds **`ApplicationConfig`** with:
  - **Name**, **Version**, **History**
  - **CoreModules** — list of `{ id, active }` for each core module.
  - **Scene** — background, fog, axes, etc.
  - **Shortcuts** — keyboard shortcuts.
  - **Settings** — e.g. `save`, `devMode`, `scriptBaseUrl`, `pyodideBaseUrl`, `pyodideWorkerUrl`, `monacoBaseUrl`.
  - **Navigation** — navigation mode defaults.
- Builds **UIConfig** (theme colors, language, showWelcomeScreen, and optionally **WorldComponent** from `config.ui.js`).
- Exports **`AECOConfiguration = { ui: UIConfig, app: ApplicationConfig }`**.

So **`config.js`** is the single entry you pass as `config`; it pulls in the other config files.

## `config.modules.js`

Defines **`coreModules`**: an array of `{ id, active }`. Each `id` must match a core module in `olympus/modules/index.js`. Set `active: true` to enable the module (and its operators and UI), `active: false` to disable it. Dependencies are resolved by the module registry using each module’s `dependsOn`.

## `config.scene.js`

Defines **`SceneConfig`** for the 3D viewport, e.g.:

- **backgroundColor** — scene background color.
- **enableFog**, **fog** (fogType, fogColor, fogNear, fogFar, fogDensity).
- **axesVisible**, **axesSize**.

These are applied in `aeco.js` in **`_applySceneConfig()`**.

## `config.shortcuts.js`

Defines **Shortcuts** — key bindings used by the app. Structure depends on the app; typically a map or array of shortcut definitions.

## `config.navigation.js`

Defines **NavigationConfig** — default navigation behaviour (e.g. orbit, fly, drive). Passed through to the viewport/navigation logic.

## `config.ui.js`

Optional. Can export **WorldComponent** or other UI overrides that are merged into **UIConfig** in `config.js`. Theme is usually defined in **`config.js`** (e.g. `theme.default`, `theme.colors.day` / `theme.colors.night`).

## Where config is used

- **`createUI({ config, ... })`** merges `config.ui` with the default UI config and sets `context.config` (app + UI). It also uses `config.app.CoreModules` and addons to determine active module IDs.
- **`_applySceneConfig()`** reads `context.config.app.Scene` and applies background, fog, axes to the editor and viewport.
- **`_setDefaultTheme()`** reads `context.config.ui.theme.default` and runs `theme.change_to` with that value.

To change behaviour, edit the relevant config file (or override keys in `config.js`) and ensure your app passes the resulting **AECOConfiguration** (or equivalent) into **`createUI`**.
