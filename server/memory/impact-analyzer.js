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
exports.analyzeImpact = analyzeImpact;
exports.formatImpact = formatImpact;
/**
 * Impact Analyzer — Shows what breaks when you change a file.
 *
 * Before editing file A, this module checks the architecture graph
 * to find all files that import from A (dependents).
 * Prevents breaking changes by making dependencies visible.
 *
 * Like checking "who's using this?" before changing an API.
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Analyze the impact of changing a file.
 * Scans for import statements that reference the target file.
 */
function analyzeImpact(targetFile, workspaceRoot) {
    const result = {
        targetFile,
        directDependents: [],
        indirectDependents: [],
        totalImpact: 0,
        exports: [],
        riskLevel: 'LOW',
    };
    if (!workspaceRoot || !fs.existsSync(workspaceRoot))
        return result;
    // Normalize target for matching
    const targetBasename = path.basename(targetFile).replace(/\.(ts|tsx|js|jsx)$/, '');
    const targetRelative = path.relative(workspaceRoot, targetFile).replace(/\\/g, '/');
    // Get all source files
    const allFiles = getAllSourceFiles(workspaceRoot);
    // Find what the target exports
    try {
        const targetContent = fs.readFileSync(fs.existsSync(targetFile) ? targetFile : path.join(workspaceRoot, targetFile), 'utf-8');
        const exportMatches = targetContent.match(/export\s+(?:function|class|const|let|type|interface|enum)\s+(\w+)/g);
        if (exportMatches) {
            result.exports = exportMatches.map(m => {
                const name = m.match(/\s(\w+)$/);
                return name ? name[1] : m;
            });
        }
    }
    catch { /* file read failure is non-fatal */ }
    // Scan all files for imports from target
    for (const file of allFiles) {
        if (file === targetRelative)
            continue;
        try {
            const content = fs.readFileSync(path.join(workspaceRoot, file), 'utf-8');
            // Check for imports referencing the target file
            const importPattern = new RegExp(`(?:import|require).*(?:${escapeRegex(targetBasename)}|${escapeRegex(targetRelative.replace(/\.(ts|tsx|js|jsx)$/, ''))})`, 'i');
            if (importPattern.test(content)) {
                result.directDependents.push(file);
            }
        }
        catch { /* ignore read failures */ }
    }
    // Find indirect dependents (files that import from direct dependents)
    const directSet = new Set(result.directDependents);
    for (const depFile of result.directDependents) {
        const depBasename = path.basename(depFile).replace(/\.(ts|tsx|js|jsx)$/, '');
        for (const file of allFiles) {
            if (directSet.has(file) || file === targetRelative)
                continue;
            try {
                const content = fs.readFileSync(path.join(workspaceRoot, file), 'utf-8');
                if (content.includes(depBasename)) {
                    result.indirectDependents.push(file);
                }
            }
            catch { /* ignore */ }
        }
    }
    // Deduplicate indirect
    result.indirectDependents = [...new Set(result.indirectDependents)];
    result.totalImpact = result.directDependents.length + result.indirectDependents.length;
    // Risk level
    if (result.totalImpact === 0)
        result.riskLevel = 'LOW';
    else if (result.totalImpact <= 3)
        result.riskLevel = 'MEDIUM';
    else if (result.totalImpact <= 8)
        result.riskLevel = 'HIGH';
    else
        result.riskLevel = 'CRITICAL';
    return result;
}
/** Format impact analysis for AI consumption */
function formatImpact(result) {
    const riskEmoji = {
        LOW: '🟢', MEDIUM: '🟡', HIGH: '🟠', CRITICAL: '🔴',
    };
    const lines = [
        `# 💥 Impact Analysis: ${path.basename(result.targetFile)}`,
        `\n**Risk Level:** ${riskEmoji[result.riskLevel]} ${result.riskLevel} (${result.totalImpact} files affected)`,
    ];
    if (result.exports.length > 0) {
        lines.push(`\n**Exports:** \`${result.exports.slice(0, 10).join('`, `')}\``);
    }
    if (result.directDependents.length > 0) {
        lines.push(`\n## Direct Dependents (${result.directDependents.length} files import this)`);
        result.directDependents.forEach(f => lines.push(`- 📁 ${f}`));
    }
    if (result.indirectDependents.length > 0) {
        lines.push(`\n## Indirect Dependents (${result.indirectDependents.length} files)`);
        result.indirectDependents.slice(0, 5).forEach(f => lines.push(`- 📁 ${f}`));
        if (result.indirectDependents.length > 5) {
            lines.push(`_...and ${result.indirectDependents.length - 5} more_`);
        }
    }
    if (result.totalImpact === 0) {
        lines.push('\n✅ **No dependents found.** Safe to modify.');
    }
    else if (result.riskLevel === 'CRITICAL' || result.riskLevel === 'HIGH') {
        lines.push('\n> ⚠️ **Caution:** Many files depend on this. Changing exports or signatures may cause cascading failures.');
    }
    return lines.join('\n');
}
// ─── Helpers ─────────────────────────────────────────────────────────────────
function getAllSourceFiles(root, maxFiles = 200) {
    const files = [];
    const ignore = new Set(['node_modules', '.git', 'dist', 'coverage', '.next', 'build', 'out']);
    const exts = new Set(['.ts', '.tsx', '.js', '.jsx']);
    function walk(dir, depth) {
        if (depth > 4 || files.length >= maxFiles)
            return;
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (ignore.has(entry.name) || entry.name.startsWith('.'))
                    continue;
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    walk(full, depth + 1);
                }
                else {
                    const ext = path.extname(entry.name);
                    if (exts.has(ext) && !entry.name.endsWith('.d.ts')) {
                        files.push(path.relative(root, full).replace(/\\/g, '/'));
                    }
                }
            }
        }
        catch { /* ignore */ }
    }
    walk(root, 0);
    return files;
}
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
//# sourceMappingURL=impact-analyzer.js.map