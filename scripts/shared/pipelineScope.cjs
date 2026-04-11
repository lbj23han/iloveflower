function parseList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    city: null,
    gymIds: [],
    categories: [],
    limit: null,
    dryRun: false,
    parserVersion: null,
    aiBudgetUsd: null,
    aiMaxGyms: null,
  };

  for (const arg of argv) {
    if (arg === '--dry-run') {
      args.dryRun = true;
      continue;
    }
    if (arg.startsWith('--city=')) {
      args.city = arg.split('=').slice(1).join('=').trim() || null;
      continue;
    }
    if (arg.startsWith('--gymIds=')) {
      args.gymIds = parseList(arg.split('=').slice(1).join('='));
      continue;
    }
    if (arg.startsWith('--categories=')) {
      args.categories = parseList(arg.split('=').slice(1).join('='));
      continue;
    }
    if (arg.startsWith('--limit=')) {
      const parsed = Number(arg.split('=').slice(1).join('='));
      args.limit = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      continue;
    }
    if (arg.startsWith('--parserVersion=')) {
      args.parserVersion = arg.split('=').slice(1).join('=').trim() || null;
      continue;
    }
    if (arg.startsWith('--aiBudgetUsd=')) {
      const parsed = Number(arg.split('=').slice(1).join('='));
      args.aiBudgetUsd = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      continue;
    }
    if (arg.startsWith('--aiMaxGyms=')) {
      const parsed = Number(arg.split('=').slice(1).join('='));
      args.aiMaxGyms = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
    }
  }

  return args;
}

async function loadTargetGyms(supabase, scope = {}) {
  const cityMatchers = {
    서울: /^(서울|서울특별시)(\s|$)/,
    부산: /^(부산|부산광역시)(\s|$)/,
    인천: /^(인천|인천광역시)(\s|$)/,
    대구: /^(대구|대구광역시)(\s|$)/,
    수원: /^(경기|경기도)\s*수원/,
    성남: /^(경기|경기도)\s*성남/,
    고양: /^(경기|경기도)\s*고양/,
  };

  const matchesCity = (gym) => {
    if (!scope.city) return true;
    const address = String(gym?.address || '');
    const matcher = cityMatchers[scope.city];
    if (matcher) return matcher.test(address);
    return address.startsWith(scope.city);
  };

  const baseQuery = () => {
    let query = supabase
      .from('gyms')
      .select('id, external_place_id, name, address, lat, lng, category, created_at, updated_at')
      .order('updated_at', { ascending: false, nullsFirst: false });

    if (scope.gymIds?.length) {
      query = query.in('id', scope.gymIds);
    }

    if (scope.categories?.length) {
      query = query.in('category', scope.categories);
    }

    return query;
  };

  const pageSize = 1000;
  let from = 0;
  const rows = [];

  while (true) {
    const { data, error } = await baseQuery().range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const rawBatch = data ?? [];
    const batch = rawBatch.filter(matchesCity);
    rows.push(...batch);
    if (scope.limit && rows.length >= scope.limit) break;
    if (rawBatch.length < pageSize) break;
    from += pageSize;
  }

  return scope.limit ? rows.slice(0, scope.limit) : rows;
}

function buildGymScopeSet(gyms) {
  return new Set((gyms || []).map((gym) => gym.id));
}

module.exports = {
  parseArgs,
  loadTargetGyms,
  buildGymScopeSet,
};
