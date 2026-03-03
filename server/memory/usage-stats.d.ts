/**
 * Usage Stats — Tracks Cortex usage metrics for impact visibility.
 *
 * THE KEY TO ADDICTION: Users must SEE the value Cortex provides.
 * Every force_recall response now ends with a stats footer showing:
 *   - "Cortex Saved You X times"
 *   - "Brain Health: 87/100"
 *   - Time saved estimate
 *   - Memory milestones
 *
 * Stats are PERSISTED in the database so they survive restarts.
 */
import { MemoryStore } from '../db/memory-store';
declare const lifetimeStats: {
    totalRecalls: number;
    totalMemoriesServed: number;
    totalHallucationsCaught: number;
    totalMemoriesStored: number;
    totalSessions: number;
    savedYouCount: number;
    totalAutoLearns: number;
    totalMilestonesHit: number;
    firstUsed: number;
    currentStreak: number;
    longestStreak: number;
    lastActiveDate: string;
    totalSuccessPatterns: number;
    totalErrorsLearned: number;
};
/** Record a recall event */
export declare function trackRecall(memoriesReturned: number): void;
/** Record a memory store event — checks for milestones */
export declare function trackStore(): string;
/** Record a hallucination catch — this is a "saved you" moment */
export declare function trackCatch(): void;
/** Record a "saved you" moment (correction recalled → mistake prevented) */
export declare function trackSaved(): void;
/** Record a scan */
export declare function trackScan(): void;
/** Record a code review */
export declare function trackReview(): void;
/** Record an auto_learn */
export declare function trackAutoLearn(): void;
/** Record a success pattern learned */
export declare function trackSuccess(): void;
/** Record an error pattern learned */
export declare function trackErrorLearned(): void;
/** Get streak display string */
export declare function getStreakDisplay(): string;
export declare function getTipOfTheDay(memoryStore: MemoryStore): string;
export declare function calculateBrainHealth(memoryStore: MemoryStore): {
    score: number;
    grade: string;
    tips: string[];
};
export declare function estimateTimeSaved(): {
    seconds: number;
    formatted: string;
};
export declare function formatStatsFooter(memoryStore?: MemoryStore): string;
export declare function getUsageStats(): {
    session: {
        recallCount: number;
        memoriesServed: number;
        hallucationsCaught: number;
        memoriesStored: number;
        projectsScanned: number;
        codeReviews: number;
        sessionStart: number;
    };
    lifetime: {
        totalRecalls: number;
        totalMemoriesServed: number;
        totalHallucationsCaught: number;
        totalMemoriesStored: number;
        totalSessions: number;
        savedYouCount: number;
        totalAutoLearns: number;
        totalMilestonesHit: number;
        firstUsed: number;
        currentStreak: number;
        longestStreak: number;
        lastActiveDate: string;
        totalSuccessPatterns: number;
        totalErrorsLearned: number;
    };
    timeSaved: {
        seconds: number;
        formatted: string;
    };
};
export declare function resetSessionStats(): void;
/** Initialize lifetime stats from stored data */
export declare function initLifetimeStats(stored: Partial<typeof lifetimeStats>): void;
/** Get raw lifetime stats for persistence */
export declare function getLifetimeStats(): typeof lifetimeStats;
export {};
//# sourceMappingURL=usage-stats.d.ts.map