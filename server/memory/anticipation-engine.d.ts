/**
 * Anticipation Engine — Proactive memory surfacing.
 *
 * Instead of waiting to be asked, this module predicts what memories
 * are relevant based on the current file, directory, and recent activity.
 *
 * Like how walking into your kitchen makes you remember you need milk.
 */
import { MemoryStore } from '../db/memory-store';
import { ScoredMemory } from '../types';
export interface AnticipationResult {
    fileMemories: ScoredMemory[];
    directoryMemories: ScoredMemory[];
    relatedTypeMemories: ScoredMemory[];
}
export declare function anticipate(memoryStore: MemoryStore, currentFile?: string): AnticipationResult;
/** Format anticipation results for injection */
export declare function formatAnticipation(result: AnticipationResult): string;
//# sourceMappingURL=anticipation-engine.d.ts.map