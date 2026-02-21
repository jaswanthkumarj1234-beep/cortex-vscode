/**
 * Memory Tree Provider — Sidebar TreeView for browsing memories by type.
 */
import * as vscode from 'vscode';
import { MCPClient, MemoryItem } from '../mcp-client';

type TreeItemType = 'category' | 'memory';

export class MemoryTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly itemType: TreeItemType,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly memory?: MemoryItem,
        public readonly memoryType?: string,
    ) {
        super(label, collapsibleState);

        if (itemType === 'category') {
            this.iconPath = this.getCategoryIcon(memoryType || '');
            this.contextValue = 'category';
        } else if (memory) {
            this.contextValue = 'memory';
            this.tooltip = this.buildTooltip(memory);
            this.description = this.getTimeAgo(memory.timestamp);
            this.iconPath = new vscode.ThemeIcon('circle-filled', this.getConfidenceColor(memory.confidence));

            this.command = {
                command: 'cortex.showMemoryDetail',
                title: 'Show Memory Detail',
                arguments: [memory],
            };
        }
    }

    private getCategoryIcon(type: string): vscode.ThemeIcon {
        const icons: Record<string, string> = {
            decision: 'compass',
            bug_fix: 'bug',
            correction: 'warning',
            convention: 'law',
            code_change: 'code',
            insight: 'lightbulb',
            dependency: 'package',
            proven_pattern: 'verified',
            failed_suggestion: 'error',
            conversation: 'comment-discussion',
            file_snapshot: 'file',
        };
        return new vscode.ThemeIcon(icons[type] || 'symbol-misc');
    }

    private getConfidenceColor(confidence: number): vscode.ThemeColor {
        if (confidence >= 0.8) { return new vscode.ThemeColor('charts.green'); }
        if (confidence >= 0.5) { return new vscode.ThemeColor('charts.yellow'); }
        return new vscode.ThemeColor('charts.red');
    }

    private buildTooltip(memory: MemoryItem): vscode.MarkdownString {
        const md = new vscode.MarkdownString();
        md.appendMarkdown(`**${memory.type.toUpperCase()}** — Confidence: ${(memory.confidence * 100).toFixed(0)}%\n\n`);
        md.appendMarkdown(`${memory.intent}\n\n`);
        if (memory.action) { md.appendMarkdown(`**Action:** ${memory.action}\n\n`); }
        if (memory.reason) { md.appendMarkdown(`**Reason:** ${memory.reason}\n\n`); }
        if (memory.tags?.length) { md.appendMarkdown(`**Tags:** ${memory.tags.join(', ')}\n\n`); }
        if (memory.relatedFiles?.length) {
            md.appendMarkdown(`**Files:** ${memory.relatedFiles.join(', ')}\n\n`);
        }
        md.appendMarkdown(`*Created ${new Date(memory.timestamp).toLocaleString()}*`);
        return md;
    }

    private getTimeAgo(timestamp: number): string {
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        if (minutes < 60) { return `${minutes}m ago`; }
        const hours = Math.floor(minutes / 60);
        if (hours < 24) { return `${hours}h ago`; }
        const days = Math.floor(hours / 24);
        if (days < 30) { return `${days}d ago`; }
        return `${Math.floor(days / 30)}mo ago`;
    }
}

export class MemoryTreeProvider implements vscode.TreeDataProvider<MemoryTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<MemoryTreeItem | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private memories: MemoryItem[] = [];
    private categorizedMemories = new Map<string, MemoryItem[]>();

    constructor(private client: MCPClient) { }

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    async loadMemories(): Promise<void> {
        try {
            const result = await this.client.callTool('list_memories', { limit: 100 });

            // list_memories returns grouped memories
            this.memories = [];
            this.categorizedMemories.clear();

            if (result && typeof result === 'object') {
                // Handle different response formats
                for (const [type, items] of Object.entries(result)) {
                    if (Array.isArray(items)) {
                        const memoryItems = items.map((item: any) => ({
                            id: item.id || '',
                            type: item.type || type,
                            intent: item.intent || item.action || '',
                            action: item.action || '',
                            reason: item.reason,
                            impact: item.impact,
                            confidence: item.confidence || 0.5,
                            importance: item.importance || 0.5,
                            tags: item.tags || [],
                            relatedFiles: item.relatedFiles || [],
                            timestamp: item.timestamp || Date.now(),
                            isActive: item.isActive !== false,
                            accessCount: item.accessCount || 0,
                        }));
                        this.categorizedMemories.set(type, memoryItems);
                        this.memories.push(...memoryItems);
                    }
                }
            }

            this.refresh();
        } catch (err: any) {
            vscode.window.showWarningMessage(`Cortex: Failed to load memories — ${err.message}`);
        }
    }

    getTreeItem(element: MemoryTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: MemoryTreeItem): MemoryTreeItem[] {
        if (!element) {
            // Root level — show categories
            const categories: MemoryTreeItem[] = [];
            for (const [type, items] of this.categorizedMemories) {
                if (items.length > 0) {
                    categories.push(new MemoryTreeItem(
                        `${this.formatTypeName(type)} (${items.length})`,
                        'category',
                        vscode.TreeItemCollapsibleState.Collapsed,
                        undefined,
                        type,
                    ));
                }
            }
            if (categories.length === 0) {
                return [new MemoryTreeItem(
                    'No memories yet — use "Cortex: Store Memory"',
                    'category',
                    vscode.TreeItemCollapsibleState.None,
                )];
            }
            return categories;
        }

        // Category children — show individual memories
        if (element.itemType === 'category' && element.memoryType) {
            const items = this.categorizedMemories.get(element.memoryType) || [];
            return items.map(memory => new MemoryTreeItem(
                memory.intent.substring(0, 80) + (memory.intent.length > 80 ? '…' : ''),
                'memory',
                vscode.TreeItemCollapsibleState.None,
                memory,
            ));
        }

        return [];
    }

    getMemoryCount(): number {
        return this.memories.length;
    }

    private formatTypeName(type: string): string {
        return type
            .replace(/_/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
    }
}
