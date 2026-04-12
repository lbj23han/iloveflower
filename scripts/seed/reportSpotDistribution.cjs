/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');
const { loadLocalEnv } = require('./loadEnv.cjs');
const { CURATED_SEASONAL_CANDIDATES } = require('./curatedSeasonalCandidates.cjs');

const MONTH_TO_SEASON = {
  12: 'winter',
  1: 'winter',
  2: 'winter',
  3: 'spring',
  4: 'spring',
  5: 'spring',
  6: 'summer',
  7: 'summer',
  8: 'summer',
  9: 'autumn',
  10: 'autumn',
  11: 'autumn',
};

const FLOWER_TYPES = [
  'cherry',
  'plum',
  'forsythia',
  'azalea',
  'magnolia',
  'wisteria',
  'tulip',
  'rape',
  'peony',
  'peachblossom',
  'rose',
  'sunflower',
  'lotus',
  'hydrangea',
  'morningglory',
  'babysbreath',
  'zinnia',
  'neungsohwa',
  'pomegranateblossom',
  'lavender',
  'cosmos',
  'silvergrass',
  'pinkmuhly',
  'buckwheat',
  'mossrose',
  'aconite',
  'chuhaedang',
  'chrysanthemum',
  'camellia',
  'narcissus',
  'clivia',
  'cyclamen',
  'adonis',
  'christmasrose',
  'snowflower',
];

function expandMonths(start, end) {
  if (!start || !end) return [];
  if (start <= end) {
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  return [
    ...Array.from({ length: 13 - start }, (_, index) => start + index),
    ...Array.from({ length: end }, (_, index) => index + 1),
  ];
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\s()\-_/]/g, '');
}

function bump(target, key, amount = 1) {
  target[key] = (target[key] || 0) + amount;
}

async function fetchAllRows(supabase, table, columns) {
  const pageSize = 1000;
  const rows = [];

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, to);

    if (error) throw error;
    if (!data || data.length === 0) break;

    rows.push(...data);
    if (data.length < pageSize) break;
  }

  return rows;
}

async function main() {
  loadLocalEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Required env keys are missing. Check .env.local');
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [spots, festivals] = await Promise.all([
    fetchAllRows(
      supabase,
      'flower_spots',
      'id, name, flower_types, peak_month_start, peak_month_end, category, source',
    ),
    fetchAllRows(
      supabase,
      'festivals',
      'spot_id, name, start_date, end_date',
    ),
  ]);

  const byFlowerType = Object.fromEntries(FLOWER_TYPES.map((type) => [type, 0]));
  const bySeason = { spring: 0, summer: 0, autumn: 0, winter: 0 };
  const byMonth = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, 0]));
  const byCategory = {};
  const bySource = {};
  const festivalBySeason = { spring: 0, summer: 0, autumn: 0, winter: 0 };
  const festivalSpotIds = new Set((festivals ?? []).map((row) => row.spot_id));

  for (const spot of spots ?? []) {
    const flowerTypes = spot.flower_types?.length ? spot.flower_types : ['etc'];
    for (const type of flowerTypes) bump(byFlowerType, type);

    bump(byCategory, spot.category || 'etc');
    bump(bySource, spot.source || 'unknown');

    const months = expandMonths(spot.peak_month_start, spot.peak_month_end);
    const seasons = new Set(months.map((month) => MONTH_TO_SEASON[month]).filter(Boolean));
    for (const month of months) bump(byMonth, month);
    for (const season of seasons) bump(bySeason, season);
  }

  for (const festival of festivals ?? []) {
    const startMonth = festival.start_date ? new Date(festival.start_date).getUTCMonth() + 1 : null;
    if (startMonth && MONTH_TO_SEASON[startMonth]) {
      bump(festivalBySeason, MONTH_TO_SEASON[startMonth]);
    }
  }

  const nameSet = new Set((spots ?? []).map((spot) => normalizeText(spot.name)));
  const candidateCoverage = { spring: 0, summer: 0, autumn: 0, winter: 0 };
  const missingCandidates = { spring: [], summer: [], autumn: [], winter: [] };

  for (const candidate of CURATED_SEASONAL_CANDIDATES) {
    const normalized = normalizeText(candidate.query);
    const exists = [...nameSet].some((name) => name.includes(normalized) || normalized.includes(name));
    if (exists) {
      bump(candidateCoverage, candidate.season);
    } else {
      missingCandidates[candidate.season].push(candidate.query);
    }
  }

  const flowerTypesUnderTarget = Object.entries(byFlowerType)
    .filter(([type, count]) => type !== 'snowflower' && count < 8)
    .sort((a, b) => a[1] - b[1]);

  const seasonsUnderTarget = Object.entries(bySeason)
    .filter(([, count]) => count < 40)
    .sort((a, b) => a[1] - b[1]);

  const result = {
    totals: {
      spots: spots?.length ?? 0,
      festivalRows: festivals?.length ?? 0,
      festivalLinkedSpots: festivalSpotIds.size,
    },
    byFlowerType,
    bySeason,
    byMonth,
    byCategory,
    bySource,
    festivalBySeason,
    candidateCoverage,
    gaps: {
      flowerTypesUnderTarget,
      seasonsUnderTarget,
      missingCandidates,
    },
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error('[report:distribution] failed:', error);
  process.exit(1);
});
