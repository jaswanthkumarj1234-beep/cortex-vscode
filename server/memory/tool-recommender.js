"use strict";
/**
 * Tool Recommender — Suggests which Cortex tools to use based on context.
 *
 * THE GAP THIS FILLS:
 * The AI has 20 tools but often doesn't know WHEN to use which.
 * This module analyzes the current situation and recommends the right tools.
 *
 * Like a flight checklist: "Before takeoff: check instruments, fuel, clearance."
 * Here: "Before editing auth.ts: run pre_check, check_impact, verify_code."
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.recommendTools = recommendTools;
exports.formatRecommendations = formatRecommendations;
/**
 * Recommend tools based on what the user is doing.
 */
function recommendTools(context) {
    const recommendations = [];
    // ─── New conversation? Always force_recall first ────────────────
    if (context.isNewConversation) {
        recommendations.push({
            tool: 'force_recall',
            reason: 'Start of conversation — load all context (corrections, decisions, conventions)',
            priority: 'must',
        });
    }
    // ─── About to edit a file? Pre-check it ────────────────────────
    if (context.currentFile) {
        recommendations.push({
            tool: 'pre_check',
            reason: `Check conventions, gotchas, and past bugs for ${context.currentFile}`,
            priority: 'should',
        });
        recommendations.push({
            tool: 'check_impact',
            reason: `See what depends on ${context.currentFile} before changing it`,
            priority: 'should',
        });
    }
    // ─── Topic suggests specific tools ─────────────────────────────
    if (context.topic) {
        const lower = context.topic.toLowerCase();
        if (lower.includes('debug') || lower.includes('error') || lower.includes('bug') || lower.includes('fix')) {
            recommendations.push({
                tool: 'recall_memory',
                reason: 'Search for similar past bugs and failed attempts',
                priority: 'must',
            });
        }
        if (lower.includes('review') || lower.includes('check')) {
            recommendations.push({
                tool: 'review_code',
                reason: 'Review against stored conventions and past bug patterns',
                priority: 'should',
            });
        }
        if (lower.includes('new') || lower.includes('create') || lower.includes('build') || lower.includes('add')) {
            recommendations.push({
                tool: 'scan_project',
                reason: 'Ensure project context is loaded before building new features',
                priority: 'could',
            });
        }
        if (lower.includes('import') || lower.includes('package') || lower.includes('dependency')) {
            recommendations.push({
                tool: 'verify_code',
                reason: 'Check if imports are valid and packages exist',
                priority: 'must',
            });
        }
        if (lower.includes('where') || lower.includes('left off') || lower.includes('continue') || lower.includes('resume')) {
            recommendations.push({
                tool: 'resume_work',
                reason: 'Recover context from previous session',
                priority: 'must',
            });
        }
    }
    // ─── After making changes ──────────────────────────────────────
    if (context.recentAction === 'code_written') {
        recommendations.push({
            tool: 'auto_learn',
            reason: 'Store decisions and patterns from this response',
            priority: 'must',
        });
        recommendations.push({
            tool: 'verify_code',
            reason: 'Verify imports and exports in the code you just wrote',
            priority: 'should',
        });
    }
    // Deduplicate by tool name, keeping highest priority
    const seen = new Map();
    const priorityOrder = { must: 0, should: 1, could: 2 };
    for (const rec of recommendations) {
        const existing = seen.get(rec.tool);
        if (!existing || priorityOrder[rec.priority] < priorityOrder[existing.priority]) {
            seen.set(rec.tool, rec);
        }
    }
    return [...seen.values()].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}
/**
 * Format tool recommendations for injection.
 */
function formatRecommendations(recs) {
    if (recs.length === 0)
        return '';
    const lines = ['## 🛠️ Recommended Tools'];
    for (const rec of recs) {
        const badge = rec.priority === 'must' ? '🔴' : rec.priority === 'should' ? '🟡' : '🟢';
        lines.push(`- ${badge} **${rec.tool}** — ${rec.reason}`);
    }
    return lines.join('\n');
}
//# sourceMappingURL=tool-recommender.js.map