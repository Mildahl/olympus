import { Collection, _generateGuid } from "./Collection.js";

class NodeCollection {
  constructor(name = '', code = '', options = {}) {
    this.guid = options.guid || _generateGuid();

    this.name = name;

    this.icon = options.icon || 'code';

    this.nodeType = options.nodeType || 'code';

    this.shaderNode = options.shaderNode || null;

    this.properties = options.properties || [];

    this.children = options.children || [];

    this.code = code; 

    this.pythonCode = options.pythonCode || ''; 

    this.runCount = 0;

    this.frozen = false;

    this.output = '';

    this.language = options.language || 'javascript'; 
    this.inputs = options.inputs || [
      { name: 'Input', type: 'node' }
    ];

    this.outputs = options.outputs || [
      { name: 'Output', type: 'node' }
    ];
    this.position = options.position || null;
  }

  run(context, operators) {
    if (this.frozen) return;

    this.runCount++;

    const codeToRun = this.language === 'python' ? this.pythonCode : this.code;

    if (this.language === 'python') {
      operators.execute("code.run_python", context, codeToRun);
    } else {
      operators.execute("code.run_javascript", context, codeToRun);
    }
  }

  setOutput(output) {
    this.output = output;
  }

  toggleFrozen() {
    this.frozen = !this.frozen;
  }
  toJSON() {
    return {
      id: this.guid,
      name: this.name,
      icon: this.icon,
      nodeType: this.nodeType,
      shaderNode: this.shaderNode,
      properties: this.properties,
      children: this.children.map(child => child.toJSON ? child.toJSON() : child),
      code: this.code,
      pythonCode: this.pythonCode,
      inputs: this.inputs,
      outputs: this.outputs,
      position: this.position,
      language: this.language
    };
  }
}

class NodesCollection extends Collection {
  constructor(guid = null) {
    super();

    this.type = 'NodesCollection';

    this.guid = guid || _generateGuid();

    this.children = []; 
    this.connections = [];

    this.runCount = 0;

    this.name = 'Unnamed Nodes Collection';
  }

  /**
   * Add a connection between two nodes
   * @param {string} fromNodeGuid - Source node GUID
   * @param {string} toNodeGuid - Target node GUID  
   * @param {string} [fromPort='Output'] - Output port name on source node
   * @param {string} [toPort='Input'] - Input port name on target node
   */
  addConnection(fromNodeGuid, toNodeGuid, fromPort = 'Output', toPort = 'Input') {
    this.connections.push({
      from: fromNodeGuid,
      to: toNodeGuid,
      fromPort: fromPort,
      toPort: toPort
    });
  }

  /**
   * Remove a connection
   */
  removeConnection(fromNodeGuid, toNodeGuid) {
    this.connections = this.connections.filter(
      c => !(c.from === fromNodeGuid && c.to === toNodeGuid)
    );
  }

  saveData(data) {
    if (data) {
      this.children = data.children || [];
      this.connections = data.connections || [];
    }
    this.lastSave = new Date();
  }

  addNode(node) {
    this.children.push(node);
  }

  runAll(context, operators) {
    this.runCount++;

    for (const node of this.children) {
      node.run(context, operators);

      if (node.frozen) break;
    }
  }

  getNodeByName(name) {
    return this.children.find(n => n.name === name);
  }

  _generateGuid() {
    return _generateGuid();
  }

  toJSON() {
    return {
      guid: this.guid,
      type: this.type,
      children: this.children.map(child => child.toJSON()),
      connections: this.connections,
      runCount: this.runCount
    };
  }
}

export { NodeCollection, NodesCollection };
