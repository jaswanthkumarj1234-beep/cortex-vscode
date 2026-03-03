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
exports.detectConventions = detectConventions;
/**
 * Convention Detector — Auto-discovers coding patterns from source code.
 *
 * Scans actual project code to detect coding conventions:
 * - Arrow functions vs function declarations
 * - const vs let vs var usage
 * - Error handling patterns (try/catch, .catch(), Result type)
 * - Import style (named vs default, relative vs absolute)
 * - Naming conventions (camelCase, PascalCase, snake_case)
 * - File organization patterns
 *
 * Stores detected patterns as CONVENTION memories so the AI follows
 * the project's actual style, not generic defaults.
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Scan source files and detect coding conventions.
 */
function detectConventions(workspaceRoot) {
    const conventions = [];
    const files = getSourceFiles(workspaceRoot);
    if (files.length === 0)
        return conventions;
    // Counters for pattern detection
    const counts = {
        arrowFunctions: 0,
        functionDeclarations: 0,
        constUsage: 0,
        letUsage: 0,
        varUsage: 0,
        tryCatch: 0,
        dotCatch: 0,
        namedImports: 0,
        defaultImports: 0,
        relativeImports: 0,
        absoluteImports: 0,
        semicolons: 0,
        noSemicolons: 0,
        singleQuotes: 0,
        doubleQuotes: 0,
        asyncAwait: 0,
        thenChain: 0,
        typeAnnotations: 0,
        interfaceCount: 0,
        enumCount: 0,
        classCount: 0,
    };
    // Sample up to 20 files for speed
    const sampleFiles = files.slice(0, 20);
    let _totalLines = 0;
    for (const file of sampleFiles) {
        try {
            const content = fs.readFileSync(path.join(workspaceRoot, file), 'utf-8');
            const lines = content.split('\n');
            _totalLines += lines.length;
            // Count patterns
            counts.arrowFunctions += (content.match(/=>\s*{/g) || []).length;
            counts.functionDeclarations += (content.match(/function\s+\w+/g) || []).length;
            counts.constUsage += (content.match(/\bconst\s+/g) || []).length;
            counts.letUsage += (content.match(/\blet\s+/g) || []).length;
            counts.varUsage += (content.match(/\bvar\s+/g) || []).length;
            counts.tryCatch += (content.match(/try\s*{/g) || []).length;
            counts.dotCatch += (content.match(/\.catch\(/g) || []).length;
            counts.namedImports += (content.match(/import\s+{/g) || []).length;
            counts.defaultImports += (content.match(/import\s+\w+\s+from/g) || []).length;
            counts.relativeImports += (content.match(/from\s+['"]\.\//g) || []).length;
            counts.absoluteImports += (content.match(/from\s+['"](?!\.)/g) || []).length;
            counts.asyncAwait += (content.match(/\basync\s+/g) || []).length;
            counts.thenChain += (content.match(/\.then\(/g) || []).length;
            counts.typeAnnotations += (content.match(/:\s*(string|number|boolean|any|void|never)/g) || []).length;
            counts.interfaceCount += (content.match(/\binterface\s+\w+/g) || []).length;
            counts.enumCount += (content.match(/\benum\s+\w+/g) || []).length;
            counts.classCount += (content.match(/\bclass\s+\w+/g) || []).length;
            // Sample lines for semicolon and quote detection
            for (const line of lines.slice(0, 50)) {
                const trimmed = line.trim();
                if (trimmed.length > 5 && !trimmed.startsWith('//') && !trimmed.startsWith('*')) {
                    if (trimmed.endsWith(';'))
                        counts.semicolons++;
                    else
                        counts.noSemicolons++;
                    if (trimmed.includes("'"))
                        counts.singleQuotes++;
                    if (trimmed.includes('"'))
                        counts.doubleQuotes++;
                }
            }
        }
        catch { /* skip unreadable files */ }
    }
    // ─── Derive Conventions ──────────────────────────────────────────────────
    const total = (a, b) => a + b || 1;
    const ratio = (a, b) => a / total(a, b);
    // Function style
    const arrowRatio = ratio(counts.arrowFunctions, counts.functionDeclarations);
    if (arrowRatio > 0.7) {
        conventions.push({
            pattern: 'Use arrow functions (=>) — this project strongly prefers arrow functions over function declarations',
            evidence: `${counts.arrowFunctions} arrow functions vs ${counts.functionDeclarations} function declarations (${Math.round(arrowRatio * 100)}% arrow)`,
            confidence: Math.min(0.9, 0.6 + arrowRatio * 0.3),
            category: 'functions',
        });
    }
    else if (arrowRatio < 0.3) {
        conventions.push({
            pattern: 'Use function declarations — this project prefers traditional function declarations over arrow functions',
            evidence: `${counts.functionDeclarations} function declarations vs ${counts.arrowFunctions} arrow functions`,
            confidence: Math.min(0.9, 0.6 + (1 - arrowRatio) * 0.3),
            category: 'functions',
        });
    }
    // Variable declarations
    if (counts.varUsage > 0 && counts.constUsage + counts.letUsage > 0) {
        const varRatio = counts.varUsage / total(counts.varUsage, counts.constUsage + counts.letUsage);
        if (varRatio < 0.1) {
            conventions.push({
                pattern: 'Never use var — this project uses const/let exclusively',
                evidence: `${counts.constUsage} const, ${counts.letUsage} let, only ${counts.varUsage} var`,
                confidence: 0.90,
                category: 'variables',
            });
        }
    }
    if (counts.constUsage > 0 && counts.letUsage > 0) {
        const constRatio = ratio(counts.constUsage, counts.letUsage);
        if (constRatio > 0.8) {
            conventions.push({
                pattern: 'Prefer const over let — this project heavily favors immutable bindings',
                evidence: `${counts.constUsage} const vs ${counts.letUsage} let (${Math.round(constRatio * 100)}% const)`,
                confidence: 0.80,
                category: 'variables',
            });
        }
    }
    // Async patterns
    const asyncRatio = ratio(counts.asyncAwait, counts.thenChain);
    if (asyncRatio > 0.8 && counts.asyncAwait > 3) {
        conventions.push({
            pattern: 'Use async/await — this project uses async/await pattern, avoid .then() chains',
            evidence: `${counts.asyncAwait} async/await vs ${counts.thenChain} .then() chains`,
            confidence: 0.85,
            category: 'functions',
        });
    }
    // Error handling
    if (counts.tryCatch > 3) {
        conventions.push({
            pattern: 'Use try/catch for error handling — project uses structured error handling',
            evidence: `${counts.tryCatch} try/catch blocks, ${counts.dotCatch} .catch() handlers`,
            confidence: 0.75,
            category: 'errors',
        });
    }
    // Import style
    if (counts.namedImports > counts.defaultImports * 2) {
        conventions.push({
            pattern: 'Prefer named imports over default imports: import { X } from "..."',
            evidence: `${counts.namedImports} named imports vs ${counts.defaultImports} default imports`,
            confidence: 0.75,
            category: 'imports',
        });
    }
    // TypeScript strictness
    if (counts.typeAnnotations > 10 && counts.interfaceCount > 3) {
        conventions.push({
            pattern: 'Use explicit TypeScript types — project uses strong typing with interfaces',
            evidence: `${counts.typeAnnotations} type annotations, ${counts.interfaceCount} interfaces, ${counts.enumCount} enums`,
            confidence: 0.85,
            category: 'naming',
        });
    }
    // Semicolons
    const semiRatio = ratio(counts.semicolons, counts.noSemicolons);
    if (semiRatio > 0.8) {
        conventions.push({
            pattern: 'Always use semicolons at end of statements',
            evidence: `${Math.round(semiRatio * 100)}% of lines end with semicolons`,
            confidence: 0.80,
            category: 'structure',
        });
    }
    else if (semiRatio < 0.2) {
        conventions.push({
            pattern: 'No semicolons — project uses ASI (automatic semicolon insertion)',
            evidence: `Only ${Math.round(semiRatio * 100)}% of lines have semicolons`,
            confidence: 0.80,
            category: 'structure',
        });
    }
    // Quote style
    const quoteRatio = ratio(counts.singleQuotes, counts.doubleQuotes);
    if (quoteRatio > 0.7) {
        conventions.push({
            pattern: 'Use single quotes for strings',
            evidence: `${counts.singleQuotes} single-quoted vs ${counts.doubleQuotes} double-quoted strings`,
            confidence: 0.75,
            category: 'structure',
        });
    }
    else if (quoteRatio < 0.3) {
        conventions.push({
            pattern: 'Use double quotes for strings',
            evidence: `${counts.doubleQuotes} double-quoted vs ${counts.singleQuotes} single-quoted strings`,
            confidence: 0.75,
            category: 'structure',
        });
    }
    // Class vs functional style
    if (counts.classCount > 5) {
        conventions.push({
            pattern: 'Uses class-based architecture (OOP style)',
            evidence: `${counts.classCount} classes found across ${sampleFiles.length} files`,
            confidence: 0.70,
            category: 'structure',
        });
    }
    else if (counts.classCount === 0 && counts.arrowFunctions > 10) {
        conventions.push({
            pattern: 'Uses functional architecture — no classes, prefer pure functions',
            evidence: `0 classes, ${counts.arrowFunctions} arrow functions`,
            confidence: 0.70,
            category: 'structure',
        });
    }
    return conventions;
}
// ─── Helpers ─────────────────────────────────────────────────────────────────
function getSourceFiles(root) {
    const files = [];
    const ignore = new Set(['node_modules', '.git', 'dist', 'coverage', '.next', 'build']);
    const exts = new Set(['.ts', '.tsx', '.js', '.jsx']);
    function walk(dir, depth) {
        if (depth > 3 || files.length >= 30)
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
//# sourceMappingURL=convention-detector.js.map