/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
/**
 * Calculate simple hash of buffer for cache key
 */
async function calculateFileHash(buffer) {
    // Use Web Crypto API for fast hashing
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
/**
 * Style index cache using IndexedDB
 */
export class StyleIndexCache {
    dbName = 'ifc-lite-style-cache';
    dbVersion = 1;
    db = null;
    /**
     * Initialize IndexedDB
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('styles')) {
                    db.createObjectStore('styles', { keyPath: 'hash' });
                }
            };
        });
    }
    /**
     * Get cached style index for file hash
     */
    async get(fileHash) {
        if (!this.db) {
            await this.init();
        }
        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve(null);
                return;
            }
            const transaction = this.db.transaction(['styles'], 'readonly');
            const store = transaction.objectStore('styles');
            const request = store.get(fileHash);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const result = request.result;
                resolve(result ? result.index : null);
            };
        });
    }
    /**
     * Cache style index for file hash
     */
    async set(fileHash, index) {
        if (!this.db) {
            await this.init();
        }
        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve();
                return;
            }
            const transaction = this.db.transaction(['styles'], 'readwrite');
            const store = transaction.objectStore('styles');
            const request = store.put({
                hash: fileHash,
                index,
                timestamp: Date.now(),
            });
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }
    /**
     * Calculate file hash and get/set cache
     */
    async getCached(buffer) {
        const hash = await calculateFileHash(buffer);
        return this.get(hash);
    }
    async setCached(buffer, index) {
        const hash = await calculateFileHash(buffer);
        await this.set(hash, index);
    }
    /**
     * Clear old cache entries (older than maxAgeDays)
     */
    async cleanup(maxAgeDays = 30) {
        if (!this.db) {
            await this.init();
        }
        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve();
                return;
            }
            const transaction = this.db.transaction(['styles'], 'readwrite');
            const store = transaction.objectStore('styles');
            const request = store.openCursor();
            const cutoffTime = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
            request.onerror = () => reject(request.error);
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    if (cursor.value.timestamp < cutoffTime) {
                        cursor.delete();
                    }
                    cursor.continue();
                }
                else {
                    resolve();
                }
            };
        });
    }
}
//# sourceMappingURL=style-cache.js.map