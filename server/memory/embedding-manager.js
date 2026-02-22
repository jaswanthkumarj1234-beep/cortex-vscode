"use strict";
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
exports.startEmbeddingWorker = startEmbeddingWorker;
exports.embedText = embedText;
exports.isWorkerReady = isWorkerReady;
exports.terminateWorker = terminateWorker;
/**
 * Embedding Manager — Worker thread lifecycle for MiniLM embeddings.
 * Extracted from standalone.ts L591-643.
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const worker_threads_1 = require("worker_threads");
const config_1 = require("../config/config");
let embeddingWorker = null;
let workerReady = false;
const pendingEmbeddings = new Map();
function startEmbeddingWorker() {
    try {
        // Worker compiles to dist/embedding-worker.js, manager is in dist/memory/
        const workerPath = path.join(__dirname, '..', 'embedding-worker.js');
        if (!fs.existsSync(workerPath)) {
            console.log('  [cortex-mcp] Embedding worker not found, running FTS-only mode');
            return;
        }
        embeddingWorker = new worker_threads_1.Worker(workerPath);
        embeddingWorker.on('message', (msg) => {
            if (msg.type === 'ready') {
                workerReady = true;
                console.log('  [cortex-mcp] Embedding model loaded (worker thread)');
            }
            else if (msg.type === 'result') {
                const pending = pendingEmbeddings.get(msg.id);
                if (pending) {
                    pending.resolve(msg.vector);
                    pendingEmbeddings.delete(msg.id);
                }
            }
            else if (msg.type === 'error') {
                const pending = pendingEmbeddings.get(msg.id);
                if (pending) {
                    pending.reject(new Error(msg.message));
                    pendingEmbeddings.delete(msg.id);
                }
            }
        });
        embeddingWorker.on('error', (err) => {
            console.error('  [cortex-mcp] Embedding worker error:', err.message);
            workerReady = false;
        });
        console.log('  [cortex-mcp] Loading embedding model in background...');
    }
    catch (err) {
        console.log('  [cortex-mcp] Could not start embedding worker:', err.message);
    }
}
function embedText(text) {
    return new Promise((resolve, reject) => {
        if (!embeddingWorker || !workerReady) {
            reject(new Error('Worker not ready'));
            return;
        }
        const id = `embed_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const timeout = setTimeout(() => {
            pendingEmbeddings.delete(id);
            reject(new Error('Embedding timeout'));
        }, config_1.CONFIG.EMBEDDING_TIMEOUT);
        pendingEmbeddings.set(id, {
            resolve: (v) => { clearTimeout(timeout); resolve(v); },
            reject: (e) => { clearTimeout(timeout); reject(e); },
        });
        embeddingWorker.postMessage({ type: 'embed', id, text });
    });
}
function isWorkerReady() {
    return workerReady;
}
function terminateWorker() {
    if (embeddingWorker) {
        embeddingWorker.terminate();
        embeddingWorker = null;
        workerReady = false;
    }
}
//# sourceMappingURL=embedding-manager.js.map