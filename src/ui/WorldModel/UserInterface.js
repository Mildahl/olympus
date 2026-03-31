import { Components as UIComponents } from "../Components/Components.js";

import { UIElement } from "./../../../drawUI/ui.js";

import { WorldComponent as DefaultWorldComponent } from "./UserInterface.config.js";

import { LayoutManager } from "../utils/LayoutManager.js";

import { Sidebar, Properties } from "../../context/world/editor/Sidebar.js";

const WORKSPACE_REGION_IDS = [
  "Viewport",
  "HeaderBar",
  "BottomWorkspace",
  "SideWorkspaceLeft",
  "SideWorkspaceRight",
];

class UserInterfaceModel {
  constructor() {
    this.root = null;

    this.isListening = false;

    this.layoutManager = null;

    this._buildWorkspaceModel();
  }

  _buildWorkspaceModel() {
    this.workspace = {};

    for (let index = 0; index < WORKSPACE_REGION_IDS.length; index++) {
      const regionId = WORKSPACE_REGION_IDS[index];

      const panel = regionId === "Viewport" ? null : UIComponents.tabbedPanel();

      this.workspace[regionId] = {
        UIElement: null,
        panel: panel,
      };
    }
  }


  getComponentByID(targetId) {
    const searchTree = (node) => {
      if (!node || typeof node !== "object") {
        return null;
      }
      for (const key in node) {
        if (key === "UIElement" || key === "panel") {
          continue;
        }

        if (key === targetId) {
          return node[key];
        }

        const found = searchTree(node[key]);
        if (found) {
          return found;
        }
      }
      return null;
    };

    return searchTree(this.workspace);
  }

  registerChild(parentId, childId, child) {
    const parent = this.getComponentByID(parentId);
    if (!parent) {
      return;
    }
    parent[childId] = {
      UIElement: child,
      panel: null,
    };
  }

  drawBaseComponents(context, ops, activeIds, container = null) {
    this.context = context;

    this.ops = ops;

    this.root = null;

    this._container = container ?? (typeof document !== 'undefined' ? document.body : null);

    const worldConfig = context.config.ui?.WorldComponent || DefaultWorldComponent;

    this.createWorldStructure(context, worldConfig, 0, [1], null, null, activeIds, null);

    const layoutConfig = context.config?.ui?.layout || {};

    this.layoutManager = new LayoutManager(layoutConfig);

    this.layoutManager.setContext(context).init('World');

    this.layoutManager.attachWorkspaceTabPanels({
      left: this.workspace.SideWorkspaceLeft.panel,
      right: this.workspace.SideWorkspaceRight.panel,
      bottom: this.workspace.BottomWorkspace.panel,
    });

    const findNodeInWorkspace = (workspace, id) => {
      if (workspace.id === id) {
        return workspace;
      }
      return findNodeInWorkspace(workspace.children, id);
    };



    return this.root;
  }

  _ensureWorkspaceNode(workspaceHost, componentId) {
    if (!workspaceHost) {
      return null;
    }

    if (!workspaceHost[componentId]) {
      workspaceHost[componentId] = {
        UIElement: null,
        panel: null,
      };
    }

    return workspaceHost[componentId];
  }

  createWorldStructure(context, component, depth = 0, hierarchyIds = [], parent, parentId = null, activeIds = [], workspaceHost = null) {

    if (component.moduleId && !activeIds.includes(component.moduleId)) {
      return;
    }

    const strings = context.strings;

    const num = hierarchyIds.join('-');

    const indent = '  '.repeat(depth);

    let div;

    const isRoot = !parent && component.id === 'World';

    let existing = null;

    if (isRoot && this._container && this._container.querySelector) {
      try {
        existing = this._container.querySelector('#' + CSS.escape(component.id));
      } catch (_) {
        existing = null;
      }
    }

    if (!existing && typeof document !== 'undefined') {
      existing = document.getElementById(component.id);
    }

    if (existing) {
      div = new UIElement(existing);
    } else {
      div = UIComponents.div();
    }

    if (parent && div.dom.id !== 'World') {
      if (!parent.dom.contains(div.dom)) {
        parent.add(div);
      }
    } else if (isRoot) {
      this.root = div;
    }

    let parentDiv = div;
    
    parentDiv.dom.id = component.id;

    div.addClass(component.id);

    div.addClass(component.type);

    div.dom.dataset.type = component.type;

    div.dom.dataset.priority = component.priority;

    let currentWorkspaceNode = null;

    if (component.type === "Workspace") {
      const region = this.workspace[component.id];

      if (region) {
        region.UIElement = div;

        if (region.panel) {
          div.add(region.panel);
        }

        currentWorkspaceNode = region;
      }
    } else if (workspaceHost) {
      const slot = this._ensureWorkspaceNode(workspaceHost, component.id);

      if (slot) {
        slot.UIElement = div;

        currentWorkspaceNode = slot;
      }
    }

    if (!existing) {
      if (component.type === 'ContextModules') {
        const textValue = strings.getKey('module/' + component.id.toLowerCase());

        const text = UIComponents.text(textValue);

        text.addClass('ModuleName');

        div.add(text);
      } else if (component.icon) {
        const icon = UIComponents.icon(component.icon);

        div.add(icon);
      }

      if (component.needsCount) {
        const count = UIComponents.text('0');

        count.addClass('ModuleCount');

        count.dom.id = `${component.id}Count`;

        div.add(count);
      }
    }

    if (component.isActive) {
      div.addClass('Active');
    }

    if ( component.disabled) {
      
      div.setStyle('opacity', ['0.5']);
    }

    if (component.icon && component.children?.length > 0) {
      if (existing && div.dom.children.length > 0) {
        const modulesEl = Array.from(div.dom.children).find(c => c.classList && c.classList.contains('Modules'));

        parentDiv = modulesEl ? new UIElement(/** @type {HTMLElement} */ (modulesEl)) : div;
      } else {
        parentDiv = UIComponents.div();

        parentDiv.addClass('Modules');

        div.add(parentDiv);
      }
    }

    if (parentDiv.dom.id === 'FullScreenToggle') {
      parentDiv.dom.addEventListener('click', () => {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          document.body.requestFullscreen();
        }
      });
    }

    if (component.id === 'ViewportGizmo') {
      const orientationGizmo = document.getElementById('OrientationGizmo');

      if (orientationGizmo) {
        orientationGizmo.parentNode?.removeChild(orientationGizmo);

        orientationGizmo.style.top = '';

        orientationGizmo.style.right = '';

        parentDiv.dom.appendChild(orientationGizmo);
      }
    }

    if (component.children && component.children.length > 0) {
      const childWorkspaceHost = currentWorkspaceNode;

      for (let i = 0; i < component.children.length; i++) {
        this.createWorldStructure(
          context,
          component.children[i],
          depth + 1,
          [...hierarchyIds, i + 1],
          parentDiv,
          component.id,
          activeIds,
          childWorkspaceHost,
        );
      }
    }
  }

}

export { UserInterfaceModel };
