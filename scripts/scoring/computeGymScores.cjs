/* eslint-disable @typescript-eslint/no-require-imports */
const { getSupabase, computeGymScoreRow, queryInChunks } = require('../badges/shared.cjs');
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

  let labelRows = [];
  let candidateRows = [];
  if (isScoped) {
    const gymIds = [...scopedGymIds];
    [labelRows, candidateRows] = await Promise.all([
      queryInChunks(
        (chunk) =>
          supabase
            .from('gym_labels')
            .select('gym_id, label_key, confidence')
            .eq('label_value', true)
            .in('label_key', ['beginner_friendly', 'introvert_friendly', 'value_friendly'])
            .in('gym_id', chunk),
        gymIds,
      ),
      queryInChunks(
        (chunk) =>
          supabase
            .from('gym_label_candidates')
            .select('gym_id, label_key, score')
            .in('label_key', ['beginner_friendly', 'introvert_friendly', 'value_friendly'])
            .in('gym_id', chunk),
        gymIds,
      ),
    ]);
  } else {
    const [labelsResult, candidatesResult] = await Promise.all([
      supabase
        .from('gym_labels')
        .select('gym_id, label_key, confidence')
        .eq('label_value', true)
        .in('label_key', ['beginner_friendly', 'introvert_friendly', 'value_friendly']),
      supabase
        .from('gym_label_candidates')
        .select('gym_id, label_key, score')
        .in('label_key', ['beginner_friendly', 'introvert_friendly', 'value_friendly']),
    ]);

    if (labelsResult.error || candidatesResult.error) {
      throw new Error(labelsResult.error?.message || candidatesResult.error?.message || 'Failed to load score inputs');
    }
    labelRows = labelsResult.data || [];
    candidateRows = candidatesResult.data || [];
  }

  const byGym = new Map();

  for (const candidate of candidateRows) {
    if (!byGym.has(candidate.gym_id)) {
      byGym.set(candidate.gym_id, {
        beginner_score: 0,
        introvert_score: 0,
        value_score: 0,
        published_badges: [],
      });
    }
    const row = byGym.get(candidate.gym_id);
    const scaled = Math.min(100, Math.round(candidate.score * 42));
    if (candidate.label_key === 'beginner_friendly') row.beginner_score = scaled;
    if (candidate.label_key === 'introvert_friendly') row.introvert_score = scaled;
    if (candidate.label_key === 'value_friendly') row.value_score = scaled;
  }

  for (const label of labelRows) {
    if (!byGym.has(label.gym_id)) {
      byGym.set(label.gym_id, {
        beginner_score: 0,
        introvert_score: 0,
        value_score: 0,
        published_badges: [],
      });
    }
    byGym.get(label.gym_id).published_badges.push(label.label_key);
  }

  const rows = Array.from(byGym.entries()).map(([gym_id, input]) =>
    computeGymScoreRow({ gym_id, ...input }),
  );

  if (scope.dryRun) {
    console.log(
      JSON.stringify(
        {
          targetGyms: targetGyms.length,
          scoreRows: rows.length,
          dryRun: true,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (rows.length === 0) {
    console.log('No score rows computed.');
    return;
  }

  for (let index = 0; index < rows.length; index += 200) {
    const batch = rows.slice(index, index + 200);
    const { error } = await supabase
      .from('gym_scores')
      .upsert(batch, { onConflict: 'gym_id' });
    if (error) throw new Error(error.message);
  }

  console.log(`Upserted ${rows.length} gym score rows.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
