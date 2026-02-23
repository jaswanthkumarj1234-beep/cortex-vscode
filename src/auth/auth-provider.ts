import * as vscode from 'vscode';
import * as https from 'https';

const API_BASE = 'https://cortex-ai-iota.vercel.app';

export interface UserProfile {
    id: string;
    email: string;
    name: string;
    avatar_url: string;
    license_key: string;
    plan: 'FREE' | 'TRIAL' | 'PRO';
    license_status: string;
    trial_days_left: number | null;
    has_subscription: boolean;
}

export class AuthProvider implements vscode.Disposable {
    private static SESSION_KEY = 'cortex.jwt';
    private static PROFILE_KEY = 'cortex.profile';
    private _onDidChangeAuth = new vscode.EventEmitter<UserProfile | null>();
    readonly onDidChangeAuth = this._onDidChangeAuth.event;

    private profile: UserProfile | null = null;
    private secrets: vscode.SecretStorage;

    constructor(private context: vscode.ExtensionContext) {
        this.secrets = context.secrets;
    }

    async login(): Promise<boolean> {
        const loginUrl = `${API_BASE}/api/auth/google?redirect=vscode`;
        await vscode.env.openExternal(vscode.Uri.parse(loginUrl));

        vscode.window.showInformationMessage(
            'Sign in with Google in your browser. The extension will activate automatically after login.',
            'OK'
        );
        return true;
    }

    async handleCallback(uri: vscode.Uri): Promise<boolean> {
        const params = new URLSearchParams(uri.query);
        const token = params.get('token');
        const key = params.get('key');

        if (!token) {
            vscode.window.showErrorMessage('Login failed — no token received.');
            return false;
        }

        await this.secrets.store(AuthProvider.SESSION_KEY, token);

        if (key) {
            const { LicenseSync } = await import('./license-sync');
            LicenseSync.writeKey(key);
        }

        const profile = await this.fetchProfile(token);
        if (profile) {
            this.profile = profile;
            await this.context.globalState.update(AuthProvider.PROFILE_KEY, profile);
            this._onDidChangeAuth.fire(profile);
            vscode.window.showInformationMessage(
                `Welcome, ${profile.name}! Plan: ${profile.plan}${profile.trial_days_left ? ` (${profile.trial_days_left} days left)` : ''}`
            );
            return true;
        }

        return false;
    }

    async logout(): Promise<void> {
        await this.secrets.delete(AuthProvider.SESSION_KEY);
        await this.context.globalState.update(AuthProvider.PROFILE_KEY, undefined);
        this.profile = null;
        this._onDidChangeAuth.fire(null);

        const { LicenseSync } = await import('./license-sync');
        LicenseSync.clearKey();

        vscode.window.showInformationMessage('Signed out of Cortex.');
    }

    async getProfile(): Promise<UserProfile | null> {
        if (this.profile) { return this.profile; }

        const cached = this.context.globalState.get<UserProfile>(AuthProvider.PROFILE_KEY);
        if (cached) {
            this.profile = cached;
            return cached;
        }

        const token = await this.secrets.get(AuthProvider.SESSION_KEY);
        if (!token) { return null; }

        const profile = await this.fetchProfile(token);
        if (profile) {
            this.profile = profile;
            await this.context.globalState.update(AuthProvider.PROFILE_KEY, profile);
        }
        return profile;
    }

    async isLoggedIn(): Promise<boolean> {
        const token = await this.secrets.get(AuthProvider.SESSION_KEY);
        return !!token;
    }

    private fetchProfile(token: string): Promise<UserProfile | null> {
        return new Promise((resolve) => {
            const url = new URL(`${API_BASE}/api/auth/me`);
            const req = https.request({
                hostname: url.hostname,
                port: 443,
                path: url.pathname,
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` },
                timeout: 8000,
            }, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        if (json.error) { resolve(null); return; }
                        resolve(json as UserProfile);
                    } catch (_e) { resolve(null); }
                });
            });
            req.on('error', () => resolve(null));
            req.on('timeout', () => { req.destroy(); resolve(null); });
            req.end();
        });
    }

    dispose(): void {
        this._onDidChangeAuth.dispose();
    }
}
