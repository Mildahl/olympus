/**
 * Nodes Core Functions
 * 
 * Core business logic for visual node-based programming.
 * These functions are called by operators and should remain decoupled from UI.
 */
import dataStore from '../data/index.js';

import { nodesTemplate, pythonNodeTemplate, ifcQueryTemplate, dataProcessingTemplate } from '../modules/code/data/nodesTemplate.js';
/**
 * Get available node templates
 */
function getAvailableTemplates() {
  return nodesTemplate.templates;
}

/**
 * Get a template by name
 * @param {string} templateName - Name of the template
 */
function getTemplate(templateName) {
  return nodesTemplate.templates.find(t => t.name === templateName) || nodesTemplate.default;
}

/**
 * Create a new node collection
 * @param {string} name - Collection name
 * @param {Object} options
 * @param {Object} options.nodesTool - Node editor tool
 * @param {Object} options.signals - Context signals
 * @param {string} [options.templateName] - Optional template name to use
 */
async function createNodeCollection(name = null, { nodesTool, signals, templateName = null }) {
  
  let templateData = null;

  if (templateName) {
    templateData = getTemplate(templateName);
  } else {
    
    templateData = nodesTemplate.default;
  }
  const initialData = templateData ? {
    nodes: templateData.nodes || [],
    connections: templateData.connections || []
  } : {};

  const collectionName = name || (templateData?.name) || 'New Node Collection';

  const collection = nodesTool.createNodeCollection(initialData, collectionName);
  if (templateData?.nodes && templateData.nodes.length > 0) {
    for (const nodeData of templateData.nodes) {
      
      collection.children.push({
        id: nodeData.id,
        name: nodeData.name,
        icon: nodeData.icon,
        nodeType: nodeData.nodeType,
        language: nodeData.language,
        code: nodeData.code,
        position: nodeData.position,
        inputs: nodeData.inputs || [],
        outputs: nodeData.outputs || []
      });
    }
    if (templateData.connections) {
      collection.connections = templateData.connections;
    }
  }
  signals.newScript.dispatch(collection.guid);
  
  return collection;
}

/**
 * Open node editor for a collection
 * @param {string} nodeGuid - Collection GUID
 * @param {Object} options
 */
async function openNodeEditor(nodeGuid, { nodesTool, signals, editor }) {
  const collection = nodesTool.getNodeCollection(nodeGuid);
  
  if (!collection) {
    throw new Error(`No node collection found with GUID: ${nodeGuid}`);
  }
  let flowTool = nodesTool.getNodeEditor(nodeGuid);
  
  if (!flowTool) {
    
    const scene = editor?.scene || null;

    const renderer = editor?.renderer || null;

    const composer = editor?.composer || null;
    
    flowTool = await nodesTool.createFlowTool(scene, renderer, composer);
    if (!flowTool) {
      console.warn('Node editor is not available - flow module has been removed');
      return;
    }

    nodesTool.storeNodeEditor(nodeGuid, flowTool);
    if (collection.children && collection.children.length > 0) {
      flowTool.loadNodes(
        collection.children.map(n => n.toJSON ? n.toJSON() : n),
        collection
      );
    }
  }
  signals.openNodeEditor.dispatch({ guid: nodeGuid, flowTool });
}

/**
 * Run all nodes in a collection
 * @param {string} nodeGuid - Collection GUID
 * @param {Object} options
 */
async function runNodeCollection(nodeGuid, { nodesTool, signals, context, operators }) {
  const collection = nodesTool.getNodeCollection(nodeGuid);
  
  if (!collection) {
    throw new Error(`No node collection found with GUID: ${nodeGuid}`);
  }
  collection.runAll(context, operators);
  signals.nodeCollectionChanged?.dispatch({ guid: nodeGuid, action: 'run' });
}

/**
 * Save node collection data
 * @param {string} nodeGuid - Collection GUID
 * @param {Object} options
 */
async function saveNodeCollection(nodeGuid, { nodesTool, signals }) {
  const collection = nodesTool.getNodeCollection(nodeGuid);
  
  if (!collection) {
    throw new Error(`No node collection found with GUID: ${nodeGuid}`);
  }
  const flowTool = nodesTool.getNodeEditor(nodeGuid);
  
  if (flowTool && flowTool.canvas) {
    
    const canvasData = flowTool.canvas.toJSON();

    collection.saveData(canvasData);
  }

  nodesTool.updateNodeCollection(collection, collection.data);
  signals.nodeCollectionChanged?.dispatch({ guid: nodeGuid, action: 'save' });
}

/**
 * Rename node collection
 * @param {string} nodeGuid - Collection GUID
 * @param {string} newName - New name
 * @param {Object} options
 */
function renameNodeCollection(nodeGuid, newName, { nodesTool, signals }) {
  const collection = nodesTool.getNodeCollection(nodeGuid);
  
  if (!collection) {
    throw new Error(`No node collection found with GUID: ${nodeGuid}`);
  }

  collection.name = newName;
  signals.newScript.dispatch();

  signals.nodeCollectionChanged?.dispatch({ guid: nodeGuid, action: 'rename', name: newName });
}

/**
 * Delete node collection
 * @param {string} nodeGuid - Collection GUID
 * @param {Object} options
 */
function deleteNodeCollection(nodeGuid, { nodesTool, signals }) {
  const collection = nodesTool.getNodeCollection(nodeGuid);
  
  if (!collection) {
    throw new Error(`No node collection found with GUID: ${nodeGuid}`);
  }
  nodesTool.deleteNodeCollection(collection);
  signals.newScript.dispatch();

  signals.nodeCollectionChanged?.dispatch({ guid: nodeGuid, action: 'delete' });
}

/**
 * Add a node to a collection
 * @param {string} nodeGuid - Collection GUID
 * @param {Object} nodeData - Node data
 * @param {Object} options
 */
function addNodeToCollection(nodeGuid, nodeData, { nodesTool, signals }) {
  const collection = nodesTool.getNodeCollection(nodeGuid);
  
  if (!collection) {
    throw new Error(`No node collection found with GUID: ${nodeGuid}`);
  }

  const { NodeCollection } = require('../data/index.js');

  const node = new NodeCollection(
    nodeData.name || 'New Node',
    nodeData.code || '',
    {
      icon: nodeData.icon,
      nodeType: nodeData.nodeType,
      language: nodeData.language || 'javascript',
    }
  );

  collection.addNode(node);
  signals.nodeCollectionChanged?.dispatch({ guid: nodeGuid, action: 'addNode' });
  
  return node;
}

/**
 * Connect two nodes in a collection
 * @param {string} nodeGuid - Collection GUID
 * @param {string} fromNodeId - Source node ID
 * @param {string} toNodeId - Target node ID
 * @param {Object} options
 */
function connectNodes(nodeGuid, fromNodeId, toNodeId, { nodesTool, signals }) {
  const collection = nodesTool.getNodeCollection(nodeGuid);
  
  if (!collection) {
    throw new Error(`No node collection found with GUID: ${nodeGuid}`);
  }
  collection.connections.push({ from: fromNodeId, to: toNodeId });
  signals.nodeCollectionChanged?.dispatch({ guid: nodeGuid, action: 'connect' });
}

export {
  createNodeCollection,
  openNodeEditor,
  runNodeCollection,
  saveNodeCollection,
  renameNodeCollection,
  deleteNodeCollection,
  addNodeToCollection,
  connectNodes,
  getAvailableTemplates,
  getTemplate,
};
