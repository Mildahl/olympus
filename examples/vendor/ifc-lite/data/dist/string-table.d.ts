/**
 * String table - deduplicated string storage
 * Reduces memory by storing each unique string once
 */
export declare class StringTable {
    private strings;
    private index;
    readonly NULL_INDEX = -1;
    get count(): number;
    /**
     * Get string by index
     */
    get(idx: number): string;
    /**
     * Intern string (add if not exists, return index)
     */
    intern(value: string | null | undefined): number;
    /**
     * Check if string exists
     */
    has(value: string): boolean;
    /**
     * Get index of string (returns -1 if not found)
     */
    indexOf(value: string): number;
    /**
     * Get all strings (for debugging/export)
     */
    getAll(): string[];
}
//# sourceMappingURL=string-table.d.ts.map