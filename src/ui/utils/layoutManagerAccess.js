/**
 * @param {object|null|undefined} context
 * @returns {object|null}
 */
export function getLayoutManagerFromContext(context) {
  if (!context) {
    return null;
  }
  const ui = context.ui;
  if (!ui) {
    return null;
  }
  const model = ui.model;
  if (!model) {
    return null;
  }
  const layoutManager = model.layoutManager;
  return layoutManager || null;
}