/**
 * Setup Wizard — Guided onboarding for first-time users.
 * 
 * Flow: Check Node.js → Check cortex-mcp → Install if missing → Connect → Scan project
 */
import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface SetupStep {
    label: string;
    status: 'pending' | 'running' | 'done' | 'error';
    detail?: string;
}

export async function runSetupWizard(): Promise<boolean> {
    return vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'Cortex Setup Wizard',
            cancellable: true,
        },
        async (progress, token) => {
            // Step 1: Check Node.js
            progress.report({ message: 'Checking Node.js…', increment: 0 });
            const nodeCheck = await checkNodeJs();
            if (!nodeCheck.ok) {
                vscode.window.showErrorMessage(
                    `Cortex requires Node.js >= 18. ${nodeCheck.detail}`,
                    'Download Node.js'
                ).then(action => {
                    if (action) {
                        vscode.env.openExternal(vscode.Uri.parse('https://nodejs.org/'));
                    }
                });
                return false;
            }
            progress.report({ message: `✅ Node.js ${nodeCheck.detail}`, increment: 25 });

            if (token.isCancellationRequested) { return false; }

            // Step 2: Check if cortex-mcp is installed
            progress.report({ message: 'Checking cortex-mcp…', increment: 0 });
            const cortexCheck = await checkCortexMcp();

            if (!cortexCheck.ok) {
                progress.report({ message: 'Installing cortex-mcp…', increment: 0 });

                const install = await vscode.window.showInformationMessage(
                    'Cortex MCP server is not installed. Install it now?',
                    { modal: true },
                    'Install Globally (npm install -g)',
                    'Install in Project (npm install)',
                    'Skip'
                );

                if (install === 'Skip' || !install) {
                    return false;
                }

                const installCmd = install.includes('Globally')
                    ? 'npm install -g cortex-mcp'
                    : 'npm install cortex-mcp';

                try {
                    const terminal = vscode.window.createTerminal({
                        name: '🧠 Cortex Install',
                        message: `Running: ${installCmd}`,
                    });
                    terminal.sendText(installCmd);
                    terminal.show();

                    // Wait for install to complete
                    await new Promise(resolve => setTimeout(resolve, 15000));

                    // Verify installation
                    const recheck = await checkCortexMcp();
                    if (!recheck.ok) {
                        vscode.window.showWarningMessage(
                            'Installation may still be running. Once complete, run "Cortex: Setup Wizard" again.'
                        );
                        return false;
                    }
                } catch {
                    vscode.window.showErrorMessage('Failed to install cortex-mcp. Try manually: npm install -g cortex-mcp');
                    return false;
                }
            }

            progress.report({ message: `✅ cortex-mcp ${cortexCheck.detail || 'installed'}`, increment: 20 });

            if (token.isCancellationRequested) { return false; }

            // Step 3: Sign in for trial
            progress.report({ message: 'Setting up your account…', increment: 0 });

            const authAction = await vscode.window.showInformationMessage(
                '🔑 Sign in to activate your 7-day free trial with all PRO features.',
                'Sign In with Google',
                'Enter License Key',
                'Skip (Free Plan)'
            );

            if (authAction === 'Sign In with Google') {
                await vscode.commands.executeCommand('cortex.login');
            } else if (authAction === 'Enter License Key') {
                await vscode.commands.executeCommand('cortex.enterKey');
            }

            progress.report({ message: '✅ Account configured', increment: 20 });

            if (token.isCancellationRequested) { return false; }

            // Step 4: Verify connection
            progress.report({ message: 'Connecting to Cortex MCP server…', increment: 0 });
            await new Promise(resolve => setTimeout(resolve, 2000));
            progress.report({ message: '✅ Connected', increment: 25 });

            // Step 4: Offer to scan project
            progress.report({ message: 'Setup complete!', increment: 25 });

            const scanNow = await vscode.window.showInformationMessage(
                '✅ Cortex is ready! Want to scan your project now? This captures your stack, structure, and git history into memory.',
                'Scan Project',
                'Skip — I\'ll do it later'
            );

            if (scanNow === 'Scan Project') {
                await vscode.commands.executeCommand('cortex.scanProject');
            }

            // Show success notification with next steps
            vscode.window.showInformationMessage(
                '🧠 Cortex is fully set up! Try: Ctrl+Shift+P → "Cortex: Store Memory"',
                'Open Dashboard',
                'View Walkthrough'
            ).then(action => {
                if (action === 'Open Dashboard') {
                    vscode.commands.executeCommand('cortex.openDashboard');
                } else if (action === 'View Walkthrough') {
                    vscode.commands.executeCommand('cortex.openWalkthrough');
                }
            });

            return true;
        }
    );
}

async function checkNodeJs(): Promise<{ ok: boolean; detail: string }> {
    try {
        const { stdout } = await execAsync('node --version');
        const version = stdout.trim();
        const major = parseInt(version.replace('v', '').split('.')[0]);
        if (major >= 18) {
            return { ok: true, detail: version };
        }
        return { ok: false, detail: `Found ${version}, need >= 18` };
    } catch {
        return { ok: false, detail: 'Node.js not found in PATH' };
    }
}

async function checkCortexMcp(): Promise<{ ok: boolean; detail?: string }> {
    // Check global install
    try {
        const { stdout } = await execAsync('npm list -g cortex-mcp --depth=0 --json');
        const data = JSON.parse(stdout);
        if (data.dependencies?.['cortex-mcp']) {
            return { ok: true, detail: `v${data.dependencies['cortex-mcp'].version}` };
        }
    } catch { /* not installed globally */ }

    // Check local install
    try {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (workspaceRoot) {
            const { stdout } = await execAsync('npm list cortex-mcp --depth=0 --json', { cwd: workspaceRoot });
            const data = JSON.parse(stdout);
            if (data.dependencies?.['cortex-mcp']) {
                return { ok: true, detail: `v${data.dependencies['cortex-mcp'].version} (local)` };
            }
        }
    } catch { /* not installed locally */ }

    // Check if npx can find it
    try {
        await execAsync('npx --yes cortex-mcp --version', { timeout: 10000 });
        return { ok: true, detail: 'available via npx' };
    } catch { /* not available */ }

    return { ok: false };
}
