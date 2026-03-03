"use strict";
/**
 * Success Tracker — Reinforces approaches that work.
 *
 * When the user says "that worked", "perfect", "great job", "exactly what I wanted",
 * this module captures what approach was used and stores it as a proven pattern.
 *
 * The AI currently only learns from MISTAKES (corrections, bug fixes).
 * But learning from SUCCESS is equally important — repeat what works.
 *
 * Detects:
 * - Explicit praise: "perfect", "that's exactly right", "great"
 * - Implicit success: "it works now", "the tests pass", "build succeeded"
 * - Task completion: "done", "all good", "ship it"
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectSuccess = detectSuccess;
exports.buildSuccessMemory = buildSuccessMemory;
// ─── Detection Patterns ──────────────────────────────────────────────────────
const PRAISE_PATTERNS = [
    // Explicit praise (highest confidence)
    { regex: /\b(?:perfect|exactly\s+(?:right|what\s+i\s+(?:wanted|needed)))\b/i, type: 'explicit_praise', confidence: 0.95 },
    { regex: /\b(?:great\s+(?:job|work)|well\s+done|nice\s+work|awesome|excellent)\b/i, type: 'explicit_praise', confidence: 0.90 },
    { regex: /\bthat'?s?\s+(?:exactly|precisely|perfectly)\s+(?:right|correct|it)\b/i, type: 'explicit_praise', confidence: 0.90 },
    { regex: /\bthank(?:s| you)\s+(?:that|this|it)\s+(?:works?|helped|fixed)\b/i, type: 'explicit_praise', confidence: 0.85 },
    { regex: /\byou\s+(?:nailed|got)\s+it\b/i, type: 'explicit_praise', confidence: 0.90 },
    // Implicit success (medium confidence)
    { regex: /\b(?:it|that)\s+works?\s+(?:now|perfectly|great|fine)\b/i, type: 'implicit_success', confidence: 0.85 },
    { regex: /\btests?\s+(?:pass|passed|passing|all\s+pass)\b/i, type: 'implicit_success', confidence: 0.90 },
    { regex: /\bbuild\s+(?:succeeded|passed|success|works)\b/i, type: 'implicit_success', confidence: 0.90 },
    { regex: /\b(?:no\s+(?:more\s+)?errors?|error\s+(?:is\s+)?(?:gone|fixed|resolved))\b/i, type: 'implicit_success', confidence: 0.85 },
    { regex: /\b(?:the\s+)?(?:bug|issue|problem)\s+(?:is\s+)?(?:fixed|resolved|gone)\b/i, type: 'implicit_success', confidence: 0.85 },
    // Task completion (lower confidence — context-dependent)
    { regex: /\b(?:all\s+(?:good|done|set)|we'?re?\s+(?:good|done|set))\b/i, type: 'task_completion', confidence: 0.75 },
    { regex: /\b(?:ship\s+it|let'?s?\s+(?:merge|deploy|push))\b/i, type: 'task_completion', confidence: 0.80 },
    { regex: /\b(?:looks?\s+(?:good|great|perfect)|lgtm)\b/i, type: 'task_completion', confidence: 0.80 },
];
/**
 * Detect success signals from user text.
 */
function detectSuccess(text) {
    const signals = [];
    const seen = new Set();
    for (const pattern of PRAISE_PATTERNS) {
        const match = text.match(pattern.regex);
        if (match && !seen.has(pattern.type)) {
            signals.push({
                type: pattern.type,
                trigger: match[0],
                confidence: pattern.confidence,
            });
            seen.add(`${pattern.type}:${match[0].toLowerCase()}`);
        }
    }
    return signals;
}
/**
 * Build a success memory from the signal and the AI's recent response context.
 * The context should describe what approach was used.
 */
function buildSuccessMemory(signal, aiContext) {
    // Extract the approach from AI context (first meaningful sentence)
    const approach = aiContext
        .split(/[.\n]/)
        .map(s => s.trim())
        .filter(s => s.length > 20 && s.length < 200)
        .slice(0, 2)
        .join('. ') || aiContext.slice(0, 200);
    return {
        intent: `[PROVEN] ${approach}`,
        reason: `User confirmed success: "${signal.trigger}" (${signal.type}, confidence: ${signal.confidence})`,
        tags: ['success', 'proven-pattern', signal.type],
    };
}
//# sourceMappingURL=success-tracker.js.map