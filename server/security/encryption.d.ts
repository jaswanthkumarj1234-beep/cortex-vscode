/**
 * Encrypt plaintext content.
 * Returns a base64 string: iv:tag:ciphertext
 */
export declare function encrypt(plaintext: string): string;
/**
 * Decrypt encrypted content.
 * Expects format: ENC:iv:tag:ciphertext
 */
export declare function decrypt(encrypted: string): string;
/**
 * Check if a string is encrypted
 */
export declare function isEncrypted(text: string): boolean;
//# sourceMappingURL=encryption.d.ts.map