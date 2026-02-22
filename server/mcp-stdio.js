#!/usr/bin/env node
"use strict";
/**
 * Cortex MCP — stdio transport for Antigravity / Gemini integration.
 *
 * CRITICAL: In stdio mode, stdout is ONLY for JSON-RPC messages.
 * All logging MUST go to stderr. We override console.log/warn/error
 * BEFORE importing any modules to prevent protocol corruption.
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
// === MUST BE FIRST: Redirect ALL console output to stderr ===
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const DEBUG = process.env.DEBUG === '1' || process.env.CORTEX_DEBUG === '1';
const debugLogPath = DEBUG ? path.join(process.cwd(), 'cortex.log') : null;
function logToFile(msg) {
    if (!debugLogPath)
        return;
    try {
        const timestamp = new Date().toISOString();
        fs.appendFileSync(debugLogPath, `[${timestamp}] ${msg}\n`);
    }
    catch (e) { /* ignore */ }
}
console.log = (...args) => {
    const msg = args.join(' ');
    process.stderr.write(msg + '\n');
    logToFile(`INFO: ${msg}`);
};
console.warn = (...args) => {
    const msg = args.join(' ');
    process.stderr.write(msg + '\n');
    logToFile(`WARN: ${msg}`);
};
console.error = (...args) => {
    const msg = args.join(' ');
    process.stderr.write(msg + '\n');
    logToFile(`ERROR: ${msg}`);
};
if (DEBUG) {
    logToFile("=== CORTEX SERVER STARTING ===");
    logToFile(`CWD: ${process.cwd()}`);
    logToFile(`ARGS: ${process.argv.join(' ')}`);
}
// --- Crash protection: keep server alive on errors ---
process.on('uncaughtException', (err) => {
    console.log(`[cortex-mcp] UNCAUGHT EXCEPTION (survived): ${err.message}`);
    console.log(`[cortex-mcp] Stack: ${err.stack}`);
    // Do NOT exit — keep the MCP connection alive
});
process.on('unhandledRejection', (reason) => {
    console.log(`[cortex-mcp] UNHANDLED REJECTION (survived): ${reason?.message || reason}`);
    // Do NOT exit — keep the MCP connection alive
});
const readline = __importStar(require("readline"));
const database_1 = require("./db/database");
const event_log_1 = require("./db/event-log");
const memory_store_1 = require("./db/memory-store");
const mcp_handler_1 = require("./server/mcp-handler");
const embedding_manager_1 = require("./memory/embedding-manager");
const memory_decay_1 = require("./memory/memory-decay");
const license_1 = require("./security/license");
const feature_gate_1 = require("./security/feature-gate");
// ─── CLI Routing ─────────────────────────────────────────────────────────────
// Handle subcommands BEFORE starting the MCP server
const firstArg = process.argv[2];
if (firstArg === 'setup') {
    // Route to setup CLI
    const setupPath = path.join(__dirname, 'cli', 'setup.js');
    process.argv.splice(2, 1); // Remove 'setup' so setup.ts sees clean args
    require(setupPath);
    // Don't continue — setup runs and exits
}
else if (firstArg === '--version' || firstArg === '-v') {
    const pkg = require(path.join(__dirname, '..', 'package.json'));
    process.stderr.write(`cortex-mcp v${pkg.version}\n`);
    process.exit(0);
}
else if (firstArg === '--help' || firstArg === '-h' || firstArg === 'help') {
    process.stderr.write(`
Cortex MCP Server — Persistent memory for AI coding assistants

USAGE:
  npx cortex-mcp                           Start MCP server (used by AI clients)
  npx cortex-mcp setup                     Auto-configure your AI client
  npx cortex-mcp --version                 Show version
  npx cortex-mcp --help                    Show this help

COMPANION TOOLS (installed automatically):
  cortex-setup                             Configure AI client + git hooks
  cortex-capture                           Capture git commits as memories
  cortex-hooks <checkout|merge>            Capture branch/merge events
  cortex-run <command>                     Run any command and capture errors

ENVIRONMENT VARIABLES:
  CORTEX_DEBUG=1                           Enable file logging (cortex.log)
  CORTEX_PORT=4000                         Custom dashboard port (default: 3456)
  OPENAI_API_KEY=sk-...                    Enable LLM-enhanced classification
  ANTHROPIC_API_KEY=sk-ant-...             Alternative LLM provider
  CORTEX_LLM_BASE_URL=http://...           Custom LLM endpoint (Ollama, etc.)

SUPPORTED AI CLIENTS:
  Antigravity, Claude Desktop, Cursor, GitHub Copilot, Windsurf, Zed
  Also works with: Claude Code (terminal), any MCP-compatible client

DOCS: https://github.com/jaswanthkumarj1234-beep/cortex-mcp
`);
    process.exit(0);
}
// Determine data directory — use workspace if provided, else cwd
// Skip arg if it looks like a flag (starts with -)
const workspaceRoot = (firstArg && !firstArg.startsWith('-')) ? firstArg : process.cwd();
const dataDir = path.join(workspaceRoot, '.ai', 'brain-data');
// Initialize database (wrapped to catch lock errors)
let database;
let eventLog;
let memoryStore;
let handleMCPRequest;
try {
    // Initialize database and memory store (console.log now goes to stderr)
    database = new database_1.CognitiveDatabase(dataDir);
    eventLog = new event_log_1.EventLog(database);
    memoryStore = new memory_store_1.MemoryStore(database);
    // Start embedding worker for vector search
    (0, embedding_manager_1.startEmbeddingWorker)();
    // Create MCP handler (reuses all existing logic)
    const handler = (0, mcp_handler_1.createMCPHandler)(memoryStore, eventLog, workspaceRoot);
    handleMCPRequest = handler ? handler.handleMCPRequest : null;
    console.log(`[cortex-mcp] Started with ${memoryStore.activeCount()} memories from ${dataDir}`);
    // Run memory decay on startup, then every 6 hours
    (0, memory_decay_1.cleanupMemories)(memoryStore);
    setInterval(() => (0, memory_decay_1.cleanupMemories)(memoryStore), 6 * 60 * 60 * 1000);
    // Auto-scan project on first run (0 memories = brand new install)
    if (memoryStore.activeCount() === 0) {
        try {
            const scanner = new (require('./scanners/project-scanner').ProjectScanner)(memoryStore, workspaceRoot);
            scanner.scan().then((count) => {
                if (count > 0)
                    console.log(`[cortex-mcp] Auto-scanned project: ${count} memories created`);
            }).catch(() => { });
        }
        catch (err) {
            console.log(`[cortex-mcp] Auto-scan skipped: ${err.message}`);
        }
    }
    // Start web dashboard (non-blocking, port 3456)
    try {
        const { startDashboard } = require('./server/dashboard');
        const { CONFIG } = require('./config/config');
        startDashboard(memoryStore);
        const port = process.env.CORTEX_PORT || CONFIG.DASHBOARD_PORT || 3456;
        console.log(`[cortex-mcp] Dashboard: http://localhost:${port}`);
    }
    catch (err) {
        console.log(`[cortex-mcp] Dashboard unavailable: ${err.message}`);
    }
    // ─── License Status & Trial Countdown ─────────────────────────────────────
    try {
        // Get initial license (may be FREE if no cache yet)
        (0, license_1.getLicense)();
        // Wait up to 5s for online verification so the first status shows real plan
        (0, license_1.waitForVerification)(5000).then((verified) => {
            console.log(`[cortex-mcp] ${(0, feature_gate_1.formatPlanStatus)()}`);
            const trialStatus = (0, license_1.getTrialStatus)();
            if (trialStatus) {
                console.log(`[cortex-mcp] ${trialStatus}`);
            }
        }).catch(() => {
            console.log(`[cortex-mcp] ${(0, feature_gate_1.formatPlanStatus)()}`);
        });
    }
    catch (err) {
        console.log(`[cortex-mcp] License check skipped: ${err.message}`);
    }
}
catch (err) {
    console.error(`[cortex-mcp] FATAL INIT ERROR: ${err.message}`);
    console.error(`[cortex-mcp] Server running in degraded mode (no DB)`);
    // Fallback: minimal handler that reports error
    handleMCPRequest = async (rpc) => ({
        jsonrpc: '2.0', id: rpc.id,
        error: { code: -32603, message: `Server Init Failed: ${err.message}` }
    });
}
// --- stdio JSON-RPC transport ---
// Read line-delimited JSON from stdin, write responses to stdout
const rl = readline.createInterface({
    input: process.stdin,
    terminal: false,
});
rl.on('line', async (line) => {
    if (!line.trim())
        return;
    try {
        const rpc = JSON.parse(line);
        console.log(`[cortex-mcp] ${rpc.method} (id: ${rpc.id})`);
        if (!handleMCPRequest) {
            throw new Error("Handler not initialized");
        }
        const response = await handleMCPRequest(rpc);
        if (response) {
            const json = JSON.stringify(response);
            process.stdout.write(json + '\n');
        }
    }
    catch (err) {
        console.log(`[cortex-mcp] Error: ${err.message}`);
        const errorResponse = {
            jsonrpc: '2.0',
            error: { code: -32700, message: `Parse error: ${err.message}` },
            id: null,
        };
        process.stdout.write(JSON.stringify(errorResponse) + '\n');
    }
});
rl.on('close', () => {
    console.log('[cortex-mcp] stdin closed, shutting down');
    if (database)
        database.close();
    process.exit(0);
});
process.on('SIGTERM', () => {
    console.log('[cortex-mcp] SIGTERM received, shutting down');
    if (database)
        database.close();
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('[cortex-mcp] SIGINT received, shutting down');
    if (database)
        database.close();
    process.exit(0);
});
//# sourceMappingURL=mcp-stdio.js.map