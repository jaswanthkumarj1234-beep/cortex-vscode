/**
 * MCP Handler — JSON-RPC 2.0 request handler for the MCP protocol.
 *
 * Tools: recall_memory, store_memory, get_stats, scan_project, verify_files, get_context
 * Resources: brain/context (dynamic, auto-injected)
 */
import { MemoryStore } from '../db/memory-store';
import { EventLog } from '../db/event-log';
export declare function createMCPHandler(memoryStore: MemoryStore, eventLog: EventLog, workspaceRoot?: string): {
    handleMCPRequest: (rpc: any) => Promise<any>;
};
//# sourceMappingURL=mcp-handler.d.ts.map