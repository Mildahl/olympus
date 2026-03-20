function create(name = 'New Animation Path', { animationPathTool, context, signals }) {
  const path = animationPathTool.createPath(context, name);

  signals.animationPathCreated.dispatch(path);

  signals.animationPathsChanged.dispatch();

  return path;
}

function remove(GlobalId, { animationPathTool, context, signals }) {
  const result = animationPathTool.removePath(context, GlobalId);

  signals.animationPathRemoved.dispatch(GlobalId);

  signals.animationPathsChanged.dispatch();

  context.editor.signals.animationPathChanged.dispatch();

  return result;
}

function rename(GlobalId, newName, { animationPathTool, context, signals }) {
  const result = animationPathTool.renamePath(context, GlobalId, newName);

  signals.animationPathUpdated.dispatch({ GlobalId, newName });

  signals.animationPathsChanged.dispatch();

  return result;
}

function activate(GlobalId, { animationPathTool, context, signals }) {
  const result = animationPathTool.activatePath(context, GlobalId);

  signals.animationPathActivated.dispatch(GlobalId);

  signals.animationPathsChanged.dispatch();

  context.editor.signals.animationPathChanged.dispatch();

  return result;
}

function setVisibility(GlobalId, visible, { animationPathTool, context, signals }) {
  const result = animationPathTool.setPathVisibility(context, GlobalId, visible);

  signals.animationPathUpdated.dispatch({ GlobalId, visible });

  signals.animationPathsChanged.dispatch();

  context.editor.signals.animationPathChanged.dispatch();

  return result;
}

function toggleVisibility(GlobalId, { animationPathTool, context, signals }) {
  const path = animationPathTool.getPath(GlobalId);

  const newVisible = !path.visible;

  const result = animationPathTool.setPathVisibility(context, GlobalId, newVisible);

  signals.animationPathUpdated.dispatch({ GlobalId, visible: newVisible });

  signals.animationPathsChanged.dispatch();

  context.editor.signals.animationPathChanged.dispatch();

  return result;
}

function play(GlobalId, { animationPathTool, context, signals }) {
  animationPathTool.playPath(context, GlobalId);

  signals.animationPathPlaybackStarted.dispatch(GlobalId);

  return true;
}

function stop(GlobalId, { animationPathTool, context, signals }) {
  const result = animationPathTool.stopPath(context, GlobalId);

  signals.animationPathPlaybackEnded.dispatch(GlobalId);

  return result;
}

function addViewpoint(pathGlobalId, viewpointGlobalId, { animationPathTool, context, signals }) {
  const result = animationPathTool.addViewpointToPath(context, pathGlobalId, viewpointGlobalId);

  signals.animationPathUpdated.dispatch({ pathGlobalId, action: 'addViewpoint', viewpointGlobalId });

  signals.animationPathsChanged.dispatch();

  context.editor.signals.animationPathChanged.dispatch();

  return result;
}

function removeViewpoint(pathGlobalId, viewpointGlobalId, { animationPathTool, context, signals }) {
  const result = animationPathTool.removeViewpointFromPath(context, pathGlobalId, viewpointGlobalId);

  signals.animationPathUpdated.dispatch({ pathGlobalId, action: 'removeViewpoint', viewpointGlobalId });

  signals.animationPathsChanged.dispatch();

  context.editor.signals.animationPathChanged.dispatch();

  return result;
}

function moveViewpoint(pathGlobalId, viewpointGlobalId, newIndex, { animationPathTool, context, signals }) {
  const result = animationPathTool.moveViewpointInPath(context, pathGlobalId, viewpointGlobalId, newIndex);

  signals.animationPathUpdated.dispatch({ pathGlobalId, action: 'moveViewpoint', viewpointGlobalId, newIndex });

  signals.animationPathsChanged.dispatch();

  context.editor.signals.animationPathChanged.dispatch();

  return result;
}

function updateSettings(GlobalId, settings, { animationPathTool, context, signals }) {
  const result = animationPathTool.updateAnimationSettings(context, GlobalId, settings);

  signals.animationPathUpdated.dispatch({ GlobalId, settings });

  signals.animationPathsChanged.dispatch();

  return result;
}

function setPathColor(GlobalId, color, { animationPathTool, context, signals }) {
  const result = animationPathTool.setPathColor(context, GlobalId, color);

  signals.animationPathUpdated.dispatch({ GlobalId, pathColor: color });

  context.editor.signals.animationPathChanged.dispatch();

  return result;
}

function setMarkerColor(GlobalId, color, { animationPathTool, context, signals }) {
  const result = animationPathTool.setMarkerColor(context, GlobalId, color);

  signals.animationPathUpdated.dispatch({ GlobalId, markerColor: color });

  context.editor.signals.animationPathChanged.dispatch();

  return result;
}

function setTargetColor(GlobalId, color, { animationPathTool, context, signals }) {
  const result = animationPathTool.setTargetColor(context, GlobalId, color);

  signals.animationPathUpdated.dispatch({ GlobalId, targetColor: color });

  context.editor.signals.animationPathChanged.dispatch();

  return result;
}

function createTemplate({ animationPathTool, context, signals }) {
  const template = animationPathTool.createTemplate(context);

  signals.animationPathCreated.dispatch(template);

  signals.animationPathsChanged.dispatch();

  return template;
}

function updateViewpointSettings(pathGlobalId, viewpointGlobalId, settings, { animationPathTool, context, signals }) {
  const result = animationPathTool.updateViewpointSettings(context, pathGlobalId, viewpointGlobalId, settings);

  signals.animationPathUpdated.dispatch({ pathGlobalId, viewpointGlobalId, settings });

  signals.animationPathsChanged.dispatch();

  return result;
}

export {
  create,
  remove,
  rename,
  activate,
  setVisibility,
  toggleVisibility,
  play,
  stop,
  addViewpoint,
  removeViewpoint,
  moveViewpoint,
  updateSettings,
  updateViewpointSettings,
  setPathColor,
  setMarkerColor,
  setTargetColor,
  createTemplate
};
