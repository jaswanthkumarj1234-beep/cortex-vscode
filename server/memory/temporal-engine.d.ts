/**
 * Temporal Engine — Time-aware memory retrieval.
 *
 * Answers: "What changed today?", "What did we do this week?"
 * Auto-injects a "Recent Activity" section at conversation start.
 *
 * Like how your brain naturally groups events by "today", "yesterday", "last week".
 */
import { MemoryStore } from '../db/memory-store';
import { MemoryUnit } from '../types';
export interface TemporalBucket {
    label: string;
    memories: MemoryUnit[];
    start: number;
    end: number;
}
/** Get memories bucketed by time period */
export declare function getTemporalBuckets(memoryStore: MemoryStore): TemporalBucket[];
/** Get only recent changes (last N hours) */
export declare function getRecentChanges(memoryStore: MemoryStore, hours?: number): MemoryUnit[];
/** Format temporal context for injection into force_recall */
export declare function formatTemporalContext(memoryStore: MemoryStore): string;
/** Get workspace changes since last session */
export declare function getWorkspaceDiff(workspaceRoot: string): string;
//# sourceMappingURL=temporal-engine.d.ts.map