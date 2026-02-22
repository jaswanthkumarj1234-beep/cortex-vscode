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
exports.detectKnowledgeGaps = detectKnowledgeGaps;
exports.formatKnowledgeGaps = formatKnowledgeGaps;
/**
 * Meta-Memory — Knows what the brain DOESN'T know.
 *
 * Scans the project's source files and compares against stored memories.
 * Files/directories with zero memories = knowledge gaps.
 *
 * Like how a student knows "I haven't studied chapter 5 yet" —
 * self-awareness about what's missing is as important as what's known.
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/** Detect knowledge gaps in the project */
function detectKnowledgeGaps(memoryStore, workspaceRoot) {
    const gaps = [];
    // Get all memories' related files
    const knownFiles = new Set();
    const active = memoryStore.getActive(500);
    for (const m of active) {
        if (m.relatedFiles) {
            for (const f of m.relatedFiles) {
                knownFiles.add(normalize(f));
            }
        }
        // Also check intent for file references
        const fileRefs = m.intent.match(/[\w\-\/]+\.(ts|js|tsx|jsx|py|css|json|sql)/g);
        if (fileRefs) {
            for (const ref of fileRefs) {
                knownFiles.add(normalize(ref));
            }
        }
    }
    // Scan project source directories
    const srcDirs = ['src', 'lib', 'app', 'pages', 'components', 'api', 'server'];
    for (const dir of srcDirs) {
        const dirPath = path.join(workspaceRoot, dir);
        if (!fs.existsSync(dirPath))
            continue;
        const files = getSourceFiles(dirPath, workspaceRoot);
        const unknownFiles = files.filter(f => !knownFiles.has(normalize(f)));
        if (unknownFiles.length > 0 && unknownFiles.length === files.length) {
            // Entire directory unknown
            gaps.push({
                path: dir,
                type: 'directory',
                fileCount: unknownFiles.length,
            });
        }
        else if (unknownFiles.length > 2) {
            // Some files unknown
            for (const f of unknownFiles.slice(0, 5)) {
                gaps.push({ path: f, type: 'file' });
            }
        }
    }
    return gaps.slice(0, 10); // Limit to top 10 gaps
}
/** Format knowledge gaps for injection */
function formatKnowledgeGaps(gaps) {
    if (gaps.length === 0)
        return '';
    const lines = ['## 🧩 Knowledge Gaps (no memories about these)'];
    for (const gap of gaps) {
        if (gap.type === 'directory') {
            lines.push(`- 📁 **${gap.path}/** (${gap.fileCount} files, no context)`);
        }
        else {
            lines.push(`- 📄 ${gap.path}`);
        }
    }
    lines.push('\n> *Consider running `scan_project` or explaining these areas to build context.*');
    return lines.join('\n');
}
/** Get source files from a directory */
function getSourceFiles(dir, root, depth = 0) {
    if (depth > 3)
        return [];
    const ignore = new Set(['node_modules', '.git', 'dist', 'coverage', '__tests__', '__mocks__', '.next']);
    const exts = new Set(['.ts', '.js', '.tsx', '.jsx', '.py', '.css', '.sql']);
    const files = [];
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (ignore.has(entry.name) || entry.name.startsWith('.'))
                continue;
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                files.push(...getSourceFiles(full, root, depth + 1));
            }
            else {
                const ext = path.extname(entry.name);
                if (exts.has(ext) && !entry.name.endsWith('.d.ts')) {
                    files.push(path.relative(root, full).replace(/\\/g, '/'));
                }
            }
        }
    }
    catch { }
    return files;
}
/** Normalize file paths for comparison */
function normalize(filePath) {
    return filePath.toLowerCase().replace(/\\/g, '/').replace(/^\.\//, '');
}
//# sourceMappingURL=meta-memory.js.map