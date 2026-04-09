/**
 * STEP value types
 */
export type StepValue = string | number | boolean | null | undefined | StepValue[] | EntityRef | EnumValue;
/**
 * Entity reference (#123)
 */
export interface EntityRef {
    ref: number;
}
/**
 * Enum value (.VALUE.)
 */
export interface EnumValue {
    enum: string;
}
/**
 * Check if value is an entity reference
 */
export declare function isEntityRef(value: unknown): value is EntityRef;
/**
 * Check if value is an enum value
 */
export declare function isEnumValue(value: unknown): value is EnumValue;
/**
 * Create an entity reference
 */
export declare function ref(id: number): EntityRef;
/**
 * Create an enum value
 */
export declare function enumVal(value: string): EnumValue;
/**
 * Base interface for serializable entities
 */
export interface StepEntity {
    /** Express ID (#123) */
    expressId: number;
    /** IFC type name */
    type: string;
    /** Attribute values */
    [key: string]: unknown;
}
/**
 * Serialize a single value to STEP format
 */
export declare function serializeValue(value: StepValue): string;
/**
 * Serialize an entity to a STEP line
 */
export declare function toStepLine(entity: StepEntity): string;
/**
 * Generate STEP file header
 */
export declare function generateHeader(options: {
    description?: string;
    author?: string;
    organization?: string;
    application?: string;
    schema: 'IFC2X3' | 'IFC4' | 'IFC4X3' | 'IFC5';
    filename?: string;
}): string;
/**
 * Generate complete STEP file content
 */
export declare function generateStepFile(entities: StepEntity[], options: Parameters<typeof generateHeader>[0]): string;
/**
 * Parse a STEP value from string
 */
export declare function parseStepValue(str: string): StepValue;
//# sourceMappingURL=serializers.d.ts.map