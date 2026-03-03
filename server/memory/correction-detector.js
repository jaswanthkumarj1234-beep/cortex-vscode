"use strict";
/**
 * Correction Detector — Catches user corrections automatically.
 *
 * The #1 gap in Cortex: when a user says "no, use X instead of Y",
 * that correction is LOST when the conversation ends.
 *
 * This module scans text (both AI responses and user context) for
 * correction patterns and auto-stores them as high-importance CORRECTION memories.
 *
 * Examples it catches:
 * - "no, use vectors not vectorCache"
 * - "that's wrong, it should be const"
 * - "actually the file is in src/db/"
 * - "I meant to use path.join"
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectUserCorrections = detectUserCorrections;
exports.detectAIAcknowledgments = detectAIAcknowledgments;
// ─── Correction Patterns ─────────────────────────────────────────────────────
const USER_CORRECTION_PATTERNS = [
    // "no, use X not Y" / "no use X instead of Y"
    {
        regex: /\bno[,.]?\s+(use|it'?s|it should be|should be|change to|switch to)\s+(.{3,50}?)(?:\s+(?:not|instead of|rather than)\s+(.{3,50}))?[.!]?\s*$/gim,
        extractGroups: (m) => ({ corrected: m[2]?.trim(), original: m[3]?.trim() }),
        confidence: 0.90,
    },
    // "that's wrong" / "that's incorrect" / "that's not right"
    {
        regex: /\b(that'?s|this is)\s+(wrong|incorrect|not right|not correct|a mistake)\b.{0,80}/gi,
        extractGroups: () => ({}),
        confidence: 0.85,
    },
    // "actually, X" / "actually it should be X"
    {
        regex: /\bactually[,.]?\s+(it\s+)?(should be|is|use|the\s+\w+\s+is)\s+(.{5,80})/gi,
        extractGroups: (m) => ({ corrected: m[3]?.trim() }),
        confidence: 0.80,
    },
    // "I meant X" / "I mean X"
    {
        regex: /\bI\s+mean[t]?\s+(.{5,80})/gi,
        extractGroups: (m) => ({ corrected: m[1]?.trim() }),
        confidence: 0.75,
    },
    // "not X, but Y" / "not X, Y"
    {
        regex: /\bnot\s+(.{3,40}?)[,]\s*(but\s+)?(.{3,40})/gi,
        extractGroups: (m) => ({ original: m[1]?.trim(), corrected: m[3]?.trim() }),
        confidence: 0.70,
    },
    // "X is wrong" / "X is incorrect"
    {
        regex: /\b(.{5,40})\s+is\s+(wrong|incorrect|broken|outdated|deprecated)/gi,
        extractGroups: (m) => ({ original: m[1]?.trim() }),
        confidence: 0.75,
    },
];
// AI acknowledgment patterns — when the AI itself admits a mistake
const AI_ACKNOWLEDGMENT_PATTERNS = [
    { regex: /\b(I apologize|sorry|my mistake|my bad|you'?re right|good catch)\b/gi, confidence: 0.85 },
    { regex: /\b(let me fix that|let me correct|I was wrong|I made an error)\b/gi, confidence: 0.90 },
    { regex: /\b(should have (used|been|done)|instead of .{3,30} I should)\b/gi, confidence: 0.85 },
    { regex: /\b(the (correct|right|actual|proper) (way|approach|method|answer) is)\b/gi, confidence: 0.80 },
];
// ─── Main Detector ───────────────────────────────────────────────────────────
/**
 * Detect corrections from user context text.
 * Call this when auto_learn receives context about what the user said.
 */
function detectUserCorrections(userText) {
    if (!userText || userText.length < 10)
        return [];
    const results = [];
    const sentences = splitIntoSentences(userText);
    for (const sentence of sentences) {
        for (const pattern of USER_CORRECTION_PATTERNS) {
            pattern.regex.lastIndex = 0;
            const match = pattern.regex.exec(sentence);
            if (match) {
                const groups = pattern.extractGroups(match);
                results.push({
                    original: groups.original || '',
                    corrected: groups.corrected || '',
                    fullContext: sentence.trim().slice(0, 200),
                    confidence: pattern.confidence,
                    source: 'user_correction',
                });
                break; // One match per sentence
            }
        }
    }
    return results;
}
/**
 * Detect when the AI acknowledges a mistake in its own response.
 * Call this from auto_learn on the AI's response text.
 */
function detectAIAcknowledgments(aiText) {
    if (!aiText || aiText.length < 15)
        return [];
    const results = [];
    const sentences = splitIntoSentences(aiText);
    for (const sentence of sentences) {
        for (const pattern of AI_ACKNOWLEDGMENT_PATTERNS) {
            pattern.regex.lastIndex = 0;
            if (pattern.regex.test(sentence)) {
                results.push({
                    original: '',
                    corrected: '',
                    fullContext: sentence.trim().slice(0, 200),
                    confidence: pattern.confidence,
                    source: 'ai_acknowledgment',
                });
                break;
            }
        }
    }
    return results;
}
// ─── Helper ──────────────────────────────────────────────────────────────────
function splitIntoSentences(text) {
    return text
        .replace(/\n+/g, '. ')
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 8 && s.length < 300);
}
//# sourceMappingURL=correction-detector.js.map