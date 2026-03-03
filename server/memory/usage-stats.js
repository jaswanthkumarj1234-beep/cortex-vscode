"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackRecall = trackRecall;
exports.trackStore = trackStore;
exports.trackCatch = trackCatch;
exports.trackSaved = trackSaved;
exports.trackScan = trackScan;
exports.trackReview = trackReview;
exports.trackAutoLearn = trackAutoLearn;
exports.trackSuccess = trackSuccess;
exports.trackErrorLearned = trackErrorLearned;
exports.getStreakDisplay = getStreakDisplay;
exports.getTipOfTheDay = getTipOfTheDay;
exports.calculateBrainHealth = calculateBrainHealth;
exports.estimateTimeSaved = estimateTimeSaved;
exports.formatStatsFooter = formatStatsFooter;
exports.getUsageStats = getUsageStats;
exports.resetSessionStats = resetSessionStats;
exports.initLifetimeStats = initLifetimeStats;
exports.getLifetimeStats = getLifetimeStats;
// ─── Session Stats (in-memory, per session) ──────────────────────────────────
let sessionStats = {
    recallCount: 0,
    memoriesServed: 0,
    hallucationsCaught: 0,
    memoriesStored: 0,
    projectsScanned: 0,
    codeReviews: 0,
    sessionStart: Date.now(),
};
// ─── Lifetime Stats (persisted via special DB memory) ────────────────────────
const lifetimeStats = {
    totalRecalls: 0,
    totalMemoriesServed: 0,
    totalHallucationsCaught: 0,
    totalMemoriesStored: 0,
    totalSessions: 0,
    savedYouCount: 0,
    totalAutoLearns: 0,
    totalMilestonesHit: 0,
    firstUsed: Date.now(),
    // STREAK TRACKING — "Don't break the chain!"
    currentStreak: 0, // Days in a row Cortex was used
    longestStreak: 0, // Personal best streak
    lastActiveDate: '', // ISO date string 'YYYY-MM-DD'
    totalSuccessPatterns: 0, // Proven approaches tracked
    totalErrorsLearned: 0, // Error patterns captured
};
// ─── Track Events ────────────────────────────────────────────────────────────
/** Record a recall event */
function trackRecall(memoriesReturned) {
    sessionStats.recallCount++;
    sessionStats.memoriesServed += memoriesReturned;
    lifetimeStats.totalRecalls++;
    lifetimeStats.totalMemoriesServed += memoriesReturned;
}
/** Record a memory store event — checks for milestones */
function trackStore() {
    sessionStats.memoriesStored++;
    lifetimeStats.totalMemoriesStored++;
    return checkMilestone(lifetimeStats.totalMemoriesStored, 'memories stored');
}
/** Record a hallucination catch — this is a "saved you" moment */
function trackCatch() {
    sessionStats.hallucationsCaught++;
    lifetimeStats.totalHallucationsCaught++;
    lifetimeStats.savedYouCount++;
}
/** Record a "saved you" moment (correction recalled → mistake prevented) */
function trackSaved() {
    lifetimeStats.savedYouCount++;
}
/** Record a scan */
function trackScan() {
    sessionStats.projectsScanned++;
}
/** Record a code review */
function trackReview() {
    sessionStats.codeReviews++;
}
/** Record an auto_learn */
function trackAutoLearn() {
    lifetimeStats.totalAutoLearns++;
    updateStreak();
}
/** Record a success pattern learned */
function trackSuccess() {
    lifetimeStats.totalSuccessPatterns++;
}
/** Record an error pattern learned */
function trackErrorLearned() {
    lifetimeStats.totalErrorsLearned++;
}
// ─── Daily Streak ────────────────────────────────────────────────────────────
// Users LOVE streaks. "7 day streak! 🔥" makes them come back.
function updateStreak() {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const lastDate = lifetimeStats.lastActiveDate;
    if (lastDate === today)
        return; // Already tracked today
    if (lastDate) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if (lastDate === yesterday) {
            lifetimeStats.currentStreak++;
        }
        else {
            lifetimeStats.currentStreak = 1; // Streak broken
        }
    }
    else {
        lifetimeStats.currentStreak = 1; // First day
    }
    lifetimeStats.lastActiveDate = today;
    if (lifetimeStats.currentStreak > lifetimeStats.longestStreak) {
        lifetimeStats.longestStreak = lifetimeStats.currentStreak;
    }
}
/** Get streak display string */
function getStreakDisplay() {
    const s = lifetimeStats.currentStreak;
    if (s <= 0)
        return '';
    if (s >= 30)
        return `🔥 ${s}-day streak! LEGENDARY!`;
    if (s >= 14)
        return `🔥 ${s}-day streak! On fire!`;
    if (s >= 7)
        return `🔥 ${s}-day streak!`;
    if (s >= 3)
        return `✨ ${s}-day streak`;
    return `Day ${s}`;
}
// ─── Tip of the Day ──────────────────────────────────────────────────────────
// Surface a random useful memory to remind users of past knowledge
function getTipOfTheDay(memoryStore) {
    try {
        const memories = memoryStore.getActive(100);
        const useful = memories.filter(m => ['DECISION', 'CONVENTION', 'BUG_FIX', 'INSIGHT'].includes(m.type) &&
            m.intent && m.intent.length > 20);
        if (useful.length === 0)
            return '';
        // Deterministic daily pick (same tip all day)
        const dayIndex = Math.floor(Date.now() / 86400000) % useful.length;
        const tip = useful[dayIndex];
        return `\n> 💡 **Tip of the day:** [${tip.type}] ${tip.intent}`;
    }
    catch {
        return '';
    }
}
// ─── Brain Health Score ──────────────────────────────────────────────────────
// Composite score 0-100 based on how well Cortex is being used.
// Higher score = more addictive (users want to keep it high)
function calculateBrainHealth(memoryStore) {
    const tips = [];
    let score = 0;
    const activeCount = memoryStore.activeCount();
    // 1. Memory count (0-25 pts) — more memories = healthier brain
    if (activeCount >= 100)
        score += 25;
    else if (activeCount >= 50)
        score += 20;
    else if (activeCount >= 20)
        score += 15;
    else if (activeCount >= 5)
        score += 10;
    else {
        score += Math.min(activeCount * 2, 5);
        tips.push('Store more memories to improve brain health');
    }
    // 2. Memory diversity (0-25 pts) — multiple types = better coverage
    const typeCount = getMemoryTypeDiversity(memoryStore);
    score += Math.min(typeCount * 5, 25);
    if (typeCount < 3)
        tips.push('Add different memory types (decisions, corrections, conventions)');
    // 3. Usage frequency (0-25 pts) — regular use = healthier
    if (lifetimeStats.totalSessions >= 20)
        score += 25;
    else if (lifetimeStats.totalSessions >= 10)
        score += 20;
    else if (lifetimeStats.totalSessions >= 5)
        score += 15;
    else if (lifetimeStats.totalSessions >= 2)
        score += 10;
    else {
        score += lifetimeStats.totalSessions * 5;
        tips.push('Use Cortex regularly — memory quality improves with each session');
    }
    // 4. Auto-learn engagement (0-25 pts) — AI is learning from conversations
    if (lifetimeStats.totalAutoLearns >= 50)
        score += 25;
    else if (lifetimeStats.totalAutoLearns >= 20)
        score += 20;
    else if (lifetimeStats.totalAutoLearns >= 10)
        score += 15;
    else if (lifetimeStats.totalAutoLearns >= 3)
        score += 10;
    else {
        score += lifetimeStats.totalAutoLearns * 3;
        tips.push('Make sure auto_learn is called after every response');
    }
    // Grade
    let grade;
    if (score >= 90)
        grade = '🧠 Genius';
    else if (score >= 75)
        grade = '🔥 Sharp';
    else if (score >= 50)
        grade = '💡 Growing';
    else if (score >= 25)
        grade = '🌱 Seedling';
    else
        grade = '🥚 Newborn';
    return { score: Math.min(score, 100), grade, tips };
}
function getMemoryTypeDiversity(memoryStore) {
    try {
        const memories = memoryStore.getActive(200);
        const types = new Set(memories.map(m => m.type));
        return types.size;
    }
    catch {
        return 1;
    }
}
// ─── Memory Milestones ───────────────────────────────────────────────────────
// Celebrate: 10, 25, 50, 100, 250, 500, 1000, 2500, 5000
const MILESTONES = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
function checkMilestone(count, label) {
    if (MILESTONES.includes(count)) {
        lifetimeStats.totalMilestonesHit++;
        return `\n🎉 **Milestone!** ${count} ${label}! Your AI brain is getting stronger.`;
    }
    return '';
}
// ─── Time Saved ──────────────────────────────────────────────────────────────
function estimateTimeSaved() {
    // Each recalled memory ≈ 15s of re-explanation
    // Each hallucination caught ≈ 5min of debugging
    const recallSeconds = lifetimeStats.totalMemoriesServed * 15;
    const catchSeconds = lifetimeStats.totalHallucationsCaught * 300;
    const totalSeconds = recallSeconds + catchSeconds;
    if (totalSeconds < 60)
        return { seconds: totalSeconds, formatted: `${totalSeconds}s` };
    if (totalSeconds < 3600)
        return { seconds: totalSeconds, formatted: `${Math.round(totalSeconds / 60)} min` };
    return { seconds: totalSeconds, formatted: `${(totalSeconds / 3600).toFixed(1)} hours` };
}
// ─── Stats Footer (shown in every force_recall) ─────────────────────────────
function formatStatsFooter(memoryStore) {
    const parts = [];
    const timeSaved = estimateTimeSaved();
    // "Saved You" counter (the most addictive metric)
    if (lifetimeStats.savedYouCount > 0) {
        parts.push(`🛡️ Saved you ${lifetimeStats.savedYouCount} time${lifetimeStats.savedYouCount > 1 ? 's' : ''}`);
    }
    // Brain Health Score
    if (memoryStore) {
        const health = calculateBrainHealth(memoryStore);
        parts.push(`${health.grade} Brain: ${health.score}/100`);
    }
    // Memories + Time saved
    if (lifetimeStats.totalMemoriesServed > 0) {
        parts.push(`${lifetimeStats.totalMemoriesServed} memories served`);
    }
    if (timeSaved.seconds > 0) {
        parts.push(`~${timeSaved.formatted} saved`);
    }
    // Hallucinations caught
    if (lifetimeStats.totalHallucationsCaught > 0) {
        parts.push(`${lifetimeStats.totalHallucationsCaught} hallucination${lifetimeStats.totalHallucationsCaught > 1 ? 's' : ''} caught`);
    }
    if (parts.length === 0) {
        return '\n> 🧠 Cortex is active — memories will build up as you work.';
    }
    // Add streak
    const streak = getStreakDisplay();
    if (streak)
        parts.push(streak);
    let footer = `\n> 🧠 Cortex: ${parts.join(' | ')}`;
    // Add tip of the day
    if (memoryStore) {
        footer += getTipOfTheDay(memoryStore);
    }
    return footer;
}
// ─── Full Stats ──────────────────────────────────────────────────────────────
function getUsageStats() {
    return {
        session: { ...sessionStats },
        lifetime: { ...lifetimeStats },
        timeSaved: estimateTimeSaved(),
    };
}
// ─── Session Management ──────────────────────────────────────────────────────
function resetSessionStats() {
    lifetimeStats.totalSessions++;
    sessionStats = {
        recallCount: 0,
        memoriesServed: 0,
        hallucationsCaught: 0,
        memoriesStored: 0,
        projectsScanned: 0,
        codeReviews: 0,
        sessionStart: Date.now(),
    };
}
/** Initialize lifetime stats from stored data */
function initLifetimeStats(stored) {
    if (stored.totalRecalls)
        lifetimeStats.totalRecalls = stored.totalRecalls;
    if (stored.totalMemoriesServed)
        lifetimeStats.totalMemoriesServed = stored.totalMemoriesServed;
    if (stored.totalHallucationsCaught)
        lifetimeStats.totalHallucationsCaught = stored.totalHallucationsCaught;
    if (stored.totalMemoriesStored)
        lifetimeStats.totalMemoriesStored = stored.totalMemoriesStored;
    if (stored.totalSessions)
        lifetimeStats.totalSessions = stored.totalSessions;
    if (stored.savedYouCount)
        lifetimeStats.savedYouCount = stored.savedYouCount;
    if (stored.totalAutoLearns)
        lifetimeStats.totalAutoLearns = stored.totalAutoLearns;
    if (stored.totalMilestonesHit)
        lifetimeStats.totalMilestonesHit = stored.totalMilestonesHit;
    if (stored.firstUsed)
        lifetimeStats.firstUsed = stored.firstUsed;
}
/** Get raw lifetime stats for persistence */
function getLifetimeStats() {
    return { ...lifetimeStats };
}
//# sourceMappingURL=usage-stats.js.map