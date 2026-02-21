# Connect to Memory Server

Once cortex-mcp is installed, the extension **auto-connects** every time VS Code starts.

## How to verify

Look at the **status bar** (bottom-right):

| Status | Meaning |
|--------|---------|
| 🧠 Cortex: 42 memories | ✅ Connected and working |
| ⏳ Cortex: Connecting… | Starting up (takes ~3s first time) |
| ⚠️ Cortex: Disconnected | Not running — click to reconnect |

## Troubleshooting

If it says "Disconnected":
1. Open Command Palette (`Ctrl+Shift+P`)
2. Run **Cortex: Setup Wizard**
3. This will check your installation and fix any issues
