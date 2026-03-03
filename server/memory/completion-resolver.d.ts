/**
 * Completion Resolver — Detects when work is DONE and demotes old related memories.
 *
 * THE CRITICAL GAP: Cortex stores PROBLEMS ("need SEO", "fix auth bug") but
 * never marks them as RESOLVED. So force_recall keeps suggesting old tasks
 * that were already completed — making the AI feel "dumb" and repetitive.
 *
 * How it works:
 * 1. Scans text for completion signals: "done", "finished", "completed", "shipped"
 * 2. Extracts the TOPIC of what was completed (e.g., "SEO", "auth", "refactoring")
 * 3. Searches existing memories for that topic
 * 4. Demotes old memories about the completed topic (importance → 0.2)
 * 5. Tags them as "resolved" so force_recall can deprioritize
 *
 * This makes Cortex behave like a real brain — once you finish something,
 * it stops nagging you about it.
 */
import { MemoryStore } from '../db/memory-store';
export interface CompletionSignal {
    topic: string;
    trigger: string;
    confidence: number;
}
/**
 * Detect completion signals from text.
 * Returns topics that were identified as "done/completed".
 */
export declare function detectCompletion(text: string): CompletionSignal[];
/**
 * Resolve (demote) old memories about a completed topic.
 *
 * Searches for active memories whose intent mentions the topic,
 * then demotes their importance and tags them as "resolved".
 *
 * Returns the number of memories resolved.
 */
export declare function resolveRelatedMemories(memoryStore: MemoryStore, topic: string, _confidence?: number): number;
//# sourceMappingURL=completion-resolver.d.ts.map