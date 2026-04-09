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

1. **Example vendor assets** — third-party browser bundles under **`examples/vendor/`**. This directory is **git-ignored**. After **`npm install`**, the **`postinstall`** script runs **`scripts/sync-examples-vendor.js`**, which copies the required trees from **`node_modules`** into **`examples/vendor/`** (see the vendor table). Run **`npm run vendor:sync`** manually after changing versions in `package.json` or if you need to refresh the folder.

2. **npm packages** — declared in `package.json` and installed into `node_modules/`.

## Step 1 — Repository layout at the project root

When you clone or copy the repository, you need the following at the project root:

```
Olympus/
├── dist/                     # Prebuilt bundle (examples import aeco from here)
├── src/                      # Core library source (required)
├── drawUI/                   # UI utilities (required)
├── examples/                 # Runnable example apps
│   └── vendor/               # Third-party assets for examples (git-ignored; filled by postinstall)
├── external/
│   ├── data/                 # Sample data files
│   ├── ifc/                  # Sample IFC files
│   └── styles/               # CSS stylesheets (required)
├── scripts/                  # sync-examples-vendor.js for examples/vendor
├── package.json              # (required)
├── package-lock.json         # (recommended)
├── webpack.config.js         # (required)
└── webpack.worker.config.js  # (required)
```

## Vendor libraries under `examples/vendor/`

Populated by **`scripts/sync-examples-vendor.js`**, which reads installed **`monaco-editor`** and **`pyodide`** versions from their **`package.json`** files, copies every package under **`node_modules/@ifc-lite/`**, and mirrors the other dependencies listed below. If **`external/vendor/ifcopenshell/`** exists, it is copied into **`examples/vendor/ifcopenshell/`** during sync. After upgrading Monaco or Pyodide in **`package.json`**, align **`monacoBaseUrl`** and **`pyodideBaseUrl`** in your app config with the new paths (the sync script logs the resolved segments).

| Folder | Purpose | Needed for build? | Needed at runtime? |
|--------|---------|-------------------|-------------------|
| `ifc-lite/` | `@ifc-lite/*` packages (geometry, parser, wasm, data, encoding, ifcx, mutations) | No | **Yes** (examples / import maps) |
| `three/` | Three.js 3D engine | No | **Yes** |
| `three-mesh-bvh/` | BVH acceleration for Three.js | No | **Yes** |
| `three-gpu-pathtracer/` | Path tracing renderer | No | **Yes** |
| `3d-tiles-renderer/` | 3D Tiles support | No | **Yes** |
| `xatlas-web/` | Dependency for path tracer (if present in `node_modules`) | No | As needed |
| `editor_deps/` | Signals library (`signals` npm package, `dist/signals.min.js`) | No | **Yes** |
| `highlightjs/` | Syntax highlighting (`@highlightjs/cdn-assets`) | No | **Yes** |
| `showdown/` | Markdown (Showdown) | No | Optional |
| `chart/` | Chart.js UMD bundle | No | Optional |
| `ag-grid/` | Spreadsheet component | No | Optional |
| `jsgantt/` | Gantt chart component | No | Optional |
| `monaco-editor/` | Code editor (Monaco v0.52.2, `min` → `monaco-editor/0.52.2`) | No | Yes (if using code editor) |
| `pyodide/` | Python in the browser (`pyodide` npm package → `pyodide/v0.29.0/full`) | No | Yes (if using Python/BIM) |
| `ifcopenshell/` | IfcOpenShell Python wheels | No | Yes (if using Python IFC) |
| `engine_web-ifc/` | web-ifc WASM engine (`web-ifc` npm package) | No | Yes (if using web-ifc) |

## Running the examples

- **HelloWorld:** Minimal navigation and a simple cube.
- **Addons:** Construction-style demo with multiple addons and richer UI.

Examples resolve `aeco` to `dist/index.js` at the repository root and load ES module specifiers from **`examples/vendor/`** via import maps in each example’s `index.html`. Use **`npm run build`** if `dist/` is missing or out of date.

Use **`npm run serve`** from the repository root to start a static server (via **`npx serve`**). If Pyodide or `.mjs` loading fails with your server, try another static host that sets correct JavaScript MIME types.

## Install, build, and serve

### Install npm dependencies

```bash
npm install
```

This installs build tools, runtime dependencies (Three.js stack, Monaco, IFC Lite packages, ag-grid, Chart.js, and others), and dev tools into `node_modules/`.

The **`postinstall`** script runs **`node scripts/sync-examples-vendor.js`**, which fills **`examples/vendor/`** from **`node_modules`** (including Pyodide under **`examples/vendor/pyodide/v0.29.0/full/`**). To skip Pyodide only (for example in a constrained CI job), run **`node scripts/sync-examples-vendor.js --skip-pyodide`** manually instead of relying on the default **`postinstall`**.

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

This starts a static server at `http://localhost:3000` from the project root using **`npx serve@14`**.

### Open an example locally

- **HelloWorld:** `http://localhost:3000/examples/HelloWorld/`
- **Addons:** `http://localhost:3000/examples/Addons/`

## Project structure (reference)

```
Olympus/
├── src/                    # Core library
│   ├── index.js            # Library entry (AECO class and public exports)
│   ├── core/               # Core features (navigation, layers, viewpoints, etc.)
│   ├── modules/            # Pluggable UI modules
│   ├── operators/          # Data operators
│   ├── tool/               # Tools (BIM, code editor, Pyodide)
│   ├── ui/                 # UI components
│   ├── utils/              # Utilities
│   ├── data/               # Data layer (Store, collections)
│   ├── context/            # Application context
│   ├── configuration/      # Default configuration
│   ├── types/              # Type definitions
│   └── third-party/        # Small vendored sources shipped with the library
├── drawUI/                 # UI panel utilities
├── dist/                   # Built output (generated by npm run build)
│   ├── index.js            # Main library bundle (import map name: aeco)
│   └── pyodide.worker.js
├── examples/
│   ├── HelloWorld/         # Minimal example
│   ├── Addons/             # Addons / construction-style example
│   └── vendor/             # Browser vendor tree (postinstall sync)
├── external/
│   ├── styles/             # CSS stylesheets
│   ├── data/               # Sample data
│   └── ifc/                # Sample IFC files
├── docs/                   # Documentation
├── scripts/                # examples/vendor sync (postinstall)
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
| `examples/vendor/` | **Yes** (for examples) | Generated by **`postinstall`** / **`npm run vendor:sync`**; not published on npm |
| `external/styles/` | **Yes** | CSS for the application |
| `scripts/` | **Yes** | **`sync-examples-vendor.js`** (used by **`postinstall`**) |
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
| `npm run setup` | `npm install` + **`npm run vendor:sync`** + `npm run build`. |
| `npm run vendor:sync` | Refresh **`examples/vendor/`** from **`node_modules`** (same as default **`postinstall`**). |
| `npm run build` | Build `dist/index.js` and `dist/pyodide.worker.js`. |
| `npm run serve` | Serve the project at port 3000 (`npx serve@14`). |
| `npm run serve:5502` | Serve the project at port 5502. |
| `npm run dev` | Rebuild `dist/index.js` in watch mode (development). |
| `npm test` | Run the test suite. |

## npm package consumers

The published **`aeco`** package **`files`** field includes **`src`**, **`dist`**, **`drawUI`**, and **`scripts/sync-examples-vendor.js`** for consumers who want the same **`examples/vendor/`** workflow. Host applications should depend on **`three`**, **`three-mesh-bvh`**, **`three-gpu-pathtracer`**, and **`3d-tiles-renderer`** (see **`peerDependencies`** in `package.json`) and serve static assets (Monaco, Pyodide, wheels, ag-grid, and so on) from their own URLs, configured via **`Settings`** as in [Configure and deploy](configure-and-deploy.md).

## Related

- [Configure and deploy](configure-and-deploy.md) — `Settings` base URLs for CDN and subfolders
- [Build and runtime troubleshooting](build-and-runtime-troubleshooting.md)
- [Minimal host application](minimal-host-application.md) — smallest embedding snippet
