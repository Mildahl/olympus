/**
 * Style Index Cache - Caches style index to IndexedDB for faster subsequent loads
 */
export interface StyleIndexData {
    [geometryExpressID: number]: [number, number, number, number];
}
/**
 * Style index cache using IndexedDB
 */
export declare class StyleIndexCache {
    private dbName;
    private dbVersion;
    private db;
    /**
     * Initialize IndexedDB
     */
    init(): Promise<void>;
    /**
     * Get cached style index for file hash
     */
    get(fileHash: string): Promise<StyleIndexData | null>;
    /**
     * Cache style index for file hash
     */
    set(fileHash: string, index: StyleIndexData): Promise<void>;
    /**
     * Calculate file hash and get/set cache
     */
    getCached(buffer: ArrayBuffer): Promise<StyleIndexData | null>;
    setCached(buffer: ArrayBuffer, index: StyleIndexData): Promise<void>;
    /**
     * Clear old cache entries (older than maxAgeDays)
     */
    cleanup(maxAgeDays?: number): Promise<void>;
}
//# sourceMappingURL=style-cache.d.ts.map