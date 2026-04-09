import {
  getPyodide, getMicropip, setMicropip, installedPackages,
  markBootstrapMetric, measureBootstrapDuration,
  getPackageBaseUrl, setPackageBaseUrl,
} from './worker_state.js';
import {
  ifcOpenShellMicropipPipPackageNames,
  ifcOpenShellWheelFileNamesByMicropipPackageName,
  ifcOpenShellWasmRuntimeWheelFileName,
} from './ifcopenshellWheelCatalog.js';

const wheelsManifestPromiseByBaseUrl = new Map();

function normalizeWheelsDirectoryUrl(input) {
  if (input.endsWith(".whl")) {
    return input.replace(/\/[^/]+\.whl$/i, "/");
  }
  return input.endsWith("/") ? input : `${input}/`;
}

async function loadWheelsManifest(wheelsBaseUrl) {
  const normalizedBase = wheelsBaseUrl.endsWith("/") ? wheelsBaseUrl : `${wheelsBaseUrl}/`;
  let promise = wheelsManifestPromiseByBaseUrl.get(normalizedBase);
  if (!promise) {
    promise = (async () => {
      try {
        const response = await fetch(`${normalizedBase}wheels-manifest.json`);
        if (!response.ok) {
          return null;
        }
        return response.json();
      } catch {
        return null;
      }
    })();
    wheelsManifestPromiseByBaseUrl.set(normalizedBase, promise);
  }
  return promise;
}

function pyodideWheelFileNameFromManifest(manifest, pyodidePackageName) {
  if (!manifest || typeof manifest !== "object") {
    return null;
  }
  const table = manifest.pyodidePackageFiles;
  if (!table || typeof table !== "object") {
    return null;
  }
  const fileName = table[pyodidePackageName];
  return typeof fileName === "string" ? fileName : null;
}

function resolvePyodidePreIfcLoadOrder(manifest) {
  const table = manifest && typeof manifest === "object" ? manifest.pyodidePackageFiles : null;
  const orderedNames = manifest && typeof manifest === "object" ? manifest.pyodidePackageLoadOrder : null;
  if (Array.isArray(orderedNames) && orderedNames.length > 0 && table && typeof table === "object") {
    return orderedNames.filter(
      (packageName) =>
        packageName !== "micropip" && Object.prototype.hasOwnProperty.call(table, packageName),
    );
  }
  const fallbackNames = ["numpy", "shapely"];
  if (!table || typeof table !== "object") {
    return [];
  }
  return fallbackNames.filter((packageName) => Object.prototype.hasOwnProperty.call(table, packageName));
}

export async function loadPackageManager() {
  const pyodide = getPyodide();

  if (!pyodide) {
    throw new Error("Pyodide not initialized");
  }

  if (!getMicropip()) {
    markBootstrapMetric("package_manager_start");
    const wheelsBaseUrl = getPackageBaseUrl();
    let micropipLoaded = false;
    if (wheelsBaseUrl) {
      const manifest = await loadWheelsManifest(wheelsBaseUrl);
      const micropipFileName = pyodideWheelFileNameFromManifest(manifest, "micropip");
      if (micropipFileName) {
        const normalizedBase = wheelsBaseUrl.endsWith("/") ? wheelsBaseUrl : `${wheelsBaseUrl}/`;
        await pyodide.loadPackage(`${normalizedBase}${micropipFileName}`, { checkIntegrity: false });
        micropipLoaded = true;
      }
    }
    if (!micropipLoaded) {
      await pyodide.loadPackage("micropip", { checkIntegrity: false });
    }

    setMicropip(pyodide.pyimport("micropip"));
    markBootstrapMetric("package_manager_end");
    measureBootstrapDuration("package_manager_ms", "package_manager_start", "package_manager_end");
  }

  return { loaded: true };
}

export async function loadPackage(packageName, options = {}) {
  const pyodide = getPyodide();

  if (!pyodide) {
    throw new Error("Pyodide not initialized");
  }

  const wheelsBaseUrl = getPackageBaseUrl();
  if (wheelsBaseUrl) {
    const manifest = await loadWheelsManifest(wheelsBaseUrl);
    const wheelFileName = pyodideWheelFileNameFromManifest(manifest, packageName);
    if (wheelFileName) {
      const normalizedBase = wheelsBaseUrl.endsWith("/") ? wheelsBaseUrl : `${wheelsBaseUrl}/`;
      await pyodide.loadPackage(`${normalizedBase}${wheelFileName}`, { ...options, checkIntegrity: false });
      installedPackages.add(packageName);
      return { loaded: packageName };
    }
  }

  await pyodide.loadPackage(packageName, { ...options, checkIntegrity: false });

  installedPackages.add(packageName);

  return { loaded: packageName };
}

export async function installPackage(packageName, wheelPath) {
  const pyodide = getPyodide();

  if (!pyodide) {
    throw new Error("Pyodide not initialized");
  }
  if (installedPackages.has(packageName)) {
    return { installed: packageName, alreadyInstalled: true };
  }
  let micropip = getMicropip();

  if (!micropip) {
    await loadPackageManager();

    micropip = getMicropip();
  }

  if (wheelPath) {

    await micropip.install(wheelPath);
  } else {

    await micropip.install(packageName);
  }

  installedPackages.add(packageName);

  return { installed: packageName };
}
export async function uninstallPackage(packageName) {
  const pyodide = getPyodide();

  const micropip = getMicropip();

  if (!pyodide) {
    throw new Error("Pyodide not initialized");
  }

  if (!micropip) {
    return { uninstalled: false, reason: "micropip not loaded" };
  }

  if (installedPackages.has(packageName)) {
    micropip.uninstall(packageName);

    installedPackages.delete(packageName);

    return { uninstalled: packageName };
  }

  return { uninstalled: false, reason: "package not installed" };
}

export async function installIfcOpenShell(iosWheelOrWheelsDir) {
  const pyodide = getPyodide();

  if (!pyodide) {
    throw new Error("Pyodide not initialized");
  }

  if (installedPackages.has("ifcopenshell")) {
    return { installed: "ifcopenshell", alreadyInstalled: true };
  }

  const wheelsDir = normalizeWheelsDirectoryUrl(iosWheelOrWheelsDir);
  setPackageBaseUrl(wheelsDir);

  const iosWheelUrl = iosWheelOrWheelsDir.endsWith(".whl")
    ? iosWheelOrWheelsDir
    : `${wheelsDir}${ifcOpenShellWasmRuntimeWheelFileName}`;

  self.postMessage({
    type: "progress",
    message: "Installing IfcOpenShell dependencies...",
  });

  const pipPackages = ifcOpenShellMicropipPipPackageNames;
  const wheelFiles = ifcOpenShellWheelFileNamesByMicropipPackageName;
  await loadPackageManager();
  const wheelsManifest = await loadWheelsManifest(wheelsDir);
  const preIfcPyodideLoadOrder = resolvePyodidePreIfcLoadOrder(wheelsManifest);
  let micropip = getMicropip();
  markBootstrapMetric("base_dependencies_start");
  for (let index = 0; index < preIfcPyodideLoadOrder.length; index++) {
    const packageName = preIfcPyodideLoadOrder[index];
    await loadPackage(packageName);
  }
  await Promise.all(pipPackages.map((dep) => installPackage(dep, `${wheelsDir}${wheelFiles[dep]}`)));
  markBootstrapMetric("base_dependencies_end");
  measureBootstrapDuration("base_dependencies_ms", "base_dependencies_start", "base_dependencies_end");
  self.postMessage({ type: "progress", message: "Installing IfcOpenShell..." });

  markBootstrapMetric("ifcopenshell_wheel_start");
  await micropip.install(iosWheelUrl);
  markBootstrapMetric("ifcopenshell_wheel_end");
  measureBootstrapDuration("ifcopenshell_wheel_ms", "ifcopenshell_wheel_start", "ifcopenshell_wheel_end");

  installedPackages.add("ifcopenshell");
  markBootstrapMetric("ifc_extensions_start");
  await installPackage("ifc5d", `${wheelsDir}${wheelFiles['ifc5d']}`);
  await installPackage("ifc4d", `${wheelsDir}${wheelFiles['ifc4d']}`);
  await installPackage("ifcedit", `${wheelsDir}${wheelFiles['ifcedit']}`);
  await installPackage("ifcquery", `${wheelsDir}${wheelFiles['ifcquery']}`);

  await installPackage("ifcopenshell-mcp", `${wheelsDir}${wheelFiles['ifcopenshell-mcp']}`);

  let pytestInstalled = false;

  const pytestWheelInManifest = Boolean(pyodideWheelFileNameFromManifest(wheelsManifest, "pytest"));
  const shouldLoadPytest =
    pytestWheelInManifest ||
    Boolean(wheelsManifest && wheelsManifest.pyodidePytestInManifest);

  if (shouldLoadPytest) {
    try {
      await loadPackage("pytest");
      pytestInstalled = true;
    } catch (error) {
      self.postMessage({
        type: "progress",
        message: `Optional package 'pytest' was not loaded (${error && error.message ? error.message : String(error)}). EXPRESS validation may be limited.`,
      });
    }
  }

  markBootstrapMetric("ifc_extensions_end");
  measureBootstrapDuration("ifc_extensions_ms", "ifc_extensions_start", "ifc_extensions_end");
  preIfcPyodideLoadOrder.forEach((packageName) => installedPackages.add(packageName));

  pipPackages.forEach(pkg => installedPackages.add(pkg));

  self.postMessage({ type: "progress", message: "IfcOpenShell installed!" });

  return {
    installed: "ifcopenshell",
    dependencies: [
      ...preIfcPyodideLoadOrder,
      ...pipPackages,
      "ifc5d",
      "ifc4d",
      "ifcedit",
      "ifcquery",
      "ifcopenshell-mcp",
      ...(pytestInstalled ? ["pytest"] : []),
    ],
    optionalMissing: shouldLoadPytest && !pytestInstalled ? ["pytest"] : [],
  };
}
