import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'kkot-map',
  brand: {
    displayName: '꽃놀이맵',
    primaryColor: '#ff6b81',
    icon: 'https://xn--js0bm6bu3m3qo.site/icon.png',
  },
  web: {
    host: 'localhost',
    port: 3000,
    commands: {
      dev: 'next dev',
      build: 'node scripts/toss-build.mjs',
    },
  },
  permissions: [],
  outdir: 'dist/web',
});
