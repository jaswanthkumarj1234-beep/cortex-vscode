import * as vscode from 'vscode';
import { MCPClient } from './mcp-client';
import { MemoryTreeProvider } from './providers/memory-tree';
import { StatusBarProvider } from './providers/status-bar';
import { StatsWebviewProvider } from './providers/stats-webview';
import { CortexCodeLensProvider } from './providers/codelens-provider';
import { InlineAnnotationProvider } from './providers/inline-annotations';
import { FileWatcher } from './providers/file-watcher';
import { AuthProvider } from './auth/auth-provider';
import { DashboardPanel } from './webview/dashboard';
import { registerCommands } from './commands/commands';
import { registerLoginCommands } from './commands/login';
import { runSetupWizard } from './commands/setup';

let client: MCPClient;
let treeProvider: MemoryTreeProvider;
let statusBar: StatusBarProvider;
let authProvider: AuthProvider;
let codeLensProvider: CortexCodeLensProvider;
let inlineAnnotations: InlineAnnotationProvider;
let fileWatcher: FileWatcher;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    console.log('[Cortex] Extension activating…');

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();

    client = new MCPClient(workspaceRoot);
    client.setExtensionPath(context.extensionPath);
    treeProvider = new MemoryTreeProvider(client);
    statusBar = new StatusBarProvider();
    authProvider = new AuthProvider(context);

    const treeView = vscode.window.createTreeView('cortexMemoryTree', {
        treeDataProvider: treeProvider,
        showCollapseAll: true,
    });
    context.subscriptions.push(treeView);

    const statsProvider = new StatsWebviewProvider(client);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('cortexStatsView', statsProvider)
    );

    codeLensProvider = new CortexCodeLensProvider(client);
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider({ scheme: 'file' }, codeLensProvider)
    );

    inlineAnnotations = new InlineAnnotationProvider(client);
    context.subscriptions.push(inlineAnnotations);

    fileWatcher = new FileWatcher(client);
    context.subscriptions.push(fileWatcher);

    registerCommands(context, client, treeProvider);
    registerLoginCommands(context, authProvider);

    // ─── Quick Actions Menu (status bar click) ──────────────────────
    context.subscriptions.push(
        vscode.commands.registerCommand('cortex.showQuickActions', async () => {
            const items: vscode.QuickPickItem[] = [
                { label: '$(graph-line) Open Dashboard', description: 'View memories, stats, and settings' },
                { label: '$(add) Store a Memory', description: 'Save a decision, convention, or bug fix' },
                { label: '$(search) Search Memories', description: 'Find a specific memory' },
                { label: '$(refresh) Refresh', description: 'Reload memories from server' },
                { label: '$(gear) Settings', description: 'Configure Cortex' },
            ];
            if (!client.connected) {
                items.unshift({ label: '$(plug) Connect', description: 'Start the Cortex MCP server' });
            }
            const pick = await vscode.window.showQuickPick(items, { placeHolder: 'Cortex — Quick Actions' });
            if (!pick) return;
            if (pick.label.includes('Dashboard')) { vscode.commands.executeCommand('cortex.openDashboard'); }
            else if (pick.label.includes('Store')) { vscode.commands.executeCommand('cortex.storeMemory'); }
            else if (pick.label.includes('Search')) { vscode.commands.executeCommand('cortex.recallMemory'); }
            else if (pick.label.includes('Refresh')) { vscode.commands.executeCommand('cortex.refreshMemories'); }
            else if (pick.label.includes('Settings')) { vscode.commands.executeCommand('workbench.action.openSettings', 'cortex'); }
            else if (pick.label.includes('Connect')) { vscode.commands.executeCommand('cortex.reconnect'); }
        })
    );

    // ─── Reconnect command (1-click, used by status bar + quick actions) ──
    context.subscriptions.push(
        vscode.commands.registerCommand('cortex.reconnect', async () => {
            if (client.connected) { return; }
            statusBar.setConnecting();
            try {
                await client.start();
            } catch (_e) {
                statusBar.setDisconnected();
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('cortex.setup', async () => {
            const success = await runSetupWizard();
            if (success && !client.connected) {
                try { await client.start(); } catch (_e) { }
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('cortex.openDashboard', async () => {
            if (!client.connected) {
                vscode.window.showWarningMessage('Cortex is not connected.', 'Connect', 'Setup').then(a => {
                    if (a === 'Connect') { client.start().catch(() => { }); }
                    if (a === 'Setup') { vscode.commands.executeCommand('cortex.setup'); }
                });
                return;
            }
            await DashboardPanel.createOrShow(client);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('cortex.openWalkthrough', () => {
            vscode.commands.executeCommand(
                'workbench.action.openWalkthrough',
                'cortex.cortex-memory#cortex.gettingStarted',
                true
            );
        })
    );

    context.subscriptions.push(
        vscode.window.registerUriHandler({
            handleUri: async (uri: vscode.Uri) => {
                if (uri.path === '/auth/callback') {
                    const success = await authProvider.handleCallback(uri);
                    if (success) {
                        const profile = await authProvider.getProfile();
                        if (profile) {
                            statusBar.setPlan(profile.plan, profile.trial_days_left);
                        }
                        if (!client.connected) {
                            try { await client.start(); } catch (_e) { }
                        }
                    }
                }
            },
        })
    );

    client.on('connecting', () => statusBar.setConnecting());

    client.on('connected', async () => {
        await treeProvider.loadMemories();
        const profile = await authProvider.getProfile();
        if (profile) {
            statusBar.setConnectedWithPlan(
                treeProvider.getMemoryCount(),
                profile.plan,
                profile.trial_days_left
            );
        } else {
            statusBar.setConnected(treeProvider.getMemoryCount());
        }

        // ─── Auto-scan: scan workspace on first connect ──────────────
        const scanKey = `cortex.scanned.${workspaceRoot}`;
        if (!context.globalState.get<boolean>(scanKey)) {
            await context.globalState.update(scanKey, true);
            try {
                await client.callTool('scan_project', { workspaceRoot });
                await treeProvider.loadMemories();
            } catch (_e) { /* silent — first-run scan is best-effort */ }
        }
    });

    client.on('disconnected', () => statusBar.setDisconnected());
    client.on('reconnectFailed', () => {
        statusBar.setDisconnected();
        // Only bother the user if they actually have memories at stake
        if (treeProvider.getMemoryCount() > 0) {
            vscode.window.showWarningMessage(
                'Cortex disconnected. Click status bar to reconnect.',
            );
        }
    });
    client.on('reconnected', async () => {
        await treeProvider.loadMemories();
        statusBar.setConnected(treeProvider.getMemoryCount());
    });
    client.on('error', (err: Error) => statusBar.setError(err.message));

    authProvider.onDidChangeAuth(async (profile) => {
        if (profile) {
            statusBar.setPlan(profile.plan, profile.trial_days_left);
        } else {
            statusBar.setFree();
        }
    });

    statusBar.show();

    // ─── Zero-Config: Auto-connect silently on first install ─────────
    const hasSeenWalkthrough = context.globalState.get<boolean>('cortex.hasSeenWalkthrough');
    if (!hasSeenWalkthrough) {
        await context.globalState.update('cortex.hasSeenWalkthrough', true);
        // Don't prompt — just auto-connect. Show subtle notification after connected.
        client.once('connected', () => {
            vscode.window.showInformationMessage(
                '🧠 Cortex is ready! Your AI now has persistent memory.',
                'Learn More'
            ).then(a => {
                if (a === 'Learn More') { vscode.commands.executeCommand('cortex.openWalkthrough'); }
            });
        });
    }

    const profile = await authProvider.getProfile();
    if (profile) {
        statusBar.setPlan(profile.plan, profile.trial_days_left);

        if (profile.plan === 'TRIAL' && profile.trial_days_left !== null && profile.trial_days_left <= 2) {
            vscode.window.showWarningMessage(
                `⏳ Your Cortex trial expires in ${profile.trial_days_left} day(s). Upgrade to keep all features.`,
                'Upgrade Now'
            ).then(a => {
                if (a === 'Upgrade Now') { vscode.commands.executeCommand('cortex.upgrade'); }
            });
        }
    }

    // ─── Auto-start with silent retry ────────────────────────────────
    const config = vscode.workspace.getConfiguration('cortex');
    if (config.get<boolean>('autoStart', true)) {
        try {
            await client.start();
        } catch (err: any) {
            console.log('[Cortex] Auto-start failed, retrying in 5s:', err.message);
            // Silent retry — don't bother the user
            setTimeout(async () => {
                if (!client.connected) {
                    try { await client.start(); } catch (_e) {
                        console.log('[Cortex] Retry failed, user can connect manually via status bar');
                    }
                }
            }, 5000);
        }
    }

    const refreshInterval = setInterval(async () => {
        if (client.connected) {
            try { await treeProvider.loadMemories(); } catch (_e) { }
        }
    }, 5 * 60 * 1000);
    context.subscriptions.push({ dispose: () => clearInterval(refreshInterval) });

    context.subscriptions.push(client);
    context.subscriptions.push(statusBar);
    context.subscriptions.push(authProvider);

    console.log('[Cortex] Extension activated');
}

export function deactivate(): void {
    client?.stop();
}
