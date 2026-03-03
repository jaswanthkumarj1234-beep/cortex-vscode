"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInstructions = generateInstructions;
exports.formatInstructions = formatInstructions;
const types_1 = require("../types");
/**
 * Generate contextual instructions from stored memories.
 */
function generateInstructions(memoryStore) {
    const instructions = {
        dos: [],
        donts: [],
        watchOuts: [],
        style: [],
    };
    const active = memoryStore.getActive(200);
    for (const m of active) {
        const intent = m.intent.toLowerCase();
        const full = `${m.intent} ${m.action || ''} ${m.reason || ''}`;
        // ─── Corrections → DON'Ts ──────────────────────────────────────
        if (m.type === types_1.MemoryType.CORRECTION) {
            // Extract the "don't do X" from corrections
            const noMatch = full.match(/(?:no[,.]?\s+use|don'?t\s+use|never\s+use|avoid|instead\s+of)\s+(\w[\w\s]{3,40})/i);
            const yesMatch = full.match(/(?:use|prefer|always\s+use|should\s+use|switch\s+to)\s+(\w[\w\s]{3,40})/i);
            if (noMatch) {
                instructions.donts.push(`DON'T: ${noMatch[1].trim()}`);
            }
            if (yesMatch) {
                instructions.dos.push(`DO: ${yesMatch[1].trim()}`);
            }
            if (!noMatch && !yesMatch) {
                instructions.watchOuts.push(`⚠️ Past correction: ${m.intent.slice(0, 80)}`);
            }
        }
        // ─── Conventions → DOs ─────────────────────────────────────────
        if (m.type === types_1.MemoryType.CONVENTION) {
            // Check if this is a preference (communication style)
            if (m.tags?.includes('preference')) {
                instructions.style.push(m.intent.slice(0, 80));
                continue;
            }
            // Auto-detected conventions → direct rules
            if (m.tags?.includes('auto-detected')) {
                if (intent.includes('arrow function')) {
                    instructions.dos.push('DO: Use arrow functions (const fn = () => {})');
                }
                else if (intent.includes('function declaration')) {
                    instructions.dos.push('DO: Use function declarations (function fn() {})');
                }
                else if (intent.includes('const over let')) {
                    instructions.dos.push('DO: Use const by default, let only when reassignment needed');
                }
                else if (intent.includes('semicolon')) {
                    if (intent.includes('always'))
                        instructions.dos.push('DO: Always use semicolons');
                    else
                        instructions.dos.push('DO: Omit semicolons (ASI style)');
                }
                else if (intent.includes('single quote')) {
                    instructions.dos.push('DO: Use single quotes for strings');
                }
                else if (intent.includes('double quote')) {
                    instructions.dos.push('DO: Use double quotes for strings');
                }
                else {
                    instructions.dos.push(`DO: ${m.intent.slice(0, 80)}`);
                }
                continue;
            }
            instructions.dos.push(`DO: ${m.intent.slice(0, 80)}`);
        }
        // ─── Bug Fixes → Watch Outs ───────────────────────────────────
        if (m.type === types_1.MemoryType.BUG_FIX) {
            if (m.tags?.includes('error-pattern')) {
                // These are TS error lessons
                instructions.watchOuts.push(`⚠️ ${m.intent.replace('[ERROR PATTERN] ', '').slice(0, 80)}`);
            }
            else {
                instructions.watchOuts.push(`⚠️ Known bug: ${m.intent.slice(0, 80)}`);
            }
        }
    }
    // Deduplicate
    instructions.dos = [...new Set(instructions.dos)].slice(0, 15);
    instructions.donts = [...new Set(instructions.donts)].slice(0, 10);
    instructions.watchOuts = [...new Set(instructions.watchOuts)].slice(0, 10);
    instructions.style = [...new Set(instructions.style)].slice(0, 5);
    return instructions;
}
/**
 * Format instructions as a clear, imperative briefing.
 */
function formatInstructions(instructions) {
    const sections = [];
    if (instructions.dos.length > 0) {
        sections.push('## ✅ Project Rules (DO)');
        for (const d of instructions.dos)
            sections.push(`- ${d}`);
    }
    if (instructions.donts.length > 0) {
        sections.push('\n## ❌ Avoid (DON\'T)');
        for (const d of instructions.donts)
            sections.push(`- ${d}`);
    }
    if (instructions.watchOuts.length > 0) {
        sections.push('\n## ⚠️ Watch Out');
        for (const w of instructions.watchOuts)
            sections.push(`- ${w}`);
    }
    if (instructions.style.length > 0) {
        sections.push('\n## 🎯 Communication Style');
        for (const s of instructions.style)
            sections.push(`- ${s}`);
    }
    return sections.length > 0 ? sections.join('\n') : '';
}
//# sourceMappingURL=instructions-generator.js.map