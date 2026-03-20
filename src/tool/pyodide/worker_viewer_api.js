import { getPyodide, ifc } from './worker_state.js';
import { serializeForPostMessage } from './worker_core.js';

function resolveIfcEntityRef(ref) {
  if (!ref || !ref.__ifcEntityRef__) return ref;

  try {
    const globalId = ref.globalId;

    const modelName = ref.modelName;

    if (!globalId) {
      return null;
    }

    let model = null;

    if (modelName && ifc['context']) {
      try {
        model = ifc['context'].get(modelName);
      } catch (e) {
      }
    }

    if (!model && ifc['context']) {
      try {
        const available = ifc['context'].list_models();

        if (available && available.length > 0) {
          for (let i = 0; i < available.length; i++) {
            const mName = available[i];

            const m = ifc['context'].get(mName);

            if (m) {
              const entity = m.by_guid(globalId);

              if (entity) {
                return entity;
              }
            }
          }
        }
      } catch (e) {
      }
    }

    if (model) {
      return model.by_guid(globalId);
    }

    return null;
  } catch (error) {
    return null;
  }
}

function resolveIfcEntityRefsArray(ref) {
  if (!ref || !ref.__ifcEntityRefsArray__) return ref;

  try {
    const globalIds = ref.globalIds || [];

    const modelName = ref.modelName;

    if (globalIds.length === 0) {
      return [];
    }

    let model = null;

    if (modelName && ifc['context']) {
      try {
        model = ifc['context'].get(modelName);
      } catch (e) {
      }
    }

    if (!model && ifc['context']) {
      try {
        const available = ifc['context'].list_models();

        if (available && available.length > 0) {
          model = ifc['context'].get(available[0]);
        }
      } catch (e) {
      }
    }

    if (!model) {
      return [];
    }

    const entities = [];

    for (const globalId of globalIds) {
      try {
        const entity = model.by_guid(globalId);

        if (entity) {
          entities.push(entity);
        }
      } catch (e) {
      }
    }

    return entities;
  } catch (error) {
    return [];
  }
}

function processResultForPython(result) {
  if (result === null || result === undefined) {
    return result;
  }

  if (result.__ifcEntityRef__) {
    const resolved = resolveIfcEntityRef(result);

    return resolved;
  }

  if (result.__ifcEntityRefsArray__) {
    const resolved = resolveIfcEntityRefsArray(result);

    return resolved;
  }

  return result;
}

export function registerViewerAPI(registry) {
  const pyodide = getPyodide();

  const toolsProxy = createToolsProxy(registry.tools);

  const operatorsProxy = createOperatorsProxy(registry.operators);

  pyodide.registerJsModule("viewer", {
    ifc,
    tools: toolsProxy,
    operators: operatorsProxy,
  });

  return true;
}

function createToolsProxy(toolsRegistry) {
  if (!toolsRegistry) return {};

  return buildNestedProxy(toolsRegistry, 'tools');
}

function buildNestedProxy(registry, namespace) {
  const result = {};

  for (const [fullPath, info] of Object.entries(registry)) {
    const pathParts = fullPath.split('.');

    const methodName = pathParts.pop();

    const parent = pathParts.reduce((obj, part) => {
      obj[part] = obj[part] || {};

      return obj[part];
    }, result);

    parent[methodName] = createProxyMethod(namespace, info.path, info.method);
  }

  return result;
}

function createOperatorsProxy(operatorsRegistry) {
  if (!operatorsRegistry) return {};

  const proxy = {};

  for (const [methodName, info] of Object.entries(operatorsRegistry)) {
    proxy[methodName] = createProxyMethod('operators', info.path, info.method);
  }

  return proxy;
}

function createCoreProxy(coreRegistry) {
  if (!coreRegistry) return {};

  const groups = {};

  for (const [fullPath, info] of Object.entries(coreRegistry)) {
    const pathParts = fullPath.split('.');

    let current = groups;

    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];

      if (!current[part]) {
        current[part] = {};
      }

      current = current[part];
    }

    const methodName = pathParts[pathParts.length - 1];

    current[methodName] = createProxyMethod('core', info.path, info.method);
  }

  return groups;
}

function isIfcEntity(obj) {
  if (!obj || typeof obj !== 'object') return false;

  return typeof obj.is_a === 'function';
}

function serializeIfcEntity(entity) {
  return {
    __ifcProxy__: true,
    GlobalId: entity.GlobalId,
    Name: entity.Name || null,
    type: entity.is_a(),
    id: entity.id || null,
  };
}

let workerObjectRegistry = new Map();

function createProxyMethod(namespace, path, method) {
  const serializedArgs = (args) => args.map(arg => {
    if (isIfcEntity(arg)) return serializeIfcEntity(arg);

    if (arg && typeof arg === 'object' && (
      arg.isObject3D ||
      arg.isMesh ||
      arg.isGroup ||
      arg.isScene ||
      arg.type === "Group" ||
      arg.type === "Mesh" ||
      arg.type === "Scene"
    )) {
      const refId = `__obj_ref_${Math.random().toString(36).substring(7)}`;

      workerObjectRegistry.set(refId, arg);

      return {
        __isObjectRef: true,
        refId,
        type: arg.type || "Object3D",
        name: arg.name || "",
      };
    }

    if (arg && typeof arg.toJs === 'function') {
      return arg.toJs({ dict_converter: Object.fromEntries });
    }

    return serializeForPostMessage(arg);
  });

  const proxyMethod = async function(...args) {
    const requestId = Math.random().toString(36).substring(7);

    const rawResult = await new Promise((resolve, reject) => {
      const handler = (event) => {
        const data = event.data;

        if (data.id === requestId) {
          self.removeEventListener('message', handler);

          if (data.success) {
            resolve(data.result);
          } else {
            reject(new Error(data.error?.message || 'Unknown error'));
          }
        }
      };

      self.addEventListener('message', handler);

      self.postMessage({
        id: requestId,
        type: 'executeViewerMethod',
        payload: {
          namespace,
          path,
          method,
          args: serializedArgs(args),
        },
      });

      setTimeout(() => {
        self.removeEventListener('message', handler);

        reject(new Error('Method execution timeout'));
      }, 30000);
    });

    const processedResult = processResultForPython(rawResult);

    return processedResult;
  };

  return proxyMethod;
}
