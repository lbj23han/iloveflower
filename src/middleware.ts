import { NextRequest, NextResponse } from 'next/server';

const API_RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  '/api/votes': { limit: 30, windowMs: 60 * 60 * 1000 },
  '/api/reviews': { limit: 10, windowMs: 60 * 60 * 1000 },
  '/api/reports': { limit: 5, windowMs: 60 * 60 * 1000 },
  '/api/posts': { limit: 5, windowMs: 60 * 60 * 1000 },
  '/api/comments': { limit: 20, windowMs: 60 * 60 * 1000 },
};

// Edge-compatible in-memory rate limit (per instance)
const store = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, path: string): boolean {
  const config = API_RATE_LIMITS[path];
  if (!config) return true;

  const key = `${ip}:${path}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return true;
  }

  if (entry.count >= config.limit) return false;
  entry.count += 1;
  return true;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // API 뮤테이션에만 rate limit 적용 (GET 제외)
  if (pathname.startsWith('/api/') && req.method !== 'GET') {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    const allowed = checkRateLimit(ip, pathname);
    if (!allowed) {
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
