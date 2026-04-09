import type { IfcEntity, EntityRef } from './types.js';
export type { IfcEntity };
export declare class EntityExtractor {
    private buffer;
    constructor(buffer: Uint8Array);
    /**
     * Extract full entity data from a reference
     */
    extractEntity(ref: EntityRef): IfcEntity | null;
    private parseAttributes;
    private parseAttributeValue;
}
//# sourceMappingURL=entity-extractor.d.ts.map