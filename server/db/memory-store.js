"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryStore = void 0;
/**
 * Memory Store — CRUD for memory_units, edges, and vector search.
 * Uses JS cosine similarity for M1 (no native extension needed).
 */
const uuid_1 = require("uuid");
class MemoryStore {
    db;
    // Prepared statements
    insertMemoryStmt;
    updateMemoryStmt;
    getMemoryStmt;
    deactivateStmt;
    touchStmt;
    insertEdgeStmt;
    insertVectorStmt;
    // In-memory vector index (JS fallback for M1)
    vectors = new Map();
    constructor(database) {
        this.db = database.connection;
        // Create vector table (simple key-value for M1)
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory_vectors (
        id TEXT PRIMARY KEY,
        embedding BLOB NOT NULL
      )
    `);
        // Index for faster filtering by type/status
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_memories_type_active ON memory_units(type, is_active);`);
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_memories_created ON memory_units(created_at);`);
        this.insertMemoryStmt = this.db.prepare(`
      INSERT INTO memory_units (
        id, type, intent, action, reason, impact, outcome,
        related_files, code_snippet, tags, timestamp,
        confidence, importance, access_count, last_accessed,
        superseded_by, is_active, source_event_id, created_at
      ) VALUES (
        @id, @type, @intent, @action, @reason, @impact, @outcome,
        @relatedFiles, @codeSnippet, @tags, @timestamp,
        @confidence, @importance, 0, NULL,
        NULL, 1, @sourceEventId, @createdAt
      )
    `);
        this.updateMemoryStmt = this.db.prepare(`
      UPDATE memory_units SET
        intent = @intent, action = @action, reason = @reason,
        impact = @impact, outcome = @outcome,
        related_files = @relatedFiles, code_snippet = @codeSnippet,
        tags = @tags, confidence = @confidence, importance = @importance,
        timestamp = @timestamp
      WHERE id = @id
    `);
        this.getMemoryStmt = this.db.prepare('SELECT * FROM memory_units WHERE id = ?');
        this.deactivateStmt = this.db.prepare('UPDATE memory_units SET is_active = 0, superseded_by = @supersededBy WHERE id = @id');
        this.touchStmt = this.db.prepare('UPDATE memory_units SET access_count = access_count + 1, last_accessed = @lastAccessed WHERE id = @id');
        this.insertEdgeStmt = this.db.prepare(`
      INSERT OR REPLACE INTO edges (source_id, target_id, relation, weight, timestamp)
      VALUES (@sourceId, @targetId, @relation, @weight, @timestamp)
    `);
        this.insertVectorStmt = this.db.prepare('INSERT OR REPLACE INTO memory_vectors (id, embedding) VALUES (@id, @embedding)');
        // Load existing vectors into memory for fast JS cosine search
        this.loadVectors();
    }
    // ═══ MEMORY CRUD ═══
    /** Create a new memory unit (with deduplication) */
    add(memory) {
        // ── Deduplication: skip if very similar memory already exists ──
        const duplicate = this.findDuplicate(memory.type, memory.intent);
        if (duplicate) {
            // Touch the existing memory to refresh its recency
            this.touch(duplicate.id);
            return duplicate;
        }
        const now = Date.now();
        const id = memory.id || (0, uuid_1.v4)();
        const full = {
            id,
            type: memory.type,
            intent: memory.intent,
            action: memory.action,
            reason: memory.reason,
            impact: memory.impact,
            outcome: memory.outcome || 'unknown',
            relatedFiles: memory.relatedFiles || [],
            codeSnippet: memory.codeSnippet,
            tags: memory.tags || [],
            timestamp: memory.timestamp || now,
            confidence: memory.confidence ?? 0.5,
            importance: memory.importance ?? 0.5,
            accessCount: 0,
            lastAccessed: undefined,
            supersededBy: undefined,
            isActive: true,
            sourceEventId: memory.sourceEventId,
            createdAt: now,
        };
        this.insertMemoryStmt.run({
            id: full.id,
            type: full.type,
            intent: full.intent,
            action: full.action,
            reason: full.reason || null,
            impact: full.impact || null,
            outcome: full.outcome,
            relatedFiles: JSON.stringify(full.relatedFiles),
            codeSnippet: full.codeSnippet || null,
            tags: JSON.stringify(full.tags),
            timestamp: full.timestamp,
            confidence: full.confidence,
            importance: full.importance,
            sourceEventId: full.sourceEventId || null,
            createdAt: full.createdAt,
        });
        return full;
    }
    /**
     * Find a duplicate memory by type + intent similarity.
     * Uses word-overlap (Jaccard similarity) — no ML needed.
     * Returns existing memory if similarity > 0.7, else undefined.
     */
    findDuplicate(type, intent) {
        const candidates = this.db
            .prepare('SELECT * FROM memory_units WHERE type = ? AND is_active = 1 LIMIT 200')
            .all(type);
        const newWords = new Set(this.tokenize(intent));
        if (newWords.size === 0)
            return undefined;
        for (const row of candidates) {
            const existingWords = new Set(this.tokenize(row.intent));
            const intersection = [...newWords].filter(w => existingWords.has(w)).length;
            const union = new Set([...newWords, ...existingWords]).size;
            const similarity = union > 0 ? intersection / union : 0;
            if (similarity >= 0.7) {
                return this.rowToMemory(row);
            }
        }
        return undefined;
    }
    /** Tokenize text into lowercase words (stop-word filtered) */
    tokenize(text) {
        const STOP_WORDS = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'use', 'always', 'never', 'should', 'must', 'not', 'do', 'be', 'it', 'this', 'that', 'and', 'or', 'but']);
        return text
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 2 && !STOP_WORDS.has(w));
    }
    /** Update an existing memory */
    update(id, updates) {
        const existing = this.get(id);
        if (!existing)
            return;
        this.updateMemoryStmt.run({
            id,
            intent: updates.intent || existing.intent,
            action: updates.action || existing.action,
            reason: updates.reason ?? existing.reason ?? null,
            impact: updates.impact ?? existing.impact ?? null,
            outcome: updates.outcome ?? existing.outcome,
            relatedFiles: JSON.stringify(updates.relatedFiles || existing.relatedFiles),
            codeSnippet: updates.codeSnippet ?? existing.codeSnippet ?? null,
            tags: JSON.stringify(updates.tags || existing.tags),
            confidence: updates.confidence ?? existing.confidence,
            importance: updates.importance ?? existing.importance,
            timestamp: updates.timestamp || existing.timestamp,
        });
    }
    /** Get a memory by ID */
    get(id) {
        const row = this.getMemoryStmt.get(id);
        return row ? this.rowToMemory(row) : undefined;
    }
    /** Deactivate a memory (soft delete) */
    deactivate(id, supersededBy) {
        this.deactivateStmt.run({ supersededBy: supersededBy || null, id });
    }
    /** Record an access (for importance tracking) */
    touch(id) {
        this.touchStmt.run({ lastAccessed: Date.now(), id });
    }
    /** Get all active memories */
    getActive(limit = 1000) {
        const rows = this.db
            .prepare('SELECT * FROM memory_units WHERE is_active = 1 ORDER BY timestamp DESC LIMIT ?')
            .all(limit);
        return rows.map(this.rowToMemory);
    }
    /** Get memories by type */
    getByType(type, limit = 100) {
        const rows = this.db
            .prepare('SELECT * FROM memory_units WHERE type = ? AND is_active = 1 ORDER BY timestamp DESC LIMIT ?')
            .all(type, limit);
        return rows.map(this.rowToMemory);
    }
    /** Get memories related to a file */
    getByFile(filePath, limit = 50) {
        // Search in related_files JSON array
        const rows = this.db
            .prepare(`SELECT * FROM memory_units WHERE is_active = 1 
        AND related_files LIKE ? ORDER BY timestamp DESC LIMIT ?`)
            .all(`%${filePath}%`, limit);
        return rows.map(this.rowToMemory);
    }
    /** Full-text search via FTS5 */
    searchFTS(query, limit = 20) {
        const rows = this.db
            .prepare(`
        SELECT m.*, fts.rank
        FROM memory_fts fts
        JOIN memory_units m ON m.id = fts.id
        WHERE memory_fts MATCH ? AND m.is_active = 1
        ORDER BY fts.rank
        LIMIT ?
      `)
            .all(query, limit);
        return rows.map((row) => ({
            memory: this.rowToMemory(row),
            score: -row.rank, // FTS5 rank is negative (lower = better)
            matchMethod: 'fts',
        }));
    }
    // ═══ VECTOR SEARCH (JS cosine similarity — M1 fallback) ═══
    /** Store a vector embedding */
    storeVector(id, embedding) {
        const buffer = Buffer.from(embedding.buffer);
        this.insertVectorStmt.run({ id, embedding: buffer });
        this.vectors.set(id, embedding);
    }
    /** Search by vector similarity */
    searchVector(queryEmbedding, limit = 20) {
        const results = [];
        for (const [id, vec] of this.vectors) {
            const sim = this.cosineSimilarity(queryEmbedding, vec);
            results.push({ id, score: sim });
        }
        results.sort((a, b) => b.score - a.score);
        return results.slice(0, limit).map((r) => {
            const memory = this.get(r.id);
            return {
                memory: memory,
                score: r.score,
                matchMethod: 'vector',
            };
        }).filter((r) => r.memory && r.memory.isActive);
    }
    cosineSimilarity(a, b) {
        let dot = 0, magA = 0, magB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            magA += a[i] * a[i];
            magB += b[i] * b[i];
        }
        const mag = Math.sqrt(magA) * Math.sqrt(magB);
        return mag === 0 ? 0 : dot / mag;
    }
    loadVectors() {
        const rows = this.db.prepare('SELECT id, embedding FROM memory_vectors').all();
        for (const row of rows) {
            const buffer = row.embedding;
            const embedding = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.length / 4);
            this.vectors.set(row.id, embedding);
        }
    }
    // ═══ GRAPH EDGES ═══
    /** Add an edge between memories */
    addEdge(edge) {
        this.insertEdgeStmt.run({
            sourceId: edge.sourceId,
            targetId: edge.targetId,
            relation: edge.relation,
            weight: edge.weight,
            timestamp: edge.timestamp,
        });
    }
    /** Get edges from a source memory */
    getEdgesFrom(sourceId) {
        return this.db
            .prepare('SELECT * FROM edges WHERE source_id = ?')
            .all(sourceId);
    }
    /** Get edges to a target memory */
    getEdgesTo(targetId) {
        return this.db
            .prepare('SELECT * FROM edges WHERE target_id = ?')
            .all(targetId);
    }
    /** Graph traversal — find related memories within N hops */
    getRelated(memoryId, maxHops = 2, limit = 20) {
        // Recursive CTE for graph traversal
        const rows = this.db
            .prepare(`
        WITH RECURSIVE related(id, depth, path) AS (
          SELECT target_id, 1, source_id || '→' || target_id
          FROM edges WHERE source_id = ?
          UNION ALL
          SELECT e.target_id, r.depth + 1, r.path || '→' || e.target_id
          FROM edges e
          JOIN related r ON e.source_id = r.id
          WHERE r.depth < ?
            AND r.path NOT LIKE '%' || e.target_id || '%'
        )
        SELECT DISTINCT m.*, r.depth
        FROM related r
        JOIN memory_units m ON m.id = r.id
        WHERE m.is_active = 1
        ORDER BY r.depth ASC
        LIMIT ?
      `)
            .all(memoryId, maxHops, limit);
        return rows.map((row) => ({
            memory: this.rowToMemory(row),
            score: 1.0 / (row.depth + 1), // closer = higher score
            matchMethod: 'graph',
        }));
    }
    // ═══ STATS ═══
    /** Total active memories */
    activeCount() {
        const row = this.db
            .prepare('SELECT COUNT(*) as cnt FROM memory_units WHERE is_active = 1')
            .get();
        return row.cnt;
    }
    /** Total memories (including inactive) */
    totalCount() {
        const row = this.db
            .prepare('SELECT COUNT(*) as cnt FROM memory_units')
            .get();
        return row.cnt;
    }
    // ═══ HELPERS ═══
    rowToMemory(row) {
        return {
            id: row.id,
            type: row.type,
            intent: row.intent,
            action: row.action,
            reason: row.reason || undefined,
            impact: row.impact || undefined,
            outcome: row.outcome || 'unknown',
            relatedFiles: row.related_files ? JSON.parse(row.related_files) : [],
            codeSnippet: row.code_snippet || undefined,
            tags: row.tags ? JSON.parse(row.tags) : [],
            timestamp: row.timestamp,
            confidence: row.confidence,
            importance: row.importance,
            accessCount: row.access_count,
            lastAccessed: row.last_accessed || undefined,
            supersededBy: row.superseded_by || undefined,
            isActive: row.is_active === 1,
            sourceEventId: row.source_event_id || undefined,
            createdAt: row.created_at,
        };
    }
    rebuildIndex() {
        console.log('  [cortex-mcp] Rebuilding FTS5 Search Index...');
        try {
            this.db.exec("INSERT INTO memory_fts(memory_fts) VALUES('rebuild');");
            this.db.exec("VACUUM;");
            console.log('  [cortex-mcp] Index rebuilt and database optimized.');
        }
        catch (err) {
            console.error('  [ERROR] Rebuild failed:', err.message);
        }
    }
}
exports.MemoryStore = MemoryStore;
//# sourceMappingURL=memory-store.js.map