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
    provider: 'openrouter' | 'openai' | 'anthropic' | 'custom';
    extraHeaders?: Record<string, string>;
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