"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMCPHandler = createMCPHandler;
const types_1 = require("../types");
const memory_cache_1 = require("../memory/memory-cache");
const memory_ranker_1 = require("../memory/memory-ranker");
const embedding_manager_1 = require("../memory/embedding-manager");
const memory_quality_1 = require("../memory/memory-quality");
const project_scanner_1 = require("../scanners/project-scanner");
const file_verifier_1 = require("../scanners/file-verifier");
const context_builder_1 = require("../scanners/context-builder");
const code_verifier_1 = require("../scanners/code-verifier");
const auto_learner_1 = require("../memory/auto-learner");
const session_tracker_1 = require("../memory/session-tracker");
const anticipation_engine_1 = require("../memory/anticipation-engine");
const memory_consolidator_1 = require("../memory/memory-consolidator");
const attention_ranker_1 = require("../memory/attention-ranker");
const temporal_engine_1 = require("../memory/temporal-engine");
const learning_rate_1 = require("../memory/learning-rate");
const meta_memory_1 = require("../memory/meta-memory");
const confidence_decay_1 = require("../memory/confidence-decay");
const git_memory_1 = require("../memory/git-memory");
const export_map_1 = require("../scanners/export-map");
const architecture_graph_1 = require("../scanners/architecture-graph");
const rate_limiter_1 = require("../security/rate-limiter");
const feature_gate_1 = require("../security/feature-gate");
const export_import_1 = require("../memory/export-import");
const llm_enhancer_1 = require("../memory/llm-enhancer");
const usage_stats_1 = require("../memory/usage-stats");
const correction_detector_1 = require("../memory/correction-detector");
const success_tracker_1 = require("../memory/success-tracker");
const error_learner_1 = require("../memory/error-learner");
const completion_resolver_1 = require("../memory/completion-resolver");
const pre_flight_1 = require("../memory/pre-flight");
const impact_analyzer_1 = require("../memory/impact-analyzer");
const resume_work_1 = require("../memory/resume-work");
const preference_learner_1 = require("../memory/preference-learner");
const convention_detector_1 = require("../memory/convention-detector");
const export_map_2 = require("../scanners/export-map");
const file_relationships_1 = require("../memory/file-relationships");
const instructions_generator_1 = require("../memory/instructions-generator");
const tool_recommender_1 = require("../memory/tool-recommender");
const regression_guard_1 = require("../memory/regression-guard");
// --- Query Expansion (Synonym Map) ---
const SYNONYMS = {
    auth: ['authentication', 'login', 'signin', 'sign-in', 'credentials'],
    login: ['auth', 'authentication', 'signin', 'sign-in'],
    db: ['database', 'sql', 'postgresql', 'postgres', 'mongodb', 'sqlite'],
    database: ['db', 'sql', 'postgresql', 'postgres', 'mongodb', 'sqlite'],
    api: ['endpoint', 'route', 'rest', 'graphql', 'http'],
    error: ['bug', 'fix', 'issue', 'problem', 'crash', 'fail'],
    bug: ['error', 'fix', 'issue', 'problem', 'crash'],
    style: ['css', 'design', 'theme', 'color', 'font', 'layout'],
    test: ['testing', 'jest', 'vitest', 'spec', 'unittest'],
    deploy: ['deployment', 'ci', 'cd', 'pipeline', 'docker', 'build'],
};
function expandQuery(query) {
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const expanded = new Set(words);
    for (const word of words) {
        if (expanded.size >= 8)
            break; // Cap expansion to prevent FTS hang
        const syns = SYNONYMS[word];
        if (syns) {
            for (const s of syns.slice(0, 2)) {
                if (expanded.size >= 8)
                    break;
                expanded.add(s);
            }
        }
    }
    return Array.from(expanded).join(' OR ');
}
// --- MCP Tool Definitions ---
const MCP_TOOLS = [
    {
        name: 'recall_memory',
        description: 'Search the persistent memory database for relevant past decisions, corrections, bugs, conventions, and insights from previous coding sessions. ALWAYS call this before answering user questions to check for relevant context.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'What to search for in memory (e.g. "authentication bug fix", "database decision")' },
                maxResults: { type: 'number', description: 'Maximum results to return (default 10)' },
                currentFile: { type: 'string', description: 'Currently active file path (for relevance boosting)' },
            },
            required: ['query'],
        },
    },
    {
        name: 'store_memory',
        description: 'Actively store an important decision, correction, bug fix, convention, or insight into the persistent memory database so it is remembered across sessions.',
        inputSchema: {
            type: 'object',
            properties: {
                type: { type: 'string', enum: ['DECISION', 'CORRECTION', 'BUG_FIX', 'CONVENTION', 'INSIGHT'], description: 'Type of memory' },
                content: { type: 'string', description: 'What to remember — be concise and specific' },
                reason: { type: 'string', description: 'Why this matters (optional)' },
                files: { type: 'array', items: { type: 'string' }, description: 'Related file paths (optional)' },
                tags: { type: 'array', items: { type: 'string' }, description: 'Tags for categorization (optional)' },
            },
            required: ['type', 'content'],
        },
    },
    {
        name: 'get_stats',
        description: 'Get statistics about the memory database (active memories, total events, etc).',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'scan_project',
        description: 'Scan the project to capture its stack, structure, config, and recent git history. Run once per project to solve the "Day 1 Empty Brain" problem.',
        inputSchema: {
            type: 'object',
            properties: {
                workspaceRoot: { type: 'string', description: 'Root directory of the project to scan' },
            },
            required: ['workspaceRoot'],
        },
    },
    {
        name: 'verify_files',
        description: 'Verify file paths against the real file system to catch hallucinated paths. Pass AI-generated text and get back which file paths are valid and which are hallucinated.',
        inputSchema: {
            type: 'object',
            properties: {
                text: { type: 'string', description: 'Text containing file paths to verify (e.g. AI response)' },
                workspaceRoot: { type: 'string', description: 'Root directory of the project' },
            },
            required: ['text', 'workspaceRoot'],
        },
    },
    {
        name: 'get_context',
        description: 'Get dynamic context based on the current file and project. Returns compressed context with corrections, decisions, conventions, and file-specific history.',
        inputSchema: {
            type: 'object',
            properties: {
                currentFile: { type: 'string', description: 'Currently active file path' },
                maxChars: { type: 'number', description: 'Maximum characters for context (default 3000)' },
            },
        },
    },
    {
        name: 'verify_code',
        description: 'Verify AI-generated code for hallucinations: checks if imported packages exist in package.json, if imported functions are actually exported from source files, and if referenced env variables exist in .env files.',
        inputSchema: {
            type: 'object',
            properties: {
                code: { type: 'string', description: 'The code to verify for hallucinated imports, exports, and env variables' },
                workspaceRoot: { type: 'string', description: 'Root directory of the project' },
            },
            required: ['code'],
        },
    },
    {
        name: 'force_recall',
        description: 'MANDATORY: Call this at the START of every conversation. Returns ALL corrections, decisions, conventions, and bug fixes. Also searches for topic-specific memories. This is the single entry point for complete context injection. Without calling this, you WILL repeat past mistakes, contradict previous decisions, and miss critical conventions. The user expects you to remember everything from past sessions.',
        inputSchema: {
            type: 'object',
            properties: {
                topic: { type: 'string', description: 'What the user is asking about (used to search for relevant memories)' },
                currentFile: { type: 'string', description: 'Currently active file path (optional)' },
            },
            required: ['topic'],
        },
    },
    {
        name: 'quick_store',
        description: 'Quick-store a memory with just one sentence. Auto-classifies as CORRECTION, DECISION, CONVENTION, or BUG_FIX. Use this whenever you make or learn something worth remembering. Example: "Never use var, always use const in this project"',
        inputSchema: {
            type: 'object',
            properties: {
                memory: { type: 'string', description: 'One sentence describing the decision, correction, convention, or bug fix' },
            },
            required: ['memory'],
        },
    },
    {
        name: 'update_memory',
        description: 'Update or supersede an existing memory when a decision changes. Use this when you previously stored something that is now outdated or incorrect. The old memory will be deactivated and replaced with the new content.',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'ID of the memory to update (from recall_memory results)' },
                content: { type: 'string', description: 'New content to replace the old memory with' },
                reason: { type: 'string', description: 'Why the memory is being updated (e.g. "switched from PostgreSQL to MongoDB")' },
            },
            required: ['id', 'content'],
        },
    },
    {
        name: 'list_memories',
        description: 'List all stored memories grouped by type (DECISION, CORRECTION, CONVENTION, BUG_FIX, INSIGHT). Use this to browse what Cortex knows, or to find a memory ID for update_memory or delete_memory.',
        inputSchema: {
            type: 'object',
            properties: {
                type: { type: 'string', enum: ['DECISION', 'CORRECTION', 'CONVENTION', 'BUG_FIX', 'INSIGHT', 'ALL'], description: 'Filter by type (default: ALL)' },
                limit: { type: 'number', description: 'Max memories to return per type (default: 20)' },
            },
        },
    },
    {
        name: 'delete_memory',
        description: 'Permanently deactivate a specific memory by ID. Use this to remove outdated or incorrect memories. The memory is soft-deleted (history preserved). Get the ID from list_memories or recall_memory.',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'ID of the memory to delete' },
                reason: { type: 'string', description: 'Why this memory is being deleted (optional)' },
            },
            required: ['id'],
        },
    },
    {
        name: 'auto_learn',
        description: 'CALL THIS AFTER EVERY RESPONSE. Pass the text of your response and Cortex will automatically extract and store any decisions, corrections, conventions, or bug fixes — with zero manual effort. This is how Cortex learns passively. If you skip this, everything you said in this conversation is LOST FOREVER — the user will have to repeat themselves next time.',
        inputSchema: {
            type: 'object',
            properties: {
                text: { type: 'string', description: 'The text of your response to scan for memory-worthy patterns' },
                context: { type: 'string', description: 'Optional: what the user was asking about (helps with categorization)' },
            },
            required: ['text'],
        },
    },
    {
        name: 'export_memories',
        description: 'Export all active memories to a JSON bundle. Returns the full backup data that can be saved or transferred to another machine.',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'import_memories',
        description: 'Import memories from a previously exported JSON bundle. Duplicates are automatically skipped.',
        inputSchema: {
            type: 'object',
            properties: {
                data: { type: 'string', description: 'The JSON string of an exported memory bundle' },
            },
            required: ['data'],
        },
    },
    {
        name: 'health_check',
        description: 'Check the health and status of the Cortex server. Returns memory count, DB size, rate limit status, and uptime.',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'review_code',
        description: 'Review code against your stored conventions, past bug patterns, and project decisions. Returns specific violations with memory references — like having a senior dev review your code.',
        inputSchema: {
            type: 'object',
            properties: {
                code: { type: 'string', description: 'The code to review' },
                filename: { type: 'string', description: 'Optional filename for context-aware review' },
            },
            required: ['code'],
        },
    },
    {
        name: 'pre_check',
        description: 'Pre-flight check: get ALL conventions, gotchas, past bugs, and corrections for a file BEFORE writing code. Like a pilot\'s checklist — call this before making any code changes to avoid repeating past mistakes. Skipping this risks reintroducing bugs that were already fixed.',
        inputSchema: {
            type: 'object',
            properties: {
                filename: { type: 'string', description: 'The file you are about to edit' },
                task: { type: 'string', description: 'What you plan to do (helps find relevant past failures)' },
            },
        },
    },
    {
        name: 'check_impact',
        description: 'Impact analysis: before editing a file, check which other files depend on it. Shows direct and indirect dependents with risk level. Prevents breaking changes.',
        inputSchema: {
            type: 'object',
            properties: {
                file: { type: 'string', description: 'The file you plan to modify' },
            },
            required: ['file'],
        },
    },
    {
        name: 'resume_work',
        description: 'Resume work after a conversation break. Returns: last session summary, current tasks, recent corrections (don\'t repeat!), recent decisions, and activity summary. Call this when starting a new conversation about ongoing work.',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
];
// --- Dynamic Context via ContextBuilder ---
let cachedContextBuilder = null;
function getContextBuilder(memoryStore) {
    if (!cachedContextBuilder) {
        cachedContextBuilder = new context_builder_1.ContextBuilder(memoryStore);
    }
    return cachedContextBuilder;
}
// --- Core Handler ---
function createMCPHandler(memoryStore, eventLog, workspaceRoot) {
    async function handleMCPRequest(rpc) {
        const id = rpc.id;
        switch (rpc.method) {
            case 'initialize':
                return {
                    jsonrpc: '2.0',
                    id,
                    result: {
                        protocolVersion: '2024-11-05',
                        capabilities: { tools: {}, resources: {}, prompts: {} },
                        serverInfo: { name: 'Cortex', version: require('../../package.json').version },
                    },
                };
            case 'notifications/initialized':
            case 'notifications/cancelled':
                return null;
            case 'tools/list':
                return {
                    jsonrpc: '2.0',
                    id,
                    result: { tools: MCP_TOOLS },
                };
            case 'resources/list':
                return {
                    jsonrpc: '2.0',
                    id,
                    result: {
                        resources: [{
                                uri: 'memory://brain/context',
                                name: 'Cortex MCP Context',
                                description: 'Top memories — corrections, decisions, conventions. Read this before every response.',
                                mimeType: 'text/plain',
                            }],
                    },
                };
            case 'resources/read': {
                const uri = rpc.params?.uri;
                if (uri === 'memory://brain/context') {
                    return {
                        jsonrpc: '2.0',
                        id,
                        result: {
                            contents: [{
                                    uri: 'memory://brain/context',
                                    mimeType: 'text/plain',
                                    text: getContextBuilder(memoryStore).build(),
                                }],
                        },
                    };
                }
                return {
                    jsonrpc: '2.0',
                    id,
                    error: { code: -32602, message: `Unknown resource: ${uri}` },
                };
            }
            case 'prompts/list':
                return {
                    jsonrpc: '2.0', id,
                    result: {
                        prompts: [
                            {
                                name: 'cortex-review',
                                description: 'Review code against stored conventions, past bugs, and project decisions. Returns specific violations.',
                                arguments: [
                                    { name: 'code', description: 'The code to review', required: true },
                                    { name: 'filename', description: 'Filename for context-aware review', required: false },
                                ],
                            },
                            {
                                name: 'cortex-debug',
                                description: 'Debug an issue using Cortex memory. Checks for similar past bugs, failed attempts, and gotchas.',
                                arguments: [
                                    { name: 'error', description: 'The error message or issue description', required: true },
                                    { name: 'file', description: 'The file where the error occurs', required: false },
                                ],
                            },
                            {
                                name: 'cortex-new-feature',
                                description: 'Pre-flight checklist before building a new feature. Gets conventions, gotchas, and architecture context.',
                                arguments: [
                                    { name: 'feature', description: 'What feature you plan to build', required: true },
                                    { name: 'files', description: 'Files you plan to modify', required: false },
                                ],
                            },
                        ],
                    },
                };
            case 'prompts/get': {
                const promptName = rpc.params?.name;
                const promptArgs = rpc.params?.arguments || {};
                if (promptName === 'cortex-review') {
                    return {
                        jsonrpc: '2.0', id,
                        result: {
                            description: 'Code review against Cortex memory',
                            messages: [
                                {
                                    role: 'user',
                                    content: {
                                        type: 'text',
                                        text: `Review this code against all stored conventions, past bug patterns, and project decisions.\n\nFile: ${promptArgs.filename || 'unknown'}\n\n\`\`\`\n${promptArgs.code || '(no code provided)'}\n\`\`\`\n\nUse the review_code and pre_check tools to check against stored memory. Report any violations with memory IDs.`,
                                    },
                                },
                            ],
                        },
                    };
                }
                if (promptName === 'cortex-debug') {
                    return {
                        jsonrpc: '2.0', id,
                        result: {
                            description: 'Debug with Cortex memory context',
                            messages: [
                                {
                                    role: 'user',
                                    content: {
                                        type: 'text',
                                        text: `I'm debugging this issue:\n\n${promptArgs.error || '(no error provided)'}\n\nFile: ${promptArgs.file || 'unknown'}\n\nUse recall_memory to search for similar past bugs, failed attempts, and gotchas. Check if this matches any known patterns. Use check_impact to see what other files might be affected.`,
                                    },
                                },
                            ],
                        },
                    };
                }
                if (promptName === 'cortex-new-feature') {
                    return {
                        jsonrpc: '2.0', id,
                        result: {
                            description: 'New feature pre-flight checklist',
                            messages: [
                                {
                                    role: 'user',
                                    content: {
                                        type: 'text',
                                        text: `I'm building a new feature: ${promptArgs.feature || '(no feature described)'}\n\nFiles I plan to modify: ${promptArgs.files || 'unknown'}\n\nBefore I start, run pre_check for each file, check_impact for dependency risks, and recall_memory for any relevant past work. Give me a checklist of things to watch out for.`,
                                    },
                                },
                            ],
                        },
                    };
                }
                return {
                    jsonrpc: '2.0', id,
                    error: { code: -32602, message: `Unknown prompt: ${promptName}` },
                };
            }
            case 'tools/call': {
                const toolName = rpc.params?.name;
                const args = rpc.params?.arguments || {};
                // Input validation
                if (args.query && typeof args.query === 'string' && args.query.length > 1000) {
                    return {
                        jsonrpc: '2.0', id,
                        result: { content: [{ type: 'text', text: 'Error: query too long (max 1000 chars)' }], isError: true },
                    };
                }
                if (args.content && typeof args.content === 'string' && args.content.length > 50000) {
                    return {
                        jsonrpc: '2.0', id,
                        result: { content: [{ type: 'text', text: 'Error: content too long (max 50000 chars)' }], isError: true },
                    };
                }
                if (toolName === 'recall_memory') {
                    return await handleRecallMemory(id, args);
                }
                else if (toolName === 'store_memory') {
                    return await handleStoreMemory(id, args);
                }
                else if (toolName === 'get_stats') {
                    return handleGetStats(id);
                }
                else if (toolName === 'scan_project') {
                    return await handleScanProject(id, args);
                }
                else if (toolName === 'verify_files') {
                    return handleVerifyFiles(id, args);
                }
                else if (toolName === 'get_context') {
                    return handleGetContext(id, args);
                }
                else if (toolName === 'verify_code') {
                    return handleVerifyCode(id, args);
                }
                else if (toolName === 'force_recall') {
                    return await handleForceRecall(id, args);
                }
                else if (toolName === 'quick_store') {
                    return handleQuickStore(id, args);
                }
                else if (toolName === 'update_memory') {
                    return handleUpdateMemory(id, args);
                }
                else if (toolName === 'list_memories') {
                    return handleListMemories(id, args);
                }
                else if (toolName === 'delete_memory') {
                    return handleDeleteMemory(id, args);
                }
                else if (toolName === 'auto_learn') {
                    return handleAutoLearn(id, args);
                }
                else if (toolName === 'export_memories') {
                    return handleExportMemories(id);
                }
                else if (toolName === 'import_memories') {
                    return handleImportMemories(id, args);
                }
                else if (toolName === 'health_check') {
                    return handleHealthCheck(id);
                }
                else if (toolName === 'review_code') {
                    return handleReviewCode(id, args);
                }
                else if (toolName === 'pre_check') {
                    return handlePreCheck(id, args);
                }
                else if (toolName === 'check_impact') {
                    return handleCheckImpact(id, args);
                }
                else if (toolName === 'resume_work') {
                    return handleResumeWork(id);
                }
                else {
                    return {
                        jsonrpc: '2.0', id,
                        result: { content: [{ type: 'text', text: `Unknown tool: ${toolName}` }], isError: true },
                    };
                }
            }
            // Backward compatibility
            case 'recall_memory':
                return await handleRecallMemory(id, rpc.params || {});
            case 'store_memory':
                return await handleStoreMemory(id, rpc.params || {});
            case 'get_stats':
                return handleGetStats(id);
            default:
                return {
                    jsonrpc: '2.0', id,
                    error: { code: -32601, message: `Method not found: ${rpc.method}` },
                };
        }
    }
    async function handleRecallMemory(id, args) {
        const queryText = args.query || '';
        const maxResults = Math.min(args.maxResults || 10, 50);
        const currentFile = args.currentFile;
        console.log(`  [SEARCH] recall: "${queryText}" (max ${maxResults})`);
        let ranked = [];
        const t0 = Date.now();
        // 0. Check cache
        const cacheKey = `recall:${queryText}:${maxResults}`;
        const cached = (0, memory_cache_1.getCached)(cacheKey);
        if (cached) {
            console.log(`  [CACHE] Hit in ${Date.now() - t0}ms`);
            // Parse cached JSON string back to object if needed, or if cached is already ScoredMemory[]
            // Assuming getCached returns the object directly
            return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: (0, memory_ranker_1.formatResults)(cached, queryText) }] } };
        }
        try {
            // 1. FTS — try expanded query first, fall back to raw
            let ftsResults = [];
            try {
                const expanded = expandQuery(queryText);
                if (expanded !== queryText) {
                    // console.log(`  Expansion: ${queryText} -> ${expanded}`);
                    ftsResults = memoryStore.searchFTS(expanded, maxResults * 2);
                }
            }
            catch (e) { /* non-fatal */ }
            if (ftsResults.length === 0) {
                ftsResults = memoryStore.searchFTS(queryText, maxResults * 2);
            }
            console.log(`  [FTS] ${ftsResults.length} results`);
            // 2. Vector Search (if worker ready)
            let vectorResults = [];
            if ((0, embedding_manager_1.isWorkerReady)()) {
                const embedding = await (0, embedding_manager_1.embedText)(queryText);
                vectorResults = memoryStore.searchVector(new Float32Array(embedding), maxResults * 2);
                if (vectorResults.length > 0) {
                    console.log(`  [VECTOR] ${vectorResults.length} results`);
                }
            }
            // 3. Hybrid Ranking
            const rawRanked = (0, memory_ranker_1.rankResults)(ftsResults, vectorResults, maxResults * 2, currentFile);
            // Map RankedResult to ScoredMemory
            ranked = rawRanked.map(r => ({
                ...r,
                matchMethod: 'hybrid'
            }));
            // 3b. Project-aware boost (memories from current project rank higher)
            if (workspaceRoot) {
                try {
                    const pkgPath = require('path').join(workspaceRoot, 'package.json');
                    let projectTag = '';
                    if (require('fs').existsSync(pkgPath)) {
                        const pkg = JSON.parse(require('fs').readFileSync(pkgPath, 'utf-8'));
                        projectTag = (pkg.name || '').toLowerCase();
                    }
                    if (!projectTag)
                        projectTag = require('path').basename(workspaceRoot).toLowerCase();
                    if (projectTag) {
                        ranked = ranked.map(r => {
                            const tags = r.memory.tags || [];
                            const hasProjectTag = tags.some(t => t.toLowerCase().includes(projectTag));
                            const hasDiffProject = tags.some(t => t.startsWith('project:') && !t.toLowerCase().includes(projectTag));
                            if (hasProjectTag)
                                return { ...r, score: r.score * 1.3 };
                            if (hasDiffProject)
                                return { ...r, score: r.score * 0.7 };
                            return r;
                        });
                        ranked.sort((a, b) => b.score - a.score);
                    }
                }
                catch { /* project detection failed — skip boost */ }
            }
            // 3c. Apply attention-based re-ranking (debugging→bugs, coding→conventions)
            const recallContext = (0, attention_ranker_1.detectActionContext)(queryText, currentFile);
            ranked = (0, attention_ranker_1.rankByAttention)(ranked, recallContext);
            // 3d. Causal chain enrichment — follow graph edges from top results
            const enriched = [];
            const seenIds = new Set();
            for (const r of ranked.slice(0, maxResults)) {
                if (seenIds.has(r.memory.id))
                    continue;
                seenIds.add(r.memory.id);
                enriched.push(r);
                // Follow 1-hop causal links for top 5 results
                if (enriched.length <= 5) {
                    try {
                        const related = memoryStore.getRelated(r.memory.id, 1, 2);
                        for (const rel of related) {
                            if (!seenIds.has(rel.memory.id)) {
                                seenIds.add(rel.memory.id);
                                enriched.push({ ...rel, score: rel.score * 0.6 });
                            }
                        }
                    }
                    catch { /* non-fatal */ }
                }
            }
            // 3b. Apply confidence decay (old unused memories rank lower)
            ranked = (0, confidence_decay_1.applyConfidenceDecay)(enriched.map(r => ({ memory: r.memory, score: r.score, matchMethod: 'hybrid' })));
            // Limit to requested count
            ranked = ranked.slice(0, maxResults);
            // 4. Touch for access tracking (reinforcement — used memories get stronger)
            if (ranked.length > 0) {
                memoryStore.runTransaction(() => {
                    for (const m of ranked) {
                        try {
                            memoryStore.touch(m.memory.id);
                        }
                        catch { /* non-fatal */ }
                    }
                });
                (0, confidence_decay_1.runDecayMaintenance)(memoryStore); // Opportunistic decay
            }
            (0, memory_cache_1.setCache)(cacheKey, ranked);
            console.log(`  [OK] ${ranked.length} results in ${Date.now() - t0}ms`);
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: (0, memory_ranker_1.formatResults)(ranked, queryText) }] },
            };
        }
        catch (err) {
            console.error(`  [ERROR] recall failed:`, err.message);
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: `Brain has ${memoryStore.activeCount()} memories but search failed: ${err.message}` }], isError: true },
            };
        }
    }
    async function handleStoreMemory(id, args) {
        const { type, content, reason, files, tags } = args;
        // Rate limit check
        const rateCheck = (0, rate_limiter_1.checkRateLimit)('store');
        if (!rateCheck.allowed) {
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: `[WARN] Rate limited: ${rateCheck.reason}` }], isError: true },
            };
        }
        if (!type || !content) {
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: 'Error: "type" and "content" are required' }], isError: true },
            };
        }
        const validTypes = {
            DECISION: types_1.MemoryType.DECISION,
            CORRECTION: types_1.MemoryType.CORRECTION,
            BUG_FIX: types_1.MemoryType.BUG_FIX,
            CONVENTION: types_1.MemoryType.CONVENTION,
            INSIGHT: types_1.MemoryType.INSIGHT,
            FAILED_SUGGESTION: types_1.MemoryType.FAILED_SUGGESTION,
            CONVERSATION: types_1.MemoryType.CONVERSATION,
            PROVEN_PATTERN: types_1.MemoryType.PROVEN_PATTERN,
        };
        const memType = validTypes[type];
        if (!memType) {
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: `Error: Invalid type "${type}". Use: DECISION, CORRECTION, BUG_FIX, CONVENTION, INSIGHT` }], isError: true },
            };
        }
        try {
            // License check — gate memory storage
            const activeCount = memoryStore.activeCount();
            const storeCheck = (0, feature_gate_1.canStoreMemory)(activeCount);
            if (!storeCheck.allowed) {
                return {
                    jsonrpc: '2.0', id,
                    result: { content: [{ type: 'text', text: storeCheck.message }], isError: true },
                };
            }
            // Input sanitization — strip control chars
            const sanitized = content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
            // Optional LLM enhancement (if API key configured)
            let enhancedTags = tags || [type.toLowerCase()];
            let enhancedAction = `Stored via MCP: ${sanitized.slice(0, 200)}`;
            if ((0, llm_enhancer_1.isLLMAvailable)()) {
                try {
                    const enhanced = await (0, llm_enhancer_1.enhanceMemory)(sanitized, { files });
                    if (enhanced.tags?.length)
                        enhancedTags = [...new Set([...enhancedTags, ...enhanced.tags])];
                    if (enhanced.action)
                        enhancedAction = enhanced.action;
                }
                catch { /* LLM failed, use defaults */ }
            }
            // Quality gate + contradiction detection
            const memory = (0, memory_quality_1.storeWithQuality)(memoryStore, {
                type: memType,
                intent: sanitized.slice(0, 300),
                action: enhancedAction,
                reason: reason || undefined,
                importance: type === 'CORRECTION' ? 0.95 : type === 'DECISION' ? 0.85 : 0.7,
                confidence: 1.0,
                tags: enhancedTags,
                relatedFiles: files || [],
            });
            if (!memory) {
                return {
                    jsonrpc: '2.0', id,
                    result: { content: [{ type: 'text', text: `Memory rejected by quality check: "${sanitized.slice(0, 100)}" — too short, too generic, or duplicate` }], isError: true },
                };
            }
            // Active contradiction detection — find and resolve conflicts
            let contradictionNote = '';
            try {
                const contradiction = (0, memory_quality_1.findContradiction)(memoryStore, sanitized, memType);
                if (contradiction) {
                    memoryStore.deactivate(contradiction.existingId, memory.id);
                    memoryStore.addEdge({
                        sourceId: contradiction.existingId,
                        targetId: memory.id,
                        relation: 'superseded_by',
                        weight: 0.95,
                        timestamp: Date.now(),
                    });
                    contradictionNote = ` [WARN] Superseded conflicting memory: "${contradiction.existingIntent.slice(0, 60)}"`;
                }
            }
            catch { /* non-fatal */ }
            // Auto-edge creation — link to recent memories of same type/files
            try {
                const recent = memoryStore.getByType(memType, 5);
                for (const r of recent) {
                    if (r.id !== memory.id) {
                        memoryStore.addEdge({
                            sourceId: memory.id,
                            targetId: r.id,
                            relation: 'related_to',
                            weight: 0.5,
                            timestamp: Date.now(),
                        });
                        break; // Link to most recent only
                    }
                }
            }
            catch { /* non-fatal */ }
            // Feed session tracker
            (0, session_tracker_1.feedSession)({ decision: `[${type}] ${sanitized.slice(0, 60)}` });
            // Queue background embedding
            if ((0, embedding_manager_1.isWorkerReady)()) {
                const embedText_ = [sanitized, reason || ''].join(' ').trim();
                (0, embedding_manager_1.embedText)(embedText_).then((vector) => {
                    memoryStore.storeVector(memory.id, new Float32Array(vector));
                }).catch(() => { });
            }
            (0, memory_cache_1.invalidateCache)();
            console.log(`  [STORE] ${type}: "${args.content.slice(0, 50)}..."`);
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: `[OK] Created memory: ${memory.id}\n(Active: ${memoryStore.activeCount()})${contradictionNote}` }] },
            };
        }
        catch (err) {
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: `Failed to store memory: ${err.message}` }], isError: true },
            };
        }
    }
    function handleGetStats(id) {
        const health = (0, usage_stats_1.calculateBrainHealth)(memoryStore);
        const lifetime = (0, usage_stats_1.getLifetimeStats)();
        const streak = (0, usage_stats_1.getStreakDisplay)();
        let llmProvider = 'none';
        try {
            if ((0, llm_enhancer_1.isLLMAvailable)())
                llmProvider = (0, llm_enhancer_1.getLLMProvider)();
        }
        catch { /* */ }
        return {
            jsonrpc: '2.0', id,
            result: {
                content: [{
                        type: 'text',
                        text: JSON.stringify({
                            activeMemories: memoryStore.activeCount(),
                            totalMemories: memoryStore.totalCount(),
                            totalEvents: eventLog.count(),
                            vectorSearchReady: (0, embedding_manager_1.isWorkerReady)(),
                            cacheSize: (0, memory_cache_1.cacheSize)(),
                            brainHealth: { score: health.score, grade: health.grade, tips: health.tips },
                            savedYouCount: lifetime.savedYouCount,
                            totalSessions: lifetime.totalSessions,
                            timeSaved: lifetime.totalMemoriesServed * 15 + lifetime.totalHallucationsCaught * 300,
                            streak: streak || 'Day 1',
                            longestStreak: lifetime.longestStreak || 0,
                            totalAutoLearns: lifetime.totalAutoLearns,
                            successPatternsLearned: lifetime.totalSuccessPatterns || 0,
                            errorsLearned: lifetime.totalErrorsLearned || 0,
                            llmProvider,
                        }, null, 2),
                    }],
            },
        };
    }
    // --- New Tool Handlers ---
    async function handleScanProject(id, args) {
        const root = args.workspaceRoot || workspaceRoot;
        if (!root) {
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: 'Error: workspaceRoot is required' }], isError: true },
            };
        }
        try {
            const scanner = new project_scanner_1.ProjectScanner(memoryStore, root);
            const count = await scanner.scan();
            // Deep scan: Export Map (anti-hallucination) + Architecture Graph
            let extraMemories = 0;
            try {
                const exportMap = (0, export_map_1.buildExportMap)(root);
                extraMemories += (0, export_map_1.storeExportMap)(memoryStore, exportMap);
            }
            catch { /* non-fatal */ }
            try {
                const archGraph = (0, architecture_graph_1.buildArchitectureGraph)(root);
                extraMemories += (0, architecture_graph_1.storeArchitectureGraph)(memoryStore, archGraph);
            }
            catch { /* non-fatal */ }
            // Convention auto-detection — analyze actual code patterns
            try {
                const conventions = (0, convention_detector_1.detectConventions)(root);
                for (const conv of conventions) {
                    try {
                        (0, memory_quality_1.storeWithQuality)(memoryStore, {
                            type: 'CONVENTION',
                            intent: conv.pattern,
                            action: conv.evidence,
                            reason: `Auto-detected from code (${conv.category}, confidence: ${conv.confidence})`,
                            confidence: conv.confidence,
                            importance: conv.confidence,
                            tags: ['convention', 'auto-detected', conv.category],
                        });
                        extraMemories++;
                    }
                    catch { /* skip duplicates */ }
                }
            }
            catch { /* non-fatal */ }
            (0, memory_cache_1.invalidateCache)();
            (0, usage_stats_1.trackScan)();
            const total = count + extraMemories;
            // Report knowledge gaps after scan
            let gapReport = '';
            try {
                const gaps = (0, meta_memory_1.detectKnowledgeGaps)(memoryStore, root);
                if (gaps.length > 0) {
                    gapReport = `\n\n${(0, meta_memory_1.formatKnowledgeGaps)(gaps)}`;
                }
            }
            catch { /* non-fatal */ }
            return {
                jsonrpc: '2.0', id,
                result: {
                    content: [{
                            type: 'text',
                            text: total > 0
                                ? `Project scanned successfully. ${total} memories created (stack, structure, config, git history, export map, architecture graph, coding conventions).${gapReport}`
                                : `Project was already scanned. No new memories created.${gapReport}`,
                        }],
                },
            };
        }
        catch (err) {
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: `Scan error: ${err.message}` }], isError: true },
            };
        }
    }
    function handleVerifyFiles(id, args) {
        const root = args.workspaceRoot || workspaceRoot;
        if (!root || !args.text) {
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: 'Error: text and workspaceRoot are required' }], isError: true },
            };
        }
        try {
            const verifier = new file_verifier_1.FileVerifier(root);
            const result = verifier.verifyText(args.text);
            const lines = [];
            if (result.valid.length > 0) {
                lines.push(`[OK] Valid paths (${result.valid.length}): ${result.valid.join(', ')}`);
            }
            if (result.invalid.length > 0) {
                lines.push(`[FAIL] Hallucinated paths (${result.invalid.length}): ${result.invalid.join(', ')}`);
                for (const [bad, suggestions] of Object.entries(result.suggestions)) {
                    lines.push(`   ${bad} → did you mean: ${suggestions.join(' or ')}?`);
                }
            }
            if (result.valid.length === 0 && result.invalid.length === 0) {
                lines.push('No file paths detected in the text.');
            }
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: lines.join('\n') }] },
            };
        }
        catch (err) {
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: `Verify error: ${err.message}` }], isError: true },
            };
        }
    }
    function handleGetContext(id, args) {
        try {
            const builder = getContextBuilder(memoryStore);
            const context = builder.build({
                currentFile: args.currentFile,
                maxChars: args.maxChars,
            });
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: context }] },
            };
        }
        catch (err) {
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: `Context error: ${err.message}` }], isError: true },
            };
        }
    }
    function handleVerifyCode(id, args) {
        const root = args.workspaceRoot || workspaceRoot;
        if (!root || !args.code) {
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: 'Error: code and workspaceRoot are required' }], isError: true },
            };
        }
        try {
            // Track file for relationship mapping
            if (args.filename)
                (0, file_relationships_1.recordFileEdit)(args.filename);
            const result = (0, code_verifier_1.verifyCode)(args.code, root);
            const lines = [];
            // Imports
            if (result.imports.valid.length > 0 || result.imports.invalid.length > 0) {
                lines.push('## Package Imports');
                if (result.imports.valid.length > 0) {
                    lines.push(`[OK] Valid: ${result.imports.valid.join(', ')}`);
                }
                if (result.imports.invalid.length > 0) {
                    lines.push(`[FAIL] NOT IN package.json: ${result.imports.invalid.join(', ')}`);
                    for (const [bad, suggestions] of Object.entries(result.imports.suggestions)) {
                        lines.push(`   ${bad} → did you mean: ${suggestions.join(' or ')}?`);
                    }
                }
            }
            // Exports
            if (result.exports.valid.length > 0 || result.exports.invalid.length > 0) {
                lines.push('\n## Function/Class Exports');
                if (result.exports.valid.length > 0) {
                    lines.push(`[OK] Valid: ${result.exports.valid.join(', ')}`);
                }
                if (result.exports.invalid.length > 0) {
                    lines.push(`[FAIL] NOT EXPORTED: ${result.exports.invalid.join(', ')}`);
                    for (const [file, available] of Object.entries(result.exports.available)) {
                        lines.push(`   ${file} exports: ${available.join(', ')}`);
                    }
                    // Smart fix suggestions — find closest real exports
                    try {
                        const wsRoot = args.workspaceRoot || workspaceRoot;
                        if (wsRoot) {
                            const exportMap = (0, export_map_1.buildExportMap)(wsRoot);
                            for (const invalid of result.exports.invalid) {
                                const suggestions = (0, export_map_2.suggestRealExport)(exportMap, invalid);
                                if (suggestions.length > 0) {
                                    lines.push(`   💡 Did you mean: ${suggestions.slice(0, 3).join(', ')}?`);
                                }
                            }
                        }
                    }
                    catch { /* non-fatal */ }
                }
            }
            // Env vars
            if (result.envVars.valid.length > 0 || result.envVars.invalid.length > 0) {
                lines.push('\n## Environment Variables');
                if (result.envVars.valid.length > 0) {
                    lines.push(`[OK] Valid: ${result.envVars.valid.join(', ')}`);
                }
                if (result.envVars.invalid.length > 0) {
                    lines.push(`[FAIL] NOT IN .env: ${result.envVars.invalid.join(', ')}`);
                    if (result.envVars.available.length > 0) {
                        lines.push(`   Available vars: ${result.envVars.available.join(', ')}`);
                    }
                }
            }
            if (lines.length === 0) {
                lines.push('No imports, exports, or env vars detected in the code.');
            }
            // Track hallucination catches for usage stats
            const catchCount = result.imports.invalid.length + result.exports.invalid.length + result.envVars.invalid.length;
            if (catchCount > 0) {
                for (let i = 0; i < catchCount; i++)
                    (0, usage_stats_1.trackCatch)();
            }
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: lines.join('\n') }] },
            };
        }
        catch (err) {
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: `Verify error: ${err.message}` }], isError: true },
            };
        }
    }
    function handleQuickStore(id, args) {
        // Rate limit check
        const rateCheck = (0, rate_limiter_1.checkRateLimit)('store');
        if (!rateCheck.allowed) {
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: `[WARN] Rate limited: ${rateCheck.reason}` }], isError: true },
            };
        }
        const text = args.memory?.trim();
        if (!text || text.length < 5) {
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: 'Error: provide a memory sentence (min 5 chars)' }], isError: true },
            };
        }
        // Auto-classify based on keywords
        const lower = text.toLowerCase();
        let type;
        let label;
        if (/\b(don'?t|never|wrong|instead|not|avoid|stop|incorrect)\b/.test(lower)) {
            type = types_1.MemoryType.CORRECTION;
            label = 'CORRECTION';
        }
        else if (/\b(fix|bug|broke|crash|error|patch|regression)\b/.test(lower)) {
            type = types_1.MemoryType.BUG_FIX;
            label = 'BUG_FIX';
        }
        else if (/\b(always|convention|style|format|standard|rule|must)\b/.test(lower)) {
            type = types_1.MemoryType.CONVENTION;
            label = 'CONVENTION';
        }
        else if (/\b(use|chose|decided|pick|select|go with|switch to|migrate)\b/.test(lower)) {
            type = types_1.MemoryType.DECISION;
            label = 'DECISION';
        }
        else {
            type = types_1.MemoryType.INSIGHT;
            label = 'INSIGHT';
        }
        try {
            const sanitized = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
            const memory = (0, memory_quality_1.storeWithQuality)(memoryStore, {
                type,
                intent: sanitized.slice(0, 300),
                action: `Quick-stored: ${sanitized.slice(0, 200)}`,
                importance: type === types_1.MemoryType.CORRECTION ? 0.95 : type === types_1.MemoryType.DECISION ? 0.85 : 0.7,
                confidence: 1.0,
                tags: [label.toLowerCase()],
                relatedFiles: [],
            });
            if (!memory) {
                return {
                    jsonrpc: '2.0', id,
                    result: { content: [{ type: 'text', text: `Rejected: too short, generic, or duplicate` }], isError: true },
                };
            }
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: `Memory stored as ${label}: "${sanitized.slice(0, 100)}"` }] },
            };
        }
        catch (err) {
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: `Store error: ${err.message}` }], isError: true },
            };
        }
    }
    async function handleForceRecall(id, args) {
        try {
            // Fix #17: Cache force_recall with short TTL to avoid redundant rebuilds
            const cacheKey = `force_recall:${args.topic || ''}:${args.currentFile || ''}`;
            const cached = (0, memory_cache_1.getCached)(cacheKey);
            if (cached) {
                console.log(`  [CACHE] force_recall hit`);
                return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: cached }] } };
            }
            const parts = [];
            // ─── BRAIN LAYER 0: End previous session + start new one ─────────
            (0, session_tracker_1.endSession)(memoryStore); // Save previous session summary
            (0, file_relationships_1.storeRelationships)(memoryStore); // Persist file co-edit relationships
            (0, session_tracker_1.startSession)();
            (0, usage_stats_1.resetSessionStats)();
            if (args.topic)
                (0, session_tracker_1.feedSession)({ topic: args.topic });
            // ─── Project Detection (for project isolation) ───────────────────
            let projectName = '';
            if (workspaceRoot) {
                try {
                    const pkgPath = require('path').join(workspaceRoot, 'package.json');
                    if (require('fs').existsSync(pkgPath)) {
                        const pkg = JSON.parse(require('fs').readFileSync(pkgPath, 'utf-8'));
                        projectName = pkg.name || require('path').basename(workspaceRoot);
                    }
                    else {
                        projectName = require('path').basename(workspaceRoot);
                    }
                }
                catch {
                    projectName = require('path').basename(workspaceRoot || '');
                }
                if (projectName) {
                    (0, session_tracker_1.feedSession)({ project: projectName });
                }
            }
            // ─── BRAIN LAYER 0.5: Auto-scan on first run (Day 1 Empty Brain fix) ───
            if (memoryStore.activeCount() === 0 && workspaceRoot) {
                try {
                    console.log(`  [AUTO-SCAN] First run detected — scanning project...`);
                    const scanner = new project_scanner_1.ProjectScanner(memoryStore, workspaceRoot);
                    const scanCount = await scanner.scan();
                    let extraMemories = 0;
                    try {
                        extraMemories += (0, export_map_1.storeExportMap)(memoryStore, (0, export_map_1.buildExportMap)(workspaceRoot));
                    }
                    catch { }
                    try {
                        extraMemories += (0, architecture_graph_1.storeArchitectureGraph)(memoryStore, (0, architecture_graph_1.buildArchitectureGraph)(workspaceRoot));
                    }
                    catch { }
                    const total = scanCount + extraMemories;
                    if (total > 0) {
                        parts.push(`## Welcome to Cortex\n\nFirst run detected — auto-scanned your project and created ${total} memories (stack, structure, config, git history, exports, architecture). Cortex will now remember everything across sessions.`);
                        (0, memory_cache_1.invalidateCache)();
                        (0, usage_stats_1.trackScan)();
                    }
                }
                catch (scanErr) {
                    console.log(`  [AUTO-SCAN] Failed: ${scanErr.message}`);
                }
            }
            // ─── BRAIN LAYER 1: Maintenance (runs in background) ─────────────
            try {
                // Decay old unused memories
                (0, confidence_decay_1.runDecayMaintenance)(memoryStore);
                // Boost frequently corrected topics
                (0, learning_rate_1.boostFrequentCorrections)(memoryStore);
                // Consolidate similar memories if needed
                if ((0, memory_consolidator_1.shouldConsolidate)(memoryStore)) {
                    (0, memory_consolidator_1.consolidateMemories)(memoryStore);
                }
            }
            catch { /* maintenance errors are non-fatal */ }
            // ─── BRAIN LAYER 2: Attention Context ────────────────────────────
            const actionContext = (0, feature_gate_1.isFeatureAllowed)('attentionRanking') ? (0, attention_ranker_1.detectActionContext)(args.topic, args.currentFile) : {};
            const attentionLabel = (0, feature_gate_1.isFeatureAllowed)('attentionRanking') ? (0, attention_ranker_1.formatAttentionContext)(actionContext) : '';
            if (attentionLabel)
                parts.push(attentionLabel);
            // ─── BRAIN LAYER 3: Session Continuity ───────────────────────────
            const sessions = (0, session_tracker_1.getRecentSessions)(memoryStore, 3);
            if (sessions.length > 0) {
                parts.push('\n## 🧵 Recent Sessions (where we left off)');
                for (const s of sessions)
                    parts.push(s);
            }
            // ─── BRAIN LAYER 4: Hot Corrections (learning rate) ──────────────
            const hotCorrections = (0, learning_rate_1.formatHotCorrections)(memoryStore);
            if (hotCorrections)
                parts.push('\n' + hotCorrections);
            // ─── BRAIN LAYER 5: Core Context (corrections, decisions, etc) ───
            const builder = getContextBuilder(memoryStore);
            const fullContext = builder.build({
                currentFile: args.currentFile,
                maxChars: 8000, // leave room for brain layers
            });
            parts.push(fullContext);
            // ─── BRAIN LAYERS 6-12: Run in parallel (independent of each other) ───
            const parallelResults = await Promise.allSettled([
                // Layer 6: Anticipation
                (async () => {
                    if (args.currentFile && (0, feature_gate_1.isFeatureAllowed)('anticipation')) {
                        return (0, anticipation_engine_1.formatAnticipation)((0, anticipation_engine_1.anticipate)(memoryStore, args.currentFile));
                    }
                    return '';
                })(),
                // Layer 6.5: Proactive Warnings — ⚠️ for files with past bugs/corrections
                (async () => {
                    if (!args.currentFile)
                        return '';
                    try {
                        const fileMemories = memoryStore.getByFile(args.currentFile, 50);
                        const warnings = fileMemories.filter((m) => (m.type === 'CORRECTION' || m.type === 'BUG_FIX') && m.is_active);
                        if (warnings.length === 0)
                            return '';
                        const lines = warnings.slice(0, 5).map((m) => `⚠️ **${m.type}**: ${m.intent}${m.reason && !m.reason.startsWith('Auto-detected') ? ` — _${m.reason}_` : ''}`);
                        return `\n## ⚠️ Watch Out (past issues with this file)\n${lines.join('\n')}`;
                    }
                    catch {
                        return '';
                    }
                })(),
                // Layer 7: Temporal Context
                (async () => {
                    if ((0, feature_gate_1.isFeatureAllowed)('temporalContext')) {
                        return (0, temporal_engine_1.formatTemporalContext)(memoryStore);
                    }
                    return '';
                })(),
                // Layer 8: Workspace State (git)
                (async () => {
                    try {
                        return (0, temporal_engine_1.getWorkspaceDiff)(workspaceRoot || '');
                    }
                    catch {
                        return '';
                    }
                })(),
                // Layer 8.5: Git Memory
                (async () => {
                    if (!(0, feature_gate_1.isFeatureAllowed)('gitMemory'))
                        return '';
                    try {
                        const commitsCaptured = (0, git_memory_1.captureGitCommits)(memoryStore, workspaceRoot || '', 5);
                        const commitText = commitsCaptured > 0
                            ? `\n> Captured ${commitsCaptured} new git commit(s) as memories`
                            : '';
                        const fileChanges = (0, git_memory_1.detectFileChanges)(workspaceRoot || '');
                        const fileChangeText = (0, git_memory_1.formatFileChanges)(fileChanges);
                        return [commitText, fileChangeText].filter(Boolean).join('\n');
                    }
                    catch {
                        return '';
                    }
                })(),
                // Layer 9: Topic Search — Hybrid (FTS + Vector) for deeper relevance
                (async () => {
                    if (!args.topic)
                        return '';
                    try {
                        // FTS search
                        const ftsResults = memoryStore.searchFTS(args.topic, 15);
                        // Vector search (semantic — catches what FTS misses)
                        let vectorResults = [];
                        if ((0, embedding_manager_1.isWorkerReady)()) {
                            try {
                                const topicEmbedding = await (0, embedding_manager_1.embedText)(args.topic);
                                vectorResults = memoryStore.searchVector(new Float32Array(topicEmbedding), 10);
                            }
                            catch { /* vector search failure is non-fatal */ }
                        }
                        // Merge FTS + Vector, deduplicate by ID
                        const merged = (0, memory_ranker_1.rankResults)(ftsResults, vectorResults, 20, args.currentFile);
                        let ranked = merged.map(r => ({ ...r, matchMethod: 'hybrid' }));
                        ranked = (0, confidence_decay_1.applyConfidenceDecay)(ranked);
                        ranked = (0, attention_ranker_1.rankByAttention)(ranked, actionContext);
                        const seen = new Set();
                        const enriched = [];
                        for (const r of ranked) {
                            if (seen.has(r.memory.id))
                                continue;
                            seen.add(r.memory.id);
                            enriched.push(r);
                            try {
                                const related = memoryStore.getRelated(r.memory.id, 1, 3);
                                for (const rel of related) {
                                    if (!seen.has(rel.memory.id)) {
                                        seen.add(rel.memory.id);
                                        enriched.push({ ...rel, score: rel.score * 0.7 });
                                    }
                                }
                            }
                            catch { }
                        }
                        if (enriched.length > 0) {
                            const lines = ['\n## Topic: "' + args.topic + '"'];
                            for (const m of enriched.slice(0, 15)) {
                                lines.push(`- [${m.memory.type}] ${m.memory.intent}${m.memory.reason ? ` — ${m.memory.reason}` : ''}`);
                            }
                            return lines.join('\n');
                        }
                        return '';
                    }
                    catch {
                        return '\n> Note: Topic search unavailable (FTS index needs rebuild).';
                    }
                })(),
                // Layer 10: Knowledge Gaps (skip when topic is specific — saves tokens)
                (async () => {
                    if (args.topic)
                        return ''; // Skip heavy layer for focused queries
                    try {
                        const gaps = (0, meta_memory_1.detectKnowledgeGaps)(memoryStore, workspaceRoot || '');
                        return (0, meta_memory_1.formatKnowledgeGaps)(gaps);
                    }
                    catch {
                        return '';
                    }
                })(),
                // Layer 11: Export Map (skip when topic is specific — saves tokens)
                (async () => {
                    if (args.topic)
                        return ''; // Skip heavy layer for focused queries
                    if (!workspaceRoot || !(0, feature_gate_1.isFeatureAllowed)('exportMap'))
                        return '';
                    try {
                        const exportMap = (0, export_map_1.buildExportMap)(workspaceRoot);
                        return exportMap.totalExports > 0 ? (0, export_map_1.formatExportMap)(exportMap) : '';
                    }
                    catch {
                        return '';
                    }
                })(),
                // Layer 12: Architecture Graph (skip when topic is specific — saves tokens)
                (async () => {
                    if (args.topic)
                        return ''; // Skip heavy layer for focused queries
                    if (!workspaceRoot || !(0, feature_gate_1.isFeatureAllowed)('architectureGraph'))
                        return '';
                    try {
                        const archGraph = (0, architecture_graph_1.buildArchitectureGraph)(workspaceRoot);
                        return archGraph.totalFiles > 0 ? (0, architecture_graph_1.formatArchitectureGraph)(archGraph) : '';
                    }
                    catch {
                        return '';
                    }
                })(),
            ]);
            // Collect results (in order) — only push non-empty strings
            for (const result of parallelResults) {
                if (result.status === 'fulfilled' && result.value) {
                    parts.push('\n' + result.value);
                }
            }
            // ─── SMART CONTEXT SELECTION: Priority-based trimming ────────────
            // Instead of dumb slicing, trim lowest-priority sections first
            const MAX_CHARS = 12000; // ~3000 tokens — fits any model
            let output = parts.join('\n');
            if (output.length > MAX_CHARS) {
                // Priority: highest first (kept), lowest first (trimmed)
                // Layers 0-5 are high priority (welcome, sessions, corrections, core context)
                // Layers 6-12 are lower priority (anticipation, temporal, git, topic, gaps, exports, arch)
                // Trim from end (lowest priority) working backwards
                while (output.length > MAX_CHARS && parts.length > 4) {
                    parts.pop(); // Remove lowest-priority section
                    output = parts.join('\n');
                }
                if (output.length > MAX_CHARS) {
                    output = output.slice(0, MAX_CHARS);
                }
                output += '\n\n> (Some context trimmed to fit token budget. Use `recall_memory` for specific queries.)';
            }
            // Track usage stats
            const memoriesInOutput = (output.match(/\[(?:CORRECTION|DECISION|CONVENTION|BUG_FIX|INSIGHT)\]/g) || []).length;
            (0, usage_stats_1.trackRecall)(memoriesInOutput);
            // Inject contextual instructions (DO/DON'T/WATCH-OUT)
            try {
                const instructions = (0, instructions_generator_1.generateInstructions)(memoryStore);
                const instructionText = (0, instructions_generator_1.formatInstructions)(instructions);
                if (instructionText)
                    output += '\n\n' + instructionText;
            }
            catch { /* non-fatal */ }
            // Inject tool recommendations (what to use based on context)
            try {
                const recs = (0, tool_recommender_1.recommendTools)({
                    topic: args.topic,
                    currentFile: args.currentFile,
                    isNewConversation: true,
                });
                const recText = (0, tool_recommender_1.formatRecommendations)(recs);
                if (recText)
                    output += '\n\n' + recText;
            }
            catch { /* non-fatal */ }
            // Inject user preferences (adapts AI behavior)
            try {
                const prefText = (0, preference_learner_1.getStoredPreferences)(memoryStore);
                if (prefText)
                    output += '\n\n' + prefText;
            }
            catch { /* non-fatal */ }
            // Append stats footer (makes value visible — THE KEY TO ADDICTION)
            const statsFooter = (0, usage_stats_1.formatStatsFooter)(memoryStore);
            if (statsFooter)
                output += statsFooter;
            // Count corrections recalled as "saved you" moments
            const correctionsRecalled = (output.match(/\[CORRECTION\]/g) || []).length;
            for (let i = 0; i < correctionsRecalled; i++)
                (0, usage_stats_1.trackSaved)();
            // Cache the result for short-lived reuse
            (0, memory_cache_1.setCache)(cacheKey, output);
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: output }] },
            };
        }
        catch (err) {
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: `Force recall error: ${err.message}` }], isError: true },
            };
        }
    }
    // ─── REVIEW CODE: Check against conventions + past bugs ─────────────
    function handleReviewCode(id, args) {
        try {
            const code = args.code;
            const filename = args.filename || '';
            if (!code || code.length < 10) {
                return {
                    jsonrpc: '2.0', id,
                    result: { content: [{ type: 'text', text: 'Error: provide code to review (min 10 chars)' }], isError: true },
                };
            }
            const violations = [];
            const suggestions = [];
            const codeLower = code.toLowerCase();
            // Check against stored CONVENTIONS
            const conventions = memoryStore.getByType('CONVENTION', 100);
            for (const conv of conventions) {
                const intentLower = conv.intent.toLowerCase();
                // Check for common pattern violations
                if (intentLower.includes('never use') || intentLower.includes("don't use") || intentLower.includes('avoid')) {
                    // Extract the forbidden thing
                    const match = intentLower.match(/(?:never use|don't use|avoid)\s+(\w+(?:\s+\w+)?)/i);
                    if (match) {
                        const forbidden = match[1].toLowerCase();
                        if (codeLower.includes(forbidden)) {
                            violations.push(`⚠️ **Convention Violation** \`id:${conv.id}\`: "${conv.intent}" — Found \`${forbidden}\` in your code`);
                        }
                    }
                }
                if (intentLower.includes('always use') || intentLower.includes('must use')) {
                    const match = intentLower.match(/(?:always use|must use)\s+(\w+(?:\s+\w+)?)/i);
                    if (match) {
                        const required = match[1].toLowerCase();
                        if (!codeLower.includes(required) && code.length > 50) {
                            suggestions.push(`💡 **Convention Suggestion** \`id:${conv.id}\`: "${conv.intent}" — Consider using \`${required}\``);
                        }
                    }
                }
            }
            // Check against stored BUG_FIX patterns
            const bugFixes = memoryStore.getByType('BUG_FIX', 50);
            for (const bug of bugFixes) {
                const bugLower = bug.intent.toLowerCase();
                // Extract key terms from bug description
                const bugTerms = bugLower.split(/\s+/).filter(w => w.length > 4);
                const matchCount = bugTerms.filter(t => codeLower.includes(t)).length;
                if (matchCount >= 3) {
                    violations.push(`🐛 **Similar Bug Pattern** \`id:${bug.id}\`: "${bug.intent}" — This code has similarities to a past bug`);
                }
            }
            // Check for CORRECTION patterns
            const corrections = memoryStore.getByType('CORRECTION', 50);
            for (const corr of corrections) {
                const corrLower = corr.intent.toLowerCase();
                const corrTerms = corrLower.split(/\s+/).filter(w => w.length > 4);
                const matchCount = corrTerms.filter(t => codeLower.includes(t)).length;
                if (matchCount >= 3) {
                    violations.push(`🔄 **Past Correction Applies** \`id:${corr.id}\`: "${corr.intent}"`);
                }
            }
            // File-specific memories
            if (filename) {
                const fileMemories = memoryStore.getByFile(filename, 10);
                for (const fm of fileMemories) {
                    suggestions.push(`📄 **File Note** \`id:${fm.id}\`: "${fm.intent}"`);
                }
            }
            (0, usage_stats_1.trackReview)();
            const lines = ['# Cortex Code Review\n'];
            if (violations.length > 0) {
                lines.push(`## ⚠️ ${violations.length} Issue${violations.length > 1 ? 's' : ''} Found\n`);
                violations.forEach(v => lines.push(v));
            }
            if (suggestions.length > 0) {
                lines.push(`\n## 💡 ${suggestions.length} Suggestion${suggestions.length > 1 ? 's' : ''}\n`);
                suggestions.forEach(s => lines.push(s));
            }
            if (violations.length === 0 && suggestions.length === 0) {
                lines.push('✅ **No issues found.** Code looks clean against your stored conventions and past bugs.');
                lines.push(`\n_Checked against ${conventions.length} conventions, ${bugFixes.length} bug fixes, ${corrections.length} corrections._`);
            }
            else {
                lines.push(`\n_Reviewed against ${conventions.length} conventions, ${bugFixes.length} bug fixes, ${corrections.length} corrections._`);
            }
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: lines.join('\n') }] },
            };
        }
        catch (err) {
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: `Review error: ${err.message}` }], isError: true },
            };
        }
    }
    function handleUpdateMemory(id, args) {
        try {
            const memoryId = args.id;
            const newContent = args.content;
            const reason = args.reason || 'Updated by AI';
            if (!memoryId || !newContent) {
                return {
                    jsonrpc: '2.0', id,
                    result: { content: [{ type: 'text', text: 'Error: id and content are required' }], isError: true },
                };
            }
            // Get the existing memory
            const existing = memoryStore.get(memoryId);
            if (!existing) {
                return {
                    jsonrpc: '2.0', id,
                    result: { content: [{ type: 'text', text: `Error: Memory ${memoryId} not found` }], isError: true },
                };
            }
            // Create the new (replacement) memory
            const newMemory = memoryStore.add({
                type: existing.type,
                intent: newContent,
                action: newContent,
                reason,
                tags: existing.tags,
                relatedFiles: existing.relatedFiles,
                confidence: existing.confidence,
                importance: existing.importance,
            });
            // Deactivate the old memory, pointing to the new one
            memoryStore.deactivate(memoryId, newMemory.id);
            (0, memory_cache_1.invalidateCache)();
            return {
                jsonrpc: '2.0', id,
                result: {
                    content: [{
                            type: 'text',
                            text: `Memory updated.\n\nOld: "${existing.intent}"\nNew: "${newContent}"\nReason: ${reason}\n\nOld memory deactivated (ID: ${memoryId})\nNew memory ID: ${newMemory.id}`,
                        }],
                },
            };
        }
        catch (err) {
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: `Update error: ${err.message}` }], isError: true },
            };
        }
    }
    function handleListMemories(id, args) {
        try {
            const filterType = args?.type && args.type !== 'ALL' ? args.type : null;
            const limit = args?.limit || 20;
            const TYPES = ['CORRECTION', 'DECISION', 'CONVENTION', 'BUG_FIX', 'INSIGHT'];
            const typesToShow = filterType ? [filterType] : TYPES;
            const parts = ['# Cortex Memory Bank\n'];
            let totalCount = 0;
            for (const type of typesToShow) {
                const memories = memoryStore.getByType(type, limit);
                if (memories.length === 0)
                    continue;
                const emoji = {
                    CORRECTION: '[COR]', DECISION: '[DEC]', CONVENTION: '[CON]',
                    BUG_FIX: '[BUG]', INSIGHT: '[INS]',
                };
                parts.push(`## ${emoji[type] || '[---]'} ${type} (${memories.length})\n`);
                for (const m of memories) {
                    const age = Math.floor((Date.now() - m.createdAt) / (24 * 60 * 60 * 1000));
                    const accessed = m.accessCount > 0 ? ` · accessed ${m.accessCount}x` : '';
                    parts.push(`- **${m.intent}**`);
                    parts.push(`  \`id: ${m.id}\` · ${age}d old${accessed}`);
                    if (m.reason)
                        parts.push(`  _${m.reason}_`);
                }
                parts.push('');
                totalCount += memories.length;
            }
            if (totalCount === 0) {
                parts.push('_No memories stored yet. Use `quick_store` to add some._');
            }
            else {
                parts.push(`\n_Total: ${totalCount} active memories. Use \`update_memory\` or \`delete_memory\` with the ID shown._`);
            }
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: parts.join('\n') }] },
            };
        }
        catch (err) {
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: `List error: ${err.message}` }], isError: true },
            };
        }
    }
    function handleDeleteMemory(id, args) {
        try {
            const memoryId = args.id;
            const reason = args.reason || 'Deleted by AI';
            if (!memoryId) {
                return {
                    jsonrpc: '2.0', id,
                    result: { content: [{ type: 'text', text: 'Error: id is required' }], isError: true },
                };
            }
            const existing = memoryStore.get(memoryId);
            if (!existing) {
                return {
                    jsonrpc: '2.0', id,
                    result: { content: [{ type: 'text', text: `Error: Memory ${memoryId} not found` }], isError: true },
                };
            }
            if (!existing.isActive) {
                return {
                    jsonrpc: '2.0', id,
                    result: { content: [{ type: 'text', text: `Memory ${memoryId} is already inactive` }], isError: true },
                };
            }
            memoryStore.deactivate(memoryId);
            (0, memory_cache_1.invalidateCache)();
            return {
                jsonrpc: '2.0', id,
                result: {
                    content: [{
                            type: 'text',
                            text: `Memory deleted.\n\nContent: "${existing.intent}"\nType: ${existing.type}\nReason: ${reason}\n\nMemory ID ${memoryId} has been deactivated.`,
                        }],
                },
            };
        }
        catch (err) {
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: `Delete error: ${err.message}` }], isError: true },
            };
        }
    }
    async function handleAutoLearn(id, args) {
        try {
            // Feature gate (launch mode: all features unlocked)
            if (!(0, feature_gate_1.isFeatureAllowed)('autoLearn')) {
                return {
                    jsonrpc: '2.0', id,
                    result: { content: [{ type: 'text', text: (0, feature_gate_1.getUpgradeMessage)('auto_learn') }] },
                };
            }
            // Rate limit check
            const rateCheck = (0, rate_limiter_1.checkRateLimit)('auto_learn');
            if (!rateCheck.allowed) {
                return {
                    jsonrpc: '2.0', id,
                    result: { content: [{ type: 'text', text: `(auto_learn rate limited: ${rateCheck.reason})` }] },
                };
            }
            const text = args.text;
            if (!text || text.length < 20) {
                return {
                    jsonrpc: '2.0', id,
                    result: { content: [{ type: 'text', text: '(auto_learn: text too short, nothing extracted)' }] },
                };
            }
            // Extract memory-worthy patterns (regex-based)
            const extracted = (0, auto_learner_1.extractMemories)(text);
            (0, usage_stats_1.trackAutoLearn)(); // Track for Brain Health Score + Streak
            // SUCCESS DETECTION: capture proven approaches
            try {
                const successSignals = (0, success_tracker_1.detectSuccess)(text);
                for (const signal of successSignals) {
                    const successMemory = (0, success_tracker_1.buildSuccessMemory)(signal, text);
                    extracted.push({
                        type: 'INSIGHT',
                        content: successMemory.intent,
                        confidence: signal.confidence,
                        reason: successMemory.reason,
                    });
                    (0, usage_stats_1.trackSuccess)();
                }
            }
            catch { /* success detection failed — non-fatal */ }
            // ERROR FINGERPRINT: capture error patterns for instant recall
            try {
                if ((0, error_learner_1.containsErrors)(text)) {
                    const errorPatterns = (0, error_learner_1.extractErrorPatterns)(text);
                    for (const ep of errorPatterns.slice(0, 3)) {
                        extracted.push({
                            type: 'BUG_FIX',
                            content: ep.message,
                            confidence: ep.confidence,
                            reason: `Error pattern: ${ep.errorType} — auto-captured for instant fix recall`,
                        });
                        (0, usage_stats_1.trackErrorLearned)();
                    }
                }
            }
            catch { /* error learning failed — non-fatal */ }
            // COMPLETION DETECTION: demote old memories about completed topics
            try {
                const completionSignals = (0, completion_resolver_1.detectCompletion)(text);
                for (const signal of completionSignals) {
                    const resolved = (0, completion_resolver_1.resolveRelatedMemories)(memoryStore, signal.topic, signal.confidence);
                    if (resolved > 0) {
                        console.log(`  🏁 Completion: "${signal.topic}" — demoted ${resolved} old memories`);
                        (0, memory_cache_1.invalidateCache)();
                    }
                }
            }
            catch { /* completion detection failed — non-fatal */ }
            // LLM enhancement: when API key is available and regex found nothing,
            // use LLM to catch implicit patterns that keywords miss
            if (extracted.length === 0 && (0, llm_enhancer_1.isLLMAvailable)() && text.length > 50) {
                try {
                    const llmResult = await (0, llm_enhancer_1.enhanceMemory)(text);
                    if (llmResult && llmResult.intent && llmResult.intent.length > 10) {
                        extracted.push({
                            type: (llmResult.type || 'INSIGHT'),
                            content: llmResult.intent,
                            confidence: 0.7,
                            reason: 'LLM-extracted (regex missed this)',
                        });
                    }
                }
                catch { /* LLM failed, fall through to no-patterns path */ }
            }
            if (extracted.length === 0) {
                // Still feed session even if no patterns extracted (for topic tracking)
                if (text.length > 50) {
                    (0, session_tracker_1.feedSession)({ topic: text.slice(0, 80) });
                }
                return {
                    jsonrpc: '2.0', id,
                    result: { content: [{ type: 'text', text: '(auto_learn: no memory-worthy patterns detected)' }] },
                };
            }
            // Store each extracted memory + feed session tracker
            // --- Helper: Independent importance scoring ---
            function calculateImportance(item) {
                // Base importance by type (corrections/bugs are more important than insights)
                const TYPE_IMPORTANCE = {
                    CORRECTION: 0.85, BUG_FIX: 0.85, CONVENTION: 0.80,
                    DECISION: 0.75, GOTCHA: 0.75, BUSINESS_RULE: 0.70,
                    FAILED_ATTEMPT: 0.65, CURRENT_TASK: 0.60, INSIGHT: 0.55,
                };
                let importance = TYPE_IMPORTANCE[item.type] || 0.60;
                // Boost for content signals that indicate higher value
                if (/\b(always|never|must|critical|important|breaking)\b/i.test(item.content))
                    importance += 0.08;
                if (/\b(error|bug|crash|fail|exception)\b/i.test(item.content))
                    importance += 0.05;
                if (/\.(ts|js|py|go|rs|java|tsx|jsx)\b/.test(item.content))
                    importance += 0.03; // file-specific
                if (/v?\d+\.\d+/.test(item.content))
                    importance += 0.02; // version numbers
                // Blend with regex confidence (40% type-based, 60% regex confidence)
                importance = importance * 0.4 + item.confidence * 0.6;
                return Math.min(importance, 1.0);
            }
            // --- Helper: Extract topic tags from content ---
            function extractTopicTags(item) {
                const tags = [item.type.toLowerCase()];
                const content = item.content.toLowerCase();
                // Extract technology/framework mentions
                const techPatterns = /\b(react|vue|angular|next\.?js|node|express|typescript|javascript|python|rust|go|docker|kubernetes|postgres|mongodb|redis|graphql|rest|api|css|html|webpack|vite|eslint|git|npm|yarn)\b/gi;
                const techMatches = item.content.match(techPatterns);
                if (techMatches) {
                    for (const tech of new Set(techMatches.map(t => t.toLowerCase()))) {
                        tags.push(tech);
                    }
                }
                // Extract file extensions as topic hints
                const fileExts = content.match(/\.(ts|js|py|go|rs|java|tsx|jsx|css|html|json|yaml|yml|md)\b/g);
                if (fileExts) {
                    for (const ext of new Set(fileExts)) {
                        tags.push(ext.replace('.', ''));
                    }
                }
                // Extract key action verbs as context
                if (/\b(migrat|switch|chang|replac|upgrad|delet|remov)\w*/i.test(content))
                    tags.push('migration');
                if (/\b(test|spec|assert|expect|mock)\b/i.test(content))
                    tags.push('testing');
                if (/\b(deploy|ci|cd|pipeline|build|release)\b/i.test(content))
                    tags.push('devops');
                if (/\b(auth|login|token|session|permission|role)\b/i.test(content))
                    tags.push('auth');
                if (/\b(database|query|schema|table|index|sql)\b/i.test(content))
                    tags.push('database');
                if (/\b(performance|speed|slow|fast|optimize|cache)\b/i.test(content))
                    tags.push('performance');
                return [...new Set(tags)].slice(0, 8); // Cap at 8 tags
            }
            const stored = [];
            const skipped = [];
            for (const item of extracted) {
                try {
                    // Feed the session tracker with extracted patterns
                    switch (item.type) {
                        case 'DECISION':
                            (0, session_tracker_1.feedSession)({ decision: item.content });
                            break;
                        case 'FAILED_ATTEMPT':
                            (0, session_tracker_1.feedSession)({ failedAttempt: item.content });
                            break;
                        case 'BUSINESS_RULE':
                            (0, session_tracker_1.feedSession)({ businessRule: item.content });
                            break;
                        case 'GOTCHA':
                            (0, session_tracker_1.feedSession)({ gotcha: item.content });
                            break;
                        case 'CURRENT_TASK':
                            (0, session_tracker_1.feedSession)({ currentTask: item.content });
                            break;
                        default:
                            (0, session_tracker_1.feedSession)({ topic: item.content.slice(0, 60) });
                            break;
                    }
                    const result = (0, memory_quality_1.storeWithQuality)(memoryStore, {
                        type: item.type,
                        intent: item.content,
                        action: `auto_learn:${item.type.toLowerCase()}`,
                        reason: item.reason,
                        confidence: item.confidence,
                        importance: calculateImportance(item),
                        tags: extractTopicTags(item),
                    });
                    if (result.stored) {
                        stored.push(`[${item.type}] ${item.content.slice(0, 60)}${item.content.length > 60 ? '…' : ''}`);
                    }
                    else {
                        skipped.push(`[${item.type}] ${item.content.slice(0, 40)}… (duplicate)`);
                    }
                }
                catch {
                    // Skip individual failures silently
                }
            }
            if (stored.length > 0) {
                (0, memory_cache_1.invalidateCache)();
                for (let i = 0; i < stored.length; i++)
                    (0, usage_stats_1.trackStore)();
            }
            // ─── Auto-correction capture ─────────────────────────────────────
            // Scan AI text for self-corrections ("I apologize", "you're right")
            const aiCorrections = (0, correction_detector_1.detectAIAcknowledgments)(text);
            for (const corr of aiCorrections) {
                try {
                    const corrResult = (0, memory_quality_1.storeWithQuality)(memoryStore, {
                        type: 'CORRECTION',
                        intent: `[AUTO-DETECTED] ${corr.fullContext}`,
                        action: corr.fullContext,
                        reason: `AI self-correction detected (confidence: ${corr.confidence})`,
                        confidence: corr.confidence,
                        importance: 0.90, // High importance — corrections prevent repeats
                        tags: ['auto-correction', 'ai-acknowledgment'],
                    });
                    if (corrResult.stored) {
                        stored.push(`[CORRECTION] ${corr.fullContext.slice(0, 60)}…`);
                    }
                }
                catch { /* skip */ }
            }
            // Scan user context for direct corrections ("no, use X not Y")
            const userContext = args.context;
            if (userContext && userContext.length > 10) {
                const userCorrections = (0, correction_detector_1.detectUserCorrections)(userContext);
                for (const corr of userCorrections) {
                    try {
                        const content = corr.corrected
                            ? `User correction: use "${corr.corrected}"${corr.original ? ` instead of "${corr.original}"` : ''}`
                            : `User correction: ${corr.fullContext}`;
                        const corrResult = (0, memory_quality_1.storeWithQuality)(memoryStore, {
                            type: 'CORRECTION',
                            intent: content,
                            action: corr.fullContext,
                            reason: `User correction detected (confidence: ${corr.confidence})`,
                            confidence: corr.confidence,
                            importance: 0.95, // Very high — user corrections are gospel
                            tags: ['auto-correction', 'user-correction'],
                        });
                        if (corrResult.stored) {
                            stored.push(`[USER CORRECTION] ${content.slice(0, 60)}…`);
                            (0, memory_cache_1.invalidateCache)();
                        }
                    }
                    catch { /* skip */ }
                }
                // ─── Preference learning ─────────────────────────────────
                const prefs = (0, preference_learner_1.detectPreferences)(userContext);
                for (const pref of prefs) {
                    try {
                        const prefResult = (0, memory_quality_1.storeWithQuality)(memoryStore, {
                            type: 'CONVENTION',
                            intent: pref.preference,
                            action: `Detected from: "${pref.evidence}"`,
                            reason: `User preference auto-detected (${pref.category})`,
                            confidence: pref.confidence,
                            importance: 0.85,
                            tags: ['preference', pref.category],
                        });
                        if (prefResult.stored) {
                            stored.push(`[PREFERENCE] ${pref.preference.slice(0, 60)}…`);
                            (0, memory_cache_1.invalidateCache)();
                        }
                    }
                    catch { /* skip */ }
                }
            }
            // ─── Build error learning ──────────────────────────────────
            // Scan for TS errors, test failures in AI text
            if ((0, error_learner_1.containsErrors)(text)) {
                const errorPatterns = (0, error_learner_1.extractErrorPatterns)(text);
                // Extract verification steps for regression prevention
                const verifySteps = (0, regression_guard_1.extractVerificationSteps)(text);
                for (const ep of errorPatterns) {
                    try {
                        const baseAction = `Auto-captured from build/test output`;
                        const actionWithVerify = (0, regression_guard_1.attachVerification)(baseAction, verifySteps);
                        const errResult = (0, memory_quality_1.storeWithQuality)(memoryStore, {
                            type: 'BUG_FIX',
                            intent: `[ERROR PATTERN] ${ep.errorType}: ${ep.message}`,
                            action: actionWithVerify,
                            reason: `Error pattern auto-detected — avoid this in future`,
                            confidence: ep.confidence,
                            importance: 0.90,
                            tags: ['error-pattern', ep.errorType.toLowerCase(), 'auto-detected'],
                        });
                        if (errResult.stored) {
                            stored.push(`[ERROR LEARNED] ${ep.errorType}: ${ep.message.slice(0, 50)}…`);
                            (0, memory_cache_1.invalidateCache)();
                        }
                    }
                    catch { /* skip */ }
                }
            }
            // ─── Success reinforcement ─────────────────────────────────
            // Scan user context for praise/success signals
            if (userContext && userContext.length > 5) {
                const successSignals = (0, success_tracker_1.detectSuccess)(userContext);
                for (const signal of successSignals) {
                    try {
                        const mem = (0, success_tracker_1.buildSuccessMemory)(signal, text);
                        const successResult = (0, memory_quality_1.storeWithQuality)(memoryStore, {
                            type: 'INSIGHT',
                            intent: mem.intent,
                            action: text.slice(0, 200),
                            reason: mem.reason,
                            confidence: signal.confidence,
                            importance: 0.80,
                            tags: mem.tags,
                        });
                        if (successResult.stored) {
                            stored.push(`[SUCCESS] Proven approach stored from: "${signal.trigger}"`);
                            (0, memory_cache_1.invalidateCache)();
                        }
                    }
                    catch { /* skip */ }
                }
            }
            // ─── File relationship tracking ────────────────────────────
            // Track files mentioned in context for co-edit detection
            if (userContext) {
                const filePatterns = userContext.match(/[\w-]+\.\w{1,5}/g) || [];
                const codeFileExts = new Set(['ts', 'tsx', 'js', 'jsx', 'css', 'py', 'go', 'rs', 'java']);
                for (const f of filePatterns) {
                    const ext = f.split('.').pop()?.toLowerCase() || '';
                    if (codeFileExts.has(ext)) {
                        (0, file_relationships_1.recordFileEdit)(f);
                    }
                }
            }
            const lines = ['**Auto-Learn Results:**'];
            if (stored.length > 0) {
                lines.push(`\nStored ${stored.length} new memory${stored.length > 1 ? 'ies' : 'y'}:`);
                stored.forEach(s => lines.push(`  • ${s}`));
            }
            if (skipped.length > 0) {
                lines.push(`\nSkipped ${skipped.length} duplicate${skipped.length > 1 ? 's' : ''}:`);
                skipped.forEach(s => lines.push(`  • ${s}`));
            }
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: lines.join('\n') }] },
            };
        }
        catch (err) {
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: `auto_learn error: ${err.message}` }], isError: true },
            };
        }
    }
    function handleExportMemories(id) {
        try {
            const bundle = (0, export_import_1.exportMemories)(memoryStore);
            return {
                jsonrpc: '2.0', id,
                result: {
                    content: [{
                            type: 'text',
                            text: `**Exported ${bundle.memoryCount} memories**\n\nSave this JSON to transfer to another machine:\n\n\`\`\`json\n${JSON.stringify(bundle, null, 2)}\n\`\`\``,
                        }],
                },
            };
        }
        catch (err) {
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: `Export error: ${err.message}` }], isError: true },
            };
        }
    }
    function handleImportMemories(id, args) {
        try {
            const data = args.data;
            if (!data) {
                return {
                    jsonrpc: '2.0', id,
                    result: { content: [{ type: 'text', text: 'Error: data is required (JSON string of exported bundle)' }], isError: true },
                };
            }
            const bundle = JSON.parse(data);
            if (bundle.version !== 1) {
                return {
                    jsonrpc: '2.0', id,
                    result: { content: [{ type: 'text', text: `Error: Unsupported export version: ${bundle.version}` }], isError: true },
                };
            }
            // Use the shared importMemories module (dedup-aware, O(n) not O(n²))
            const { importMemories } = require('../memory/export-import');
            const result = importMemories(memoryStore, bundle);
            (0, memory_cache_1.invalidateCache)();
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: `Import complete.\n\nImported: ${result.imported}\nSkipped (duplicates): ${result.skipped}\nErrors: ${result.errors}` }] },
            };
        }
        catch (err) {
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: `Import error: ${err.message}` }], isError: true },
            };
        }
    }
    function handleHealthCheck(id) {
        try {
            const stats = (0, rate_limiter_1.getRateLimitStats)();
            const activeCount = memoryStore.activeCount();
            const parts = [
                '# Cortex Health Check\n',
                `| Metric | Value |`,
                `|--------|-------|`,
                `| Active Memories | ${activeCount} |`,
                `| Session Store Count | ${stats.storeCount}/100 |`,
                `| Session Auto-Learn Count | ${stats.autoLearnCount}/500 |`,
                `| Session Total Calls | ${stats.totalCalls}/2000 |`,
                `| Uptime | ${Math.floor(stats.uptime / 60)}m ${stats.uptime % 60}s |`,
                `| Status | Healthy |`,
            ];
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: parts.join('\n') }] },
            };
        }
        catch (err) {
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: `Health check error: ${err.message}` }], isError: true },
            };
        }
    }
    // ─── Pre-Flight Check Handler ───────────────────────────────────────────────
    function handlePreCheck(id, args) {
        try {
            // Track file for relationship mapping
            if (args.filename)
                (0, file_relationships_1.recordFileEdit)(args.filename);
            const result = (0, pre_flight_1.preFlightCheck)(memoryStore, args.filename, args.task);
            let text = (0, pre_flight_1.formatPreFlight)(result);
            // Add file relationship warnings
            if (args.filename) {
                const warnings = (0, file_relationships_1.checkMissingRelated)(args.filename, memoryStore);
                if (warnings.length > 0) {
                    text += '\n\n## 🔗 File Relationships\n';
                    warnings.forEach(w => text += w + '\n');
                }
            }
            // Add architecture context — show file's role in the system
            if (args.filename && workspaceRoot) {
                try {
                    const archGraph = (0, architecture_graph_1.buildArchitectureGraph)(workspaceRoot);
                    const basename = args.filename.replace(/\\/g, '/').split('/').pop() || args.filename;
                    // nodes is Map<string, ArchNode> — find by key ending with basename
                    let deps = null;
                    for (const [key, node] of archGraph.nodes) {
                        if (key.endsWith(basename)) {
                            deps = node;
                            break;
                        }
                    }
                    if (deps && (deps.imports?.length > 0 || deps.importedBy?.length > 0)) {
                        text += '\n\n## \ud83c\udfd7\ufe0f Architecture Context';
                        if (deps.imports?.length > 0) {
                            text += `\n**Imports from:** ${deps.imports.slice(0, 10).join(', ')}`;
                        }
                        if (deps.importedBy?.length > 0) {
                            text += `\n**Imported by:** ${deps.importedBy.slice(0, 10).join(', ')}`;
                        }
                    }
                }
                catch { /* non-fatal */ }
            }
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text }] },
            };
        }
        catch (err) {
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: `Pre-check error: ${err.message}` }], isError: true },
            };
        }
    }
    // ─── Impact Analysis Handler ───────────────────────────────────────────────
    function handleCheckImpact(id, args) {
        try {
            const file = args.file;
            if (!file) {
                return {
                    jsonrpc: '2.0', id,
                    result: { content: [{ type: 'text', text: 'Error: file parameter is required' }], isError: true },
                };
            }
            const wsRoot = args.workspaceRoot || process.cwd();
            const result = (0, impact_analyzer_1.analyzeImpact)(file, wsRoot);
            const text = (0, impact_analyzer_1.formatImpact)(result);
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text }] },
            };
        }
        catch (err) {
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: `Impact analysis error: ${err.message}` }], isError: true },
            };
        }
    }
    // ─── Resume Work Handler ───────────────────────────────────────────────────
    function handleResumeWork(id) {
        try {
            const ctx = (0, resume_work_1.buildResumeContext)(memoryStore);
            const text = (0, resume_work_1.formatResumeContext)(ctx);
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text }] },
            };
        }
        catch (err) {
            return {
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: `Resume work error: ${err.message}` }], isError: true },
            };
        }
    }
    return { handleMCPRequest };
}
//# sourceMappingURL=mcp-handler.js.map