/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
function isDebugEnabled() {
    // Check browser localStorage
    if (typeof localStorage !== 'undefined') {
        try {
            return localStorage.getItem('IFC_DEBUG') === 'true';
        }
        catch {
            // localStorage not available (e.g., in some workers)
        }
    }
    // Check Node.js environment
    if (typeof process !== 'undefined' && process.env) {
        return process.env.IFC_DEBUG === 'true';
    }
    return false;
}
function formatContext(ctx) {
    let prefix = `[${ctx.component}]`;
    if (ctx.operation) {
        prefix += ` ${ctx.operation}`;
    }
    if (ctx.entityId !== undefined) {
        prefix += ` #${ctx.entityId}`;
    }
    if (ctx.entityType) {
        prefix += ` (${ctx.entityType})`;
    }
    return prefix;
}
function formatError(error) {
    if (error instanceof Error) {
        return `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ''}`;
    }
    return String(error);
}
/**
 * Create a logger instance for a specific component
 */
export function createLogger(component) {
    return {
        /**
         * Log an error - always visible in console
         * Use for critical failures that affect functionality
         */
        error(message, error, ctx) {
            const prefix = formatContext({ component, ...ctx });
            if (error !== undefined) {
                if (ctx?.data !== undefined) {
                    console.error(`${prefix} ${message}:`, formatError(error), ctx.data);
                }
                else {
                    console.error(`${prefix} ${message}:`, formatError(error));
                }
            }
            else {
                if (ctx?.data !== undefined) {
                    console.error(`${prefix} ${message}`, ctx.data);
                }
                else {
                    console.error(`${prefix} ${message}`);
                }
            }
        },
        /**
         * Log a warning - always visible in console
         * Use for recoverable issues or degraded functionality
         */
        warn(message, ctx) {
            const prefix = formatContext({ component, ...ctx });
            if (ctx?.data !== undefined) {
                console.warn(`${prefix} ${message}`, ctx.data);
            }
            else {
                console.warn(`${prefix} ${message}`);
            }
        },
        /**
         * Log info - only visible when IFC_DEBUG=true
         * Use for general operational information
         */
        info(message, ctx) {
            if (!isDebugEnabled())
                return;
            const prefix = formatContext({ component, ...ctx });
            if (ctx?.data !== undefined) {
                console.log(`${prefix} ${message}`, ctx.data);
            }
            else {
                console.log(`${prefix} ${message}`);
            }
        },
        /**
         * Log debug - only visible when IFC_DEBUG=true
         * Use for detailed debugging information
         */
        debug(message, data, ctx) {
            if (!isDebugEnabled())
                return;
            const prefix = formatContext({ component, ...ctx });
            if (data !== undefined) {
                console.debug(`${prefix} ${message}`, data);
            }
            else {
                console.debug(`${prefix} ${message}`);
            }
        },
        /**
         * Log a caught error with context - visible when IFC_DEBUG=true
         * Use in catch blocks where the error is handled/recovered
         */
        caught(message, error, ctx) {
            if (!isDebugEnabled())
                return;
            const prefix = formatContext({ component, ...ctx });
            if (ctx?.data !== undefined) {
                console.debug(`${prefix} ${message} (recovered):`, formatError(error), ctx.data);
            }
            else {
                console.debug(`${prefix} ${message} (recovered):`, formatError(error));
            }
        },
    };
}
/**
 * Global logger for one-off logging without creating an instance
 */
export const logger = {
    error(component, message, error) {
        createLogger(component).error(message, error);
    },
    warn(component, message) {
        createLogger(component).warn(message);
    },
    info(component, message) {
        createLogger(component).info(message);
    },
    debug(component, message, data) {
        createLogger(component).debug(message, data);
    },
};
//# sourceMappingURL=logger.js.map