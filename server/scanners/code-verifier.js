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
exports.ConfigVerifier = exports.ExportVerifier = exports.ImportVerifier = void 0;
exports.verifyCode = verifyCode;
/**
 * Code Verifier — Catches hallucinated imports, exports, and config keys.
 *
 * Three verification modes:
 * 1. Import Verifier — checks if npm packages exist in package.json / node_modules
 * 2. Export Verifier — checks if imported functions actually exist in source files
 * 3. Config Verifier — checks if env variables exist in .env / .env.example
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// ─── Import Verifier ───
class ImportVerifier {
    workspaceRoot;
    installedPackages = new Set();
    declaredDeps = new Set();
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
        this.loadPackageJson();
        this.scanNodeModules();
    }
    loadPackageJson() {
        try {
            const pkgPath = path.join(this.workspaceRoot, 'package.json');
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
            const allDeps = {
                ...pkg.dependencies,
                ...pkg.devDependencies,
                ...pkg.peerDependencies,
            };
            for (const name of Object.keys(allDeps || {})) {
                this.declaredDeps.add(name);
            }
        }
        catch { }
    }
    scanNodeModules() {
        try {
            const nmPath = path.join(this.workspaceRoot, 'node_modules');
            const entries = fs.readdirSync(nmPath, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory() && !entry.name.startsWith('.')) {
                    if (entry.name.startsWith('@')) {
                        // Scoped packages like @types/node
                        try {
                            const scoped = fs.readdirSync(path.join(nmPath, entry.name));
                            for (const sub of scoped) {
                                this.installedPackages.add(`${entry.name}/${sub}`);
                            }
                        }
                        catch { }
                    }
                    else {
                        this.installedPackages.add(entry.name);
                    }
                }
            }
        }
        catch { }
    }
    /** Verify a list of package names */
    verify(packages) {
        const result = { valid: [], invalid: [], suggestions: {} };
        for (const pkg of packages) {
            // Skip relative imports and node builtins
            if (pkg.startsWith('.') || pkg.startsWith('/'))
                continue;
            if (this.isNodeBuiltin(pkg))
                continue;
            // Get the package name (handle subpath like 'lodash/merge')
            const pkgName = pkg.startsWith('@')
                ? pkg.split('/').slice(0, 2).join('/')
                : pkg.split('/')[0];
            if (this.declaredDeps.has(pkgName) || this.installedPackages.has(pkgName)) {
                result.valid.push(pkgName);
            }
            else {
                result.invalid.push(pkgName);
                // Find similar packages
                const suggestions = this.findSimilar(pkgName);
                if (suggestions.length > 0) {
                    result.suggestions[pkgName] = suggestions;
                }
            }
        }
        return result;
    }
    /** Extract import package names from code text */
    extractImports(text) {
        const packages = new Set();
        const patterns = [
            /(?:from\s+['"])([^'"]+)(?:['"])/g, // import ... from 'pkg'
            /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g, // require('pkg')
            /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g, // dynamic import('pkg')
        ];
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const pkg = match[1];
                if (!pkg.startsWith('.') && !pkg.startsWith('/')) {
                    packages.add(pkg);
                }
            }
        }
        return Array.from(packages);
    }
    isNodeBuiltin(name) {
        const builtins = new Set([
            'assert', 'buffer', 'child_process', 'cluster', 'console', 'constants',
            'crypto', 'dgram', 'dns', 'domain', 'events', 'fs', 'http', 'http2',
            'https', 'module', 'net', 'os', 'path', 'perf_hooks', 'process',
            'querystring', 'readline', 'repl', 'stream', 'string_decoder', 'sys',
            'timers', 'tls', 'tty', 'url', 'util', 'v8', 'vm', 'worker_threads',
            'zlib', 'diagnostics_channel', 'inspector', 'trace_events',
            'node:assert', 'node:buffer', 'node:child_process', 'node:crypto',
            'node:events', 'node:fs', 'node:http', 'node:https', 'node:net',
            'node:os', 'node:path', 'node:process', 'node:readline', 'node:stream',
            'node:url', 'node:util', 'node:worker_threads', 'node:zlib',
            'node:diagnostics_channel', 'node:test',
        ]);
        return builtins.has(name);
    }
    findSimilar(name) {
        const allPkgs = Array.from(this.declaredDeps);
        return allPkgs
            .filter(p => {
            // Simple similarity: shared prefix or contains
            return p.includes(name) || name.includes(p) ||
                this.levenshteinClose(p, name);
        })
            .slice(0, 3);
    }
    levenshteinClose(a, b) {
        if (Math.abs(a.length - b.length) > 3)
            return false;
        let diff = 0;
        const minLen = Math.min(a.length, b.length);
        for (let i = 0; i < minLen; i++) {
            if (a[i] !== b[i])
                diff++;
        }
        return diff + Math.abs(a.length - b.length) <= 2;
    }
}
exports.ImportVerifier = ImportVerifier;
// ─── Export Verifier ───
class ExportVerifier {
    workspaceRoot;
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
    }
    /** Check if specific named exports exist in a source file */
    verifyExports(filePath, names) {
        const result = { valid: [], invalid: [], available: [] };
        // Resolve the file path
        const resolved = this.resolveFile(filePath);
        if (!resolved) {
            return { valid: [], invalid: names, available: [] };
        }
        // Extract actual exports from the file
        try {
            const content = fs.readFileSync(resolved, 'utf-8');
            const actualExports = this.extractExports(content);
            result.available = actualExports;
            for (const name of names) {
                if (actualExports.includes(name)) {
                    result.valid.push(name);
                }
                else {
                    result.invalid.push(name);
                }
            }
        }
        catch {
            result.invalid = names;
        }
        return result;
    }
    /** Extract all exported names from a TypeScript/JavaScript file */
    extractExports(content) {
        const exports = new Set();
        const patterns = [
            /export\s+(?:async\s+)?function\s+(\w+)/g, // export function foo
            /export\s+(?:abstract\s+)?class\s+(\w+)/g, // export class Foo
            /export\s+const\s+(\w+)/g, // export const foo
            /export\s+let\s+(\w+)/g, // export let foo
            /export\s+var\s+(\w+)/g, // export var foo
            /export\s+enum\s+(\w+)/g, // export enum Foo
            /export\s+interface\s+(\w+)/g, // export interface Foo
            /export\s+type\s+(\w+)/g, // export type Foo
            /export\s+default\s+(?:class|function)\s+(\w+)/g, // export default class Foo
            /export\s*\{\s*([^}]+)\s*\}/g, // export { foo, bar }
        ];
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const capture = match[1];
                // Handle export { foo, bar, baz as qux }
                if (pattern.source.includes('\\{')) {
                    const names = capture.split(',').map(n => {
                        const parts = n.trim().split(/\s+as\s+/);
                        return parts[parts.length - 1].trim();
                    });
                    names.forEach(n => { if (n && /^\w+$/.test(n))
                        exports.add(n); });
                }
                else {
                    exports.add(capture);
                }
            }
        }
        return Array.from(exports);
    }
    /** Extract import-from-file statements from text */
    extractLocalImports(text) {
        const results = [];
        // import { foo, bar } from './services/auth'
        const pattern = /import\s*\{([^}]+)\}\s*from\s*['"](\.[^'"]+)['"]/g;
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const names = match[1].split(',').map(n => {
                const parts = n.trim().split(/\s+as\s+/);
                return parts[0].trim(); // use the original name, not alias
            }).filter(n => n.length > 0);
            results.push({ names, file: match[2] });
        }
        return results;
    }
    resolveFile(filePath) {
        const abs = path.isAbsolute(filePath)
            ? filePath
            : path.join(this.workspaceRoot, filePath);
        // Try exact, then with extensions
        const tries = [abs, abs + '.ts', abs + '.tsx', abs + '.js', abs + '.jsx'];
        // Also try /index variants
        tries.push(path.join(abs, 'index.ts'), path.join(abs, 'index.tsx'), path.join(abs, 'index.js'));
        for (const p of tries) {
            if (fs.existsSync(p) && fs.statSync(p).isFile()) {
                return p;
            }
        }
        return null;
    }
}
exports.ExportVerifier = ExportVerifier;
// ─── Config Verifier ───
class ConfigVerifier {
    workspaceRoot;
    envVars = new Set();
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
        this.loadEnvFiles();
    }
    loadEnvFiles() {
        const envFiles = ['.env', '.env.example', '.env.local', '.env.development', '.env.template'];
        for (const file of envFiles) {
            try {
                const content = fs.readFileSync(path.join(this.workspaceRoot, file), 'utf-8');
                const lines = content.split('\n');
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed && !trimmed.startsWith('#')) {
                        const eqIndex = trimmed.indexOf('=');
                        if (eqIndex > 0) {
                            this.envVars.add(trimmed.substring(0, eqIndex).trim());
                        }
                    }
                }
            }
            catch { }
        }
    }
    /** Extract env variable references from code */
    extractEnvRefs(text) {
        const vars = new Set();
        const patterns = [
            /process\.env\.(\w+)/g, // process.env.FOO
            /process\.env\[['"](\w+)['"]\]/g, // process.env['FOO']
            /import\.meta\.env\.(\w+)/g, // Vite: import.meta.env.FOO
            /env\(['"](\w+)['"]\)/g, // Laravel-style env('FOO')
            /getenv\(['"](\w+)['"]\)/g, // getenv('FOO')
        ];
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const varName = match[1];
                // Skip common well-known ones
                if (!['NODE_ENV', 'HOME', 'PATH', 'USER', 'SHELL', 'TERM', 'PWD'].includes(varName)) {
                    vars.add(varName);
                }
            }
        }
        return Array.from(vars);
    }
    /** Verify env variable references */
    verify(varNames) {
        const result = {
            valid: [],
            invalid: [],
            available: Array.from(this.envVars),
        };
        for (const name of varNames) {
            if (this.envVars.has(name)) {
                result.valid.push(name);
            }
            else {
                result.invalid.push(name);
            }
        }
        return result;
    }
}
exports.ConfigVerifier = ConfigVerifier;
// ─── Combined Verifier ───
function verifyCode(text, workspaceRoot) {
    const importVerifier = new ImportVerifier(workspaceRoot);
    const exportVerifier = new ExportVerifier(workspaceRoot);
    const configVerifier = new ConfigVerifier(workspaceRoot);
    // 1. Verify imports
    const importNames = importVerifier.extractImports(text);
    const imports = importVerifier.verify(importNames);
    // 2. Verify exports (local imports only)
    const localImports = exportVerifier.extractLocalImports(text);
    const exportResult = { valid: [], invalid: [], available: {} };
    for (const li of localImports) {
        const result = exportVerifier.verifyExports(li.file, li.names);
        exportResult.valid.push(...result.valid);
        exportResult.invalid.push(...result.invalid);
        if (result.available.length > 0) {
            exportResult.available[li.file] = result.available;
        }
    }
    // 3. Verify env vars
    const envRefs = configVerifier.extractEnvRefs(text);
    const envVars = configVerifier.verify(envRefs);
    return { imports, exports: exportResult, envVars };
}
//# sourceMappingURL=code-verifier.js.map