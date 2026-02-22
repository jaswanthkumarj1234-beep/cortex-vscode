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
exports.FileVerifier = void 0;
/**
 * File Verifier — Catches hallucinated file paths.
 *
 * Pure Node.js — no VS Code dependency.
 * Verifies file paths mentioned in AI responses against the real file system.
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class FileVerifier {
    workspaceRoot;
    fileIndex = new Set();
    lastIndexTime = 0;
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
        this.buildIndex();
    }
    /** Build file index (cached, rebuilt every 60s) */
    buildIndex() {
        if (Date.now() - this.lastIndexTime < 60_000 && this.fileIndex.size > 0)
            return;
        this.fileIndex.clear();
        const ignore = new Set(['node_modules', '.git', 'dist', '.ai', '.gemini', 'coverage']);
        const walk = (dir, depth = 0) => {
            if (depth > 6)
                return;
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    if (ignore.has(entry.name))
                        continue;
                    const rel = path.relative(this.workspaceRoot, path.join(dir, entry.name));
                    if (entry.isDirectory()) {
                        this.fileIndex.add(rel.replace(/\\/g, '/') + '/');
                        walk(path.join(dir, entry.name), depth + 1);
                    }
                    else {
                        this.fileIndex.add(rel.replace(/\\/g, '/'));
                    }
                }
            }
            catch { }
        };
        walk(this.workspaceRoot);
        this.lastIndexTime = Date.now();
    }
    /** Verify a list of file paths */
    verify(filePaths) {
        this.buildIndex(); // refresh if stale
        const result = { valid: [], invalid: [], suggestions: {} };
        for (const filePath of filePaths) {
            const normalized = filePath.replace(/\\/g, '/');
            // Check exact match
            if (this.fileIndex.has(normalized)) {
                result.valid.push(filePath);
                continue;
            }
            // Check absolute path
            const abs = path.resolve(this.workspaceRoot, filePath);
            if (fs.existsSync(abs)) {
                result.valid.push(filePath);
                continue;
            }
            // Invalid — find suggestions
            result.invalid.push(filePath);
            const basename = path.basename(filePath);
            const suggestions = Array.from(this.fileIndex)
                .filter(f => f.endsWith(basename))
                .slice(0, 3);
            if (suggestions.length > 0) {
                result.suggestions[filePath] = suggestions;
            }
        }
        return result;
    }
    /** Extract file paths from text (AI response) */
    extractPaths(text) {
        const patterns = [
            /(?:src|lib|app|pages|components|utils|hooks|services|server|api)\/[\w/.-]+\.\w+/g,
            /[\w-]+\.(?:ts|tsx|js|jsx|py|rs|go|java|css|html|json|md|yaml|yml|toml)/g,
        ];
        const paths = new Set();
        for (const pattern of patterns) {
            const matches = text.match(pattern) || [];
            for (const m of matches) {
                if (m.length > 3 && m.length < 200) {
                    paths.add(m);
                }
            }
        }
        return Array.from(paths);
    }
    /** Full verification: extract paths from text and verify all */
    verifyText(text) {
        const paths = this.extractPaths(text);
        return this.verify(paths);
    }
    /** Get all indexed files (for context injection) */
    getAllFiles() {
        this.buildIndex();
        return Array.from(this.fileIndex).filter(f => !f.endsWith('/'));
    }
}
exports.FileVerifier = FileVerifier;
//# sourceMappingURL=file-verifier.js.map