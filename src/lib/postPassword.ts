import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

export function hashPostPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

export function verifyPostPassword(password: string, encoded: string | null | undefined): boolean {
  if (!encoded) return false;
  const [salt, storedKey] = encoded.split(':');
  if (!salt || !storedKey) return false;

  const derivedKey = scryptSync(password, salt, 64);
  const storedBuffer = Buffer.from(storedKey, 'hex');

  if (storedBuffer.length !== derivedKey.length) return false;
  return timingSafeEqual(storedBuffer, derivedKey);
}
