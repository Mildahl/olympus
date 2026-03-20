import { Collection, _generateGuid } from "./Collection.js";

import {Attribute} from "./Attribute.js";
export class NotificationCollection extends Collection {
  constructor() {
    super({ name: 'Notifications', type: 'NotificationCollection' });

    this.notifications = [];
  }

  add(notification) {
    this.notifications.push(notification);
  }

  getUnreadCount() {
    return this.notifications.filter(n => !n.read).length;
  }

  markAsRead(id) {
    const notif = this.notifications.find(n => n.id === id);

    if (notif) {
      notif.read = true;
    }
  }

  getAll() {
    return this.notifications;
  }
}

export class NotificationAttribute extends Attribute {
  constructor({ message, type = 'info', timestamp = Date.now(), read = false, id = _generateGuid() }) {
    super({ name: message, type: 'Notification' });

    this.id = id;

    this.message = message;

    this.type = type;

    this.timestamp = timestamp;

    this.read = read;
  }
}
