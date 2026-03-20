import { Components as UIComponents } from "../Components/Components.js";

import { UIElement } from "./../../../drawUI/ui.js";

import { WorldComponent as DefaultWorldComponent } from "./UserInterface.config.js";

import { LayoutManager } from "../utils/LayoutManager.js";

class UserInterfaceModel {
  constructor() {
    this.root = null;

    this.isListening = false;

    this.layoutManager = null;
  }

  drawBaseComponents(context, ops, activeIds, container = null) {
    this.context = context;

    this.ops = ops;

    this.root = null;

    this._container = container ?? (typeof document !== 'undefined' ? document.body : null);

    const worldConfig = context.config.ui?.WorldComponent || DefaultWorldComponent;

    this.createWorldStructure(context, worldConfig, 0, [1], null, null, activeIds);

    const layoutConfig = context.config?.ui?.layout || {};

    this.layoutManager = new LayoutManager(layoutConfig);

    this.layoutManager.setContext(context).init('World');

    context.layoutManager = this.layoutManager;

    return this.root;
  }

  createWorldStructure(context, component, depth = 0, hierarchyIds = [], parent, parentId = null, activeIds = []) {

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
      for (let i = 0; i < component.children.length; i++) {
        this.createWorldStructure(context, component.children[i], depth + 1, [...hierarchyIds, i + 1], parentDiv, component.id, activeIds);
      }
    }
  }
}

export { UserInterfaceModel };
