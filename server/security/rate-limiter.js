"use strict";
/**
 * Rate Limiter — Prevents unbounded memory storage per session.
 *
 * Limits:
 * - Max 30 memories stored per session (resets on server restart)
 * - Max 100 auto_learn calls per session
 * - Max 500 total tool calls per session
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRateLimit = checkRateLimit;
exports.getRateLimitStats = getRateLimitStats;
exports.resetRateLimits = resetRateLimits;
const LIMITS = {
    MAX_STORES_PER_SESSION: 30,
    MAX_AUTO_LEARN_PER_SESSION: 100,
    MAX_CALLS_PER_SESSION: 500,
};
let state = {
    storeCount: 0,
    autoLearnCount: 0,
    totalCalls: 0,
    sessionStart: Date.now(),
};
function checkRateLimit(operation) {
    state.totalCalls++;
    if (state.totalCalls > LIMITS.MAX_CALLS_PER_SESSION) {
        return { allowed: false, reason: `Session limit reached (${LIMITS.MAX_CALLS_PER_SESSION} total calls). Restart server to reset.` };
    }
    if (operation === 'store') {
        state.storeCount++;
        if (state.storeCount > LIMITS.MAX_STORES_PER_SESSION) {
            return { allowed: false, reason: `Memory store limit reached (${LIMITS.MAX_STORES_PER_SESSION}/session). Prevents DB bloat.` };
        }
    }
    if (operation === 'auto_learn') {
        state.autoLearnCount++;
        if (state.autoLearnCount > LIMITS.MAX_AUTO_LEARN_PER_SESSION) {
            return { allowed: false, reason: `Auto-learn limit reached (${LIMITS.MAX_AUTO_LEARN_PER_SESSION}/session).` };
        }
    }
    return { allowed: true };
}
function getRateLimitStats() {
    return {
        storeCount: state.storeCount,
        autoLearnCount: state.autoLearnCount,
        totalCalls: state.totalCalls,
        uptime: Math.floor((Date.now() - state.sessionStart) / 1000),
    };
}
function resetRateLimits() {
    state = {
        storeCount: 0,
        autoLearnCount: 0,
        totalCalls: 0,
        sessionStart: Date.now(),
    };
}
//# sourceMappingURL=rate-limiter.js.map