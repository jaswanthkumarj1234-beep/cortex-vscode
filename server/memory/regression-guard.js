"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractVerificationSteps = extractVerificationSteps;
exports.findRelatedVerification = findRelatedVerification;
exports.attachVerification = attachVerification;
const types_1 = require("../types");
/**
 * Extract verification steps from AI text.
 * Looks for build/test commands and their expected outcomes.
 */
function extractVerificationSteps(text) {
    const steps = [];
    const seen = new Set();
    // 1. npm commands
    const npmRegex = /npm\s+(?:run\s+)?(\w+)/gi;
    let match;
    while ((match = npmRegex.exec(text)) !== null) {
        const cmd = match[0];
        if (seen.has(cmd))
            continue;
        seen.add(cmd);
        // Look for expected result near the command
        const nearText = text.slice(Math.max(0, match.index - 100), match.index + 200);
        let check = '';
        if (/0\s+error|no\s+error|pass|success/i.test(nearText)) {
            check = 'Should succeed with 0 errors';
        }
        else if (/fail|error|broke/i.test(nearText)) {
            check = 'Was failing — verify it passes now';
        }
        steps.push({ command: cmd, check: check || `Run ${cmd} and verify output` });
    }
    // 2. Test file references
    const testRegex = /(\w+\.(?:test|spec)\.\w+)/gi;
    while ((match = testRegex.exec(text)) !== null) {
        if (seen.has(match[1]))
            continue;
        seen.add(match[1]);
        steps.push({ file: match[1], check: `Run tests in ${match[1]}` });
    }
    // 3. Build verification
    if (/tsc|compile|typescript/i.test(text) && !seen.has('build')) {
        steps.push({ command: 'npm run build', check: 'TypeScript compilation should have 0 errors' });
    }
    return steps.slice(0, 5);
}
/**
 * Find verification steps for similar past bugs.
 * When a new bug appears, search for related fixes and their verification.
 */
function findRelatedVerification(memoryStore, bugDescription) {
    const verifications = [];
    try {
        const results = memoryStore.searchFTS(bugDescription, 10);
        for (const r of results) {
            if (r.memory.type === types_1.MemoryType.BUG_FIX && r.memory.action) {
                // Check if action contains verification info
                const action = r.memory.action;
                if (/verify|test|check|build|npm|command/i.test(action)) {
                    verifications.push(`📋 For "${r.memory.intent.slice(0, 60)}": ${action.slice(0, 150)}`);
                }
            }
        }
    }
    catch { /* non-fatal */ }
    return verifications.slice(0, 5);
}
/**
 * Attach verification steps to a bug fix description.
 * Returns enhanced text with verification section appended.
 */
function attachVerification(fixDescription, steps) {
    if (steps.length === 0)
        return fixDescription;
    let enhanced = fixDescription;
    enhanced += '\n\n--- Verification ---';
    for (const step of steps) {
        if (step.command) {
            enhanced += `\nRun: ${step.command}`;
        }
        if (step.file) {
            enhanced += `\nCheck: ${step.file}`;
        }
        if (step.check) {
            enhanced += ` → ${step.check}`;
        }
    }
    return enhanced;
}
//# sourceMappingURL=regression-guard.js.map