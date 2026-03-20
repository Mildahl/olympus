import {
  getPyodide, getMicropip, setMicropip, installedPackages
} from './worker_state.js';

export async function loadPackageManager() {
  const pyodide = getPyodide();

  if (!pyodide) {
    throw new Error("Pyodide not initialized");
  }

  if (!getMicropip()) {
    await pyodide.loadPackage("micropip", { checkIntegrity: false });

    setMicropip(pyodide.pyimport("micropip"));
  }

  return { loaded: true };
}

/**
 * Load a built-in Pyodide package
 */
export async function loadPackage(packageName, options = {}) {
  const pyodide = getPyodide();
  
  if (!pyodide) {
    throw new Error("Pyodide not initialized");
  }

  await pyodide.loadPackage(packageName, { ...options, checkIntegrity: false });

  installedPackages.add(packageName);

  return { loaded: packageName };
}

/**
 * Install a package via micropip or from wheel
 */
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

  await loadPackageManager();
  const wheelsDir = iosWheelOrWheelsDir.endsWith(".whl")
    ? iosWheelOrWheelsDir.replace(/\/[^/]+\.whl$/i, "/")
    : iosWheelOrWheelsDir.endsWith("/")
      ? iosWheelOrWheelsDir
      : iosWheelOrWheelsDir + "/";

  const iosWheelUrl = iosWheelOrWheelsDir.endsWith(".whl")
    ? iosWheelOrWheelsDir
    : wheelsDir + "ifcopenshell-0.8.4+1492a66-cp313-cp313-emscripten_4_0_9_wasm32.whl";
    
  self.postMessage({
    type: "progress",
    message: "Installing IfcOpenShell dependencies...",
  });

  const deps1 = ["shapely"];

  const pipPackages = [
    "typing-extensions",
    "python-dateutil",
    "isodate",
    "lark",
  ];

  const wheelFiles = {
    'typing-extensions': 'typing_extensions-4.15.0-py3-none-any.whl',
    'python-dateutil': 'python_dateutil-2.9.0.post0-py2.py3-none-any.whl',
    'isodate': 'isodate-0.7.2-py3-none-any.whl',
    'lark': 'lark-1.3.1-py3-none-any.whl',
    'ifc5d': 'ifc5d-0.8.4-py3-none-any.whl',
    'ifc4d': 'ifc4d-0.8.4-py3-none-any.whl',
  };
  let micropip = getMicropip();
  await Promise.all(deps1.map((pkg) => loadPackage(pkg)));
  await Promise.all(pipPackages.map((dep) => installPackage(dep, `${wheelsDir}${wheelFiles[dep]}`)));
  self.postMessage({ type: "progress", message: "Installing IfcOpenShell..." });

  await micropip.install(iosWheelUrl);

  installedPackages.add("ifcopenshell");
  await installPackage("ifc5d", `${wheelsDir}${wheelFiles['ifc5d']}`);

  await installPackage("ifc4d", `${wheelsDir}${wheelFiles['ifc4d']}`);
  deps1.forEach(pkg => installedPackages.add(pkg));

  pipPackages.forEach(pkg => installedPackages.add(pkg));

  self.postMessage({ type: "progress", message: "IfcOpenShell installed!" });

  return {
    installed: "ifcopenshell",
    dependencies: [...deps1, ...pipPackages],
  };
}
