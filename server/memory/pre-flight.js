"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.preFlightCheck = preFlightCheck;
exports.formatPreFlight = formatPreFlight;
/**
 * Get everything the AI needs to know BEFORE writing/editing code for a file.
 */
function preFlightCheck(memoryStore, filename, task) {
    const result = {
        conventions: [],
        gotchas: [],
        pastBugs: [],
        fileNotes: [],
        recentCorrections: [],
    };
    // 1. Get ALL conventions (these apply everywhere)
    const conventions = memoryStore.getByType('CONVENTION', 50);
    for (const conv of conventions) {
        // Filter by relevance to file type if filename provided
        if (filename) {
            const ext = filename.split('.').pop()?.toLowerCase() || '';
            const intentLower = conv.intent.toLowerCase();
            const fileTypeKeywords = {
                ts: ['typescript', 'type', 'interface', 'const', 'let', 'var', 'import', 'export'],
                tsx: ['react', 'component', 'hook', 'jsx', 'state', 'prop'],
                css: ['style', 'css', 'class', 'color', 'font'],
                py: ['python', 'def', 'class', 'import'],
                js: ['javascript', 'require', 'module', 'function'],
            };
            const keywords = fileTypeKeywords[ext] || [];
            const isRelevant = keywords.length === 0 || keywords.some(k => intentLower.includes(k))
                || !Object.values(fileTypeKeywords).flat().some(k => intentLower.includes(k)); // Generic convention
            if (!isRelevant)
                continue;
        }
        result.conventions.push(`[${conv.id.slice(0, 8)}] ${conv.intent}`);
    }
    // 2. Get GOTCHA memories (dangerous patterns)
    const gotchas = memoryStore.getByType('GOTCHA', 20);
    for (const g of gotchas) {
        result.gotchas.push(`⚠️ [${g.id.slice(0, 8)}] ${g.intent}`);
    }
    // 3. Get past BUG_FIX patterns for this file
    const bugFixes = memoryStore.getByType('BUG_FIX', 30);
    for (const bug of bugFixes) {
        if (filename && bug.relatedFiles?.some(f => f.includes(filename.split(/[\\/]/).pop() || ''))) {
            result.pastBugs.push(`🐛 [${bug.id.slice(0, 8)}] ${bug.intent}`);
        }
    }
    // 4. File-specific memories
    if (filename) {
        const fileMemories = memoryStore.getByFile(filename, 10);
        for (const fm of fileMemories) {
            result.fileNotes.push(`📄 [${fm.type}] ${fm.intent}`);
        }
    }
    // 5. Recent CORRECTIONS (last 20 — most likely to be repeated)
    const corrections = memoryStore.getByType('CORRECTION', 20);
    for (const corr of corrections) {
        // Only include recent ones (last 7 days)
        if (Date.now() - corr.timestamp < 7 * 24 * 60 * 60 * 1000) {
            result.recentCorrections.push(`🔄 [${corr.id.slice(0, 8)}] ${corr.intent}`);
        }
    }
    // Task-specific memories via FTS search
    if (task) {
        try {
            const taskResults = memoryStore.searchFTS(task, 5);
            for (const r of taskResults) {
                const m = r.memory;
                if (m.type === 'FAILED_ATTEMPT') {
                    result.gotchas.push(`❌ [FAILED] ${m.intent}`);
                }
            }
        }
        catch { /* FTS failure is non-fatal */ }
    }
    return result;
}
/** Format pre-flight results for AI consumption */
function formatPreFlight(result) {
    const sections = ['# ✈️ Pre-Flight Check\n'];
    let hasContent = false;
    if (result.recentCorrections.length > 0) {
        sections.push('## 🔴 Recent Corrections (DON\'T repeat these)\n');
        result.recentCorrections.forEach(c => sections.push(c));
        sections.push('');
        hasContent = true;
    }
    if (result.gotchas.length > 0) {
        sections.push('## ⚠️ Gotchas & Failed Attempts\n');
        result.gotchas.forEach(g => sections.push(g));
        sections.push('');
        hasContent = true;
    }
    if (result.pastBugs.length > 0) {
        sections.push('## 🐛 Past Bugs in This File\n');
        result.pastBugs.forEach(b => sections.push(b));
        sections.push('');
        hasContent = true;
    }
    if (result.fileNotes.length > 0) {
        sections.push('## 📄 File Context\n');
        result.fileNotes.forEach(f => sections.push(f));
        sections.push('');
        hasContent = true;
    }
    if (result.conventions.length > 0) {
        sections.push(`## 📏 Conventions (${result.conventions.length})\n`);
        result.conventions.slice(0, 10).forEach(c => sections.push(c));
        if (result.conventions.length > 10) {
            sections.push(`_...and ${result.conventions.length - 10} more_`);
        }
        hasContent = true;
    }
    if (!hasContent) {
        return '# ✈️ Pre-Flight Check\n\n✅ No conventions, gotchas, or past bugs found. Clear for takeoff.';
    }
    return sections.join('\n');
}
//# sourceMappingURL=pre-flight.js.map