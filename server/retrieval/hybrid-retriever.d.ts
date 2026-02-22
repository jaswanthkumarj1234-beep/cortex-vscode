/**
 * Hybrid Retriever — Combines vector search + FTS keyword search.
 * Returns ranked, deduplicated results from multiple search methods.
 */
import type { RecallQuery, ScoredMemory, EmbedderStrategy } from '../types';
import { MemoryStore } from '../db/memory-store';
export declare class HybridRetriever {
    private memoryStore;
    private embedder;
    constructor(memoryStore: MemoryStore, embedder: EmbedderStrategy);
    /** Recall memories relevant to a query */
    recall(query: RecallQuery): Promise<ScoredMemory[]>;
    private vectorSearch;
    private keywordSearch;
    private fileSearch;
    /** Merge results from multiple search methods with weights */
    private mergeResults;
    /** Apply query filters */
    private applyFilters;
    /** Clean user query for FTS5 syntax */
    private cleanFTSQuery;
}
//# sourceMappingURL=hybrid-retriever.d.ts.map