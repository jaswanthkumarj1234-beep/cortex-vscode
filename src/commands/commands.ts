import * as vscode from 'vscode';
import { MCPClient, MemoryItem } from '../mcp-client';
import { MemoryTreeProvider } from '../providers/memory-tree';

export function registerCommands(
    context: vscode.ExtensionContext,
    client: MCPClient,
    treeProvider: MemoryTreeProvider,
): void {
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

            const content = await vscode.window.showInputBox({
                prompt: `Enter the ${type.value.toLowerCase()} to remember`,
                placeHolder: 'e.g. "We decided to use PostgreSQL instead of MongoDB because..."',
                validateInput: (v) => v.length < 10 ? 'Memory should be at least 10 characters' : null,
            });
            if (!content) { return; }

            const activeFile = vscode.window.activeTextEditor?.document.uri.fsPath;
            const files: string[] = activeFile ? [activeFile] : [];

            try {
                await client.callTool('store_memory', {
                    type: type.value,
                    content,
                    files,
                });
                vscode.window.showInformationMessage(`✅ Memory stored: ${content.substring(0, 50)}…`);
                await treeProvider.loadMemories();
            } catch (err: any) {
                vscode.window.showErrorMessage(`Failed to store memory: ${err.message}`);
            }
        })
    );

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

    context.subscriptions.push(
        vscode.commands.registerCommand('cortex.searchMemories', async () => {
            const typeFilter = await vscode.window.showQuickPick(
                [
                    { label: '$(list-unordered) All Types', value: 'ALL' },
                    { label: '$(compass) Decisions', value: 'DECISION' },
                    { label: '$(bug) Bug Fixes', value: 'BUG_FIX' },
                    { label: '$(warning) Corrections', value: 'CORRECTION' },
                    { label: '$(law) Conventions', value: 'CONVENTION' },
                    { label: '$(lightbulb) Insights', value: 'INSIGHT' },
                ],
                { placeHolder: 'Filter by type' }
            );
            if (!typeFilter) { return; }

            try {
                const args: any = { limit: 50 };
                if (typeFilter.value !== 'ALL') {
                    args.type = typeFilter.value;
                }

                const result = await client.callTool('list_memories', args);

                const allMemories: any[] = [];
                if (result && typeof result === 'object') {
                    for (const [type, items] of Object.entries(result)) {
                        if (Array.isArray(items)) {
                            for (const item of items) {
                                allMemories.push({ ...item as any, type: (item as any).type || type });
                            }
                        }
                    }
                }

                if (allMemories.length === 0) {
                    vscode.window.showInformationMessage('No memories found.');
                    return;
                }

                const items: (vscode.QuickPickItem & { memory: any })[] = allMemories.map((m: any) => ({
                    label: `$(circle-filled) ${m.intent || m.action || 'Memory'}`,
                    description: m.type?.toUpperCase(),
                    detail: m.action || m.reason || '',
                    memory: m,
                }));

                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: `${allMemories.length} memories found`,
                    matchOnDescription: true,
                    matchOnDetail: true,
                });

                if (selected) {
                    showMemoryDetail(selected.memory);
                }
            } catch (err: any) {
                vscode.window.showErrorMessage(`Search failed: ${err.message}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('cortex.showFileMemories', async (filePath?: string) => {
            const targetPath = filePath || vscode.window.activeTextEditor?.document.uri.fsPath;
            if (!targetPath) {
                vscode.window.showWarningMessage('No file selected.');
                return;
            }

            const fileName = targetPath.split(/[\\/]/).pop() || '';

            try {
                const result = await client.callTool('recall_memory', {
                    query: fileName,
                    currentFile: targetPath,
                    maxResults: 10,
                });

                if (!result?.memories?.length) {
                    vscode.window.showInformationMessage(`No memories related to ${fileName}.`);
                    return;
                }

                const items: (vscode.QuickPickItem & { memory: any })[] = result.memories.map((m: any) => ({
                    label: `$(circle-filled) ${m.memory?.intent || m.intent || 'Memory'}`,
                    description: `${m.memory?.type || m.type || ''} • ${((m.score || 0) * 100).toFixed(0)}%`,
                    detail: m.memory?.action || m.action || '',
                    memory: m.memory || m,
                }));

                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: `${result.memories.length} memories for ${fileName}`,
                    matchOnDescription: true,
                    matchOnDetail: true,
                });

                if (selected) {
                    showMemoryDetail(selected.memory);
                }
            } catch (err: any) {
                vscode.window.showErrorMessage(`Failed to load file memories: ${err.message}`);
            }
        })
    );

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

    context.subscriptions.push(
        vscode.commands.registerCommand('cortex.importMemories', async () => {
            const uris = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: { 'JSON': ['json'] },
                openLabel: 'Import Memories',
            });
            if (!uris || uris.length === 0) { return; }

            try {
                const fileData = await vscode.workspace.fs.readFile(uris[0]);
                const jsonStr = Buffer.from(fileData).toString('utf-8');

                JSON.parse(jsonStr);

                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: 'Cortex: Importing memories…' },
                    async () => {
                        await client.callTool('import_memories', { data: jsonStr });
                        vscode.window.showInformationMessage('✅ Memories imported successfully!');
                        await treeProvider.loadMemories();
                    }
                );
            } catch (err: any) {
                vscode.window.showErrorMessage(`Import failed: ${err.message}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('cortex.refreshMemories', async () => {
            await treeProvider.loadMemories();
        })
    );

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

    const tagsHtml = memory.tags?.length
        ? memory.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')
        : '';

    const filesHtml = memory.relatedFiles?.length
        ? memory.relatedFiles.map(f => `<span class="tag file">${escapeHtml(f)}</span>`).join('')
        : '';

    panel.webview.html = `<!DOCTYPE html>
<html>
<head>
    <style>
        :root {
            --bg: #ffffff;
            --bg-card: #f5f5f7;
            --text: #1d1d1f;
            --text-sec: #6e6e73;
            --text-dim: #86868b;
            --border: rgba(0, 0, 0, 0.06);
            --accent: #6e56cf;
            --accent-bg: rgba(110, 86, 207, 0.08);
            --green: #34c759;
            --green-bg: rgba(52, 199, 89, 0.08);
            --radius: 12px;
        }

        body.vscode-dark {
            --bg: #161618;
            --bg-card: #1c1c1e;
            --text: #f5f5f7;
            --text-sec: #98989d;
            --text-dim: #6e6e73;
            --border: rgba(255, 255, 255, 0.06);
            --accent-bg: rgba(110, 86, 207, 0.12);
            --green-bg: rgba(52, 199, 89, 0.12);
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
            background: var(--bg);
            color: var(--text);
            padding: 28px 24px;
            -webkit-font-smoothing: antialiased;
        }

        .badges {
            display: flex;
            gap: 8px;
            margin-bottom: 14px;
        }

        .badge {
            display: inline-block;
            padding: 3px 12px;
            border-radius: 14px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.4px;
        }

        .badge.type {
            background: var(--accent-bg);
            color: var(--accent);
        }

        .badge.confidence {
            background: var(--green-bg);
            color: var(--green);
        }

        h1 {
            font-size: 20px;
            font-weight: 600;
            letter-spacing: -0.3px;
            line-height: 1.3;
            margin-bottom: 20px;
            color: var(--text);
        }

        .field {
            margin-bottom: 16px;
        }

        .field-label {
            font-size: 11px;
            font-weight: 600;
            color: var(--text-dim);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }

        .field-value {
            font-size: 14px;
            line-height: 1.6;
            color: var(--text-sec);
        }

        .tags {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }

        .tag {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 6px;
            background: var(--bg-card);
            border: 1px solid var(--border);
            color: var(--text-sec);
            font-size: 12px;
            font-weight: 500;
        }

        .tag.file {
            font-family: 'SF Mono', Menlo, Consolas, monospace;
            font-size: 11px;
        }

        .meta {
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid var(--border);
            color: var(--text-dim);
            font-size: 12px;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <div class="badges">
        <span class="badge type">${memory.type}</span>
        <span class="badge confidence">${(memory.confidence * 100).toFixed(0)}% confidence</span>
    </div>

    <h1>${escapeHtml(memory.intent)}</h1>

    ${memory.action ? `<div class="field"><div class="field-label">Action</div><div class="field-value">${escapeHtml(memory.action)}</div></div>` : ''}
    ${memory.reason ? `<div class="field"><div class="field-label">Reason</div><div class="field-value">${escapeHtml(memory.reason)}</div></div>` : ''}
    ${memory.impact ? `<div class="field"><div class="field-label">Impact</div><div class="field-value">${escapeHtml(memory.impact)}</div></div>` : ''}

    ${tagsHtml ? `<div class="field"><div class="field-label">Tags</div><div class="tags">${tagsHtml}</div></div>` : ''}
    ${filesHtml ? `<div class="field"><div class="field-label">Related Files</div><div class="tags">${filesHtml}</div></div>` : ''}

    <div class="meta">
        ID: ${memory.id}<br>
        Accessed ${memory.accessCount} times · Created ${new Date(memory.timestamp).toLocaleString()}
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
