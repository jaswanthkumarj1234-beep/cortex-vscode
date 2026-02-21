# Store Your First Memory

Memories are facts your AI should never forget — decisions, conventions, bug fixes, and lessons learned.

## Memory Types

| Type | When to use | Example |
|------|-------------|---------|
| 🧭 **Decision** | Architecture/design choices | "We chose PostgreSQL over MongoDB for ACID compliance" |
| 🐛 **Bug Fix** | Tricky bugs you solved | "Race condition in auth — fixed by adding mutex lock" |
| ⚠️ **Correction** | Mistakes to never repeat | "Don't use localStorage for JWT tokens — use HttpOnly cookies" |
| 📏 **Convention** | Coding standards | "All API responses must include requestId header" |
| 💡 **Insight** | Useful discoveries | "Batch embedding processing is 3x faster than sequential" |

## How to store

1. Open Command Palette (`Ctrl+Shift+P`)
2. Run **Cortex: Store Memory**
3. Pick a type → Enter the memory → Done!

Or click the **+** button at the top of the Cortex sidebar.

## What happens next?

Your memory is:
- 💾 Stored in a local encrypted SQLite database
- 🔍 Indexed for semantic search
- 🤖 Auto-injected into future AI conversations
