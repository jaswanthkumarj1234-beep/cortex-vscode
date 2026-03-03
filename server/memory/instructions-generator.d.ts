/**
 * Contextual Instructions Generator — Converts raw memories into direct DO/DON'T rules.
 *
 * THE GAP THIS FILLS:
 * Currently, force_recall dumps memories like:
 *   "[CONVENTION] Arrow functions preferred over function declarations"
 * But the AI has to interpret this. What it actually needs is:
 *   "DO: Use arrow functions. DON'T: Use function declarations."
 *
 * This module converts conventions, corrections, and preferences into
 * imperative instructions that the AI can follow without thinking.
 *
 * Like a military briefing: clear, direct, no interpretation needed.
 */
import { MemoryStore } from '../db/memory-store';
export interface InstructionSet {
    dos: string[];
    donts: string[];
    watchOuts: string[];
    style: string[];
}
/**
 * Generate contextual instructions from stored memories.
 */
export declare function generateInstructions(memoryStore: MemoryStore): InstructionSet;
/**
 * Format instructions as a clear, imperative briefing.
 */
export declare function formatInstructions(instructions: InstructionSet): string;
//# sourceMappingURL=instructions-generator.d.ts.map