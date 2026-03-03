/**
 * Shared Tag Extraction — Single source of truth for topic-based tag extraction.
 *
 * Used by llm-enhancer, git-memory, and any future module that needs to
 * extract semantic tags from text.
 *
 * Consolidates the duplicate patterns that previously existed in:
 *   - llm-enhancer.ts (extractKeywordTags)
 *   - git-memory.ts (extractTopicTags)
 */
/**
 * Extract semantic topic tags from text.
 * Returns an array of tag strings like ['auth', 'database', 'api'].
 */
export declare function extractTags(text: string): string[];
//# sourceMappingURL=extract-tags.d.ts.map