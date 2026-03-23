/**
 * CompactEntityIndex - Memory-efficient entity index using typed arrays
 *
 * Replaces Map<number, EntityRef> with sorted typed arrays for O(log n) lookup.
 * For 8.4M entities, this saves ~400MB of Map overhead:
 *   - Map: ~56 bytes/entry overhead (key + value + hash table) = ~470MB
 *   - Typed arrays: ~16 bytes/entry (4 Uint32Arrays) = ~134MB
 *
 * Provides the same Map-like interface via get()/has() for drop-in compatibility.
 */
import type { EntityRef } from './types.js';
/**
 * Compact read-only entity index backed by sorted typed arrays.
 * Implements the same interface as Map<number, EntityRef> for lookups.
 */
export declare class CompactEntityIndex {
    /** Sorted array of expressIds for binary search */
    private readonly expressIds;
    /** Parallel array: byte offset in source buffer */
    private readonly byteOffsets;
    /** Parallel array: byte length of entity in source buffer */
    private readonly byteLengths;
    /** Parallel array: index into typeStrings for the entity type */
    private readonly typeIndices;
    /** Deduped type strings (typically < 800 unique types) */
    private readonly typeStrings;
    /** Type string → index lookup */
    private readonly typeStringMap;
    /** Total number of entries */
    readonly size: number;
    /** LRU cache for recently accessed EntityRefs */
    private lruCache;
    private readonly lruMaxSize;
    constructor(expressIds: Uint32Array, byteOffsets: Uint32Array, byteLengths: Uint32Array, typeIndices: Uint16Array, typeStrings: string[], lruMaxSize?: number);
    /**
     * Binary search for an expressId in the sorted array.
     * Returns the array index or -1 if not found.
     */
    private binarySearch;
    /**
     * Get EntityRef by expressId (Map-compatible interface).
     * Uses LRU cache to avoid repeated object allocation for hot entities.
     */
    get(expressId: number): EntityRef | undefined;
    /**
     * Check if an expressId exists (Map-compatible interface).
     */
    has(expressId: number): boolean;
    /**
     * Get the type string for an expressId without full EntityRef allocation.
     */
    getType(expressId: number): string | undefined;
    /**
     * Get byte offset and length for an expressId without full EntityRef allocation.
     */
    getByteRange(expressId: number): {
        byteOffset: number;
        byteLength: number;
    } | undefined;
    /**
     * Iterate over all entries (Map-compatible interface).
     * Yields [expressId, EntityRef] pairs.
     */
    [Symbol.iterator](): IterableIterator<[number, EntityRef]>;
    /**
     * Iterate over all expressIds (Map.keys()-compatible).
     */
    keys(): IterableIterator<number>;
    /**
     * Iterate over all EntityRefs (Map.values()-compatible).
     */
    values(): IterableIterator<EntityRef>;
    /**
     * Iterate over all entries (Map.entries()-compatible).
     */
    entries(): IterableIterator<[number, EntityRef]>;
    /**
     * forEach (Map-compatible interface).
     */
    forEach(callback: (value: EntityRef, key: number) => void): void;
    /**
     * Clear the LRU cache (e.g., on model unload).
     */
    clearCache(): void;
    /**
     * Estimate memory usage in bytes.
     */
    estimateMemoryBytes(): number;
}
/**
 * Build a CompactEntityIndex from an array of EntityRefs.
 * Sorts by expressId and deduplicates type strings.
 */
export declare function buildCompactEntityIndex(entityRefs: EntityRef[], lruMaxSize?: number): CompactEntityIndex;
//# sourceMappingURL=compact-entity-index.d.ts.map