# Pyodide packages (local serving)

When `pyodideBaseUrl` points here, **`pyodide.loadPackage("micropip")`** fetches the micropip wheel from this directory and validates it with the lockfile’s SRI. So the following file is required and must match the checksum in `pyodide-lock.json`:

- **micropip-0.11.0-py3-none-any.whl** – required for aeco’s BIM/ifcopenshell install (worker calls `loadPackage("micropip")` then uses micropip to install wheels).

Also needed: **numpy**, **shapely**, **six**, **packaging**, **sqlite3**, **typing_extensions** – loadPackage("numpy")/loadPackage("shapely") use this folder; if missing you get 404/SRI and "No module named 'numpy'". These were copied from parent _vendor/pyodide. If SRI fails, use CDN wheels or checkIntegrity: false in the worker.

To re-download from the official CDN (same content, SRI-compatible):

```powershell
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/pyodide/v0.29.0/full/micropip-0.11.0-py3-none-any.whl" -OutFile "micropip-0.11.0-py3-none-any.whl" -UseBasicParsing
```
