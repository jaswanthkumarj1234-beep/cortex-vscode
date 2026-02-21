/**
 * Cortex MCP Client — JSON-RPC 2.0 over stdio
 * Spawns cortex-mcp as a child process and communicates via JSON-RPC.
 */
import * as vscode from 'vscode';
import { ChildProcess, spawn } from 'child_process';
import { EventEmitter } from 'events';

interface JsonRpcRequest {
    jsonrpc: '2.0';
    id: number;
    method: string;
    params?: any;
}

interface JsonRpcResponse {
    jsonrpc: '2.0';
    id: number;
    result?: any;
    error?: { code: number; message: string; data?: any };
}

export interface MemoryItem {
    id: string;
    type: string;
    intent: string;
    action: string;
    reason?: string;
    impact?: string;
    confidence: number;
    importance: number;
    tags?: string[];
    relatedFiles?: string[];
    timestamp: number;
    isActive: boolean;
    accessCount: number;
}

export interface BrainStats {
    totalMemories: number;
    activeMemories: number;
    totalEvents: number;
    dbSizeBytes: number;
    uptime: number;
}

export class MCPClient extends EventEmitter {
    private process: ChildProcess | null = null;
    private requestId = 0;
    private pendingRequests = new Map<number, {
        resolve: (value: any) => void;
        reject: (reason: any) => void;
        timeout: NodeJS.Timeout;
    }>();
    private buffer = '';
    private _connected = false;
    private _initialized = false;
    private outputChannel: vscode.OutputChannel;

    constructor(private workspaceRoot: string) {
        super();
        this.outputChannel = vscode.window.createOutputChannel('Cortex MCP');
    }

    get connected(): boolean {
        return this._connected;
    }

    async start(): Promise<void> {
        if (this._connected) { return; }

        const config = vscode.workspace.getConfiguration('cortex');
        const command = config.get<string>('mcpCommand', 'npx cortex-mcp');
        const parts = command.split(' ');

        this.outputChannel.appendLine(`[Cortex] Starting: ${command}`);
        this.outputChannel.appendLine(`[Cortex] Workspace: ${this.workspaceRoot}`);

        try {
            this.process = spawn(parts[0], parts.slice(1), {
                cwd: this.workspaceRoot,
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: true,
                env: { ...process.env, CORTEX_WORKSPACE: this.workspaceRoot },
            });

            this.process.stdout?.on('data', (data: Buffer) => {
                this.handleData(data.toString());
            });

            this.process.stderr?.on('data', (data: Buffer) => {
                this.outputChannel.appendLine(`[stderr] ${data.toString().trim()}`);
            });

            this.process.on('exit', (code) => {
                this.outputChannel.appendLine(`[Cortex] Process exited with code ${code}`);
                this._connected = false;
                this._initialized = false;
                this.emit('disconnected');
            });

            this.process.on('error', (err) => {
                this.outputChannel.appendLine(`[Cortex] Process error: ${err.message}`);
                this._connected = false;
                this.emit('error', err);
            });

            this._connected = true;
            this.emit('connected');

            // Initialize MCP session
            await this.initialize();
        } catch (err: any) {
            this.outputChannel.appendLine(`[Cortex] Failed to start: ${err.message}`);
            throw err;
        }
    }

    private async initialize(): Promise<void> {
        try {
            const result = await this.sendRequest('initialize', {
                protocolVersion: '2024-11-05',
                capabilities: {},
                clientInfo: { name: 'cortex-vscode', version: '1.0.0' },
            });
            this.outputChannel.appendLine(`[Cortex] Initialized: ${JSON.stringify(result)}`);

            // Send initialized notification
            this.sendNotification('notifications/initialized', {});
            this._initialized = true;
            this.emit('initialized');
        } catch (err: any) {
            this.outputChannel.appendLine(`[Cortex] Init failed: ${err.message}`);
        }
    }

    async callTool(name: string, args: Record<string, any> = {}): Promise<any> {
        if (!this._connected) {
            throw new Error('Cortex MCP not connected');
        }
        const result = await this.sendRequest('tools/call', { name, arguments: args });
        // MCP tool results come as { content: [{ type: 'text', text: '...' }] }
        if (result?.content?.[0]?.text) {
            try {
                return JSON.parse(result.content[0].text);
            } catch {
                return result.content[0].text;
            }
        }
        return result;
    }

    async listTools(): Promise<any[]> {
        const result = await this.sendRequest('tools/list', {});
        return result?.tools || [];
    }

    private sendRequest(method: string, params?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const id = ++this.requestId;
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error(`Request ${method} timed out (30s)`));
            }, 30000);

            this.pendingRequests.set(id, { resolve, reject, timeout });

            const request: JsonRpcRequest = {
                jsonrpc: '2.0',
                id,
                method,
                params,
            };

            const line = JSON.stringify(request) + '\n';
            this.process?.stdin?.write(line);
            this.outputChannel.appendLine(`[→] ${method} (id=${id})`);
        });
    }

    private sendNotification(method: string, params?: any): void {
        const notification = { jsonrpc: '2.0', method, params };
        this.process?.stdin?.write(JSON.stringify(notification) + '\n');
    }

    private handleData(data: string): void {
        this.buffer += data;

        // Process complete lines
        let nlIndex;
        while ((nlIndex = this.buffer.indexOf('\n')) !== -1) {
            const line = this.buffer.substring(0, nlIndex).trim();
            this.buffer = this.buffer.substring(nlIndex + 1);

            if (!line) { continue; }

            try {
                const response: JsonRpcResponse = JSON.parse(line);
                if (response.id !== undefined) {
                    const pending = this.pendingRequests.get(response.id);
                    if (pending) {
                        clearTimeout(pending.timeout);
                        this.pendingRequests.delete(response.id);
                        if (response.error) {
                            this.outputChannel.appendLine(`[←] Error (id=${response.id}): ${response.error.message}`);
                            pending.reject(new Error(response.error.message));
                        } else {
                            this.outputChannel.appendLine(`[←] OK (id=${response.id})`);
                            pending.resolve(response.result);
                        }
                    }
                }
            } catch {
                // Non-JSON line — likely stderr leak to stdout
                this.outputChannel.appendLine(`[raw] ${line}`);
            }
        }
    }

    async stop(): Promise<void> {
        if (this.process) {
            this.process.kill();
            this.process = null;
        }
        this._connected = false;
        this._initialized = false;
        this.pendingRequests.forEach(({ reject, timeout }) => {
            clearTimeout(timeout);
            reject(new Error('Client stopped'));
        });
        this.pendingRequests.clear();
    }

    dispose(): void {
        this.stop();
        this.outputChannel.dispose();
    }
}
