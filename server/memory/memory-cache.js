"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCached = getCached;
exports.setCache = setCache;
exports.invalidateCache = invalidateCache;
exports.cacheSize = cacheSize;
/**
 * Memory Cache — LRU result cache for fast repeat queries.
 * Extracted from standalone.ts L645-666.
 */
const config_1 = require("../config/config");
const recallCache = new Map();
function getCached(key) {
    const entry = recallCache.get(key);
    if (!entry)
        return null;
    if (Date.now() - entry.time > config_1.CONFIG.CACHE_TTL) {
        recallCache.delete(key);
        return null;
    }
    return entry.result;
}
function setCache(key, result) {
    // Proactive stale eviction: sweep expired entries before inserting
    if (recallCache.size >= config_1.CONFIG.CACHE_MAX) {
        const now = Date.now();
        for (const [k, v] of recallCache) {
            if (now - v.time > config_1.CONFIG.CACHE_TTL) {
                recallCache.delete(k);
            }
        }
    }
    // If still full after eviction, remove the oldest entry
    if (recallCache.size >= config_1.CONFIG.CACHE_MAX) {
        const oldest = recallCache.keys().next().value;
        if (oldest)
            recallCache.delete(oldest);
    }
    recallCache.set(key, { result, time: Date.now() });
}
function invalidateCache() {
    recallCache.clear();
}
function cacheSize() {
    return recallCache.size;
}
//# sourceMappingURL=memory-cache.js.map