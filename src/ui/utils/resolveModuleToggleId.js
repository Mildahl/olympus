/**
 * Find the DOM element id for a toolbar/menu node that activates a given module.
 * Walks `context.config.ui.WorldComponent` (same shape as UserInterface.config).
 *
 * @param {Object} context - Application context with config.ui.WorldComponent
 * @param {string} moduleId - Module id (e.g. 'world.spatial', 'bim.sequence')
 * @returns {string|null} The config node's `id` (used as HTML element id), or null
 */
export function resolveModuleToggleId(context, moduleId) {
  if (!moduleId || !context?.config?.ui?.WorldComponent) return null;

  let found = null;

  const visit = (node) => {
    if (found || !node || typeof node !== "object") return;
    if (node.moduleId === moduleId && node.id) {
      found = node.id;
      return;
    }
    for (const child of node.children || []) visit(child);
  };

  visit(context.config.ui.WorldComponent);

  return found;
}
