/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');
const { loadLocalEnv } = require('./loadEnv.cjs');
const { CURATED_SEASONAL_CANDIDATES } = require('./curatedSeasonalCandidates.cjs');
const { requestKeywordSearch, mapKakaoPlace } = require('./kakaoLocal.cjs');

const SEARCH_SIZE = 8;
const QUERY_COOLDOWN_MS = 900;
const SEASON_GAP_MS = 4000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\s()\-_/]/g, '');
}

function parseArgs(argv) {
  const args = { seasons: null, limit: null, offset: 0 };

  for (const arg of argv) {
    if (arg.startsWith('--seasons=')) {
      args.seasons = arg
        .replace('--seasons=', '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    }

    if (arg.startsWith('--limit=')) {
      const parsed = Number(arg.replace('--limit=', ''));
      if (Number.isFinite(parsed) && parsed > 0) args.limit = parsed;
    }

    if (arg.startsWith('--offset=')) {
      const parsed = Number(arg.replace('--offset=', ''));
      if (Number.isFinite(parsed) && parsed >= 0) args.offset = parsed;
    }
  }

  return args;
}

function pickCandidates(allCandidates, seasons, limit, offset = 0) {
  let rows = allCandidates;
  if (seasons && seasons.length > 0) {
    const wanted = new Set(seasons);
    rows = rows.filter((row) => wanted.has(row.season));
  }

  if (offset) rows = rows.slice(offset);
  if (limit) rows = rows.slice(0, limit);
  return rows;
}

function scoreDocument(doc, candidate) {
  const query = normalizeText(candidate.query);
  const placeName = normalizeText(doc.place_name);
  const roadAddress = normalizeText(doc.road_address_name);
  const address = normalizeText(doc.address_name);
  const category = normalizeText(doc.category_name);

  let score = 0;

  if (placeName === query) score += 120;
  if (placeName.includes(query) || query.includes(placeName)) score += 80;
  if (roadAddress.includes(query) || address.includes(query)) score += 45;
  if (category.includes('관광') || category.includes('문화') || category.includes('명소')) score += 20;
  if (category.includes('공원') || category.includes('수목원') || category.includes('테마파크')) score += 20;
  if (candidate.keyword && normalizeText(candidate.keyword).includes(placeName)) score += 15;
  if (doc.place_url) score += 5;
  if (doc.phone) score += 5;

  return score;
}

function pickBestDocument(documents, candidate) {
  if (!documents || documents.length === 0) return null;

  const scored = documents
    .map((doc) => ({ doc, score: scoreDocument(doc, candidate) }))
    .sort((a, b) => b.score - a.score);

  return scored[0]?.doc ?? null;
}

function normalizeKey(name, address) {
  return `${normalizeText(name)}::${normalizeText(address)}`;
}

async function searchCandidate(apiKey, candidate) {
  const queries = [
    candidate.query,
    `${candidate.query} ${candidate.keyword}`,
    candidate.keyword,
  ];

  for (const query of queries) {
    const payload = await requestKeywordSearch({
      apiKey,
      query,
      page: 1,
      size: SEARCH_SIZE,
    });

    const best = pickBestDocument(payload.documents, candidate);
    if (best) return best;
    await sleep(QUERY_COOLDOWN_MS);
  }

  return null;
}

async function syncRows(supabase, rows) {
  const externalIds = rows.map((row) => row.external_place_id);
  const names = [...new Set(rows.map((row) => row.name))];

  const { data: existingByExternal, error: externalError } = await supabase
    .from('flower_spots')
    .select('id, external_place_id, name, address')
    .in('external_place_id', externalIds);

  if (externalError) throw externalError;

  const { data: existingByName, error: nameError } = await supabase
    .from('flower_spots')
    .select('id, external_place_id, name, address')
    .in('name', names);

  if (nameError) throw nameError;

  const externalMap = new Map(
    (existingByExternal ?? []).map((row) => [row.external_place_id, row.id]),
  );
  const nameMap = new Map(
    (existingByName ?? []).map((row) => [normalizeKey(row.name, row.address), row.id]),
  );

  const insertRows = [];
  const updateRows = [];

  for (const row of rows) {
    const existingId =
      externalMap.get(row.external_place_id) ??
      nameMap.get(normalizeKey(row.name, row.address));

    if (existingId) {
      updateRows.push({ id: existingId, row });
    } else {
      insertRows.push(row);
    }
  }

  if (insertRows.length > 0) {
    const { error } = await supabase.from('flower_spots').insert(insertRows);
    if (error) throw error;
  }

  for (const { id, row } of updateRows) {
    const { error } = await supabase
      .from('flower_spots')
      .update({ ...row, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  return {
    inserted: insertRows.length,
    updated: updateRows.length,
  };
}

async function main() {
  loadLocalEnv();

  const kakaoApiKey = process.env.KAKAO_REST_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!kakaoApiKey || !supabaseUrl || !serviceKey) {
    throw new Error('Required env keys are missing. Check .env.local');
  }

  const { seasons, limit, offset } = parseArgs(process.argv.slice(2));
  const candidates = pickCandidates(CURATED_SEASONAL_CANDIDATES, seasons, limit, offset);

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rows = [];
  const misses = [];
  const foundBySeason = {};

  for (const candidate of candidates) {
    try {
      const place = await searchCandidate(kakaoApiKey, candidate);
      if (!place) {
        misses.push(candidate);
        console.warn(`[seed:curated-named] miss: ${candidate.season} / ${candidate.query}`);
        continue;
      }

      const mapped = mapKakaoPlace(place, candidate.keyword, { skipExclusion: true });
      if (!mapped) {
        misses.push(candidate);
        console.warn(`[seed:curated-named] filtered: ${candidate.season} / ${candidate.query}`);
        continue;
      }

      rows.push({
        external_place_id: mapped.external_place_id,
        name: mapped.name,
        address: mapped.address,
        lat: mapped.lat,
        lng: mapped.lng,
        flower_types: mapped.flower_types,
        category: mapped.category,
        peak_month_start: mapped.peak_month_start,
        peak_month_end: mapped.peak_month_end,
        has_night_light: Boolean(mapped.has_night_light),
        has_parking: Boolean(mapped.has_parking),
        pet_friendly: Boolean(mapped.pet_friendly),
        photo_spot: true,
        entry_fee: Number(mapped.entry_fee || 0),
        phone: mapped.phone,
        website_url: mapped.website_url,
        source: 'curated_named_seed',
      });

      foundBySeason[candidate.season] = (foundBySeason[candidate.season] || 0) + 1;
      console.log(`[seed:curated-named] ok: ${candidate.season} / ${candidate.query} -> ${mapped.name}`);
      await sleep(QUERY_COOLDOWN_MS);
    } catch (error) {
      misses.push(candidate);
      console.warn(`[seed:curated-named] error: ${candidate.season} / ${candidate.query}: ${error.message}`);
    }
  }

  const result = await syncRows(supabase, rows);

  console.log(
    JSON.stringify(
      {
        requested: candidates.length,
        offset,
        resolved: rows.length,
        inserted: result.inserted,
        updated: result.updated,
        foundBySeason,
        misses: misses.map((row) => `${row.season}:${row.query}`),
      },
      null,
      2,
    ),
  );

  await sleep(SEASON_GAP_MS);
}

main().catch((error) => {
  console.error('[seed:curated-named] failed:', error);
  process.exit(1);
});
