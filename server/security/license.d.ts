export type Plan = 'FREE' | 'TRIAL' | 'PRO';
export interface LicenseInfo {
    plan: Plan;
    key: string | null;
    valid: boolean;
    message: string;
    expiresAt?: string;
    daysRemaining?: number;
}
/**
 * Synchronous license accessor. Returns the cached license state.
 *
 * On the very first call (cold start with no disk cache), this returns
 * the HMAC-signed cached result if available. If no cache exists, it
 * starts background verification and returns a "verifying" state.
 *
 * For guaranteed accurate results at startup, call `waitForVerification()`
 * first — it blocks until the server responds (with a configurable timeout).
 */
export declare function getLicense(): LicenseInfo;
/**
 * Async startup helper — waits for online verification to finish.
 * Call this ONCE at startup, then use getLicense() synchronously afterwards.
 *
 * After this resolves, `getLicense()` will return the server-verified plan
 * (PRO, TRIAL, or FREE) rather than the cold-start "verifying" state.
 */
export declare function waitForVerification(timeoutMs?: number): Promise<LicenseInfo>;
export declare function refreshLicense(): LicenseInfo;
export declare function isPro(): boolean;
export declare function isFree(): boolean;
export declare function isTrial(): boolean;
export declare function getTrialStatus(): string | null;
export declare function saveKey(key: string): void;
export declare function validateKeyFormat(key: string): boolean;
export declare function verifyOnline(key: string): Promise<LicenseInfo>;
//# sourceMappingURL=license.d.ts.map