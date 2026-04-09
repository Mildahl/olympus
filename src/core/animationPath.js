function create(name = 'New Animation Path', { animationPathTool, context, signals }) {
  const path = animationPathTool.createPath(name);

  context.signals.animationPathCreated.dispatch(path);

  context.signals.animationPathsChanged.dispatch();

  return path;
}

function remove(GlobalId, { animationPathTool, context, signals }) {
  const result = animationPathTool.removePath(GlobalId);

  context.signals.animationPathRemoved.dispatch(GlobalId);

  context.signals.animationPathsChanged.dispatch();

  context.editor.signals.animationPathChanged.dispatch();

  return result;
}

function rename(GlobalId, newName, { animationPathTool, context, signals }) {
  const result = animationPathTool.renamePath(GlobalId, newName);

  context.signals.animationPathUpdated.dispatch({ GlobalId, newName });

  context.signals.animationPathsChanged.dispatch();

  return result;
}

function activate(GlobalId, { animationPathTool, context, signals }) {
  const result = animationPathTool.activatePath(GlobalId);

  context.signals.animationPathActivated.dispatch(GlobalId);

  context.signals.animationPathsChanged.dispatch();

  context.editor.signals.animationPathChanged.dispatch();

  return result;
}

function setVisibility(GlobalId, visible, { animationPathTool, context, signals }) {
  const result = animationPathTool.setPathVisibility(GlobalId, visible);

  context.signals.animationPathUpdated.dispatch({ GlobalId, visible });

  context.signals.animationPathsChanged.dispatch();

  context.editor.signals.animationPathChanged.dispatch();

  return result;
}

function toggleVisibility(GlobalId, { animationPathTool, context, signals }) {
  const path = animationPathTool.getPath(GlobalId);

  const newVisible = !path.visible;

  const result = animationPathTool.setPathVisibility(GlobalId, newVisible);

  context.signals.animationPathUpdated.dispatch({ GlobalId, visible: newVisible });

  context.signals.animationPathsChanged.dispatch();

  context.editor.signals.animationPathChanged.dispatch();

  return result;
}

function play(GlobalId, { animationPathTool, context, signals }) {
  animationPathTool.playPath(GlobalId);

  context.signals.animationPathPlaybackStarted.dispatch(GlobalId);

  return true;
}

function stop(GlobalId, { animationPathTool, context, signals }) {
  const result = animationPathTool.stopPath(GlobalId);

  context.signals.animationPathPlaybackEnded.dispatch(GlobalId);

  return result;
}

function addViewpoint(pathGlobalId, viewpointGlobalId, { animationPathTool, context, signals }) {
  const result = animationPathTool.addViewpointToPath(pathGlobalId, viewpointGlobalId);

  context.signals.animationPathUpdated.dispatch({ pathGlobalId, action: 'addViewpoint', viewpointGlobalId });

  context.signals.animationPathsChanged.dispatch();

  context.editor.signals.animationPathChanged.dispatch();

  return result;
}

function removeViewpoint(pathGlobalId, viewpointGlobalId, { animationPathTool, context, signals }) {
  const result = animationPathTool.removeViewpointFromPath(pathGlobalId, viewpointGlobalId);

  context.signals.animationPathUpdated.dispatch({ pathGlobalId, action: 'removeViewpoint', viewpointGlobalId });

  context.signals.animationPathsChanged.dispatch();

  context.editor.signals.animationPathChanged.dispatch();

  return result;
}

function moveViewpoint(pathGlobalId, viewpointGlobalId, newIndex, { animationPathTool, context, signals }) {
  const result = animationPathTool.moveViewpointInPath(pathGlobalId, viewpointGlobalId, newIndex);

  context.signals.animationPathUpdated.dispatch({ pathGlobalId, action: 'moveViewpoint', viewpointGlobalId, newIndex });

  context.signals.animationPathsChanged.dispatch();

  context.editor.signals.animationPathChanged.dispatch();

  return result;
}

function updateSettings(GlobalId, settings, { animationPathTool, context, signals }) {
  const result = animationPathTool.updateAnimationSettings(GlobalId, settings);

  context.signals.animationPathUpdated.dispatch({ GlobalId, settings });

  context.signals.animationPathsChanged.dispatch();

  return result;
}

function setPathColor(GlobalId, color, { animationPathTool, context, signals }) {
  const result = animationPathTool.setPathColor(GlobalId, color);

  context.signals.animationPathUpdated.dispatch({ GlobalId, pathColor: color });

  context.editor.signals.animationPathChanged.dispatch();

  return result;
}

function setMarkerColor(GlobalId, color, { animationPathTool, context, signals }) {
  const result = animationPathTool.setMarkerColor(GlobalId, color);

  context.signals.animationPathUpdated.dispatch({ GlobalId, markerColor: color });

  context.editor.signals.animationPathChanged.dispatch();

  return result;
}

function setTargetColor(GlobalId, color, { animationPathTool, context, signals }) {
  const result = animationPathTool.setTargetColor(GlobalId, color);

  context.signals.animationPathUpdated.dispatch({ GlobalId, targetColor: color });

  context.editor.signals.animationPathChanged.dispatch();

  return result;
}

function createTemplate({ animationPathTool, context, signals }) {
  const template = animationPathTool.createTemplate(context);

  context.signals.animationPathCreated.dispatch(template);

  context.signals.animationPathsChanged.dispatch();

  return template;
}

function updateViewpointSettings(pathGlobalId, viewpointGlobalId, settings, { animationPathTool, context, signals }) {
  const result = animationPathTool.updateViewpointSettings(pathGlobalId, viewpointGlobalId, settings);

  context.signals.animationPathUpdated.dispatch({ pathGlobalId, viewpointGlobalId, settings });

  context.signals.animationPathsChanged.dispatch();

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
