#!/usr/bin/env node
/**
 * Cortex Git Capture — Auto-stores git commits as memories.
 *
 * Called by the post-commit git hook after every commit.
 * Reads the latest commit info and stores it as a memory
 * so the AI remembers what code changes were made and why.
 *
 * IMPORTANT: This script must be FAST (<500ms) since it runs
 * in a git hook. It uses direct SQLite inserts instead of the
 * full CognitiveDatabase/MemoryStore classes.
 *
 * Usage (automatic via git hook):
 *   .git/hooks/post-commit → calls this script
 *
 * Usage (manual):
 *   cortex-capture
 *   node dist/hooks/git-capture.js
 */
export {};
//# sourceMappingURL=git-capture.d.ts.map