import type { ScoredMemory } from '../types';
export interface RankedResult {
    memory: any;
    score: number;
}
/**
 * Merge FTS + Vector results, deduplicate, boost by type + recency + access.
 */
export declare function rankResults(ftsResults: ScoredMemory[], vectorResults: RankedResult[], maxResults: number, currentFile?: string): RankedResult[];
/**
 * Format ranked results into a readable text block for the AI.
 */
export declare function formatResults(ranked: RankedResult[], queryText: string): string;
//# sourceMappingURL=memory-ranker.d.ts.map