# 🧠 Cortex — Persistent AI Memory for VS Code

[![VS Code Marketplace](https://img.shields.io/badge/VS%20Code-Marketplace-007ACC?logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=cortex.cortex-memory)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**Your AI forgets everything between sessions. Cortex fixes that.**

Cortex gives AI coding assistants (Cursor, Claude, Copilot) persistent memory — so they remember your decisions, catch their own hallucinations, and never repeat the same mistakes twice.

---

## ✨ Why Cortex?

| Problem | How Cortex Solves It |
|---------|---------------------|
| AI forgets your architecture decisions | Stores decisions, conventions, and patterns permanently |
| AI hallucinates imports and file paths | `verify_code` and `verify_files` catch hallucinations before they ship |
| AI repeats the same bugs | Bug fixes and corrections are auto-recalled every session |
| New sessions start from zero context | 12-layer brain recall gives AI full project context in seconds |

---

## 🚀 Features

### Zero-Install Server
Cortex bundles its own MCP server — **no `npm install` needed**. Just install the extension and it works.

### Sidebar Memory Browser
Browse all your memories organized by type: Decisions, Bug Fixes, Corrections, Conventions, and Insights.

### Smart Dashboard
Premium Apple-style dashboard showing memory stats, quick actions, and memory breakdown — with full light/dark mode support.

### 16 MCP Tools
| Tool | What It Does |
|------|-------------|
| `force_recall` | 12-layer brain recall at conversation start |
| `auto_learn` | Passively learns from every response |
| `recall_memory` | Hybrid FTS + vector search |
| `store_memory` | Store with quality gates + dedup |
| `verify_code` | Catch hallucinated imports/exports |
| `verify_files` | Catch hallucinated file paths |
| `scan_project` | Day-1 project understanding |
| `quick_store` | One-sentence memory store |
| + 8 more | export, import, update, delete, stats, health, context, list |

### Anti-Hallucination
Cortex checks AI-generated code against your real codebase:
- ✅ Are imported packages in `package.json`?
- ✅ Are imported functions actually exported?
- ✅ Are referenced env variables in `.env`?

### CodeLens Integration
See memory counts directly in your editor — know which files have related corrections, conventions, or insights.

### Inline Annotations
Corrections and conventions appear as subtle decorations right in your code.

### File Watcher
Get alerted when you save a file that has critical memories (bug fixes, corrections) associated with it.

---

## 📋 Commands

| Command | Description |
|---------|-------------|
| `Cortex: Store Memory` | Save a decision, bug fix, or convention |
| `Cortex: Recall Memory` | Search memories by query |
| `Cortex: Search Memories` | Full-text search with type filtering |
| `Cortex: Open Dashboard` | Open the stats dashboard |
| `Cortex: Scan Project` | Scan project structure into memory |
| `Cortex: Export Memories` | Export all memories to JSON |
| `Cortex: Import Memories` | Import memories from JSON backup |
| `Cortex: Setup Wizard` | Guided setup walkthrough |
| `Cortex: Login` | Sign in with Google |
| `Cortex: View Stats` | Show memory statistics |

---

## ⚙️ Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `cortex.autoStart` | `true` | Auto-start MCP server on activation |
| `cortex.mcpCommand` | `npx cortex-mcp` | Custom server command (if not using bundled) |
| `cortex.showStatusBar` | `true` | Show memory count in status bar |

---

## 💰 Pricing

| | Free | Pro |
|---|------|-----|
| Memories | 20 | Unlimited |
| Basic recall | ✅ | ✅ |
| 12-layer brain | ❌ | ✅ |
| Auto-learn | ❌ | ✅ |
| Anti-hallucination | ✅ | ✅ |
| Git memory | ❌ | ✅ |
| Confidence decay | ❌ | ✅ |
| Memory consolidation | ❌ | ✅ |

---

## 🔒 Privacy & Security

- All memories stored **locally** on your machine (SQLite)
- No code leaves your computer
- Optional cloud sync (coming soon)
- Encrypted data at rest

---

## 🛠 Development

```bash
git clone https://github.com/jaswanthkumarj1234-beep/cortex-vscode.git
cd cortex-vscode
npm install
npm run compile
# Press F5 in VS Code to launch Extension Development Host
```

---

## 📖 Links

- [Website](https://cortex-website-theta.vercel.app)
- [Documentation](https://cortex-website-theta.vercel.app/docs.html)
- [Changelog](https://cortex-website-theta.vercel.app/changelog.html)
- [GitHub](https://github.com/jaswanthkumarj1234-beep/cortex-vscode)

---

**Made with ❤️ by [Perla Jaswanth Kumar](https://github.com/jaswanthkumarj1234-beep)**
