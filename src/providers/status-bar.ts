/**
 * Status Bar Provider — Shows Cortex connection status, memory count, and plan.
 */
import * as vscode from 'vscode';

type Plan = 'FREE' | 'TRIAL' | 'PRO';

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

    /** Show plan-aware connected state */
    setConnectedWithPlan(memoryCount: number, plan: Plan, trialDaysLeft: number | null): void {
        const planBadge = this.getPlanBadge(plan, trialDaysLeft);
        this.statusBarItem.text = `$(brain) Cortex: ${memoryCount} memories ${planBadge}`;
        this.statusBarItem.tooltip = this.getPlanTooltip(memoryCount, plan, trialDaysLeft);
        this.statusBarItem.backgroundColor = undefined;

        if (plan === 'FREE') {
            this.statusBarItem.command = 'cortex.upgrade';
        } else {
            this.statusBarItem.command = 'cortex.openDashboard';
        }
    }

    /** Show plan without connection (pre-connect state) */
    setPlan(plan: Plan, trialDaysLeft: number | null): void {
        const planBadge = this.getPlanBadge(plan, trialDaysLeft);
        this.statusBarItem.text = `$(brain) Cortex ${planBadge}`;
        this.statusBarItem.tooltip = this.getPlanTooltip(0, plan, trialDaysLeft);
        this.statusBarItem.backgroundColor = undefined;
    }

    /** Show free plan state */
    setFree(): void {
        this.statusBarItem.text = '$(brain) Cortex: Free';
        this.statusBarItem.tooltip = 'Cortex Free Plan — 20 memories, basic features\nClick to upgrade';
        this.statusBarItem.backgroundColor = undefined;
        this.statusBarItem.command = 'cortex.upgrade';
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

    // ── Private helpers ────────────────────────────────────────────────

    private getPlanBadge(plan: Plan, trialDaysLeft: number | null): string {
        switch (plan) {
            case 'PRO': return '⭐ PRO';
            case 'TRIAL':
                return trialDaysLeft !== null ? `🕐 Trial (${trialDaysLeft}d)` : '🕐 Trial';
            case 'FREE': return '— Free';
            default: return '';
        }
    }

    private getPlanTooltip(memoryCount: number, plan: Plan, trialDaysLeft: number | null): string {
        const base = memoryCount > 0 ? `${memoryCount} active memories\n` : '';

        switch (plan) {
            case 'PRO': return `${base}⭐ Cortex PRO — All features unlocked, unlimited memories`;
            case 'TRIAL':
                return `${base}🕐 Cortex Trial — ${trialDaysLeft ?? '?'} days remaining\nAll PRO features active during trial\nClick to view dashboard`;
            case 'FREE': return `${base}Cortex Free — 20 memories, basic features\nClick to upgrade to PRO`;
            default: return `${base}Click to open dashboard`;
        }
    }
}
