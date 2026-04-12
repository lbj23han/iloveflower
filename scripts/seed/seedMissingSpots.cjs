/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');
const { loadLocalEnv } = require('./loadEnv.cjs');
const { mapKakaoPlace, filterSpotsWithAI } = require('./kakaoLocal.cjs');

const KAKAO_LOCAL_URL = 'https://dapi.kakao.com/v2/local/search/keyword.json';
const REQUEST_DELAY_MS = 200;

// 스킵된 축제 대상 스팟들 — 장소명 + 주소 힌트로 직접 검색
const TARGET_SPOTS = [
  { query: '마노르블랑', keyword: '수국 카페' },
  { query: '휴애리자연생활공원', keyword: '수국 축제' },
  { query: '비체올린', keyword: '능소화 명소' },
  { query: '대저생태공원', keyword: '유채꽃밭' },
  { query: '유구색동수국정원', keyword: '수국 명소' },
  { query: '가평 양떼목장', keyword: '수국 축제' },
  { query: '구와우마을 해바라기', keyword: '해바라기 명소' },
  { query: '궁남지', keyword: '연꽃 명소' },
  { query: '회산백련지', keyword: '연꽃 명소' },
  { query: '세미원', keyword: '연꽃 명소' },
  { query: '국립생태원 장항', keyword: '맥문동 명소' },
  { query: '화담숲', keyword: '수국 명소' },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function searchByName(apiKey, query) {
  const params = new URLSearchParams({ query, size: '5' });
  const res = await fetch(`${KAKAO_LOCAL_URL}?${params}`, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
  });
  if (!res.ok) throw new Error(`Kakao API ${res.status}`);
  const json = await res.json();
  await sleep(REQUEST_DELAY_MS);
  return json.documents ?? [];
}

async function syncSpots(supabase, rows) {
  const externalIds = rows.map((r) => r.external_place_id).filter(Boolean);
  const { data: existing } = await supabase
    .from('flower_spots')
    .select('id, external_place_id')
    .in('external_place_id', externalIds);

  const existingMap = new Map((existing ?? []).map((r) => [r.external_place_id, r.id]));
  const insertRows = rows.filter((r) => !existingMap.has(r.external_place_id));
  const updateRows = rows.filter((r) => existingMap.has(r.external_place_id));

  if (insertRows.length > 0) {
    const { error } = await supabase.from('flower_spots').insert(insertRows);
    if (error) console.error('[missing] insert error:', error.message);
    else console.log(`[missing] inserted ${insertRows.length}개`);
  }

  for (const row of updateRows) {
    const id = existingMap.get(row.external_place_id);
    const { error } = await supabase.from('flower_spots').update({ ...row, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) console.error(`[missing] update error for ${row.name}:`, error.message);
  }

  console.log(`[missing] sync 완료: insert ${insertRows.length}, update ${updateRows.length}`);
}

async function main() {
  loadLocalEnv();
  const apiKey = process.env.KAKAO_REST_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey || !supabaseUrl || !serviceKey) {
    throw new Error('Required env keys missing');
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const collected = new Map();

  for (const target of TARGET_SPOTS) {
    console.log(`\n[missing] 검색: "${target.query}"`);
    try {
      const docs = await searchByName(apiKey, target.query);
      if (docs.length === 0) {
        console.log(`[missing] 결과 없음: ${target.query}`);
        continue;
      }
      for (const doc of docs) {
        const mapped = mapKakaoPlace(doc, target.keyword);
        if (mapped && !collected.has(doc.id)) {
          collected.set(doc.id, mapped);
          console.log(`[missing] 수집: ${doc.place_name} (${doc.address_name})`);
        }
      }
    } catch (err) {
      console.error(`[missing] 오류 ${target.query}:`, err.message);
    }
  }

  const allSpots = [...collected.values()];
  console.log(`\n[missing] 총 ${allSpots.length}개 수집, AI 필터 시작`);

  const filtered = await filterSpotsWithAI(allSpots, apiKey, openaiKey);
  console.log(`[missing] AI 필터 후 ${filtered.length}개`);

  // AI 제외된 것도 여름꽃 명소는 강제 포함 (직접 지정한 장소들이므로)
  const excluded = allSpots.filter(
    (s) => !filtered.find((f) => f.external_place_id === s.external_place_id)
  );
  const { _needsAiCheck: _1, ...rest1 } = excluded[0] ?? {};
  const forceIncluded = excluded.map(({ _needsAiCheck: _, ...rest }) => rest);

  const finalSpots = [...filtered, ...forceIncluded];
  console.log(`[missing] 강제포함 후 최종 ${finalSpots.length}개 DB 삽입`);

  await syncSpots(supabase, finalSpots);
  console.log('[missing] 완료');

  // 다시 seedFestivals 실행
  console.log('\n[missing] seedFestivals 재실행...');
  const { execSync } = require('child_process');
  execSync('node scripts/seed/seedFestivals.cjs', { stdio: 'inherit', cwd: process.cwd() });
}

main().catch((err) => {
  console.error('[missing] failed:', err);
  process.exit(1);
});
