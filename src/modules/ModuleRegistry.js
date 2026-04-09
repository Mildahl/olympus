class ModuleRegistry {
  constructor() {
    this.modules = new Map();

    this.activeModules = new Set();

    this.uiInstances = new Map();
  }

  register(moduleDefinition) {
    if (!moduleDefinition) {
      console.error('[ModuleRegistry] Attempted to register undefined module definition');

      return;
    }

    let { id, name, dependsOn = [], operators = [], ui = [], description = '', version = '1.0.0' } = moduleDefinition;

    if (!Array.isArray(ui)) {
      ui = [ui];
    }

    ui = ui.flat();

    if (!id || !name) {
      console.error('[ModuleRegistry] Module must have an id and name. Got:', moduleDefinition);

      return;
    }

    if (this.modules.has(id)) {
      console.warn(`Module "${id}" is already registered. Skipping.`);

      return;
    }

    const validDependsOn = (dependsOn || []).filter(dep => {
      if (!dep) {
        console.warn(`[ModuleRegistry] Module "${id}" has invalid dependency (undefined/null)`);

        return false;
      }

      return true;
    });

    this.modules.set(id, {
      id,
      name,
      dependsOn: validDependsOn,
      operators,
      ui,
      description,
      version,
      isActive: false,
    });
  }

  unregister(id) {
    if (this.activeModules.has(id)) {
      this.deactivate(id);
    }

    this.modules.delete(id);
  }

  get(id) {
    return this.modules.get(id);
  }

  has(id) {
    return this.modules.has(id);
  }

  list() {
    return Array.from(this.modules.keys());
  }

  listActive() {
    return Array.from(this.activeModules);
  }

  resolveLoadOrder(moduleIds) {
    const visited = new Set();

    const visiting = new Set();

    const order = [];

    const visit = (id) => {
      if (!id) {
        console.warn('[ModuleRegistry] Skipping undefined/null module ID in dependency resolution');

        return;
      }
      
      if (visited.has(id)) return;

      if (visiting.has(id)) {
        throw new Error(`Circular dependency detected involving module: ${id}`);
      }

      const module = this.modules.get(id);

      if (!module) {
        console.warn(`[ModuleRegistry] Module "${id}" not found, skipping dependency`);

        return;
      }

      visiting.add(id);

      const validDeps = (module.dependsOn || []).filter(depId => {
        if (!depId) {
          console.warn(`[ModuleRegistry] Module "${id}" has undefined dependency in dependsOn array`);

          return false;
        }

        return true;
      });

      for (const depId of validDeps) {
        if (moduleIds.includes(depId) || this.modules.has(depId)) {
          visit(depId);
        }
      }

      visiting.delete(id);

      visited.add(id);

      order.push(id);
    };

    for (const id of moduleIds) {
      visit(id);
    }

    return order;
  }

  getAllDependencies(ids) {
    const all = new Set();

    const toProcess = [...ids];

    while (toProcess.length > 0) {
      const id = toProcess.shift();

      if (all.has(id)) continue;

      all.add(id);

      const module = this.modules.get(id);

      if (module) {
        for (const dep of module.dependsOn) {
          if (!all.has(dep)) {
            toProcess.push(dep);
          }
        }
      }
    }

    return Array.from(all);
  }

  checkDependencies(id) {
    const module = this.modules.get(id);

    if (!module) return false;

    for (const depId of module.dependsOn) {
      if (!this.activeModules.has(depId)) {
        console.warn(`[ModuleRegistry] Module "${id}" requires "${depId}" which is not active`);

        return false;
      }
    }

    return true;
  }

  activate(id, args, options = {}) {
    const module = this.modules.get(id);

    if (!module) {
      console.error(`[ModuleRegistry] Cannot activate unknown module: ${id}`);

      return false;
    }

    if (this.activeModules.has(id)) {
      return true;
    }

    if (!this.checkDependencies(id)) {
      console.error(`[ModuleRegistry] Cannot activate "${id}": missing dependencies`);

      return false;
    }

    const loadUI = options.loadUI !== false;

    if (loadUI && args && module.ui.length > 0) {
      for (const UIClass of module.ui) {

        const instance = new UIClass(args);

        const className = UIClass.name || UIClass.constructor?.name;

        this.uiInstances.set(`${id}:${className}`, instance);
      }
    }

    module.isActive = true;

    this.activeModules.add(id);

    return true;
  }

  deactivate(id) {
    const module = this.modules.get(id);

    if (!module) {
      console.error(`[ModuleRegistry] Cannot deactivate unknown module: ${id}`);

      return false;
    }

    if (!this.activeModules.has(id)) {
      return true;
    }

    for (const [otherId, otherModule] of this.modules) {
      if (this.activeModules.has(otherId) && otherModule.dependsOn.includes(id)) {
        console.error(`[ModuleRegistry] Cannot deactivate "${id}": "${otherId}" depends on it`);

        return false;
      }
    }

    for (const [key, instance] of this.uiInstances) {
      if (key.startsWith(`${id}:`)) {
        if (typeof instance.destroy === 'function') {
          instance.destroy();
        }

        this.uiInstances.delete(key);
      }
    }

    module.isActive = false;

    this.activeModules.delete(id);

    return true;
  }

  activateFromConfig(moduleConfigs, args, options = {}) {
    const initialActiveIds = moduleConfigs
      .filter(config => config.active !== false)
      .map(config => config.id)
      .filter(id => id !== null && id !== undefined);

    const explicitlyDisabledIds = new Set(
      moduleConfigs
        .filter(config => config.active === false && config.id != null)
        .map(config => config.id)
    );

    const configById = new Map(
      moduleConfigs
        .filter(config => config.id != null)
        .map(config => [config.id, config])
    );

    const uiDisabledFromUIConfig = new Set(options.uiDisabledModuleIds || []);

    // Full dependency closure activates required deps even when active: false (operators only).
    // UI for those ids is still skipped when explicitlyDisabledIds or ui config disables it.
    const allIdsToActivate = this.getAllDependencies(initialActiveIds).filter(
      (id) => this.modules.has(id)
    );

    const orderedIds = this.resolveLoadOrder(allIdsToActivate);

    for (const id of orderedIds) {
      const config = configById.get(id);

      const loadUIFromConfig = config && config.ui === false ? false : true;

      const loadUI = loadUIFromConfig
        && !uiDisabledFromUIConfig.has(id)
        && !explicitlyDisabledIds.has(id);

      this.activate(id, args, { loadUI });
    }

    return orderedIds;
  }

  getUIInstance(moduleId, className) {
    return this.uiInstances.get(`${moduleId}:${className}`);
  }

  getModuleUIInstances(moduleId) {
    const instances = [];

    for (const [key, instance] of this.uiInstances) {
      if (key.startsWith(`${moduleId}:`)) {
        instances.push(instance);
      }
    }

    return instances;
  }

  /**
   * Log to console: all active modules (core + addons) and their registered UI panels.
   */
  logActiveModulesAndUI() {
    const activeIds = this.listActive();

    const uiByModule = new Map();

    for (const key of this.uiInstances.keys()) {
      const [moduleId, className] = key.split(':');

      if (!uiByModule.has(moduleId)) uiByModule.set(moduleId, []);

      uiByModule.get(moduleId).push(className);
    }

    console.group('[ModuleRegistry] Active modules');

    for (const id of activeIds) {
      const m = this.modules.get(id);

      const name = m ? m.name : id;

      const uiPanels = uiByModule.get(id);

      const uiLabel = uiPanels && uiPanels.length ? ` → UI: ${uiPanels.join(', ')}` : ' (no UI loaded)';

      console.log(`  ${id} (${name})${uiLabel}`);
    }

    console.groupEnd();

    console.group('[ModuleRegistry] Registered UI panels');

    for (const [key] of this.uiInstances) {
      console.log(`  ${key}`);
    }

    console.groupEnd();
  }

}

const moduleRegistry = new ModuleRegistry();

export { ModuleRegistry, moduleRegistry };

export default moduleRegistry;
