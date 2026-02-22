import * as vscode from 'vscode';
import { MCPClient } from '../mcp-client';

interface RelevantMemory {
    type: string;
    intent: string;
    action?: string;
    confidence: number;
}

export class InlineAnnotationProvider implements vscode.Disposable {
    private correctionDecorationType: vscode.TextEditorDecorationType;
    private conventionDecorationType: vscode.TextEditorDecorationType;
    private insightDecorationType: vscode.TextEditorDecorationType;
    private disposables: vscode.Disposable[] = [];
    private memoryCache = new Map<string, RelevantMemory[]>();
    private debounceTimer: NodeJS.Timeout | null = null;

    constructor(private client: MCPClient) {
        this.correctionDecorationType = vscode.window.createTextEditorDecorationType({
            after: {
                margin: '0 0 0 2em',
                color: new vscode.ThemeColor('editorWarning.foreground'),
                fontStyle: 'italic',
            },
        });

        this.conventionDecorationType = vscode.window.createTextEditorDecorationType({
            after: {
                margin: '0 0 0 2em',
                color: new vscode.ThemeColor('editorInfo.foreground'),
                fontStyle: 'italic',
            },
        });

        this.insightDecorationType = vscode.window.createTextEditorDecorationType({
            after: {
                margin: '0 0 0 2em',
                color: new vscode.ThemeColor('editorHint.foreground'),
                fontStyle: 'italic',
            },
        });

        this.disposables.push(
            vscode.window.onDidChangeActiveTextEditor((editor) => {
                if (editor) { this.debounceUpdate(editor); }
            })
        );

        this.disposables.push(
            vscode.workspace.onDidSaveTextDocument((doc) => {
                const editor = vscode.window.activeTextEditor;
                if (editor && editor.document === doc) {
                    this.memoryCache.delete(doc.uri.fsPath);
                    this.debounceUpdate(editor);
                }
            })
        );

        if (vscode.window.activeTextEditor) {
            this.debounceUpdate(vscode.window.activeTextEditor);
        }
    }

    private debounceUpdate(editor: vscode.TextEditor): void {
        if (this.debounceTimer) { clearTimeout(this.debounceTimer); }
        this.debounceTimer = setTimeout(() => this.updateAnnotations(editor), 1500);
    }

    private async updateAnnotations(editor: vscode.TextEditor): Promise<void> {
        const config = vscode.workspace.getConfiguration('cortex');
        if (!config.get<boolean>('enableInlineAnnotations', true)) {
            this.clearDecorations(editor);
            return;
        }
        if (!this.client.connected) { return; }

        const filePath = editor.document.uri.fsPath;
        const fileName = filePath.split(/[\\/]/).pop() || '';

        try {
            let memories = this.memoryCache.get(filePath);
            if (!memories) {
                const result = await this.client.callTool('recall_memory', {
                    query: fileName,
                    currentFile: filePath,
                    maxResults: 5,
                });

                const fetched: RelevantMemory[] = (result?.memories || [])
                    .filter((m: any) => {
                        const type = (m.memory?.type || m.type || '').toUpperCase();
                        return ['CORRECTION', 'CONVENTION', 'BUG_FIX', 'INSIGHT'].includes(type);
                    })
                    .map((m: any) => ({
                        type: (m.memory?.type || m.type || '').toUpperCase(),
                        intent: m.memory?.intent || m.intent || '',
                        action: m.memory?.action || m.action,
                        confidence: m.score || m.confidence || 0.5,
                    }));

                memories = fetched;
                this.memoryCache.set(filePath, fetched);
            }

            if (!memories.length) {
                this.clearDecorations(editor);
                return;
            }

            const corrections: vscode.DecorationOptions[] = [];
            const conventions: vscode.DecorationOptions[] = [];
            const insights: vscode.DecorationOptions[] = [];

            let lineOffset = 0;
            for (const mem of memories) {
                const line = Math.min(lineOffset, editor.document.lineCount - 1);
                const range = new vscode.Range(line, 0, line, 0);
                const shortText = mem.intent.length > 60 ? mem.intent.substring(0, 60) + '…' : mem.intent;

                const hoverMessage = new vscode.MarkdownString();
                hoverMessage.appendMarkdown(`**🧠 Cortex ${mem.type}**\n\n`);
                hoverMessage.appendMarkdown(`${mem.intent}\n\n`);
                if (mem.action) { hoverMessage.appendMarkdown(`**Action:** ${mem.action}\n\n`); }
                hoverMessage.appendMarkdown(`*Confidence: ${(mem.confidence * 100).toFixed(0)}%*`);

                const decoration: vscode.DecorationOptions = {
                    range,
                    hoverMessage,
                    renderOptions: {
                        after: { contentText: ` ← Cortex: ${shortText}` },
                    },
                };

                if (mem.type === 'CORRECTION' || mem.type === 'BUG_FIX') {
                    corrections.push(decoration);
                } else if (mem.type === 'CONVENTION') {
                    conventions.push(decoration);
                } else {
                    insights.push(decoration);
                }

                lineOffset++;
            }

            editor.setDecorations(this.correctionDecorationType, corrections);
            editor.setDecorations(this.conventionDecorationType, conventions);
            editor.setDecorations(this.insightDecorationType, insights);

        } catch (_e) {
        }
    }

    private clearDecorations(editor: vscode.TextEditor): void {
        editor.setDecorations(this.correctionDecorationType, []);
        editor.setDecorations(this.conventionDecorationType, []);
        editor.setDecorations(this.insightDecorationType, []);
    }

    dispose(): void {
        this.correctionDecorationType.dispose();
        this.conventionDecorationType.dispose();
        this.insightDecorationType.dispose();
        this.disposables.forEach(d => d.dispose());
        if (this.debounceTimer) { clearTimeout(this.debounceTimer); }
    }
}
