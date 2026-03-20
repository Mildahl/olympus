# Pyodide (local vendor)

AECO can load Pyodide from your own server instead of the CDN. Put a Pyodide build here so the worker loads `pyodide.mjs` and assets from this folder (no CORS, works offline).

## Expected layout

Serve this folder so that the following path is available from the same origin as your app:

```
/vendor/pyodide/v0.29.0/full/
├── pyodide.mjs
├── pyodide.asm.js
├── pyodide.asm.wasm
├── python_stdlib.zip
├── pyodide_py.tar
├── repodata.json
└── packages/   (optional, for micropip)
```

The config key `app.Settings.pyodideBaseUrl` must match this path (e.g. `"/vendor/pyodide/v0.29.0/full"`). Set it to `null` to use the CDN again.

## How to get the files

### Option 1: Download from Pyodide CDN (manual)

1. Pick a version, e.g. **v0.29.0**, and build type **full** (or **dev** for a smaller debug build).
2. Open in the browser (or use curl/wget for each file):
   - `https://cdn.jsdelivr.net/pyodide/v0.29.0/full/pyodide.mjs`
   - `https://cdn.jsdelivr.net/pyodide/v0.29.0/full/pyodide.asm.js`
   - `https://cdn.jsdelivr.net/pyodide/v0.29.0/full/pyodide.asm.wasm`
   - `https://cdn.jsdelivr.net/pyodide/v0.29.0/full/python_stdlib.zip`
   - `https://cdn.jsdelivr.net/pyodide/v0.29.0/full/pyodide_py.tar`
   - `https://cdn.jsdelivr.net/pyodide/v0.29.0/full/repodata.json`
3. Save them under `vendor/pyodide/v0.29.0/full/` (create the directories).
4. Ensure your app serves `vendor/` (or the parent of `pyodide`) at `/vendor/` so that `/vendor/pyodide/v0.29.0/full/pyodide.mjs` is reachable.

### Option 2: Download script (Node)

From the project root, run:

```bash
node scripts/download-pyodide.js
```

If the script does not exist, use Option 1 or Option 3.

### Option 3: GitHub release tarball

1. Go to [Pyodide releases](https://github.com/pyodide/pyodide/releases).
2. Download the **full** tarball for the version you want (e.g. `pyodide-v0.29.0.tar.bz2`).
3. Unpack it and copy the contents of the inner `pyodide/` directory into `vendor/pyodide/v0.29.0/full/`.

## Config

In `src/configuration/config.js` (or your merged config), set:

```js
Settings: {
  pyodideBaseUrl: "/vendor/pyodide/v0.29.0/full",  // local
  // pyodideBaseUrl: null,  // use CDN
}
```

The path must be the URL path where you serve the Pyodide folder (same origin as the app). No trailing slash; the code appends `/` and `pyodide.mjs` as needed.
