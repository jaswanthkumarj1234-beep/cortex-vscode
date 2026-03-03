"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTags = extractTags;
/** All topic patterns — superset of both previous implementations */
const TAG_PATTERNS = [
    [/\b(auth|login|session|token|jwt|oauth)\b/, 'auth'],
    [/\b(database|sql|query|migration|schema)\b/, 'database'],
    [/\b(api|endpoint|route|rest|graphql)\b/, 'api'],
    [/\b(ui|component|render|style|css|html)\b/, 'ui'],
    [/\b(test|spec|mock|assert|coverage)\b/, 'testing'],
    [/\b(deploy|ci|cd|pipeline|docker|k8s)\b/, 'devops'],
    [/\b(security|encrypt|permission|vulnerability)\b/, 'security'],
    [/\b(perf|optimize|cache|speed|memory)\b/, 'performance'],
    [/\b(config|env|setting|option)\b/, 'config'],
    [/\b(error|exception|crash|debug|log)\b/, 'error-handling'],
];
/**
 * Extract semantic topic tags from text.
 * Returns an array of tag strings like ['auth', 'database', 'api'].
 */
function extractTags(text) {
    const tags = [];
    const lower = text.toLowerCase();
    for (const [pattern, tag] of TAG_PATTERNS) {
        if (pattern.test(lower))
            tags.push(tag);
    }
    return tags;
}
//# sourceMappingURL=extract-tags.js.map