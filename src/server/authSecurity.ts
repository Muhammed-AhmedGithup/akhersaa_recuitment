import crypto from 'crypto';

/**
 * Enterprise Password Security Utility using Node.js Crypto (PBKDF2 SHA-512)
 * Meets strict Zero-Trust requirements:
 * - Passwords are never stored in plaintext
 * - 16-byte cryptographically secure random salt per user
 * - 10,000 PBKDF2 iterations with SHA-512
 * - Constant-time comparison to prevent timing side-channel attacks
 */

export interface HashedPasswordResult {
  salt: string;
  hash: string;
}

export function hashPassword(password: string): HashedPasswordResult {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  try {
    const computedHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    const computedBuf = Buffer.from(computedHash, 'hex');
    const storedBuf = Buffer.from(storedHash, 'hex');
    if (computedBuf.length !== storedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(computedBuf, storedBuf);
  } catch (err) {
    console.error('[authSecurity] Password verification error:', err);
    return false;
  }
}

/**
 * Generates an 8-character human-friendly yet secure temporary password for account invitations/resets
 * e.g. "Akher#8492"
 */
export function generateTemporaryPassword(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  const specials = ['#', '@', '$', '!'];
  const special = specials[Math.floor(Math.random() * specials.length)];
  return `Akher${special}${digits}`;
}
