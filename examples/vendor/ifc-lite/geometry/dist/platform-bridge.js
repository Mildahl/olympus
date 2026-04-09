/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
/**
 * Detect if running in Tauri desktop environment
 */
export function isTauri() {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
/**
 * Create the appropriate platform bridge based on runtime environment
 *
 * In Tauri: Returns NativeBridge (native Rust processing)
 * In Browser: Returns WasmBridge (WASM processing)
 */
export async function createPlatformBridge() {
    if (isTauri()) {
        const { NativeBridge } = await import('./native-bridge.js');
        return new NativeBridge();
    }
    else {
        const { WasmBridge } = await import('./wasm-bridge.js');
        return new WasmBridge();
    }
}
//# sourceMappingURL=platform-bridge.js.map