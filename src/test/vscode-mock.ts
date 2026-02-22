/**
 * VS Code API mock for automated testing outside the Extension Host.
 * Provides enough surface area to test extension logic.
 */

const commands = new Map<string, Function>();
const subscriptions: any[] = [];

export const vscode = {
    // --- Window ---
    window: {
        createStatusBarItem: (_alignment?: any, _priority?: number) => ({
            text: '',
            tooltip: '',
            command: '',
            backgroundColor: undefined as any,
            show: () => { },
            hide: () => { },
            dispose: () => { },
        }),
        showInformationMessage: async (..._args: any[]) => undefined,
        showWarningMessage: async (..._args: any[]) => undefined,
        showErrorMessage: async (..._args: any[]) => undefined,
        showInputBox: async (_options?: any) => undefined,
        showQuickPick: async (_items: any, _options?: any) => undefined,
        createTreeView: (_id: string, _options: any) => ({
            dispose: () => { },
        }),
        registerWebviewViewProvider: (_id: string, _provider: any) => ({
            dispose: () => { },
        }),
        createTextEditorDecorationType: (_options: any) => ({
            dispose: () => { },
        }),
        registerUriHandler: (_handler: any) => ({
            dispose: () => { },
        }),
        withProgress: async (_options: any, task: Function) => {
            const progress = { report: () => { } };
            const token = { isCancellationRequested: false };
            return task(progress, token);
        },
        activeTextEditor: undefined,
        onDidChangeActiveTextEditor: (_cb: Function) => ({ dispose: () => { } }),
    },

    // --- Commands ---
    commands: {
        registerCommand: (name: string, handler: Function) => {
            commands.set(name, handler);
            return { dispose: () => commands.delete(name) };
        },
        executeCommand: async (name: string, ...args: any[]) => {
            const handler = commands.get(name);
            if (handler) { return handler(...args); }
        },
        getRegisteredCommands: () => Array.from(commands.keys()),
    },

    // --- Languages ---
    languages: {
        registerCodeLensProvider: (_selector: any, _provider: any) => ({
            dispose: () => { },
        }),
    },

    // --- Workspace ---
    workspace: {
        workspaceFolders: [{ uri: { fsPath: '/test/workspace' } }],
        getConfiguration: (_section?: string) => ({
            get: (key: string, defaultValue?: any) => defaultValue,
        }),
        onDidSaveTextDocument: (_cb: Function) => ({ dispose: () => { } }),
    },

    // --- Env ---
    env: {
        openExternal: async (_uri: any) => true,
    },

    // --- Uri ---
    Uri: {
        parse: (value: string) => ({ toString: () => value, path: value, query: '' }),
    },

    // --- Enums ---
    TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
    TreeItem: class {
        label: string;
        collapsibleState: number;
        constructor(label: string, collapsibleState: number = 0) {
            this.label = label;
            this.collapsibleState = collapsibleState;
        }
    },
    EventEmitter: class {
        listeners: Function[] = [];
        event = (listener: Function) => {
            this.listeners.push(listener);
            return { dispose: () => { } };
        };
        fire(data: any) { this.listeners.forEach(l => l(data)); }
        dispose() { this.listeners = []; }
    },
    ProgressLocation: { Notification: 15 },
    StatusBarAlignment: { Left: 1, Right: 2 },
    ThemeColor: class { constructor(public id: string) { } },
    Range: class {
        constructor(
            public startLine: number, public startChar: number,
            public endLine: number, public endChar: number
        ) { }
    },
    CodeLens: class {
        constructor(public range: any, public command?: any) { }
    },
    MarkdownString: class {
        value = '';
        appendMarkdown(text: string) { this.value += text; return this; }
    },

    // --- Extension Context mock ---
    createMockContext: () => ({
        subscriptions: subscriptions,
        extensionPath: '/test/extension',
        globalState: {
            _store: new Map<string, any>(),
            get(key: string) { return this._store.get(key); },
            update(key: string, value: any) { this._store.set(key, value); return Promise.resolve(); },
        },
        secrets: {
            _store: new Map<string, string>(),
            get(key: string) { return Promise.resolve(this._store.get(key)); },
            store(key: string, value: string) { this._store.set(key, value); return Promise.resolve(); },
            delete(key: string) { this._store.delete(key); return Promise.resolve(); },
        },
    }),

    // --- Test Helpers ---
    _test: {
        getRegisteredCommands: () => Array.from(commands.keys()),
        clearCommands: () => commands.clear(),
        clearSubscriptions: () => { subscriptions.length = 0; },
    },
};
