/**
 * Memory Consolidator — Merges similar memories into higher-level insights.
 *
 * Like how a human brain consolidates daily experiences during sleep:
 * 5 separate "fixed auth bug" memories → 1 insight: "Auth system has recurring issues."
 *
 * No LLM needed — uses word overlap + template-based summarization.
 */
import { MemoryStore } from '../db/memory-store';
/** Run consolidation — merges similar active memories. Returns count of merges. */
export declare function consolidateMemories(memoryStore: MemoryStore): number;
/** Check if consolidation should run (e.g., after force_recall) */
export declare function shouldConsolidate(memoryStore: MemoryStore): boolean;
//# sourceMappingURL=memory-consolidator.d.ts.map