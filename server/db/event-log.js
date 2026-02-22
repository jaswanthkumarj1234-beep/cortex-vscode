"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventLog = void 0;
class EventLog {
    db;
    appendStmt;
    markProcessedStmt;
    constructor(database) {
        this.db = database.connection;
        this.appendStmt = this.db.prepare(`
      INSERT INTO events (event_type, source, content, diff, file, metadata, timestamp, processed)
      VALUES (@eventType, @source, @content, @diff, @file, @metadata, @timestamp, 0)
    `);
        this.markProcessedStmt = this.db.prepare(`
      UPDATE events SET processed = 1 WHERE id = ?
    `);
    }
    /** Append a new event (immutable — never modified after insert) */
    append(event) {
        const result = this.appendStmt.run({
            eventType: event.eventType,
            source: event.source,
            content: event.content,
            diff: event.diff || null,
            file: event.file || null,
            metadata: event.metadata ? JSON.stringify(event.metadata) : null,
            timestamp: event.timestamp,
        });
        return Number(result.lastInsertRowid);
    }
    /** Append multiple events in a single transaction */
    appendBatch(events) {
        const ids = [];
        const tx = this.db.transaction(() => {
            for (const event of events) {
                ids.push(this.append(event));
            }
        });
        tx();
        return ids;
    }
    /** Mark an event as processed */
    markProcessed(eventId) {
        this.markProcessedStmt.run(eventId);
    }
    /** Get unprocessed events (oldest first) */
    getUnprocessed(limit = 100) {
        const rows = this.db
            .prepare('SELECT * FROM events WHERE processed = 0 ORDER BY timestamp ASC LIMIT ?')
            .all(limit);
        return rows.map(this.rowToEvent);
    }
    /** Get events by file */
    getByFile(filePath, limit = 50) {
        const rows = this.db
            .prepare('SELECT * FROM events WHERE file = ? ORDER BY timestamp DESC LIMIT ?')
            .all(filePath, limit);
        return rows.map(this.rowToEvent);
    }
    /** Get recent events */
    getRecent(limit = 50) {
        const rows = this.db
            .prepare('SELECT * FROM events ORDER BY timestamp DESC LIMIT ?')
            .all(limit);
        return rows.map(this.rowToEvent);
    }
    /** Total event count */
    count() {
        const row = this.db.prepare('SELECT COUNT(*) as cnt FROM events').get();
        return row.cnt;
    }
    rowToEvent(row) {
        return {
            id: row.id,
            eventType: row.event_type,
            source: row.source,
            content: row.content,
            diff: row.diff || undefined,
            file: row.file || undefined,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
            timestamp: row.timestamp,
            processed: row.processed === 1,
        };
    }
}
exports.EventLog = EventLog;
//# sourceMappingURL=event-log.js.map