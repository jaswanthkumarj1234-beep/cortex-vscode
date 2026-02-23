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

        this.panel.webview.onDidReceiveMessage(
            async (msg) => {
                if (msg.command === 'refresh') { await this.update(); }
                if (msg.command === 'store') { vscode.commands.executeCommand('cortex.storeMemory'); }
                if (msg.command === 'search') { vscode.commands.executeCommand('cortex.searchMemories'); }
                if (msg.command === 'export') { vscode.commands.executeCommand('cortex.exportMemories'); }
                if (msg.command === 'scan') { vscode.commands.executeCommand('cortex.scanProject'); }
            },
            null,
            this.disposables
        );
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
        } catch (_e) { }

        try {
            memories = await this.client.callTool('list_memories', { limit: 10 });
        } catch (_e) { }

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
                <div class="type-pill">
                    <span class="type-emoji">${this.getTypeEmoji(type)}</span>
                    <span class="type-label">${type.replace(/_/g, ' ')}</span>
                    <span class="type-badge">${count}</span>
                </div>
            `).join('');

        const memoryCount = totalMemories || stats.activeMemories || 0;
        const eventsCount = stats.totalEvents || 0;
        const dbSize = this.formatBytes(stats.dbSizeBytes || 0);
        const uptime = this.formatUptime(stats.uptime || 0);

        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        :root {
            --bg-primary: #ffffff;
            --bg-secondary: #f5f5f7;
            --bg-card: #ffffff;
            --text-primary: #1d1d1f;
            --text-secondary: #6e6e73;
            --text-tertiary: #86868b;
            --border: rgba(0, 0, 0, 0.06);
            --shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.03);
            --shadow-hover: 0 2px 8px rgba(0, 0, 0, 0.06), 0 8px 24px rgba(0, 0, 0, 0.06);
            --accent: #6e56cf;
            --accent-light: rgba(110, 86, 207, 0.08);
            --accent-medium: rgba(110, 86, 207, 0.14);
            --green: #34c759;
            --green-bg: rgba(52, 199, 89, 0.08);
            --blue: #007aff;
            --blue-bg: rgba(0, 122, 255, 0.08);
            --orange: #ff9500;
            --orange-bg: rgba(255, 149, 0, 0.08);
            --radius: 14px;
            --radius-sm: 10px;
        }

        body.vscode-dark {
            --bg-primary: #161618;
            --bg-secondary: #1c1c1e;
            --bg-card: #1c1c1e;
            --text-primary: #f5f5f7;
            --text-secondary: #98989d;
            --text-tertiary: #6e6e73;
            --border: rgba(255, 255, 255, 0.06);
            --shadow: 0 1px 3px rgba(0, 0, 0, 0.2), 0 4px 12px rgba(0, 0, 0, 0.15);
            --shadow-hover: 0 2px 8px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.2);
            --accent-light: rgba(110, 86, 207, 0.12);
            --accent-medium: rgba(110, 86, 207, 0.2);
            --green-bg: rgba(52, 199, 89, 0.12);
            --blue-bg: rgba(0, 122, 255, 0.12);
            --orange-bg: rgba(255, 149, 0, 0.12);
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            padding: 0;
            min-height: 100vh;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        .container {
            max-width: 720px;
            margin: 0 auto;
            padding: 40px 32px;
        }

        .header {
            margin-bottom: 36px;
        }

        .brand {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 14px;
            background: var(--accent-light);
            border-radius: 20px;
            margin-bottom: 14px;
        }

        .brand-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--accent);
        }

        .brand-label {
            font-size: 13px;
            font-weight: 600;
            color: var(--accent);
            letter-spacing: 0.3px;
        }

        .header h1 {
            font-size: 28px;
            font-weight: 700;
            letter-spacing: -0.5px;
            color: var(--text-primary);
            margin-bottom: 6px;
        }

        .header .subtitle {
            font-size: 15px;
            color: var(--text-secondary);
            font-weight: 400;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin-bottom: 32px;
        }

        .stat-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 20px;
            box-shadow: var(--shadow);
            transition: box-shadow 0.3s ease, transform 0.3s ease;
        }

        .stat-card:hover {
            box-shadow: var(--shadow-hover);
            transform: translateY(-1px);
        }

        .stat-value {
            font-size: 32px;
            font-weight: 700;
            letter-spacing: -1px;
            color: var(--text-primary);
            line-height: 1.1;
        }

        .stat-label {
            font-size: 12px;
            font-weight: 500;
            color: var(--text-tertiary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 6px;
        }

        .stat-card.accent .stat-value { color: var(--accent); }
        .stat-card.accent { background: var(--accent-light); border-color: var(--accent-medium); }

        .section {
            margin-bottom: 28px;
        }

        .section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 14px;
        }

        .section-title {
            font-size: 13px;
            font-weight: 600;
            color: var(--text-tertiary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .types-list {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .type-pill {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 16px;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            transition: background 0.2s ease;
        }

        .type-pill:hover {
            background: var(--bg-secondary);
        }

        .type-emoji {
            font-size: 18px;
            width: 28px;
            text-align: center;
        }

        .type-label {
            flex: 1;
            font-size: 14px;
            font-weight: 500;
            color: var(--text-primary);
            text-transform: capitalize;
        }

        .type-badge {
            font-size: 13px;
            font-weight: 600;
            color: var(--accent);
            background: var(--accent-light);
            padding: 2px 10px;
            border-radius: 12px;
            min-width: 28px;
            text-align: center;
        }

        .actions {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            margin-bottom: 32px;
        }

        .action-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 10px 16px;
            font-size: 13px;
            font-weight: 500;
            color: var(--text-primary);
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            cursor: pointer;
            transition: all 0.2s ease;
            font-family: inherit;
        }

        .action-btn:hover {
            background: var(--bg-secondary);
            border-color: var(--accent-medium);
        }

        .action-btn.primary {
            background: var(--accent);
            color: #fff;
            border-color: var(--accent);
        }

        .action-btn.primary:hover {
            opacity: 0.9;
        }

        .empty-state {
            text-align: center;
            padding: 32px 16px;
            color: var(--text-tertiary);
        }

        .empty-state .empty-icon {
            font-size: 36px;
            margin-bottom: 12px;
        }

        .empty-state p {
            font-size: 14px;
            line-height: 1.5;
        }

        .footer {
            padding-top: 20px;
            border-top: 1px solid var(--border);
            color: var(--text-tertiary);
            font-size: 12px;
            text-align: center;
        }

        .footer a {
            color: var(--accent);
            text-decoration: none;
        }

        .footer a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="brand">
                <span class="brand-dot"></span>
                <span class="brand-label">Cortex</span>
            </div>
            <h1>Dashboard</h1>
            <div class="subtitle">Persistent AI memory across every session</div>
        </div>

        <div class="stats-grid">
            <div class="stat-card accent">
                <div class="stat-value">${memoryCount}</div>
                <div class="stat-label">Active Memories</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${eventsCount}</div>
                <div class="stat-label">Events Processed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${dbSize}</div>
                <div class="stat-label">Database Size</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${uptime}</div>
                <div class="stat-label">Server Uptime</div>
            </div>
        </div>

        <div class="actions">
            <button class="action-btn primary" onclick="post('store')">+ Store Memory</button>
            <button class="action-btn" onclick="post('search')">Search</button>
            <button class="action-btn" onclick="post('scan')">Scan Project</button>
            <button class="action-btn" onclick="post('export')">Export</button>
        </div>

        <div class="section">
            <div class="section-header">
                <span class="section-title">Memory Breakdown</span>
            </div>
            <div class="types-list">
                ${typeCards || `
                    <div class="empty-state">
                        <div class="empty-icon">📭</div>
                        <p>No memories yet.<br>Store your first decision, convention, or bug fix.</p>
                    </div>
                `}
            </div>
        </div>

        <div class="footer">
            Cortex v1.1.0 · <a href="https://cortex-ai-iota.vercel.app">cortex-website</a>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        function post(cmd) { vscode.postMessage({ command: cmd }); }
    </script>
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
