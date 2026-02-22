import { MemoryStore } from '../db/memory-store';
interface FileChangeReport {
    newFiles: string[];
    deletedFiles: string[];
    modifiedFiles: string[];
    totalChanges: number;
}
/** Capture recent git commits as memories */
export declare function captureGitCommits(memoryStore: MemoryStore, workspaceRoot: string, maxCommits?: number): number;
/** Detect file changes since last session */
export declare function detectFileChanges(workspaceRoot: string): FileChangeReport;
/** Format file changes for injection */
export declare function formatFileChanges(report: FileChangeReport): string;
export {};
//# sourceMappingURL=git-memory.d.ts.map