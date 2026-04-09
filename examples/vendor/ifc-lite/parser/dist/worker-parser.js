/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
/**
 * Parser that uses Web Worker for true parallel execution
 */
export class WorkerParser {
    worker = null;
    workerUrl;
    constructor(options = {}) {
        // Use provided worker URL or detect automatically
        // We use .js extension in the URL as it will be correct in dist/
        // Vite will automatically handle this and map it to the .ts file in development
        this.workerUrl = options.workerUrl ?? new URL('./parser.worker.js', import.meta.url).href;
    }
    /**
     * Parse IFC file into columnar data store using Web Worker
     * Returns immediately, parsing happens in parallel
     */
    async parseColumnar(buffer, options = {}) {
        return new Promise((resolve, reject) => {
            // Generate unique ID for this parse request
            const id = `parse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            // Create worker
            try {
                this.worker = new Worker(this.workerUrl, { type: 'module' });
            }
            catch (error) {
                // Fallback: if worker creation fails, reject
                reject(new Error(`Failed to create worker: ${error}`));
                return;
            }
            // Handle worker messages
            this.worker.onmessage = (e) => {
                const { type, id: msgId, progress, dataStore, error } = e.data;
                if (msgId !== id) {
                    return; // Ignore messages for other requests
                }
                switch (type) {
                    case 'progress':
                        // Forward progress updates
                        options.onProgress?.(progress);
                        break;
                    case 'complete':
                        // Clean up worker
                        this.worker?.terminate();
                        this.worker = null;
                        resolve(dataStore);
                        break;
                    case 'error':
                        // Clean up worker
                        this.worker?.terminate();
                        this.worker = null;
                        reject(new Error(error));
                        break;
                }
            };
            this.worker.onerror = (error) => {
                // Clean up worker
                this.worker?.terminate();
                this.worker = null;
                reject(new Error(`Worker error: ${error.message}`));
            };
            // Transfer buffer to worker (caller is responsible for cloning if needed)
            // The worker will transfer/detach this buffer, so caller must clone before calling
            this.worker.postMessage({ buffer, id }, [buffer]);
        });
    }
    /**
     * Terminate the worker (cleanup)
     */
    terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
    }
}
//# sourceMappingURL=worker-parser.js.map