<div align="center">

# Olympus

**3D AECO authoring in the browser. Modular. Open.**

Don't waste time re-building an editor from scratch: olympus is here!

[![aeco.dev](https://img.shields.io/badge/site-aeco.dev-0066cc)](https://www.aeco.dev/)
[![License](https://img.shields.io/badge/license-see%20LICENSE-blue)](LICENSE)


[**Hello World (reference app)**](https://myoualid.github.io/olympus/examples/HelloWorld/index.html) · [**Addons (build your host app)**](https://myoualid.github.io/olympus/examples/Addons/index.html)

![Olympus — digital construction app](https://www.aeco.dev/static/img/digital_construction_app2.png)

<details>
<summary>More Screenshots</summary>
  
![Olympus — digital construction app](https://www.aeco.dev/static/img/digital_construction_app3.png)
  
![Olympus — digital construction app2](https://www.aeco.dev/static/img/_digital_construction_app.png)

</details>

</div>

---

## Overview

Olympus is a JavaScript library for 3D web applications in architecture, engineering, construction, and operations (AECO), with emphasis on visual analysis of building and infrastructure data. 

### Features

- **Viewport** — Three.js-based 3D editor (orbit, first-person, fly, drive)
- **Scripting** — Monaco editor with Python (Pyodide) and JavaScript
- **IFC** — IfcOpenShell, ifc-lite, and web-ifc-related integration ([repository setup](docs/guides/repository-setup.md))
- **Modules and operators** — Pluggable addons, `operators.execute`, configurable UI shell

### Useful applications:

- Custom BIM viewers
- Internal authoring tools
- Prototypes that need navigation, layers, and extension points without building an editor stack from scratch.

### Examples in this repository

There are **two** hosted examples. Both load **template IFC** samples from `external/ifc`, run **in-browser Python** (Pyodide) and the Monaco scripting UI, and turn on **BIM-related modules** (project, attributes, property sets, and related toggles in each app’s `configuration/config.modules.js`). They differ in purpose, not in “lite versus full” runtime.

| Example | Role |
|--------|------|
| **HelloWorld** | **Reference application** — the default app layout in the repo; use it for first run, tutorials, and to see core module defaults. |
| **Addons** | **Host application pattern** — same stack as HelloWorld, plus a `configuration/` layout and **custom addons** under `examples/Addons/addons/`; use it as the template for your own product or internal tool. |

## Quick start

### Hosted demos

Published examples run in the browser without cloning or Node.js.

- [Hello World — reference app](https://myoualid.github.io/olympus/examples/HelloWorld/index.html)
- [Addons — host app with custom addons](https://myoualid.github.io/olympus/examples/Addons/index.html)

### Local examples (prebuilt bundle)

The default clone includes `dist/index.js` and `external/vendor/` so examples can run without `npm install` or `npm run build`.

```bash
git clone https://github.com/myoualid/olympus.git
cd olympus
```

Examples use import maps and ES modules; a static HTTP origin is required (`file://` is not supported). Serve the repository root, then open directory URLs:

```bash
python -m http.server 8080
```

- [http://localhost:8080/examples/HelloWorld/](http://localhost:8080/examples/HelloWorld/)
- [http://localhost:8080/examples/Addons/](http://localhost:8080/examples/Addons/)

`npm install` and `npm run build` are unnecessary for this path when `dist/` and `external/vendor/` are present. VS Code Live Server is valid if the opened workspace is the repository root.

### Development (rebuild from source)

Changing `src/` or regenerating `dist/index.js` and `dist/pyodide.worker.js` requires Node.js, npm, and the vendor layout in [Repository setup](docs/guides/repository-setup.md).

```bash
npm install
npm run setup
npm run serve
```

Examples: [http://localhost:3000/examples/HelloWorld/](http://localhost:3000/examples/HelloWorld/). The project server sets MIME types suitable for Pyodide and `.mjs` loads. For Pyodide or module load issues behind a minimal static server, use `npm run serve` or [Build and runtime troubleshooting](docs/guides/build-and-runtime-troubleshooting.md).

## Documentation

This page summarizes orientation, quick paths, and a documentation index. Procedures, configuration, tutorials, and API detail live under `docs/`.

### In this repository

- [Quick start](#quick-start) — Hosted demos, local static serve, development workflow
- [Examples in this repository](#examples-in-this-repository) — HelloWorld (reference app) and Addons (host app pattern); both use template IFC, Python, and BIM modules
- [Features](#features) — Viewport, scripting, IFC, modules

### Setup and deployment

- [Repository setup](docs/guides/repository-setup.md) — Layout, vendors, `dist/`, build, serve, scripts
- [Configure and deploy](docs/guides/configure-and-deploy.md) — `Settings` base URLs for deployment
- [Minimal host application](docs/guides/minimal-host-application.md) — `AECO` and `createUI` embedding
- [Build and runtime troubleshooting](docs/guides/build-and-runtime-troubleshooting.md) — Build and runtime faults

### Tutorials

- [Installation](docs/getting-started/installation.md) — Development environment
- [HelloWorld tutorial](docs/getting-started/helloworld-tutorial.md) — First application
- [Project structure](docs/getting-started/project-structure.md) — Codebase layout
- [First addon](docs/getting-started/first-addon.md) — Custom module

### Authoring

- [Writing operators](docs/guides/writing-operators.md) — Operators and undo/redo
- [Building UI](docs/guides/building-ui.md) — UI components
- [Using LayoutManager](docs/guides/using-layoutmanager.md) — Workspaces and tabs

### API (Markdown)

- [API overview](docs/api/README.md) — Layers and imports
- [UI components](docs/api/ui/components.md) — `UIComponents` factories
- [LayoutManager](docs/api/ui/layoutmanager.md) — Panel layout
- [Operators](docs/api/operators/index.md) — Registry and base class

### Generated documentation site

Canonical prose and API notes are maintained under `docs/getting-started/`, `docs/guides/`, and `docs/api/`. The static site under `docs/olympus/` is built with `npm run docs:olympus` and previewed with `npm run docs:olympus:serve`.

- [Olympus doc hub](docs/olympus/README.md) — Entry point for the site bundle
- [How the app works](docs/olympus/guides/how-the-app-works.md) — Architecture overview
- [Configuration](docs/olympus/guides/configuration.md) — Application configuration
- [Creating addons](docs/olympus/guides/creating-addons.md) — Addon development
- [Getting started](docs/olympus/guides/getting-started.md) — Onboarding (site)
- Reference: `core-api.md`, `modules.md`, `operators.md`, `tools.md`, `editors.md` (in `docs/olympus/` after generation)

### Example notes

- [HelloWorld example](docs/examples/helloworld/overview.md) — reference application
- [Addons example](docs/examples/addons/overview.md) — building a host app and addons

## Roadmap

Working on it - feel free to contribute!

## License and contact

Licensed under the terms in [LICENSE](LICENSE). Contact: contact@aeco.dev. Issues: [github.com/myoualid/olympus/issues](https://github.com/myoualid/olympus/issues).
