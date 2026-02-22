import * as vscode from 'vscode';
import { MCPClient } from '../mcp-client';

export class FileWatcher implements vscode.Disposable {
    private disposables: vscode.Disposable[] = [];
    private lastNotified = new Map<string, number>();
    private cooldownMs = 30_000;

    constructor(private client: MCPClient) {
        this.disposables.push(
            vscode.workspace.onDidSaveTextDocument((doc) => this.onFileSaved(doc))
        );
    }

    private async onFileSaved(document: vscode.TextDocument): Promise<void> {
        if (!this.client.connected) { return; }

        const filePath = document.uri.fsPath;
        const now = Date.now();
        const lastTime = this.lastNotified.get(filePath) || 0;
        if (now - lastTime < this.cooldownMs) { return; }

        const fileName = filePath.split(/[\\/]/).pop() || '';

        try {
            const result = await this.client.callTool('recall_memory', {
                query: fileName,
                currentFile: filePath,
                maxResults: 5,
            });

            if (!result?.memories?.length) { return; }

            const critical = result.memories.filter((m: any) => {
                const type = (m.memory?.type || m.type || '').toUpperCase();
                return type === 'CORRECTION' || type === 'BUG_FIX';
            });

            if (critical.length > 0) {
                this.lastNotified.set(filePath, now);
                const topMemory = critical[0];
                const intent = topMemory.memory?.intent || topMemory.intent || 'Critical memory';

                vscode.window.showWarningMessage(
                    `⚠️ Cortex: ${intent}`,
                    'View All Memories'
                ).then(action => {
                    if (action === 'View All Memories') {
                        vscode.commands.executeCommand('cortex.showFileMemories', filePath);
                    }
                });
            }
        } catch (_e) {
        }
    }

    dispose(): void {
        this.disposables.forEach(d => d.dispose());
    }
}
