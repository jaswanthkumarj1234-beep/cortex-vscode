import * as vscode from 'vscode';
import { ChildProcess, spawn } from 'child_process';
import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs';

export interface MemoryItem {
    id: string;
    type: string;
    intent: string;
    action: string;
    reason?: string;
    impact?: string;
    confidence: number;
    importance: number;
    tags: string[];
    relatedFiles: string[];
    timestamp: number;
    isActive: boolean;
    accessCount: number;
}

export class MCPClient extends EventEmitter {
    private process: ChildProcess | null = null;
    private _connected = false;
    private requestId = 1;
    private pending = new Map<number, { resolve: Function; reject: Function; timer: NodeJS.Timeout }>();
    private buffer = '';
    private extensionPath: string = '';
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 3;
    private reconnectTimer: NodeJS.Timeout | null = null;

    constructor(private workspaceRoot: string) {
        super();
    }

    setExtensionPath(extPath: string): void {
        this.extensionPath = extPath;
    }

    get connected(): boolean {
        return this._connected;
    }

    private resolveServerCommand(): { command: string; args: string[] } {
        if (this.extensionPath) {
            const bundledPath = path.join(this.extensionPath, 'server', 'mcp-stdio.js');
            if (fs.existsSync(bundledPath)) {
                console.log('[Cortex] Using bundled server:', bundledPath);
                return { command: 'node', args: [bundledPath, this.workspaceRoot] };
            }
        }

        const config = vscode.workspace.getConfiguration('cortex');
        const customCmd = config.get<string>('mcpCommand', '');
        if (customCmd && customCmd !== 'npx cortex-mcp') {
            const parts = customCmd.split(' ');
            return { command: parts[0], args: [...parts.slice(1), this.workspaceRoot] };
        }

        console.log('[Cortex] Using global cortex-mcp via npx');
        return {
            command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
            args: ['-y', 'cortex-mcp', this.workspaceRoot],
        };
    }

    async start(): Promise<void> {
        if (this._connected) { return; }

        this.emit('connecting');
        const { command, args } = this.resolveServerCommand();

        return new Promise((resolve, reject) => {
            try {
                this.process = spawn(command, args, {
                    stdio: ['pipe', 'pipe', 'pipe'],
                    env: {
                        ...process.env,
                        CORTEX_WORKSPACE: this.workspaceRoot,
                        NODE_PATH: this.extensionPath
                            ? path.join(this.extensionPath, 'server', 'node_modules')
                            : undefined,
                    },
                    cwd: this.workspaceRoot,
                    shell: process.platform === 'win32',
                });

                this.process.stdout?.on('data', (data: Buffer) => {
                    this.buffer += data.toString();
                    let newlineIdx: number;
                    while ((newlineIdx = this.buffer.indexOf('\n')) !== -1) {
                        const line = this.buffer.substring(0, newlineIdx).trim();
                        this.buffer = this.buffer.substring(newlineIdx + 1);
                        if (line) { this.handleLine(line); }
                    }
                });

                this.process.stderr?.on('data', (data: Buffer) => {
                    const msg = data.toString().trim();
                    if (msg) { console.log('[Cortex Server]', msg); }
                });

                this.process.on('error', (err) => {
                    console.error('[Cortex] Process error:', err.message);
                    this.emit('error', err);
                    reject(err);
                });

                this.process.on('exit', (code) => {
                    this._connected = false;
                    this.rejectAllPending('Process exited');
                    this.emit('disconnected', code);
                    this.attemptReconnect();
                });

                setTimeout(async () => {
                    try {
                        await this.initialize();
                        this._connected = true;
                        this.reconnectAttempts = 0;
                        this.emit('connected');
                        resolve();
                    } catch (err) {
                        reject(err);
                    }
                }, 1500);

            } catch (err) {
                reject(err);
            }
        });
    }

    private attemptReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('[Cortex] Max reconnect attempts reached');
            this.emit('reconnectFailed');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 15000);
        console.log(`[Cortex] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        this.reconnectTimer = setTimeout(async () => {
            try {
                await this.start();
                console.log('[Cortex] Reconnected successfully');
                this.emit('reconnected');
            } catch (_e) {
                console.log('[Cortex] Reconnect failed');
            }
        }, delay);
    }

    private async initialize(): Promise<void> {
        const result = await this.sendRequest('initialize', {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'cortex-vscode', version: '1.0.0' },
        });

        if (result) {
            await this.sendNotification('notifications/initialized', {});
        }
    }

    async callTool(name: string, args: Record<string, any> = {}): Promise<any> {
        if (!this._connected) {
            throw new Error('Cortex MCP not connected');
        }

        const result = await this.sendRequest('tools/call', { name, arguments: args });

        if (result?.content) {
            for (const item of result.content) {
                if (item.type === 'text') {
                    try { return JSON.parse(item.text); } catch (_e) { return item.text; }
                }
            }
        }
        return result;
    }

    async listTools(): Promise<any[]> {
        if (!this._connected) { return []; }
        const result = await this.sendRequest('tools/list', {});
        return result?.tools || [];
    }

    private sendRequest(method: string, params: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const id = this.requestId++;
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error(`Request ${method} timed out`));
            }, 30000);

            this.pending.set(id, { resolve, reject, timer });

            const msg = JSON.stringify({ jsonrpc: '2.0', id, method, params });
            this.process?.stdin?.write(msg + '\n');
        });
    }

    private sendNotification(method: string, params: any): void {
        const msg = JSON.stringify({ jsonrpc: '2.0', method, params });
        this.process?.stdin?.write(msg + '\n');
    }

    private handleLine(line: string): void {
        try {
            const msg = JSON.parse(line);
            if (msg.id !== undefined && this.pending.has(msg.id)) {
                const { resolve, reject, timer } = this.pending.get(msg.id)!;
                clearTimeout(timer);
                this.pending.delete(msg.id);

                if (msg.error) {
                    reject(new Error(msg.error.message || 'Unknown MCP error'));
                } else {
                    resolve(msg.result);
                }
            }
        } catch (_e) {
        }
    }

    private rejectAllPending(reason: string): void {
        for (const [id, { reject, timer }] of this.pending) {
            clearTimeout(timer);
            reject(new Error(reason));
        }
        this.pending.clear();
    }

    async stop(): Promise<void> {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.reconnectAttempts = this.maxReconnectAttempts;
        this.rejectAllPending('Client stopped');
        this._connected = false;

        if (this.process) {
            this.process.kill();
            this.process = null;
        }
    }

    dispose(): void {
        this.stop();
    }
}
