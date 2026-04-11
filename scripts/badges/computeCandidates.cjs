/* eslint-disable @typescript-eslint/no-require-imports */
const {
  getSupabase,
  aggregateCandidates,
  computeValueCandidates,
  queryInChunks,
} = require('./shared.cjs');
const { parseArgs, loadTargetGyms, buildGymScopeSet } = require('../shared/pipelineScope.cjs');

function hasScope(scope) {
  return Boolean(scope.city || (scope.gymIds && scope.gymIds.length) || scope.limit);
}

async function main() {
  const scope = parseArgs();
  const supabase = getSupabase();
  const targetGyms = await loadTargetGyms(supabase, scope);
  const scopedGymIds = buildGymScopeSet(targetGyms);
  const isScoped = hasScope(scope);

  if (targetGyms.length === 0) {
    console.log('선택된 시설이 없습니다.');
    return;
  }

  let evidenceData = [];
  let pricesData = [];
  if (isScoped) {
    const ids = [...scopedGymIds];
    [evidenceData, pricesData] = await Promise.all([
      queryInChunks(
        (chunk) =>
          supabase
            .from('gym_text_evidence')
            .select('gym_id, label_key, source_type, snippet, normalized_text, pattern_key, pattern_strength, source_weight, specificity, freshness, uniqueness, evidence_score, observed_at')
            .eq('status', 'active')
            .in('gym_id', chunk),
        ids,
      ),
      queryInChunks(
        (chunk) =>
          supabase
            .from('gym_prices')
            .select('gym_id, normalized_monthly_price, last_verified_at, updated_at, created_at')
            .not('normalized_monthly_price', 'is', null)
            .in('gym_id', chunk),
        ids,
      ),
    ]);
  } else {
    const [evidenceResult, pricesResult] = await Promise.all([
      supabase
        .from('gym_text_evidence')
        .select('gym_id, label_key, source_type, snippet, normalized_text, pattern_key, pattern_strength, source_weight, specificity, freshness, uniqueness, evidence_score, observed_at')
        .eq('status', 'active'),
      supabase
        .from('gym_prices')
        .select('gym_id, normalized_monthly_price, last_verified_at, updated_at, created_at')
        .not('normalized_monthly_price', 'is', null),
    ]);

    if (evidenceResult.error || pricesResult.error) {
      throw new Error(
        evidenceResult.error?.message ||
          pricesResult.error?.message ||
          'Failed to load candidate inputs',
      );
    }
    evidenceData = evidenceResult.data || [];
    pricesData = pricesResult.data || [];
  }

  const candidates = [
    ...aggregateCandidates(evidenceData.filter((row) => row.label_key !== 'value_friendly')),
    ...computeValueCandidates(pricesData || [], targetGyms),
  ];

  if (scope.dryRun) {
    console.log(
      JSON.stringify(
        {
          targetGyms: targetGyms.length,
          candidateRows: candidates.length,
          dryRun: true,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (isScoped) {
    const ids = [...scopedGymIds];
    for (let index = 0; index < ids.length; index += 100) {
      const chunk = ids.slice(index, index + 100);
      const { error: deleteError } = await supabase
        .from('gym_label_candidates')
        .delete()
        .in('gym_id', chunk);
      if (deleteError) throw new Error(deleteError.message);
    }
  } else {
    const { error: deleteError } = await supabase
      .from('gym_label_candidates')
      .delete()
      .not('gym_id', 'is', null);
    if (deleteError) throw new Error(deleteError.message);
  }

  if (candidates.length === 0) {
    console.log('No candidates computed.');
    return;
  }

  for (let index = 0; index < candidates.length; index += 200) {
    const batch = candidates.slice(index, index + 200);
    const { error } = await supabase
      .from('gym_label_candidates')
      .upsert(batch, { onConflict: 'gym_id,label_key' });
    if (error) throw new Error(error.message);
  }

  console.log(`Upserted ${candidates.length} label candidates.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
