/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
/**
 * Compact read-only entity index backed by sorted typed arrays.
 * Implements the same interface as Map<number, EntityRef> for lookups.
 */
export class CompactEntityIndex {
    /** Sorted array of expressIds for binary search */
    expressIds;
    /** Parallel array: byte offset in source buffer */
    byteOffsets;
    /** Parallel array: byte length of entity in source buffer */
    byteLengths;
    /** Parallel array: index into typeStrings for the entity type */
    typeIndices;
    /** Deduped type strings (typically < 800 unique types) */
    typeStrings;
    /** Type string → index lookup */
    typeStringMap;
    /** Total number of entries */
    size;
    /** LRU cache for recently accessed EntityRefs */
    lruCache;
    lruMaxSize;
    constructor(expressIds, byteOffsets, byteLengths, typeIndices, typeStrings, lruMaxSize = 1024) {
        this.expressIds = expressIds;
        this.byteOffsets = byteOffsets;
        this.byteLengths = byteLengths;
        this.typeIndices = typeIndices;
        this.typeStrings = typeStrings;
        this.size = expressIds.length;
        this.lruMaxSize = lruMaxSize;
        this.lruCache = new Map();
        // Build type string → index map
        this.typeStringMap = new Map();
        for (let i = 0; i < typeStrings.length; i++) {
            this.typeStringMap.set(typeStrings[i], i);
        }
    }
    /**
     * Binary search for an expressId in the sorted array.
     * Returns the array index or -1 if not found.
     */
    binarySearch(expressId) {
        const ids = this.expressIds;
        let lo = 0;
        let hi = ids.length - 1;
        while (lo <= hi) {
            const mid = (lo + hi) >>> 1;
            const midVal = ids[mid];
            if (midVal === expressId)
                return mid;
            if (midVal < expressId)
                lo = mid + 1;
            else
                hi = mid - 1;
        }
        return -1;
    }
    /**
     * Get EntityRef by expressId (Map-compatible interface).
     * Uses LRU cache to avoid repeated object allocation for hot entities.
     */
    get(expressId) {
        // Check LRU cache first
        const cached = this.lruCache.get(expressId);
        if (cached !== undefined) {
            // Refresh recency: delete + re-insert moves to end of insertion order
            this.lruCache.delete(expressId);
            this.lruCache.set(expressId, cached);
            return cached;
        }
        const idx = this.binarySearch(expressId);
        if (idx < 0)
            return undefined;
        // Construct EntityRef from typed arrays
        const ref = {
            expressId,
            type: this.typeStrings[this.typeIndices[idx]],
            byteOffset: this.byteOffsets[idx],
            byteLength: this.byteLengths[idx],
            lineNumber: 0, // Not stored compactly; rarely needed
        };
        // Add to LRU cache
        this.lruCache.set(expressId, ref);
        if (this.lruCache.size > this.lruMaxSize) {
            // Delete oldest entry (first key in insertion order)
            const firstKey = this.lruCache.keys().next().value;
            if (firstKey !== undefined) {
                this.lruCache.delete(firstKey);
            }
        }
        return ref;
    }
    /**
     * Check if an expressId exists (Map-compatible interface).
     */
    has(expressId) {
        return this.binarySearch(expressId) >= 0;
    }
    /**
     * Get the type string for an expressId without full EntityRef allocation.
     */
    getType(expressId) {
        const idx = this.binarySearch(expressId);
        if (idx < 0)
            return undefined;
        return this.typeStrings[this.typeIndices[idx]];
    }
    /**
     * Get byte offset and length for an expressId without full EntityRef allocation.
     */
    getByteRange(expressId) {
        const idx = this.binarySearch(expressId);
        if (idx < 0)
            return undefined;
        return {
            byteOffset: this.byteOffsets[idx],
            byteLength: this.byteLengths[idx],
        };
    }
    /**
     * Iterate over all entries (Map-compatible interface).
     * Yields [expressId, EntityRef] pairs.
     */
    *[Symbol.iterator]() {
        for (let i = 0; i < this.size; i++) {
            const expressId = this.expressIds[i];
            const ref = {
                expressId,
                type: this.typeStrings[this.typeIndices[i]],
                byteOffset: this.byteOffsets[i],
                byteLength: this.byteLengths[i],
                lineNumber: 0,
            };
            yield [expressId, ref];
        }
    }
    /**
     * Iterate over all expressIds (Map.keys()-compatible).
     */
    *keys() {
        for (let i = 0; i < this.size; i++) {
            yield this.expressIds[i];
        }
    }
    /**
     * Iterate over all EntityRefs (Map.values()-compatible).
     */
    *values() {
        for (let i = 0; i < this.size; i++) {
            yield {
                expressId: this.expressIds[i],
                type: this.typeStrings[this.typeIndices[i]],
                byteOffset: this.byteOffsets[i],
                byteLength: this.byteLengths[i],
                lineNumber: 0,
            };
        }
    }
    /**
     * Iterate over all entries (Map.entries()-compatible).
     */
    entries() {
        return this[Symbol.iterator]();
    }
    /**
     * forEach (Map-compatible interface).
     */
    forEach(callback) {
        for (let i = 0; i < this.size; i++) {
            const expressId = this.expressIds[i];
            const ref = {
                expressId,
                type: this.typeStrings[this.typeIndices[i]],
                byteOffset: this.byteOffsets[i],
                byteLength: this.byteLengths[i],
                lineNumber: 0,
            };
            callback(ref, expressId);
        }
    }
    /**
     * Clear the LRU cache (e.g., on model unload).
     */
    clearCache() {
        this.lruCache.clear();
    }
    /**
     * Estimate memory usage in bytes.
     */
    estimateMemoryBytes() {
        return (this.expressIds.byteLength +
            this.byteOffsets.byteLength +
            this.byteLengths.byteLength +
            this.typeIndices.byteLength +
            this.typeStrings.reduce((sum, s) => sum + s.length * 2, 0));
    }
}
/**
 * Build a CompactEntityIndex from an array of EntityRefs.
 * Sorts by expressId and deduplicates type strings.
 */
export function buildCompactEntityIndex(entityRefs, lruMaxSize) {
    // Copy to avoid mutating the caller's array
    const sorted = entityRefs.slice();
    const count = sorted.length;
    // Sort by expressId for binary search
    sorted.sort((a, b) => a.expressId - b.expressId);
    // Deduplicate type strings
    const typeStringMap = new Map();
    const typeStrings = [];
    // Allocate typed arrays
    const expressIds = new Uint32Array(count);
    const byteOffsets = new Uint32Array(count);
    const byteLengths = new Uint32Array(count);
    const typeIndices = new Uint16Array(count);
    for (let i = 0; i < count; i++) {
        const ref = sorted[i];
        expressIds[i] = ref.expressId;
        byteOffsets[i] = ref.byteOffset;
        byteLengths[i] = ref.byteLength;
        let typeIdx = typeStringMap.get(ref.type);
        if (typeIdx === undefined) {
            typeIdx = typeStrings.length;
            typeStrings.push(ref.type);
            typeStringMap.set(ref.type, typeIdx);
        }
        typeIndices[i] = typeIdx;
    }
    return new CompactEntityIndex(expressIds, byteOffsets, byteLengths, typeIndices, typeStrings, lruMaxSize);
}
//# sourceMappingURL=compact-entity-index.js.map