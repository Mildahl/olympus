# Configure and deploy

Olympus loads external resources (vendor libraries, data assets, Python tools, sample IFC files) at runtime. By default these resolve under `/external/`, but every base path is configurable via `Settings` in your application config file.

## Path settings

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

## Example configuration

```js
Settings: {
  vendorBaseUrl: "/external/vendor",
  dataBaseUrl: "/external/data",
  pythonToolsBaseUrl: "/external/pytools",
  ifcSamplesBaseUrl: "/external/ifc",
  pyodideBaseUrl: "/external/vendor/pyodide/v0.29.0/full",
  pyodideWorkerUrl: "/dist/pyodide.worker.js",
  monacoBaseUrl: "/external/vendor/monaco-editor/0.52.2",
},
```

## Custom deployment

If your deployment serves assets from a different root (for example a CDN or a subfolder), override the base URLs:

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

The core library reads these paths through the `Paths` utility (`src/utils/paths.js`). Runtime resource lookups resolve against these configured base URLs instead of hardcoded `/external/` paths.

## Related

- [Repository setup](repository-setup.md) — vendor layout and build output paths
- Generated guide: [Configuration](../olympus/guides/configuration.md) (after `npm run docs:olympus`)
