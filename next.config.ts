import type { NextConfig } from 'next';

const isTossBuild = process.env.TOSS_BUILD === 'true';

const nextConfig: NextConfig = {
  ...(isTossBuild && {
    output: 'export',
    distDir: 'dist/web',
  }),
  images: {
    domains: [],
    unoptimized: isTossBuild,
  },
  // 카카오 지도 SDK는 외부 스크립트 — CSP 설정 시 주의
  ...(!isTossBuild && {
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: [
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          ],
        },
      ];
    },
  }),
};

export default nextConfig;
