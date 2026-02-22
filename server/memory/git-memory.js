"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.captureGitCommits = captureGitCommits;
exports.detectFileChanges = detectFileChanges;
exports.formatFileChanges = formatFileChanges;
const types_1 = require("../types");
// Track the last processed commit hash to avoid duplicates
let lastProcessedCommit = null;
/** Capture recent git commits as memories */
function captureGitCommits(memoryStore, workspaceRoot, maxCommits = 5) {
    if (!workspaceRoot)
        return 0;
    try {
        const { execSync } = require('child_process');
        // Get recent commits with file changes
        const gitLog = execSync(`git log --oneline --name-only -${maxCommits} --no-merges 2>nul`, { cwd: workspaceRoot, encoding: 'utf-8', timeout: 5000 }).trim();
        if (!gitLog)
            return 0;
        const commits = parseGitLog(gitLog);
        let stored = 0;
        for (const commit of commits) {
            // Skip if already processed
            if (commit.hash === lastProcessedCommit)
                break;
            // Classify commit type based on message
            const type = classifyCommit(commit.message);
            // Check for duplicate — skip if already stored
            const existing = memoryStore.getActive(200).find(m => m.tags?.includes(`commit:${commit.hash}`));
            if (existing)
                continue;
            memoryStore.add({
                type,
                intent: `Git commit: ${commit.message}`,
                action: commit.filesChanged.length > 0
                    ? `Changed: ${commit.filesChanged.slice(0, 5).join(', ')}`
                    : commit.message,
                reason: 'Auto-captured from git history',
                tags: ['git-commit', `commit:${commit.hash}`, ...extractTopicTags(commit.message)],
                relatedFiles: commit.filesChanged.slice(0, 10),
                confidence: 0.8,
                importance: type === types_1.MemoryType.BUG_FIX ? 0.85 : 0.6,
                timestamp: Date.now(),
                isActive: true,
                accessCount: 0,
                createdAt: Date.now(),
                id: '',
            });
            stored++;
        }
        if (commits.length > 0) {
            lastProcessedCommit = commits[0].hash;
        }
        return stored;
    }
    catch {
        return 0;
    }
}
/** Detect file changes since last session */
function detectFileChanges(workspaceRoot) {
    const report = { newFiles: [], deletedFiles: [], modifiedFiles: [], totalChanges: 0 };
    if (!workspaceRoot)
        return report;
    try {
        const { execSync } = require('child_process');
        // Get uncommitted changes (working tree vs HEAD)
        const status = execSync('git status --porcelain 2>nul', {
            cwd: workspaceRoot,
            encoding: 'utf-8',
            timeout: 5000,
        }).trim();
        if (!status)
            return report;
        for (const line of status.split('\n')) {
            const code = line.slice(0, 2).trim();
            const file = line.slice(3).trim();
            if (!file)
                continue;
            switch (code) {
                case '??':
                case 'A':
                    report.newFiles.push(file);
                    break;
                case 'D':
                    report.deletedFiles.push(file);
                    break;
                case 'M':
                case 'MM':
                    report.modifiedFiles.push(file);
                    break;
                default:
                    report.modifiedFiles.push(file);
                    break;
            }
        }
        report.totalChanges = report.newFiles.length + report.deletedFiles.length + report.modifiedFiles.length;
        return report;
    }
    catch {
        return report;
    }
}
/** Format file changes for injection */
function formatFileChanges(report) {
    if (report.totalChanges === 0)
        return '';
    const lines = [`## 📝 Uncommitted Changes (${report.totalChanges} files)`];
    if (report.newFiles.length > 0) {
        lines.push(`**New:** ${report.newFiles.slice(0, 5).join(', ')}`);
    }
    if (report.deletedFiles.length > 0) {
        lines.push(`**Deleted:** ${report.deletedFiles.slice(0, 5).join(', ')}`);
    }
    if (report.modifiedFiles.length > 0) {
        lines.push(`**Modified:** ${report.modifiedFiles.slice(0, 5).join(', ')}`);
    }
    return lines.join('\n');
}
// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseGitLog(log) {
    const commits = [];
    const lines = log.split('\n');
    let current = null;
    for (const line of lines) {
        // Commit line: "abc1234 Fix auth bug"
        const commitMatch = line.match(/^([a-f0-9]{7,12})\s+(.+)$/);
        if (commitMatch) {
            if (current)
                commits.push(current);
            current = {
                hash: commitMatch[1],
                message: commitMatch[2],
                author: '',
                date: '',
                filesChanged: [],
            };
        }
        else if (current && line.trim()) {
            // File change line
            current.filesChanged.push(line.trim());
        }
    }
    if (current)
        commits.push(current);
    return commits;
}
function classifyCommit(message) {
    const lower = message.toLowerCase();
    if (/\b(fix|bug|patch|hotfix|resolve|crash|error|issue)\b/.test(lower))
        return types_1.MemoryType.BUG_FIX;
    if (/\b(refactor|clean|lint|format|style|rename)\b/.test(lower))
        return types_1.MemoryType.CONVENTION;
    if (/\b(add|feat|implement|create|support|enable)\b/.test(lower))
        return types_1.MemoryType.DECISION;
    if (/\b(doc|readme|comment|note)\b/.test(lower))
        return types_1.MemoryType.INSIGHT;
    return types_1.MemoryType.DECISION;
}
function extractTopicTags(message) {
    const tags = [];
    const lower = message.toLowerCase();
    const patterns = [
        [/\b(auth|login|session|token|jwt)\b/, 'auth'],
        [/\b(database|sql|query|migration)\b/, 'database'],
        [/\b(api|endpoint|route)\b/, 'api'],
        [/\b(ui|component|style|css)\b/, 'ui'],
        [/\b(test|spec|coverage)\b/, 'testing'],
        [/\b(deploy|ci|docker)\b/, 'devops'],
        [/\b(security|permission)\b/, 'security'],
        [/\b(perf|cache|optimize)\b/, 'performance'],
    ];
    for (const [pattern, tag] of patterns) {
        if (pattern.test(lower))
            tags.push(tag);
    }
    return tags;
}
//# sourceMappingURL=git-memory.js.map