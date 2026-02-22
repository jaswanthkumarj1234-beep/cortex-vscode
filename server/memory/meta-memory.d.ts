import { MemoryStore } from '../db/memory-store';
export interface KnowledgeGap {
    path: string;
    type: 'file' | 'directory';
    fileCount?: number;
}
/** Detect knowledge gaps in the project */
export declare function detectKnowledgeGaps(memoryStore: MemoryStore, workspaceRoot: string): KnowledgeGap[];
/** Format knowledge gaps for injection */
export declare function formatKnowledgeGaps(gaps: KnowledgeGap[]): string;
//# sourceMappingURL=meta-memory.d.ts.map