/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');
const { loadLocalEnv } = require('./loadEnv.cjs');
const { CITY_BOUNDS, tileBounds } = require('./cityBounds.cjs');
const { requestKeywordSearch, mapKakaoPlace } = require('./kakaoLocal.cjs');

const KEYWORDS = ['헬스장', '피트니스', 'PT', '필라테스', '크로스핏', '요가', '수영장'];
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
    .from('gyms')
    .upsert(rows, { onConflict: 'external_place_id' })
    .select('id');

  if (!upsertError) {
    return { insertedOrUpdated: upserted?.length ?? rows.length };
  }

  const externalIds = rows.map((row) => row.external_place_id);
  const { data: existing, error: existingError } = await supabase
    .from('gyms')
    .select('id, external_place_id')
    .in('external_place_id', externalIds);

  if (existingError) throw existingError;

  const existingMap = new Map((existing ?? []).map((row) => [row.external_place_id, row.id]));
  const insertRows = rows.filter((row) => !existingMap.has(row.external_place_id));
  const updateRows = rows.filter((row) => existingMap.has(row.external_place_id));

  if (insertRows.length > 0) {
    const { error } = await supabase.from('gyms').insert(insertRows);
    if (error) throw error;
  }

  for (const row of updateRows) {
    const id = existingMap.get(row.external_place_id);
    const { error } = await supabase
      .from('gyms')
      .update({ ...row, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  return { insertedOrUpdated: insertRows.length + updateRows.length };
}

async function collectCityGyms(apiKey, cityKey) {
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
  return [...deduped.values()];
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
    const rows = await collectCityGyms(apiKey, city);
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
