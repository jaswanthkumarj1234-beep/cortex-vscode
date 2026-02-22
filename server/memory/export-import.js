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
exports.exportMemories = exportMemories;
exports.exportToFile = exportToFile;
exports.importMemories = importMemories;
exports.importFromFile = importFromFile;
/**
 * Memory Export/Import — Backup, share, and transfer memories.
 *
 * Export: Writes all active memories to a JSON file
 * Import: Reads a JSON file and merges memories (dedup-aware)
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Export all active memories to a JSON bundle
 */
function exportMemories(memoryStore) {
    const active = memoryStore.getActive(5000);
    const memories = active.map(m => ({
        id: m.id,
        type: m.type,
        intent: m.intent,
        action: m.action,
        reason: m.reason || null,
        tags: m.tags || [],
        relatedFiles: m.relatedFiles || [],
        confidence: m.confidence,
        importance: m.importance,
        accessCount: m.accessCount,
        createdAt: m.createdAt,
        timestamp: new Date(m.createdAt).toISOString(),
    }));
    return {
        version: 1,
        exportedAt: new Date().toISOString(),
        memoryCount: memories.length,
        memories,
    };
}
/**
 * Export memories to a file
 */
function exportToFile(memoryStore, filePath) {
    const bundle = exportMemories(memoryStore);
    const resolved = path.resolve(filePath);
    fs.writeFileSync(resolved, JSON.stringify(bundle, null, 2), 'utf-8');
    return { count: bundle.memoryCount, path: resolved };
}
/**
 * Import memories from a JSON bundle, skipping duplicates
 */
function importMemories(memoryStore, bundle) {
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    // Load active memories ONCE — O(n) instead of O(n²)
    const active = memoryStore.getActive(5000);
    const existingKeys = new Set(active.map(e => `${e.type}::${e.intent.toLowerCase().trim()}`));
    for (const m of bundle.memories) {
        try {
            const key = `${m.type}::${m.intent.toLowerCase().trim()}`;
            if (existingKeys.has(key)) {
                skipped++;
                continue;
            }
            memoryStore.add({
                type: m.type,
                intent: m.intent,
                action: m.action,
                reason: m.reason || undefined,
                tags: m.tags,
                relatedFiles: m.relatedFiles,
                confidence: m.confidence,
                importance: m.importance,
            });
            existingKeys.add(key); // Prevent dupes within the same import batch
            imported++;
        }
        catch {
            errors++;
        }
    }
    return { imported, skipped, errors };
}
/**
 * Import memories from a file
 */
function importFromFile(memoryStore, filePath) {
    const resolved = path.resolve(filePath);
    const content = fs.readFileSync(resolved, 'utf-8');
    const bundle = JSON.parse(content);
    if (bundle.version !== 1) {
        throw new Error(`Unsupported export version: ${bundle.version}`);
    }
    return importMemories(memoryStore, bundle);
}
//# sourceMappingURL=export-import.js.map