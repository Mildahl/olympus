import NavigationTool from "../tool/viewer/NavigationTool.js";

function resolveModeOptions(mode, { editor, vehicle = null, flyObject = null, grounds = [], extents = null, showInstructions = false }) {
    const modeOptions = { showInstructions };

    const scene = editor && editor.scene ? editor.scene : null;

    if (mode === 'DRIVE' && !vehicle) {
        modeOptions.vehicle = NavigationTool.findDefaultVehicleInScene();
    } else if (vehicle) {
        modeOptions.vehicle = vehicle;
    }

    if ((mode === 'FLY' || mode === 'FIRST_PERSON') && !flyObject) {
        modeOptions.flyObject = NavigationTool.findDefaultFlyingObjectInScene();
    } else if (flyObject) {
        modeOptions.flyObject = flyObject;
    }

    if (mode === 'DRIVE') {
        modeOptions.grounds = grounds;

        modeOptions.extents = extents;
    }

    return modeOptions;
}

function setNavigationMode(mode, { context, editor, signals, vehicle = null, flyObject = null, grounds = [], extents = null, showInstructions = false }) {
    const navController = editor && editor.navigationController ? editor.navigationController : null;

    if (!navController) {
        console.warn('Navigation controller not available');

        return { status: 'ERROR', message: 'Navigation controller not available' };
    }

    const modeOptions = resolveModeOptions(mode, { editor, vehicle, flyObject, grounds, extents, showInstructions });

    navController.setMode(mode, modeOptions);

    return { status: 'FINISHED', mode, options: modeOptions };
}

function toggleFlyMode({ context, editor, signals, flyObject = null, showInstructions = false }) {
    if (!editor || !editor.navigationController) {
        console.warn('Fly mode not available');

        return { status: 'ERROR', message: 'Fly mode not available' };
    }

    const mode = getNavigationMode({ editor }) === 'FLY' ? 'ORBIT' : 'FLY';

    setNavigationMode(mode, { context, editor, signals, flyObject, showInstructions });

    return { status: 'FINISHED' };
}

function toggleDriveMode({ context, editor, signals, vehicle = null, grounds = [], extents = null, showInstructions = false }) {
    if (!editor || !editor.navigationController) {
        console.warn('Drive mode not available');

        return { status: 'ERROR', message: 'Drive mode not available' };
    }

    const mode = getNavigationMode({ editor }) === 'DRIVE' ? 'ORBIT' : 'DRIVE';

    setNavigationMode(mode, { context, editor, signals, vehicle, grounds, extents, showInstructions });

    return { status: 'FINISHED' };
}

function setOrbitMode({ context, editor, signals }) {
    return setNavigationMode('ORBIT', { context, editor, signals });
}

function getNavigationMode({ editor }) {
    if (!editor || !editor.navigationController) {
        return 'ORBIT';
    }
    return editor.navigationController.mode || 'ORBIT';
}

function toggleFlyCameraRig({ editor }) {
    const navController = editor && editor.navigationController;

    if (!navController) {
        console.warn('Navigation controller not available');

        return { status: 'ERROR', message: 'Navigation controller not available' };
    }

    navController.toggleCameraViewMode();

    return { status: 'FINISHED', cameraViewMode: navController.getCameraViewMode() };
}

function getFlyCameraRig({ editor }) {
    const navController = editor && editor.navigationController;

    if (!navController) {
        return null;
    }

    return navController.getCameraViewMode();
}

function setNavigationSpeed(speed, { editor, signals }) {
    const navController = editor && editor.navigationController ? editor.navigationController : null;

    if (navController) {
        navController.speed = speed;

        if (signals && signals.navigationSpeedChanged) {
            signals.navigationSpeedChanged.dispatch(speed);
        }
    }

    return speed;
}

function resetCamera({ editor, signals }) {
    if (editor && editor.resetCamera) {
        editor.resetCamera();

        if (signals && signals.cameraReset) {
            signals.cameraReset.dispatch();
        }
    }
}

function fitCameraToSelection({ editor, signals }) {
    if (editor && editor.fitToSelection) {
        editor.fitToSelection();

        if (signals && signals.cameraFitted) {
            signals.cameraFitted.dispatch();
        }
    }
}

function fitCameraToAll({ editor, signals }) {
    if (editor && editor.fitToAll) {
        editor.fitToAll();

        if (signals && signals.cameraFitted) {
            signals.cameraFitted.dispatch();
        }
    }
}

export {
    setNavigationMode,
    toggleFlyMode,
    toggleDriveMode,
    setOrbitMode,
    getNavigationMode,
    toggleFlyCameraRig,
    getFlyCameraRig,
    setNavigationSpeed,
    resetCamera,
    fitCameraToSelection,
    fitCameraToAll,
};
