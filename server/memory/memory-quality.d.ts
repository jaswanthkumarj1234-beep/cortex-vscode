/**
 * Memory Quality — Filters, contradiction detection, and quality gates.
 *
 * Prevents junk memories from polluting the database.
 * Detects contradictions between memories.
 */
import { MemoryStore } from '../db/memory-store';
import { MemoryType } from '../types';
/**
 * Check if a memory is worth storing.
 * Returns null if good, or a rejection reason if bad.
 */
export declare function qualityCheck(intent: string, type: string): string | null;
/**
 * Check if a new memory contradicts existing ones.
 * Returns the contradicting memory if found.
 */
export declare function findContradiction(memoryStore: MemoryStore, newIntent: string, newType: MemoryType): {
    contradicts: string;
    existingId: string;
    existingIntent: string;
} | null;
/**
 * Store a memory with quality + contradiction checks.
 * Returns the stored memory or null if rejected.
 */
export declare function storeWithQuality(memoryStore: MemoryStore, params: {
    type: MemoryType;
    intent: string;
    action?: string;
    reason?: string;
    importance: number;
    confidence: number;
    tags: string[];
    relatedFiles?: string[];
}): any | null;
//# sourceMappingURL=memory-quality.d.ts.map