"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectCompletion = detectCompletion;
exports.resolveRelatedMemories = resolveRelatedMemories;
const types_1 = require("../types");
// ─── Completion Detection Patterns ───────────────────────────────────────────
const COMPLETION_PATTERNS = [
    // Explicit completion: "I finished X", "X is done", "completed the X"
    { regex: /\b(?:I|we)\s+(?:finished|completed|done with|wrapped up|shipped)\s+(?:the\s+)?(.{3,60})/i, confidence: 0.90 },
    { regex: /\b(?:the\s+)?(.{3,40})\s+(?:is|are)\s+(?:done|finished|completed|shipped|deployed|live)\b/i, confidence: 0.90 },
    { regex: /\b(?:just|already|finally)\s+(?:finished|completed|fixed|done with)\s+(?:the\s+)?(.{3,60})/i, confidence: 0.90 },
    // Task-specific completion: "fixed the SEO", "resolved the bug"
    { regex: /\b(?:fixed|resolved|addressed|handled|took care of)\s+(?:the\s+|all\s+(?:the\s+)?)?(.{3,60})/i, confidence: 0.85 },
    { regex: /\b(?:the\s+)?(.{3,40})\s+(?:has been|have been|was|were)\s+(?:fixed|resolved|completed|addressed|handled)\b/i, confidence: 0.85 },
    // Implicit completion: "SEO is working now", "auth works fine"
    { regex: /\b(?:the\s+)?(.{3,40})\s+(?:is|are)\s+(?:working|running|passing|good)\s+(?:now|fine|great|properly)\b/i, confidence: 0.80 },
    { regex: /\b(?:no more|no longer any?)\s+(?:issues?|problems?|bugs?)\s+(?:with|in|on)\s+(?:the\s+)?(.{3,40})\b/i, confidence: 0.80 },
    // Past tense markers: "we already did X", "X was already done"
    { regex: /\b(?:already|previously)\s+(?:did|done|fixed|handled|completed|finished)\s+(?:the\s+)?(.{3,60})/i, confidence: 0.85 },
];
/**
 * Detect completion signals from text.
 * Returns topics that were identified as "done/completed".
 */
function detectCompletion(text) {
    const signals = [];
    const seenTopics = new Set();
    for (const pattern of COMPLETION_PATTERNS) {
        const match = text.match(pattern.regex);
        if (match && match[1]) {
            const topic = cleanTopic(match[1]);
            if (topic.length < 3 || topic.length > 50)
                continue;
            if (seenTopics.has(topic.toLowerCase()))
                continue;
            seenTopics.add(topic.toLowerCase());
            signals.push({
                topic,
                trigger: match[0].trim(),
                confidence: pattern.confidence,
            });
        }
    }
    return signals;
}
/**
 * Resolve (demote) old memories about a completed topic.
 *
 * Searches for active memories whose intent mentions the topic,
 * then demotes their importance and tags them as "resolved".
 *
 * Returns the number of memories resolved.
 */
function resolveRelatedMemories(memoryStore, topic, _confidence = 0.85) {
    const topicLower = topic.toLowerCase();
    const topicWords = topicLower.split(/\s+/).filter(w => w.length > 2);
    if (topicWords.length === 0)
        return 0;
    // Search by FTS for the topic
    let candidates;
    try {
        candidates = memoryStore.searchFTS(topic, 50);
    }
    catch {
        // FTS failed, fall back to getActive
        candidates = memoryStore.getActive(200).map(m => ({
            memory: m,
            score: 0,
            matchMethod: 'fallback',
        }));
    }
    let resolved = 0;
    for (const candidate of candidates) {
        const m = candidate.memory;
        const intentLower = m.intent.toLowerCase();
        // Check if this memory's intent is about the completed topic
        const matchingWords = topicWords.filter(w => intentLower.includes(w));
        const matchRatio = matchingWords.length / topicWords.length;
        // Require at least half the topic words to match, minimum 1
        if (matchRatio < 0.5 || matchingWords.length === 0)
            continue;
        // Don't demote if already resolved or very recent (< 1 hour) 
        if (m.tags?.includes('resolved'))
            continue;
        if (Date.now() - m.createdAt < 3600000)
            continue;
        // Don't demote high-confidence CORRECTION or CONVENTION memories
        // (those are permanent lessons, not tasks)
        if ((m.type === types_1.MemoryType.CORRECTION || m.type === types_1.MemoryType.CONVENTION) && m.confidence >= 0.8)
            continue;
        // Demote importance and tag as resolved
        const newTags = [...(m.tags || []), 'resolved'];
        const demotedImportance = Math.min(m.importance, 0.2);
        memoryStore.update(m.id, {
            importance: demotedImportance,
            tags: newTags,
        });
        resolved++;
    }
    return resolved;
}
// ─── Helpers ─────────────────────────────────────────────────────────────────
function cleanTopic(raw) {
    return raw
        .replace(/[.!?,;:'"()[\]{}]/g, '')
        .replace(/\b(the|a|an|this|that|those|these|some|any|all|my|our|your)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}
//# sourceMappingURL=completion-resolver.js.map