import { UserInterfaceModel } from "./WorldModel/UserInterface.js";

import { Components as UIComponents } from "./Components/Components.js";

import { WelcomeScreen } from "./Components/WelcomeScreen.js";

class UI {

  constructor(container, context, operators, activeIds) {

    this.new = UIComponents;

    this.instances = {  };

    this.classRegistry = {};

    this._baseUI(container, context, operators, activeIds);

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

  _baseUI(dom, context, operators, activeIds) {

    this.model = new UserInterfaceModel();

    context.ui = this;

    const root = this.model.drawBaseComponents(context, operators, activeIds, dom);

    if (root.dom.parentNode !== dom) {
      dom.appendChild(root.dom);
    }

    if (context.config.ui.showWelcomeScreen) new WelcomeScreen({ context, operators, container: dom });

    return root;
  }



  async _loadClass(classPath, className, args) {
    return import(/* webpackMode: "lazy" */ classPath).then((module) => {
      
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