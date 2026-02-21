/**
 * Cortex VS Code Extension — Entry Point
 * 
 * Provides a sidebar memory browser, status bar indicator, and commands
 * to interact with the Cortex MCP persistent memory server.
 */
import * as vscode from 'vscode';
import { MCPClient } from './mcp-client';
import { MemoryTreeProvider } from './providers/memory-tree';
import { StatusBarProvider } from './providers/status-bar';
import { registerCommands } from './commands/commands';
import { DashboardPanel } from './webview/dashboard';
import { runSetupWizard } from './commands/setup';

let client: MCPClient;
let treeProvider: MemoryTreeProvider;
let statusBar: StatusBarProvider;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    console.log('[Cortex] Extension activating…');

    // Determine workspace root
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();

    // Initialize core components
    client = new MCPClient(workspaceRoot);
    treeProvider = new MemoryTreeProvider(client);
    statusBar = new StatusBarProvider();

    // Register tree view
    const treeView = vscode.window.createTreeView('cortexMemoryTree', {
        treeDataProvider: treeProvider,
        showCollapseAll: true,
    });
    context.subscriptions.push(treeView);

    // Register commands
    registerCommands(context, client, treeProvider);

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

    // First-run detection — show walkthrough on initial install
    const hasRunBefore = context.globalState.get<boolean>('cortex.hasRunBefore', false);
    if (!hasRunBefore) {
        context.globalState.update('cortex.hasRunBefore', true);
        // Show walkthrough on first activation (slight delay for VS Code to finish loading)
        setTimeout(() => {
            vscode.commands.executeCommand(
                'workbench.action.openWalkthrough',
                'cortex.cortex-memory#cortex.gettingStarted',
                false
            );
        }, 2000);
    }

    // Show status bar
    statusBar.show();
    context.subscriptions.push(statusBar);

    // Setup client event handlers
    client.on('connected', () => {
        statusBar.setConnecting();
    });

    client.on('initialized', async () => {
        // Load initial data
        await treeProvider.loadMemories();
        statusBar.setConnected(treeProvider.getMemoryCount());
    });

    client.on('disconnected', () => {
        statusBar.setDisconnected();
    });

    client.on('error', (err: Error) => {
        statusBar.setError(err.message);
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
}
