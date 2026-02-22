/**
 * Context Builder — Builds dynamic context for brain/context resource.
 *
 * Combines project info + top memories + relevant corrections
 * into a compressed context string that fits any model's context window.
 */
import { MemoryStore } from '../db/memory-store';
export declare class ContextBuilder {
    private memoryStore;
    constructor(memoryStore: MemoryStore);
    /** Build the full context string for injection */
    build(options?: {
        currentFile?: string;
        maxChars?: number;
    }): string;
    /** Compress context to fit within character budget */
    private compress;
}
//# sourceMappingURL=context-builder.d.ts.map