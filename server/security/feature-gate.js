"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFeatureLimits = getFeatureLimits;
exports.isFeatureAllowed = isFeatureAllowed;
exports.canStoreMemory = canStoreMemory;
exports.getUpgradeMessage = getUpgradeMessage;
exports.formatPlanStatus = formatPlanStatus;
/**
 * Feature Gate — Enforces free/trial/paid limits based on license.
 *
 * LAUNCH MODE: All features unlocked for everyone!
 * When ready to add pricing, revert FREE_LIMITS to restricted values.
 *
 * TRIAL plan: Same as PRO for 7 days after sign-up.
 * PRO plan:   Everything unlocked, unlimited.
 */
const license_1 = require("./license");
const DASHBOARD_URL = `${process.env.CORTEX_API_URL || 'https://cortex-ai-iota.vercel.app'}/dashboard`;
// LAUNCH MODE — All features unlocked for free users
// To re-enable limits later, change these values back to restricted ones
const FREE_LIMITS = {
    maxMemories: Infinity,
    brainLayers: true,
    autoLearn: true,
    exportMap: true,
    architectureGraph: true,
    gitMemory: true,
    contradictionDetection: true,
    confidenceDecay: true,
    memoryConsolidation: true,
    attentionRanking: true,
    anticipation: true,
    knowledgeGaps: true,
    temporalContext: true,
    crossSessionThreading: true,
};
const PRO_LIMITS = {
    maxMemories: Infinity,
    brainLayers: true,
    autoLearn: true,
    exportMap: true,
    architectureGraph: true,
    gitMemory: true,
    contradictionDetection: true,
    confidenceDecay: true,
    memoryConsolidation: true,
    attentionRanking: true,
    anticipation: true,
    knowledgeGaps: true,
    temporalContext: true,
    crossSessionThreading: true,
};
// Trial gets same limits as PRO
const TRIAL_LIMITS = { ...PRO_LIMITS };
/** Get current feature limits based on license */
function getFeatureLimits() {
    const license = (0, license_1.getLicense)();
    if (license.plan === 'PRO')
        return PRO_LIMITS;
    if (license.plan === 'TRIAL')
        return TRIAL_LIMITS;
    return FREE_LIMITS;
}
/** Check if a specific feature is allowed */
function isFeatureAllowed(feature) {
    const limits = getFeatureLimits();
    const value = limits[feature];
    if (typeof value === 'boolean')
        return value;
    return true; // numeric limits are checked separately
}
/** Check if user can store more memories */
function canStoreMemory(currentCount) {
    const limits = getFeatureLimits();
    if (currentCount >= limits.maxMemories) {
        return {
            allowed: false,
            message: `[LOCKED] Free plan limit: ${limits.maxMemories} memories. Upgrade to PRO for unlimited. Visit ${DASHBOARD_URL}`,
        };
    }
    return { allowed: true, message: '' };
}
/** Get upgrade message for gated features */
function getUpgradeMessage(feature) {
    return `[LOCKED] "${feature}" is a PRO feature. Upgrade at ${DASHBOARD_URL} or set CORTEX_LICENSE_KEY to unlock.`;
}
/** Format plan status for display */
function formatPlanStatus() {
    const license = (0, license_1.getLicense)();
    const _limits = getFeatureLimits();
    if (license.plan === 'PRO') {
        return `[PRO] Cortex PRO — All features unlocked, unlimited memories.`;
    }
    if (license.plan === 'TRIAL') {
        const trialMsg = (0, license_1.getTrialStatus)();
        return `[TRIAL] Cortex Trial — All PRO features active. ${trialMsg || ''}`;
    }
    return `[FREE] Cortex — All features unlocked. Launch edition 🚀`;
}
//# sourceMappingURL=feature-gate.js.map