/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');
const { loadLocalEnv } = require('./loadEnv.cjs');

function inferBloomStatus({ currentMonth, startMonth, endMonth }) {
  if (!startMonth || !endMonth) {
    return { status: 'blooming', bloom_pct: 60 };
  }

  if (currentMonth < startMonth - 1) {
    return { status: 'before', bloom_pct: 5 };
  }

  if (currentMonth === startMonth - 1) {
    return { status: 'budding', bloom_pct: 30 };
  }

  if (currentMonth < startMonth) {
    return { status: 'budding', bloom_pct: 40 };
  }

  if (currentMonth === startMonth && currentMonth === endMonth) {
    return { status: 'peak', bloom_pct: 95 };
  }

  if (currentMonth === startMonth) {
    return { status: 'blooming', bloom_pct: 75 };
  }

  if (currentMonth > startMonth && currentMonth < endMonth) {
    return { status: 'peak', bloom_pct: 95 };
  }

  if (currentMonth === endMonth) {
    return { status: 'peak', bloom_pct: 90 };
  }

  if (currentMonth === endMonth + 1) {
    return { status: 'falling', bloom_pct: 35 };
  }

  return { status: 'done', bloom_pct: 0 };
}

function chunk(items, size) {
  const result = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

async function main() {
  loadLocalEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Required env keys are missing. Check .env.local');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const { data: spots, error: spotsError } = await supabase
    .from('flower_spots')
    .select('id, peak_month_start, peak_month_end')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .limit(20000);

  if (spotsError) throw spotsError;

  const { error: cleanupError } = await supabase
    .from('bloom_status')
    .delete()
    .eq('year', currentYear)
    .eq('updated_by', 'system_seed');

  if (cleanupError) throw cleanupError;

  const rows = (spots ?? []).map((spot) => {
    const inferred = inferBloomStatus({
      currentMonth,
      startMonth: spot.peak_month_start,
      endMonth: spot.peak_month_end,
    });

    return {
      spot_id: spot.id,
      year: currentYear,
      status: inferred.status,
      bloom_pct: inferred.bloom_pct,
      updated_by: 'system_seed',
      observed_at: now.toISOString(),
    };
  });

  let inserted = 0;
  for (const group of chunk(rows, 500)) {
    const { error } = await supabase.from('bloom_status').insert(group);
    if (error) throw error;
    inserted += group.length;
  }

  console.log(
    JSON.stringify(
      {
        currentYear,
        currentMonth,
        spotRows: spots?.length ?? 0,
        bloomRowsInserted: inserted,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error('[seed:bloom-status] failed:', error);
  process.exit(1);
});
