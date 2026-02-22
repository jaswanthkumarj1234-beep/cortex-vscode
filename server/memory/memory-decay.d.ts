/**
 * Memory Decay — Cleanup stale and low-value memories.
 * Extracted from standalone.ts L668-711.
 *
 * NEW: Duplicate detection — merges identical memories instead of keeping copies.
 * NEW: Memory strengthening — repeated patterns increase importance.
 */
import { MemoryStore } from '../db/memory-store';
export declare function cleanupMemories(memoryStore: MemoryStore): void;
//# sourceMappingURL=memory-decay.d.ts.map