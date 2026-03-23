/**
 * Store editor on context and forward editor navigation signals to context
 * so UI (e.g. navigation toolbar) stays in sync whether mode changes via
 * shortcuts, operators, or NavigationController.
 */
async function storeEditor(context, editor) {
  context.editor = editor;

  if (editor.signals.navigationModeChanged && context.signals.navigationModeChanged) {
    editor.signals.navigationModeChanged.add((payload) => {
      context.signals.navigationModeChanged.dispatch(payload);
    });
  }

  if (editor.signals.navigationCameraRigChanged && context.signals.navigationCameraRigChanged) {
    editor.signals.navigationCameraRigChanged.add((payload) => {
      context.signals.navigationCameraRigChanged.dispatch(payload);
    });
  }
}

export { storeEditor };