import { NextRequest } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (single instance per serverless warm container)
// For production: replace with Redis/Upstash
const store = new Map<string, RateLimitEntry>();

function getKey(req: NextRequest, action: string): string {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  return `${action}:${ip}`;
}

interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export function rateLimit(
  req: NextRequest,
  action: string,
  opts: RateLimitOptions = { limit: 10, windowMs: 60_000 }
): { ok: boolean; remaining: number } {
  const key = getKey(req, action);
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, remaining: opts.limit - 1 };
  }

  if (entry.count >= opts.limit) {
    return { ok: false, remaining: 0 };
  }

  entry.count += 1;
  return { ok: true, remaining: opts.limit - entry.count };
}

export function ipHash(req: NextRequest): string {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  // Simple obfuscation — not cryptographic, just for internal dedup
  return Buffer.from(ip).toString('base64').slice(0, 24);
}
