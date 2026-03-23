/**
 * IFC-Lite Logger - Provides consistent error logging across packages
 *
 * Log levels:
 * - error: Always logged - critical failures that affect functionality
 * - warn: Always logged - recoverable issues, degraded functionality
 * - info: Logged when DEBUG is set - general operational info
 * - debug: Logged when DEBUG is set - detailed debugging info
 *
 * Enable debug logging by setting:
 * - localStorage.setItem('IFC_DEBUG', 'true') in browser
 * - IFC_DEBUG=true environment variable in Node.js
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';
export interface LogContext {
    /** Component/module name (e.g., 'Parser', 'Geometry', 'SpatialHierarchy') */
    component: string;
    /** Operation being performed (e.g., 'parseEntity', 'extractElevation') */
    operation?: string;
    /** Entity ID if applicable */
    entityId?: number;
    /** Entity type if applicable */
    entityType?: string;
    /** Additional context data */
    data?: Record<string, unknown>;
}
/**
 * Create a logger instance for a specific component
 */
export declare function createLogger(component: string): {
    /**
     * Log an error - always visible in console
     * Use for critical failures that affect functionality
     */
    error(message: string, error?: unknown, ctx?: Partial<LogContext>): void;
    /**
     * Log a warning - always visible in console
     * Use for recoverable issues or degraded functionality
     */
    warn(message: string, ctx?: Partial<LogContext>): void;
    /**
     * Log info - only visible when IFC_DEBUG=true
     * Use for general operational information
     */
    info(message: string, ctx?: Partial<LogContext>): void;
    /**
     * Log debug - only visible when IFC_DEBUG=true
     * Use for detailed debugging information
     */
    debug(message: string, data?: unknown, ctx?: Partial<LogContext>): void;
    /**
     * Log a caught error with context - visible when IFC_DEBUG=true
     * Use in catch blocks where the error is handled/recovered
     */
    caught(message: string, error: unknown, ctx?: Partial<LogContext>): void;
};
/**
 * Global logger for one-off logging without creating an instance
 */
export declare const logger: {
    error(component: string, message: string, error?: unknown): void;
    warn(component: string, message: string): void;
    info(component: string, message: string): void;
    debug(component: string, message: string, data?: unknown): void;
};
//# sourceMappingURL=logger.d.ts.map