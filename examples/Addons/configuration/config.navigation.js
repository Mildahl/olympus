export const NavigationConfig = {
defaultMode: "ORBIT",
fly: {
    shortcut: ['Shift','F'],
    movementSpeed: 25,
    lookSpeed: 0.1,
    verticalMin: -85,
    verticalMax: 85,
    chaseCameraDistance: 1.5,
    chaseCameraHeight: 0.72,
    chaseDistanceMax: 2.6,
    chaseHeightMax: 1.55,
    cockpitEyeForwardOffset: 0.11,
    keys: {
        forward: ['', 'KeyW'],
        backward: ['', 'KeyS'],
        left: ['', 'KeyA'],
        right: ['', 'KeyD'],
        up: ['', 'Space'],
        down: ['', 'KeyQ'],
        sprint: ['', 'ShiftLeft']
    }
},
firstPerson: {
    shortcut: ['Shift','P'],
    movementSpeed: 25,
    lookSpeed: 0.1,
    verticalMin: -85,
    verticalMax: 85,
    keys: {
        forward: ['', 'KeyW'],
        backward: ['', 'KeyS'],
        left: ['', 'KeyA'],
        right: ['', 'KeyD'],
        up: ['', 'Space'],
        down: ['', 'KeyQ'],
        sprint: ['', 'ShiftLeft']
    }
},
drive: {
    shortcut: ['Shift','V'],
    movementSpeed: 30,
    lookSpeed: 0.1,
    verticalMin: -45,
    verticalMax: 45,
    keys: {
        accelerate: ['', 'KeyW'],
        brake: ['', 'KeyS'],
        left: ['', 'KeyA'],
        right: ['', 'KeyD'],
        boost: ['', 'ShiftLeft']
    }
},
orbit: {
    shortcut: ['Shift','O'],
    rotationSpeed: 0.3,
    keys: {
        // Orbit controls are handled by OrbitControls, but can add custom if needed
    }
},
focus: {
    shortcut: ['Shift','NumpadDecimal']
}
}