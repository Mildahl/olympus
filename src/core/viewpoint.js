function create(name = 'New Viewpoint', { viewpointTool, context }) {
  const viewpoint = viewpointTool.create(context.editor, name);

  context.signals.viewpointCreated.dispatch(viewpoint);

  context.signals.viewpointsChanged.dispatch();

  context.editor.signals.viewpointChanged.dispatch();

  return viewpoint;
}

function remove(GlobalId, { viewpointTool, context }) {
  const result = viewpointTool.remove(GlobalId);

  context.signals.viewpointRemoved.dispatch(GlobalId);

  context.signals.viewpointsChanged.dispatch();

  context.editor.signals.viewpointChanged.dispatch();

  return result;
}

function rename(GlobalId, newName, { viewpointTool, context }) {
  const result = viewpointTool.rename(GlobalId, newName);

  context.signals.viewpointRenamed.dispatch({ GlobalId, newName });

  context.signals.viewpointsChanged.dispatch();

  return result;
}

function updatePosition(GlobalId, x, y, z, { viewpointTool, context }) {
  const result = viewpointTool.updatePosition(context.editor, GlobalId, x, y, z);

  context.signals.viewpointUpdated.dispatch({ GlobalId, position: { x, y, z } });

  context.signals.viewpointsChanged.dispatch();

  context.editor.signals.viewpointChanged.dispatch();

  return result;
}

function updateTarget(GlobalId, x, y, z, { viewpointTool, context }) {
  const result = viewpointTool.updateTarget(context.editor, GlobalId, x, y, z);

  context.signals.viewpointUpdated.dispatch({ GlobalId, target: { x, y, z } });

  context.signals.viewpointsChanged.dispatch();

  context.editor.signals.viewpointChanged.dispatch();

  return result;
}

function activate(GlobalId, animate = true, { viewpointTool, context }) {
  const result = viewpointTool.activate(context.editor, GlobalId, animate);

  context.signals.viewpointActivated.dispatch(result);

  context.signals.viewpointsChanged.dispatch();

  return result;
}

function updateFromEditor(GlobalId, { viewpointTool, context }) {
  const result = viewpointTool.updateFromEditor(context.editor, GlobalId);

  context.signals.viewpointUpdated.dispatch({ GlobalId });

  context.signals.viewpointsChanged.dispatch();

  context.editor.signals.viewpointChanged.dispatch();

  return result;
}

function setVisibility(GlobalId, visible, options = {}, { viewpointTool, context }) {
  const result = viewpointTool.setVisibility(context.editor.scene, GlobalId, visible, options);

  context.signals.viewpointsChanged.dispatch();

  context.editor.signals.viewpointChanged.dispatch();

  return result;
}

function toggleVisibility(GlobalId, options = {}, { viewpointTool, context }) {
  
  const result = viewpointTool.toggleVisibility(context.editor.scene, GlobalId, options);

  context.signals.viewpointsChanged.dispatch();

  context.editor.signals.viewpointChanged.dispatch();

  return result;
}

function navigateBack({ viewpointTool, context }) {
  const viewpoint = viewpointTool.navigateBack(context.editor);

  if (viewpoint) {
    context.signals.viewpointActivated.dispatch(viewpoint);

    context.signals.viewpointsChanged.dispatch();
  }

  return viewpoint;
}

function navigateForward({ viewpointTool, context, signals }) {
  const viewpoint = viewpointTool.navigateForward(context.editor);

  if (viewpoint) {
    context.signals.viewpointActivated.dispatch(viewpoint);

    context.signals.viewpointsChanged.dispatch();
  }

  return viewpoint;
}

function clearHistory({ viewpointTool, context }) {
  viewpointTool.clearHistory();

  context.signals.viewpointsChanged.dispatch();
}

function importJSON(json, { viewpointTool, context }) {
  const result = viewpointTool.importFromJSON(json);

  context.signals.viewpointsImported.dispatch();

  context.signals.viewpointsChanged.dispatch();

  context.editor.signals.viewpointChanged.dispatch();

  return result;
}

function exportJSON({ viewpointTool }) {
  return viewpointTool.exportToJSON();
}

export {
  create,
  remove,
  rename,
  updatePosition,
  updateTarget,
  activate,
  updateFromEditor,
  setVisibility,
  toggleVisibility,
  navigateBack,
  navigateForward,
  clearHistory,
  importJSON,
  exportJSON
};
