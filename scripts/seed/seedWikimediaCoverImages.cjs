/* eslint-disable @typescript-eslint/no-require-imports */
const { createServiceClient, nowIso } = require('./seedHelpers.cjs');
const { WIKIMEDIA_COVER_IMAGES } = require('./wikimediaCoverCatalog.cjs');

async function main() {
  const supabase = createServiceClient();
  let updated = 0;
  let skipped = 0;

  for (const row of WIKIMEDIA_COVER_IMAGES) {
    try {
      const { data: spot, error: fetchError } = await supabase
        .from('flower_spots')
        .select('id, name, cover_image_url')
        .eq('name', row.name)
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!spot?.id) {
        skipped += 1;
        console.log(`[skip] ${row.name} — spot not found`);
        continue;
      }

      if (spot.cover_image_url) {
        skipped += 1;
        console.log(`[skip] ${row.name} — cover already exists`);
        continue;
      }

      const { error: updateError } = await supabase
        .from('flower_spots')
        .update({
          cover_image_url: row.cover_image_url,
          updated_at: nowIso(),
        })
        .eq('id', spot.id);

      if (updateError) throw updateError;
      updated += 1;
      console.log(`[update] ${row.name} — wikimedia cover linked`);
    } catch (error) {
      console.log(`[error] ${row.name} — ${error.message}`);
    }
  }

  console.log(JSON.stringify({
    updated,
    skipped,
    candidates: WIKIMEDIA_COVER_IMAGES.length,
  }, null, 2));
}

main().catch((error) => {
  console.error('[seed:wikimedia-covers] failed:', error);
  process.exit(1);
});
