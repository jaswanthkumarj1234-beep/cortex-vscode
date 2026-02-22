import type { SqliteDatabase } from '../types';
export declare class CognitiveDatabase {
    private db;
    private _dbPath;
    constructor(storagePath: string);
    private initialize;
    private migrate;
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