"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectPreferences = detectPreferences;
exports.getStoredPreferences = getStoredPreferences;
// ─── Preference Detection Patterns ───────────────────────────────────────────
const PREFERENCE_PATTERNS = [
    // Communication style
    {
        category: 'communication',
        signals: [
            /\b(keep it short|be (more )?(brief|concise)|too (long|verbose)|shorter|less (text|detail))\b/gi,
            /\b(tldr|tl;dr|just the (code|answer)|skip the explanation)\b/gi,
        ],
        preference: 'User prefers concise, short responses — skip long explanations',
        confidence: 0.85,
    },
    {
        category: 'communication',
        signals: [
            /\b(explain (more|why|how)|tell me (more|why)|what does .{3,20} mean|I don'?t understand)\b/gi,
            /\b(more detail|elaborate|walk me through|step by step)\b/gi,
        ],
        preference: 'User prefers detailed explanations — explain reasoning and steps',
        confidence: 0.80,
    },
    // Workflow style
    {
        category: 'workflow',
        signals: [
            /\b(just (do|fix|change|build) it|don'?t ask|stop asking|go ahead)\b/gi,
            /\b(you decide|your (call|choice)|whatever you think|I trust you)\b/gi,
        ],
        preference: 'User prefers autonomous execution — do it without asking for approval',
        confidence: 0.85,
    },
    {
        category: 'workflow',
        signals: [
            /\b(ask (me|first)|check with me|don'?t (change|modify) (without|until)|show me (first|before))\b/gi,
            /\b(let me (review|see|approve)|wait for (my|approval))\b/gi,
        ],
        preference: 'User prefers to review before changes — always ask before modifying',
        confidence: 0.85,
    },
    // Coding style
    {
        category: 'coding',
        signals: [
            /\b(use (typescript|ts)|type(d|safe|safety)|add types|interface|generic)\b/gi,
        ],
        preference: 'User values TypeScript strict typing — always add types and interfaces',
        confidence: 0.70,
    },
    {
        category: 'coding',
        signals: [
            /\b(add (tests|test)|test (first|coverage)|write (a )?test|unit test|spec)\b/gi,
        ],
        preference: 'User values testing — write tests alongside code',
        confidence: 0.75,
    },
    {
        category: 'coding',
        signals: [
            /\b(no (comments|documentation)|don'?t add comments|too many comments|over.?comment)\b/gi,
        ],
        preference: 'User prefers minimal comments — code should be self-documenting',
        confidence: 0.75,
    },
    {
        category: 'coding',
        signals: [
            /\b(add comments|document|jsdoc|explain the code|comment the|well.?documented)\b/gi,
        ],
        preference: 'User values code documentation — add comments and JSDoc',
        confidence: 0.75,
    },
    // Style preferences
    {
        category: 'style',
        signals: [
            /\b(dark (mode|theme)|prefer dark|use dark)\b/gi,
        ],
        preference: 'User prefers dark mode/theme',
        confidence: 0.80,
    },
    {
        category: 'style',
        signals: [
            /\b(simple|minimal|minimalist|clean|no (fancy|animation|effect))\b/gi,
        ],
        preference: 'User prefers simple, minimalist design — avoid complex UI effects',
        confidence: 0.70,
    },
];
// ─── Main Detector ───────────────────────────────────────────────────────────
/**
 * Detect user preferences from their message text.
 * Call this from auto_learn when context is provided.
 */
function detectPreferences(userText) {
    if (!userText || userText.length < 10)
        return [];
    const results = [];
    const seen = new Set();
    for (const pattern of PREFERENCE_PATTERNS) {
        for (const signal of pattern.signals) {
            signal.lastIndex = 0;
            const match = signal.exec(userText);
            if (match && !seen.has(pattern.preference)) {
                seen.add(pattern.preference);
                results.push({
                    category: pattern.category,
                    preference: pattern.preference,
                    confidence: pattern.confidence,
                    evidence: match[0].trim().slice(0, 100),
                });
                break;
            }
        }
    }
    return results;
}
/**
 * Get all stored preferences for injection into force_recall.
 */
function getStoredPreferences(memoryStore) {
    // Search for preference-tagged memories
    try {
        const results = memoryStore.searchFTS('preference', 10);
        const prefs = results.filter(r => r.memory.tags?.includes('preference') || r.memory.type === 'CONVENTION');
        if (prefs.length === 0)
            return '';
        const lines = ['## 👤 User Preferences'];
        for (const p of prefs.slice(0, 5)) {
            lines.push(`- ${p.memory.intent}`);
        }
        return lines.join('\n');
    }
    catch {
        return '';
    }
}
//# sourceMappingURL=preference-learner.js.map