import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CORTEX_DIR = path.join(os.homedir(), '.cortex');
const LICENSE_FILE = path.join(CORTEX_DIR, 'license');

export class LicenseSync {
    static writeKey(key: string): boolean {
        try {
            if (!fs.existsSync(CORTEX_DIR)) {
                fs.mkdirSync(CORTEX_DIR, { recursive: true });
            }
            fs.writeFileSync(LICENSE_FILE, key.trim(), 'utf-8');
            return true;
        } catch (_e) {
            return false;
        }
    }

    static readKey(): string | null {
        try {
            const envKey = process.env.CORTEX_LICENSE_KEY?.trim();
            if (envKey) { return envKey; }

            if (fs.existsSync(LICENSE_FILE)) {
                const key = fs.readFileSync(LICENSE_FILE, 'utf-8').trim();
                return key || null;
            }
        } catch (_e) { }
        return null;
    }

    static clearKey(): boolean {
        try {
            if (fs.existsSync(LICENSE_FILE)) {
                fs.unlinkSync(LICENSE_FILE);
            }
            return true;
        } catch (_e) {
            return false;
        }
    }

    static hasKey(): boolean {
        return !!this.readKey();
    }

    static isValidFormat(key: string): boolean {
        return /^CORTEX-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(key.trim());
    }
}
