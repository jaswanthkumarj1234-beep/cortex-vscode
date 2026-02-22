/**
 * Event Log — Immutable append-only event store.
 * All brain inputs are recorded here first.
 */
import type { BrainEvent } from '../types';
import type { CognitiveDatabase } from './database';
export declare class EventLog {
    private db;
    private appendStmt;
    private markProcessedStmt;
    constructor(database: CognitiveDatabase);
    /** Append a new event (immutable — never modified after insert) */
    append(event: BrainEvent): number;
    /** Append multiple events in a single transaction */
    appendBatch(events: BrainEvent[]): number[];
    /** Mark an event as processed */
    markProcessed(eventId: number): void;
    /** Get unprocessed events (oldest first) */
    getUnprocessed(limit?: number): BrainEvent[];
    /** Get events by file */
    getByFile(filePath: string, limit?: number): BrainEvent[];
    /** Get recent events */
    getRecent(limit?: number): BrainEvent[];
    /** Total event count */
    count(): number;
    private rowToEvent;
}
//# sourceMappingURL=event-log.d.ts.map