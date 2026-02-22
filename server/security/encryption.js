"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports.isEncrypted = isEncrypted;
/**
 * Memory Encryption — AES-256-GCM encryption at rest for sensitive memory content.
 *
 * Uses Node.js built-in crypto module (no external deps).
 * Encryption key derived from a machine-specific seed using PBKDF2.
 *
 * When enabled:
 * - Memory `intent` and `action` fields are encrypted before storage
 * - Decrypted on read
 * - FTS index uses plaintext (searched in-memory) — only DB at rest is encrypted
 */
const crypto = __importStar(require("crypto"));
const os = __importStar(require("os"));
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT = 'cortex-memory-salt-v1';
// Derive key from machine-specific info (hostname + username + homedir hash)
function deriveKey() {
    const seed = `${os.hostname()}:${os.userInfo().username}:${os.homedir()}`;
    return crypto.pbkdf2Sync(seed, SALT, 100000, KEY_LENGTH, 'sha512');
}
let _key = null;
function getKey() {
    if (!_key)
        _key = deriveKey();
    return _key;
}
/**
 * Encrypt plaintext content.
 * Returns a base64 string: iv:tag:ciphertext
 */
function encrypt(plaintext) {
    if (!plaintext)
        return plaintext;
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const tag = cipher.getAuthTag();
    // Format: iv:tag:ciphertext (all base64)
    return `ENC:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted}`;
}
/**
 * Decrypt encrypted content.
 * Expects format: ENC:iv:tag:ciphertext
 */
function decrypt(encrypted) {
    if (!encrypted || !encrypted.startsWith('ENC:'))
        return encrypted;
    try {
        const parts = encrypted.split(':');
        if (parts.length !== 4)
            return encrypted;
        const iv = Buffer.from(parts[1], 'base64');
        const tag = Buffer.from(parts[2], 'base64');
        const ciphertext = parts[3];
        const key = getKey();
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);
        let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    catch {
        // If decryption fails, return original (might be plaintext from before encryption was enabled)
        return encrypted;
    }
}
/**
 * Check if a string is encrypted
 */
function isEncrypted(text) {
    return text?.startsWith('ENC:') ?? false;
}
//# sourceMappingURL=encryption.js.map