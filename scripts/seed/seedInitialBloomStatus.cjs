/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');
const { loadLocalEnv } = require('./loadEnv.cjs');

function getMonthPeriod(currentDay) {
  if (currentDay <= 10) return 'early';
  if (currentDay <= 20) return 'mid';
  return 'late';
}

function inferBloomStatus({ currentMonth, currentDay, startMonth, endMonth }) {
  if (!startMonth || !endMonth) {
    return { status: 'blooming', bloom_pct: 60 };
  }

  const period = getMonthPeriod(currentDay);

  if (currentMonth < startMonth - 1) {
    return { status: 'before', bloom_pct: 5 };
  }

  if (currentMonth === startMonth - 1) {
    if (period === 'late') {
      return { status: 'budding', bloom_pct: 20 };
    }

    return { status: 'before', bloom_pct: 8 };
  }

  if (currentMonth < startMonth) {
    return { status: 'budding', bloom_pct: 40 };
  }

  if (currentMonth === startMonth && currentMonth === endMonth) {
    if (period === 'early') {
      return { status: 'blooming', bloom_pct: 70 };
    }

    if (period === 'mid') {
      return { status: 'peak', bloom_pct: 92 };
    }

    return { status: 'falling', bloom_pct: 45 };
  }

  if (currentMonth === startMonth) {
    if (period === 'early') {
      return { status: 'budding', bloom_pct: 35 };
    }

    if (period === 'mid') {
      return { status: 'blooming', bloom_pct: 70 };
    }

    return { status: 'peak', bloom_pct: 90 };
  }

  if (currentMonth > startMonth && currentMonth < endMonth) {
    if (period === 'early') {
      return { status: 'blooming', bloom_pct: 82 };
    }

    if (period === 'mid') {
      return { status: 'peak', bloom_pct: 95 };
    }

    return { status: 'peak', bloom_pct: 88 };
  }

  if (currentMonth === endMonth) {
    if (period === 'early') {
      return { status: 'peak', bloom_pct: 85 };
    }

    if (period === 'mid') {
      return { status: 'falling', bloom_pct: 50 };
    }

    return { status: 'done', bloom_pct: 10 };
  }

  if (currentMonth === endMonth + 1) {
    if (period === 'early') {
      return { status: 'falling', bloom_pct: 20 };
    }

    return { status: 'done', bloom_pct: 0 };
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

async function fetchAllSpots(supabase) {
  const pageSize = 1000;
  const rows = [];

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('flower_spots')
      .select('id, peak_month_start, peak_month_end')
      .not('lat', 'is', null)
      .not('lng', 'is', null)
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
  const currentDay = now.getDate();

  const spots = await fetchAllSpots(supabase);

  const { error: cleanupError } = await supabase
    .from('bloom_status')
    .delete()
    .eq('year', currentYear)
    .eq('updated_by', 'system_seed');

  if (cleanupError) throw cleanupError;

  const rows = (spots ?? []).map((spot) => {
    const inferred = inferBloomStatus({
      currentMonth,
      currentDay,
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
        currentDay,
        monthPeriod: getMonthPeriod(currentDay),
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
