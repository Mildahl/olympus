import { Operator } from "../../operators/Operator.js";

import * as NotificationCore from "../../core/notification.js";
class DisplayInformationBar extends Operator {
  static operatorName = "world.new_notification";

  static operatorLabel = "New Notification";

  static operatorOptions = ["REGISTER"];

  constructor(context, { message, type = 'info' }) {
    super(context);

    this.context = context;

    this.message = message;

    this.type = type;
  }

  poll() {
    return this.context;
  }

  async execute() {
    await NotificationCore.newNotification(this.message, this.type, {
      signals: this.context.signals
    });

    return { status: "FINISHED" };
  }
}
export default [DisplayInformationBar];