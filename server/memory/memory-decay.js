"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupMemories = cleanupMemories;
const types_1 = require("../types");
const config_1 = require("../config/config");
const memory_cache_1 = require("./memory-cache");
function cleanupMemories(memoryStore) {
    const DAY = 24 * 60 * 60 * 1000;
    try {
        let cleaned = 0;
        // Wrap all writes in a single transaction (10-100x faster for bulk deactivations)
        memoryStore.runTransaction(() => {
            // 0. Auto-expire CURRENT_TASK memories > 24h (working memory, not permanent)
            // "Currently working on X" should not persist alongside "Always use TypeScript strict mode"
            const TASK_MAX_AGE = 1 * DAY;
            const allForTaskCleanup = memoryStore.getActive(config_1.CONFIG.MEMORY_CAP);
            for (const m of allForTaskCleanup) {
                if (m.type === 'CURRENT_TASK') {
                    const age = Date.now() - (m.createdAt || m.timestamp || 0);
                    if (age > TASK_MAX_AGE) {
                        memoryStore.deactivate(m.id);
                        cleaned++;
                    }
                }
            }
            // 1. Deactivate INSIGHT memories > 14 days with 0 access (SQL-targeted)
            const staleInsights = memoryStore.getStaleMemories(config_1.CONFIG.INSIGHT_MAX_AGE_DAYS * DAY, 500);
            for (const m of staleInsights) {
                if (m.type === types_1.MemoryType.INSIGHT) {
                    memoryStore.deactivate(m.id);
                    cleaned++;
                }
            }
            // 2. Deactivate any memory > 30 days with 0 access (SQL-targeted)
            const staleAll = memoryStore.getStaleMemories(config_1.CONFIG.UNUSED_MAX_AGE_DAYS * DAY, 500);
            for (const m of staleAll) {
                memoryStore.deactivate(m.id);
                cleaned++;
            }
            // 3. Cap at MEMORY_CAP active memories (SQL COUNT + targeted fetch)
            const count = memoryStore.activeCount();
            if (count > config_1.CONFIG.MEMORY_CAP) {
                const toRemove = memoryStore.getLeastImportant(count - config_1.CONFIG.MEMORY_CAP);
                for (const m of toRemove) {
                    memoryStore.deactivate(m.id);
                    cleaned++;
                }
            }
            // 4. Duplicate detection — find memories with identical intents
            const activeAfterClean = memoryStore.getActive(config_1.CONFIG.MEMORY_CAP);
            const intentMap = new Map();
            for (const m of activeAfterClean) {
                const key = m.intent.toLowerCase().trim();
                const existing = intentMap.get(key);
                if (existing) {
                    existing.push(m);
                }
                else {
                    intentMap.set(key, [m]);
                }
            }
            // Merge duplicates — keep highest importance, boost it
            for (const [, dupes] of intentMap) {
                if (dupes.length <= 1)
                    continue;
                // Sort by importance desc, keep the first
                dupes.sort((a, b) => b.importance - a.importance);
                const keeper = dupes[0];
                // Strengthen the keeper (repeated = more important)
                const strengthBoost = Math.min(dupes.length * 0.05, 0.3);
                memoryStore.update(keeper.id, {
                    importance: Math.min(keeper.importance + strengthBoost, 1.0),
                    accessCount: keeper.accessCount + dupes.length - 1,
                });
                // Deactivate the rest
                for (let i = 1; i < dupes.length; i++) {
                    memoryStore.deactivate(dupes[i].id, keeper.id);
                    cleaned++;
                }
            }
            // 5. Deactivate resolved memories > 7 days old
            // Once a task is marked "resolved", it stays briefly for reference,
            // then gets cleaned up so it doesn't bloat the active set.
            const RESOLVED_MAX_AGE = 7 * DAY;
            const allActive = memoryStore.getActive(config_1.CONFIG.MEMORY_CAP);
            for (const m of allActive) {
                if (m.tags?.includes('resolved')) {
                    const age = Date.now() - (m.createdAt || m.timestamp || 0);
                    if (age > RESOLVED_MAX_AGE) {
                        memoryStore.deactivate(m.id);
                        cleaned++;
                    }
                }
            }
        });
        if (cleaned > 0) {
            console.log(`  🧹 Decay: cleaned ${cleaned} stale/duplicate memories`);
            (0, memory_cache_1.invalidateCache)();
        }
    }
    catch (err) {
        console.error('  [ERROR] Cleanup error:', err.message);
    }
}
//# sourceMappingURL=memory-decay.js.map