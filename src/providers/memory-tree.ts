import * as vscode from 'vscode';
import { MCPClient } from '../mcp-client';

export class MemoryTreeProvider implements vscode.TreeDataProvider<MemoryTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<MemoryTreeItem | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private memories: Map<string, any[]> = new Map();

    constructor(private client: MCPClient) { }

    getMemoryCount(): number {
        let count = 0;
        for (const items of this.memories.values()) {
            count += items.length;
        }
        return count;
    }

    async loadMemories(): Promise<void> {
        this.memories.clear();

        if (!this.client.connected) {
            this._onDidChangeTreeData.fire(undefined);
            return;
        }

        try {
            const result = await this.client.callTool('list_memories', { limit: 50 });

            if (result && typeof result === 'object') {
                for (const [type, items] of Object.entries(result)) {
                    if (Array.isArray(items) && items.length > 0) {
                        this.memories.set(type, items);
                    }
                }
            }
        } catch (_e) { }

        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: MemoryTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: MemoryTreeItem): MemoryTreeItem[] {
        if (!element) {
            return Array.from(this.memories.entries()).map(([type, items]) => {
                const icon = this.getTypeIcon(type);
                const item = new MemoryTreeItem(
                    `${icon} ${type.replace(/_/g, ' ')} (${items.length})`,
                    vscode.TreeItemCollapsibleState.Collapsed
                );
                item.contextValue = 'memoryCategory';
                item.categoryType = type;
                return item;
            });
        }

        if (element.categoryType) {
            const items = this.memories.get(element.categoryType) || [];
            return items.map(m => {
                const label = m.intent || m.action || m.content || 'Memory';
                const truncated = label.length > 60 ? label.substring(0, 60) + '…' : label;
                const item = new MemoryTreeItem(truncated, vscode.TreeItemCollapsibleState.None);
                item.memory = m;
                item.contextValue = 'memoryItem';
                item.tooltip = [
                    m.intent,
                    m.action ? `Action: ${m.action}` : '',
                    m.reason ? `Reason: ${m.reason}` : '',
                    `Confidence: ${((m.confidence || 0.5) * 100).toFixed(0)}%`,
                ].filter(Boolean).join('\n');
                item.command = {
                    command: 'cortex.showMemoryDetail',
                    title: 'View Memory',
                    arguments: [m],
                };
                return item;
            });
        }

        return [];
    }

    private getTypeIcon(type: string): string {
        const icons: Record<string, string> = {
            decision: '🧭',
            bug_fix: '🐛',
            correction: '⚠️',
            convention: '📏',
            insight: '💡',
            code_change: '💻',
            dependency: '📦',
            proven_pattern: '✅',
            failed_suggestion: '❌',
        };
        return icons[type] || '🧠';
    }
}

export class MemoryTreeItem extends vscode.TreeItem {
    categoryType?: string;
    memory?: any;
}
