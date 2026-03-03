"use strict";
/**
 * Auto-Learner — Extracts memory-worthy patterns from text automatically.
 *
 * How it works:
 * 1. The AI passes its response text to `auto_learn` tool after every reply
 * 2. This module scans for decision/correction/convention/bug-fix patterns
 * 3. Matching patterns are stored automatically — zero manual effort
 *
 * Pattern detection uses keyword signals + sentence structure analysis.
 * No LLM needed — pure regex + heuristics, fast and reliable.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractMemories = extractMemories;
// ─── Signal Patterns ──────────────────────────────────────────────────────────
const PATTERNS = [
    // CORRECTION — "don't use X", "never do Y", "avoid Z", "wrong approach"
    {
        type: 'CORRECTION',
        signals: [
            /\b(don'?t|do not|never|avoid|stop using|instead of|rather than)\b.{5,80}/gi,
            /\b(wrong|incorrect|mistake|bug|error|issue|problem)\b.{5,60}(fix|correct|should|use|replace)/gi,
            /\b(fixed|corrected|resolved)\b.{5,60}/gi,
            /\b(should have|should've|that was wrong|my bad|oops|actually no)\b.{5,80}/gi,
            /\b(I was wrong|we were wrong|that's not right|not correct)\b.{5,60}/gi,
            /\b(better approach|better way|improved by|changed to)\b.{5,80}/gi,
        ],
        confidence: 0.75,
        reason: 'Auto-detected correction pattern',
    },
    // DECISION — "we decided", "I used", "going with", "chosen"
    {
        type: 'DECISION',
        signals: [
            /\b((?:we|I)('ll| will| are going to| decided to| have decided)?)\s+(use|adopt|switch|go with|choose|pick|implement)\b.{5,80}/gi,
            /\b((?:we|I)\s+(?:used|chose|picked|adopted|switched to|went with|opted for))\b.{5,80}/gi,
            /\b(decided|chosen|selected|picked|going with|sticking with)\b.{5,80}/gi,
            /\b(use|using)\s+\w+\s+(instead of|over|rather than)\s+\w+/gi,
            /\b(chose|opted for|went with|settled on|landed on)\b.{5,80}/gi,
            /\b(changed? from|switch(ed|ing) from|migrat(ed|ing) from)\b.{5,80}/gi,
            /\b(the plan is|approach is|strategy is|our approach)\b.{5,80}/gi,
        ],
        confidence: 0.78,
        reason: 'Auto-detected decision pattern',
    },
    // CONVENTION (specific) — high confidence, specific phrases
    {
        type: 'CONVENTION',
        signals: [
            /\b(best practice|recommended|idiomatic|canonical|proper way)\b.{5,80}/gi,
            /\b(we always|our convention|preferred way|house rule|team rule)\b.{5,80}/gi,
            /\b(in this (project|codebase|repo)|across the (project|codebase))\b.{5,80}/gi,
        ],
        confidence: 0.85,
        reason: 'Auto-detected convention pattern (specific)',
    },
    // CONVENTION (generic) — lower confidence
    {
        type: 'CONVENTION',
        signals: [
            /\b(always|must|should always|make sure to|remember to|convention|standard|rule)\b.{5,80}/gi,
            /\b(format|naming|style|pattern|structure)\b.{5,60}(should|must|always|use)/gi,
            /\b(use\s+\w+\s+for\s+all|every\s+\w+\s+should|all\s+\w+\s+must)\b.{5,60}/gi,
        ],
        confidence: 0.65,
        reason: 'Auto-detected convention pattern',
    },
    // BUG_FIX — "the bug was", "root cause", "the fix is", "was causing"
    {
        type: 'BUG_FIX',
        signals: [
            /\b(bug|the (issue|problem|cause) was|root cause|was causing|the fix)\b.{5,80}/gi,
            /\b(fixed by|resolved by|the solution (is|was))\b.{5,80}/gi,
            /\b(crash|exception|error|fail(ed|ure)?)\b.{5,60}(because|due to|caused by|fixed)/gi,
            /\b(the fix was|worked after|the trick was|solved by)\b.{5,80}/gi,
            /\b(turns out|it was because|the real issue)\b.{5,80}/gi,
            /\b(workaround|hack|temporary fix|quick fix)\b.{5,80}/gi,
        ],
        confidence: 0.80,
        reason: 'Auto-detected bug fix pattern',
    },
    // INSIGHT (specific) — high confidence, clear phrases
    {
        type: 'INSIGHT',
        signals: [
            /\b(for future reference|next time|in the future)\b.{5,80}/gi,
            /\b(learned that|realized|discovered|found out|it turns out)\b.{5,80}/gi,
            /\b(the key is|the secret is|the trick is|pro tip)\b.{5,80}/gi,
            /\b(interestingly|surprisingly|counterintuitively|unexpectedly)\b.{5,80}/gi,
        ],
        confidence: 0.85,
        reason: 'Auto-detected insight pattern (specific)',
    },
    // INSIGHT (generic) — lower confidence
    {
        type: 'INSIGHT',
        signals: [
            /\b(key insight|important(ly)?|worth (noting|remembering)|note that|keep in mind)\b.{5,80}/gi,
            /\b(the reason (is|why)|this (works|happens) because)\b.{5,80}/gi,
        ],
        confidence: 0.55,
        reason: 'Auto-detected insight pattern',
    },
    // ─── NEW PATTERNS ─────────────────────────────────────────────────
    // FAILED_ATTEMPT — "didn't work", "tried X but", "doesn't solve", "abandoned"
    {
        type: 'FAILED_ATTEMPT',
        signals: [
            /\b(didn'?t work|does(n'?t| not) work|failed|not working|broken)\b.{5,80}/gi,
            /\btried\b.{3,60}\b(but|however|didn'?t|failed|abandoned|gave up)\b/gi,
            /\b(abandoned|scrapped|reverted|rolled back|gave up on)\b.{5,80}/gi,
            /\b(doesn'?t solve|won'?t fix|not the (right|correct) approach)\b.{5,80}/gi,
        ],
        confidence: 0.75,
        reason: 'Auto-detected failed attempt — prevents repeating dead ends',
    },
    // BUSINESS_RULE — "users can", "admins have", "when X then Y", domain logic
    {
        type: 'BUSINESS_RULE',
        signals: [
            /\b(users?|admins?|editors?|viewers?|customers?|clients?|members?)\s+(can|cannot|must|should|have|are allowed|are not allowed)\b.{5,80}/gi,
            /\b(role|permission|access|authorization)\b.{5,60}\b(admin|editor|viewer|owner|manager|user)\b/gi,
            /\bwhen\s+.{5,40}\s+(then|must|should|always|never)\b.{5,60}/gi,
            /\b(business rule|domain rule|requirement|constraint)\b.{3,80}/gi,
            /\b(only\s+(admins?|owners?|managers?)\s+can)\b.{5,60}/gi,
        ],
        confidence: 0.70,
        reason: 'Auto-detected business rule / domain logic',
    },
    // GOTCHA — "be careful", "watch out", "NEVER do X on Y", "dangerous"
    {
        type: 'GOTCHA',
        signals: [
            /\b(be careful|watch out|careful with|danger(ous)?|warning|caution)\b.{5,80}/gi,
            /\bNEVER\b.{5,80}/g, // uppercase NEVER = strong warning
            /\b(will (break|crash|delete|corrupt|destroy))\b.{5,60}/gi,
            /\b(cascad(e|ing) delete|data loss|side effect|race condition)\b.{5,60}/gi,
            /\b(gotcha|pitfall|trap|footgun|sharp edge)\b.{5,60}/gi,
        ],
        confidence: 0.80,
        reason: 'Auto-detected gotcha/warning — prevents dangerous operations',
    },
    // CURRENT_TASK — "working on", "current priority", "this week", "next step"
    {
        type: 'CURRENT_TASK',
        signals: [
            /\b(working on|building|implementing|focusing on)\b.{5,80}/gi,
            /\b(current(ly)?|right now|this (week|sprint|phase))\b.{5,60}\b(priority|focus|task|goal)\b/gi,
            /\b(priority is|main (goal|task|focus) is)\b.{5,80}/gi,
            /\b(next step|todo|to-do|need to (build|implement|fix|add))\b.{5,80}/gi,
        ],
        confidence: 0.60,
        reason: 'Auto-detected current task / priority',
    },
    // IMPLICIT DECISION — "let's go with", "I'll use", "we're using", "going to use"
    {
        type: 'DECISION',
        signals: [
            /\b(let'?s (go with|use|try|do|build|implement))\b.{5,80}/gi,
            /\b(I'?ll (use|go with|try|implement|build|create|set up))\b.{5,80}/gi,
            /\b(we'?re (using|going with|building with|switching to))\b.{5,80}/gi,
            /\b(going to use|plan to use|want to use)\b.{5,80}/gi,
            /\b(set up|configured|installed)\s+\w+\s+(for|as|to handle)\b.{5,60}/gi,
        ],
        confidence: 0.68,
        reason: 'Auto-detected implicit decision',
    },
    // COMPARISON — "X works better than Y", "X is faster", "prefer X over Y"
    {
        type: 'DECISION',
        signals: [
            /\b\w+\s+(works? better|is (better|faster|simpler|cleaner|safer)|outperforms?)\s+(than\s+)?\w+/gi,
            /\b(prefer|recommend)\s+\w+\s+(over|instead of|rather than)\s+\w+/gi,
            /\b(X|the|this)\s+(approach|solution|method|pattern)\s+is\s+(better|worse|simpler|faster)/gi,
            /\b(more (reliable|scalable|maintainable|readable|performant))\b.{5,60}/gi,
        ],
        confidence: 0.65,
        reason: 'Auto-detected comparison / preference',
    },
    // PREFERENCE — "I like", "I want", "please always", user style preferences
    {
        type: 'CONVENTION',
        signals: [
            /\b(I (like|want|prefer|need) (you to|it to|the))\b.{5,80}/gi,
            /\b(please (always|never|don'?t|make sure))\b.{5,80}/gi,
            /\b(be more (concise|verbose|detailed|careful|specific))\b.{5,60}/gi,
            /\b(I don'?t (like|want|need))\b.{5,80}/gi,
            /\b(from now on|going forward|in the future)\b.{5,80}/gi,
        ],
        confidence: 0.72,
        reason: 'Auto-detected user preference',
    },
    // ENVIRONMENT — "runs on", "deployed to", "uses port", config knowledge
    {
        type: 'INSIGHT',
        signals: [
            /\b(runs? on|deployed to|hosted on|hosted at)\b.{5,80}/gi,
            /\b(port\s+\d+|localhost:\d+|\.env)\b.{5,60}/gi,
            /\b(database is|DB is|using\s+(postgres|mysql|mongo|redis|sqlite))\b.{5,80}/gi,
            /\b(API (key|token|secret|endpoint) is)\b.{5,60}/gi,
            /\b(production|staging|development)\s+(server|environment|URL|database)\b.{5,60}/gi,
        ],
        confidence: 0.70,
        reason: 'Auto-detected environment/config knowledge',
    },
    // ARCHITECTURE — "X calls Y", "X depends on", "flow is", structure knowledge
    {
        type: 'INSIGHT',
        signals: [
            /\b(depends? on|imports? from|calls?|wraps?|extends?|inherits? from)\b.{5,80}/gi,
            /\b(the flow is|data flows?|pipeline is|architecture is)\b.{5,80}/gi,
            /\b(entry point|main file|bootstrap|initialization)\b.{5,60}/gi,
            /\b(this (file|module|component|service) (handles?|manages?|is responsible))\b.{5,80}/gi,
            /\b(layer|tier|service|controller|middleware|handler)\s+(for|handles?|processes?)\b.{5,60}/gi,
        ],
        confidence: 0.60,
        reason: 'Auto-detected architecture knowledge',
    },
    // ERROR FINGERPRINT — captures error codes, stack traces, error messages for recall
    {
        type: 'BUG_FIX',
        signals: [
            /\b(Error|TypeError|ReferenceError|SyntaxError|RangeError):\s*.{10,100}/gi,
            /\b(ERR_|ENOENT|EACCES|ECONNREFUSED|EPERM|EISDIR)\b.{5,80}/gi,
            /\b(HTTP\s*(4\d\d|5\d\d))\b.{5,80}/gi,
            /\b(npm ERR|build failed|compilation error|test failed)\b.{5,80}/gi,
            /\b(stack trace|at\s+\w+\s+\()/gi,
            /\b(exit code\s*[1-9]|process exited|segfault|out of memory)\b.{5,60}/gi,
            /\b(cannot find module|module not found|import error|no such file)\b.{5,80}/gi,
        ],
        confidence: 0.82,
        reason: 'Auto-detected error fingerprint — enables instant fix recall when same error recurs',
    },
];
// ─── Sentence Splitter ────────────────────────────────────────────────────────
function splitSentences(text) {
    // CRITICAL FIX: Split on BOTH sentence boundaries AND newlines/bullets
    // AI responses use markdown bullets (- ), numbered lists (1. ), and newlines
    // — not just periods. Without this, markdown bullets merge into one giant
    // sentence and only the strongest pattern fires.
    return text
        .replace(/```[\s\S]*?```/g, '') // Strip code blocks (don't learn from code)
        .replace(/`[^`]+`/g, '') // Strip inline code
        .split(/\n+/) // Split on newlines FIRST
        .flatMap(line => {
        // Strip markdown bullet prefixes: "- ", "* ", "1. ", "> "
        const cleaned = line.replace(/^\s*[-*>]\s+/, '').replace(/^\s*\d+\.\s+/, '').trim();
        // Then split remaining on sentence boundaries
        return cleaned.split(/(?<=[.!?])\s+/);
    })
        .map(s => s.trim())
        .filter(s => s.length > 20 && s.length < 300);
}
// ─── Dedup Filter ─────────────────────────────────────────────────────────────
function normalize(text) {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}
// ─── Main Extractor ───────────────────────────────────────────────────────────
function extractMemories(text) {
    if (!text || text.length < 30)
        return [];
    const sentences = splitSentences(text);
    const results = [];
    const seen = new Set();
    for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        // Collect ALL matching patterns for this sentence
        const candidates = [];
        for (const pattern of PATTERNS) {
            let matched = false;
            for (const signal of pattern.signals) {
                signal.lastIndex = 0; // reset regex state
                if (signal.test(sentence)) {
                    matched = true;
                    break;
                }
            }
            if (matched) {
                candidates.push({ pattern });
            }
        }
        if (candidates.length === 0)
            continue;
        // Pick the highest-confidence match (most specific wins)
        candidates.sort((a, b) => b.pattern.confidence - a.pattern.confidence);
        const best = candidates[0].pattern;
        // Clean up the sentence for storage
        const content = sentence
            .replace(/^(so|and|but|also|note that|remember that|keep in mind that)\s+/i, '')
            .replace(/\s+/g, ' ')
            .trim();
        if (content.length < 15)
            continue;
        // Dedup by normalized content
        const key = `${best.type}:${normalize(content).slice(0, 60)}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        // --- NEW: Extract real reasoning from context ---
        const reason = extractReason(sentence, sentences, i) || best.reason;
        results.push({
            type: best.type,
            content,
            confidence: best.confidence,
            reason,
        });
    }
    // Return only high-confidence matches (avoid noise)
    return results.filter(r => r.confidence >= 0.55);
}
/**
 * Extract the REAL reason from context — looks for "because", "since", "due to" etc.
 * If the reason clause is in the same sentence, extract it.
 * If it's in the next sentence, grab that as context.
 */
function extractReason(sentence, allSentences, index) {
    // Check for inline reasoning: "X because Y", "X since Y", "X due to Y"
    const reasonPatterns = [
        /\b(?:because|since|as)\s+(.{10,120})/i,
        /\b(?:due to|caused by|in order to|so that)\s+(.{10,100})/i,
        /\b(?:the reason (?:is|was|being))\s+(.{10,100})/i,
        /\b(?:this (?:is|was) (?:because|needed|required|necessary))\s+(.{10,100})/i,
    ];
    for (const pat of reasonPatterns) {
        const match = sentence.match(pat);
        if (match && match[1]) {
            return match[1].replace(/\s+/g, ' ').trim().slice(0, 120);
        }
    }
    // Check next sentence for reasoning context
    if (index + 1 < allSentences.length) {
        const next = allSentences[index + 1];
        if (/^(because|since|this is because|the reason|due to|otherwise)/i.test(next.trim())) {
            return next.trim().slice(0, 120);
        }
    }
    return null;
}
//# sourceMappingURL=auto-learner.js.map