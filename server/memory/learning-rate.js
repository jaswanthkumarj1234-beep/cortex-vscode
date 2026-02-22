"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeCorrectionFrequency = analyzeCorrectionFrequency;
exports.boostFrequentCorrections = boostFrequentCorrections;
exports.formatHotCorrections = formatHotCorrections;
const types_1 = require("../types");
/** Analyze correction frequency across all memories */
function analyzeCorrectionFrequency(memoryStore) {
    const corrections = memoryStore.getByType(types_1.MemoryType.CORRECTION, 200);
    if (corrections.length < 2)
        return [];
    // Extract topic keywords from each correction
    const topicMap = new Map();
    for (const c of corrections) {
        const words = extractTopicWords(c.intent);
        for (const word of words) {
            const existing = topicMap.get(word);
            if (existing) {
                existing.count++;
                existing.lastCorrected = Math.max(existing.lastCorrected, c.timestamp);
                if (!existing.memoryIds.includes(c.id)) {
                    existing.memoryIds.push(c.id);
                }
            }
            else {
                topicMap.set(word, {
                    topic: word,
                    count: 1,
                    lastCorrected: c.timestamp,
                    memoryIds: [c.id],
                });
            }
        }
    }
    // Only return topics with 2+ corrections
    return [...topicMap.values()]
        .filter(t => t.count >= 2)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
}
/** Auto-boost importance of frequently corrected topics */
function boostFrequentCorrections(memoryStore) {
    const freqs = analyzeCorrectionFrequency(memoryStore);
    let boosted = 0;
    for (const freq of freqs) {
        if (freq.count >= 3) {
            // 3+ corrections = ultra-priority
            for (const id of freq.memoryIds) {
                const m = memoryStore.get(id);
                if (m && m.importance < 0.95) {
                    memoryStore.update(id, { importance: 0.95 });
                    boosted++;
                }
            }
        }
        else if (freq.count >= 2) {
            // 2 corrections = high priority
            for (const id of freq.memoryIds) {
                const m = memoryStore.get(id);
                if (m && m.importance < 0.85) {
                    memoryStore.update(id, { importance: 0.85 });
                    boosted++;
                }
            }
        }
    }
    return boosted;
}
/** Format hot corrections for injection */
function formatHotCorrections(memoryStore) {
    const freqs = analyzeCorrectionFrequency(memoryStore);
    const hot = freqs.filter(f => f.count >= 2);
    if (hot.length === 0)
        return '';
    const lines = ['## Hot Corrections (repeatedly corrected -- CRITICAL)'];
    for (const h of hot.slice(0, 5)) {
        const emoji = h.count >= 3 ? '[CRITICAL]' : '[WARN]';
        lines.push(`${emoji} "${h.topic}" — corrected ${h.count}x`);
    }
    return lines.join('\n');
}
/** Extract meaningful topic words from correction text */
function extractTopicWords(text) {
    const stopWords = new Set([
        'the', 'a', 'an', 'is', 'was', 'are', 'were', 'to', 'of', 'in', 'for',
        'on', 'with', 'at', 'by', 'from', 'it', 'this', 'that', 'and', 'or',
        'but', 'not', 'do', 'does', 'did', 'don', 'dont', 'use', 'using',
        'should', 'must', 'never', 'always', 'avoid', 'instead',
    ]);
    return text.toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3 && !stopWords.has(w));
}
//# sourceMappingURL=learning-rate.js.map