/**
 * Status Bar Provider — Shows Cortex connection status and memory count.
 */
import * as vscode from 'vscode';

export class StatusBarProvider {
    private statusBarItem: vscode.StatusBarItem;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = 'cortex.openDashboard';
        this.setDisconnected();
    }

    show(): void {
        const config = vscode.workspace.getConfiguration('cortex');
        if (config.get<boolean>('showStatusBar', true)) {
            this.statusBarItem.show();
        }
    }

    hide(): void {
        this.statusBarItem.hide();
    }

    setConnecting(): void {
        this.statusBarItem.text = '$(loading~spin) Cortex: Connecting…';
        this.statusBarItem.tooltip = 'Cortex MCP server is starting…';
        this.statusBarItem.backgroundColor = undefined;
    }

    setConnected(memoryCount: number): void {
        this.statusBarItem.text = `$(brain) Cortex: ${memoryCount} memories`;
        this.statusBarItem.tooltip = `Cortex AI Memory — ${memoryCount} active memories\nClick to open dashboard`;
        this.statusBarItem.backgroundColor = undefined;
    }

    setDisconnected(): void {
        this.statusBarItem.text = '$(warning) Cortex: Disconnected';
        this.statusBarItem.tooltip = 'Cortex MCP server is not running. Click to reconnect.';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }

    setError(message: string): void {
        this.statusBarItem.text = '$(error) Cortex: Error';
        this.statusBarItem.tooltip = `Cortex error: ${message}`;
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    }

    dispose(): void {
        this.statusBarItem.dispose();
    }
}
