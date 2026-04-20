import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGINS = new Set([
  'http://localhost:3000',
  'https://localhost:3000',
  'https://floral-map.apps.tossmini.com',
  'https://floral-map.private-apps.tossmini.com',
  'https://꽃놀이맵.site',
  'https://www.꽃놀이맵.site',
  'https://xn--js0bm6bu3m3qo.site',
  'https://www.xn--js0bm6bu3m3qo.site',
]);

function getAllowedOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (!origin) return null;
  return ALLOWED_ORIGINS.has(origin) ? origin : null;
}

function buildCorsHeaders(req: NextRequest, methods: string) {
  const allowedOrigin = getAllowedOrigin(req);
  const headers = new Headers();

  if (allowedOrigin) {
    headers.set('Access-Control-Allow-Origin', allowedOrigin);
    headers.set('Vary', 'Origin');
    headers.set('Access-Control-Allow-Methods', methods);
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    headers.set('Access-Control-Max-Age', '86400');
  }

  return headers;
}

export function corsJson(
  req: NextRequest,
  body: unknown,
  init?: ResponseInit & { methods?: string },
) {
  const methods = init?.methods ?? 'GET, POST, PATCH, DELETE, OPTIONS';
  const headers = buildCorsHeaders(req, methods);

  if (init?.headers) {
    const initHeaders = new Headers(init.headers);
    initHeaders.forEach((value, key) => headers.set(key, value));
  }

  return NextResponse.json(body, {
    ...init,
    headers,
  });
}

export function corsOptions(req: NextRequest, methods = 'GET, POST, PATCH, DELETE, OPTIONS') {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(req, methods),
  });
}
