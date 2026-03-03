/**
 * Pre-Flight Checks — Convention check BEFORE writing code.
 *
 * Instead of reviewing code AFTER it's written (review_code),
 * this tells the AI what conventions and gotchas exist for a file/task
 * BEFORE a single line is written.
 *
 * Like a pilot's pre-flight checklist — don't take off without checking.
 */
import { MemoryStore } from '../db/memory-store';
export interface PreFlightResult {
    conventions: string[];
    gotchas: string[];
    pastBugs: string[];
    fileNotes: string[];
    recentCorrections: string[];
}
/**
 * Get everything the AI needs to know BEFORE writing/editing code for a file.
 */
export declare function preFlightCheck(memoryStore: MemoryStore, filename?: string, task?: string): PreFlightResult;
/** Format pre-flight results for AI consumption */
export declare function formatPreFlight(result: PreFlightResult): string;
//# sourceMappingURL=pre-flight.d.ts.map