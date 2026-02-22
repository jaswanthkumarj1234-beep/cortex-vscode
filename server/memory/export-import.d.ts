import { MemoryStore } from '../db/memory-store';
export interface ExportedMemory {
    id: string;
    type: string;
    intent: string;
    action: string;
    reason: string | null;
    tags: string[];
    relatedFiles: string[];
    confidence: number;
    importance: number;
    accessCount: number;
    createdAt: number;
    timestamp: string;
}
export interface ExportBundle {
    version: 1;
    exportedAt: string;
    memoryCount: number;
    memories: ExportedMemory[];
}
/**
 * Export all active memories to a JSON bundle
 */
export declare function exportMemories(memoryStore: MemoryStore): ExportBundle;
/**
 * Export memories to a file
 */
export declare function exportToFile(memoryStore: MemoryStore, filePath: string): {
    count: number;
    path: string;
};
/**
 * Import memories from a JSON bundle, skipping duplicates
 */
export declare function importMemories(memoryStore: MemoryStore, bundle: ExportBundle): {
    imported: number;
    skipped: number;
    errors: number;
};
/**
 * Import memories from a file
 */
export declare function importFromFile(memoryStore: MemoryStore, filePath: string): {
    imported: number;
    skipped: number;
    errors: number;
};
//# sourceMappingURL=export-import.d.ts.map