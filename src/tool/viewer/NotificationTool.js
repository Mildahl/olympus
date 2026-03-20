import dataStore from "../../data/index.js";

import { NotificationAttribute, NotificationCollection } from "../../data/index.js";

import * as THREE from "three";

import InteractiveObject, { makeInteractive } from "../model/animate/InteractiveObject.js";
class NotificationTool {
  static collection = null;

  static init() {
    if (!this.collection) {
      this.collection = new NotificationCollection();

      dataStore.registerCollection('notifications', this.collection);
    }
  }

  static addNotification( message, type = 'info') {
    this.init();

    const notif = new NotificationAttribute({ message, type });

    this.collection.add(notif);

    return notif;

  }

  static getUnreadCount() {
    this.init();

    return this.collection.getUnreadCount();
  }

  static markAsRead(context, id) {
    this.init();

    this.collection.markAsRead(id);

    context.signals.notificationRead.dispatch(id);
  }

  static markAllAsRead(context) {
    this.init();

    const notifications = this.collection.getAll();

    for (const notif of notifications) {
      if (!notif.read) {
        notif.read = true;
      }
    }

    context.signals.notificationRead.dispatch();
  }

  static removeNotification(context, id) {
    this.init();

    const index = this.collection.notifications.findIndex(n => n.id === id);

    if (index !== -1) {
      this.collection.notifications.splice(index, 1);

      context.signals.notificationRead.dispatch(id);
    }
  }

  static clearAll(context) {
    this.init();

    this.collection.notifications = [];

    context.signals.notificationRead.dispatch();
  }

  static getAllNotifications() {
    this.init();

    return this.collection.getAll();
  }
}

export default NotificationTool