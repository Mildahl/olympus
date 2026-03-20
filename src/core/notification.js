import NotificationTool from '../tool/viewer/NotificationTool.js';

/**
 * Create a new notification
 * @param {string} message - The notification message
 * @param {string} type - The notification type: 'info', 'success', 'warning', 'error'
 * @param {Object} options - Context options
 * @param {Object} options.signals - Signal dispatcher
 * @param {typeof NotificationTool} [options.notificationTool] - Optional tool override
 */
async function newNotification(message, type = 'info', { signals, notificationTool = NotificationTool }) {
    const notif = notificationTool.addNotification(message, type);

    signals.notificationAdded.dispatch(notif);

    return notif;
}

/**
 * Mark a notification as read
 * @param {string} id - The notification ID
 * @param {Object} options - Context options
 * @param {Object} options.signals - Signal dispatcher
 */
function markNotificationRead(id, { signals }) {
    NotificationTool.collection?.markAsRead(id);

    signals.notificationRead.dispatch(id);
}

/**
 * Mark all notifications as read
 * @param {Object} options - Context options
 * @param {Object} options.signals - Signal dispatcher
 */
function markAllNotificationsRead({ signals }) {
    const notifications = NotificationTool.getAllNotifications();

    for (const notif of notifications) {
        if (!notif.read) {
            notif.read = true;
        }
    }

    signals.notificationRead.dispatch();
}

/**
 * Remove a notification
 * @param {string} id - The notification ID
 * @param {Object} options - Context options
 * @param {Object} options.signals - Signal dispatcher
 */
function removeNotification(id, { signals }) {
    if (NotificationTool.collection) {
        const index = NotificationTool.collection.notifications.findIndex(n => n.id === id);

        if (index !== -1) {
            NotificationTool.collection.notifications.splice(index, 1);

            signals.notificationRead.dispatch(id);
        }
    }
}

/**
 * Clear all notifications
 * @param {Object} options - Context options
 * @param {Object} options.signals - Signal dispatcher
 */
function clearAllNotifications({ signals }) {
    if (NotificationTool.collection) {
        NotificationTool.collection.notifications = [];

        signals.notificationRead.dispatch();
    }
}

export {
    newNotification,
    markNotificationRead,
    markAllNotificationsRead,
    removeNotification,
    clearAllNotifications
};