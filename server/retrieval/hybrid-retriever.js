"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HybridRetriever = void 0;
class HybridRetriever {
    memoryStore;
    embedder;
    constructor(memoryStore, embedder) {
        this.memoryStore = memoryStore;
        this.embedder = embedder;
    }
    /** Recall memories relevant to a query */
    async recall(query) {
        const startTime = Date.now();
        const limit = query.maxResults || 20;
        // Run all search methods in parallel
        const [vectorResults, ftsResults, fileResults] = await Promise.all([
            this.vectorSearch(query.query, limit),
            this.keywordSearch(query.query, limit),
            query.currentFile ? this.fileSearch(query.currentFile, limit) : Promise.resolve([]),
        ]);
        // Merge and deduplicate
        const merged = this.mergeResults([
            { results: vectorResults, weight: 0.5 },
            { results: ftsResults, weight: 0.35 },
            { results: fileResults, weight: 0.15 },
        ]);
        // Apply filters
        let filtered = merged;
        if (query.filters) {
            filtered = this.applyFilters(merged, query.filters);
        }
        // Sort by final score
        filtered.sort((a, b) => b.score - a.score);
        // Return top results
        return filtered.slice(0, limit);
    }
    async vectorSearch(query, limit) {
        try {
            const queryEmbedding = await this.embedder.embed(query);
            return this.memoryStore.searchVector(queryEmbedding, limit);
        }
        catch (err) {
            console.error('[CognitiveMemory] Vector search error:', err);
            return [];
        }
    }
    async keywordSearch(query, limit) {
        try {
            // Clean query for FTS5 syntax
            const ftsQuery = this.cleanFTSQuery(query);
            return this.memoryStore.searchFTS(ftsQuery, limit);
        }
        catch (err) {
            console.error('[CognitiveMemory] FTS search error:', err);
            return [];
        }
    }
    async fileSearch(filePath, limit) {
        const memories = this.memoryStore.getByFile(filePath, limit);
        return memories.map((m, i) => ({
            memory: m,
            score: 1.0 - (i * 0.05), // Ordered by recency
            matchMethod: 'file',
        }));
    }
    /** Merge results from multiple search methods with weights */
    mergeResults(sources) {
        const scoreMap = new Map();
        for (const { results, weight } of sources) {
            for (const r of results) {
                const existing = scoreMap.get(r.memory.id);
                if (existing) {
                    // Combine scores — reciprocal rank fusion inspired
                    existing.score += r.score * weight;
                    existing.methods.push(r.matchMethod);
                }
                else {
                    scoreMap.set(r.memory.id, {
                        memory: r.memory,
                        score: r.score * weight,
                        methods: [r.matchMethod],
                    });
                }
            }
        }
        return Array.from(scoreMap.values()).map((v) => ({
            memory: v.memory,
            score: v.score,
            matchMethod: v.methods.join('+'),
        }));
    }
    /** Apply query filters */
    applyFilters(results, filters) {
        return results.filter((r) => {
            if (filters?.types && !filters.types.includes(r.memory.type))
                return false;
            if (filters?.since && r.memory.timestamp < filters.since)
                return false;
            if (filters?.minImportance && r.memory.importance < filters.minImportance)
                return false;
            if (filters?.files) {
                const memFiles = r.memory.relatedFiles || [];
                if (!filters.files.some((f) => memFiles.includes(f)))
                    return false;
            }
            return true;
        });
    }
    /** Clean user query for FTS5 syntax */
    cleanFTSQuery(query) {
        // Remove special FTS5 characters, keep words
        return query
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter((w) => w.length > 2)
            .join(' OR ');
    }
}
exports.HybridRetriever = HybridRetriever;
//# sourceMappingURL=hybrid-retriever.js.map