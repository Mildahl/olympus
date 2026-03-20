/**
 * Theme Core Functions
 * 
 * Core business logic for theme and styling management.
 * These functions are called by operators and should remain decoupled from UI.
 */
/**
 * Apply CSS properties to document root
 * @param {Object} cssPropertyData - Object with CSS property data
 */
function applyTheme(cssPropertyData) {
    for (const key in cssPropertyData) {
        const cssData = cssPropertyData[key];

        document.documentElement.style.setProperty(cssData.key, cssData.value);
    }
}

/**
 * Determine if it's day or night based on current time
 * @returns {string} 'day' or 'night'
 */
function whichHalfDay() {
    const currentHour = new Date().getHours();
    if (currentHour >= 7 && currentHour < 19) {
        return 'day';
    }

    return 'night';
}
/**
 * Change the current theme
 * @param {string} theme - Theme name: 'day', 'night', or 'auto'
 * @param {Object} options
 * @param {Object} options.context - Application context
 * @param {Object} options.editor - Editor instance
 * @param {Object} options.signals - Context signals
 */
function changeTheme(theme, { context, editor, signals }) {
    
    let resolvedTheme = theme;
    const ui = context?.config?.ui;
    if (!ui?.theme) {
        return { status: 'ERROR', message: 'Theme config not available (context.config.ui not set by AECO initialisation)' };
    }

    if (theme === 'auto') {
        resolvedTheme = whichHalfDay();
    }
    ui.theme.current = resolvedTheme;
    const cssPropertyData = ui.theme.colors[resolvedTheme];
    
    if (!cssPropertyData) {
        console.warn(`Theme '${resolvedTheme}' not found in config`);

        return { status: 'ERROR', message: `Theme '${resolvedTheme}' not found` };
    }
    applyTheme(cssPropertyData);
    if (editor?.signals?.sceneBackgroundChanged && cssPropertyData.background) {
        editor.signals.sceneBackgroundChanged.dispatch(
            'Color',
            cssPropertyData.background.value,
            null, null, null, null, null, null
        );
    }
    if (signals?.themeChanged) {
        signals.themeChanged.dispatch(resolvedTheme);
    }
    
    return { status: 'FINISHED', theme: resolvedTheme };
}

/**
 * Change theme colors
 * @param {string} theme - Theme name to update
 * @param {Object} cssPropertyData - New CSS property data
 * @param {Object} options
 */
function changeThemeColors(theme, cssPropertyData, { context, editor, signals }) {
    const ui = context?.config?.ui;
    if (!ui?.theme) {
        return { status: 'ERROR', message: 'Theme config not available (context.config.ui not set by AECO initialisation)' };
    }
    
    ui.theme.colors[theme] = cssPropertyData;
    applyTheme(cssPropertyData);
    if (editor?.signals?.sceneBackgroundChanged && cssPropertyData.background) {
        editor.signals.sceneBackgroundChanged.dispatch(
            'Color',
            cssPropertyData.background.value,
            null, null, null, null, null, null
        );
    }
    if (signals?.themeColorsChanged) {
        signals.themeColorsChanged.dispatch({ theme, colors: cssPropertyData });
    }
    
    return { status: 'FINISHED', theme, colors: cssPropertyData };
}

/**
 * Get current theme
 * @param {Object} options
 * @returns {string} Current theme name
 */
function getCurrentTheme({ context }) {
    return context?.config?.ui?.theme?.current || 'day';
}

/**
 * Get theme colors
 * @param {string} theme - Theme name
 * @param {Object} options
 * @returns {Object} Theme colors
 */
function getThemeColors(theme, { context }) {
    return context?.config?.ui?.theme?.colors?.[theme] || {};
}

/**
 * Get all available themes
 * @param {Object} options
 * @returns {Array} Array of theme names
 */
function getAvailableThemes({ context }) {
    const colors = context?.config?.ui?.theme?.colors || {};

    return Object.keys(colors);
}

/**
 * Register a new theme
 * @param {string} themeName - Theme name
 * @param {Object} colors - Theme colors object
 * @param {Object} options
 */
function registerTheme(themeName, colors, { context, signals }) {
    const ui = context?.config?.ui;
    if (!ui?.theme) {
        return { status: 'ERROR', message: 'Theme config not available (context.config.ui not set by AECO initialisation)' };
    }
    if (!ui.theme.colors) {
        ui.theme.colors = {};
    }
    
    ui.theme.colors[themeName] = colors;
    
    if (signals?.themeRegistered) {
        signals.themeRegistered.dispatch({ themeName, colors });
    }
    
    return { status: 'FINISHED', themeName };
}

/**
 * Get CSS variable value
 * @param {string} variableName - CSS variable name (with or without --)
 * @returns {string} CSS variable value
 */
function getCSSVariable(variableName) {
    const name = variableName.startsWith('--') ? variableName : `--${variableName}`;

    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Set CSS variable value
 * @param {string} variableName - CSS variable name
 * @param {string} value - New value
 */
function setCSSVariable(variableName, value) {
    const name = variableName.startsWith('--') ? variableName : `--${variableName}`;

    document.documentElement.style.setProperty(name, value);
}

export {
    applyTheme,
    whichHalfDay,
    changeTheme,
    changeThemeColors,
    getCurrentTheme,
    getThemeColors,
    getAvailableThemes,
    registerTheme,
    getCSSVariable,
    setCSSVariable
};
