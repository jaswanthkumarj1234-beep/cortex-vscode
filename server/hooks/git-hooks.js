#!/usr/bin/env node
"use strict";
/**
 * Cortex Git Hooks — Captures branch switches and merges.
 *
 * Git hooks captured:
 *   post-checkout → remembers branch switches
 *   post-merge    → remembers merges
 *
 * Usage: called automatically by git hooks installed via cortex-setup
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
function gitCmd(cmd) {
    try {
        return (0, child_process_1.execSync)(cmd, { encoding: 'utf-8', timeout: 5000 }).trim();
    }
    catch {
        return '';
    }
}
function generateId() {
    return `gh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
function main() {
    const hookType = process.argv[2] || ''; // 'checkout' or 'merge'
    // Find workspace root
    const workspaceRoot = gitCmd('git rev-parse --show-toplevel');
    if (!workspaceRoot)
        process.exit(0);
    // Check DB exists
    const dbPath = path.join(workspaceRoot, '.ai', 'brain-data', 'cortex.db');
    if (!fs.existsSync(dbPath))
        process.exit(0);
    let type = 'INSIGHT';
    let intent = '';
    let action = '';
    let tags = ['git'];
    if (hookType === 'checkout') {
        // post-checkout: $3 $4 $5 = prev_head, new_head, is_branch_checkout
        const prevRef = process.argv[3] || '';
        const newRef = process.argv[4] || '';
        const isBranch = process.argv[5] === '1';
        if (!isBranch)
            process.exit(0); // Skip file checkouts
        const branchName = gitCmd('git rev-parse --abbrev-ref HEAD');
        if (!branchName || branchName === 'HEAD')
            process.exit(0);
        type = 'INSIGHT';
        intent = `Switched to branch: ${branchName}`;
        action = `Branch checkout from ${prevRef.slice(0, 8)} to ${newRef.slice(0, 8)}`;
        tags = ['git', 'branch-switch', branchName];
        // Add context based on branch name
        if (/fix|bug|hotfix/i.test(branchName))
            tags.push('bugfix');
        if (/feat|feature/i.test(branchName))
            tags.push('feature');
        if (/release|deploy/i.test(branchName))
            tags.push('release');
    }
    else if (hookType === 'merge') {
        // post-merge: $3 = is_squash_merge
        const currentBranch = gitCmd('git rev-parse --abbrev-ref HEAD');
        const mergeCommit = gitCmd('git log -1 --pretty=%s');
        type = 'DECISION';
        intent = `Merged into ${currentBranch}: ${mergeCommit}`;
        action = `Merge completed on branch ${currentBranch}`;
        tags = ['git', 'merge', currentBranch];
    }
    else {
        process.exit(0);
    }
    if (!intent)
        process.exit(0);
    // Store in database
    try {
        const Database = require('better-sqlite3');
        const db = new Database(dbPath);
        db.pragma('journal_mode = WAL');
        // Check dedup
        const existing = db.prepare(`SELECT id FROM memory_units WHERE intent = ? AND is_active = 1`).get(intent);
        if (!existing) {
            db.prepare(`
                INSERT INTO memory_units (id, type, intent, action, reason, tags, timestamp, confidence, importance, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            `).run(generateId(), type, intent, action, `Auto-captured from git ${hookType}`, JSON.stringify(tags), Date.now(), 0.5, 0.4);
        }
        db.close();
    }
    catch {
        process.exit(0);
    }
}
main();
//# sourceMappingURL=git-hooks.js.map