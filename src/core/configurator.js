/**
 * Configurator Core Functions
 * 
 * Core business logic for application configuration and templates.
 * These functions are called by operators and should remain decoupled from UI.
 */
/**
 * Load configuration templates
 * @param {Array} modules - Array of module configurations
 * @param {Object} options
 * @param {Object} options.context - Application context
 * @param {Object} options.signals - Context signals
 */
function loadTemplates(modules, { context, signals }) {
    
    if (signals?.templatesLoaded) {
        signals.templatesLoaded.dispatch(modules);
    }
    
    return { status: 'FINISHED', modules };
}

/**
 * Choose an avatar/role configuration
 * @param {string} avatarId - Avatar identifier
 * @param {Object} options
 */
function chooseAvatar(avatarId, { context, signals }) {
    context.currentAvatar = avatarId;
    
    if (signals?.avatarChosen) {
        signals.avatarChosen.dispatch(avatarId);
    }
    
    return { status: 'FINISHED', avatarId };
}
/**
 * Get current configuration
 * @param {Object} options
 * @returns {Object} Current configuration
 */
function getConfiguration({ context }) {
    return {
        ui: context.config?.ui,
        app: context.config?.app
    };
}

/**
 * Update UI configuration
 * @param {Object} uiConfig - New UI configuration
 * @param {Object} options
 */
function updateUIConfiguration(uiConfig, { context, signals }) {
    context.config.ui = {
        ...context.config.ui,
        ...uiConfig
    };
    
    if (signals?.configurationUpdated) {
        signals.configurationUpdated.dispatch({ type: 'ui', config: uiConfig });
    }
    
    return { status: 'FINISHED' };
}

/**
 * Update application configuration
 * @param {Object} appConfig - New application configuration
 * @param {Object} options
 */
function updateAppConfiguration(appConfig, { context, signals }) {
    context.config.app = {
        ...context.config.app,
        ...appConfig
    };
    
    if (signals?.configurationUpdated) {
        signals.configurationUpdated.dispatch({ type: 'app', config: appConfig });
    }
    
    return { status: 'FINISHED' };
}

/**
 * Save configuration to storage
 * @param {Object} options
 */
function saveConfiguration({ context, signals }) {
    if (context._saveConfig) {
        context._saveConfig();
    }
    
    if (signals?.configurationSaved) {
        signals.configurationSaved.dispatch();
    }
    
    return { status: 'FINISHED' };
}

/**
 * Reset configuration to defaults
 * @param {Object} options
 */
function resetConfiguration({ context, signals }) {
    if (context._resetConfig) {
        context._resetConfig();
    }
    
    if (signals?.configurationReset) {
        signals.configurationReset.dispatch();
    }
    
    return { status: 'FINISHED' };
}
/**
 * Get active modules
 * @param {Object} options
 * @returns {Array} Array of active module IDs
 */
function getActiveModules({ context }) {
    const coreModules = context.config?.app?.CoreModules || [];

    return coreModules
        .filter(m => m.active !== false)
        .map(m => m.id);
}

/**
 * Enable a module
 * @param {string} moduleId - Module ID
 * @param {Object} options
 */
function enableModule(moduleId, { context, signals }) {
    const coreModules = context.config?.app?.CoreModules || [];

    const module = coreModules.find(m => m.id === moduleId);
    
    if (module) {
        module.active = true;
        
        if (signals?.moduleEnabled) {
            signals.moduleEnabled.dispatch(moduleId);
        }
    }
    
    return { status: 'FINISHED', moduleId };
}

/**
 * Disable a module
 * @param {string} moduleId - Module ID
 * @param {Object} options
 */
function disableModule(moduleId, { context, signals }) {
    const coreModules = context.config?.app?.CoreModules || [];

    const module = coreModules.find(m => m.id === moduleId);
    
    if (module) {
        module.active = false;
        
        if (signals?.moduleDisabled) {
            signals.moduleDisabled.dispatch(moduleId);
        }
    }
    
    return { status: 'FINISHED', moduleId };
}
/**
 * Get available job roles
 * @param {Object} options
 * @returns {Array} Array of job role configurations
 */
function getJobRoles({ context }) {
    return context.config?.app?.jobRoles || [];
}

/**
 * Apply job role configuration
 * @param {string} roleId - Job role ID
 * @param {Object} options
 */
function applyJobRole(roleId, { context, signals }) {
    const roles = context.config?.app?.jobRoles || [];

    const role = roles.find(r => r.id === roleId);
    
    if (!role) {
        return { status: 'ERROR', message: `Job role '${roleId}' not found` };
    }
    if (role.modules) {
        role.modules.forEach(moduleConfig => {
            const coreModules = context.config?.app?.CoreModules || [];

            const module = coreModules.find(m => m.id === moduleConfig.id);
            
            if (module) {
                module.active = moduleConfig.active;
            }
        });
    }
    
    context.currentJobRole = roleId;
    
    if (signals?.jobRoleApplied) {
        signals.jobRoleApplied.dispatch({ roleId, role });
    }
    
    return { status: 'FINISHED', roleId, role };
}

export {
    loadTemplates,
    chooseAvatar,
    getConfiguration,
    updateUIConfiguration,
    updateAppConfiguration,
    saveConfiguration,
    resetConfiguration,
    getActiveModules,
    enableModule,
    disableModule,
    getJobRoles,
    applyJobRole
};
