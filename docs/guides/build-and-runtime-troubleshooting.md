# Build and runtime troubleshooting

## Build fails with `Module not found: Error: Can't resolve '@ifc-lite/...'`

Run **`npm install`** so `node_modules/@ifc-lite/*` is present. The main bundle lists `@ifc-lite/*` as webpack externals; the resolver still needs the packages installed at build time.

## Build succeeds but examples show a blank page or console errors

The **`examples/vendor/`** directory is missing or incomplete. Run **`npm install`** (runs **`postinstall`**) or **`npm run vendor:sync`**. See [Repository setup](repository-setup.md). The examples load third-party libraries at runtime via import maps. At minimum you need:

- `examples/vendor/three/build/three.module.js`
- `examples/vendor/three/build/three.webgpu.js`
- `examples/vendor/three/examples/jsm/` (addons directory)
- `examples/vendor/three-mesh-bvh/src/index.js`
- `examples/vendor/three-gpu-pathtracer/build/index.module.js`
- `examples/vendor/3d-tiles-renderer/build/index.js`
- `examples/vendor/3d-tiles-renderer/build/index.plugins.js`
- `examples/vendor/editor_deps/signals.min.js`
- `examples/vendor/highlightjs/highlight.min.js`
- `examples/vendor/highlightjs/github.min.css`
- `examples/vendor/ifc-lite/` (geometry, parser, wasm, and related packages)

## VS Code Live Server instead of `npm run serve`

Open the **repository root** (File → Open Folder → Olympus), then start Live Server. The repo includes `.vscode/settings.json` so Live Server uses the workspace root. If your workspace is a subfolder (for example only `examples/HelloWorld`), paths like `/examples/vendor/` or `/dist/` will 404.

## Port 5502

```bash
npm run serve:5502
```

Opens at `http://127.0.0.1:5502/examples/HelloWorld/`.

## Python / Pyodide not loading

Pyodide is loaded from the URL in **`Settings.pyodideBaseUrl`** (the examples use **`/examples/vendor/pyodide/v0.29.0/full/`**). Ensure **`npm install`** completed so **`postinstall`** copied **`pyodide`** into **`examples/vendor/pyodide/v0.29.0/full/`**, or run **`npm run vendor:sync`**.

## Warning: `Critical dependency: the request of a dependency is an expression`

This webpack warning is expected and harmless. It comes from dynamic imports in the UI module loader.

## Related

- [Repository setup](repository-setup.md) — vendor folders and serve command
