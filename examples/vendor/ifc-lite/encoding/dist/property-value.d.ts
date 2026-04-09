/**
 * Result of parsing a property value.
 * Contains the display value and optional IFC type for tooltip.
 */
export interface ParsedPropertyValue {
    displayValue: string;
    ifcType?: string;
}
/**
 * Parse and format a property value for display.
 * Handles:
 * - TypedValues like [IFCIDENTIFIER, '100 x 150mm'] -> display '100 x 150mm', tooltip 'Identifier'
 * - Boolean enums like '.T.' -> 'True'
 * - IFC encoded strings with \X2\, \X\ escape sequences
 * - Null/undefined -> '\u2014'
 * - Regular values -> string conversion
 */
export declare function parsePropertyValue(value: unknown): ParsedPropertyValue;
//# sourceMappingURL=property-value.d.ts.map