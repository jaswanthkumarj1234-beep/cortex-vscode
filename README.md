# Cortex — AI Memory for VS Code

[![VS Code](https://img.shields.io/badge/VS%20Code-Extension-007ACC?logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=cortex.cortex-memory)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

> Browse, search, and manage your Cortex AI memories directly from VS Code.

## Features

🧠 **Sidebar Memory Browser** — View all memories grouped by type (Decisions, Bug Fixes, Conventions, etc.)

📊 **Dashboard** — Premium dark-themed stats dashboard with memory counts, DB size, and uptime

🔍 **Recall & Search** — Quick-pick search through your memory database

➕ **Store Memories** — Save decisions, corrections, and conventions from within VS Code

📦 **Export** — Export all memories to JSON for backup or migration

🔄 **Auto-Sync** — Automatically connects to your local Cortex MCP server

## Requirements

- [Cortex MCP](https://www.npmjs.com/package/cortex-mcp) installed globally or in your project
- Node.js >= 18

```bash
npm install -g cortex-mcp
```

## Commands

| Command | Description |
|---------|-------------|
| `Cortex: Store Memory` | Store a new decision, bug fix, or convention |
| `Cortex: Recall Memory` | Search and recall memories by query |
| `Cortex: Search Memories` | Full-text search through memories |
| `Cortex: View Stats` | Show memory database statistics |
| `Cortex: Scan Project` | Scan project structure into memory |
| `Cortex: Export Memories` | Export all memories to JSON |
| `Cortex: Open Dashboard` | Open the stats dashboard |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `cortex.autoStart` | `true` | Auto-start MCP server on activation |
| `cortex.mcpCommand` | `npx cortex-mcp` | Command to run the MCP server |
| `cortex.showStatusBar` | `true` | Show memory count in status bar |

## Development

```bash
# Clone
git clone https://github.com/jaswanthkumarj1234-beep/cortex-vscode.git
cd cortex-vscode

# Install
npm install

# Compile
npm run compile

# Test in VS Code
# Press F5 to launch Extension Development Host
```

## License

MIT
