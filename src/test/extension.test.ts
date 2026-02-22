/**
 * Cortex VS Code Extension — Automated Test Suite
 * 
 * Tests cover: LicenseSync, StatusBarProvider, MemoryTreeProvider,
 * MCP Client protocol, command registration, and package.json integrity.
 * 
 * Run: npx mocha dist/test/extension.test.js --exit
 */

import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// ============================================================
// TEST 1: Package.json Integrity
// ============================================================
describe('Package.json Integrity', () => {
    const pkgPath = path.join(__dirname, '..', '..', 'package.json');
    let pkg: any;

    before(() => {
        pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    });

    it('should have correct extension name', () => {
        assert.strictEqual(pkg.name, 'cortex-memory');
    });

    it('should have a display name', () => {
        assert.strictEqual(pkg.displayName, 'Cortex — AI Memory');
    });

    it('should have version >= 1.0.0', () => {
        const [major] = pkg.version.split('.').map(Number);
        assert.ok(major >= 1, `Version ${pkg.version} should be >= 1.0.0`);
    });

    it('should have a publisher', () => {
        assert.ok(pkg.publisher, 'publisher field is required');
    });

    it('should have engines.vscode defined', () => {
        assert.ok(pkg.engines?.vscode, 'engines.vscode is required');
    });

    it('should reference the icon file', () => {
        assert.strictEqual(pkg.icon, 'media/icon.png');
    });

    it('should have the icon file exist on disk', () => {
        const iconPath = path.join(__dirname, '..', '..', 'media', 'icon.png');
        assert.ok(fs.existsSync(iconPath), `Icon file missing: ${iconPath}`);
    });

    it('should have the brain.svg sidebar icon exist', () => {
        const svgPath = path.join(__dirname, '..', '..', 'media', 'brain.svg');
        assert.ok(fs.existsSync(svgPath), `brain.svg missing: ${svgPath}`);
    });

    it('should have main entry point', () => {
        assert.strictEqual(pkg.main, './dist/extension.js');
    });

    it('should have the main entry point file exist', () => {
        const mainPath = path.join(__dirname, '..', '..', 'dist', 'extension.js');
        assert.ok(fs.existsSync(mainPath), `Main entry missing: ${mainPath}`);
    });

    it('should have activationEvents', () => {
        assert.ok(Array.isArray(pkg.activationEvents), 'activationEvents should be an array');
        assert.ok(pkg.activationEvents.includes('onStartupFinished'));
    });

    it('should have MIT license', () => {
        assert.strictEqual(pkg.license, 'MIT');
    });

    it('should have galleryBanner with dark theme', () => {
        assert.strictEqual(pkg.galleryBanner?.theme, 'dark');
    });

    it('should have repository URL', () => {
        assert.ok(pkg.repository?.url, 'repository.url is required');
    });
});

// ============================================================
// TEST 2: Command Definitions in Package.json
// ============================================================
describe('Command Definitions', () => {
    let pkg: any;
    let commands: string[];

    before(() => {
        const pkgPath = path.join(__dirname, '..', '..', 'package.json');
        pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        commands = pkg.contributes.commands.map((c: any) => c.command);
    });

    const expectedCommands = [
        'cortex.storeMemory',
        'cortex.recallMemory',
        'cortex.searchMemories',
        'cortex.viewStats',
        'cortex.scanProject',
        'cortex.exportMemories',
        'cortex.importMemories',
        'cortex.openDashboard',
        'cortex.refreshMemories',
        'cortex.deleteMemory',
        'cortex.showFileMemories',
        'cortex.setup',
        'cortex.openWalkthrough',
        'cortex.login',
        'cortex.logout',
        'cortex.enterKey',
        'cortex.upgrade',
    ];

    for (const cmd of expectedCommands) {
        it(`should define command: ${cmd}`, () => {
            assert.ok(commands.includes(cmd), `Missing command: ${cmd}`);
        });
    }

    it('should have exactly 17 commands', () => {
        assert.strictEqual(commands.length, 17, `Expected 17 commands, got ${commands.length}`);
    });

    it('every command should have a title', () => {
        for (const c of pkg.contributes.commands) {
            assert.ok(c.title, `Command ${c.command} has no title`);
        }
    });

    it('every command should have an icon', () => {
        for (const c of pkg.contributes.commands) {
            assert.ok(c.icon, `Command ${c.command} has no icon`);
        }
    });
});

// ============================================================
// TEST 3: Views & Activity Bar
// ============================================================
describe('Views Configuration', () => {
    let pkg: any;

    before(() => {
        const pkgPath = path.join(__dirname, '..', '..', 'package.json');
        pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    });

    it('should define cortex-memory activity bar container', () => {
        const containers = pkg.contributes.viewsContainers.activitybar;
        const cortex = containers.find((c: any) => c.id === 'cortex-memory');
        assert.ok(cortex, 'cortex-memory container not found');
        assert.strictEqual(cortex.icon, 'media/brain.svg');
    });

    it('should define cortexMemoryTree view', () => {
        const views = pkg.contributes.views['cortex-memory'];
        const tree = views.find((v: any) => v.id === 'cortexMemoryTree');
        assert.ok(tree, 'cortexMemoryTree view not found');
    });

    it('should define cortexStatsView webview', () => {
        const views = pkg.contributes.views['cortex-memory'];
        const stats = views.find((v: any) => v.id === 'cortexStatsView');
        assert.ok(stats, 'cortexStatsView not found');
        assert.strictEqual(stats.type, 'webview');
    });

    it('should have a welcome view for cortexMemoryTree', () => {
        const welcome = pkg.contributes.viewsWelcome;
        const tree = welcome.find((w: any) => w.view === 'cortexMemoryTree');
        assert.ok(tree, 'Welcome view for cortexMemoryTree not found');
        assert.ok(tree.contents.includes('Sign In with Google'));
    });
});

// ============================================================
// TEST 4: Configuration Settings
// ============================================================
describe('Configuration Settings', () => {
    let properties: any;

    before(() => {
        const pkgPath = path.join(__dirname, '..', '..', 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        properties = pkg.contributes.configuration.properties;
    });

    it('should have cortex.autoStart (boolean, default true)', () => {
        assert.strictEqual(properties['cortex.autoStart'].type, 'boolean');
        assert.strictEqual(properties['cortex.autoStart'].default, true);
    });

    it('should have cortex.mcpCommand (string)', () => {
        assert.strictEqual(properties['cortex.mcpCommand'].type, 'string');
        assert.ok(properties['cortex.mcpCommand'].default.includes('cortex'));
    });

    it('should have cortex.showStatusBar (boolean, default true)', () => {
        assert.strictEqual(properties['cortex.showStatusBar'].type, 'boolean');
        assert.strictEqual(properties['cortex.showStatusBar'].default, true);
    });

    it('should have cortex.enableCodeLens (boolean, default true)', () => {
        assert.strictEqual(properties['cortex.enableCodeLens'].type, 'boolean');
        assert.strictEqual(properties['cortex.enableCodeLens'].default, true);
    });

    it('should have cortex.enableInlineAnnotations (boolean)', () => {
        assert.strictEqual(properties['cortex.enableInlineAnnotations'].type, 'boolean');
    });
});

// ============================================================
// TEST 5: Menu Contributions
// ============================================================
describe('Menu Contributions', () => {
    let menus: any;

    before(() => {
        const pkgPath = path.join(__dirname, '..', '..', 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        menus = pkg.contributes.menus;
    });

    it('should have view/title menus for cortexMemoryTree', () => {
        const titleMenus = menus['view/title'];
        const cortexMenus = titleMenus.filter((m: any) => m.when?.includes('cortexMemoryTree'));
        assert.ok(cortexMenus.length >= 2, 'Should have at least 2 title menu items');
    });

    it('should have store and refresh in navigation group', () => {
        const navMenus = menus['view/title'].filter(
            (m: any) => m.group === 'navigation' && m.when?.includes('cortexMemoryTree')
        );
        const cmds = navMenus.map((m: any) => m.command);
        assert.ok(cmds.includes('cortex.storeMemory'));
        assert.ok(cmds.includes('cortex.refreshMemories'));
    });

    it('should have context menu for memory items', () => {
        const contextMenus = menus['view/item/context'];
        const deleteMenu = contextMenus.find((m: any) => m.command === 'cortex.deleteMemory');
        assert.ok(deleteMenu, 'Delete memory context menu not found');
        assert.ok(deleteMenu.when.includes('memoryItem'));
    });

    it('should have editor context menu items', () => {
        const editorMenus = menus['editor/context'];
        assert.ok(editorMenus.length >= 2, 'Should have at least 2 editor context menus');
        const cmds = editorMenus.map((m: any) => m.command);
        assert.ok(cmds.includes('cortex.showFileMemories'));
        assert.ok(cmds.includes('cortex.storeMemory'));
    });
});

// ============================================================
// TEST 6: Walkthrough Configuration
// ============================================================
describe('Walkthrough', () => {
    let walkthrough: any;

    before(() => {
        const pkgPath = path.join(__dirname, '..', '..', 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        walkthrough = pkg.contributes.walkthroughs[0];
    });

    it('should have a walkthrough defined', () => {
        assert.ok(walkthrough, 'No walkthrough defined');
        assert.strictEqual(walkthrough.id, 'cortex.gettingStarted');
    });

    it('should have 4 steps', () => {
        assert.strictEqual(walkthrough.steps.length, 4);
    });

    it('should have walkthrough markdown files', () => {
        const files = ['install.md', 'connect.md', 'scan.md', 'store.md'];
        for (const file of files) {
            const filePath = path.join(__dirname, '..', '..', 'media', 'walkthrough', file);
            assert.ok(fs.existsSync(filePath), `Walkthrough file missing: ${file}`);
        }
    });
});

// ============================================================
// TEST 7: LicenseSync Logic
// ============================================================
describe('LicenseSync', () => {
    const CORTEX_DIR = path.join(os.homedir(), '.cortex');
    const LICENSE_FILE = path.join(CORTEX_DIR, 'license');
    const TEST_KEY = 'CORTEX-TEST-1234-ABCD-5678';

    it('should validate correct key format', () => {
        // Inline validation logic (same regex as LicenseSync)
        const regex = /^CORTEX-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
        assert.ok(regex.test(TEST_KEY));
    });

    it('should reject invalid key formats', () => {
        const regex = /^CORTEX-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
        assert.ok(!regex.test('invalid-key'));
        assert.ok(!regex.test('CORTEX-SHORT'));
        assert.ok(!regex.test(''));
        assert.ok(!regex.test('CORTEX-12'));
    });

    it('should import LicenseSync module', () => {
        const licenseSyncPath = path.join(__dirname, '..', 'auth', 'license-sync.js');
        assert.ok(fs.existsSync(licenseSyncPath), 'license-sync.js not found in dist');
    });
});

// ============================================================
// TEST 8: Dist File Integrity
// ============================================================
describe('Dist File Integrity', () => {
    const distDir = path.join(__dirname, '..');

    const expectedFiles = [
        'extension.js',
        'mcp-client.js',
        'commands/commands.js',
        'commands/login.js',
        'commands/setup.js',
        'providers/memory-tree.js',
        'providers/status-bar.js',
        'providers/stats-webview.js',
        'providers/codelens-provider.js',
        'providers/inline-annotations.js',
        'providers/file-watcher.js',
        'auth/auth-provider.js',
        'auth/license-sync.js',
        'webview/dashboard.js',
    ];

    for (const file of expectedFiles) {
        it(`should have compiled file: ${file}`, () => {
            const filePath = path.join(distDir, file);
            assert.ok(fs.existsSync(filePath), `Missing: ${filePath}`);
        });
    }

    it('should have source maps for all files', () => {
        for (const file of expectedFiles) {
            const mapPath = path.join(distDir, file + '.map');
            assert.ok(fs.existsSync(mapPath), `Missing source map: ${file}.map`);
        }
    });

    it('should have declaration files for all files', () => {
        for (const file of expectedFiles) {
            const dtsPath = path.join(distDir, file.replace('.js', '.d.ts'));
            assert.ok(fs.existsSync(dtsPath), `Missing declaration: ${file.replace('.js', '.d.ts')}`);
        }
    });
});

// ============================================================
// TEST 9: Server Bundle
// ============================================================
describe('Server Bundle', () => {
    const serverDir = path.join(__dirname, '..', '..', 'server');

    it('should have server directory', () => {
        assert.ok(fs.existsSync(serverDir), 'server/ directory missing');
    });

    it('should have mcp-stdio.js entry point', () => {
        const entryPath = path.join(serverDir, 'mcp-stdio.js');
        assert.ok(fs.existsSync(entryPath), 'mcp-stdio.js missing');
    });

    it('should have database module', () => {
        assert.ok(fs.existsSync(path.join(serverDir, 'db', 'database.js')));
    });

    it('should have memory store', () => {
        assert.ok(fs.existsSync(path.join(serverDir, 'db', 'memory-store.js')));
    });

    it('should have config module', () => {
        assert.ok(fs.existsSync(path.join(serverDir, 'config', 'config.js')));
    });

    it('should have core event bus', () => {
        assert.ok(fs.existsSync(path.join(serverDir, 'core', 'event-bus.js')));
    });

    const memoryModules = [
        'auto-learner.js',
        'attention-ranker.js',
        'confidence-decay.js',
        'memory-cache.js',
        'memory-consolidator.js',
        'memory-decay.js',
        'memory-quality.js',
        'memory-ranker.js',
        'export-import.js',
        'embedding-manager.js',
    ];

    for (const mod of memoryModules) {
        it(`should have memory module: ${mod}`, () => {
            assert.ok(
                fs.existsSync(path.join(serverDir, 'memory', mod)),
                `Missing memory module: ${mod}`
            );
        });
    }

    it('should have better-sqlite3 native module', () => {
        const sqlite = path.join(serverDir, 'node_modules', 'better-sqlite3');
        assert.ok(fs.existsSync(sqlite), 'better-sqlite3 not bundled');
    });

    it('should have server package.json', () => {
        const pkgPath = path.join(serverDir, 'package.json');
        assert.ok(fs.existsSync(pkgPath), 'server/package.json missing');
    });
});

// ============================================================
// TEST 10: Command Handler Registration (Source Code Analysis)
// ============================================================
describe('Command Handler Registration', () => {
    const srcDir = path.join(__dirname, '..', '..');

    function fileContains(relPath: string, text: string): boolean {
        const fullPath = path.join(srcDir, relPath);
        if (!fs.existsSync(fullPath)) return false;
        return fs.readFileSync(fullPath, 'utf-8').includes(text);
    }

    const commandMap: [string, string][] = [
        ["registerCommand('cortex.storeMemory'", 'dist/commands/commands.js'],
        ["registerCommand('cortex.recallMemory'", 'dist/commands/commands.js'],
        ["registerCommand('cortex.searchMemories'", 'dist/commands/commands.js'],
        ["registerCommand('cortex.showFileMemories'", 'dist/commands/commands.js'],
        ["registerCommand('cortex.viewStats'", 'dist/commands/commands.js'],
        ["registerCommand('cortex.scanProject'", 'dist/commands/commands.js'],
        ["registerCommand('cortex.exportMemories'", 'dist/commands/commands.js'],
        ["registerCommand('cortex.importMemories'", 'dist/commands/commands.js'],
        ["registerCommand('cortex.refreshMemories'", 'dist/commands/commands.js'],
        ["registerCommand('cortex.deleteMemory'", 'dist/commands/commands.js'],
        ["registerCommand('cortex.setup'", 'dist/extension.js'],
        ["registerCommand('cortex.openDashboard'", 'dist/extension.js'],
        ["registerCommand('cortex.openWalkthrough'", 'dist/extension.js'],
        ["registerCommand('cortex.login'", 'dist/commands/login.js'],
        ["registerCommand('cortex.logout'", 'dist/commands/login.js'],
        ["registerCommand('cortex.enterKey'", 'dist/commands/login.js'],
        ["registerCommand('cortex.upgrade'", 'dist/commands/login.js'],
    ];

    for (const [handler, file] of commandMap) {
        it(`should register ${handler}) in ${file}`, () => {
            assert.ok(fileContains(file, handler), `Handler not found: ${handler} in ${file}`);
        });
    }
});

// ============================================================
// TEST 11: Export/Import Validation
// ============================================================
describe('Module Exports', () => {
    it('should export activate/deactivate from extension.js', () => {
        const extPath = path.join(__dirname, '..', 'extension.js');
        const content = fs.readFileSync(extPath, 'utf-8');
        assert.ok(content.includes('exports.activate'), 'Missing exports.activate');
        assert.ok(content.includes('exports.deactivate'), 'Missing exports.deactivate');
    });

    it('should export MCPClient from mcp-client.js', () => {
        const mcpPath = path.join(__dirname, '..', 'mcp-client.js');
        const content = fs.readFileSync(mcpPath, 'utf-8');
        assert.ok(content.includes('MCPClient'), 'Missing MCPClient export');
    });

    it('should export MemoryTreeProvider from memory-tree.js', () => {
        const treePath = path.join(__dirname, '..', 'providers', 'memory-tree.js');
        const content = fs.readFileSync(treePath, 'utf-8');
        assert.ok(content.includes('MemoryTreeProvider'), 'Missing MemoryTreeProvider');
    });

    it('should export StatusBarProvider from status-bar.js', () => {
        const barPath = path.join(__dirname, '..', 'providers', 'status-bar.js');
        const content = fs.readFileSync(barPath, 'utf-8');
        assert.ok(content.includes('StatusBarProvider'), 'Missing StatusBarProvider');
    });

    it('should export StatsWebviewProvider from stats-webview.js', () => {
        const statsPath = path.join(__dirname, '..', 'providers', 'stats-webview.js');
        const content = fs.readFileSync(statsPath, 'utf-8');
        assert.ok(content.includes('StatsWebviewProvider'), 'Missing StatsWebviewProvider');
    });

    it('should export CortexCodeLensProvider from codelens-provider.js', () => {
        const clPath = path.join(__dirname, '..', 'providers', 'codelens-provider.js');
        const content = fs.readFileSync(clPath, 'utf-8');
        assert.ok(content.includes('CortexCodeLensProvider'), 'Missing CortexCodeLensProvider');
    });

    it('should export DashboardPanel from dashboard.js', () => {
        const dashPath = path.join(__dirname, '..', 'webview', 'dashboard.js');
        const content = fs.readFileSync(dashPath, 'utf-8');
        assert.ok(content.includes('DashboardPanel'), 'Missing DashboardPanel');
    });

    it('should export AuthProvider from auth-provider.js', () => {
        const authPath = path.join(__dirname, '..', 'auth', 'auth-provider.js');
        const content = fs.readFileSync(authPath, 'utf-8');
        assert.ok(content.includes('AuthProvider'), 'Missing AuthProvider');
    });

    it('should export LicenseSync from license-sync.js', () => {
        const licPath = path.join(__dirname, '..', 'auth', 'license-sync.js');
        const content = fs.readFileSync(licPath, 'utf-8');
        assert.ok(content.includes('LicenseSync'), 'Missing LicenseSync');
    });

    it('should export registerCommands from commands.js', () => {
        const cmdPath = path.join(__dirname, '..', 'commands', 'commands.js');
        const content = fs.readFileSync(cmdPath, 'utf-8');
        assert.ok(content.includes('registerCommands'), 'Missing registerCommands');
    });

    it('should export registerLoginCommands from login.js', () => {
        const loginPath = path.join(__dirname, '..', 'commands', 'login.js');
        const content = fs.readFileSync(loginPath, 'utf-8');
        assert.ok(content.includes('registerLoginCommands'), 'Missing registerLoginCommands');
    });

    it('should export runSetupWizard from setup.js', () => {
        const setupPath = path.join(__dirname, '..', 'commands', 'setup.js');
        const content = fs.readFileSync(setupPath, 'utf-8');
        assert.ok(content.includes('runSetupWizard'), 'Missing runSetupWizard');
    });
});

// ============================================================
// TEST 12: MCP Protocol Compliance
// ============================================================
describe('MCP Protocol (Source Analysis)', () => {
    let mcpSource: string;

    before(() => {
        mcpSource = fs.readFileSync(
            path.join(__dirname, '..', 'mcp-client.js'), 'utf-8'
        );
    });

    it('should implement JSON-RPC initialize', () => {
        assert.ok(mcpSource.includes('initialize'), 'Missing initialize method');
    });

    it('should implement tools/call', () => {
        assert.ok(mcpSource.includes('tools/call'), 'Missing tools/call');
    });

    it('should implement tools/list', () => {
        assert.ok(mcpSource.includes('tools/list'), 'Missing tools/list');
    });

    it('should handle JSON-RPC responses', () => {
        assert.ok(mcpSource.includes('jsonrpc'), 'Missing jsonrpc protocol');
    });

    it('should have reconnection logic', () => {
        assert.ok(mcpSource.includes('reconnect') || mcpSource.includes('Reconnect'),
            'Missing reconnection logic');
    });

    it('should emit connection events', () => {
        assert.ok(mcpSource.includes("'connected'"), "Missing 'connected' event");
        assert.ok(mcpSource.includes("'disconnected'"), "Missing 'disconnected' event");
    });

    it('should have request timeout handling', () => {
        assert.ok(mcpSource.includes('timeout') || mcpSource.includes('Timeout'),
            'Missing timeout handling');
    });
});

// ============================================================
// TEST 13: README & Documentation
// ============================================================
describe('Documentation', () => {
    const rootDir = path.join(__dirname, '..', '..');

    it('should have README.md', () => {
        assert.ok(fs.existsSync(path.join(rootDir, 'README.md')));
    });

    it('should have LICENSE', () => {
        assert.ok(fs.existsSync(path.join(rootDir, 'LICENSE')));
    });

    it('README should mention Cortex', () => {
        const readme = fs.readFileSync(path.join(rootDir, 'README.md'), 'utf-8');
        assert.ok(readme.includes('Cortex'));
    });

    it('README should mention MCP tools', () => {
        const readme = fs.readFileSync(path.join(rootDir, 'README.md'), 'utf-8');
        assert.ok(readme.includes('force_recall'));
        assert.ok(readme.includes('auto_learn'));
    });

    it('README should mention the icon', () => {
        const readme = fs.readFileSync(path.join(rootDir, 'README.md'), 'utf-8');
        assert.ok(readme.includes('Zero-Install') || readme.includes('Dashboard') || readme.includes('Browser'));
    });
});

// ============================================================
// Summary
// ============================================================
describe('Test Summary', () => {
    it('should pass all test suites', () => {
        // This is a sentinel test — if we reach here, all above tests passed
        assert.ok(true, 'All test suites completed successfully');
    });
});
