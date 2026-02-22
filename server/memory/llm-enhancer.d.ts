/**
 * LLM Enhancer — Optional LLM-powered memory enrichment.
 *
 * When the user provides an API key (OPENAI_API_KEY or CORTEX_LLM_KEY),
 * this module uses an LLM to:
 *   1. Better classify memories (vs. keyword matching)
 *   2. Extract richer insights from commit messages
 *   3. Generate smart tags and connections
 *   4. Summarize and merge related memories
 *
 * When no API key is available, falls back to keyword-based classification.
 * This ensures Cortex works for EVERYONE — free without an API key,
 * but smarter WITH one.
 */
export interface LLMEnhancedMemory {
    type: string;
    intent: string;
    action: string;
    tags: string[];
    reason?: string;
    connections?: string[];
}
export interface LLMConfig {
    apiKey: string;
    model: string;
    baseUrl: string;
    maxTokens: number;
}
/**
 * Check if LLM enhancement is available (API key configured).
 */
export declare function isLLMAvailable(): boolean;
/**
 * Get which LLM provider is configured.
 */
export declare function getLLMProvider(): string;
/**
 * Enhance a memory with LLM intelligence.
 * Falls back to keyword-based classification if no API key.
 */
export declare function enhanceMemory(text: string, context?: {
    files?: string[];
    commitHash?: string;
}): Promise<LLMEnhancedMemory>;
/**
 * Summarize multiple related memories into one.
 * Only works with LLM, returns null without API key.
 */
export declare function summarizeMemories(memories: Array<{
    intent: string;
    type: string;
    timestamp: number;
}>): Promise<string | null>;
//# sourceMappingURL=llm-enhancer.d.ts.map