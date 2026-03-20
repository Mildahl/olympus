import { Components as UIComponents } from "../../ui/Components/Components.js";

import { BasePanel } from "../../../drawUI/BasePanel.js";

import dataStore from "../../data/index.js";

import AECO_tools from "../../tool/index.js";

const NOTIFICATION_CONFIG = {
  info: { icon: 'info', color: 'var(--blue, #3498db)' },
  success: { icon: 'check_circle', color: 'var(--green, #27ae60)' },
  operation: { icon: 'build', color: 'var(--green, #27ae60)' },
  warning: { icon: 'warning', color: 'var(--orange, #f39c12)' },
  error: { icon: 'error', color: 'var(--red, #e74c3c)' },
  default: { icon: 'notifications', color: 'var(--theme-background-1618, #95a5a6)' }
};

const TOAST_DURATION = 4500;

class ToastNotifications {
  constructor({ context, operators }) {
    this.context = context;

    this.operators = operators;

    this.toasts = new Map(); 
    
    this.createContainer();

    this.listen();
  }

  createContainer() {
    
    this.container = UIComponents.column();

    this.container.setId('ToastNotificationsContainer');

    this.container
      .setStyle('position', ['fixed'])
      .setStyle('top', ['calc(var(--headerbar-height) + var(--phi-0-5) )'])
      .setStyle('left', ['auto'])
      .setStyle('right', ['calc(var(--sidebar-width) + 0.5rem)'])
      .setStyle('z-index', ['5'])
      .setStyle('display', ['flex'])
      .setStyle('flex-direction', ['column'])
      .setStyle('gap', ['0.5rem'])
      .setStyle('pointer-events', ['none'])
      .setStyle('max-height', ['80vh'])
      .setStyle('overflow', ['hidden']);

    document.body.appendChild(this.container.dom);
  }

  listen() {
    this.context.signals.notificationAdded.add((notification) => {
      this.showToast(notification);
    });
  }

  showToast(notification) {
    if (!notification) return;

    if (!this.context.config.ui?.notifications?.showToasts) return;

    const config = NOTIFICATION_CONFIG[notification.type] || NOTIFICATION_CONFIG.default;

    const toast = UIComponents.row();

    toast.addClass('ToastNotification');

    toast
      .setStyle('background', ['var(--glass-surface, rgba(44, 62, 80, 0.85))'])
      .setStyle('backdrop-filter', ['blur(10px)'])
      .setStyle('border-radius', ['8px'])
      .setStyle('padding', ['0.75rem 1rem'])
      .setStyle('pointer-events', ['auto'])
      .setStyle('cursor', ['pointer'])
      .setStyle('align-items', ['center'])
      .setStyle('gap', ['0.75rem'])
      .setStyle('min-width', ['280px'])
      .setStyle('max-width', ['380px'])
      .setStyle('opacity', ['0'])
      .setStyle('transform', ['translateX(100%)'])
      .setStyle('transition', ['opacity 0.3s ease, transform 0.3s ease']);

    const icon = UIComponents.icon(config.icon);

    icon
      .setStyle('color', [config.color])
      .setStyle('font-size', ['1.25rem'])
      .setStyle('flex-shrink', ['0']);

    toast.add(icon);

    const content = UIComponents.column();

    content
      .setStyle('flex-grow', ['1'])
      .setStyle('gap', ['0.25rem'])
      .setStyle('overflow', ['hidden']);

    const typeLabel = UIComponents.smallText(notification.type?.toUpperCase() || 'INFO');

    typeLabel
      .setStyle('color', [config.color])
      .setStyle('font-size', ['0.65rem'])
      .setStyle('font-weight', ['600'])
      .setStyle('letter-spacing', ['0.5px']);

    content.add(typeLabel);

    const message = UIComponents.text(notification.message || 'No message');

    message
      .setStyle('font-size', ['0.85rem'])
      .setStyle('line-height', ['1.4'])
      .setStyle('color', ['var(--theme-text, #ecf0f1)'])
      .setStyle('word-wrap', ['break-word'])
      .setStyle('overflow', ['hidden'])
      .setStyle('text-overflow', ['ellipsis']);

    content.add(message);

    toast.add(content);

    const closeBtn = UIComponents.icon('close');

    closeBtn
      .setStyle('color', ['var(--theme-text-light, #95a5a6)'])
      .setStyle('font-size', ['1rem'])
      .setStyle('cursor', ['pointer'])
      .setStyle('flex-shrink', ['0'])
      .setStyle('opacity', ['0.6'])
      .setStyle('transition', ['opacity 0.2s']);
    
    closeBtn.dom.addEventListener('mouseenter', () => {
      closeBtn.setStyle('opacity', ['1']);
    });

    closeBtn.dom.addEventListener('mouseleave', () => {
      closeBtn.setStyle('opacity', ['0.6']);
    });

    closeBtn.onClick((e) => {
      e.stopPropagation();

      this.dismissToast(notification.id, toast);
    });

    toast.add(closeBtn);

    toast.onClick(() => {
      if (!notification.read) {
        this.operators.execute('world.mark_notification_read', this.context, notification.id);
      }

      this.dismissToast(notification.id, toast);
    });

    this.container.add(toast);

    this.toasts.set(notification.id, toast);

    requestAnimationFrame(() => {
      toast
        .setStyle('opacity', ['1'])
        .setStyle('transform', ['translateX(0)']);
    });

    const timeoutId = setTimeout(() => {
      this.dismissToast(notification.id, toast);
    }, TOAST_DURATION);

    toast._timeoutId = timeoutId;

    toast.dom.addEventListener('mouseenter', () => {
      if (toast._timeoutId) {
        clearTimeout(toast._timeoutId);

        toast._timeoutId = null;
      }
    });

    toast.dom.addEventListener('mouseleave', () => {
      toast._timeoutId = setTimeout(() => {
        this.dismissToast(notification.id, toast);
      }, TOAST_DURATION);
    });
  }

  dismissToast(notificationId, toast) {
    if (!toast || !this.toasts.has(notificationId)) return;

    if (toast._timeoutId) {
      clearTimeout(toast._timeoutId);
    }

    toast
      .setStyle('opacity', ['0'])
      .setStyle('transform', ['translateX(100%)']);

    setTimeout(() => {
      if (toast.dom && toast.dom.parentNode) {
        toast.dom.parentNode.removeChild(toast.dom);
      }

      this.toasts.delete(notificationId);
    }, 300);
  }

  dispose() {
    
    for (const [id, toast] of this.toasts) {
      if (toast._timeoutId) {
        clearTimeout(toast._timeoutId);
      }
    }

    this.toasts.clear();

    if (this.container.dom && this.container.dom.parentNode) {
      this.container.dom.parentNode.removeChild(this.container.dom);
    }
  }
}

class NotificationsUI extends BasePanel {
  constructor({ context, operators }) {
    super({
      context,
      operators,
      parentId: "NotificationsModule",
      panelStyles: {
        height: "fit-content",
        maxHeight: "60vh",
        minWidth: "320px",
        maxWidth: "400px",
        overflow: "hidden"
      },
      resizeHandles: ['w', 's', 'sw', ],
      draggable: true,
      testing:false
    });

    this.listContainer = null;

    this.firstDisplay = true;

    this.draw();

    this.listen(context, operators);

    this.updateBadge();
  }

  onShow() {
    this.firstDisplay = false;

    this.updatePanel();
  }

  onHide() {
    
  }

  refreshPanel() {
    this.updatePanel();
  }

  listen(context, operators) {
    context.signals.notificationAdded.add(() => {
      this.updateBadge();

      if (this.isActive) {
        this.updatePanel();
      }
    });

    context.signals.notificationRead.add(() => {
      this.updateBadge();

      if (this.isActive) {
        this.updatePanel();
      }
    });
  }

  updateBadge() {
    const count = AECO_tools.world.notification.getUnreadCount();

    const parentId = this.parentId || (this.parent ? this.parent.id : null);

    const countElement = parentId ? document.getElementById(`${parentId}Count`) : null;

    if (countElement) {
      countElement.textContent = count > 99 ? '99+' : count;

      if (count > 0) {
        countElement.classList.add('has-count');

        countElement.classList.remove('no-count');
      } else {
        countElement.classList.add('no-count');

        countElement.classList.remove('has-count');
      }
    }
  }

  draw() {
    this.clearPanel();

    const markAllReadBtn = UIComponents.icon('done_all');

    markAllReadBtn.addClass('Button');

    markAllReadBtn.dom.title = 'Mark all as read';

    markAllReadBtn.onClick(() => {
      this.operators.execute('world.mark_all_notifications_read', this.context);

      this.updatePanel();

      this.updateBadge();
    });

    const clearAllBtn = UIComponents.icon('delete_sweep');

    clearAllBtn.addClass('Button');

    clearAllBtn.dom.title = 'Clear all notifications';

    clearAllBtn.onClick(() => {
      if (confirm('Clear all notifications?')) {
        this.operators.execute('world.clear_all_notifications', this.context);

        this.updatePanel();

        this.updateBadge();
      }
    });

    const headerRow = this.createHeader('Notifications', 'notifications', [markAllReadBtn, clearAllBtn]);

    this.header.add(headerRow);

    const showToastsRow = UIComponents.row().addClass('Row').gap('var(--phi-0-5)').padding('0.5rem');

    const showToastsCheckbox = UIComponents.checkbox(this.context.config.ui.notifications?.showToasts ?? false);

    showToastsCheckbox.dom.style.cursor = 'pointer';

    showToastsRow.add(showToastsCheckbox);

    const showToastsLabel = UIComponents.text('Show pop-ups');

    showToastsLabel.setStyle('font-size', ['0.85rem']).setStyle('cursor', ['pointer']);

    showToastsLabel.dom.title = 'Show toast notifications when they arrive';

    showToastsLabel.onClick(() => showToastsCheckbox.dom.click());

    showToastsRow.add(showToastsLabel);

    showToastsCheckbox.dom.addEventListener('change', () => {
      if (!this.context.config.ui.notifications) this.context.config.ui.notifications = {};

      this.context.config.ui.notifications.showToasts = showToastsCheckbox.getValue();

      this.context._saveConfig();
    });

    this.content.add(showToastsRow);

    this.listContainer = UIComponents.column().setStyle('flex-direction', ['column-reverse']);

    this.listContainer.setStyle('padding', ['0.5rem']);

    this.content.add(this.listContainer);

    this.updatePanel();
  }

  updatePanel() {
    if (!this.listContainer) return;

    this.listContainer.clear();

    const notifications = AECO_tools.world.notification.getAllNotifications();

    if (!notifications || notifications.length === 0) {
      const emptyState = this.drawEmptyState();

      this.listContainer.add(emptyState);

      return;
    }

    const sortedNotifications = [...notifications].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    for (const notification of sortedNotifications) {
      const item = this.drawNotificationItem(notification);

      this.listContainer.add(item);
    }
  }

  drawEmptyState() {
    const container = UIComponents.column();

    container
      .setStyle('align-items', ['center'])
      .setStyle('justify-content', ['center'])
      .setStyle('padding', ['2rem'])
      .setStyle('text-align', ['center']);

    const icon = UIComponents.icon('notifications_none');

    icon
      .setStyle('font-size', ['3rem'])
      .setStyle('opacity', ['0.3'])
      .setStyle('margin-bottom', ['0.75rem']);

    container.add(icon);

    const message = UIComponents.text('No notifications');

    message
      .setStyle('color', ['var(--theme-text-light)'])
      .setStyle('font-size', ['0.9rem']);

    container.add(message);

    const subMessage = UIComponents.smallText("You're all caught up!");

    subMessage
      .setStyle('color', ['var(--theme-text-light)'])
      .setStyle('opacity', ['0.7'])
      .setStyle('margin-top', ['0.25rem']);

    container.add(subMessage);

    return container;
  }

  drawNotificationItem(notification) {
    const config = NOTIFICATION_CONFIG[notification.type] || NOTIFICATION_CONFIG.default;

    const item = UIComponents.div()

    item.addClass('Row').gap('var(--phi-0-5)').padding('0.5rem')

    const icon = UIComponents.icon(config.icon);

    item.add(icon);

    const information = UIComponents.row().addClass('space-between').setStyle('flex-direction', ['row']).setStyle('flex-grow', ['1']);
    
    item.add(information);

    const message = UIComponents.text(notification.message || 'No message');

    message
      .setStyle('font-size', ['0.85rem'])
      .setStyle('font-weight', [notification.read ? 'normal' : '500'])
      .setStyle('line-height', ['1.4'])
      .setStyle('word-wrap', ['break-word']);

    information.add(message);

    const timestamp = UIComponents.smallText(this.formatTimestamp(notification.timestamp));

    timestamp
      .setStyle('color', ['var(--theme-text-light)'])
      .setStyle('font-size', ['0.7rem'])
      .setStyle('opacity', ['0.8']);

    information.add(timestamp);

    item.onClick(() => {
      if (!notification.read) {
        this.operators.execute('world.mark_notification_read', this.context, notification.id);
      }
    });

    return item;
  }

  formatTimestamp(timestamp) {
    if (!timestamp) return '';

    const date = new Date(timestamp);

    const now = new Date();

    const diff = now - date;

    const days = Math.floor(diff / 86400000);

    const timeStr = date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    if (days < 1 && date.getDate() === now.getDate()) {
      return timeStr;
    }

    if (days < 7) {
      const dayStr = date.toLocaleDateString('en-GB', { weekday: 'short' });

      return `${dayStr} ${timeStr}`;
    }

    return `${date.toLocaleDateString()} ${timeStr}`;
  }
}

export { NotificationsUI, ToastNotifications };