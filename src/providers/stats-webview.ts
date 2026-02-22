import * as vscode from 'vscode';
import { MCPClient } from '../mcp-client';

export class StatsWebviewProvider implements vscode.WebviewViewProvider {
    private view?: vscode.WebviewView;
    private refreshInterval?: NodeJS.Timeout;

    constructor(private client: MCPClient) { }

    resolveWebviewView(webviewView: vscode.WebviewView): void {
        this.view = webviewView;
        webviewView.webview.options = { enableScripts: true };

        this.updateStats();

        this.refreshInterval = setInterval(() => this.updateStats(), 30_000);

        webviewView.onDidDispose(() => {
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
            }
        });
    }

    private async updateStats(): Promise<void> {
        if (!this.view) { return; }

        let stats: any = {};
        if (this.client.connected) {
            try {
                stats = await this.client.callTool('get_stats');
            } catch (_e) { }
        }

        this.view.webview.html = this.getHtml(stats);
    }

    private getHtml(stats: any): string {
        const connected = this.client.connected;
        const statusColor = connected ? '#34c759' : '#ff3b30';
        const statusText = connected ? 'Connected' : 'Disconnected';

        return `<!DOCTYPE html>
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
            --radius: 10px;
        }

        body.vscode-dark {
            --bg: #161618;
            --bg-card: #1c1c1e;
            --text: #f5f5f7;
            --text-sec: #98989d;
            --text-dim: #6e6e73;
            --border: rgba(255, 255, 255, 0.06);
            --accent-bg: rgba(110, 86, 207, 0.12);
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
            background: var(--bg);
            color: var(--text);
            padding: 12px;
            -webkit-font-smoothing: antialiased;
        }

        .status-row {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 14px;
            background: var(--bg-card);
            border-radius: var(--radius);
            margin-bottom: 14px;
        }

        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: ${statusColor};
            flex-shrink: 0;
        }

        .status-text {
            font-size: 13px;
            font-weight: 500;
            color: var(--text);
        }

        .section-label {
            font-size: 11px;
            font-weight: 600;
            color: var(--text-dim);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
            padding: 0 2px;
        }

        .stat-list {
            margin-bottom: 16px;
        }

        .stat-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid var(--border);
        }

        .stat-row:last-child {
            border-bottom: none;
        }

        .stat-key {
            font-size: 13px;
            color: var(--text-sec);
        }

        .stat-val {
            font-size: 13px;
            font-weight: 600;
            color: var(--text);
        }

        .stat-val.accent {
            color: var(--accent);
        }
    </style>
</head>
<body>
    <div class="status-row">
        <span class="status-dot"></span>
        <span class="status-text">${statusText}</span>
    </div>

    <div class="section-label">Memory</div>
    <div class="stat-list">
        <div class="stat-row">
            <span class="stat-key">Active</span>
            <span class="stat-val accent">${stats.activeMemories || stats.totalMemories || 0}</span>
        </div>
        <div class="stat-row">
            <span class="stat-key">Events</span>
            <span class="stat-val">${stats.totalEvents || 0}</span>
        </div>
        <div class="stat-row">
            <span class="stat-key">DB Size</span>
            <span class="stat-val">${this.formatBytes(stats.dbSizeBytes || 0)}</span>
        </div>
        <div class="stat-row">
            <span class="stat-key">Uptime</span>
            <span class="stat-val">${this.formatUptime(stats.uptime || 0)}</span>
        </div>
    </div>

    <div class="section-label">Server</div>
    <div class="stat-list">
        <div class="stat-row">
            <span class="stat-key">Version</span>
            <span class="stat-val">${stats.version || 'unknown'}</span>
        </div>
        <div class="stat-row">
            <span class="stat-key">Plan</span>
            <span class="stat-val">${stats.plan || 'FREE'}</span>
        </div>
    </div>
</body>
</html>`;
    }

    private formatBytes(bytes: number): string {
        if (bytes < 1024) { return `${bytes} B`; }
        if (bytes < 1048576) { return `${(bytes / 1024).toFixed(0)} KB`; }
        return `${(bytes / 1048576).toFixed(1)} MB`;
    }

    private formatUptime(seconds: number): string {
        if (seconds < 60) { return `${seconds}s`; }
        if (seconds < 3600) { return `${Math.floor(seconds / 60)}m`; }
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m}m`;
    }
}
