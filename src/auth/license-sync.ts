/**
 * License Sync — Reads/writes license keys to ~/.cortex/license
 * 
 * This bridges the VS Code extension and the NPM package (cortex-mcp).
 * When the extension writes a key here, cortex-mcp's license.ts reads it
 * on next startup — no changes needed in the NPM package.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CORTEX_DIR = path.join(os.homedir(), '.cortex');
const LICENSE_FILE = path.join(CORTEX_DIR, 'license');

export class LicenseSync {
    /** Write license key to ~/.cortex/license */
    static writeKey(key: string): boolean {
        try {
            if (!fs.existsSync(CORTEX_DIR)) {
                fs.mkdirSync(CORTEX_DIR, { recursive: true });
            }
            fs.writeFileSync(LICENSE_FILE, key.trim(), 'utf-8');
            return true;
        } catch {
            return false;
        }
    }

    /** Read license key from ~/.cortex/license */
    static readKey(): string | null {
        try {
            // Check env var first
            const envKey = process.env.CORTEX_LICENSE_KEY?.trim();
            if (envKey) { return envKey; }

            // Check file
            if (fs.existsSync(LICENSE_FILE)) {
                const key = fs.readFileSync(LICENSE_FILE, 'utf-8').trim();
                return key || null;
            }
        } catch { /* ignore */ }
        return null;
    }

    /** Clear license key */
    static clearKey(): boolean {
        try {
            if (fs.existsSync(LICENSE_FILE)) {
                fs.unlinkSync(LICENSE_FILE);
            }
            return true;
        } catch {
            return false;
        }
    }

    /** Check if a license key exists */
    static hasKey(): boolean {
        return !!this.readKey();
    }

    /** Validate key format: CORTEX-XXXX-XXXX-XXXX-XXXX */
    static isValidFormat(key: string): boolean {
        return /^CORTEX-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(key.trim());
    }
}
