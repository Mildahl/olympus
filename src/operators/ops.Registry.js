function opsRegistry() {

  this.operators = new Map();

}

opsRegistry.prototype = {
  register(operatorClass) {

    const idname = operatorClass.operatorName;

    if (!idname) {

      throw new Error(`Operator ${operatorClass.name} has no operatorName`);
    }

    this.operators.set(idname, operatorClass);
  },
  unregister(operatorClass) {
    const idname = operatorClass.operatorName;

    this.operators.delete(idname);
  },
  get(idname) {
    return this.operators.get(idname);
  },
  list() {
    return Array.from(this.operators.keys());
  },
  has(idname) {
    return this.operators.has(idname);
  }
}

const registry = new opsRegistry();
export default registry;