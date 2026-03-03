import type { SqliteDatabase } from '../types';
export declare class CognitiveDatabase {
    private db;
    private _dbPath;
    private _writeCount;
    private _checkpointTimer;
    private static readonly CHECKPOINT_WRITE_THRESHOLD;
    private static readonly CHECKPOINT_INTERVAL_MS;
    constructor(storagePath: string);
    private initialize;
    private migrate;
    /** Start periodic WAL checkpointing (every 30 min) */
    private startCheckpointTimer;
    /** Track a write operation and auto-checkpoint if threshold reached */
    trackWrite(): void;
    /** Get the raw database connection for direct queries */
    get connection(): SqliteDatabase;
    /** Get database file path */
    get dbPath(): string;
    /** Get database size in bytes */
    get sizeBytes(): number;
    /** Checkpoint WAL to main database */
    checkpoint(): void;
    /** Close the database connection */
    close(): void;
}
//# sourceMappingURL=database.d.ts.map