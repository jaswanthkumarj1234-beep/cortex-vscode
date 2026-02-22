/**
 * Auto-Learner — Extracts memory-worthy patterns from text automatically.
 *
 * How it works:
 * 1. The AI passes its response text to `auto_learn` tool after every reply
 * 2. This module scans for decision/correction/convention/bug-fix patterns
 * 3. Matching patterns are stored automatically — zero manual effort
 *
 * Pattern detection uses keyword signals + sentence structure analysis.
 * No LLM needed — pure regex + heuristics, fast and reliable.
 */
export type MemoryType = 'DECISION' | 'CORRECTION' | 'CONVENTION' | 'BUG_FIX' | 'INSIGHT' | 'FAILED_ATTEMPT' | 'BUSINESS_RULE' | 'GOTCHA' | 'CURRENT_TASK';
export interface ExtractedMemory {
    type: MemoryType;
    content: string;
    confidence: number;
    reason: string;
}
export declare function extractMemories(text: string): ExtractedMemory[];
//# sourceMappingURL=auto-learner.d.ts.map