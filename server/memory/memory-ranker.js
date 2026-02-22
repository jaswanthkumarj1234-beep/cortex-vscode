"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rankResults = rankResults;
exports.formatResults = formatResults;
/**
 * Memory Ranker — Scoring, merging, and ranking search results.
 * Extracted from standalone.ts L713-885.
 *
 * NEW: Recency bias — newer memories score higher.
 * NEW: File-aware ranking — if query mentions a file, related memories boost.
 */
const config_1 = require("../config/config");
/**
 * Merge FTS + Vector results, deduplicate, boost by type + recency + access.
 */
function rankResults(ftsResults, vectorResults, maxResults, currentFile) {
    const seen = new Set();
    const merged = [];
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    for (const r of ftsResults) {
        if (seen.has(r.memory.id))
            continue;
        seen.add(r.memory.id);
        const boost = config_1.CONFIG.TYPE_BOOST[r.memory.type] || 1.0;
        const accessBoost = 1 + (r.memory.accessCount || 0) * 0.1;
        // NEW: Recency bias — memories from last 24h get 1.5x, last 7d get 1.2x
        const ageMs = now - (r.memory.createdAt || r.memory.timestamp || 0);
        const recencyBoost = ageMs < DAY ? 1.5 : ageMs < 7 * DAY ? 1.2 : 1.0;
        // NEW: File-aware boost — if memory is related to current file, boost 1.5x
        const fileBoost = currentFile && r.memory.relatedFiles?.some((f) => f.includes(currentFile) || currentFile.includes(f)) ? 1.5 : 1.0;
        merged.push({
            memory: r.memory,
            score: r.score * boost * accessBoost * recencyBoost * fileBoost,
        });
    }
    for (const r of vectorResults) {
        if (seen.has(r.memory.id))
            continue;
        seen.add(r.memory.id);
        const boost = config_1.CONFIG.TYPE_BOOST[r.memory.type] || 1.0;
        const accessBoost = 1 + (r.memory.accessCount || 0) * 0.1;
        const ageMs = now - (r.memory.createdAt || r.memory.timestamp || 0);
        const recencyBoost = ageMs < DAY ? 1.5 : ageMs < 7 * DAY ? 1.2 : 1.0;
        const fileBoost = currentFile && r.memory.relatedFiles?.some((f) => f.includes(currentFile) || currentFile.includes(f)) ? 1.5 : 1.0;
        merged.push({
            memory: r.memory,
            score: r.score * boost * accessBoost * recencyBoost * fileBoost,
        });
    }
    merged.sort((a, b) => b.score - a.score);
    return merged.slice(0, maxResults);
}
/**
 * Format ranked results into a readable text block for the AI.
 */
function formatResults(ranked, queryText) {
    const lines = [];
    for (const r of ranked) {
        lines.push(`[${r.memory.type}] ${r.memory.intent}`);
        if (r.memory.action)
            lines.push(`  → ${r.memory.action}`);
        if (r.memory.reason)
            lines.push(`  Why: ${r.memory.reason}`);
    }
    return lines.join('\n') || `No memories matching "${queryText}"`;
}
//# sourceMappingURL=memory-ranker.js.map