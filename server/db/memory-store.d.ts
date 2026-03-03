import type { MemoryUnit, MemoryType, GraphEdge, ScoredMemory } from '../types';
import type { CognitiveDatabase } from './database';
export declare class MemoryStore {
    private db;
    private insertMemoryStmt;
    private updateMemoryStmt;
    private getMemoryStmt;
    private deactivateStmt;
    private touchStmt;
    private insertEdgeStmt;
    private insertVectorStmt;
    private getActiveStmt;
    private getByTypeStmt;
    private getByFileStmt;
    private searchFTSStmt;
    private findByTagStmt;
    private getByTimestampRangeStmt;
    private getByDirectoryStmt;
    private getStaleStmt;
    private getLeastImportantStmt;
    private activeCountStmt;
    private totalCountStmt;
    private findDuplicateStmt;
    private getEdgesFromStmt;
    private getEdgesToStmt;
    private vectors;
    private _transaction;
    constructor(database: CognitiveDatabase);
    /** Run multiple operations in a single SQLite transaction (10-100x faster for bulk writes) */
    runTransaction(fn: () => void): void;
    /** Create a new memory unit (with deduplication) */
    add(memory: Partial<MemoryUnit> & {
        type: MemoryType;
        intent: string;
        action: string;
    }): MemoryUnit;
    /**
     * Find a duplicate memory by type + intent similarity.
     * Uses HYBRID approach: Jaccard word-overlap + cosine similarity (when vectors available).
     * Returns existing memory if similarity > threshold, else undefined.
     */
    private findDuplicate;
    /** Tokenize text into lowercase words (stop-word filtered) */
    private tokenize;
    /** Update an existing memory */
    update(id: string, updates: Partial<MemoryUnit>): void;
    /** Get a memory by ID */
    get(id: string): MemoryUnit | undefined;
    /** Deactivate a memory (soft delete) */
    deactivate(id: string, supersededBy?: string): void;
    /** Record an access (for importance tracking) */
    touch(id: string): void;
    /** Get all active memories */
    getActive(limit?: number): MemoryUnit[];
    /** Get memories by type */
    getByType(type: MemoryType, limit?: number): MemoryUnit[];
    /** Get memories related to a file */
    getByFile(filePath: string, limit?: number): MemoryUnit[];
    /** Full-text search via FTS5 (with query sanitization) */
    searchFTS(query: string, limit?: number): ScoredMemory[];
    /** Store a vector embedding */
    storeVector(id: string, embedding: Float32Array): void;
    /** Search by vector similarity */
    searchVector(queryEmbedding: Float32Array, limit?: number): ScoredMemory[];
    private cosineSimilarity;
    private loadVectors;
    /** Add an edge between memories */
    addEdge(edge: GraphEdge): void;
    /** Get edges from a source memory */
    getEdgesFrom(sourceId: string): GraphEdge[];
    /** Get edges to a target memory */
    getEdgesTo(targetId: string): GraphEdge[];
    /** Graph traversal — find related memories within N hops */
    getRelated(memoryId: string, maxHops?: number, limit?: number): ScoredMemory[];
    /** Find active memories by tag (SQL LIKE on JSON tags column) */
    findByTag(tag: string, limit?: number): MemoryUnit[];
    /** Get active memories within a timestamp range */
    getActiveByTimestampRange(start: number, end: number, limit?: number): MemoryUnit[];
    /** Get active memories related to files in a directory (SQL LIKE prefix) */
    getByDirectory(dirPrefix: string, limit?: number): MemoryUnit[];
    /** Get active memories with 0 access older than a given age */
    getStaleMemories(maxAgeMs: number, limit?: number): MemoryUnit[];
    /** Get active memories sorted by importance ASC (for cap enforcement) */
    getLeastImportant(limit: number): MemoryUnit[];
    /** Total active memories */
    activeCount(): number;
    /** Total memories (including inactive) */
    totalCount(): number;
    private rowToMemory;
    rebuildIndex(): void;
}
//# sourceMappingURL=memory-store.d.ts.map