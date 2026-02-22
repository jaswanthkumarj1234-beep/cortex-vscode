"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.consolidateMemories = consolidateMemories;
exports.shouldConsolidate = shouldConsolidate;
const types_1 = require("../types");
/** Run consolidation — merges similar active memories. Returns count of merges. */
function consolidateMemories(memoryStore) {
    const active = memoryStore.getActive(500);
    if (active.length < 10)
        return 0; // Not enough to consolidate
    let mergeCount = 0;
    // Group by type first
    const byType = new Map();
    for (const m of active) {
        const arr = byType.get(m.type) || [];
        arr.push(m);
        byType.set(m.type, arr);
    }
    // Within each type, find similar groups
    for (const [type, memories] of byType) {
        if (memories.length < 3)
            continue;
        const groups = findSimilarGroups(memories);
        for (const group of groups) {
            if (group.memories.length < 3)
                continue;
            // Create merged memory
            const merged = createMergedMemory(group, type);
            const newMemory = memoryStore.add(merged);
            // Deactivate originals, link to merged
            for (const old of group.memories) {
                memoryStore.deactivate(old.id, newMemory.id);
                memoryStore.addEdge({
                    sourceId: old.id,
                    targetId: newMemory.id,
                    relation: types_1.EdgeRelation.REPLACED_BY,
                    weight: 0.9,
                    timestamp: Date.now(),
                });
            }
            mergeCount++;
        }
    }
    return mergeCount;
}
/** Find groups of similar memories based on word overlap */
function findSimilarGroups(memories) {
    const groups = [];
    const used = new Set();
    for (let i = 0; i < memories.length; i++) {
        if (used.has(memories[i].id))
            continue;
        const group = [memories[i]];
        const wordsI = tokenize(memories[i].intent);
        for (let j = i + 1; j < memories.length; j++) {
            if (used.has(memories[j].id))
                continue;
            const wordsJ = tokenize(memories[j].intent);
            const similarity = jaccardSimilarity(wordsI, wordsJ);
            if (similarity > 0.5) { // 50% word overlap = similar enough
                group.push(memories[j]);
            }
        }
        if (group.length >= 3) {
            for (const m of group)
                used.add(m.id);
            const allWords = group.flatMap(m => tokenize(m.intent));
            const wordFreq = new Map();
            for (const w of allWords)
                wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
            // Common words = appear in majority of the group
            const threshold = Math.ceil(group.length * 0.6);
            const commonWords = [...wordFreq.entries()]
                .filter(([, count]) => count >= threshold)
                .sort((a, b) => b[1] - a[1])
                .map(([word]) => word)
                .slice(0, 10);
            groups.push({
                type: group[0].type,
                memories: group,
                commonWords,
                similarity: 0.5, // approximate
            });
        }
    }
    return groups;
}
/** Create a merged memory from a group */
function createMergedMemory(group, type) {
    const count = group.memories.length;
    const topicWords = group.commonWords.slice(0, 5).join(', ');
    // Template-based summarization
    const templates = {
        [types_1.MemoryType.BUG_FIX]: `Recurring bug pattern (${count} fixes): topics: ${topicWords}`,
        [types_1.MemoryType.CORRECTION]: `Repeated correction (${count}x): ${topicWords} — pattern suggests this area needs attention`,
        [types_1.MemoryType.DECISION]: `Consolidated decision (${count} related): ${topicWords}`,
        [types_1.MemoryType.CONVENTION]: `Established convention (${count} mentions): ${topicWords}`,
        [types_1.MemoryType.INSIGHT]: `Key insight (from ${count} observations): ${topicWords}`,
    };
    const intent = templates[type] || `Consolidated memory (${count}): ${topicWords}`;
    // Collect all unique files
    const allFiles = new Set();
    for (const m of group.memories) {
        if (m.relatedFiles)
            m.relatedFiles.forEach(f => allFiles.add(f));
    }
    // Collect all unique tags
    const allTags = new Set();
    allTags.add('consolidated');
    for (const m of group.memories) {
        if (m.tags)
            m.tags.forEach(t => allTags.add(t));
    }
    // Average importance (boosted because consolidation = important pattern)
    const avgImportance = group.memories.reduce((sum, m) => sum + m.importance, 0) / count;
    const boostedImportance = Math.min(1.0, avgImportance * 1.2);
    return {
        type,
        intent,
        action: `Merged ${count} similar memories about: ${topicWords}. Originals deactivated.`,
        reason: `Auto-consolidated: ${count} memories shared >50% word overlap`,
        relatedFiles: [...allFiles],
        tags: [...allTags],
        confidence: 0.85,
        importance: boostedImportance,
        timestamp: Date.now(),
        isActive: true,
        accessCount: 0,
        createdAt: Date.now(),
    };
}
/** Jaccard similarity between two word sets */
function jaccardSimilarity(a, b) {
    const setA = new Set(a);
    const setB = new Set(b);
    let intersection = 0;
    for (const word of setA) {
        if (setB.has(word))
            intersection++;
    }
    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : intersection / union;
}
/** Tokenize text into lowercase words */
function tokenize(text) {
    const stopWords = new Set(['the', 'a', 'an', 'is', 'was', 'are', 'were', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'it', 'this', 'that', 'and', 'or', 'but']);
    return text.toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w));
}
/** Check if consolidation should run (e.g., after force_recall) */
function shouldConsolidate(memoryStore) {
    return memoryStore.activeCount() > 50;
}
//# sourceMappingURL=memory-consolidator.js.map