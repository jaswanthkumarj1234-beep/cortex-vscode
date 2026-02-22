import * as vscode from 'vscode';
import { MCPClient } from '../mcp-client';

export class CortexCodeLensProvider implements vscode.CodeLensProvider {
    private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
    readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

    private cache = new Map<string, { count: number; timestamp: number }>();
    private cacheTTL = 60_000;

    constructor(private client: MCPClient) { }

    async provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
        const config = vscode.workspace.getConfiguration('cortex');
        if (!config.get<boolean>('enableCodeLens', true)) { return []; }
        if (!this.client.connected) { return []; }

        const filePath = document.uri.fsPath;
        const fileName = filePath.split(/[\\/]/).pop() || '';

        try {
            let count = 0;
            const cached = this.cache.get(filePath);
            if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
                count = cached.count;
            } else {
                const result = await this.client.callTool('recall_memory', {
                    query: fileName,
                    currentFile: filePath,
                    maxResults: 10,
                });
                count = result?.memories?.length || 0;
                this.cache.set(filePath, { count, timestamp: Date.now() });
            }

            if (count === 0) { return []; }

            const range = new vscode.Range(0, 0, 0, 0);
            return [
                new vscode.CodeLens(range, {
                    title: `🧠 ${count} ${count === 1 ? 'memory' : 'memories'} related to this file`,
                    command: 'cortex.showFileMemories',
                    arguments: [filePath],
                }),
            ];
        } catch (_e) {
            return [];
        }
    }

    refresh(): void {
        this.cache.clear();
        this._onDidChangeCodeLenses.fire();
    }
}
