/**
 * Error Learner — Auto-captures build/test error patterns.
 *
 * When build output or test output contains errors, this module:
 * 1. Extracts the error pattern (TS error codes, common messages)
 * 2. Maps to a human-readable lesson ("TS2345: argument type mismatch")
 * 3. Stores as BUG_FIX memory so the AI avoids repeating the same mistake
 *
 * This is the #1 gap: the AI keeps making the same TS compile errors
 * because it forgets what went wrong last time.
 */
export interface ErrorPattern {
    errorType: string;
    message: string;
    file?: string;
    confidence: number;
}
/**
 * Extract error patterns from build/test output text.
 */
export declare function extractErrorPatterns(text: string): ErrorPattern[];
/**
 * Check if text contains build/test error indicators.
 */
export declare function containsErrors(text: string): boolean;
//# sourceMappingURL=error-learner.d.ts.map