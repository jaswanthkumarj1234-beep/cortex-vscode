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
        const allActive = memoryStore.getActive(200);
        const dirMemories = allActive.filter(m => m.relatedFiles?.some(f => f.startsWith(dir) || f.includes(dir)));
        result.directoryMemories = dirMemories.slice(0, 5).map((m, i) => ({
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
            const conventions = memoryStore.getByType(types_1.MemoryType.CONVENTION, 50);
            const matched = conventions.filter(c => keywords.some(k => c.intent.toLowerCase().includes(k)));
            result.relatedTypeMemories = matched.slice(0, 3).map((m, i) => ({
                memory: m,
                score: 0.5 - (i * 0.05),
                matchMethod: 'anticipation:filetype',
            }));
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