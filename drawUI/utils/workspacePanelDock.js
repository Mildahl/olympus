import { UIDiv } from "../ui.js";

/** @type {WeakMap<HTMLElement, { fp: import('../FloatingPanel.js').FloatingPanel, lm: object, position: string, tabId: string, scrollAreaEl: HTMLElement, cleanupFloat?: () => void }>} */
const workspaceDockMeta = new WeakMap();

/**
 * @param {{ layoutManager: object, tabId: string, tabLabel?: string }} opts
 * @returns {{ left?: Function, bottom?: Function, right?: Function }|undefined}
 */
export function buildWorkspaceDockHandlers({ layoutManager: lm, tabId, tabLabel }) {
  if (!lm || typeof lm.addTab !== "function" || !tabId) return undefined;
  return {
    left: (fp) => dockFloatingPanelToWorkspace(fp, lm, "left", tabId, tabLabel),
    bottom: (fp) => dockFloatingPanelToWorkspace(fp, lm, "bottom", tabId, tabLabel),
    right: (fp) => dockFloatingPanelToWorkspace(fp, lm, "right", tabId, tabLabel),
  };
}

/**
 * Move floating panel body into a layout workspace tab. Undock uses the tab-strip float control
 * (floatable tab + LayoutManager.registerTabFloatHandler), not an in-panel toolbar.
 * @param {import('../FloatingPanel.js').FloatingPanel} fp
 * @param {{ addTab: Function, removeTab: Function, selectTab?: Function, registerTabFloatHandler?: Function }} lm
 * @param {'left'|'right'|'bottom'} position
 * @param {string} tabId
 * @param {string} [tabLabel]
 */
export function dockFloatingPanelToWorkspace(fp, lm, position, tabId, tabLabel) {
  const label =
    tabLabel ||
    (fp.title?.text?.dom?.textContent) ||
    tabId;
  const contentEl = fp.content;
  if (!contentEl) return;

  const host = new UIDiv().setClass("WorkspaceDockHost").setStyles({
    display: "flex",
    "flex-direction": "column",
    height: "100%",
    "min-height": "0",
    "overflow-y": "auto",
  });

  while (contentEl.firstChild) {
    host.dom.appendChild(contentEl.firstChild);
  }

  fp._dockedWorkspace = { position, tabId, hostDom: host.dom };

  let cleanupFloat;
  if (typeof lm.registerTabFloatHandler === "function") {
    cleanupFloat = lm.registerTabFloatHandler(position, tabId, () => {
      undockWorkspacePanelFromDom(host.dom);
    });
  }

  workspaceDockMeta.set(host.dom, {
    fp,
    lm,
    position,
    tabId,
    scrollAreaEl: host.dom,
    cleanupFloat,
  });

  const addOpts = { open: true, replace: true, floatable: Boolean(cleanupFloat) };
  lm.addTab(position, tabId, label, host, addOpts);
  // UITabbedPanel.addTab does not switch selection if another tab is already selected;
  // after dock we must show this tab, not a previously active one.
  if (typeof lm.selectTab === "function") {
    lm.selectTab(position, tabId, { open: true });
  }
  fp.dom.remove();
}

/**
 * @param {HTMLElement} hostDom
 * @returns {import('../FloatingPanel.js').FloatingPanel|null}
 */
export function undockWorkspacePanelFromDom(hostDom) {
  const meta = workspaceDockMeta.get(hostDom);
  if (!meta) return null;
  const { fp, lm, position, tabId, scrollAreaEl, cleanupFloat } = meta;
  if (typeof cleanupFloat === "function") {
    cleanupFloat();
  }
  if (typeof lm.removeTab === "function") {
    lm.removeTab(position, tabId, { closeIfEmpty: true });
  }
  const target = fp.content;
  while (scrollAreaEl.firstChild) {
    target.appendChild(scrollAreaEl.firstChild);
  }
  workspaceDockMeta.delete(hostDom);
  fp._dockedWorkspace = null;
  fp.isClosed = false;
  const win =
    typeof document !== "undefined"
      ? document.getElementById("Windows") || document.body
      : null;
  if (win) {
    win.appendChild(fp.dom);
    fp.show(win);
    fp.prepareAfterRemount();
  }
  return fp;
}
