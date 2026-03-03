/**
 * Resume Work — Context recovery after conversation truncation.
 *
 * When a long conversation gets cut off, the AI loses context.
 * This module surfaces: what was the last session about, what changed,
 * what was in progress, and what's still remaining.
 *
 * Like opening your notebook and seeing "stopped at step 3 of 7".
 */
import { MemoryStore } from '../db/memory-store';
export interface ResumeContext {
    lastSession: string | null;
    recentMemories: Array<{
        type: string;
        intent: string;
        age: string;
    }>;
    currentTasks: Array<{
        intent: string;
        age: string;
    }>;
    recentCorrections: Array<{
        intent: string;
        age: string;
    }>;
    recentDecisions: Array<{
        intent: string;
        age: string;
    }>;
}
/**
 * Build context for resuming work after a conversation break.
 */
export declare function buildResumeContext(memoryStore: MemoryStore): ResumeContext;
/** Format resume context for AI consumption */
export declare function formatResumeContext(ctx: ResumeContext): string;
//# sourceMappingURL=resume-work.d.ts.map