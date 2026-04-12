/* eslint-disable @typescript-eslint/no-require-imports */
const {
  createServiceClient,
  fetchAllByRange,
  normalizeFlowerTypes,
  nowIso,
} = require('./seedHelpers.cjs');

const RECLASSIFIERS = [
  { patterns: ['수국'], flower_types: ['hydrangea'], peak: [6, 7] },
  { patterns: ['연꽃', '백련', '연화'], flower_types: ['lotus'], peak: [7, 8] },
  { patterns: ['동백'], flower_types: ['camellia'], peak: [1, 2] },
  { patterns: ['매화', '매실'], flower_types: ['plum'], peak: [2, 3] },
  { patterns: ['유채'], flower_types: ['rape'], peak: [3, 4] },
  { patterns: ['코스모스'], flower_types: ['cosmos'], peak: [9, 10] },
  { patterns: ['해바라기'], flower_types: ['sunflower'], peak: [7, 8] },
  { patterns: ['튤립'], flower_types: ['tulip'], peak: [4, 5] },
  { patterns: ['장미'], flower_types: ['rose'], peak: [5, 6] },
  { patterns: ['라벤더'], flower_types: ['lavender'], peak: [6, 7] },
  { patterns: ['등나무', '등꽃'], flower_types: ['wisteria'], peak: [4, 5] },
  { patterns: ['억새'], flower_types: ['silvergrass'], peak: [9, 10] },
  { patterns: ['벚꽃', '벚나무'], flower_types: ['cherry'], peak: [3, 4] },
  { patterns: ['진달래', '철쭉'], flower_types: ['azalea'], peak: [4, 5] },
  { patterns: ['개나리'], flower_types: ['forsythia'], peak: [3, 4] },
  { patterns: ['국화'], flower_types: ['chrysanthemum'], peak: [10, 11] },
  { patterns: ['복숭아꽃', '복사꽃'], flower_types: ['peach'], peak: [3, 4] },
  { patterns: ['꽃잔디'], flower_types: ['phlox'], peak: [4, 5] },
];

function pickMapping(name) {
  const text = String(name || '').trim();
  return RECLASSIFIERS.find((rule) => rule.patterns.some((pattern) => text.includes(pattern))) ?? null;
}

async function main() {
  const supabase = createServiceClient();

  const targets = await fetchAllByRange((from, to) =>
    supabase
      .from('flower_spots')
      .select('id, name, flower_types, peak_month_start, peak_month_end')
      .contains('flower_types', ['etc'])
      .order('created_at', { ascending: true })
      .range(from, to),
  );

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  console.log(`[info] etc targets: ${targets.length}`);

  for (const spot of targets) {
    try {
      const mapping = pickMapping(spot.name);

      if (!mapping) {
        skipped += 1;
        console.log(`[skip] ${spot.name} — no keyword match`);
        continue;
      }

      const currentTypes = Array.isArray(spot.flower_types) ? spot.flower_types : [];
      const mergedTypes = normalizeFlowerTypes([
        ...currentTypes.filter((value) => value !== 'etc'),
        ...mapping.flower_types,
      ]);

      const updatePayload = {
        flower_types: mergedTypes,
        updated_at: nowIso(),
      };

      if (!spot.peak_month_start || !spot.peak_month_end) {
        updatePayload.peak_month_start = spot.peak_month_start ?? mapping.peak[0];
        updatePayload.peak_month_end = spot.peak_month_end ?? mapping.peak[1];
      }

      const { error } = await supabase
        .from('flower_spots')
        .update(updatePayload)
        .eq('id', spot.id);

      if (error) throw error;

      updated += 1;
      console.log(
        `[update] ${spot.name} — ${mapping.flower_types.join(',')} / ${updatePayload.peak_month_start ?? spot.peak_month_start}-${updatePayload.peak_month_end ?? spot.peak_month_end}월`,
      );
    } catch (error) {
      errors += 1;
      console.warn(`[error] ${spot.name} — ${error.message}`);
    }
  }

  console.log(
    JSON.stringify(
      {
        scanned: targets.length,
        updated,
        skipped,
        errors,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error('[reclassify-etc] failed:', error);
  process.exit(1);
});
