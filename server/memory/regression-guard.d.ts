/**
 * Regression Guard — Stores verification steps alongside bug fixes.
 *
 * THE GAP THIS FILLS:
 * When a bug is fixed, the AI stores WHAT was fixed but not HOW to verify
 * it didn't regress. Next time a similar issue appears, the AI has to
 * figure out testing from scratch.
 *
 * This module:
 * 1. Attaches verification steps to BUG_FIX memories
 * 2. When a similar bug appears, surfaces both the fix AND the test
 * 3. Tracks which fixes have been verified vs unverified
 */
import { MemoryStore } from '../db/memory-store';
export interface VerificationStep {
    command?: string;
    check?: string;
    file?: string;
}
/**
 * Extract verification steps from AI text.
 * Looks for build/test commands and their expected outcomes.
 */
export declare function extractVerificationSteps(text: string): VerificationStep[];
/**
 * Find verification steps for similar past bugs.
 * When a new bug appears, search for related fixes and their verification.
 */
export declare function findRelatedVerification(memoryStore: MemoryStore, bugDescription: string): string[];
/**
 * Attach verification steps to a bug fix description.
 * Returns enhanced text with verification section appended.
 */
export declare function attachVerification(fixDescription: string, steps: VerificationStep[]): string;
//# sourceMappingURL=regression-guard.d.ts.map