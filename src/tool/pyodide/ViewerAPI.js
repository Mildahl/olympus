/**
 * ViewerAPI - Exposes AECO JavaScript operators, tools and core to Python via Pyodide
 * 
 * Usage in Python:
 *   from viewer import tools, operators, core
 *   
 *   # Access world tools
 *   tools.scene.selectObjectsByGuid([guid1, guid2])
 *   
 *   # Execute operators
 *   operators.execute("layer.new", {"name": "My Layer"})
 * 
 * Note: This class stores references to tools, operators, and core but doesn't import them
 * directly to avoid circular dependencies. They are injected during initialization.
 */

class ViewerAPI {
  static _initialized = false;

  static _tools = null;

  static _operators = null;

  static _core = null;

  static _context = null;

  /**
   * Initialize ViewerAPI with AECO context and dependencies
   * This should be called once during application startup
   */
  static initialize({ tools, operators, core, context }) {
    if (ViewerAPI._initialized) {
      console.warn('[ViewerAPI] Already initialized');

      return;
    }

    ViewerAPI._tools = tools;

    ViewerAPI._operators = operators;

    ViewerAPI._core = core;

    ViewerAPI._context = context;

    ViewerAPI._initialized = true;
  }

  /**
   * Build registry of available methods for the worker
   * This creates a flat map of namespace.method -> function info
   */
  static getRegistry() {
    if (!ViewerAPI._initialized) ViewerAPI.initialize();
    
    const registry = {
      tools: ViewerAPI._buildToolsRegistry(),
      operators: ViewerAPI._buildOperatorsRegistry(),
      core: ViewerAPI._buildCoreRegistry(),
    };

    return registry;
  }

  /**
   * Get API definitions for Monaco IntelliSense
   * Returns structured definitions with signatures and documentation
   */
  static getIntelliSenseDefinitions() {
    if (!ViewerAPI._initialized) ViewerAPI.initialize();
    
    const definitions = {
      tools: {},
      operators: {},
      core: {}
    };

    const tools = ViewerAPI._tools;
    
    if (tools.world) {
      for (const [toolName, toolClass] of Object.entries(tools.world)) {
        if (!toolClass) continue;
        
        const isClass = typeof toolClass === 'function';

        const target = isClass ? toolClass : toolClass.constructor || toolClass;
        
        const methods = Object.getOwnPropertyNames(target)
          .filter(name => {
            if (name === 'constructor' || name === 'prototype' || name === 'length' || name === 'name') return false;

            try {
              return typeof target[name] === 'function';
            } catch (e) {
              return false;
            }
          });
        
        for (const methodName of methods) {
          const key = `tools.world.${toolName}.${methodName}`;

          definitions.tools[key] = {
            signature: ViewerAPI._extractSignature(target[methodName], methodName),
            description: `${toolName}.${methodName} - World tool method`
          };
        }
      }
    }

    if (tools.bim) {
      for (const [toolName, toolClass] of Object.entries(tools.bim)) {
        if (!toolClass) continue;
        
        const isClass = typeof toolClass === 'function';

        const target = isClass ? toolClass : toolClass.constructor || toolClass;
        
        const methods = Object.getOwnPropertyNames(target)
          .filter(name => {
            if (name === 'constructor' || name === 'prototype' || name === 'length' || name === 'name') return false;

            try {
              return typeof target[name] === 'function';
            } catch (e) {
              return false;
            }
          });
        
        for (const methodName of methods) {
          const key = `tools.bim.${toolName}.${methodName}`;

          definitions.tools[key] = {
            signature: ViewerAPI._extractSignature(target[methodName], methodName),
            description: `${toolName}.${methodName} - BIM tool method`
          };
        }
      }
    }
    const operators = ViewerAPI._operators;

    if (operators) {
      const prototype = Object.getPrototypeOf(operators);

      if (prototype && prototype !== Object.prototype) {
        const methods = Object.getOwnPropertyNames(prototype)
          .filter(name => {
            if (name === 'constructor') return false;

            try {
              return typeof prototype[name] === 'function';
            } catch (e) {
              return false;
            }
          });
        
        for (const methodName of methods) {
          const key = `operators.${methodName}`;

          definitions.operators[key] = {
            signature: ViewerAPI._extractSignature(prototype[methodName], methodName),
            description: `Execute operator: ${methodName}`
          };
        }
      }
    }
    const core = ViewerAPI._core;

    if (core) {
      for (const [moduleName, moduleObj] of Object.entries(core)) {
        if (!moduleObj || typeof moduleObj !== 'object') continue;
        
        for (const [funcName, func] of Object.entries(moduleObj)) {
          if (typeof func !== 'function') continue;
          
          const key = `core.${moduleName}.${funcName}`;

          definitions.core[key] = {
            signature: ViewerAPI._extractSignature(func, funcName),
            description: `${moduleName}.${funcName} - Core function`
          };
        }
      }
    }

    return definitions;
  }

  /**
   * Extract function signature for IntelliSense
   * @private
   */
  static _extractSignature(func, name) {
    if (!func) return `${name}()`;
    
    try {
      const funcStr = func.toString();

      const match = funcStr.match(/\(([^)]*)\)/);

      if (match) {
        const params = match[1]
          .split(',').map(p => p.trim())
          .filter(p => p && !p.startsWith('{')) 
          .map(p => {
            
            const paramName = p.split('=')[0].trim();

            return paramName;
          })
          .filter(Boolean);
        
        return `${name}(${params.join(', ')})`;
      }
    } catch (e) {
      
    }
    
    return `${name}()`;
  }

  /**
   * Build registry for tools namespace
   * Maps tools.world.scene.method
   */
  static _buildToolsRegistry() {
    const registry = {};

    const tools = ViewerAPI._tools;

    const toolCategories = ['world', 'bim', 'code'];

    for (const category of toolCategories) {
      if (!tools[category]) continue;

      for (const [toolName, toolClass] of Object.entries(tools[category])) {
      if (!toolClass) continue;
      
      const isClass = typeof toolClass === 'function';

      const target = isClass ? toolClass : toolClass.constructor || toolClass;
      
      const staticMethods = Object.getOwnPropertyNames(target)
        .filter(name => {
        if (name === 'prototype' || name === 'constructor' || name === 'length' || name === 'name') return false;

        try {
          return typeof target[name] === 'function';
        } catch (e) {
          return false;
        }
        });

      for (const methodName of staticMethods) {
        const key = `${category}.${toolName}.${methodName}`;

        registry[key] = {
        namespace: 'tools',
        path: [category, toolName],
        method: methodName,
        };
      }
      }
    }

    return registry;
  }

  /**
   * Build registry for operators namespace
   * Maps operators.execute, operators.add, etc.
   */
  static _buildOperatorsRegistry() {
    const registry = {};

    const prototype = Object.getPrototypeOf(ViewerAPI._operators);

    const prototypeNames = (prototype && prototype !== Object.prototype)
      ? Object.getOwnPropertyNames(prototype)
      : [];

    for (const name of prototypeNames) {
      if (name === 'constructor') continue;

      registry[name] = {
        namespace: 'operators',
        path: [],
        method: name,
      };
    }

    return registry;
  }

  /**
   * Build registry for core namespace
   * Maps core.World.*, core.Scripting.*, etc.
   */
  static _buildCoreRegistry() {
    const registry = {};

    for (const [moduleName, moduleObj] of Object.entries(ViewerAPI._core)) {

      if (!moduleObj && typeof !moduleObj === 'object') {
        continue 
      }

      for (const [funcName, func] of Object.entries(moduleObj)) {
        
          registry[`${moduleName}.${funcName}`] = {
            namespace: 'core',
            path: [moduleName],
            method: funcName,
          };
      }
    }

    return registry;
  }

  /**
   * Execute a method from the registry
   * Called from main thread when worker requests method execution
   */
  static async executeMethod(namespace, path, method, args = []) {
    if (!ViewerAPI._initialized) {
      throw new Error('[ViewerAPI] Not initialized');
    }

    let target;

    switch (namespace) {
      case 'tools':
        target = ViewerAPI._tools;

        for (const segment of path) {
          target = target[segment];

          if (!target) throw new Error(`Invalid path: tools.${path.join('.')}`);
        }

        break;

      case 'operators':
        target = ViewerAPI._operators;

        if (method === 'execute' && args.length >= 1) {

          const context = ViewerAPI._context;

          args = [args[0], context, ...args.slice(1)];
        }

        break;

      case 'core':
        target = ViewerAPI._core;

        for (const segment of path) {
          target = target[segment];

          if (!target) throw new Error(`Invalid path: core.${path.join('.')}`);
        }

        break;

      default:
        throw new Error(`Unknown namespace: ${namespace}`);
    }

    const func = target[method];

    if (typeof func !== 'function') {
      throw new Error(`Method not found: ${namespace}.${path.join('.')}.${method}`);
    }
    let result;

    if (namespace === 'core') {
      const options = {
        context: ViewerAPI._context,
        signals: ViewerAPI._context.signals,
        pythonTool: ViewerAPI._tools.code.pyWorker,
        jsTool: ViewerAPI._tools.code.js,
        codeTool: ViewerAPI._tools.code.editor,
        operators: ViewerAPI._operators,
        ...args[args.length - 1] 
      };

      const coreArgs = args.length > 0 && typeof args[args.length - 1] === 'object' 
        ? [...args.slice(0, -1), options]
        : [...args, options];

      result = await func(...coreArgs);

    } else if (namespace === 'tools') {

      const context = ViewerAPI._context;

      result = await func.call(target, context, ...args); 
    } else {

      result = await func.call(target, ...args);
    }

    return result;
  }
}
export default ViewerAPI;
