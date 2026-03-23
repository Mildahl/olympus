/**
 * STEP tokenizer - fast byte-level scanning for entity markers
 * Leverages Spike 1 approach: ~1,259 MB/s throughput
 */
export declare class StepTokenizer {
    private buffer;
    private position;
    private lineNumber;
    constructor(buffer: Uint8Array);
    /**
     * Scan for all entity declarations (#EXPRESS_ID = TYPE(...))
     * Returns entity references without parsing full content
     */
    scanEntities(): Generator<{
        expressId: number;
        type: string;
        offset: number;
        length: number;
        line: number;
    }>;
    /**
     * FAST scan - skips to semicolon instead of matching parentheses
     * ~5-10x faster for large files, yields length=0 (calculate on-demand)
     */
    scanEntitiesFast(): Generator<{
        expressId: number;
        type: string;
        offset: number;
        length: number;
        line: number;
    }>;
    private readExpressId;
    private readTypeName;
    private skipWhitespace;
    private findEntityLength;
}
//# sourceMappingURL=tokenizer.d.ts.map