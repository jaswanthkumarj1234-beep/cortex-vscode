/**
 * File Relationship Mapper — Tracks which files are always edited together.
 *
 * When the AI edits file A and file B in the same session, this module:
 * 1. Records the co-edit event
 * 2. Over time, builds a map of "these files always change together"
 * 3. Surfaces warnings when only one of a pair is being edited
 *
 * This prevents partial changes — the #1 cause of cascading failures.
 * "You changed types.ts but didn't update mcp-handler.ts (edited together 5 times)"
 */
import { MemoryStore } from '../db/memory-store';
export interface FileRelationship {
    fileA: string;
    fileB: string;
    coEditCount: number;
    lastCoEdit: number;
    reason?: string;
}
/**
 * Record that a file was edited in this session.
 * Automatically tracks co-edit relationships.
 */
export declare function recordFileEdit(filePath: string): void;
/**
 * Get files that are frequently co-edited with the given file.
 * Returns files that should also be checked/edited.
 */
export declare function getRelatedFiles(filePath: string, memoryStore: MemoryStore): string[];
/**
 * Get all co-edit relationships from this session (for end-of-session storage).
 */
export declare function getSessionRelationships(): FileRelationship[];
/**
 * Check if any related files are missing from the current edit set.
 * Returns warnings about files that should probably also be edited.
 */
export declare function checkMissingRelated(currentFile: string, memoryStore: MemoryStore): string[];
/**
 * Store accumulated co-edit relationships as persistent memories.
 */
export declare function storeRelationships(memoryStore: MemoryStore): number;
/**
 * Reset session tracking (call at session end).
 */
export declare function resetFileTracking(): void;
//# sourceMappingURL=file-relationships.d.ts.map