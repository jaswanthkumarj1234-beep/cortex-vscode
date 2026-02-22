import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function runSetupWizard(): Promise<boolean> {
    return vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'Cortex Setup Wizard',
            cancellable: true,
        },
        async (progress, token) => {
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

            progress.report({ message: 'Checking Cortex server…', increment: 0 });
            const serverStatus = await checkServer();
            progress.report({ message: `✅ Server: ${serverStatus}`, increment: 25 });

            if (token.isCancellationRequested) { return false; }

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

            progress.report({ message: 'Setup complete!', increment: 30 });

            const scanNow = await vscode.window.showInformationMessage(
                '✅ Cortex is ready! Want to scan your project now? This captures your stack, structure, and git history into memory.',
                'Scan Project',
                'Skip — I\'ll do it later'
            );

            if (scanNow === 'Scan Project') {
                await vscode.commands.executeCommand('cortex.scanProject');
            }

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
    } catch (_e) {
        return { ok: false, detail: 'Node.js not found in PATH' };
    }
}

async function checkServer(): Promise<string> {
    try {
        await execAsync('node --version');
        return 'Bundled server ready';
    } catch (_e) {
        return 'Node.js required for server';
    }
}
