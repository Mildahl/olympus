import { UIRow, UIIcon, UIText } from "./ui.js";

/**
 * Shared header row for workspace panels (BasePanel, TabPanel, module UIs).
 *
 * @param {Object} opts
 * @param {string} opts.title
 * @param {string} [opts.iconName]
 * @param {import('./ui.js').UIElement[]} [opts.actions]
 * @param {boolean} [opts.alwaysActionsColumn=false] - If true, append an empty actions row (TabPanel adds controls later).
 * @returns {{ headerRow: UIRow, actionsRow: UIRow | null }}
 */
export function createPanelHeaderChrome({
  title,
  iconName,
  actions = [],
  alwaysActionsColumn = false,
}) {
  const headerRow = new UIRow();
  headerRow.setDisplay("flex");
  headerRow
    .addClass("fill-parent")
    .setStyle("justify-content", ["space-between"])
    .setStyle("align-items", ["center"])
    .setStyle("padding", ["0.5rem 0.75rem"]);

  const headerLeft = new UIRow();
  headerLeft.setDisplay("flex");
  headerLeft.setStyle("align-items", ["center"]).setStyle("gap", ["0.5rem"]);

  if (iconName) {
    const icon = new UIIcon(iconName);
    icon.setStyle("font-size", ["1.2rem"]);
    headerLeft.add(icon);
  }

  const titleText = new UIText(title);
  titleText.setStyle("font-weight", ["600"]).setStyle("font-size", ["0.9rem"]);
  headerLeft.add(titleText);

  headerRow.add(headerLeft);

  let actionsRow = null;

  if (actions.length > 0) {
    actionsRow = new UIRow();
    actionsRow.setDisplay("flex");
    actionsRow.setStyle("gap", ["0.5rem"]);
    for (const action of actions) {
      actionsRow.add(action);
    }
    headerRow.add(actionsRow);
  } else if (alwaysActionsColumn) {
    actionsRow = new UIRow();
    actionsRow.setDisplay("flex");
    actionsRow.setStyle("gap", ["0.5rem"]);
    headerRow.add(actionsRow);
  }

  return { headerRow, actionsRow };
}

/**
 * @param {import('./ui.js').UIElement[]} [elements]
 * @param {string} [justify='flex-end']
 * @returns {UIRow}
 */
export function createPanelFooterRow(elements = [], justify = "flex-end") {
  const footerRow = new UIRow();
  footerRow.setDisplay("flex");
  footerRow
    .setStyle("justify-content", [justify])
    .setStyle("align-items", ["center"])
    .setStyle("padding", ["0.5rem 0.75rem"])
    .setStyle("gap", ["0.5rem"]);

  for (const element of elements) {
    footerRow.add(element);
  }

  return footerRow;
}
