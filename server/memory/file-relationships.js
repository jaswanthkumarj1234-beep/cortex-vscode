"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordFileEdit = recordFileEdit;
exports.getRelatedFiles = getRelatedFiles;
exports.getSessionRelationships = getSessionRelationships;
exports.checkMissingRelated = checkMissingRelated;
exports.storeRelationships = storeRelationships;
exports.resetFileTracking = resetFileTracking;
// In-memory co-edit tracking (per session)
const sessionEdits = new Set();
const coEditMap = new Map();
/**
 * Record that a file was edited in this session.
 * Automatically tracks co-edit relationships.
 */
function recordFileEdit(filePath) {
    // Normalize to basename for cross-path matching
    const basename = filePath.replace(/\\/g, '/').split('/').pop() || filePath;
    // Track co-edits with all previously edited files
    for (const existing of sessionEdits) {
        if (existing === basename)
            continue;
        const key = [existing, basename].sort().join('↔');
        coEditMap.set(key, (coEditMap.get(key) || 0) + 1);
    }
    sessionEdits.add(basename);
}
/**
 * Get files that are frequently co-edited with the given file.
 * Returns files that should also be checked/edited.
 */
function getRelatedFiles(filePath, memoryStore) {
    const basename = filePath.replace(/\\/g, '/').split('/').pop() || filePath;
    const related = [];
    // 1. Check session co-edits
    for (const [key, count] of coEditMap.entries()) {
        if (count < 2)
            continue; // Need at least 2 co-edits to be meaningful
        const [a, b] = key.split('↔');
        if (a === basename)
            related.push(b);
        else if (b === basename)
            related.push(a);
    }
    // 2. Check stored relationships from past sessions
    try {
        const results = memoryStore.searchFTS(`file-relationship ${basename}`, 5);
        for (const r of results) {
            if (r.memory.tags?.includes('file-relationship')) {
                // Extract the paired file from the intent
                const match = r.memory.intent.match(/(.+?)↔(.+)/);
                if (match) {
                    const other = match[1].trim() === basename ? match[2].trim() : match[1].trim();
                    if (!related.includes(other))
                        related.push(other);
                }
            }
        }
    }
    catch { /* non-fatal */ }
    return related;
}
/**
 * Get all co-edit relationships from this session (for end-of-session storage).
 */
function getSessionRelationships() {
    const relationships = [];
    for (const [key, count] of coEditMap.entries()) {
        if (count < 2)
            continue; // Only store meaningful relationships
        const [a, b] = key.split('↔');
        relationships.push({
            fileA: a,
            fileB: b,
            coEditCount: count,
            lastCoEdit: Date.now(),
        });
    }
    return relationships;
}
/**
 * Check if any related files are missing from the current edit set.
 * Returns warnings about files that should probably also be edited.
 */
function checkMissingRelated(currentFile, memoryStore) {
    const related = getRelatedFiles(currentFile, memoryStore);
    const warnings = [];
    for (const file of related) {
        if (!sessionEdits.has(file)) {
            warnings.push(`⚠️ You're editing ${currentFile} but haven't touched ${file} — they're usually edited together`);
        }
    }
    return warnings;
}
/**
 * Store accumulated co-edit relationships as persistent memories.
 */
function storeRelationships(memoryStore) {
    const rels = getSessionRelationships();
    let stored = 0;
    for (const rel of rels) {
        try {
            memoryStore.add({
                type: 'INSIGHT',
                intent: `${rel.fileA}↔${rel.fileB} — edited together ${rel.coEditCount} times`,
                action: `These files are frequently co-edited. When changing one, check the other.`,
                reason: `Auto-detected file relationship from ${rel.coEditCount} co-edits`,
                tags: ['file-relationship', rel.fileA, rel.fileB],
                confidence: Math.min(0.95, 0.5 + rel.coEditCount * 0.1),
                importance: Math.min(0.85, 0.4 + rel.coEditCount * 0.1),
                timestamp: Date.now(),
                isActive: true,
                accessCount: 0,
                createdAt: Date.now(),
                id: '',
            });
            stored++;
        }
        catch { /* skip duplicates */ }
    }
    return stored;
}
/**
 * Reset session tracking (call at session end).
 */
function resetFileTracking() {
    sessionEdits.clear();
    coEditMap.clear();
}
//# sourceMappingURL=file-relationships.js.map