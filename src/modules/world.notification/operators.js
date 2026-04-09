import { Operator } from "../../operators/Operator.js";

import * as NotificationCore from "../../core/notification.js";
class NewNotification extends Operator {
  static operatorName = "world.new_notification";

  static operatorLabel = "New Notification";

  static operatorOptions = ["REGISTER"];

  static operatorParams = {
    message: { type: "string", description: "Notification text to display" },
    type: { type: "string", description: "Notification severity", enum: ["info", "warning", "error"] },
  };

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

class MarkNotificationRead extends Operator {
  static operatorName = "world.mark_notification_read";

  static operatorLabel = "Mark Notification Read";

  static operatorOptions = ["REGISTER"];

  static operatorParams = {
    id: { type: "string", description: "Notification ID to mark as read" },
  };

  constructor(context, id) {
    super(context);

    this.context = context;

    this.id = id;
  }

  poll() {
    return this.context;
  }

  execute() {
    NotificationCore.markNotificationRead(this.id, {
      signals: this.context.signals
    });

    return { status: "FINISHED" };
  }
}

class MarkAllNotificationsRead extends Operator {
  static operatorName = "world.mark_all_notifications_read";

  static operatorLabel = "Mark All Notifications Read";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;
  }

  poll() {
    return this.context;
  }

  execute() {
    NotificationCore.markAllNotificationsRead({
      signals: this.context.signals
    });

    return { status: "FINISHED" };
  }
}

class RemoveNotification extends Operator {
  static operatorName = "world.remove_notification";

  static operatorLabel = "Remove Notification";

  static operatorOptions = ["REGISTER"];

  static operatorParams = {
    id: { type: "string", description: "Notification ID to remove" },
  };

  constructor(context, id) {
    super(context);

    this.context = context;

    this.id = id;
  }

  poll() {
    return this.context;
  }

  execute() {
    NotificationCore.removeNotification(this.id, {
      signals: this.context.signals
    });

    return { status: "FINISHED" };
  }
}

class ClearAllNotifications extends Operator {
  static operatorName = "world.clear_all_notifications";

  static operatorLabel = "Clear All Notifications";

  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);

    this.context = context;
  }

  poll() {
    return this.context;
  }

  execute() {
    NotificationCore.clearAllNotifications({
      signals: this.context.signals
    });

    return { status: "FINISHED" };
  }
}

export default [NewNotification, MarkNotificationRead, MarkAllNotificationsRead, RemoveNotification, ClearAllNotifications];