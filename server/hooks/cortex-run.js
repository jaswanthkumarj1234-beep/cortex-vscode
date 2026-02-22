#!/usr/bin/env node
"use strict";
/**
 * Cortex Run — Wraps any command and captures errors as memories.
 *
 * Usage:
 *   cortex-run npm test
 *   cortex-run npm run build
 *   cortex-run python main.py
 *
 * If the command fails, captures the error output as a BUG_FIX memory
 * so the AI knows about it in future conversations.
 * If the command succeeds, captures a brief success note.
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
function generateId() {
    return `cr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
function findDbPath() {
    let dir = process.cwd();
    // Walk up to find .ai/brain-data/cortex.db
    for (let i = 0; i < 10; i++) {
        const dbPath = path.join(dir, '.ai', 'brain-data', 'cortex.db');
        if (fs.existsSync(dbPath))
            return dbPath;
        const parent = path.dirname(dir);
        if (parent === dir)
            break;
        dir = parent;
    }
    return null;
}
function extractErrorSummary(output) {
    const lines = output.split('\n').filter(l => l.trim());
    // Look for common error patterns
    const errorLines = lines.filter(l => /error|Error|ERROR|fail|FAIL|exception|Exception|TypeError|ReferenceError|SyntaxError/i.test(l));
    if (errorLines.length > 0) {
        return errorLines.slice(0, 5).join('\n');
    }
    // Return last 10 lines if no specific error found
    return lines.slice(-10).join('\n');
}
function storeMemory(dbPath, type, intent, action, tags) {
    try {
        const Database = require('better-sqlite3');
        const db = new Database(dbPath);
        db.pragma('journal_mode = WAL');
        db.prepare(`
            INSERT INTO memory_units (id, type, intent, action, reason, tags, timestamp, confidence, importance, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `).run(generateId(), type, intent, action, 'Auto-captured from cortex-run', JSON.stringify(tags), Date.now(), 0.7, 0.6);
        // Try FTS insert
        try {
            db.prepare(`INSERT INTO memory_fts (rowid, intent, action, tags) VALUES (
                (SELECT rowid FROM memory_units WHERE id = (SELECT id FROM memory_units ORDER BY timestamp DESC LIMIT 1)), ?, ?, ?
            )`).run(intent, action, tags.join(' '));
        }
        catch { }
        db.close();
    }
    catch { }
}
function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log('Usage: cortex-run <command> [args...]');
        console.log('Example: cortex-run npm test');
        console.log('         cortex-run npm run build');
        process.exit(1);
    }
    const command = args.join(' ');
    const dbPath = findDbPath();
    const startTime = Date.now();
    try {
        // Run the command, inheriting stdio for real-time output
        (0, child_process_1.execSync)(command, {
            stdio: 'inherit',
            cwd: process.cwd(),
            env: process.env,
        });
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        // Success — store a brief note
        if (dbPath) {
            storeMemory(dbPath, 'INSIGHT', `[OK] Command succeeded: ${command} (${duration}s)`, `Successfully ran "${command}" in ${duration} seconds`, ['cortex-run', 'success', command.split(' ')[0]]);
        }
    }
    catch (err) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        // Failure — capture error details
        if (dbPath) {
            let errorOutput = '';
            try {
                // Re-run to capture output
                (0, child_process_1.execSync)(command, {
                    cwd: process.cwd(),
                    env: process.env,
                    encoding: 'utf-8',
                    stdio: ['pipe', 'pipe', 'pipe'],
                });
            }
            catch (e) {
                errorOutput = (e.stderr || e.stdout || e.message || '').toString();
            }
            const errorSummary = extractErrorSummary(errorOutput);
            storeMemory(dbPath, 'BUG_FIX', `[FAIL] Command failed: ${command}`, `Failed after ${duration}s.\n\nError:\n${errorSummary.slice(0, 500)}`, ['cortex-run', 'error', command.split(' ')[0], 'needs-fix']);
        }
        // Exit with the same error code
        process.exit(err.status || 1);
    }
}
main();
//# sourceMappingURL=cortex-run.js.map