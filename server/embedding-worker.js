#!/usr/bin/env node
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
/**
 * Embedding Worker Thread — Runs MiniLM in a separate thread.
 *
 * Never blocks the main event loop. Main thread sends text,
 * worker returns Float32Array embeddings asynchronously.
 */
// SILENCE WORKER THREAD (prevent protocol corruption)
console.log = () => { };
console.warn = () => { };
console.error = () => { };
const worker_threads_1 = require("worker_threads");
let pipeline = null;
let modelReady = false;
async function loadModel() {
    try {
        const { pipeline: createPipeline } = await Promise.resolve().then(() => __importStar(require('@xenova/transformers')));
        pipeline = await createPipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
            quantized: true,
            progress_callback: (x) => { }, // SILENCE PROGRESS BARS
        });
        modelReady = true;
        worker_threads_1.parentPort?.postMessage({ type: 'ready' });
    }
    catch (err) {
        worker_threads_1.parentPort?.postMessage({ type: 'error', id: '__init__', message: err.message });
    }
}
worker_threads_1.parentPort?.on('message', async (msg) => {
    if (msg.type !== 'embed')
        return;
    if (!modelReady) {
        worker_threads_1.parentPort?.postMessage({
            type: 'error',
            id: msg.id,
            message: 'Model not ready yet',
        });
        return;
    }
    try {
        const output = await pipeline(msg.text, { pooling: 'mean', normalize: true });
        const vector = Array.from(output.data);
        worker_threads_1.parentPort?.postMessage({
            type: 'result',
            id: msg.id,
            vector,
        });
    }
    catch (err) {
        worker_threads_1.parentPort?.postMessage({
            type: 'error',
            id: msg.id,
            message: err.message,
        });
    }
});
// Start loading immediately
loadModel();
//# sourceMappingURL=embedding-worker.js.map