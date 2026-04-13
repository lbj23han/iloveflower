/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * 가을 DB 보강:
 * 1) Kakao API로 남은 핑크뮬리/구절초 후보 검색 → 삽입
 * 2) 단풍 curated 명소 추가 (오대산·지리산·대둔산·한라산·북한산·속리산·가야산)
 * 3) 기존 foliage 명소에 cover_image_url 보강 (Wikimedia)
 */
const { createClient } = require('@supabase/supabase-js');
const { loadLocalEnv } = require('./loadEnv.cjs');
const { mapKakaoPlace } = require('./kakaoLocal.cjs');

const KAKAO_URL = 'https://dapi.kakao.com/v2/local/search/keyword.json';
const DELAY = 420;

// ── 1) Kakao 검색 대상 ────────────────────────────────────────────────────────
const KAKAO_TARGETS = [
  { query: '드라마촬영장 핑크뮬리', keyword: '핑크뮬리 명소', flower_types: ['pinkmuhly'], peak_start: 9, peak_end: 10 },
  { query: '정읍 구절초테마공원',   keyword: '구절초 명소',  flower_types: ['chrysanthemum'], peak_start: 10, peak_end: 10 },
  { query: '하동 북천 코스모스',    keyword: '코스모스 축제', flower_types: ['cosmos'],       peak_start: 9, peak_end: 10 },
];

// ── 2) 추가 foliage curated 명소 ─────────────────────────────────────────────
const FOLIAGE_CURATED = [
  {
    external_place_id: 'curated:odaesan-foliage',
    name: '오대산국립공원',
    address: '강원 평창군 진부면 오대산로 1',
    lat: 37.7958, lng: 128.5464,
    flower_types: ['foliage'], category: 'mountain',
    peak_month_start: 10, peak_month_end: 10,
    has_parking: true, photo_spot: true,
  },
  {
    external_place_id: 'curated:jirisan-foliage',
    name: '지리산국립공원',
    address: '경남 하동군 화개면 화개리',
    lat: 35.3369, lng: 127.7301,
    flower_types: ['foliage'], category: 'mountain',
    peak_month_start: 10, peak_month_end: 11,
    has_parking: true, photo_spot: true,
  },
  {
    external_place_id: 'curated:daedunsan-foliage',
    name: '대둔산도립공원',
    address: '충남 논산시 벌곡면 수락리 산4',
    lat: 36.0802, lng: 127.3489,
    flower_types: ['foliage'], category: 'mountain',
    peak_month_start: 10, peak_month_end: 11,
    has_parking: true, photo_spot: true,
  },
  {
    external_place_id: 'curated:hallasan-foliage',
    name: '한라산국립공원',
    address: '제주 서귀포시 토평동 산15-1',
    lat: 33.3617, lng: 126.5292,
    flower_types: ['foliage'], category: 'mountain',
    peak_month_start: 10, peak_month_end: 11,
    has_parking: true, photo_spot: true,
  },
  {
    external_place_id: 'curated:bukhansan-foliage',
    name: '북한산국립공원',
    address: '서울 강북구 우이동',
    lat: 37.6607, lng: 126.9805,
    flower_types: ['foliage'], category: 'mountain',
    peak_month_start: 10, peak_month_end: 11,
    has_parking: true, photo_spot: true,
  },
  {
    external_place_id: 'curated:songnisan-foliage',
    name: '속리산국립공원',
    address: '충북 보은군 속리산면 사내리',
    lat: 36.5411, lng: 127.8672,
    flower_types: ['foliage'], category: 'mountain',
    peak_month_start: 10, peak_month_end: 11,
    has_parking: true, photo_spot: true,
  },
  {
    external_place_id: 'curated:gayasan-foliage',
    name: '가야산국립공원',
    address: '경남 합천군 가야면 치인리',
    lat: 35.8003, lng: 128.1081,
    flower_types: ['foliage'], category: 'mountain',
    peak_month_start: 10, peak_month_end: 11,
    has_parking: true, photo_spot: true,
  },
  {
    external_place_id: 'curated:woraksan-foliage',
    name: '월악산국립공원',
    address: '충북 제천시 한수면 송계리',
    lat: 36.8756, lng: 128.0899,
    flower_types: ['foliage'], category: 'mountain',
    peak_month_start: 10, peak_month_end: 11,
    has_parking: true, photo_spot: true,
  },
  {
    external_place_id: 'curated:sobaeksan-foliage',
    name: '소백산국립공원',
    address: '경북 영주시 순흥면 덕현리',
    lat: 36.9522, lng: 128.4856,
    flower_types: ['foliage'], category: 'mountain',
    peak_month_start: 10, peak_month_end: 11,
    has_parking: true, photo_spot: true,
  },
  {
    external_place_id: 'curated:seongnam-central-foliage',
    name: '중앙공원 단풍길',
    address: '경기 성남시 분당구 야탑동 196',
    lat: 37.4093, lng: 127.1259,
    flower_types: ['foliage'], category: 'park',
    peak_month_start: 10, peak_month_end: 11,
    has_parking: true, photo_spot: true,
  },
];

// ── 3) foliage 명소 cover_image_url 보강 ──────────────────────────────────────
const FOLIAGE_COVER_IMAGES = {
  'curated:naejangsan-foliage':       'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Naejangsan_autumn_2.jpg/1280px-Naejangsan_autumn_2.jpg',
  'curated:seoraksan-foliage':        'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Seoraksan_autumn.jpg/1280px-Seoraksan_autumn.jpg',
  'curated:namiseom-foliage':         'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Nami_Island_autumn.jpg/1280px-Nami_Island_autumn.jpg',
  'curated:gwangneung-arboretum-foliage': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Korea-Gwangneung_Arboretum-01.jpg/1280px-Korea-Gwangneung_Arboretum-01.jpg',
  'curated:juwangsan-foliage':        'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Juwangsan_National_Park.jpg/1280px-Juwangsan_National_Park.jpg',
  'curated:odaesan-foliage':          'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Odaesan.jpg/1280px-Odaesan.jpg',
  'curated:jirisan-foliage':          'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Jirisan_autumn.jpg/1280px-Jirisan_autumn.jpg',
  'curated:hallasan-foliage':         'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Hallasan_autumn.jpg/1280px-Hallasan_autumn.jpg',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function kakaoSearch(apiKey, query) {
  const params = new URLSearchParams({ query, size: '5' });
  const res = await fetch(`${KAKAO_URL}?${params}`, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
  });
  if (!res.ok) throw new Error(`Kakao ${res.status}`);
  const json = await res.json();
  await sleep(DELAY);
  return json.documents ?? [];
}

async function syncRows(supabase, rows, label) {
  if (!rows.length) return { inserted: 0, updated: 0 };
  const ids = rows.map(r => r.external_place_id).filter(Boolean);
  const { data: existing } = await supabase
    .from('flower_spots').select('id,external_place_id').in('external_place_id', ids);
  const existMap = new Map((existing ?? []).map(r => [r.external_place_id, r.id]));

  const toInsert = rows.filter(r => !existMap.has(r.external_place_id));
  const toUpdate = rows.filter(r =>  existMap.has(r.external_place_id));

  if (toInsert.length) {
    const { error } = await supabase.from('flower_spots').insert(toInsert);
    if (error) console.error(`[${label}] insert error:`, error.message);
  }
  for (const row of toUpdate) {
    const { error } = await supabase.from('flower_spots')
      .update({ ...row, updated_at: new Date().toISOString() })
      .eq('id', existMap.get(row.external_place_id));
    if (error) console.error(`[${label}] update error ${row.name}:`, error.message);
  }
  return { inserted: toInsert.length, updated: toUpdate.length };
}

async function main() {
  loadLocalEnv();
  const apiKey      = process.env.KAKAO_REST_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!apiKey || !supabaseUrl || !serviceKey) throw new Error('env 누락');

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── Step 1: Kakao 검색 ────────────────────────────────────────────────────
  console.log('\n[1/3] Kakao API 검색...');
  const kakaoRows = [];
  for (const target of KAKAO_TARGETS) {
    const docs = await kakaoSearch(apiKey, target.query);
    if (!docs.length) { console.log(`  ✗ 결과없음: ${target.query}`); continue; }
    const doc = docs[0];
    const mapped = mapKakaoPlace(doc, target.keyword);
    if (!mapped) { console.log(`  ✗ 필터됨: ${target.query}`); continue; }
    kakaoRows.push({
      ...mapped,
      flower_types: target.flower_types,
      peak_month_start: target.peak_start,
      peak_month_end: target.peak_end,
      source: 'kakao_seed',
    });
    console.log(`  ✓ ${doc.place_name} (${doc.road_address_name || doc.address_name})`);
  }
  const r1 = await syncRows(supabase, kakaoRows, 'kakao');
  console.log(`  → insert ${r1.inserted}, update ${r1.updated}`);

  // ── Step 2: foliage curated 삽입 ─────────────────────────────────────────
  console.log('\n[2/3] 단풍 curated 명소 삽입...');
  const curatedRows = FOLIAGE_CURATED.map(s => ({
    ...s,
    has_night_light: false,
    pet_friendly: false,
    entry_fee: 0,
    phone: null,
    website_url: null,
    source: 'curated_seed',
  }));
  const r2 = await syncRows(supabase, curatedRows, 'foliage_curated');
  console.log(`  → insert ${r2.inserted}, update ${r2.updated}`);

  // ── Step 3: cover_image_url 보강 ──────────────────────────────────────────
  console.log('\n[3/3] cover_image_url 보강...');
  let imgUpdated = 0;
  for (const [extId, url] of Object.entries(FOLIAGE_COVER_IMAGES)) {
    const { data: spot } = await supabase
      .from('flower_spots').select('id,cover_image_url').eq('external_place_id', extId).single();
    if (!spot) { console.log(`  ✗ 없음: ${extId}`); continue; }
    if (spot.cover_image_url) { console.log(`  - 스킵 (이미 있음): ${extId}`); continue; }
    const { error } = await supabase.from('flower_spots')
      .update({ cover_image_url: url, updated_at: new Date().toISOString() }).eq('id', spot.id);
    if (error) console.error(`  ✗ ${extId}:`, error.message);
    else { console.log(`  ✓ ${extId}`); imgUpdated++; }
  }
  console.log(`  → ${imgUpdated}개 이미지 업데이트`);

  // ── 최종 현황 ─────────────────────────────────────────────────────────────
  const { count: total } = await supabase.from('flower_spots').select('*', { count: 'exact', head: true });
  const { count: foliage } = await supabase.from('flower_spots')
    .select('*', { count: 'exact', head: true }).contains('flower_types', ['foliage']);
  const { count: autumn } = await supabase.from('flower_spots')
    .select('*', { count: 'exact', head: true }).gte('peak_month_end', 9).lte('peak_month_start', 11);

  console.log('\n── 현황 ──────────────────────────────────────');
  console.log(JSON.stringify({ total, foliage, autumn, kakao: r1, curated: r2, cover_images: imgUpdated }, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
