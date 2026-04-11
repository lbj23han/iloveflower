/* eslint-disable @typescript-eslint/no-require-imports */
const { getSupabase, normalizePriceRecord, nowIso, queryInChunks } = require('../badges/shared.cjs');
const { parseArgs, loadTargetGyms, buildGymScopeSet } = require('../shared/pipelineScope.cjs');

function hasScope(scope) {
  return Boolean(scope.city || (scope.gymIds && scope.gymIds.length) || scope.limit);
}

async function main() {
  const scope = parseArgs();
  const supabase = getSupabase();
  const targetGyms = await loadTargetGyms(supabase, scope);
  const targetGymIds = buildGymScopeSet(targetGyms);
  const isScoped = hasScope(scope);

  if (targetGyms.length === 0) {
    console.log('선택된 시설이 없습니다.');
    return;
  }

  let reportsQuery = supabase
    .from('reports')
    .select('id, gym_id, gym_name, day_pass_price, monthly_price, annual_price, comment, created_at')
    .neq('status', 'rejected');

  const [reportsResult, existingResult] = await Promise.all([
    reportsQuery,
    supabase.from('gym_prices').select('id, gym_id, price_source').eq('price_source', 'badge_pipeline'),
  ]);

  // external_reviews 페이지네이션으로 전체 로드
  const pageSize = 1000;
  let extFrom = 0;
  const allExternalReviews = [];
  while (true) {
    let extRows = [];
    if (isScoped) {
      extRows = await queryInChunks(
        (chunk) =>
          supabase
            .from('external_reviews')
            .select('id, gym_id, external_review_id, review_text, review_date, collected_at, created_at')
            .eq('match_status', 'matched')
            .in('gym_id', chunk)
            .range(extFrom, extFrom + pageSize - 1),
        [...targetGymIds],
      );
    } else {
      const { data: extData, error: extError } = await supabase
        .from('external_reviews')
        .select('id, gym_id, external_review_id, review_text, review_date, collected_at, created_at')
        .eq('match_status', 'matched')
        .range(extFrom, extFrom + pageSize - 1);
      if (extError) throw new Error(extError.message);
      extRows = extData || [];
    }
    allExternalReviews.push(...extRows);
    if (extRows.length < pageSize) break;
    extFrom += pageSize;
  }
  const externalResult = { data: allExternalReviews, error: null };

  let reportsData = reportsResult.data || [];
  let reportsError = reportsResult.error;

  if (reportsError && /monthly_price|annual_price/.test(reportsError.message || '')) {
    const fallbackReportsResult = await supabase
      .from('reports')
      .select('id, gym_id, gym_name, day_pass_price, comment, created_at')
      .neq('status', 'rejected');

    reportsData = (fallbackReportsResult.data || []).map((row) => ({
      ...row,
      monthly_price: null,
      annual_price: null,
    }));
    reportsError = fallbackReportsResult.error;
  }

  if (reportsError || existingResult.error) {
    throw new Error(
      reportsError?.message ||
        existingResult.error?.message ||
        'Failed to load pricing inputs',
    );
  }

  const gymByName = new Map(targetGyms.map((gym) => [gym.name, gym.id]));
  const existingByGymId = new Map((existingResult.data || []).map((row) => [row.gym_id, row]));
  const bestByGymId = new Map();

  for (const report of reportsData || []) {
    const gymId = report.gym_id || gymByName.get(report.gym_name);
    if (!gymId) continue;
    if (isScoped && !targetGymIds.has(gymId)) continue;

    const normalized = normalizePriceRecord({
      day_pass_price: report.day_pass_price,
      monthly_price: report.monthly_price,
      annual_price: report.annual_price,
      raw_text: report.comment,
    });

    if (
      normalized.day_pass_price == null &&
      normalized.monthly_price == null &&
      normalized.annual_price == null &&
      normalized.normalized_monthly_price == null
    ) {
      continue;
    }

    const current = bestByGymId.get(gymId);
    const observedAt = report.created_at;
    if (!current || new Date(observedAt).getTime() > new Date(current.last_verified_at).getTime()) {
      bestByGymId.set(gymId, {
        gym_id: gymId,
        ...normalized,
        price_source: 'badge_pipeline',
        price_confidence: 72,
        last_verified_at: observedAt,
        updated_at: nowIso(),
      });
    }
  }

  for (const review of externalResult.data || []) {
    if (!review.gym_id) continue;
    if (isScoped && !targetGymIds.has(review.gym_id)) continue;

    const normalized = normalizePriceRecord({
      raw_text: review.review_text,
    });

    if (
      normalized.day_pass_price == null &&
      normalized.monthly_price == null &&
      normalized.annual_price == null &&
      normalized.normalized_monthly_price == null
    ) {
      continue;
    }

    const current = bestByGymId.get(review.gym_id);
    const observedAt = review.review_date || review.collected_at || review.created_at;
    if (!current || new Date(observedAt).getTime() > new Date(current.last_verified_at).getTime()) {
      bestByGymId.set(review.gym_id, {
        gym_id: review.gym_id,
        ...normalized,
        price_source: 'badge_pipeline',
        price_confidence: 68,
        last_verified_at: observedAt,
        updated_at: nowIso(),
      });
    }
  }

  if (scope.dryRun) {
    console.log(
      JSON.stringify(
        {
          targetGyms: targetGyms.length,
          normalizedPriceRows: bestByGymId.size,
          dryRun: true,
        },
        null,
        2,
      ),
    );
    return;
  }

  for (const row of bestByGymId.values()) {
    const existing = existingByGymId.get(row.gym_id);
    if (existing) {
      const { error } = await supabase
        .from('gym_prices')
        .update(row)
        .eq('id', existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from('gym_prices').insert(row);
      if (error) throw new Error(error.message);
    }
  }

  const staleRows = (existingResult.data || []).filter((row) => !bestByGymId.has(row.gym_id));
  for (const stale of staleRows) {
    const { error } = await supabase.from('gym_prices').delete().eq('id', stale.id);
    if (error) throw new Error(error.message);
  }

  console.log(`Upserted normalized prices for ${bestByGymId.size} gyms.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
