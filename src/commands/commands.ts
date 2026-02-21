/**
 * Command Handlers — All Cortex extension commands.
 */
import * as vscode from 'vscode';
import { MCPClient, MemoryItem } from '../mcp-client';
import { MemoryTreeProvider } from '../providers/memory-tree';

export function registerCommands(
    context: vscode.ExtensionContext,
    client: MCPClient,
    treeProvider: MemoryTreeProvider,
): void {
    // Store Memory
    context.subscriptions.push(
        vscode.commands.registerCommand('cortex.storeMemory', async () => {
            const type = await vscode.window.showQuickPick(
                [
                    { label: '$(compass) Decision', value: 'DECISION', description: 'A design or architecture decision' },
                    { label: '$(bug) Bug Fix', value: 'BUG_FIX', description: 'A bug that was found and fixed' },
                    { label: '$(warning) Correction', value: 'CORRECTION', description: 'A mistake that must not be repeated' },
                    { label: '$(law) Convention', value: 'CONVENTION', description: 'A coding standard or convention' },
                    { label: '$(lightbulb) Insight', value: 'INSIGHT', description: 'A useful discovery or learning' },
                ],
                { placeHolder: 'What type of memory?' }
            );
            if (!type) { return; }

            const memory = await vscode.window.showInputBox({
                prompt: `Enter the ${type.value.toLowerCase()} to remember`,
                placeHolder: 'e.g. "We decided to use PostgreSQL instead of MongoDB because..."',
                validateInput: (v) => v.length < 10 ? 'Memory should be at least 10 characters' : null,
            });
            if (!memory) { return; }

            try {
                await client.callTool('store_memory', {
                    type: type.value,
                    memory,
                });
                vscode.window.showInformationMessage(`✅ Memory stored: ${memory.substring(0, 50)}…`);
                await treeProvider.loadMemories();
            } catch (err: any) {
                vscode.window.showErrorMessage(`Failed to store memory: ${err.message}`);
            }
        })
    );

    // Recall Memory  
    context.subscriptions.push(
        vscode.commands.registerCommand('cortex.recallMemory', async () => {
            const query = await vscode.window.showInputBox({
                prompt: 'What do you want to recall?',
                placeHolder: 'e.g. "how does authentication work?" or "database migration decisions"',
            });
            if (!query) { return; }

            try {
                const result = await client.callTool('recall_memory', {
                    query,
                    currentFile: vscode.window.activeTextEditor?.document.uri.fsPath,
                });

                if (result?.memories?.length) {
                    const items: (vscode.QuickPickItem & { memory: any })[] = result.memories.map((m: any) => ({
                        label: `$(circle-filled) ${m.memory?.intent || m.intent || 'Memory'}`,
                        description: `${(m.score * 100).toFixed(0)}% match`,
                        detail: m.memory?.action || m.action || '',
                        memory: m.memory || m,
                    }));

                    const selected = await vscode.window.showQuickPick(items, {
                        placeHolder: `Found ${result.memories.length} memories`,
                        matchOnDescription: true,
                        matchOnDetail: true,
                    });

                    if (selected) {
                        showMemoryDetail(selected.memory);
                    }
                } else {
                    vscode.window.showInformationMessage('No memories found for that query.');
                }
            } catch (err: any) {
                vscode.window.showErrorMessage(`Recall failed: ${err.message}`);
            }
        })
    );

    // Search Memories
    context.subscriptions.push(
        vscode.commands.registerCommand('cortex.searchMemories', async () => {
            // Reuse recall for now
            await vscode.commands.executeCommand('cortex.recallMemory');
        })
    );

    // View Stats
    context.subscriptions.push(
        vscode.commands.registerCommand('cortex.viewStats', async () => {
            try {
                const stats = await client.callTool('get_stats');
                const message = [
                    `🧠 **Cortex Stats**`,
                    `Memories: ${stats.totalMemories || stats.activeMemories || 0}`,
                    `Events: ${stats.totalEvents || 0}`,
                    `DB Size: ${formatBytes(stats.dbSizeBytes || 0)}`,
                    `Uptime: ${formatUptime(stats.uptime || 0)}`,
                ].join(' • ');

                vscode.window.showInformationMessage(message);
            } catch (err: any) {
                vscode.window.showErrorMessage(`Stats error: ${err.message}`);
            }
        })
    );

    // Scan Project
    context.subscriptions.push(
        vscode.commands.registerCommand('cortex.scanProject', async () => {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                vscode.window.showWarningMessage('No workspace folder open.');
                return;
            }

            const confirm = await vscode.window.showInformationMessage(
                'Scan this project to capture its stack, structure, and recent git history?',
                'Scan', 'Cancel'
            );
            if (confirm !== 'Scan') { return; }

            await vscode.window.withProgress(
                { location: vscode.ProgressLocation.Notification, title: 'Cortex: Scanning project…' },
                async () => {
                    try {
                        await client.callTool('scan_project', { workspaceRoot });
                        vscode.window.showInformationMessage('✅ Project scanned successfully!');
                        await treeProvider.loadMemories();
                    } catch (err: any) {
                        vscode.window.showErrorMessage(`Scan failed: ${err.message}`);
                    }
                }
            );
        })
    );

    // Export Memories
    context.subscriptions.push(
        vscode.commands.registerCommand('cortex.exportMemories', async () => {
            try {
                const result = await client.callTool('export_memories');
                const uri = await vscode.window.showSaveDialog({
                    defaultUri: vscode.Uri.file('cortex-memories-export.json'),
                    filters: { 'JSON': ['json'] },
                });
                if (uri) {
                    const data = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
                    await vscode.workspace.fs.writeFile(uri, Buffer.from(data, 'utf-8'));
                    vscode.window.showInformationMessage(`✅ Memories exported to ${uri.fsPath}`);
                }
            } catch (err: any) {
                vscode.window.showErrorMessage(`Export failed: ${err.message}`);
            }
        })
    );

    // Refresh Memories
    context.subscriptions.push(
        vscode.commands.registerCommand('cortex.refreshMemories', async () => {
            await treeProvider.loadMemories();
        })
    );

    // Delete Memory
    context.subscriptions.push(
        vscode.commands.registerCommand('cortex.deleteMemory', async (item: any) => {
            if (!item?.memory?.id) {
                vscode.window.showWarningMessage('No memory selected.');
                return;
            }

            const confirm = await vscode.window.showWarningMessage(
                `Delete this memory?\n"${item.memory.intent?.substring(0, 60)}…"`,
                { modal: true },
                'Delete'
            );
            if (confirm !== 'Delete') { return; }

            try {
                await client.callTool('delete_memory', { id: item.memory.id });
                vscode.window.showInformationMessage('Memory deleted.');
                await treeProvider.loadMemories();
            } catch (err: any) {
                vscode.window.showErrorMessage(`Delete failed: ${err.message}`);
            }
        })
    );

    // Show Memory Detail
    context.subscriptions.push(
        vscode.commands.registerCommand('cortex.showMemoryDetail', (memory: MemoryItem) => {
            showMemoryDetail(memory);
        })
    );
}

function showMemoryDetail(memory: MemoryItem): void {
    const panel = vscode.window.createWebviewPanel(
        'cortexMemoryDetail',
        `Cortex: ${memory.type}`,
        vscode.ViewColumn.Beside,
        { enableScripts: false },
    );

    panel.webview.html = `<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
        }
        .badge {
            display: inline-block;
            padding: 2px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .type-badge { background: rgba(139, 92, 246, 0.2); color: #a78bfa; }
        .confidence-badge { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
        h1 { font-size: 18px; margin-bottom: 8px; }
        .section { margin: 16px 0; }
        .label { color: var(--vscode-descriptionForeground); font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
        .value { font-size: 14px; line-height: 1.6; }
        .tag { display: inline-block; padding: 2px 8px; margin: 2px; border-radius: 4px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); font-size: 11px; }
        .meta { color: var(--vscode-descriptionForeground); font-size: 12px; margin-top: 20px; border-top: 1px solid var(--vscode-widget-border); padding-top: 12px; }
    </style>
</head>
<body>
    <span class="badge type-badge">${memory.type}</span>
    <span class="badge confidence-badge">${(memory.confidence * 100).toFixed(0)}% confidence</span>
    <h1>${escapeHtml(memory.intent)}</h1>
    
    ${memory.action ? `<div class="section"><div class="label">Action</div><div class="value">${escapeHtml(memory.action)}</div></div>` : ''}
    ${memory.reason ? `<div class="section"><div class="label">Reason</div><div class="value">${escapeHtml(memory.reason)}</div></div>` : ''}
    ${memory.impact ? `<div class="section"><div class="label">Impact</div><div class="value">${escapeHtml(memory.impact)}</div></div>` : ''}
    
    ${memory.tags?.length ? `<div class="section"><div class="label">Tags</div><div>${memory.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div></div>` : ''}
    ${memory.relatedFiles?.length ? `<div class="section"><div class="label">Related Files</div><div>${memory.relatedFiles.map(f => `<span class="tag">${escapeHtml(f)}</span>`).join('')}</div></div>` : ''}
    
    <div class="meta">
        ID: ${memory.id} • Accessed ${memory.accessCount} times • Created ${new Date(memory.timestamp).toLocaleString()}
    </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) { return `${bytes} B`; }
    if (bytes < 1048576) { return `${(bytes / 1024).toFixed(1)} KB`; }
    return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatUptime(seconds: number): string {
    if (seconds < 60) { return `${seconds}s`; }
    if (seconds < 3600) { return `${Math.floor(seconds / 60)}m`; }
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}
