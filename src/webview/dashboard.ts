/**
 * Dashboard Webview — Premium stats dashboard for Cortex.
 */
import * as vscode from 'vscode';
import { MCPClient } from '../mcp-client';

export class DashboardPanel {
    public static currentPanel: DashboardPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, private client: MCPClient) {
        this.panel = panel;

        this.panel.onDidDispose(() => {
            DashboardPanel.currentPanel = undefined;
            this.disposables.forEach(d => d.dispose());
        }, null, this.disposables);
    }

    static async createOrShow(client: MCPClient): Promise<void> {
        if (DashboardPanel.currentPanel) {
            DashboardPanel.currentPanel.panel.reveal(vscode.ViewColumn.One);
            await DashboardPanel.currentPanel.update();
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'cortexDashboard',
            '🧠 Cortex Dashboard',
            vscode.ViewColumn.One,
            { enableScripts: true, retainContextWhenHidden: true },
        );

        DashboardPanel.currentPanel = new DashboardPanel(panel, client);
        await DashboardPanel.currentPanel.update();
    }

    private async update(): Promise<void> {
        let stats: any = {};
        let memories: any = {};

        try {
            stats = await this.client.callTool('get_stats');
        } catch { /* ignore */ }

        try {
            memories = await this.client.callTool('list_memories', { limit: 10 });
        } catch { /* ignore */ }

        // Count memories per type
        const typeCounts: Record<string, number> = {};
        let totalMemories = 0;
        if (memories && typeof memories === 'object') {
            for (const [type, items] of Object.entries(memories)) {
                if (Array.isArray(items)) {
                    typeCounts[type] = items.length;
                    totalMemories += items.length;
                }
            }
        }

        this.panel.webview.html = this.getHtml(stats, typeCounts, totalMemories);
    }

    private getHtml(stats: any, typeCounts: Record<string, number>, totalMemories: number): string {
        const typeCards = Object.entries(typeCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => `
                <div class="type-card">
                    <div class="type-icon">${this.getTypeEmoji(type)}</div>
                    <div class="type-count">${count}</div>
                    <div class="type-name">${type.replace(/_/g, ' ')}</div>
                </div>
            `).join('');

        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            background: #0a0a0f;
            color: #e2e8f0;
            padding: 32px;
            min-height: 100vh;
        }

        .header {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 32px;
        }
        .header h1 {
            font-size: 28px;
            font-weight: 700;
            background: linear-gradient(135deg, #8b5cf6, #06b6d4);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .header .subtitle {
            color: #64748b;
            font-size: 14px;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 32px;
        }
        .stat-card {
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(6, 182, 212, 0.04));
            border: 1px solid rgba(139, 92, 246, 0.15);
            border-radius: 16px;
            padding: 24px;
            text-align: center;
            transition: transform 0.2s, border-color 0.2s;
        }
        .stat-card:hover {
            transform: translateY(-2px);
            border-color: rgba(139, 92, 246, 0.3);
        }
        .stat-value {
            font-size: 36px;
            font-weight: 800;
            background: linear-gradient(135deg, #8b5cf6, #a78bfa);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .stat-label {
            color: #94a3b8;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 8px;
        }

        .section-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #f1f5f9;
        }

        .types-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 12px;
            margin-bottom: 32px;
        }
        .type-card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 12px;
            padding: 16px;
            text-align: center;
            transition: background 0.2s;
        }
        .type-card:hover {
            background: rgba(255, 255, 255, 0.06);
        }
        .type-icon { font-size: 24px; margin-bottom: 8px; }
        .type-count {
            font-size: 24px;
            font-weight: 700;
            color: #e2e8f0;
        }
        .type-name {
            font-size: 11px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 4px;
        }

        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.06);
            color: #475569;
            font-size: 12px;
            text-align: center;
        }
        .footer a { color: #8b5cf6; text-decoration: none; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1>🧠 Cortex Dashboard</h1>
            <div class="subtitle">Persistent AI Memory — Your coding brain across sessions</div>
        </div>
    </div>

    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-value">${totalMemories || stats.activeMemories || 0}</div>
            <div class="stat-label">Active Memories</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.totalEvents || 0}</div>
            <div class="stat-label">Events Processed</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${this.formatBytes(stats.dbSizeBytes || 0)}</div>
            <div class="stat-label">Database Size</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${this.formatUptime(stats.uptime || 0)}</div>
            <div class="stat-label">Uptime</div>
        </div>
    </div>

    <div class="section-title">Memory Types</div>
    <div class="types-grid">
        ${typeCards || '<div class="type-card"><div class="type-icon">📭</div><div class="type-count">0</div><div class="type-name">no memories yet</div></div>'}
    </div>

    <div class="footer">
        Cortex MCP v1.0.3 • <a href="https://cortex-website-theta.vercel.app">cortex-website</a> • Made with 💜
    </div>
</body>
</html>`;
    }

    private getTypeEmoji(type: string): string {
        const emojis: Record<string, string> = {
            decision: '🧭',
            bug_fix: '🐛',
            correction: '⚠️',
            convention: '📏',
            code_change: '💻',
            insight: '💡',
            dependency: '📦',
            proven_pattern: '✅',
            failed_suggestion: '❌',
            conversation: '💬',
            file_snapshot: '📄',
        };
        return emojis[type] || '🧠';
    }

    private formatBytes(bytes: number): string {
        if (bytes < 1024) { return `${bytes}B`; }
        if (bytes < 1048576) { return `${(bytes / 1024).toFixed(0)}K`; }
        return `${(bytes / 1048576).toFixed(1)}M`;
    }

    private formatUptime(seconds: number): string {
        if (seconds < 60) { return `${seconds}s`; }
        if (seconds < 3600) { return `${Math.floor(seconds / 60)}m`; }
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h${m}m`;
    }
}
