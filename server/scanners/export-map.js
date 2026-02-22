"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildExportMap = buildExportMap;
exports.storeExportMap = storeExportMap;
exports.formatExportMap = formatExportMap;
exports.suggestRealExport = suggestRealExport;
/**
 * Export Map — Builds a complete map of all exported functions/classes/types
 * across the entire project. This is the anti-hallucination weapon.
 *
 * When AI tries to use a function that doesn't exist, this module:
 * 1. Provides the full list of REAL exports per file
 * 2. Suggests the closest matching REAL function
 * 3. Stores the export map as memories so it's injected at conversation start
 *
 * This prevents the #1 hallucination: AI inventing functions that don't exist.
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const types_1 = require("../types");
/** Build complete export map for the project */
function buildExportMap(workspaceRoot) {
    const files = new Map();
    const allExports = [];
    const srcDirs = ['src', 'lib', 'app', 'pages', 'components', 'utils', 'services', 'hooks', 'api'];
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs'];
    for (const dir of srcDirs) {
        const dirPath = path.join(workspaceRoot, dir);
        if (!fs.existsSync(dirPath))
            continue;
        scanDir(dirPath, workspaceRoot, files, allExports, extensions, 0);
    }
    // Also check root-level files
    try {
        const rootFiles = fs.readdirSync(workspaceRoot);
        for (const f of rootFiles) {
            if (extensions.some(ext => f.endsWith(ext)) && !f.includes('.d.ts') && !f.includes('node_modules')) {
                const fullPath = path.join(workspaceRoot, f);
                if (fs.statSync(fullPath).isFile()) {
                    extractFileExports(fullPath, workspaceRoot, files, allExports);
                }
            }
        }
    }
    catch { }
    return {
        files,
        allExports,
        totalFiles: files.size,
        totalExports: allExports.length,
    };
}
/** Store export map as memories for AI context injection */
function storeExportMap(memoryStore, exportMap) {
    if (exportMap.totalExports === 0)
        return 0;
    // Remove previous export map memories
    const existing = memoryStore.getActive(500).filter(m => m.tags?.includes('export-map'));
    for (const m of existing) {
        try {
            memoryStore.deactivate(m.id, 'export-map-refresh');
        }
        catch { }
    }
    // Group by directory for compact storage
    const byDir = new Map();
    for (const entry of exportMap.allExports) {
        const dir = path.dirname(entry.file);
        if (!byDir.has(dir))
            byDir.set(dir, []);
        const sig = entry.signature ? ` — ${entry.signature}` : '';
        byDir.get(dir).push(`${entry.name} (${entry.kind})${sig}`);
    }
    let stored = 0;
    for (const [dir, exports] of byDir) {
        const exportList = exports.slice(0, 30).join(', ');
        memoryStore.add({
            type: types_1.MemoryType.INSIGHT,
            intent: `Available exports in ${dir}/: ${exports.length} items`,
            action: exportList,
            tags: ['export-map', 'anti-hallucination', dir],
            confidence: 0.9,
            importance: 0.6,
            timestamp: Date.now(),
            isActive: true,
            accessCount: 0,
            createdAt: Date.now(),
            id: '',
        });
        stored++;
    }
    return stored;
}
/** Format export map for compact context injection */
function formatExportMap(exportMap) {
    if (exportMap.totalExports === 0)
        return '';
    const lines = [`## [API] Project Exports (${exportMap.totalExports} exports across ${exportMap.totalFiles} files)`];
    // Group by directory, show top exports
    const byDir = new Map();
    for (const entry of exportMap.allExports) {
        const dir = path.dirname(entry.file);
        if (!byDir.has(dir))
            byDir.set(dir, []);
        byDir.get(dir).push(entry);
    }
    for (const [dir, entries] of [...byDir.entries()].slice(0, 8)) {
        const names = entries.slice(0, 10).map(e => {
            if (e.kind === 'function')
                return `${e.name}()`;
            if (e.kind === 'class')
                return `class ${e.name}`;
            return e.name;
        });
        lines.push(`**${dir}/** → ${names.join(', ')}`);
    }
    return lines.join('\n');
}
/** Find closest matching real export for a hallucinated name */
function suggestRealExport(exportMap, hallucinated) {
    const lower = hallucinated.toLowerCase();
    const suggestions = [];
    for (const entry of exportMap.allExports) {
        const entryLower = entry.name.toLowerCase();
        // Exact substring match
        if (entryLower.includes(lower) || lower.includes(entryLower)) {
            suggestions.push({ name: entry.name, file: entry.file, score: 0.9 });
            continue;
        }
        // Check similar characters (basic similarity)
        const commonChars = [...lower].filter(c => entryLower.includes(c)).length;
        const similarity = commonChars / Math.max(lower.length, entryLower.length);
        if (similarity > 0.5) {
            suggestions.push({ name: entry.name, file: entry.file, score: similarity });
        }
    }
    return suggestions
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(s => `${s.name} (from ${s.file})`);
}
// ─── Internal Helpers ─────────────────────────────────────────────────────────
function scanDir(dir, root, files, all, extensions, depth) {
    if (depth > 5)
        return;
    try {
        const entries = fs.readdirSync(dir);
        for (const entry of entries) {
            if (entry.startsWith('.') || entry === 'node_modules' || entry === 'dist' || entry === 'build')
                continue;
            const fullPath = path.join(dir, entry);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                scanDir(fullPath, root, files, all, extensions, depth + 1);
            }
            else if (stat.isFile() && extensions.some(ext => entry.endsWith(ext)) && !entry.includes('.d.ts')) {
                extractFileExports(fullPath, root, files, all);
            }
        }
    }
    catch { }
}
function extractFileExports(fullPath, root, files, all) {
    try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const relativePath = path.relative(root, fullPath).replace(/\\/g, '/');
        const exports = [];
        // Pattern → kind mapping
        const patterns = [
            { regex: /export\s+(?:async\s+)?function\s+(\w+)\s*(\([^)]*\))/g, kind: 'function', sigExtract: true },
            { regex: /export\s+(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?/g, kind: 'class', sigExtract: true },
            { regex: /export\s+const\s+(\w+)/g, kind: 'const' },
            { regex: /export\s+let\s+(\w+)/g, kind: 'const' },
            { regex: /export\s+enum\s+(\w+)/g, kind: 'enum' },
            { regex: /export\s+interface\s+(\w+)/g, kind: 'interface' },
            { regex: /export\s+type\s+(\w+)/g, kind: 'type' },
            { regex: /export\s+default\s+(?:class|function)\s+(\w+)/g, kind: 'default' },
        ];
        for (const { regex, kind, sigExtract } of patterns) {
            let match;
            while ((match = regex.exec(content)) !== null) {
                const entry = {
                    file: relativePath,
                    name: match[1],
                    kind,
                };
                if (sigExtract && match[2]) {
                    entry.signature = kind === 'function'
                        ? `${match[1]}${match[2]}`
                        : `class ${match[1]} extends ${match[2]}`;
                }
                exports.push(entry);
            }
        }
        // Handle export { foo, bar }
        const reExport = /export\s*\{\s*([^}]+)\s*\}/g;
        let match;
        while ((match = reExport.exec(content)) !== null) {
            const names = match[1].split(',').map(n => {
                const parts = n.trim().split(/\s+as\s+/);
                return parts[parts.length - 1].trim();
            });
            for (const name of names) {
                if (name && /^\w+$/.test(name)) {
                    exports.push({ file: relativePath, name, kind: 'const' });
                }
            }
        }
        if (exports.length > 0) {
            files.set(relativePath, exports);
            all.push(...exports);
        }
    }
    catch { }
}
//# sourceMappingURL=export-map.js.map