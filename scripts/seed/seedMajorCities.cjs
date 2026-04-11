/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');
const { loadLocalEnv } = require('./loadEnv.cjs');
const { CITY_BOUNDS, tileBounds } = require('./cityBounds.cjs');
const { requestKeywordSearch, mapKakaoPlace, filterSpotsWithAI } = require('./kakaoLocal.cjs');

const KEYWORDS = [
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
  '장미 공원',
  '장미원',
  '장미 축제',
  '라벤더 농장',
  '라벤더 축제',
  '코스모스 공원',
  '코스모스 축제',
  '해바라기 명소',
  '해바라기 축제',
  '꽃축제',
  '꽃 정원',
  '국가정원',
  '수목원 꽃축제',
  '정원 카페',
  '플라워 카페',
  '가든 카페',
];
const DEFAULT_CITY = 'all';
const CHUNK_SIZE = 100;

function parseCities() {
  const cityArg = process.argv.find((arg) => arg.startsWith('--city='));
  const value = cityArg ? cityArg.split('=')[1] : DEFAULT_CITY;
  if (!value || value === 'all') return Object.keys(CITY_BOUNDS);
  return value.split(',').map((city) => city.trim()).filter(Boolean);
}

function chunk(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
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

async function collectCitySpots(apiKey, cityKey) {
  const city = CITY_BOUNDS[cityKey];
  if (!city) {
    throw new Error(`Unknown city: ${cityKey}`);
  }

  const tiles = tileBounds(city.bounds, city.latStep, city.lngStep);
  const deduped = new Map();
  let totalDocuments = 0;

  console.log(`\n[seed] ${city.label}: ${tiles.length}개 타일 검색 시작`);

  for (const [tileIndex, tile] of tiles.entries()) {
    for (const keyword of KEYWORDS) {
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
    }

    console.log(`[seed] ${city.label}: ${tileIndex + 1}/${tiles.length} 타일 완료, unique=${deduped.size}`);
  }

  console.log(`[seed] ${city.label}: raw=${totalDocuments}, unique=${deduped.size}`);
  const allSpots = [...deduped.values()];

  const apiKey = process.env.KAKAO_REST_API_KEY;
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
  const invalidCities = cities.filter((city) => !CITY_BOUNDS[city]);
  if (invalidCities.length > 0) {
    throw new Error(`Unsupported cities: ${invalidCities.join(', ')}`);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let grandTotal = 0;
  for (const city of cities) {
    const rows = await collectCitySpots(apiKey, city);
    let synced = 0;

    for (const group of chunk(rows, CHUNK_SIZE)) {
      const result = await syncChunk(supabase, group);
      synced += result.insertedOrUpdated;
    }

    grandTotal += rows.length;
    console.log(`[seed] ${CITY_BOUNDS[city].label}: sync complete (${synced} rows processed)`);
  }

  console.log(`\n[seed] all done. total unique rows processed=${grandTotal}`);
}

main().catch((error) => {
  console.error('[seed] failed:', error);
  process.exit(1);
});
