/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');
const { loadLocalEnv } = require('./loadEnv.cjs');
const { CITY_BOUNDS, tileBounds } = require('./cityBounds.cjs');
const { requestKeywordSearch, mapKakaoPlace, filterSpotsWithAI } = require('./kakaoLocal.cjs');

const KEYWORD_GROUPS = {
  // 봄꽃
  spring: [
    '벚꽃 명소',
    '벚꽃 공원',
    '벚꽃 카페',
    '벚꽃 축제',
    '벚꽃길',
    '매화 명소',
    '매화 축제',
    '매화마을',
    '개나리 명소',
    '진달래 명소',
    '철쭉 명소',
    '철쭉 축제',
    '철쭉 군락지',
    '유채꽃밭',
    '유채꽃 축제',
    '튤립 공원',
    '튤립 축제',
    '목련 명소',
    '작약 명소',
    '작약 축제',
    '복숭아꽃 명소',
    '복숭아꽃 축제',
  ],
  // 여름꽃
  summer: [
    '수국 명소',
    '수국 카페',
    '수국 축제',
    '수국 군락지',
    '연꽃 명소',
    '연꽃단지',
    '연꽃 축제',
    '능소화 명소',
    '능소화 군락',
    '해바라기 명소',
    '해바라기 축제',
    '라벤더 농장',
    '라벤더 축제',
    '장미 공원',
    '장미원',
    '장미 축제',
    '나팔꽃 명소',
    '안개꽃 명소',
    '백일홍 명소',
    '백일홍 축제',
    '석류꽃 명소',
  ],
  // 가을꽃
  autumn: [
    '코스모스 공원',
    '코스모스 축제',
    '억새 명소',
    '억새 축제',
    '억새 군락지',
    '핑크뮬리 명소',
    '핑크뮬리 공원',
    '메밀꽃 명소',
    '메밀꽃 축제',
    '국화 축제',
    '국화 공원',
    '구절초 명소',
    '구절초 축제',
    '채송화 명소',
    '투구꽃 명소',
    '추해당 명소',
  ],
  // 단풍
  foliage: [
    '단풍 명소',
    '단풍길',
    '단풍 공원',
    '단풍 축제',
    '단풍 군락지',
    '단풍 드라이브',
    '단풍 산책로',
    '단풍나무 명소',
    '가을 단풍',
    '단풍 출사지',
  ],
  // 겨울꽃/기타
  winter: [
    '동백꽃 명소',
    '동백 군락지',
    '수선화 명소',
    '수선화 축제',
    '군자란 명소',
    '시클라멘 명소',
    '복수초 명소',
    '복수초 축제',
    '크리스마스로즈 명소',
    '눈꽃 축제',
    '설경 명소',
  ],
  // 공통
  common: [
    '꽃축제',
    '꽃 정원',
    '국가정원',
    '수목원 꽃축제',
    '플라워 카페',
  ],
};
const DEFAULT_CITY = 'all';
const DEFAULT_KEYWORD_GROUPS = ['spring', 'summer', 'autumn', 'winter', 'common', 'foliage'];
const CHUNK_SIZE = 100;
const KEYWORD_COOLDOWN_MS = 180;
const CITY_COOLDOWN_MS = 3500;

function parseCities() {
  const cityArg = process.argv.find((arg) => arg.startsWith('--city='));
  const value = cityArg ? cityArg.split('=')[1] : DEFAULT_CITY;
  if (!value || value === 'all') return Object.keys(CITY_BOUNDS);
  return value.split(',').map((city) => city.trim()).filter(Boolean);
}

function parseKeywordGroups() {
  const keywordArg = process.argv.find((arg) => arg.startsWith('--keywords='));
  const value = keywordArg ? keywordArg.split('=')[1] : 'all';
  if (!value || value === 'all') return DEFAULT_KEYWORD_GROUPS;
  return value.split(',').map((group) => group.trim()).filter(Boolean);
}

function chunk(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function syncChunk(supabase, rows) {
  const { data: upserted, error: upsertError } = await supabase
    .from('flower_spots')
    .upsert(rows, { onConflict: 'external_place_id' })
    .select('id');

  if (!upsertError) {
    return { insertedOrUpdated: upserted?.length ?? rows.length };
  }

  const externalIds = rows.map((row) => row.external_place_id);
  const { data: existing, error: existingError } = await supabase
    .from('flower_spots')
    .select('id, external_place_id')
    .in('external_place_id', externalIds);

  if (existingError) throw existingError;

  const existingMap = new Map((existing ?? []).map((row) => [row.external_place_id, row.id]));
  const insertRows = rows.filter((row) => !existingMap.has(row.external_place_id));
  const updateRows = rows.filter((row) => existingMap.has(row.external_place_id));

  if (insertRows.length > 0) {
    const { error } = await supabase.from('flower_spots').insert(insertRows);
    if (error) throw error;
  }

  for (const row of updateRows) {
    const id = existingMap.get(row.external_place_id);
    const { error } = await supabase
      .from('flower_spots')
      .update({ ...row, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  return { insertedOrUpdated: insertRows.length + updateRows.length };
}

async function collectCitySpots(apiKey, cityKey, keywords) {
  const city = CITY_BOUNDS[cityKey];
  if (!city) {
    throw new Error(`Unknown city: ${cityKey}`);
  }

  const tiles = tileBounds(city.bounds, city.latStep, city.lngStep);
  const deduped = new Map();
  let totalDocuments = 0;

  console.log(`\n[seed] ${city.label}: ${tiles.length}개 타일 검색 시작`);

  for (const [tileIndex, tile] of tiles.entries()) {
    for (const keyword of keywords) {
      let page = 1;
      let isEnd = false;

      while (!isEnd) {
        const payload = await requestKeywordSearch({ apiKey, query: keyword, rect: tile, page });
        const documents = payload.documents ?? [];
        totalDocuments += documents.length;

        for (const place of documents) {
          const mapped = mapKakaoPlace(place, keyword);
          if (mapped) {
            deduped.set(place.id, mapped);
          }
        }

        isEnd = Boolean(payload.meta?.is_end);
        if (page >= 45 && !isEnd) {
          console.warn(`[seed] ${city.label} ${keyword} tile ${tileIndex + 1}/${tiles.length}: page limit reached`);
          break;
        }

        page += 1;
      }

      await sleep(KEYWORD_COOLDOWN_MS);
    }

    console.log(`[seed] ${city.label}: ${tileIndex + 1}/${tiles.length} 타일 완료, unique=${deduped.size}`);
  }

  console.log(`[seed] ${city.label}: raw=${totalDocuments}, unique=${deduped.size}`);
  const allSpots = [...deduped.values()];

  const openaiKey = process.env.OPENAI_API_KEY;
  const spots = await filterSpotsWithAI(allSpots, apiKey, openaiKey);
  console.log(`[seed] ${city.label}: AI 필터 후 ${spots.length}개 (카페 제외 기준)`);
  return spots;
}

async function main() {
  loadLocalEnv();

  const apiKey = process.env.KAKAO_REST_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey || !supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Required env keys are missing. Check .env.local');
  }

  const cities = parseCities();
  const keywordGroups = parseKeywordGroups();
  const invalidCities = cities.filter((city) => !CITY_BOUNDS[city]);
  if (invalidCities.length > 0) {
    throw new Error(`Unsupported cities: ${invalidCities.join(', ')}`);
  }
  const invalidKeywordGroups = keywordGroups.filter((group) => !KEYWORD_GROUPS[group]);
  if (invalidKeywordGroups.length > 0) {
    throw new Error(`Unsupported keyword groups: ${invalidKeywordGroups.join(', ')}`);
  }
  const keywords = keywordGroups.flatMap((group) => KEYWORD_GROUPS[group]);

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let grandTotal = 0;
  for (const city of cities) {
    const rows = await collectCitySpots(apiKey, city, keywords);
    let synced = 0;

    for (const group of chunk(rows, CHUNK_SIZE)) {
      const result = await syncChunk(supabase, group);
      synced += result.insertedOrUpdated;
    }

    grandTotal += rows.length;
    console.log(`[seed] ${CITY_BOUNDS[city].label}: sync complete (${synced} rows processed)`);
    await sleep(CITY_COOLDOWN_MS);
  }

  console.log(`\n[seed] all done. total unique rows processed=${grandTotal}`);
}

main().catch((error) => {
  console.error('[seed] failed:', error);
  process.exit(1);
});
