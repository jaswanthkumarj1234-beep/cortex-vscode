import * as vscode from 'vscode';
import { AuthProvider } from '../auth/auth-provider';
import { LicenseSync } from '../auth/license-sync';

const CHECKOUT_URL = 'https://cortex-website-theta.vercel.app/api/payments/checkout';
const DASHBOARD_URL = 'https://cortex-website-theta.vercel.app/dashboard';

export function registerLoginCommands(
    context: vscode.ExtensionContext,
    authProvider: AuthProvider,
): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('cortex.login', async () => {
            const loggedIn = await authProvider.isLoggedIn();
            if (loggedIn) {
                const profile = await authProvider.getProfile();
                const action = await vscode.window.showInformationMessage(
                    `Already signed in as ${profile?.name || profile?.email}. Plan: ${profile?.plan}`,
                    'Sign Out', 'OK'
                );
                if (action === 'Sign Out') {
                    await authProvider.logout();
                }
                return;
            }
            await authProvider.login();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('cortex.logout', async () => {
            const confirm = await vscode.window.showWarningMessage(
                'Sign out of Cortex? Your license key will be removed.',
                { modal: true },
                'Sign Out'
            );
            if (confirm === 'Sign Out') {
                await authProvider.logout();
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('cortex.enterKey', async () => {
            const existingKey = LicenseSync.readKey();
            const key = await vscode.window.showInputBox({
                prompt: 'Enter your Cortex license key',
                placeHolder: 'CORTEX-XXXX-XXXX-XXXX-XXXX',
                value: existingKey || '',
                validateInput: (value) => {
                    if (!value.trim()) { return 'Key cannot be empty'; }
                    if (!LicenseSync.isValidFormat(value)) {
                        return 'Invalid format. Expected: CORTEX-XXXX-XXXX-XXXX-XXXX';
                    }
                    return null;
                },
            });
            if (!key) { return; }

            const success = LicenseSync.writeKey(key);
            if (success) {
                vscode.window.showInformationMessage(
                    'License key saved! Restart cortex-mcp to activate.',
                    'Restart Now'
                ).then(action => {
                    if (action === 'Restart Now') {
                        vscode.commands.executeCommand('workbench.action.reloadWindow');
                    }
                });
            } else {
                vscode.window.showErrorMessage('Failed to save license key.');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('cortex.upgrade', async () => {
            const loggedIn = await authProvider.isLoggedIn();
            if (!loggedIn) {
                const action = await vscode.window.showInformationMessage(
                    'Sign in first to upgrade to Cortex Pro.',
                    'Sign In', 'Enter Key Instead'
                );
                if (action === 'Sign In') {
                    await authProvider.login();
                } else if (action === 'Enter Key Instead') {
                    await vscode.commands.executeCommand('cortex.enterKey');
                }
                return;
            }

            const profile = await authProvider.getProfile();
            if (profile?.plan === 'PRO') {
                vscode.window.showInformationMessage('You already have Cortex Pro! All features are unlocked.');
                return;
            }

            const action = await vscode.window.showInformationMessage(
                profile?.plan === 'TRIAL'
                    ? `Your trial has ${profile.trial_days_left} days left. Upgrade now to keep all features.`
                    : 'Upgrade to Cortex Pro for unlimited memories and all features.',
                'Upgrade ($9/mo)', 'View Dashboard', 'Later'
            );

            if (action === 'Upgrade ($9/mo)') {
                await vscode.env.openExternal(vscode.Uri.parse(CHECKOUT_URL));
            } else if (action === 'View Dashboard') {
                await vscode.env.openExternal(vscode.Uri.parse(DASHBOARD_URL));
            }
        })
    );
}
