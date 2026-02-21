/**
 * Cortex VS Code Extension — Entry Point
 * 
 * Provides a sidebar memory browser, status bar indicator, and commands
 * to interact with the Cortex MCP persistent memory server.
 * 
 * Includes Google OAuth authentication, license management, and
 * feature gating for FREE/TRIAL/PRO plans.
 */
import * as vscode from 'vscode';
import { MCPClient } from './mcp-client';
import { MemoryTreeProvider } from './providers/memory-tree';
import { StatusBarProvider } from './providers/status-bar';
import { registerCommands } from './commands/commands';
import { DashboardPanel } from './webview/dashboard';
import { runSetupWizard } from './commands/setup';
import { AuthProvider } from './auth/auth-provider';
import { LicenseSync } from './auth/license-sync';
import { registerLoginCommands } from './commands/login';

let client: MCPClient;
let treeProvider: MemoryTreeProvider;
let statusBar: StatusBarProvider;
let authProvider: AuthProvider;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    console.log('[Cortex] Extension activating…');

    // Determine workspace root
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();

    // Initialize core components
    client = new MCPClient(workspaceRoot);
    treeProvider = new MemoryTreeProvider(client);
    statusBar = new StatusBarProvider();
    authProvider = new AuthProvider(context);

    // ── URI Handler — Receives OAuth callback ──────────────────────────
    context.subscriptions.push(
        vscode.window.registerUriHandler({
            handleUri: async (uri: vscode.Uri) => {
                if (uri.path === '/auth/callback') {
                    const success = await authProvider.handleCallback(uri);
                    if (success) {
                        // Refresh license status after login
                        const profile = await authProvider.getProfile();
                        if (profile) {
                            statusBar.setPlan(profile.plan, profile.trial_days_left);
                        }
                        // Reconnect MCP if not connected
                        if (!client.connected) {
                            try { await client.start(); } catch { /* handled below */ }
                        }
                    }
                }
            },
        })
    );

    // Register tree view
    const treeView = vscode.window.createTreeView('cortexMemoryTree', {
        treeDataProvider: treeProvider,
        showCollapseAll: true,
    });
    context.subscriptions.push(treeView);

    // Register all commands
    registerCommands(context, client, treeProvider);
    registerLoginCommands(context, authProvider);

    // Register dashboard command
    context.subscriptions.push(
        vscode.commands.registerCommand('cortex.openDashboard', async () => {
            await DashboardPanel.createOrShow(client);
        })
    );

    // Register setup wizard
    context.subscriptions.push(
        vscode.commands.registerCommand('cortex.setup', async () => {
            const success = await runSetupWizard();
            if (success && !client.connected) {
                try {
                    await client.start();
                } catch { /* handled by event listeners */ }
            }
        })
    );

    // Register walkthrough opener
    context.subscriptions.push(
        vscode.commands.registerCommand('cortex.openWalkthrough', () => {
            vscode.commands.executeCommand(
                'workbench.action.openWalkthrough',
                'cortex.cortex-memory#cortex.gettingStarted',
                false
            );
        })
    );

    // ── First Run Detection ────────────────────────────────────────────
    const hasRunBefore = context.globalState.get<boolean>('cortex.hasRunBefore', false);
    if (!hasRunBefore) {
        context.globalState.update('cortex.hasRunBefore', true);
        setTimeout(() => {
            vscode.commands.executeCommand(
                'workbench.action.openWalkthrough',
                'cortex.cortex-memory#cortex.gettingStarted',
                false
            );
        }, 2000);
    }

    // ── License Check on Startup ───────────────────────────────────────
    const profile = await authProvider.getProfile();
    if (profile) {
        statusBar.setPlan(profile.plan, profile.trial_days_left);

        // Trial expiry warning
        if (profile.plan === 'TRIAL' && profile.trial_days_left !== null) {
            if (profile.trial_days_left <= 2 && profile.trial_days_left > 0) {
                vscode.window.showWarningMessage(
                    `Your Cortex trial ends in ${profile.trial_days_left} day(s). Upgrade to keep all features.`,
                    'Upgrade to Pro'
                ).then(action => {
                    if (action === 'Upgrade to Pro') {
                        vscode.commands.executeCommand('cortex.upgrade');
                    }
                });
            } else if (profile.trial_days_left <= 0) {
                vscode.window.showWarningMessage(
                    'Your Cortex trial has expired. You\'re now on the Free plan (20 memories, basic features).',
                    'Upgrade to Pro', 'OK'
                ).then(action => {
                    if (action === 'Upgrade to Pro') {
                        vscode.commands.executeCommand('cortex.upgrade');
                    }
                });
            }
        }
    } else if (!LicenseSync.hasKey()) {
        // No profile AND no local key — prompt to sign in
        statusBar.setFree();
    }

    // Show status bar
    statusBar.show();
    context.subscriptions.push(statusBar);
    context.subscriptions.push(authProvider);

    // ── MCP Client Event Handlers ──────────────────────────────────────
    client.on('connected', () => {
        statusBar.setConnecting();
    });

    client.on('initialized', async () => {
        await treeProvider.loadMemories();
        const currentProfile = await authProvider.getProfile();
        if (currentProfile) {
            statusBar.setConnectedWithPlan(
                treeProvider.getMemoryCount(),
                currentProfile.plan,
                currentProfile.trial_days_left,
            );
        } else {
            statusBar.setConnected(treeProvider.getMemoryCount());
        }
    });

    client.on('disconnected', () => {
        statusBar.setDisconnected();
    });

    client.on('error', (err: Error) => {
        statusBar.setError(err.message);
    });

    // Auth state changes → update status bar
    authProvider.onDidChangeAuth(async (newProfile) => {
        if (newProfile) {
            statusBar.setPlan(newProfile.plan, newProfile.trial_days_left);
        } else {
            statusBar.setFree();
        }
    });

    // Auto-start if configured  
    const config = vscode.workspace.getConfiguration('cortex');
    if (config.get<boolean>('autoStart', true)) {
        statusBar.setConnecting();
        try {
            await client.start();
        } catch (err: any) {
            statusBar.setError(err.message);
            vscode.window.showWarningMessage(
                `Cortex: Failed to connect — ${err.message}. Make sure cortex-mcp is installed: npm install -g cortex-mcp`,
                'Retry', 'Install'
            ).then(action => {
                if (action === 'Retry') {
                    client.start().catch(() => { });
                } else if (action === 'Install') {
                    const terminal = vscode.window.createTerminal('Cortex Install');
                    terminal.sendText('npm install -g cortex-mcp');
                    terminal.show();
                }
            });
        }
    }

    // Auto-refresh on workspace change
    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders(async () => {
            if (client.connected) {
                await treeProvider.loadMemories();
                statusBar.setConnected(treeProvider.getMemoryCount());
            }
        })
    );

    // Periodic refresh every 60 seconds
    const refreshInterval = setInterval(async () => {
        if (client.connected) {
            await treeProvider.loadMemories();
            statusBar.setConnected(treeProvider.getMemoryCount());
        }
    }, 60000);

    context.subscriptions.push({ dispose: () => clearInterval(refreshInterval) });

    console.log('[Cortex] Extension activated successfully');
}

export function deactivate(): void {
    console.log('[Cortex] Extension deactivating…');
    client?.dispose();
    statusBar?.dispose();
    authProvider?.dispose();
}
