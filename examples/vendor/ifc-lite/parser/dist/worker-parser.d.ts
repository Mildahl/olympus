/**
 * Worker-based parser wrapper for parallel data model parsing
 * Spawns a Web Worker to parse IFC data model without blocking main thread
 */
import type { IfcDataStore } from './columnar-parser.js';
import type { ParseOptions } from './index.js';
export interface WorkerParserOptions extends ParseOptions {
    /** Worker URL (default: auto-detect) */
    workerUrl?: string;
}
/**
 * Parser that uses Web Worker for true parallel execution
 */
export declare class WorkerParser {
    private worker;
    private workerUrl;
    constructor(options?: WorkerParserOptions);
    /**
     * Parse IFC file into columnar data store using Web Worker
     * Returns immediately, parsing happens in parallel
     */
    parseColumnar(buffer: ArrayBuffer, options?: ParseOptions): Promise<IfcDataStore>;
    /**
     * Terminate the worker (cleanup)
     */
    terminate(): void;
}
//# sourceMappingURL=worker-parser.d.ts.map