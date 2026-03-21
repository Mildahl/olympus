# Build and runtime troubleshooting

## Build fails with `Module not found: Error: Can't resolve '@ifc-lite/...'`

The `external/vendor/ifc-lite/` directory is missing or incomplete. Copy it from the original project distribution. Verify these files exist:

- `external/vendor/ifc-lite/packages/geometry/dist/index.js`
- `external/vendor/ifc-lite/packages/parser/dist/index.js`
- `external/vendor/ifc-lite/packages/data/dist/index.js`
- `external/vendor/ifc-lite/packages/encoding/dist/index.js`
- `external/vendor/ifc-lite/packages/ifcx/dist/index.js`
- `external/vendor/ifc-lite/packages/mutations/dist/index.js`
- `external/vendor/ifc-lite/packages/wasm/pkg/ifc-lite.js`

## Build succeeds but examples show a blank page or console errors

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

## VS Code Live Server instead of `npm run serve`

Open the **repository root** (File → Open Folder → Olympus), then start Live Server. The repo includes `.vscode/settings.json` so Live Server uses the workspace root. If your workspace is a subfolder (for example only `examples/HelloWorld`), paths like `/external/` will 404.

## Port 5502

```bash
npm run serve:5502
```

Opens at `http://127.0.0.1:5502/examples/HelloWorld/`.

## Python / Pyodide not loading

Pyodide is loaded from `external/vendor/pyodide/v0.29.0/full/`. Make sure the `external/vendor/pyodide/` directory is populated with the Pyodide distribution files (`.asm.js`, `.wasm`, `.zip`, wheels).

## Warning: `Critical dependency: the request of a dependency is an expression`

This webpack warning is expected and harmless. It comes from dynamic imports in the UI module loader.

## Related

- [Repository setup](repository-setup.md) — vendor folders and serve command
