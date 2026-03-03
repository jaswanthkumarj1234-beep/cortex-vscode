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
export interface DetectedCorrection {
    original: string;
    corrected: string;
    fullContext: string;
    confidence: number;
    source: 'user_correction' | 'ai_acknowledgment';
}
/**
 * Detect corrections from user context text.
 * Call this when auto_learn receives context about what the user said.
 */
export declare function detectUserCorrections(userText: string): DetectedCorrection[];
/**
 * Detect when the AI acknowledges a mistake in its own response.
 * Call this from auto_learn on the AI's response text.
 */
export declare function detectAIAcknowledgments(aiText: string): DetectedCorrection[];
//# sourceMappingURL=correction-detector.d.ts.map