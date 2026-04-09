<div align="center">

# Olympus

**3D AECO authoring in the browser. Modular. Open.**

Don't waste time re-building an editor from scratch: olympus is here!

[![aeco.dev](https://img.shields.io/badge/site-aeco.dev-0066cc)](https://www.aeco.dev/)
[![License](https://img.shields.io/badge/license-see%20LICENSE-blue)](LICENSE)

[**Hello World (reference app)**](https://myoualid.github.io/olympus/examples/HelloWorld/index.html) · [**Addons (build your host app)**](https://myoualid.github.io/olympus/examples/Addons/index.html)

![Olympus — digital construction app](https://www.aeco.dev/static/img/AECO_20260409.png)

<details>
<summary>More Screenshots</summary>
  
![Olympus — digital construction app](https://www.aeco.dev/static/img/digital_construction_app3.png)
  
![Olympus — digital construction app2](https://www.aeco.dev/static/img/_digital_construction_app.png)

</details>

</div>

---

## Overview

A lightweight web framework (1.4MB js build + tool dependencies) for build or prototyping 3D web applications for the architecture, engineering, construction, and operations (AECO).

Olympus removes the overhead of building a 3D viewer from scratch.

## Quick start

### Prerequisites
- Node.js 18+
- npm 9+
- pip 
- python 3.10+


###  Let's Get Started
```bash
# Clone the repository
git clone <repository-url>
cd Olympus

# Install dependencies
npm install

# Build the project
npm run build

# Start the development server
npm run serve
```

Serve the repository root, then open directory URLs (for example `npm run serve` on port 3000, or `python -m http.server 8080`):

- [http://localhost:3000/examples/HelloWorld/](http://localhost:3000/examples/HelloWorld/)

- [http://localhost:3000/examples/Addons/](http://localhost:3000/examples/Addons/)


## Olympus AECO Modes

Features are additive: each row includes everything to its left.

| **Mode** | **Viewport** | **IFC Geometry** | **IFC editing** | **Code editor** | **Python prototyping** |
| --- | --- | --- | --- | --- | --- |
| **AECO_Vanilla** | ✓ | ✓ | — | — | — |
| **AECO_Power**  | ✓ | ✓ | ✓ | ✓| — |
| **AECO_SuperPower**  | ✓ | ✓ |✓ |✓ | ✓ |

### Useful applications:

Any Business Usecase in the AEC industry can be built with Olympus.

We already cover some construction use cases and plan to cover more in the future. ( Community Powered !)

You can freely create your own app with Olympus:
- Slap your logo and call it a day
- Modify core to your liking 
- Create addons for your own application


### Examples in this repository

There are **two** hosted examples. Both load **template IFC** samples from `external/ifc`, run **in-browser Python** (Pyodide) and the Monaco scripting UI, and turn on **BIM-related modules** (project, attributes, property sets, and related toggles in each app’s `configuration/config.modules.js`). They differ in purpose, not in “lite versus full” runtime.

| Example | Role |
|--------|------|
| **HelloWorld** | **Reference application** — the default app layout in the repo; use it for first run, tutorials, and to see core module defaults. |
| **Addons** | **Host application pattern** — same stack as HelloWorld, plus a `configuration/` layout and **custom addons** under `examples/Addons/addons/`; use it as the template for your own product or internal tool. |

## Development (rebuild from source)

Changing `src/` or regenerating `dist/index.js` and `dist/pyodide.worker.js` uses Node.js and npm. Use **`npm run setup`** for install, full vendor sync, and build in one step, or see [Repository setup](docs/guides/repository-setup.md).


Examples: [http://localhost:3000/examples/HelloWorld/](http://localhost:3000/examples/HelloWorld/). The project server sets MIME types suitable for Pyodide and `.mjs` loads. For Pyodide or module load issues behind a minimal static server, use `npm run serve` or [Build and runtime troubleshooting](docs/guides/build-and-runtime-troubleshooting.md).


## Data Agnostic

Olympus is data agnostic. It currently implements the IFC standard for Building Information Modeling. Other data schemas will be supported in the future ( BrickSchema for Operations, Google Buildings Schema).

## Documentation

This page summarizes orientation, quick paths, and a documentation index. Procedures, configuration, tutorials, and API detail live under `docs/`.

### In this repository

- [Quick start](#quick-start) — Hosted demos, local static serve, development workflow
- [Examples in this repository](#examples-in-this-repository) — HelloWorld (reference app) and Addons (host app pattern); both use template IFC, Python, and BIM modules
- [Features](#features) — Viewport, scripting, IFC, modules

### Setup and deployment

- [Repository setup](docs/guides/repository-setup.md) — Layout, vendors, `dist/`, build, serve, scripts
- [Configure and deploy](docs/guides/configure-and-deploy.md) — `Settings` base URLs for deployment
- [Minimal host application](docs/guides/minimal-host-application.md) — `AECO` and `initWorld` embedding
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

Canonical prose and API notes are maintained under `docs/getting-started/`, `docs/guides/`, and `docs/api/`. The static pages under `docs/olympus/` can be previewed with a static server (for example `npx serve docs/olympus`).

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
