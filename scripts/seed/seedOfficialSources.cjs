/* eslint-disable @typescript-eslint/no-require-imports */
const { nowIso, createServiceClient } = require('./seedHelpers.cjs');
const { OFFICIAL_SPOT_SOURCES, OFFICIAL_FESTIVAL_SOURCES } = require('./officialSourceCatalog.cjs');

async function updateSpotSources(supabase) {
  let updated = 0;
  let skipped = 0;

  for (const row of OFFICIAL_SPOT_SOURCES) {
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('flower_spots')
        .select('id, name, website_url, source')
        .eq('name', row.name)
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!existing?.id) {
        skipped += 1;
        console.log(`[skip] ${row.name} — spot not found`);
        continue;
      }

      const payload = {};
      if (!existing.website_url) payload.website_url = row.website_url;
      if (!existing.source || String(existing.source).includes('curated')) payload.source = row.source;
      payload.updated_at = nowIso();

      if (Object.keys(payload).length === 1) {
        skipped += 1;
        console.log(`[skip] ${row.name} — already linked`);
        continue;
      }

      const { error: updateError } = await supabase
        .from('flower_spots')
        .update(payload)
        .eq('id', existing.id);

      if (updateError) throw updateError;
      updated += 1;
      console.log(`[update] ${row.name} — official source linked`);
    } catch (error) {
      console.log(`[error] ${row.name} — ${error.message}`);
    }
  }

  return { updated, skipped };
}

async function updateFestivalSources(supabase) {
  let updated = 0;
  let skipped = 0;

  for (const row of OFFICIAL_FESTIVAL_SOURCES) {
    try {
      const { data: festivals, error: fetchError } = await supabase
        .from('festivals')
        .select('id, name, source_url')
        .eq('name', row.name)
        .limit(10);

      if (fetchError) throw fetchError;
      if (!festivals || festivals.length === 0) {
        skipped += 1;
        console.log(`[skip] ${row.name} — festival not found`);
        continue;
      }

      for (const festival of festivals) {
        if (festival.source_url) {
          skipped += 1;
          console.log(`[skip] ${row.name} — already linked`);
          continue;
        }

        const { error: updateError } = await supabase
          .from('festivals')
          .update({ source_url: row.source_url })
          .eq('id', festival.id);

        if (updateError) throw updateError;
        updated += 1;
        console.log(`[update] ${row.name} — festival source linked`);
      }
    } catch (error) {
      console.log(`[error] ${row.name} — ${error.message}`);
    }
  }

  return { updated, skipped };
}

async function main() {
  const supabase = createServiceClient();

  const [spotResult, festivalResult] = await Promise.all([
    updateSpotSources(supabase),
    updateFestivalSources(supabase),
  ]);

  console.log(JSON.stringify({
    spots: spotResult,
    festivals: festivalResult,
    officialSpotCandidates: OFFICIAL_SPOT_SOURCES.length,
    officialFestivalCandidates: OFFICIAL_FESTIVAL_SOURCES.length,
  }, null, 2));
}

main().catch((error) => {
  console.error('[seed:official-sources] failed:', error);
  process.exit(1);
});
