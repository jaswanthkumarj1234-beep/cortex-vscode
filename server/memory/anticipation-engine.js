"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.anticipate = anticipate;
exports.formatAnticipation = formatAnticipation;
const types_1 = require("../types");
function anticipate(memoryStore, currentFile) {
    const result = {
        fileMemories: [],
        directoryMemories: [],
        relatedTypeMemories: [],
    };
    if (!currentFile)
        return result;
    // 1. Direct file memories — exact file match
    const fileMemories = memoryStore.getByFile(currentFile, 10);
    result.fileMemories = fileMemories.map((m, i) => ({
        memory: m,
        score: 1.0 - (i * 0.05),
        matchMethod: 'anticipation:file',
    }));
    // 2. Directory memories — same folder = likely related
    const dir = currentFile.replace(/[\\/][^\\/]+$/, '');
    if (dir && dir !== currentFile) {
        const dirMemories = memoryStore.getByDirectory(dir, 5);
        result.directoryMemories = dirMemories.map((m, i) => ({
            memory: m,
            score: 0.7 - (i * 0.05),
            matchMethod: 'anticipation:directory',
        }));
    }
    // 3. File type memories — .ts file? surface TS-related conventions
    const ext = currentFile.split('.').pop()?.toLowerCase();
    if (ext) {
        const typeKeywords = {
            ts: ['typescript', 'type', 'interface', 'enum'],
            tsx: ['react', 'component', 'jsx', 'hook', 'state'],
            css: ['style', 'css', 'theme', 'color', 'font'],
            py: ['python', 'pip', 'def', 'class'],
            js: ['javascript', 'node', 'require', 'module'],
            sql: ['database', 'query', 'table', 'migration'],
            json: ['config', 'package', 'settings'],
        };
        const keywords = typeKeywords[ext];
        if (keywords) {
            // Use FTS search for keywords instead of loading all conventions and filtering in JS
            const searchQuery = keywords.join(' OR ');
            try {
                const ftsResults = memoryStore.searchFTS(searchQuery, 10);
                const matched = ftsResults
                    .filter(r => r.memory.type === types_1.MemoryType.CONVENTION)
                    .slice(0, 3);
                result.relatedTypeMemories = matched.map((r, i) => ({
                    memory: r.memory,
                    score: 0.5 - (i * 0.05),
                    matchMethod: 'anticipation:filetype',
                }));
            }
            catch {
                // FTS failed — fallback silently
            }
        }
    }
    return result;
}
/** Format anticipation results for injection */
function formatAnticipation(result) {
    const all = [
        ...result.fileMemories,
        ...result.directoryMemories,
        ...result.relatedTypeMemories,
    ];
    if (all.length === 0)
        return '';
    const lines = ['## 🔮 Anticipated Context (for current file)'];
    const seen = new Set();
    for (const m of all.slice(0, 8)) {
        if (seen.has(m.memory.id))
            continue;
        seen.add(m.memory.id);
        lines.push(`- [${m.memory.type}] ${m.memory.intent}${m.memory.reason ? ` — ${m.memory.reason}` : ''}`);
    }
    return lines.join('\n');
}
//# sourceMappingURL=anticipation-engine.js.map