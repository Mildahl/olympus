import { coreModuleManifest, coreModuleManifestById } from "./coreModuleManifest.js";

const bundleNamespaceCache = Object.create(null);

function getAllCoreModuleDependenciesFromManifest(seedIds) {
  const all = new Set();

  const queue = [];

  for (let s = 0; s < seedIds.length; s++) {
    const id = seedIds[s];

    if (id == null) {
      continue;
    }

    if (!coreModuleManifestById.has(id)) {
      continue;
    }

    if (!all.has(id)) {
      all.add(id);

      queue.push(id);
    }
  }

  while (queue.length > 0) {
    const currentId = queue.shift();

    const entry = coreModuleManifestById.get(currentId);

    if (!entry) {
      continue;
    }

    const deps = entry.dependsOn || [];

    for (let d = 0; d < deps.length; d++) {
      const depId = deps[d];

      if (!depId) {
        continue;
      }

      if (!coreModuleManifestById.has(depId)) {
        continue;
      }

      if (!all.has(depId)) {
        all.add(depId);

        queue.push(depId);
      }
    }
  }

  return Array.from(all);
}

export function resolveCoreModuleLoadOrder(moduleIds) {
  const visited = new Set();

  const visiting = new Set();

  const order = [];

  const visit = (id) => {
    if (!id) {
      return;
    }

    if (visited.has(id)) {
      return;
    }

    if (visiting.has(id)) {
      throw new Error(`Circular dependency detected involving core module: ${id}`);
    }

    const entry = coreModuleManifestById.get(id);

    if (!entry) {
      console.warn(`[coreModuleLoader] Core module "${id}" not in manifest, skipping`);

      return;
    }

    visiting.add(id);

    const deps = entry.dependsOn || [];

    for (let i = 0; i < deps.length; i++) {
      const depId = deps[i];

      if (!depId) {
        continue;
      }

      if (moduleIds.includes(depId)) {
        visit(depId);
      }
    }

    visiting.delete(id);

    visited.add(id);

    order.push(id);
  };

  for (let m = 0; m < moduleIds.length; m++) {
    visit(moduleIds[m]);
  }

  return order;
}

async function ensureBundleLoaded(bundleKey) {
  const cached = bundleNamespaceCache[bundleKey];

  if (cached) {
    return cached;
  }

  let namespace;

  if (bundleKey === "world") {
    namespace = await import(
      /* webpackChunkName: "modules-world" */
      /* webpackMode: "lazy" */
      "./coreModuleBundles/worldBundle.js"
    );
  } else if (bundleKey === "shell") {
    namespace = await import(
      /* webpackChunkName: "modules-shell" */
      /* webpackMode: "lazy" */
      "./coreModuleBundles/shellBundle.js"
    );
  } else if (bundleKey === "code") {
    namespace = await import(
      /* webpackChunkName: "modules-code" */
      /* webpackMode: "lazy" */
      "./coreModuleBundles/codeBundle.js"
    );
  } else if (bundleKey === "bim") {
    namespace = await import(
      /* webpackChunkName: "modules-bim" */
      /* webpackMode: "lazy" */
      "./coreModuleBundles/bimBundle.js"
    );
  } else {
    throw new Error(`Unknown core module bundle: ${bundleKey}`);
  }

  bundleNamespaceCache[bundleKey] = namespace;

  return namespace;
}

export async function loadCoreModuleDefinition(moduleId) {
  const entry = coreModuleManifestById.get(moduleId);

  if (!entry) {
    throw new Error(`Not a known core module id: ${moduleId}`);
  }

  const namespace = await ensureBundleLoaded(entry.bundle);

  return namespace.getCoreModuleDefinition(moduleId);
}

export async function loadAndRegisterCoreModules(moduleRegistry, initialActiveIds) {
  const closureIds = getAllCoreModuleDependenciesFromManifest(initialActiveIds);

  const orderedIds = resolveCoreModuleLoadOrder(closureIds);

  const loadedDefinitions = [];

  for (let i = 0; i < orderedIds.length; i++) {
    const moduleId = orderedIds[i];

    const definition = await loadCoreModuleDefinition(moduleId);

    moduleRegistry.register(definition);

    loadedDefinitions.push(definition);
  }

  return { orderedIds, loadedDefinitions };
}

export function coreModuleClosureNeedsBimTools(closureIds) {
  for (let i = 0; i < closureIds.length; i++) {
    const id = closureIds[i];

    if (id != null && String(id).indexOf("bim.") === 0) {
      return true;
    }
  }

  return false;
}

export async function ensureCoreModulesRegisteredForIds(moduleRegistry, seedIds) {
  const closureIds = getAllCoreModuleDependenciesFromManifest(seedIds);

  const orderedIds = resolveCoreModuleLoadOrder(closureIds);

  for (let i = 0; i < orderedIds.length; i++) {
    const moduleId = orderedIds[i];

    if (moduleRegistry.has(moduleId)) {
      continue;
    }

    const definition = await loadCoreModuleDefinition(moduleId);

    moduleRegistry.register(definition);
  }

  return { orderedIds, closureIds };
}

export { coreModuleManifest, coreModuleManifestById, getAllCoreModuleDependenciesFromManifest };
