/**
 * TOSS_BUILD 전용 빌드 스크립트
 * - 동적 세그먼트([id]) API routes를 /tmp로 임시 이동 → next build 실행 → 복원
 * - output: export 가 동적 API routes를 지원하지 않기 때문
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const tmpDir = path.join(os.tmpdir(), `kkot-map-toss-${Date.now()}`);
fs.mkdirSync(tmpDir, { recursive: true });

// 임시로 제외할 동적 API route 디렉토리 목록
const DYNAMIC_API_DIRS = [
  'src/app/api/admin',
  'src/app/api/posts/[id]',
  'src/app/api/gyms/[id]',
  'src/app/gyms/[id]',
  'src/app/community/[id]',
];

const backed = [];

function backup(dir) {
  const abs = path.join(root, dir);
  const bak = path.join(tmpDir, dir.replace(/\//g, '_').replace(/\[/g, 'LB_').replace(/\]/g, '_RB'));
  if (fs.existsSync(abs)) {
    fs.renameSync(abs, bak);
    backed.push({ abs, bak });
    console.log(`[toss-build] Excluded: ${dir}`);
  }
}

function restore() {
  for (const { abs, bak } of backed) {
    if (fs.existsSync(bak)) {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.renameSync(bak, abs);
      console.log(`[toss-build] Restored: ${path.relative(root, abs)}`);
    }
  }
  try { fs.rmSync(tmpDir, { recursive: true }); } catch { /* ignore */ }
}

process.on('exit', restore);
process.on('SIGINT', () => { restore(); process.exit(1); });
process.on('uncaughtException', (e) => { console.error(e); restore(); process.exit(1); });

for (const dir of DYNAMIC_API_DIRS) backup(dir);

try {
  execSync('TOSS_BUILD=true NEXT_PUBLIC_TOSS_BUILD=true npx next build', {
    stdio: 'inherit',
    cwd: root,
    env: { ...process.env, TOSS_BUILD: 'true', NEXT_PUBLIC_TOSS_BUILD: 'true' },
  });
} finally {
  restore();
}
