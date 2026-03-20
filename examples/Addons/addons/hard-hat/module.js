import HardHatOperators from './operators.js';

import HardHatUI from './ui.js';

export default {
    id: 'addon.hardhat',
    name: 'Hard Hat Addon',
    description: 'Construction site lifting schedule management with crane operations, weather monitoring, and lift tracking.',
    version: '2.0.0',
    dependsOn: [],
    operators: HardHatOperators,
    ui: HardHatUI
};
