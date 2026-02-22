/**
 * Attention Ranker — Re-ranks memories based on what you're doing RIGHT NOW.
 *
 * Debugging? Bug fixes and corrections rise to the top.
 * Coding? Conventions and decisions become priority.
 * Reviewing? Insights and architecture matter most.
 *
 * This is like how your brain filters: at a restaurant, food memories are
 * strong; at a library, book memories are strong. Same data, different priority.
 */
import { ScoredMemory } from '../types';
export type ActionContext = 'debugging' | 'coding' | 'reviewing' | 'chatting' | 'exploring' | 'unknown';
/** Detect action context from topic/file keywords */
export declare function detectActionContext(topic?: string, currentFile?: string): ActionContext;
/** Re-rank memories based on current action context */
export declare function rankByAttention(memories: ScoredMemory[], context: ActionContext): ScoredMemory[];
/** Format the context indicator for injection */
export declare function formatAttentionContext(context: ActionContext): string;
//# sourceMappingURL=attention-ranker.d.ts.map