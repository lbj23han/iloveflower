/* eslint-disable @typescript-eslint/no-require-imports */
const {
  getSupabase,
  shouldPublishCandidate,
  buildPublishedLabel,
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

  let data = [];
  if (isScoped) {
    data = await queryInChunks(
      (chunk) =>
        supabase
          .from('gym_label_candidates')
          .select('*')
          .eq('status', 'candidate')
          .in('gym_id', chunk),
      [...scopedGymIds],
    );
  } else {
    const result = await supabase
      .from('gym_label_candidates')
      .select('*')
      .eq('status', 'candidate');
    if (result.error) throw new Error(result.error.message);
    data = result.data || [];
  }

  const publishable = (data || []).filter(shouldPublishCandidate);
  const publishableKeys = new Set(
    publishable.map((candidate) => `${candidate.gym_id}::${candidate.label_key}`),
  );

  if (scope.dryRun) {
    console.log(
      JSON.stringify(
        {
          targetGyms: targetGyms.length,
          publishableLabels: publishable.length,
          dryRun: true,
        },
        null,
        2,
      ),
    );
    return;
  }

  let existingRows = [];
  if (isScoped) {
    existingRows = await queryInChunks(
      (chunk) =>
        supabase
          .from('gym_labels')
          .select('id, gym_id, label_key')
          .eq('source', 'badge_pipeline')
          .in('gym_id', chunk),
      [...scopedGymIds],
    );
  } else {
    const existingResult = await supabase
      .from('gym_labels')
      .select('id, gym_id, label_key')
      .eq('source', 'badge_pipeline');
    if (existingResult.error) throw new Error(existingResult.error.message);
    existingRows = existingResult.data || [];
  }

  for (const label of existingRows) {
    const key = `${label.gym_id}::${label.label_key}`;
    if (publishableKeys.has(key)) continue;
    const { error: deleteError } = await supabase
      .from('gym_labels')
      .delete()
      .eq('id', label.id);
    if (deleteError) throw new Error(deleteError.message);
  }

  if (publishable.length === 0) {
    console.log('No publishable labels found.');
    return;
  }

  const rows = publishable.map(buildPublishedLabel);
  for (let index = 0; index < rows.length; index += 200) {
    const batch = rows.slice(index, index + 200);
    const { error: upsertError } = await supabase
      .from('gym_labels')
      .upsert(batch, { onConflict: 'gym_id,label_key' });
    if (upsertError) throw new Error(upsertError.message);
  }

  console.log(`Published ${rows.length} gym labels.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
