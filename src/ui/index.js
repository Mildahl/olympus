import { UserInterfaceModel } from "./WorldModel/UserInterface.js";

import { Components as UIComponents } from "./Components/Components.js";

import { WelcomeScreen } from "./Components/WelcomeScreen.js";

import { Sidebar } from "./../context/world/editor/Sidebar.js";

class UI {

  constructor(container, context, operators, activeIds) {

    this.new = UIComponents;

    this.instances = {  };

    this.classRegistry = {};

    this._baseUI(container, context, operators, activeIds);

  }

  getModel() {
    return this.model;
  }

  _baseUI(dom, context, operators, activeIds) {
    this.model = new UserInterfaceModel();

    const root = this.model.drawBaseComponents(context, operators, activeIds, dom);

    if (root.dom.parentNode !== dom) {
      dom.appendChild(root.dom);
    }

    this.workspaces = this._createWorkspaceTabbedPanels();
    
    this.model.layoutManager.registerTabbedWorkspaces(this.workspaces);

    context.ui = this;
    
    console.log("CONFIGURATION", context.config);

    if (context.config.ui.showWelcomeScreen) new WelcomeScreen({ context, operators, container: dom });

    new Sidebar({ context, operators });

    return root;
  }

  _createWorkspaceTabbedPanels() {
    const bottomEl = document.getElementById('BottomWorkspace');

    const leftEl = document.getElementById('SideWorkspaceLeft');

    const rightEl = document.getElementById('SideWorkspaceRight');

    const mount = (el, tabbedPanel, panelClass) => {
      if (!el) return;

      el.innerHTML = '';

      tabbedPanel.addClass(panelClass);

      el.appendChild(tabbedPanel.dom);
    };

    const bottom = UIComponents.tabbedPanel();

    const left = UIComponents.tabbedPanel();

    const right = UIComponents.tabbedPanel();

    mount(bottomEl, bottom, 'BottomWorkspaceTabbedPanel');

    mount(leftEl, left, 'LeftWorkspaceTabbedPanel');

    mount(rightEl, right, 'RightWorkspaceTabbedPanel');

    return { bottom, left, right };
  }

  async loadUIClasses(module, args) {
    if (! args.context || ! args.operators)  {
      throw new Error("Context and Operators must be provided in args to load UI Classes");
    }

    const classPath = module.classPath

    const classNames = module.classNames

    for (const className of classNames) {
      await this._loadClass(classPath, className, args);
    }

  }

  async _loadClass(classPath, className, args) {
    return import( classPath).then((module) => {
      
      const Module = module[className];

      console.log(`Loading UI Class: ${className} from ${classPath}`);

      try {

        const instance = new Module(args);

        this.classRegistry[className] = instance;
      } catch (error) {
        console.error(`Error instantiating UI class ${className} from ${classPath}:`, error);

        throw error;
      }
    });
  }

  _resolveDependency(path, context, ops) {
    const parts = path.split(".");

    let value = { context, ops, ui: this, resources: this.resources };

    for (const part of parts) {
      value = value[part];
    }

    return value;
  }
}

export { UI };