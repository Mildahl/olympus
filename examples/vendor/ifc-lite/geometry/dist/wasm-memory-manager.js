/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
/**
 * Manages zero-copy TypedArray views into WASM linear memory
 */
export class WasmMemoryManager {
    memory;
    cachedBuffer = null;
    constructor(memory) {
        this.memory = memory;
    }
    /**
     * Get current memory buffer, detecting if it has changed (grown)
     */
    getBuffer() {
        const currentBuffer = this.memory.buffer;
        if (this.cachedBuffer !== currentBuffer) {
            // Memory has grown - all existing views are invalid!
            this.cachedBuffer = currentBuffer;
        }
        return currentBuffer;
    }
    /**
     * Create a Float32Array view directly into WASM memory (NO COPY!)
     *
     * WARNING: View becomes invalid if WASM memory grows!
     * Use immediately and discard.
     *
     * @param byteOffset Byte offset into WASM memory (ptr value from Rust)
     * @param length Number of f32 elements (not bytes)
     */
    createFloat32View(byteOffset, length) {
        const buffer = this.getBuffer();
        return new Float32Array(buffer, byteOffset, length);
    }
    /**
     * Create a Uint32Array view directly into WASM memory (NO COPY!)
     *
     * @param byteOffset Byte offset into WASM memory
     * @param length Number of u32 elements (not bytes)
     */
    createUint32View(byteOffset, length) {
        const buffer = this.getBuffer();
        return new Uint32Array(buffer, byteOffset, length);
    }
    /**
     * Create a Float64Array view directly into WASM memory (NO COPY!)
     *
     * @param byteOffset Byte offset into WASM memory
     * @param length Number of f64 elements (not bytes)
     */
    createFloat64View(byteOffset, length) {
        const buffer = this.getBuffer();
        return new Float64Array(buffer, byteOffset, length);
    }
    /**
     * Create a Uint8Array view directly into WASM memory (NO COPY!)
     *
     * @param byteOffset Byte offset into WASM memory
     * @param length Number of bytes
     */
    createUint8View(byteOffset, length) {
        const buffer = this.getBuffer();
        return new Uint8Array(buffer, byteOffset, length);
    }
    /**
     * Check if a view is still valid (memory hasn't grown)
     */
    isViewValid(view) {
        return view.buffer === this.memory.buffer;
    }
    /**
     * Get raw ArrayBuffer (for advanced use cases)
     */
    getRawBuffer() {
        return this.getBuffer();
    }
    /**
     * Check if memory has grown since last access
     */
    hasMemoryGrown() {
        return this.cachedBuffer !== null && this.cachedBuffer !== this.memory.buffer;
    }
}
//# sourceMappingURL=wasm-memory-manager.js.map