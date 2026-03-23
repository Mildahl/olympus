# Repository setup

Full clone layout, vendor assets, build, serve, and optional files. For a short happy path, see the [root README](../../README.md). For path overrides when deploying, see [Configure and deploy](configure-and-deploy.md).

## Prerequisites

### Running the examples

- A modern browser (Chrome, Edge, Firefox)
- A static server to serve the files (for example `npm run serve`, `python -m http.server`, or Live Server)

### Creating a build

- **Node.js** v18 or later (includes `npm`)
- A modern browser (Chrome, Edge, Firefox)

## Dependency categories

1. **Vendor assets** — pre-built third-party libraries under `external/vendor/`. These are **not installed by npm** and are **git-ignored**, so they must be present before you can build or run the project.

2. **npm packages** — installed by `npm install` into `node_modules/`.

## Step 1 — Repository layout at the project root

When you clone or copy the repository, you need the following at the project root:

```
Olympus/
├── dist/                     # Prebuilt bundle (examples import aeco from here)
├── src/                      # Core library source (required)
├── drawUI/                   # UI utilities (required)
├── examples/                 # Runnable example apps
├── external/
│   ├── data/                 # Sample data files
│   ├── ifc/                  # Sample IFC files
│   ├── styles/               # CSS stylesheets (required)
│   └── vendor/               # Third-party libraries (required — see below)
├── scripts/                  # Build and serve scripts (required)
├── package.json              # (required)
├── package-lock.json         # (recommended)
├── webpack.config.js         # (required)
└── webpack.worker.config.js  # (required)
```

## Vendor libraries under `external/vendor/`

| Folder | Purpose | Needed for build? | Needed at runtime? |
|--------|---------|-------------------|-------------------|
| `ifc-lite/` | `@ifc-lite/*` packages (geometry, parser, wasm, data, encoding, ifcx, mutations) copied from `node_modules` | **Yes** (after `npm install`) | Yes |
| `three/` | Three.js 3D engine | No | **Yes** |
| `three-mesh-bvh/` | BVH acceleration for Three.js | No | **Yes** |
| `three-gpu-pathtracer/` | Path tracing renderer | No | **Yes** |
| `3d-tiles-renderer/` | 3D Tiles support | No | **Yes** |
| `editor_deps/` | Signals library | No | **Yes** |
| `highlightjs/` | Syntax highlighting | No | **Yes** |
| `monaco-editor/` | Code editor (Monaco v0.52.2) | No | Yes (if using code editor) |
| `pyodide/` | Python in the browser | No | Yes (if using Python/BIM) |
| `ifcopenshell/` | IfcOpenShell Python wheels | No | Yes (if using Python IFC) |
| `engine_web-ifc/` | web-ifc WASM engine | No | Yes (if using web-ifc) |
| `ag-grid/` | Spreadsheet component | No | Yes (optional) |
| `jsgantt/` | Gantt chart component | No | Yes (optional) |
| `fonts/` | Custom fonts | No | Yes (optional) |

## Running the examples

- **HelloWorld:** Minimal navigation and a simple cube.
- **Addons:** Construction-style demo with multiple addons and richer UI.

Examples resolve `aeco` to `dist/index.js` at the repository root and load scripts from `external/vendor/`. If those paths exist in your tree, you can serve the repo root with any static server (for example `python -m http.server`) and open `/examples/HelloWorld/` or `/examples/Addons/` without running `npm install` or `npm run build`.

Use `npm run serve` from the repository root when you want the project’s static server (correct `.mjs` MIME type for Pyodide and the same port conventions as the docs).

## Install, build, and serve

### Install npm dependencies

```bash
npm install
```

This installs webpack, style-loader, css-loader, `@ifc-lite/geometry` / `@ifc-lite/parser` (used only to populate vendor — the built `dist/index.js` does not bundle them), and other build and dev tools into `node_modules/`.

The **`postinstall`** script runs **`npm run sync:ifc-lite`**, which copies `node_modules/@ifc-lite/*` into **`external/vendor/ifc-lite/`**. Examples resolve those packages via **import maps** (same idea as `three`). Run **`npm run sync:ifc-lite`** manually if you add or upgrade `@ifc-lite` packages and need vendor files refreshed.

### Build

```bash
npm run build
```

This runs two webpack builds in sequence:

1. Builds the Pyodide worker → `dist/pyodide.worker.js`
2. Builds the main library → `dist/index.js`

If the build succeeds you will see `dist/index.js` and `dist/pyodide.worker.js`.

Or install and build together:

```bash
npm run setup
```

### Serve

```bash
npm run serve
```

This starts a static server at `http://localhost:3000` from the project root. The custom server (`scripts/serve-static-mjs.js`) serves `.mjs` files with the `application/javascript` MIME type, which Pyodide needs.

### Open an example locally

- **HelloWorld:** `http://localhost:3000/examples/HelloWorld/`
- **Addons:** `http://localhost:3000/examples/Addons/`

## Project structure (reference)

```
Olympus/
├── src/                    # Core library
│   ├── index.js            # Library entry point
│   ├── aeco.js             # Main AECO class
│   ├── core/               # Core features (navigation, layers, viewpoints, etc.)
│   ├── modules/            # Pluggable UI modules
│   ├── operators/          # Data operators
│   ├── tool/               # Tools (BIM, code editor, Pyodide)
│   ├── ui/                 # UI components
│   ├── utils/              # Utilities
│   ├── data/               # Data layer (Store, collections)
│   ├── context/            # Application context
│   ├── configuration/      # Default configuration
│   └── types/              # Type definitions
├── drawUI/                 # UI panel utilities
├── dist/                   # Built output (generated by npm run build)
│   ├── index.js            # Main library bundle (import map name: aeco)
│   └── pyodide.worker.js
├── examples/
│   ├── HelloWorld/         # Minimal example
│   └── Addons/             # Addons / construction-style example
├── external/
│   ├── styles/             # CSS stylesheets
│   ├── data/               # Sample data
│   ├── ifc/                # Sample IFC files
│   └── vendor/             # Third-party libraries (see vendor table)
├── scripts/                # Build and serve scripts
├── docs/                   # Documentation
├── package.json
├── webpack.config.js       # Main webpack config
└── webpack.worker.config.js # Pyodide worker webpack config
```

**Library entry:** `src/index.js` → webpack builds to `dist/index.js` (examples import it as `aeco` via import map).

**Examples** use their own `configuration/` and `addons/` directories. Copy an example folder and adjust to your needs.

## Files required vs optional

| File / Folder | Required? | Notes |
|---------------|-----------|-------|
| `src/` | **Yes** | Core library source |
| `external/vendor/` | **Yes** | Must be manually placed (see vendor table) |
| `external/styles/` | **Yes** | CSS for the application |
| `scripts/` | **Yes** | Contains build and serve scripts |
| `package.json` | **Yes** | Dependencies and npm scripts |
| `package-lock.json` | Recommended | Reproducible installs |
| `webpack.config.js` | **Yes** | Builds `dist/index.js` |
| `webpack.worker.config.js` | **Yes** | Builds `dist/pyodide.worker.js` |
| `dist/` | Recommended after clone | Prebuilt bundle for examples; regenerate with `npm run build` after changing `src/` |
| `examples/` | Recommended | Runnable example apps |
| `drawUI/` | **Yes** | UI utilities required by modules |
| `external/data/` | Optional | Sample data for examples |
| `external/ifc/` | Optional | Sample IFC files for examples |
| `docs/` | Optional | Documentation |
| `eslint.config.js` | Optional | Linting (dev only) |
| `jest.config.js` | Optional | Tests (dev only) |
| `jsconfig.json` | Optional | IDE path hints |
| `stylelint.config.cjs` | Optional | CSS linting (dev only) |

## npm scripts

| Script | Description |
|--------|-------------|
| `npm run setup` | `npm install` + `npm run build` (one command). |
| `npm run build` | Build `dist/index.js` and `dist/pyodide.worker.js`. |
| `npm run serve` | Serve the project at port 3000. |
| `npm run serve:5502` | Serve the project at port 5502. |
| `npm run dev` | Rebuild `dist/index.js` in watch mode (development). |
| `npm run docs:olympus` | Generate Olympus reference docs. |
| `npm run docs:olympus:serve` | Generate docs and serve the doc site. |
| `npm test` | Run the test suite. |

## Related

- [Configure and deploy](configure-and-deploy.md) — `Settings` base URLs for CDN and subfolders
- [Build and runtime troubleshooting](build-and-runtime-troubleshooting.md)
- [Minimal host application](minimal-host-application.md) — smallest embedding snippet
