"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextBuilder = void 0;
const types_1 = require("../types");
const config_1 = require("../config/config");
class ContextBuilder {
    memoryStore;
    constructor(memoryStore) {
        this.memoryStore = memoryStore;
    }
    /** Build the full context string for injection */
    build(options) {
        const maxChars = options?.maxChars || config_1.CONFIG.MAX_CONTEXT_CHARS;
        const parts = [];
        // Single query: fetch all active memories, then filter resolved + bucket by type
        const allMemories = this.memoryStore.getActive(500)
            .filter(m => !m.tags?.includes('resolved')); // Skip resolved/completed topics
        const byType = new Map();
        for (const m of allMemories) {
            const arr = byType.get(m.type) || [];
            arr.push(m);
            byType.set(m.type, arr);
        }
        // 1. ALL Corrections (highest priority — prevent repeated mistakes)
        const corrections = byType.get(types_1.MemoryType.CORRECTION) || [];
        if (corrections.length > 0) {
            parts.push('## Corrections (DO NOT repeat these mistakes)');
            for (const c of corrections) {
                parts.push(`- ${c.intent}${c.reason ? ` — ${c.reason}` : ''}`);
            }
        }
        // 2. ALL Decisions (architectural choices)
        const decisions = byType.get(types_1.MemoryType.DECISION) || [];
        if (decisions.length > 0) {
            parts.push('\n## Decisions');
            for (const d of decisions) {
                parts.push(`- ${d.intent}${d.reason ? ` — ${d.reason}` : ''}`);
            }
        }
        // 3. ALL Conventions (coding standards)
        const conventions = byType.get(types_1.MemoryType.CONVENTION) || [];
        if (conventions.length > 0) {
            parts.push('\n## Conventions');
            for (const c of conventions) {
                parts.push(`- ${c.intent}${c.reason ? ` — ${c.reason}` : ''}`);
            }
        }
        // 4. ALL Bug Fixes (prevent re-introducing bugs)
        const bugFixes = byType.get(types_1.MemoryType.BUG_FIX) || [];
        if (bugFixes.length > 0) {
            parts.push('\n## Bug Fixes (already solved — do not re-introduce)');
            for (const b of bugFixes) {
                parts.push(`- ${b.intent}${b.reason ? ` — ${b.reason}` : ''}`);
            }
        }
        // 5. Failed Suggestions (things that were tried and didn't work)
        const failed = byType.get(types_1.MemoryType.FAILED_SUGGESTION) || [];
        if (failed.length > 0) {
            parts.push('\n## Failed Attempts (DO NOT suggest these again)');
            for (const f of failed.slice(0, 10)) {
                parts.push(`- ${f.intent}${f.reason ? ` — ${f.reason}` : ''}`);
            }
        }
        // 6. Proven Patterns (things that work well)
        const patterns = byType.get(types_1.MemoryType.PROVEN_PATTERN) || [];
        if (patterns.length > 0) {
            parts.push('\n## Proven Patterns');
            for (const p of patterns.slice(0, 10)) {
                parts.push(`- ${p.intent}`);
            }
        }
        // 7. File-specific context (if a file is provided)
        if (options?.currentFile) {
            const fileMemories = this.memoryStore.getByFile(options.currentFile, 5);
            if (fileMemories.length > 0) {
                parts.push(`\n## Context for ${options.currentFile}`);
                for (const m of fileMemories) {
                    parts.push(`- [${m.type}] ${m.intent}`);
                }
            }
        }
        // 8. Dependencies (what the project uses)
        const deps = byType.get(types_1.MemoryType.DEPENDENCY) || [];
        if (deps.length > 0) {
            parts.push('\n## Stack');
            for (const d of deps.slice(0, 3)) {
                parts.push(`- ${d.intent}`);
            }
        }
        let context = parts.join('\n');
        // Compress if over budget
        if (context.length > maxChars) {
            context = this.compress(context, maxChars);
        }
        // Header
        return `# Brain Context (Auto-Injected)\n\n${context}\n\n> Always call \`recall_memory\` for specific queries.`;
    }
    /** Compress context to fit within character budget */
    compress(text, maxChars) {
        const lines = text.split('\n');
        let result = '';
        for (const line of lines) {
            if (result.length + line.length + 1 > maxChars)
                break;
            result += line + '\n';
        }
        return result.trimEnd();
    }
}
exports.ContextBuilder = ContextBuilder;
//# sourceMappingURL=context-builder.js.map