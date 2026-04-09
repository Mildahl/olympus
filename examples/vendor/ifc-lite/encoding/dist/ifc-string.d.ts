/**
 * Decode IFC STEP encoded strings.
 * Handles:
 * - \X2\XXXX\X0\ - Unicode hex encoding (e.g., \X2\00E4\X0\ -> a with umlaut)
 * - \X4\XXXXXXXX\X0\ - Unicode 4-byte hex for chars outside BMP
 * - \X\XX\ - ISO-8859-1 hex encoding
 * - \S\X - Extended ASCII with escape
 * - \P..\ - Code page switches (supported as directives and removed)
 */
export declare function decodeIfcString(str: string): string;
/**
 * Encode a Unicode string to IFC STEP string escapes.
 *
 * - Printable ASCII (32..126) is kept as-is.
 * - 8-bit values are encoded as \X\HH.
 * - BMP values are encoded as \X2\HHHH\X0\.
 * - Non-BMP values are encoded as \X4\HHHHHHHH\X0\.
 */
export declare function encodeIfcString(str: string): string;
//# sourceMappingURL=ifc-string.d.ts.map