/**
 * Confidence Decay + Reinforcement — Time-based memory aging.
 *
 * Memories that are never accessed gradually lose importance.
 * Memories that are frequently accessed get stronger.
 *
 * Like how the brain strengthens neural pathways that are used often
 * and prunes connections that are never activated.
 *
 * Formula: effective_importance = base_importance * decay_factor * access_boost
 * - decay_factor = 1 / (1 + age_in_days * 0.02) — slow exponential decay
 * - access_boost = 1 + (accessCount * 0.1) — capped at 2x
 */
import { MemoryStore } from '../db/memory-store';
import { ScoredMemory } from '../types';
/** Calculate effective importance with decay and reinforcement */
export declare function effectiveImportance(baseImportance: number, timestamp: number, accessCount: number, lastAccessed?: number): number;
/** Apply decay + reinforcement scoring to search results */
export declare function applyConfidenceDecay(memories: ScoredMemory[]): ScoredMemory[];
/** Run periodic maintenance — decay old, unused memories */
export declare function runDecayMaintenance(memoryStore: MemoryStore): number;
//# sourceMappingURL=confidence-decay.d.ts.map