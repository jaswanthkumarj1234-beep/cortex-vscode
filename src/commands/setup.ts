import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function runSetupWizard(): Promise<boolean> {
    return vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'Cortex Setup',
            cancellable: false,
        },
        async (progress) => {
            // Step 1: Check Node.js (required for server)
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
            progress.report({ message: `✅ Node.js ${nodeCheck.detail}`, increment: 40 });

            // Step 2: Server check (bundled — always ready)
            progress.report({ message: '✅ Bundled server ready', increment: 30 });

            // Step 3: Done — no auth needed, no prompts
            progress.report({ message: '✅ Setup complete!', increment: 30 });

            // Show single, helpful notification
            vscode.window.showInformationMessage(
                '🧠 Cortex is ready! All features unlocked.',
                'Open Dashboard'
            ).then(action => {
                if (action === 'Open Dashboard') {
                    vscode.commands.executeCommand('cortex.openDashboard');
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
