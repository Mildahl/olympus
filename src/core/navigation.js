function resolveSceneObject(scene, matcher) {
    let resolvedObject = null;

    if (!scene) {
        return resolvedObject;
    }

    scene.traverse((object) => {
        if (!resolvedObject && matcher(object)) {
            resolvedObject = object;
        }
    });

    return resolvedObject;
}

function resolveModeOptions(mode, { editor, vehicle = null, flyObject = null, grounds = [], extents = null, showInstructions = false }) {
    const modeOptions = { showInstructions };

    if (mode === 'DRIVE' && !vehicle) {
        modeOptions.vehicle = resolveSceneObject(editor?.scene, (object) => object.name === 'Truck' || object.userData?.type === 'Vehicle');
    } else if (vehicle) {
        modeOptions.vehicle = vehicle;
    }

    if ((mode === 'FLY' || mode === 'FIRST_PERSON') && !flyObject) {
        modeOptions.flyObject = resolveSceneObject(editor?.scene, (object) => object.name === 'Drone' || object.userData?.type === 'FlyingVehicle');
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
    const navController = editor?.navigationController;
    
    if (!navController) {
        console.warn('Navigation controller not available');

        return { status: 'ERROR', message: 'Navigation controller not available' };
    }

    const modeOptions = resolveModeOptions(mode, { editor, vehicle, flyObject, grounds, extents, showInstructions });
    
    navController.setMode(mode, modeOptions);
    
    return { status: 'FINISHED', mode, options: modeOptions };
}

function toggleFlyMode({ context, editor, signals, flyObject = null, showInstructions = false }) {
    if (!editor?.navigationController) {
        console.warn('Fly mode not available');

        return { status: 'ERROR', message: 'Fly mode not available' };
    }

    const mode = getNavigationMode({ editor }) === 'FLY' ? 'ORBIT' : 'FLY';

    setNavigationMode(mode, { context, editor, signals, flyObject, showInstructions });
    
    return { status: 'FINISHED' };
}

function toggleDriveMode({ context, editor, signals, vehicle = null, grounds = [], extents = null, showInstructions = false }) {
    if (!editor?.navigationController) {
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
    return editor?.navigationController?.mode || 'ORBIT';
}

function setNavigationSpeed(speed, { editor, signals }) {
    const navController = editor?.navigationController;
    
    if (navController) {
        navController.speed = speed;
        
        if (signals?.navigationSpeedChanged) {
            signals.navigationSpeedChanged.dispatch(speed);
        }
    }
    
    return speed;
}

function resetCamera({ editor, signals }) {
    if (editor?.resetCamera) {
        editor.resetCamera();
        
        if (signals?.cameraReset) {
            signals.cameraReset.dispatch();
        }
    }
}

function fitCameraToSelection({ editor, signals }) {
    if (editor?.fitToSelection) {
        editor.fitToSelection();
        
        if (signals?.cameraFitted) {
            signals.cameraFitted.dispatch();
        }
    }
}

function fitCameraToAll({ editor, signals }) {
    if (editor?.fitToAll) {
        editor.fitToAll();
        
        if (signals?.cameraFitted) {
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
    setNavigationSpeed,
    resetCamera,
    fitCameraToSelection,
    fitCameraToAll
};
