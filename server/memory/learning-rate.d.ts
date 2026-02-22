/**
 * Learning Rate Adjuster — Tracks correction frequency and auto-boosts importance.
 *
 * If the AI gets corrected 3 times about "auth", auth corrections become
 * ultra-priority and surface at the very top of every recall.
 *
 * Like how your brain learns faster from repeated mistakes:
 * burn your hand once = careful. Burn it 3 times = NEVER touch stove.
 */
import { MemoryStore } from '../db/memory-store';
interface CorrectionFrequency {
    topic: string;
    count: number;
    lastCorrected: number;
    memoryIds: string[];
}
/** Analyze correction frequency across all memories */
export declare function analyzeCorrectionFrequency(memoryStore: MemoryStore): CorrectionFrequency[];
/** Auto-boost importance of frequently corrected topics */
export declare function boostFrequentCorrections(memoryStore: MemoryStore): number;
/** Format hot corrections for injection */
export declare function formatHotCorrections(memoryStore: MemoryStore): string;
export {};
//# sourceMappingURL=learning-rate.d.ts.map