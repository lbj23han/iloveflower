/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');
const { loadLocalEnv } = require('./loadEnv.cjs');

function nowIso() {
  return new Date().toISOString();
}

function createServiceClient() {
  loadLocalEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Required env keys are missing. Check .env.local');
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalizeCategory(category) {
  const value = String(category || 'etc').trim().toLowerCase();

  if (['park', 'mountain', 'river', 'botanical', 'street', 'temple', 'farm', 'cafe', 'etc'].includes(value)) {
    return value;
  }

  if (value === 'garden') return 'botanical';
  if (value === 'field') return 'farm';
  if (value === 'trail') return 'mountain';
  if (value === 'lake') return 'river';

  return 'etc';
}

function normalizeFlowerTypes(types) {
  const values = Array.isArray(types) ? types : [types];
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()))];
}

function buildExternalPlaceId(prefix, name) {
  const slug = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[\s/()]+/g, '-')
    .replace(/[^a-z0-9가-힣-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `${prefix}:${slug}`;
}

async function fetchAllByRange(queryFactory, pageSize = 500) {
  const rows = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await queryFactory(from, to);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

async function findSpotByName(supabase, name) {
  const { data, error } = await supabase
    .from('flower_spots')
    .select('id, name, address, flower_types, peak_month_start, peak_month_end')
    .eq('name', name)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function insertSpotIfMissing(supabase, spot, source) {
  const existing = await findSpotByName(supabase, spot.name);

  if (existing) {
    console.log(`[skip] ${spot.name} — already exists`);
    return { status: 'skip', existing };
  }

  const row = {
    external_place_id: spot.external_place_id || buildExternalPlaceId(source, spot.name),
    name: spot.name,
    address: spot.address || null,
    lat: spot.lat,
    lng: spot.lng,
    flower_types: normalizeFlowerTypes(spot.flower_types),
    category: normalizeCategory(spot.category),
    peak_month_start: spot.peak_month_start ?? null,
    peak_month_end: spot.peak_month_end ?? null,
    has_night_light: Boolean(spot.has_night_light),
    has_parking: Boolean(spot.has_parking),
    pet_friendly: Boolean(spot.pet_friendly),
    photo_spot: Boolean(spot.photo_spot),
    entry_fee: Number.isFinite(spot.entry_fee) ? spot.entry_fee : 0,
    phone: spot.phone || null,
    website_url: spot.website_url || null,
    source,
    updated_at: nowIso(),
  };

  const { error } = await supabase.from('flower_spots').insert(row);
  if (error) throw error;

  console.log(`[insert] ${spot.name} — ok`);
  return { status: 'insert' };
}

module.exports = {
  buildExternalPlaceId,
  createServiceClient,
  fetchAllByRange,
  findSpotByName,
  insertSpotIfMissing,
  normalizeCategory,
  normalizeFlowerTypes,
  nowIso,
};
