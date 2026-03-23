/**
 * Entity index builder - creates fast lookup structures
 */
import type { EntityRef, EntityIndex } from './types.js';
export declare class EntityIndexBuilder {
    private byId;
    private byType;
    addEntity(ref: EntityRef): void;
    build(): EntityIndex;
}
//# sourceMappingURL=entity-index.d.ts.map