import { Components as UIComponents } from "../../ui/Components/Components.js";
class TemplateConfiguratorUI  {
  constructor({ context, operators }) {

    this.dom = null

    this.title = "Welcome, ";

    this.paragraph1 = "Let's customize the application just for you.";
    
    this.jobRoles = [];

    this.activeJobRole = null;

    this.draw();

    this.listen(context, operators);
  }

  listen(context, operators) {

  }

  draw(context, operators) {

  }

  clear() {
    this.dom?.remove();
  }
}

export { TemplateConfiguratorUI };
