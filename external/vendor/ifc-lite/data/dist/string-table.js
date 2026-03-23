/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
/**
 * String table - deduplicated string storage
 * Reduces memory by storing each unique string once
 */
export class StringTable {
    strings = [''];
    index = new Map([['', 0]]);
    NULL_INDEX = -1;
    get count() {
        return this.strings.length;
    }
    /**
     * Get string by index
     */
    get(idx) {
        if (idx < 0 || idx >= this.strings.length) {
            return '';
        }
        return this.strings[idx];
    }
    /**
     * Intern string (add if not exists, return index)
     */
    intern(value) {
        if (value === null || value === undefined) {
            return this.NULL_INDEX;
        }
        const existing = this.index.get(value);
        if (existing !== undefined) {
            return existing;
        }
        const newIndex = this.strings.length;
        this.strings.push(value);
        this.index.set(value, newIndex);
        return newIndex;
    }
    /**
     * Check if string exists
     */
    has(value) {
        return this.index.has(value);
    }
    /**
     * Get index of string (returns -1 if not found)
     */
    indexOf(value) {
        return this.index.get(value) ?? -1;
    }
    /**
     * Get all strings (for debugging/export)
     */
    getAll() {
        return [...this.strings];
    }
}
//# sourceMappingURL=string-table.js.map