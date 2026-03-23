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
export declare class OpfsSourceBuffer {
    /** In-memory buffer (null when offloaded to OPFS) */
    private memoryBuffer;
    /** OPFS sync access handle for range reads (null when in-memory) */
    private fileHandle;
    /** Async file handle wrapper */
    private asyncFileHandle;
    /** Total file size in bytes */
    readonly byteLength: number;
    /** Whether the source is backed by OPFS */
    readonly isOpfsBacked: boolean;
    /** OPFS file name (for cleanup) */
    private opfsFileName;
    private constructor();
    /**
     * Create an OpfsSourceBuffer, offloading to OPFS when available.
     *
     * @param buffer - The source IFC file bytes
     * @param forceMemory - If true, skip OPFS and keep in memory
     * @returns A new OpfsSourceBuffer instance
     */
    static create(buffer: Uint8Array, forceMemory?: boolean): Promise<OpfsSourceBuffer>;
    /**
     * Check if OPFS is available in the current context.
     */
    static isOpfsAvailable(): boolean;
    /**
     * Read a byte range from the source buffer.
     * Works for both in-memory and OPFS-backed buffers.
     */
    readRange(byteOffset: number, byteLength: number): Uint8Array;
    /**
     * Synchronous subarray — for backward compatibility with code that
     * expects `source.subarray(start, end)`.
     *
     * When OPFS-backed, this allocates a new Uint8Array and reads from disk.
     * When in-memory, this returns a zero-copy view.
     */
    subarray(start: number, end: number): Uint8Array;
    /**
     * Get the full in-memory buffer (only available when not OPFS-backed).
     * Used as a migration aid — callers should prefer readRange().
     *
     * @throws Error if the buffer has been offloaded to OPFS
     */
    getMemoryBuffer(): Uint8Array;
    /**
     * Check if the in-memory buffer is still available.
     */
    hasMemoryBuffer(): boolean;
    /**
     * Release OPFS resources and clean up the temporary file.
     * Call this when the model is unloaded.
     */
    dispose(): Promise<void>;
}
//# sourceMappingURL=opfs-source-buffer.d.ts.map