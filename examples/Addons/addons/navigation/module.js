import NavigationOperators from './operators.js';
import { AddonNavigationUI } from './ui.js';

export default {
    id: 'addon.navigation',
    name: 'Navigation Addon',
    description: 'Advanced navigation controls and mobile joystick',
    version: '1.0.0',
    dependsOn: [],
    operators: NavigationOperators,
    ui: [AddonNavigationUI]
};
