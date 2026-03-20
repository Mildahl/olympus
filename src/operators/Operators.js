import registry from './ops.Registry.js';

/**
 * @typedef {Object} OperatorResult
 * @property {'FINISHED'|'CANCELLED'|'RUNNING'} status - Execution result status
 */

/**
 * @typedef {Object} OperatorClass
 * @property {string} operatorName - Unique operator identifier (e.g., 'theme.change_colors')
 * @property {string[]} [operatorOptions] - Options like ['REGISTER']
 */

/**
 * Operator registry and executor following the command pattern.
 * Manages registration and execution of operators.
 * 
 * @example
 * import { operators } from 'aeco';
 * 
 * // Execute an operator
 * const result = await operators.execute('theme.change_to_light', context);
 * 
 * // Register a custom operator
 * operators.add(MyCustomOperator);
 */
function Operators() {
  /**
   * The operator registry instance
   * @type {Object}
   */
  this.registry = registry;
}

Operators.prototype = {
  /**
   * Add an operator class to the registry
   * @param {OperatorClass} operatorClass - Operator class with static operatorName
   */
  add(operatorClass) {
    if (operatorClass.operatorOptions?.includes('REGISTER')) {
      this.registry.register(operatorClass);
    }
  },

  /**
   * Remove an operator class from the registry
   * @param {OperatorClass} operatorClass - Operator class to remove
   */
  remove(operatorClass) {
    this.registry.unregister(operatorClass);
  },

  /**
   * Execute an operator by its identifier
   * @param {string} idname - Operator identifier (e.g., 'theme.change_to_light')
   * @param {import('../context/index.js').Context} context - Application context
   * @param {...*} args - Additional arguments passed to operator constructor
   * @returns {OperatorResult|Promise<OperatorResult>} Execution result
   * @throws {Error} If operator not found
   * 
   * @example
   * // Execute with arguments
   * await operators.execute('bim.load_model', context, modelPath, options);
   */
  execute(idname, context, ...args) {
    const OperatorClass = this.registry.get(idname);

    if (!OperatorClass) {
      throw new Error(`Operator ${idname} not found`);
    }

    const operation = new OperatorClass(context, ...args);

    if (!operation.poll()) {
      console.warn(`Operator ${idname} poll failed`);

      return { status: "CANCELLED" };
    }

    if (OperatorClass.operatorOptions?.includes('SKIP_HISTORY')) {
      return operation.execute();
    }

    return context.editor.execute(operation);
  },

  /**
   * Poll whether an operator would run without executing it.
   * Instantiates the operator with the same constructor args as `execute` and returns `operation.poll()`.
   *
   * @param {string} idname - Operator identifier
   * @param {import('../context/index.js').Context} context - Application context
   * @param {...*} args - Constructor arguments (same as `execute`)
   * @returns {boolean}
   * @throws {Error} If operator not found
   */
  canExecute(idname, context, ...args) {
    const OperatorClass = this.registry.get(idname);

    if (!OperatorClass) {
      throw new Error(`Operator ${idname} not found`);
    }

    const operation = new OperatorClass(context, ...args);

    return Boolean(operation.poll());
  },

  /**
   * Register operators from module definitions
   * @param {Array<{id: string, operators: OperatorClass[]}>} moduleDefinitions - Module definitions
   * @param {string[]} activeIds - IDs of active modules
   */
  registerModuleOperators(moduleDefinitions, activeIds) {

    for (const moduleDef of moduleDefinitions) {
      if (!activeIds.includes(moduleDef.id)) continue;

      for (const op of moduleDef.operators || []) {
        this.add(op);
      }
    }

  }
}

const operators = new Operators();

export default operators;