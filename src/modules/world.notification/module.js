/**
 * World Notifications Module Definition
 */
import operators from './operators.js';

import { NotificationsUI, ToastNotifications } from './ui.js';

const ModuleDefinition = {
  id: 'world.notification',
  name: 'World Notifications',
  description: 'In-app notification system',
  version: '1.0.0',
  dependsOn: ['world'],
  operators: operators,
  ui: [NotificationsUI, ToastNotifications],
};

export default ModuleDefinition;
