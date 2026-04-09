/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
/**
 * A source buffer that can be backed by either in-memory Uint8Array or OPFS.
 * Provides sync and async read interfaces.
 *
 * Usage:
 * ```ts
 * const source = await OpfsSourceBuffer.create(uint8Buffer);
 * // On-demand entity extraction:
 * const bytes = await source.readRange(byteOffset, byteLength);
 * // Or use the sync subarray for backwards compatibility:
 * const view = source.subarray(byteOffset, byteOffset + byteLength);
 * ```
 */
export class OpfsSourceBuffer {
    /** In-memory buffer (null when offloaded to OPFS) */
    memoryBuffer;
    /** OPFS sync access handle for range reads (null when in-memory) */
    fileHandle = null;
    /** Async file handle wrapper */
    asyncFileHandle = null;
    /** Total file size in bytes */
    byteLength;
    /** Whether the source is backed by OPFS */
    isOpfsBacked;
    /** OPFS file name (for cleanup) */
    opfsFileName = null;
    constructor(memoryBuffer, byteLength, isOpfsBacked) {
        this.memoryBuffer = memoryBuffer;
        this.byteLength = byteLength;
        this.isOpfsBacked = isOpfsBacked;
    }
    /**
     * Create an OpfsSourceBuffer, offloading to OPFS when available.
     *
     * @param buffer - The source IFC file bytes
     * @param forceMemory - If true, skip OPFS and keep in memory
     * @returns A new OpfsSourceBuffer instance
     */
    static async create(buffer, forceMemory = false) {
        if (forceMemory || !OpfsSourceBuffer.isOpfsAvailable()) {
            return new OpfsSourceBuffer(buffer, buffer.byteLength, false);
        }
        let fileName = null;
        let syncHandle = null;
        try {
            fileName = `ifc-source-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const root = await navigator.storage.getDirectory();
            const fileHandle = await root.getFileHandle(fileName, { create: true });
            // Write buffer to OPFS using sync access handle (fastest path)
            syncHandle = await fileHandle.createSyncAccessHandle();
            const bytesWritten = syncHandle.write(buffer, { at: 0 });
            if (bytesWritten !== buffer.byteLength) {
                syncHandle.close();
                const root = await navigator.storage.getDirectory();
                await root.removeEntry(fileName);
                throw new Error(`OPFS short write: wrote ${bytesWritten}/${buffer.byteLength} bytes`);
            }
            syncHandle.flush();
            const instance = new OpfsSourceBuffer(null, buffer.byteLength, true);
            instance.fileHandle = syncHandle;
            instance.asyncFileHandle = fileHandle;
            instance.opfsFileName = fileName;
            return instance;
        }
        catch {
            // OPFS failed — clean up partial resources and fall back to in-memory
            if (syncHandle) {
                try {
                    syncHandle.close();
                }
                catch { /* ignore */ }
            }
            if (fileName) {
                try {
                    const root = await navigator.storage.getDirectory();
                    await root.removeEntry(fileName);
                }
                catch { /* ignore */ }
            }
            return new OpfsSourceBuffer(buffer, buffer.byteLength, false);
        }
    }
    /**
     * Check if OPFS is available in the current context.
     */
    static isOpfsAvailable() {
        return (typeof globalThis !== 'undefined' &&
            typeof globalThis.navigator?.storage?.getDirectory === 'function');
    }
    /**
     * Read a byte range from the source buffer.
     * Works for both in-memory and OPFS-backed buffers.
     */
    readRange(byteOffset, byteLength) {
        if (byteOffset < 0 || byteLength < 0 || byteOffset + byteLength > this.byteLength) {
            throw new RangeError(`OpfsSourceBuffer.readRange: offset=${byteOffset} length=${byteLength} exceeds buffer size=${this.byteLength}`);
        }
        if (this.memoryBuffer) {
            // In-memory: zero-copy subarray view
            return this.memoryBuffer.subarray(byteOffset, byteOffset + byteLength);
        }
        if (this.fileHandle) {
            // OPFS sync access: read into a new buffer
            const dest = new Uint8Array(byteLength);
            const bytesRead = this.fileHandle.read(dest, { at: byteOffset });
            if (bytesRead < byteLength) {
                throw new Error(`OpfsSourceBuffer.readRange: short read (${bytesRead}/${byteLength} bytes at offset ${byteOffset})`);
            }
            return dest;
        }
        throw new Error('OpfsSourceBuffer: no backing store available');
    }
    /**
     * Synchronous subarray — for backward compatibility with code that
     * expects `source.subarray(start, end)`.
     *
     * When OPFS-backed, this allocates a new Uint8Array and reads from disk.
     * When in-memory, this returns a zero-copy view.
     */
    subarray(start, end) {
        return this.readRange(start, end - start);
    }
    /**
     * Get the full in-memory buffer (only available when not OPFS-backed).
     * Used as a migration aid — callers should prefer readRange().
     *
     * @throws Error if the buffer has been offloaded to OPFS
     */
    getMemoryBuffer() {
        if (this.memoryBuffer)
            return this.memoryBuffer;
        throw new Error('OpfsSourceBuffer: source has been offloaded to OPFS. Use readRange() instead.');
    }
    /**
     * Check if the in-memory buffer is still available.
     */
    hasMemoryBuffer() {
        return this.memoryBuffer !== null;
    }
    /**
     * Release OPFS resources and clean up the temporary file.
     * Call this when the model is unloaded.
     */
    async dispose() {
        if (this.fileHandle) {
            this.fileHandle.close();
            this.fileHandle = null;
        }
        if (this.opfsFileName) {
            try {
                const root = await navigator.storage.getDirectory();
                await root.removeEntry(this.opfsFileName);
            }
            catch {
                // Ignore cleanup errors
            }
            this.opfsFileName = null;
        }
        this.asyncFileHandle = null;
        this.memoryBuffer = null;
    }
}
//# sourceMappingURL=opfs-source-buffer.js.map