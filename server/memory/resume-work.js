"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildResumeContext = buildResumeContext;
exports.formatResumeContext = formatResumeContext;
const session_tracker_1 = require("./session-tracker");
/**
 * Build context for resuming work after a conversation break.
 */
function buildResumeContext(memoryStore) {
    const result = {
        lastSession: null,
        recentMemories: [],
        currentTasks: [],
        recentCorrections: [],
        recentDecisions: [],
    };
    // 1. Get last session summary
    try {
        const sessions = (0, session_tracker_1.getRecentSessions)(memoryStore, 3);
        if (sessions && sessions.length > 0) {
            const last = sessions[0];
            result.lastSession = typeof last === 'string' ? last :
                typeof last === 'object' ? (last.summary || last.topic ||
                    JSON.stringify(last).slice(0, 200)) : String(last);
        }
    }
    catch { /* session tracking might not have data */ }
    // 2. Recent memories (last 24 hours)
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    try {
        const all = memoryStore.getActive(50);
        const recent = all.filter(m => m.timestamp >= dayAgo);
        result.recentMemories = recent.slice(0, 20).map(m => ({
            type: m.type,
            intent: m.intent,
            age: formatAge(m.timestamp),
        }));
    }
    catch { /* */ }
    // 3. Current tasks (CURRENT_TASK type memories)
    try {
        const tasks = memoryStore.getByType('CURRENT_TASK', 10);
        result.currentTasks = tasks
            .filter(t => Date.now() - t.timestamp < 7 * 24 * 60 * 60 * 1000) // Last 7 days
            .map(t => ({
            intent: t.intent,
            age: formatAge(t.timestamp),
        }));
    }
    catch { /* type might not exist yet */ }
    // 4. Recent corrections (most valuable for not repeating mistakes)
    try {
        const corrections = memoryStore.getByType('CORRECTION', 10);
        result.recentCorrections = corrections
            .filter(c => Date.now() - c.timestamp < 3 * 24 * 60 * 60 * 1000) // Last 3 days
            .map(c => ({
            intent: c.intent,
            age: formatAge(c.timestamp),
        }));
    }
    catch { /* */ }
    // 5. Recent decisions  
    try {
        const decisions = memoryStore.getByType('DECISION', 10);
        result.recentDecisions = decisions
            .filter(d => Date.now() - d.timestamp < 7 * 24 * 60 * 60 * 1000) // Last 7 days
            .map(d => ({
            intent: d.intent,
            age: formatAge(d.timestamp),
        }));
    }
    catch { /* */ }
    // 6. Recent git commits (what changed since last session)
    try {
        const { execSync } = require('child_process');
        const gitLog = execSync('git log --oneline --since="24 hours ago" -10', { encoding: 'utf-8', timeout: 5000, cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'] }).trim();
        if (gitLog) {
            const commits = gitLog.split('\n').filter((l) => l.trim());
            if (commits.length > 0) {
                result.recentCommits = commits.map((c) => c.trim());
            }
        }
    }
    catch { /* git not available or no commits */ }
    return result;
}
/** Format resume context for AI consumption */
function formatResumeContext(ctx) {
    const lines = ['# 🔄 Resume Work — Where We Left Off\n'];
    if (ctx.lastSession) {
        lines.push(`## Last Session\n${ctx.lastSession}\n`);
    }
    if (ctx.currentTasks.length > 0) {
        lines.push('## 📋 Current Tasks');
        ctx.currentTasks.forEach(t => lines.push(`- ${t.intent} _(${t.age})_`));
        lines.push('');
    }
    if (ctx.recentCorrections.length > 0) {
        lines.push('## 🔴 Recent Corrections (DON\'T repeat)');
        ctx.recentCorrections.forEach(c => lines.push(`- ${c.intent} _(${c.age})_`));
        lines.push('');
    }
    if (ctx.recentDecisions.length > 0) {
        lines.push('## 📌 Recent Decisions');
        ctx.recentDecisions.forEach(d => lines.push(`- ${d.intent} _(${d.age})_`));
        lines.push('');
    }
    if (ctx.recentMemories.length > 0) {
        lines.push(`## 🧠 Recent Activity (${ctx.recentMemories.length} memories in last 24h)`);
        const byType = {};
        ctx.recentMemories.forEach(m => { byType[m.type] = (byType[m.type] || 0) + 1; });
        Object.entries(byType).forEach(([type, count]) => {
            lines.push(`- ${type}: ${count}`);
        });
        lines.push('');
    }
    // Git commits (what happened since you left)
    const commits = ctx.recentCommits;
    if (commits && commits.length > 0) {
        lines.push('## 📝 Recent Commits (last 24h)');
        commits.forEach((c) => lines.push(`- \`${c}\``));
        lines.push('');
    }
    if (lines.length <= 1) {
        lines.push('No recent activity found. This may be a fresh session.');
    }
    return lines.join('\n');
}
// ─── Helper ──────────────────────────────────────────────────────────────────
function formatAge(timestamp) {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 60)
        return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24)
        return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}
//# sourceMappingURL=resume-work.js.map