import { Operator } from "../../operators/Operator.js";

import * as ConfiguratorCore from "../../core/configurator.js";
class AvatarChoice extends Operator {
  static operatorName = "configurator.chose_avatar";

  static operatorLabel = "Choose Avatar";

  static operatorOptions = ["REGISTER"];

  constructor(context, avatarId) {
    super(context);

    this.context = context;

    this.avatarId = avatarId;
  }

  poll() {
    return true;
  }

  execute() {
    ConfiguratorCore.chooseAvatar(this.avatarId, {
      context: this.context,
      signals: this.context.signals
    });

    return { status: "FINISHED" };
  }
}

class LoadTemplates extends Operator {
  static operatorName = "configurator.load_templates";

  static operatorLabel = "Load Templates";

  static operatorOptions = ["REGISTER"];

  constructor(context, modules) {
    super(context);

    this.context = context;

    this.modules = modules;
  }

  poll() {
    return true;
  }

  execute() {
    ConfiguratorCore.loadTemplates(this.modules, {
      context: this.context,
      signals: this.context.signals
    });

    return { status: "FINISHED" };
  }
}

export default [LoadTemplates, AvatarChoice];