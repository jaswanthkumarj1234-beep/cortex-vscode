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
export interface SuccessSignal {
    type: 'explicit_praise' | 'implicit_success' | 'task_completion';
    trigger: string;
    confidence: number;
}
/**
 * Detect success signals from user text.
 */
export declare function detectSuccess(text: string): SuccessSignal[];
/**
 * Build a success memory from the signal and the AI's recent response context.
 * The context should describe what approach was used.
 */
export declare function buildSuccessMemory(signal: SuccessSignal, aiContext: string): {
    intent: string;
    reason: string;
    tags: string[];
};
//# sourceMappingURL=success-tracker.d.ts.map