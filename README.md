# Olympus

Lightweight toolkit for building and prototyping 3D web-based applications for AECO (Architecture, Engineering, Construction, and Operations), with a focus on visual data analysis.

The core library provides:
- Three.js's 3D editor,
- Monaco Script Editor,
- In-browser Python,
- IFC support with IfcOpenShell,
- A pluggable module/addon system,
- highly configurable User Interface (UI),

[Hello World Demo:](https://myoualid.github.io/olympus/examples/HelloWorld/index.html)

<br>

[Construction Application Demo :](https://myoualid.github.io/olympus/examples/Addons/index.html)

---

## Prerequisites

### Running the examples
- A modern browser (Chrome, Edge, Firefox)
- A static server to serve the files (e.g. `npm run serve` or `python -m http.server` or live server)

### Creating a build:
- **Node.js** v18 or later (includes `npm`)
- A modern browser (Chrome, Edge, Firefox)

---

## Setup Guide To run the app: (Step by Step)

The project has two categories of dependencies:

1. **Vendor assets** — pre-built third-party libraries that live under `external/vendor/`. These are **not installed by npm** and are **git-ignored**, so they must be present before you can build or run the project.

To build the library:
1. **npm packages** — installed by `npm install` into `node_modules/`.

### Step 1 — Get the full project files

When you clone or copy the repository, you need **all** of the following at the project root:

```
AECOToolkit/
├── src/            # Core library source (required)
├── drawUI/             # UI utilities (required)
├── examples/           # Runnable example apps
├── external/
│   ├── data/           # Sample data files
│   ├── ifc/            # Sample IFC files
│   ├── styles/         # CSS stylesheets (required)
│   └── vendor/         # Third-party libraries (required — see Step 2)
├── scripts/            # Build and serve scripts (required)
├── package.json        # (required)
├── package-lock.json   # (recommended)
├── webpack.config.js   # (required)
└── webpack.worker.config.js  # (required)
```

### Ensure Vendor libraries exist:

The `external/vendor/` contains:

| Folder | Purpose | Needed for build? | Needed at runtime? |
|--------|---------|--------------------|--------------------|
| `ifc-lite/` | IFC parser and geometry engine | **Yes** | Yes |
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


### Running the examples:

There are two static examples:
- **HelloWorld:** A minimal example with basic navigation and a simple cube.
- **GameExperience:** A more complex example with addons, custom UI, and a sample IFC file.

To run an example, you can open `index.html` in a browser,


## Changin the Core and rebuilding the toolkit:

### Install npm dependencies

```bash
npm install
```

This installs webpack, style-loader, css-loader, and other build/dev tools into `node_modules/`.

### Build

```bash
npm run build
```

This runs two webpack builds in sequence:
1. Builds the Pyodide worker → `external/dist/pyodide.worker.js`
2. Builds the main library → `external/dist/aeco.js`

If the build succeeds you will see `external/dist/aeco.js` and `external/dist/pyodide.worker.js`.

Or do Steps 3 and 4 together:

```bash
npm run setup
```

### Serve

```bash
npm run serve
```

This starts a static server at `http://localhost:3000` from the project root. The custom server (in `scripts/serve-static-mjs.js`) serves `.mjs` files with the correct `application/javascript` MIME type, which is required for Pyodide to load.

### Open an example

- **HelloWorld:** `http://localhost:3000/examples/HelloWorld/`
- **GameExperience:** `http://localhost:3000/examples/GameExperience/`

---

## Configuring Resource Paths

Olympus loads external resources (vendor libraries, data assets, Python tools, sample IFC files) at runtime. By default these resolve under `/external/`, but every base path is configurable via `Settings` in your application config file.

### Path Settings

| Setting | Default | Resolves to |
|---------|---------|-------------|
| `vendorBaseUrl` | `"/external/vendor"` | ag-grid, jsgantt, ifcopenshell wheels, and any vendor library not covered by a specific override |
| `dataBaseUrl` | `"/external/data"` | Icons, images, and other static data resources |
| `pythonToolsBaseUrl` | `"/external/pytools"` | Python BIM tool scripts (ifc_author, spatial, etc.) |
| `ifcSamplesBaseUrl` | `"/external/ifc"` | Sample IFC files used by the BIM Project module |
| `pyodideBaseUrl` | `null` | Pyodide runtime (overrides `vendorBaseUrl` for Pyodide specifically) |
| `pyodideWorkerUrl` | `null` | Pyodide web worker script |
| `monacoBaseUrl` | `null` | Monaco Editor (overrides `vendorBaseUrl` for Monaco specifically) |
| `scriptBaseUrl` | `null` | Base URL where `aeco.js` and workers are served |

### Example configuration

```js
Settings: {
  vendorBaseUrl: "/external/vendor",
  dataBaseUrl: "/external/data",
  pythonToolsBaseUrl: "/external/pytools",
  ifcSamplesBaseUrl: "/external/ifc",
  pyodideBaseUrl: "/external/vendor/pyodide/v0.29.0/full",
  pyodideWorkerUrl: "/external/dist/pyodide.worker.js",
  monacoBaseUrl: "/external/vendor/monaco-editor/0.52.2",
},
```

### Custom deployment

If your deployment serves assets from a different root (e.g. a CDN or a subfolder), override the base URLs:

```js
Settings: {
  vendorBaseUrl: "/assets/vendor",
  dataBaseUrl: "/assets/data",
  pythonToolsBaseUrl: "/assets/pytools",
  ifcSamplesBaseUrl: "/assets/ifc",
  pyodideBaseUrl: "/assets/vendor/pyodide/v0.29.0/full",
  pyodideWorkerUrl: "/assets/dist/pyodide.worker.js",
  monacoBaseUrl: "/assets/vendor/monaco-editor/0.52.2",
},
```

The core library reads these paths through the `Paths` utility (`src/utils/paths.js`). All runtime resource lookups — vendor scripts, CSS, images, Python tools — resolve against these configured base URLs instead of hardcoded `/external/` paths.

---

## Troubleshooting

### Build fails with `Module not found: Error: Can't resolve '@ifc-lite/...'`

The `external/vendor/ifc-lite/` directory is missing or incomplete. Copy it from the original project distribution. Verify these files exist:
- `external/vendor/ifc-lite/packages/geometry/dist/index.js`
- `external/vendor/ifc-lite/packages/parser/dist/index.js`
- `external/vendor/ifc-lite/packages/data/dist/index.js`
- `external/vendor/ifc-lite/packages/encoding/dist/index.js`
- `external/vendor/ifc-lite/packages/ifcx/dist/index.js`
- `external/vendor/ifc-lite/packages/mutations/dist/index.js`
- `external/vendor/ifc-lite/packages/wasm/pkg/ifc-lite.js`

### Build succeeds but examples show a blank page or console errors

The `external/vendor/` directory is incomplete. The examples load third-party libraries at runtime via import maps in their HTML files. At minimum you need:
- `external/vendor/three/build/three.module.js`
- `external/vendor/three/build/three.webgpu.js`
- `external/vendor/three/examples/jsm/` (addons directory)
- `external/vendor/three-mesh-bvh/index.module.js`
- `external/vendor/three-gpu-pathtracer/build/index.module.js`
- `external/vendor/3d-tiles-renderer/build/index.js`
- `external/vendor/3d-tiles-renderer/build/index.plugins.js`
- `external/vendor/editor_deps/signals.min.js`
- `external/vendor/highlightjs/highlight.min.js`
- `external/vendor/highlightjs/github.min.css`

### VS Code Live Server instead of `npm run serve`

Open the **repository root** (File → Open Folder → AECOToolkit), then start Live Server. The repo includes `.vscode/settings.json` so Live Server uses the workspace root. If your workspace is a subfolder (e.g. only `examples/HelloWorld`), paths like `/external/` will 404.

### Port 5502

```bash
npm run serve:5502
```

Opens at `http://127.0.0.1:5502/examples/HelloWorld/`.

### Python / Pyodide not loading

Pyodide is loaded from `external/vendor/pyodide/v0.29.0/full/`. Make sure the `external/vendor/pyodide/` directory is populated with the Pyodide distribution files (`.asm.js`, `.wasm`, `.zip`, wheels).

### Warning: `Critical dependency: the request of a dependency is an expression`

This webpack warning is expected and harmless. It comes from dynamic imports in the UI module loader.

---

## Project Structure

```
AECOToolkit/
├── src/                # Core library
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
├── examples/
│   ├── HelloWorld/         # Minimal example
│   ├── GameExperience/     # Full-featured example with addons
│   ├── Addons/             # Addons example
│   └── Logistics/          # Logistics example
├── external/
│   ├── dist/               # Built output (generated by npm run build)
│   │   ├── aeco.js         # Main library bundle
│   │   └── pyodide.worker.js
│   ├── styles/             # CSS stylesheets
│   ├── data/               # Sample data
│   ├── ifc/                # Sample IFC files
│   └── vendor/             # Third-party libraries (NOT in git — see Setup Step 2)
├── scripts/                # Build and serve scripts
├── docs/                   # Documentation
├── package.json
├── webpack.config.js       # Main webpack config
└── webpack.worker.config.js # Pyodide worker webpack config
```

**Library entry:** `src/index.js` → webpack builds to `external/dist/aeco.js`.

**Examples** use their own `configuration/` and `addons/` directories. Copy an example folder and adjust to your needs.

---

## Minimal App Code

```javascript
import { AECO } from "./../../src/index.js";
import { AECOConfiguration } from "./configuration/config.js";
import { ADDONS } from "./addons/index.js";

const simulation = new AECO(document.body);

simulation.createUI({
  config: AECOConfiguration,
  container: document.body,
  addons: { ADDONS },
});
```

---

## Files Needed vs Optional

| File / Folder | Required? | Notes |
|---------------|-----------|-------|
| `src/` | **Yes** | Core library source |
| `external/vendor/` | **Yes** | Must be manually placed (see Setup Step 2) |
| `external/styles/` | **Yes** | CSS for the application |
| `scripts/` | **Yes** | Contains build and serve scripts |
| `package.json` | **Yes** | Dependencies and npm scripts |
| `package-lock.json` | Recommended | Reproducible installs |
| `webpack.config.js` | **Yes** | Builds `aeco.js` |
| `webpack.worker.config.js` | **Yes** | Builds `pyodide.worker.js` |
| `examples/` | Recommended | Runnable example apps |
| `drawUI/` | **Yes** | UI utilities required by modules |
| `external/data/` | Optional | Sample data for examples |
| `external/ifc/` | Optional | Sample IFC files for examples |
| `docs/` | Optional | Documentation |
| `eslint.config.js` | Optional | Linting (dev only) |
| `jest.config.js` | Optional | Tests (dev only) |
| `jsconfig.json` | Optional | IDE path hints |
| `stylelint.config.cjs` | Optional | CSS linting (dev only) |

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run setup` | `npm install` + `npm run build` (one command). |
| `npm run build` | Build `aeco.js` and Pyodide worker to `external/dist/`. |
| `npm run serve` | Serve the project at port 3000. |
| `npm run serve:5502` | Serve the project at port 5502. |
| `npm run dev` | Rebuild `aeco.js` in watch mode (development). |
| `npm run docs:olympus` | Generate Olympus reference docs. |
| `npm run docs:olympus:serve` | Generate docs and serve the doc site. |
| `npm test` | Run the test suite. |

---

## Highlights

- Three.js 3D editor with orbit, first-person, fly, and drive navigation
- Monaco code editor with Python (Pyodide) and JavaScript support
- Native IFC support via IfcOpenShell, ifc-lite, and web-ifc
- Modular addon/module system for custom extensions

---

## Roadmap

| Feature | Status |
|---------|--------|
| Layers, Viewpoints, Animation Paths | Available |
| Orbit, First-Person, Fly, Drive navigation | Available |
| Monaco Editor, Python, JS Sandbox, Terminal | Available |
| Timeline Player | Planned |
| Visual Node Editor / Workflow Editor | Planned |

---

## Documentation

- Serve locally: `npm run docs:olympus:serve`
- Or read Markdown under `docs/src/`
- Guides: [How the app works](docs/olympus/guides/how-the-app-works.md), [Creating addons](docs/olympus/guides/creating-addons.md), [Configuration](docs/olympus/guides/configuration.md), [Getting started](docs/olympus/guides/getting-started.md)

---

## License and Contact

See the LICENSE file in the repository.
Contact: contact@aeco.dev
