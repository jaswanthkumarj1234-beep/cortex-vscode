/**
 * Session Tracker — Automatically builds session summaries.
 *
 * Tracks what was discussed, what files were changed, what decisions were made,
 * and what's unfinished. Stores a compressed session summary when the session ends.
 *
 * This is the key missing piece that prevents "where did we leave off?" re-explanation.
 */
import { MemoryStore } from '../db/memory-store';
export interface SessionData {
    startTime: number;
    topics: Set<string>;
    decisions: string[];
    filesChanged: Set<string>;
    failedAttempts: string[];
    businessRules: string[];
    gotchas: string[];
    currentTasks: string[];
    autoLearnCount: number;
    lastUpdateTime: number;
}
export declare function startSession(): void;
export declare function getSession(): SessionData | null;
/** Feed data into the running session — called by auto_learn and other tools */
export declare function feedSession(data: {
    topic?: string;
    decision?: string;
    fileChanged?: string;
    failedAttempt?: string;
    businessRule?: string;
    gotcha?: string;
    currentTask?: string;
    type?: string;
}): void;
/** Build and store the session summary */
export declare function endSession(memoryStore: MemoryStore): string | null;
/** Get the last N session summaries for injection at conversation start */
export declare function getRecentSessions(memoryStore: MemoryStore, count?: number): string[];
//# sourceMappingURL=session-tracker.d.ts.map