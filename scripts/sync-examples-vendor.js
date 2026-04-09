import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repositoryRoot = path.resolve(__dirname, "..");
const examplesVendorRoot = path.join(repositoryRoot, "examples", "vendor");
const nodeModulesRoot = path.join(repositoryRoot, "node_modules");

const skipPyodide = process.argv.includes("--skip-pyodide");
const ifcopenshellWheelsOnly = process.argv.includes("--ifcopenshell-wheels-only");
const skipIfcopenshellWheels = process.argv.includes("--skip-ifcopenshell-wheels");

function readInstalledPackageVersion(packageRelativePath) {
  const packageJsonPath = path.join(nodeModulesRoot, packageRelativePath, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }
  const parsed = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const version = parsed && typeof parsed.version === "string" ? parsed.version.trim() : null;
  return version || null;
}

function pyodideFolderNameFromVersion(version) {
  if (!version) {
    return "v0.29.0";
  }
  return version.startsWith("v") ? version : `v${version}`;
}

function listIfcLitePackageNames(ifcLiteScopeAbsolutePath) {
  if (!fs.existsSync(ifcLiteScopeAbsolutePath)) {
    return [];
  }
  const entries = fs.readdirSync(ifcLiteScopeAbsolutePath, { withFileTypes: true });
  const names = [];
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    if (entry.isDirectory()) {
      names.push(entry.name);
    }
  }
  names.sort();
  return names;
}

function rmAndCopyDir(sourceAbsolutePath, destinationAbsolutePath) {
  if (!fs.existsSync(sourceAbsolutePath)) {
    console.warn(
      `[sync-examples-vendor] skip missing source: ${path.relative(repositoryRoot, sourceAbsolutePath)}`
    );
    return;
  }
  fs.mkdirSync(path.dirname(destinationAbsolutePath), { recursive: true });
  fs.rmSync(destinationAbsolutePath, { recursive: true, force: true });
  fs.cpSync(sourceAbsolutePath, destinationAbsolutePath, { recursive: true });
}

function ensureParentDir(fileAbsolutePath) {
  fs.mkdirSync(path.dirname(fileAbsolutePath), { recursive: true });
}

function copyFile(sourceAbsolutePath, destinationAbsolutePath) {
  if (!fs.existsSync(sourceAbsolutePath)) {
    console.warn(
      `[sync-examples-vendor] skip missing file: ${path.relative(repositoryRoot, sourceAbsolutePath)}`
    );
    return;
  }
  ensureParentDir(destinationAbsolutePath);
  fs.copyFileSync(sourceAbsolutePath, destinationAbsolutePath);
}

function copyLegacyIfcopenshellIfPresent() {
  const legacySource = path.join(repositoryRoot, "external", "vendor", "ifcopenshell");
  const destinationPath = path.join(examplesVendorRoot, "ifcopenshell");
  if (!fs.existsSync(legacySource)) {
    return;
  }
  rmAndCopyDir(legacySource, destinationPath);
  console.log(
    `[sync-examples-vendor] copied legacy external/vendor/ifcopenshell -> ${path.relative(repositoryRoot, destinationPath)}`
  );
}

function resolvePythonSpawnConfiguration() {
  const environmentPython = process.env.PYTHON && process.env.PYTHON.trim();
  if (environmentPython) {
    return { command: environmentPython, commandArgumentsPrefix: [] };
  }
  if (process.platform === "win32") {
    const launcherProbe = spawnSync("py", ["-3", "-c", "import sys; sys.exit(0)"], { encoding: "utf8" });
    if (!launcherProbe.error && launcherProbe.status === 0) {
      return { command: "py", commandArgumentsPrefix: ["-3"] };
    }
  }
  for (let index = 0; index < 2; index++) {
    const command = index === 0 ? "python3" : "python";
    const probe = spawnSync(command, ["-c", "import sys; sys.exit(0)"], { encoding: "utf8" });
    if (!probe.error && probe.status === 0) {
      return { command, commandArgumentsPrefix: [] };
    }
  }
  return null;
}

function syncIfcOpenShellWheelsDirectory() {
  if (skipIfcopenshellWheels) {
    console.log("[sync-examples-vendor] skipped IfcOpenShell wheels (--skip-ifcopenshell-wheels)");
    return;
  }
  const wheelsDirectoryPath = path.join(examplesVendorRoot, "ifcopenshell", "wheels");
  const installPythonDependenciesScriptPath = path.join(
    repositoryRoot,
    "scripts",
    "install_python_dependencies.py"
  );
  const pythonSpawnConfiguration = resolvePythonSpawnConfiguration();
  if (!pythonSpawnConfiguration) {
    console.warn(
      "[sync-examples-vendor] Python not found; skipped IfcOpenShell wheels download. Install Python or set PYTHON."
    );
    return;
  }
  if (!fs.existsSync(installPythonDependenciesScriptPath)) {
    console.warn(
      `[sync-examples-vendor] missing script: ${path.relative(repositoryRoot, installPythonDependenciesScriptPath)}`
    );
    return;
  }
  fs.mkdirSync(wheelsDirectoryPath, { recursive: true });
  const requirementsPath = path.join(repositoryRoot, "scripts", "ifcopenshell-wheels-requirements.txt");
  const childArguments = [
    ...pythonSpawnConfiguration.commandArgumentsPrefix,
    installPythonDependenciesScriptPath,
    "--destination",
    wheelsDirectoryPath,
    "--requirements",
    requirementsPath,
    "--repo-root",
    repositoryRoot,
  ];
  const spawnResult = spawnSync(pythonSpawnConfiguration.command, childArguments, {
    encoding: "utf8",
    cwd: repositoryRoot,
    maxBuffer: 20 * 1024 * 1024,
  });
  if (spawnResult.error) {
    console.warn(
      `[sync-examples-vendor] IfcOpenShell wheel download failed to start: ${spawnResult.error.message}`
    );
    return;
  }
  if (spawnResult.status !== 0) {
    console.warn(`[sync-examples-vendor] IfcOpenShell wheel download exited with code ${spawnResult.status}`);
    if (spawnResult.stderr) {
      console.warn(spawnResult.stderr);
    }
    if (spawnResult.stdout) {
      console.warn(spawnResult.stdout);
    }
    return;
  }
  if (spawnResult.stdout) {
    console.log(spawnResult.stdout.trimEnd());
  }
}

function main() {
  if (ifcopenshellWheelsOnly) {
    fs.mkdirSync(examplesVendorRoot, { recursive: true });
    syncIfcOpenShellWheelsDirectory();
    console.log(
      `[sync-examples-vendor] wheels-only done -> ${path.relative(repositoryRoot, examplesVendorRoot)}`
    );
    return;
  }

  fs.mkdirSync(examplesVendorRoot, { recursive: true });

  const monacoEditorVersion = readInstalledPackageVersion("monaco-editor") || "0.52.2";
  const pyodideFolderVersion = pyodideFolderNameFromVersion(
    readInstalledPackageVersion("pyodide")
  );

  rmAndCopyDir(path.join(nodeModulesRoot, "three"), path.join(examplesVendorRoot, "three"));
  rmAndCopyDir(
    path.join(nodeModulesRoot, "three-mesh-bvh"),
    path.join(examplesVendorRoot, "three-mesh-bvh")
  );
  rmAndCopyDir(
    path.join(nodeModulesRoot, "three-gpu-pathtracer"),
    path.join(examplesVendorRoot, "three-gpu-pathtracer")
  );
  rmAndCopyDir(
    path.join(nodeModulesRoot, "3d-tiles-renderer"),
    path.join(examplesVendorRoot, "3d-tiles-renderer")
  );

  const monacoMinSource = path.join(nodeModulesRoot, "monaco-editor", "min");
  const monacoDestination = path.join(
    examplesVendorRoot,
    "monaco-editor",
    monacoEditorVersion
  );
  rmAndCopyDir(monacoMinSource, monacoDestination);

  if (!skipPyodide) {
    const pyodideSource = path.join(nodeModulesRoot, "pyodide");
    const pyodideDestination = path.join(
      examplesVendorRoot,
      "pyodide",
      pyodideFolderVersion,
      "full"
    );
    rmAndCopyDir(pyodideSource, pyodideDestination);
  } else {
    console.log("[sync-examples-vendor] skipped pyodide (--skip-pyodide)");
  }

  const ifcLiteDestinationRoot = path.join(examplesVendorRoot, "ifc-lite");
  const ifcLiteSourceScope = path.join(nodeModulesRoot, "@ifc-lite");
  const ifcLitePackageNames = listIfcLitePackageNames(ifcLiteSourceScope);
  if (ifcLitePackageNames.length === 0) {
    console.warn("[sync-examples-vendor] node_modules/@ifc-lite not found; run npm install.");
  } else {
    fs.mkdirSync(ifcLiteDestinationRoot, { recursive: true });
    for (let index = 0; index < ifcLitePackageNames.length; index++) {
      const packageName = ifcLitePackageNames[index];
      const sourcePath = path.join(ifcLiteSourceScope, packageName);
      const destinationPath = path.join(ifcLiteDestinationRoot, packageName);
      rmAndCopyDir(sourcePath, destinationPath);
    }
  }

  copyFile(
    path.join(nodeModulesRoot, "signals", "dist", "signals.min.js"),
    path.join(examplesVendorRoot, "editor_deps", "signals.min.js")
  );

  copyFile(
    path.join(nodeModulesRoot, "@highlightjs", "cdn-assets", "highlight.min.js"),
    path.join(examplesVendorRoot, "highlightjs", "highlight.min.js")
  );
  copyFile(
    path.join(nodeModulesRoot, "@highlightjs", "cdn-assets", "styles", "github.min.css"),
    path.join(examplesVendorRoot, "highlightjs", "github.min.css")
  );

  copyFile(
    path.join(nodeModulesRoot, "showdown", "dist", "showdown.min.js"),
    path.join(examplesVendorRoot, "showdown", "showdown.min.js")
  );

  copyFile(
    path.join(nodeModulesRoot, "chart.js", "dist", "chart.umd.js"),
    path.join(examplesVendorRoot, "chart", "chart.js")
  );

  copyFile(
    path.join(nodeModulesRoot, "ag-grid-community", "dist", "ag-grid-community.min.js"),
    path.join(examplesVendorRoot, "ag-grid", "ag-grid-community.min.js")
  );
  copyFile(
    path.join(nodeModulesRoot, "ag-grid-community", "styles", "ag-grid.min.css"),
    path.join(examplesVendorRoot, "ag-grid", "ag-grid.min.css")
  );
  copyFile(
    path.join(nodeModulesRoot, "ag-grid-community", "styles", "ag-theme-quartz.min.css"),
    path.join(examplesVendorRoot, "ag-grid", "ag-theme-quartz.min.css")
  );

  copyFile(
    path.join(nodeModulesRoot, "jsgantt-improved", "dist", "jsgantt.js"),
    path.join(examplesVendorRoot, "jsgantt", "jsgantt.js")
  );
  copyFile(
    path.join(nodeModulesRoot, "jsgantt-improved", "dist", "jsgantt.css"),
    path.join(examplesVendorRoot, "jsgantt", "jsgantt.css")
  );

  rmAndCopyDir(
    path.join(nodeModulesRoot, "web-ifc"),
    path.join(examplesVendorRoot, "engine_web-ifc")
  );

  copyLegacyIfcopenshellIfPresent();
  syncIfcOpenShellWheelsDirectory();

  console.log(
    `[sync-examples-vendor] monaco-editor/${monacoEditorVersion} pyodide/${pyodideFolderVersion}/full`
  );
  console.log(
    `[sync-examples-vendor] done -> ${path.relative(repositoryRoot, examplesVendorRoot)}`
  );
}

main();
